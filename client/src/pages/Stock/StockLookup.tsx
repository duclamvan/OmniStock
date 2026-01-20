import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import WarehouseLocationSelector from "@/components/WarehouseLocationSelector";
import { LocationType } from "@/lib/warehouseHelpers";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Search, Package, MapPin, MapPinPlus, Barcode, TrendingUp, TrendingDown, AlertCircle, ChevronRight, ChevronDown, ChevronUp, Layers, MoveRight, ArrowUpDown, FileText, AlertTriangle, X, Plus, Minus, Filter, ArrowUpDown as SortIcon, Printer, Tag, Info, ClipboardCheck, MoreVertical, Star, Trash2, Cloud } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { Link } from "wouter";
import { fuzzySearch } from "@/lib/fuzzySearch";
import MoveInventoryDialog from "@/components/warehouse/MoveInventoryDialog";
import StockAdjustmentDialog from "@/components/warehouse/StockAdjustmentDialog";
import WarehouseLabelPreview from "@/components/warehouse/WarehouseLabelPreview";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useInventoryDefaults } from "@/hooks/useAppSettings";

interface Variant {
  id: string;
  name: string;
  barcode?: string;
  quantity: number;
  imageUrl?: string;
  priceCzk?: number;
  priceEur?: number;
  locationCode?: string | null;
  locationId?: string | null;
  locationQuantity?: number;
}

interface ProductLocation {
  id: string;
  productId: string;
  warehouseId?: string;
  locationCode: string;
  quantity: number;
  isPrimary: boolean;
  variantId?: string | null;
  variantName?: string | null;
}

interface EnrichedProduct {
  id: string;
  name: string;
  vietnameseName?: string | null;
  sku?: string;
  barcode?: string;
  categoryName?: string;
  description?: string;
  quantity: number;
  variants: Variant[];
  totalStock: number;
  locations?: ProductLocation[];
  imageUrl?: string;
  images?: any;
  priceCzk?: number;
  priceEur?: number;
  productType?: 'standard' | 'physical_no_quantity' | 'virtual';
}

export default function StockLookup() {
  const { t } = useTranslation(['inventory', 'common']);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [descriptionDialogOpen, setDescriptionDialogOpen] = useState(false);
  const [labelDialogOpen, setLabelDialogOpen] = useState(false);
  const [variantLabelDialogOpen, setVariantLabelDialogOpen] = useState(false);
  const [selectedVariantForLabel, setSelectedVariantForLabel] = useState<Variant | null>(null);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<ProductLocation | null>(null);
  const [barcodeMode, setBarcodeMode] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name-asc");
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { lowStockThreshold, enableBarcodeScanning } = useInventoryDefaults();
  
  // Remember last adjustment details for quick access
  const [lastAdjustment, setLastAdjustment] = useState<{
    type: 'add' | 'remove';
    quantity: number;
    reason: string;
  } | null>(() => {
    // Load from localStorage on init
    if (typeof window === 'undefined') return null;
    
    try {
      const saved = localStorage.getItem('stockLookupLastAdjustment');
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('Error loading last adjustment:', error);
      return null;
    }
  });
  
  // Track which quick button (+/-) was clicked
  const [quickButtonType, setQuickButtonType] = useState<'add' | 'remove' | null>(null);
  
  // Add Location Dialog states
  const [addLocationDialogOpen, setAddLocationDialogOpen] = useState(false);
  const [addLocationProductId, setAddLocationProductId] = useState<string | null>(null);
  const [addLocationProductName, setAddLocationProductName] = useState<string>("");
  const [addLocationVariantId, setAddLocationVariantId] = useState<string | null>(null);
  const [addLocationVariantName, setAddLocationVariantName] = useState<string>("");
  const [deleteLocationId, setDeleteLocationId] = useState<string | null>(null);
  const [deleteLocationProductId, setDeleteLocationProductId] = useState<string | null>(null);
  const [deleteConfirmDialogOpen, setDeleteConfirmDialogOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<ProductLocation | null>(null);
  const [newLocationType, setNewLocationType] = useState<LocationType>("warehouse");
  const [newLocationCode, setNewLocationCode] = useState("");
  const [newLocationQuantity, setNewLocationQuantity] = useState(0);
  const [newLocationNotes, setNewLocationNotes] = useState("");
  const [newLocationIsPrimary, setNewLocationIsPrimary] = useState(true);
  
  // Save last adjustment to localStorage when it changes
  useEffect(() => {
    if (typeof window === 'undefined' || !lastAdjustment) return;
    
    try {
      localStorage.setItem('stockLookupLastAdjustment', JSON.stringify(lastAdjustment));
    } catch (error) {
      console.error('Error saving last adjustment:', error);
    }
  }, [lastAdjustment]);

  // Check for query parameter and auto-populate search
  const [isFromUnderAllocated, setIsFromUnderAllocated] = useState(false);
  const [variantSearch, setVariantSearch] = useState("");
  const [expandedVariants, setExpandedVariants] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const searchParam = params.get('q') || params.get('search');
    const fromParam = params.get('from');
    
    if (searchParam) {
      setSearchQuery(searchParam);
    }
    
    if (fromParam === 'under-allocated') {
      setIsFromUnderAllocated(true);
    }
  }, []);

  // Fetch all products - always refresh on mount
  const { data: rawProducts = [], isLoading: productsLoading } = useQuery<any[]>({
    queryKey: ['/api/products'],
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Fetch warehouses for location display
  const { data: warehouses = [] } = useQuery<any[]>({
    queryKey: ['/api/warehouses'],
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Fetch categories for filtering
  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ['/api/categories'],
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Fetch all product locations for display in collapsed view - always refresh on mount
  const { data: productLocationsMap = {} } = useQuery<Record<string, { locationCode: string; quantity: number }[]>>({
    queryKey: ['/api/products/primary-locations'],
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Fetch stock inconsistencies (unified: over-allocated + under-allocated)
  const { data: stockInconsistencies } = useQuery<{
    items: any[];
    summary: { total: number; overAllocated: number; underAllocated: number };
  }>({
    queryKey: ['/api/stock-inconsistencies'],
    staleTime: 0,
    refetchInterval: 60000,
  });

  const inconsistenciesCount = stockInconsistencies?.summary?.total || 0;


  // Create warehouse lookup map
  const warehouseMap = useMemo(() => {
    const map: Record<string, string> = {};
    warehouses.forEach((w: any) => {
      map[w.id] = w.name;
    });
    return map;
  }, [warehouses]);

  // Enrich products with variant data and calculate total stock
  const products: EnrichedProduct[] = useMemo(() => {
    return rawProducts.map((p: any) => {
      // Parse images if needed
      let productImages: any[] = [];
      try {
        if (p.images) {
          const parsed = typeof p.images === 'string' ? JSON.parse(p.images) : p.images;
          productImages = Array.isArray(parsed) ? parsed : [];
        }
      } catch {
        productImages = [];
      }

      // Get primary image
      const primaryImage = productImages.find((img: any) => img.isPrimary)?.url || 
                          productImages[0]?.url || 
                          p.imageUrl;

      // Note: We don't have variants data here yet, this will be enhanced with a better API
      const productQuantity = parseInt(p.quantity) || 0;
      
      // Get locations from the batch-fetched data
      const productLocs = productLocationsMap[p.id] || [];
      const enrichedLocations = productLocs.map(loc => ({
        id: loc.locationCode,
        locationCode: loc.locationCode,
        quantity: loc.quantity,
      }));
      
      return {
        id: p.id,
        name: p.name,
        vietnameseName: p.vietnameseName,
        sku: p.sku,
        barcode: p.barcode,
        categoryName: p.categoryName,
        description: p.description,
        quantity: productQuantity,
        variants: [], // Will be fetched on-demand when product is expanded
        totalStock: productQuantity, // Will include variants when fetched
        locations: enrichedLocations.length > 0 ? enrichedLocations : p.locations,
        imageUrl: primaryImage,
        images: p.images,
        priceCzk: p.priceCzk,
        priceEur: p.priceEur,
        productType: p.productType || 'standard'
      };
    });
  }, [rawProducts, productLocationsMap]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let result = products;
    
    // Filter by category
    if (selectedCategory !== "all") {
      result = result.filter(p => p.categoryName === selectedCategory);
    }
    
    // Filter by search query using enhanced token-based fuzzy search
    // Example: "1kg top coat" will match "1KG - Top coat tim dac"
    if (searchQuery.trim()) {
      const searchResults = fuzzySearch(result, searchQuery, {
        fields: ['name', 'sku', 'barcode', 'categoryName'],
        threshold: 0.25
      });
      
      // Sort by score and extract items
      result = searchResults
        .sort((a, b) => b.score - a.score)
        .map(r => r.item);
    }
    
    // When search is active, preserve the relevance-based ordering from fuzzySearch
    // Only apply manual sorting when there's no active search query
    if (searchQuery.trim()) {
      // Keep the relevance order from fuzzySearch - don't re-sort
      return result;
    }
    
    // Sort products (only when not searching)
    const sorted = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'stock-asc':
          return a.totalStock - b.totalStock;
        case 'stock-desc':
          return b.totalStock - a.totalStock;
        case 'sku-asc':
          return (a.sku || '').localeCompare(b.sku || '');
        case 'sku-desc':
          return (b.sku || '').localeCompare(a.sku || '');
        case 'category-asc':
          return (a.categoryName || '').localeCompare(b.categoryName || '');
        case 'category-desc':
          return (b.categoryName || '').localeCompare(a.categoryName || '');
        default:
          return 0;
      }
    });
    
    return sorted;
  }, [products, searchQuery, selectedCategory, sortBy]);

  // Fetch variants for selected product
  const { data: selectedVariants = [], isLoading: variantsLoading } = useQuery<Variant[]>({
    queryKey: ['/api/products', selectedProduct, 'variants'],
    enabled: !!selectedProduct,
    staleTime: 0,
  });

  // Fetch locations for selected product
  const { data: selectedLocations = [], isLoading: locationsLoading } = useQuery<ProductLocation[]>({
    queryKey: ['/api/products', selectedProduct, 'locations'],
    enabled: !!selectedProduct,
    staleTime: 0,
  });
  
  // Combined loading state for expanded details
  const expandedDataLoading = variantsLoading || locationsLoading;

  // Get enriched selected product with variants and locations
  const selectedProductData = useMemo(() => {
    if (!selectedProduct) return null;
    
    const product = products.find(p => p.id === selectedProduct);
    if (!product) return null;

    const variantsTotalStock = selectedVariants.reduce((sum, v) => sum + (v.quantity || 0), 0);
    const totalStock = product.quantity + variantsTotalStock;

    return {
      ...product,
      variants: selectedVariants,
      locations: selectedLocations,
      totalStock
    };
  }, [selectedProduct, products, selectedVariants, selectedLocations]);

  const getStockStatus = (stock: number, customThreshold?: number) => {
    const threshold = customThreshold ?? lowStockThreshold;
    if (stock === 0) return { label: t('outOfStock'), borderColor: "border-red-500", textColor: "text-red-700 dark:text-red-400", icon: AlertCircle };
    if (stock <= threshold) return { label: t('lowStock'), borderColor: "border-yellow-500", textColor: "text-yellow-700 dark:text-yellow-400", icon: TrendingDown };
    if (stock <= threshold * 2) return { label: t('mediumStock'), borderColor: "border-blue-500", textColor: "text-blue-700 dark:text-blue-400", icon: TrendingUp };
    return { label: t('inStock'), borderColor: "border-green-500", textColor: "text-green-700 dark:text-green-400", icon: TrendingUp };
  };

  // Add location mutation
  const addLocationMutation = useMutation({
    mutationFn: async (data: { productId: string; variantId?: string | null; locationType: LocationType; locationCode: string; quantity: number; notes: string; isPrimary: boolean }) => {
      return await apiRequest('POST', `/api/products/${data.productId}/locations`, {
        variantId: data.variantId || null,
        locationType: data.locationType,
        locationCode: data.locationCode,
        quantity: data.quantity,
        notes: data.notes,
        isPrimary: data.isPrimary,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/products/${addLocationProductId}/locations`] });
      queryClient.invalidateQueries({ queryKey: [`/api/products/${addLocationProductId}/variants`] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: t('common:success'),
        description: t('common:locationAddedSuccessfully'),
      });
      setAddLocationDialogOpen(false);
      resetAddLocationForm();
    },
    onError: (error: any) => {
      console.error('Add location error:', error);
      toast({
        title: t('common:error'),
        description: error?.message || t('common:failedToAddLocation'),
        variant: "destructive",
      });
    },
  });

  // Delete location mutation
  const deleteLocationMutation = useMutation({
    mutationFn: async (data: { productId: string; locationId: string }) => {
      return await apiRequest('DELETE', `/api/products/${data.productId}/locations/${data.locationId}`);
    },
    onSuccess: () => {
      if (deleteLocationProductId) {
        queryClient.invalidateQueries({ queryKey: [`/api/products/${deleteLocationProductId}/locations`] });
        queryClient.invalidateQueries({ queryKey: [`/api/products/${deleteLocationProductId}/variants`] });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products/primary-locations'] });
      toast({
        title: t('common:success'),
        description: t('common:locationDeletedSuccessfully'),
      });
      setDeleteLocationId(null);
      setDeleteLocationProductId(null);
      setDeleteConfirmDialogOpen(false);
      setLocationToDelete(null);
    },
    onError: () => {
      toast({
        title: t('common:error'),
        description: t('common:failedToDeleteLocation'),
        variant: "destructive",
      });
    },
  });

  const handleDeleteVariantLocation = (productId: string, locationId: string) => {
    setDeleteLocationProductId(productId);
    deleteLocationMutation.mutate({ productId, locationId });
  };

  // Set primary location mutation
  const setPrimaryMutation = useMutation({
    mutationFn: async ({ productId, locationId }: { productId: string; locationId: string }) => {
      return await apiRequest('PATCH', `/api/products/${productId}/locations/${locationId}`, {
        isPrimary: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: [`/api/products/${selectedProduct}/locations`] });
      queryClient.invalidateQueries({ queryKey: ['/api/products/primary-locations'] });
      toast({
        title: t('primaryLocationSet'),
        description: t('primaryLocationSetSuccessfully'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message || t('failedToSetPrimaryLocation'),
        variant: "destructive",
      });
    },
  });

  const handleDeleteLocation = (loc: ProductLocation) => {
    setLocationToDelete(loc);
    setDeleteConfirmDialogOpen(true);
  };

  const handleSetPrimaryLocation = (loc: ProductLocation) => {
    setPrimaryMutation.mutate({
      productId: loc.productId,
      locationId: loc.id,
    });
  };

  const confirmDeleteLocation = () => {
    if (locationToDelete) {
      setDeleteLocationProductId(locationToDelete.productId);
      deleteLocationMutation.mutate({
        productId: locationToDelete.productId,
        locationId: locationToDelete.id,
      });
      setDeleteConfirmDialogOpen(false);
      setLocationToDelete(null);
    }
  };

  const resetAddLocationForm = () => {
    setNewLocationType("warehouse");
    setNewLocationCode("");
    setNewLocationQuantity(0);
    setNewLocationNotes("");
    setNewLocationIsPrimary(true);
    setAddLocationVariantId(null);
    setAddLocationVariantName("");
  };

  const handleOpenAddLocationDialog = (productId: string, productName: string) => {
    setAddLocationProductId(productId);
    setAddLocationProductName(productName);
    resetAddLocationForm();
    setAddLocationDialogOpen(true);
  };

  const handleAddLocation = () => {
    if (!addLocationProductId || !newLocationCode) {
      toast({
        title: t('common:error'),
        description: t('common:locationCodeRequired'),
        variant: "destructive",
      });
      return;
    }
    addLocationMutation.mutate({
      productId: addLocationProductId,
      variantId: addLocationVariantId,
      locationType: newLocationType,
      locationCode: newLocationCode,
      quantity: newLocationQuantity,
      notes: addLocationVariantName ? `Variant: ${addLocationVariantName}` : newLocationNotes,
      isPrimary: newLocationIsPrimary,
    });
  };

  const handleBarcodeScan = (barcode: string) => {
    if (!barcode.trim()) return;

    // Use barcode as search query to find and filter products
    setSearchQuery(barcode);
    setBarcodeInput("");
    
    // Find matching product to auto-expand
    const product = products.find(p => 
      p.barcode?.toLowerCase() === barcode.toLowerCase() ||
      p.sku?.toLowerCase() === barcode.toLowerCase()
    );

    if (product) {
      setSelectedProduct(product.id);
      setVariantSearch("");
      setExpandedVariants(new Set());
    }
  };

  const handleBarcodeKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBarcodeScan(barcodeInput);
    }
  };

  const isLoading = productsLoading;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-6 overflow-x-hidden">
      {/* Header - Sticky on mobile */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="px-3 py-3">
          <div className="flex items-center justify-between mb-2.5">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('stockLookup')}</h1>
            <div className="flex items-center gap-1.5">
              <Link href="/stock/approvals">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 p-0 sm:w-auto sm:px-3"
                  data-testid="button-adjustment-approvals"
                >
                  <ClipboardCheck className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">{t('adjustmentApprovals')}</span>
                </Button>
              </Link>
              <Link href="/stock/labels">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 p-0 sm:w-auto sm:px-3"
                  data-testid="button-manage-labels"
                >
                  <Tag className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">{t('manageLabels')}</span>
                </Button>
              </Link>
              {enableBarcodeScanning && (
                <Button
                  variant={barcodeMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setBarcodeMode(!barcodeMode)}
                  className="h-9 w-9 p-0 sm:w-auto sm:px-3"
                  data-testid="button-toggle-barcode-mode"
                >
                  <Barcode className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">{barcodeMode ? t('scanning') : t('scanLabel')}</span>
                </Button>
              )}
            </div>
          </div>
          
          {/* Search/Barcode Input */}
          {barcodeMode ? (
            <div>
              <div className="relative">
                <Barcode className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-blue-600" />
                <Input
                  type="text"
                  placeholder={t('scanBarcodeToSearch')}
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyPress={handleBarcodeKeyPress}
                  className="pl-10 h-12 text-base border-blue-300 focus:border-blue-500"
                  data-testid="input-barcode-scan"
                  autoFocus
                />
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse"></div>
                  <span>{t('readyToScan')}</span>
                </div>
                <span>•</span>
                <span>{t('scanToFind')}</span>
              </div>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                <Input
                  type="text"
                  placeholder={t('searchByNameSkuBarcode')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10 h-12 text-base"
                  data-testid="input-search-stock"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    data-testid="button-clear-search"
                    type="button"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>

              {/* Quick Stats */}
              <div className="mt-2 flex gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">{products.length}</span> {t('productsCount')}
                <span className="text-gray-400">•</span>
                <span className="font-medium">{filteredProducts.length}</span> {t('resultsCount')}
              </div>
            </>
          )}

          {/* Filter and Sort Controls */}
          {!barcodeMode && (
            <div className="mt-3 flex gap-2">
              {/* Category Filter */}
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="flex-1 h-9 text-sm" data-testid="select-category-filter">
                  <div className="flex items-center gap-1.5">
                    <Filter className="h-3.5 w-3.5 text-gray-500" />
                    <SelectValue placeholder={t('allCategories')} />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allCategories')}</SelectItem>
                  {categories.map((cat: any) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Sort Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 px-3" data-testid="button-sort-menu">
                    <SortIcon className="h-3.5 w-3.5 mr-1.5" />
                    {t('sortBy')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel className="text-xs font-semibold text-gray-500">{t('sortBy')}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem 
                    onClick={() => setSortBy('name-asc')}
                    className={sortBy === 'name-asc' ? 'bg-gray-100 dark:bg-gray-800' : ''}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-sm">{t('nameAZ')}</span>
                      {sortBy === 'name-asc' && <span className="text-blue-600">✓</span>}
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setSortBy('name-desc')}
                    className={sortBy === 'name-desc' ? 'bg-gray-100 dark:bg-gray-800' : ''}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-sm">{t('nameZA')}</span>
                      {sortBy === 'name-desc' && <span className="text-blue-600">✓</span>}
                    </div>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem 
                    onClick={() => setSortBy('stock-desc')}
                    className={sortBy === 'stock-desc' ? 'bg-gray-100 dark:bg-gray-800' : ''}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-sm">{t('stockHighLow')}</span>
                      {sortBy === 'stock-desc' && <span className="text-blue-600">✓</span>}
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setSortBy('stock-asc')}
                    className={sortBy === 'stock-asc' ? 'bg-gray-100 dark:bg-gray-800' : ''}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-sm">{t('stockLowHigh')}</span>
                      {sortBy === 'stock-asc' && <span className="text-blue-600">✓</span>}
                    </div>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem 
                    onClick={() => setSortBy('sku-asc')}
                    className={sortBy === 'sku-asc' ? 'bg-gray-100 dark:bg-gray-800' : ''}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-sm">{t('skuAZ')}</span>
                      {sortBy === 'sku-asc' && <span className="text-blue-600">✓</span>}
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setSortBy('sku-desc')}
                    className={sortBy === 'sku-desc' ? 'bg-gray-100 dark:bg-gray-800' : ''}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-sm">{t('skuZA')}</span>
                      {sortBy === 'sku-desc' && <span className="text-blue-600">✓</span>}
                    </div>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem 
                    onClick={() => setSortBy('category-asc')}
                    className={sortBy === 'category-asc' ? 'bg-gray-100 dark:bg-gray-800' : ''}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-sm">{t('categoryAZ')}</span>
                      {sortBy === 'category-asc' && <span className="text-blue-600">✓</span>}
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setSortBy('category-desc')}
                    className={sortBy === 'category-desc' ? 'bg-gray-100 dark:bg-gray-800' : ''}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-sm">{t('categoryZA')}</span>
                      {sortBy === 'category-desc' && <span className="text-blue-600">✓</span>}
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>

      {/* Stock Inconsistencies Warning */}
      {inconsistenciesCount > 0 && !isFromUnderAllocated && (
        <div className="px-3 pt-3">
          <Card className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-orange-300 dark:border-orange-700">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 p-3 bg-orange-100 dark:bg-orange-900/50 rounded-xl">
                  <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg text-orange-900 dark:text-orange-100 mb-1">
                    {t('stockInconsistencies')}
                  </h3>
                  <p className="text-base text-orange-800 dark:text-orange-200 mb-4">
                    <span className="font-bold">{inconsistenciesCount}</span> {inconsistenciesCount === 1 ? t('itemHas') : t('itemsHave')} {t('stockDiscrepancies').toLowerCase()}
                  </p>
                  <Link href="/stock/inconsistencies">
                    <Button 
                      size="lg" 
                      className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800 text-white h-12 px-6 text-base font-semibold"
                      data-testid="button-view-inconsistencies"
                    >
                      {t('viewAndResolveIssues')}
                    </Button>
                  </Link>
                </div>
                <Badge className="bg-orange-600 text-white text-lg font-bold flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full">
                  {inconsistenciesCount}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stock Inconsistencies Filter Banner */}
      {isFromUnderAllocated && filteredProducts.length > 0 && (
        <div className="px-3 pt-3">
          <Card className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-orange-300 dark:border-orange-700">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 p-3 bg-orange-100 dark:bg-orange-900/50 rounded-xl">
                  <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg text-orange-900 dark:text-orange-100 mb-1">
                    {t('showingInconsistentItems')}
                  </h3>
                  <p className="text-base text-orange-800 dark:text-orange-200">
                    {t('discrepanciesBetweenRecorded')}
                  </p>
                </div>
                <Badge className="bg-orange-600 text-white text-lg font-bold flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full">
                  {filteredProducts.length}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Content */}
      <div className="px-3 py-3 space-y-2">
        {isLoading ? (
          // Loading skeletons
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="border-gray-200 dark:border-gray-700">
              <CardContent className="p-3">
                <div className="flex gap-3">
                  <Skeleton className="h-20 w-20 rounded-md flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredProducts.length === 0 ? (
          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-8 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">
                {searchQuery ? t('noProductsFound') : t('noProductsAvailable')}
              </p>
            </CardContent>
          </Card>
        ) : (
          // Product Cards
          filteredProducts.map((product) => {
            const isExpanded = selectedProduct === product.id;
            const displayProduct = isExpanded && selectedProductData ? selectedProductData : product;
            const status = getStockStatus(displayProduct.totalStock);
            const StatusIcon = status.icon;
            
            return (
              <Card
                key={product.id}
                className="border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => {
                  setSelectedProduct(isExpanded ? null : product.id);
                  if (!isExpanded) {
                    setVariantSearch("");
                    setExpandedVariants(new Set());
                  }
                }}
                data-testid={`card-product-${product.id}`}
              >
                <CardContent className="p-5">
                  {/* Product Header */}
                  <div className="flex gap-4">
                    {/* Product Image - Large for touch */}
                    <div className="flex-shrink-0">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-20 w-20 rounded-xl object-cover bg-gray-100 dark:bg-gray-800 shadow-sm"
                        />
                      ) : (
                        <div className="h-20 w-20 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center shadow-sm">
                          <Package className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0 flex flex-col">
                      {/* Product Name - Large, readable text */}
                      <h3 className="font-bold text-lg leading-tight text-gray-900 dark:text-white mb-2" data-testid={`text-product-name-${product.id}`}>
                        {product.name}
                      </h3>
                      
                      {/* Product Type Badges */}
                      {(product.productType === 'physical_no_quantity' || product.productType === 'virtual') && (
                        <div className="flex items-center gap-2 mb-2">
                          {product.productType === 'physical_no_quantity' && (
                            <Badge variant="outline" className="h-6 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700 flex items-center gap-1 px-2">
                              <MapPin className="h-3 w-3" />
                              {t('noQty')}
                            </Badge>
                          )}
                          {product.productType === 'virtual' && (
                            <Badge variant="outline" className="h-6 text-xs bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-700 flex items-center gap-1 px-2">
                              <Cloud className="h-3 w-3" />
                              {t('virtual')}
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      {/* SKU and Category - Larger text */}
                      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700 dark:text-gray-300 mb-2">
                        {product.sku && (
                          <span className="flex items-center gap-1.5 font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                            <Barcode className="h-4 w-4" />
                            {product.sku}
                          </span>
                        )}
                        {product.categoryName && (
                          <span className="text-gray-700 dark:text-gray-300">{product.categoryName}</span>
                        )}
                      </div>

                      {/* Prices - EUR first (highlighted), CZK second - Larger */}
                      {(product.priceCzk || product.priceEur) && (
                        <div className="flex items-center gap-3 font-bold">
                          {product.priceEur && (
                            <span className="text-green-600 dark:text-green-400 text-lg">
                              €{Number(product.priceEur).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          )}
                          {product.priceCzk && product.priceEur && (
                            <span className="text-gray-300 dark:text-gray-600">|</span>
                          )}
                          {product.priceCzk && (
                            <span className="text-gray-900 dark:text-gray-100 text-base">
                              {Number(product.priceCzk).toLocaleString('cs-CZ')} Kč
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer Row: Location + Stock + Arrow - Full width */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t-2 border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 -mx-5 -mb-5 px-5 py-3 rounded-b-xl">
                    {/* Location - Takes more space */}
                    <div className="flex-1">
                      {product.productType === 'virtual' ? (
                        <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
                          <Cloud className="h-5 w-5" />
                          <span className="text-sm font-medium">{t('virtualProductNoTracking')}</span>
                        </div>
                      ) : displayProduct.locations && displayProduct.locations.length > 0 ? (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                          <span className="text-base font-bold font-mono text-gray-900 dark:text-gray-100">
                            {displayProduct.locations[0].locationCode}
                            {displayProduct.locations.length > 1 && (
                              <span className="text-blue-600 dark:text-blue-400 ml-2">+{displayProduct.locations.length - 1}</span>
                            )}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                          <MapPin className="h-5 w-5" />
                          <span className="text-sm">{t('noLocation')}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Stock Badge + Arrow */}
                    <div className="flex items-center gap-3">
                      {/* Stock Badge - Large and prominent */}
                      {product.productType === 'virtual' || product.productType === 'physical_no_quantity' ? (
                        <Badge variant="outline" className="border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 flex items-center gap-1.5 h-11 px-5 rounded-lg">
                          <span className="font-bold text-2xl">∞</span>
                        </Badge>
                      ) : (
                        <Badge variant="outline" className={`${status.borderColor} bg-white dark:bg-gray-900 ${status.textColor} flex items-center gap-2 h-11 px-5 rounded-lg`}>
                          <StatusIcon className="h-5 w-5" />
                          <span className="font-bold text-2xl">{displayProduct.totalStock}</span>
                        </Badge>
                      )}
                      
                      {/* Expand Arrow - Large touch target */}
                      <div className="p-2 -mr-2">
                        <ChevronRight className={`h-7 w-7 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details - with smooth animation */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                      {/* Loading skeleton while fetching details */}
                      {expandedDataLoading ? (
                        <div className="space-y-3 animate-pulse">
                          <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg" />
                          <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded-lg" />
                          <div className="h-20 bg-gray-100 dark:bg-gray-800 rounded-lg" />
                        </div>
                      ) : selectedProductData && (
                        <>
                      {/* Virtual Product Message */}
                      {product.productType === 'virtual' && (
                        <div className="bg-violet-50 dark:bg-violet-900/20 rounded-lg p-4 flex items-center gap-3">
                          <Cloud className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                          <div>
                            <p className="text-sm font-medium text-violet-700 dark:text-violet-300">{t('virtualProductNoTracking')}</p>
                            <p className="text-xs text-violet-600/70 dark:text-violet-400/70">{t('alwaysAvailable')}</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Physical No-Quantity Product Message */}
                      {product.productType === 'physical_no_quantity' && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 flex items-center gap-3">
                          <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          <div>
                            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">{t('noQuantityTracking')}</p>
                            <p className="text-xs text-blue-600/70 dark:text-blue-400/70">{t('alwaysAvailable')}</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Stock Breakdown - only for standard products */}
                      {product.productType !== 'virtual' && product.productType !== 'physical_no_quantity' && (
                        <div className={`grid gap-4 ${selectedProductData.variants.length > 0 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('baseStock')}</p>
                            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{selectedProductData.quantity}</p>
                          </div>
                          {selectedProductData.variants.length > 0 && (
                            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('variantStock')}</p>
                              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                                {selectedProductData.variants.reduce((sum, v) => sum + (v.quantity || 0), 0)}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Unified Variant Locations - shows variant with its location in one row */}
                      {selectedProductData.variants.length > 0 && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {t('common:variantLocations')} ({selectedProductData.variants.length})
                          </h4>
                          
                          {/* Search filter for variants */}
                          <div className="relative mb-3">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              placeholder={t('common:searchVariants')}
                              value={variantSearch}
                              onChange={(e) => setVariantSearch(e.target.value)}
                              className="pl-9 h-9"
                            />
                            {variantSearch && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                                onClick={() => setVariantSearch("")}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          
                          {/* Expand All / Collapse All buttons */}
                          <div className="flex gap-1.5 sm:gap-2 mb-3 flex-wrap">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-8 sm:h-7 px-2 sm:px-3"
                              onClick={() => {
                                const allVariantIds = selectedProductData.variants.map(v => v.id);
                                setExpandedVariants(new Set(allVariantIds));
                              }}
                            >
                              <ChevronDown className="h-4 w-4 sm:h-3 sm:w-3 sm:mr-1" />
                              <span className="hidden sm:inline">{t('common:expandAll')}</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-8 sm:h-7 px-2 sm:px-3"
                              onClick={() => setExpandedVariants(new Set())}
                            >
                              <ChevronUp className="h-4 w-4 sm:h-3 sm:w-3 sm:mr-1" />
                              <span className="hidden sm:inline">{t('common:collapseAll')}</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-8 sm:h-7 px-2 sm:px-3"
                              onClick={() => {
                                selectedProductData.variants.forEach(variant => {
                                  const variantLabelProduct = {
                                    id: variant.id,
                                    name: `${selectedProductData.name} - ${variant.name}`,
                                    vietnameseName: selectedProductData.vietnameseName ? `${selectedProductData.vietnameseName} - ${variant.name}` : null,
                                    sku: variant.barcode || selectedProductData.sku,
                                    barcode: variant.barcode,
                                    priceEur: variant.priceEur ?? selectedProductData.priceEur,
                                    priceCzk: variant.priceCzk ?? selectedProductData.priceCzk,
                                  };
                                  setSelectedVariantForLabel(variantLabelProduct as any);
                                });
                                setVariantLabelDialogOpen(true);
                              }}
                            >
                              <Printer className="h-4 w-4 sm:h-3 sm:w-3 sm:mr-1" />
                              <span className="hidden sm:inline">{t('generateAllLabels')}</span>
                            </Button>
                          </div>
                          
                          <div className="space-y-2">
                            {selectedProductData.variants
                              .filter((variant) => {
                                if (!variantSearch) return true;
                                const search = variantSearch.toLowerCase();
                                const nameMatch = variant.name?.toLowerCase().includes(search);
                                const barcodeMatch = variant.barcode?.toLowerCase().includes(search);
                                // Search by location codes from productLocations table
                                const variantLocationCodes = selectedProductData.locations
                                  ?.filter(loc => loc.variantId === variant.id)
                                  .map(loc => loc.locationCode?.toLowerCase()) || [];
                                const locationMatch = variantLocationCodes.some(code => code?.includes(search));
                                return nameMatch || barcodeMatch || locationMatch;
                              })
                              .map((variant) => {
                              // Get all locations for this variant from productLocations table
                              // This is the single source of truth for variant locations
                              const allLocations = (selectedProductData.locations?.filter(
                                loc => loc.variantId === variant.id
                              ) || []).sort((a, b) => {
                                // Primary location first
                                if (a.isPrimary && !b.isPrimary) return -1;
                                if (!a.isPrimary && b.isPrimary) return 1;
                                return 0;
                              });
                              
                              // Check if variant has any locations
                              const hasLocations = allLocations.length > 0;
                              
                              // Calculate actual variant stock from locations (source of truth)
                              const variantLocationStock = allLocations.reduce((sum, loc) => sum + (loc.quantity || 0), 0);
                              
                              const isExpanded = expandedVariants.has(variant.id);
                              const toggleExpand = () => {
                                setExpandedVariants(prev => {
                                  const next = new Set(prev);
                                  if (next.has(variant.id)) {
                                    next.delete(variant.id);
                                  } else {
                                    next.add(variant.id);
                                  }
                                  return next;
                                });
                              };
                              
                              return (
                                <div
                                  key={variant.id}
                                  className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3"
                                  data-testid={`variant-location-card-${variant.id}`}
                                >
                                  {/* Variant header - clickable to expand/collapse */}
                                  <div 
                                    className="flex items-center gap-3 cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleExpand();
                                    }}
                                  >
                                    {/* Expand/Collapse toggle */}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 flex-shrink-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleExpand();
                                      }}
                                    >
                                      {isExpanded ? (
                                        <ChevronDown className="h-4 w-4" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4" />
                                      )}
                                    </Button>
                                    {variant.imageUrl ? (
                                      <img
                                        src={variant.imageUrl}
                                        alt={variant.name}
                                        className="h-10 w-10 rounded object-cover flex-shrink-0"
                                      />
                                    ) : (
                                      <div className="h-10 w-10 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                                        <Package className="h-5 w-5 text-gray-400" />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <Badge variant="outline" className="h-5 text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700">
                                          {variant.name}
                                        </Badge>
                                        <Badge variant="secondary" className="px-2">
                                          {variantLocationStock} {t('units')} {t('total')}
                                        </Badge>
                                      </div>
                                      {variant.barcode && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1">
                                          {variant.barcode}
                                        </p>
                                      )}
                                    </div>
                                    {/* Add Location button for variant - hide for virtual products */}
                                    {product.productType !== 'virtual' && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 sm:h-7 text-xs px-2 sm:px-3"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setAddLocationProductId(selectedProductData.id);
                                          setAddLocationProductName(selectedProductData.name);
                                          setAddLocationVariantId(variant.id);
                                          setAddLocationVariantName(variant.name);
                                          setNewLocationType("warehouse");
                                          setNewLocationCode("");
                                          setNewLocationQuantity(0);
                                          setNewLocationIsPrimary(false);
                                          setNewLocationNotes("");
                                          setAddLocationDialogOpen(true);
                                        }}
                                      >
                                        <MapPinPlus className="h-4 w-4 sm:h-3 sm:w-3 sm:mr-1" />
                                        <span className="hidden sm:inline">{t('common:addLocation')}</span>
                                      </Button>
                                    )}
                                    {/* Generate Label button for variant */}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 sm:h-7 text-xs px-2 sm:px-3"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const variantLabelProduct = {
                                          id: variant.id,
                                          name: `${selectedProductData.name} - ${variant.name}`,
                                          vietnameseName: selectedProductData.vietnameseName ? `${selectedProductData.vietnameseName} - ${variant.name}` : null,
                                          sku: variant.barcode || selectedProductData.sku,
                                          barcode: variant.barcode,
                                          priceEur: variant.priceEur ?? selectedProductData.priceEur,
                                          priceCzk: variant.priceCzk ?? selectedProductData.priceCzk,
                                        };
                                        setSelectedVariantForLabel(variantLabelProduct as any);
                                        setVariantLabelDialogOpen(true);
                                      }}
                                    >
                                      <Printer className="h-4 w-4 sm:h-3 sm:w-3 sm:mr-1" />
                                      <span className="hidden sm:inline">{t('generateLabel')}</span>
                                    </Button>
                                  </div>
                                  
                                  {/* Location rows for this variant - only shown when expanded */}
                                  {isExpanded && hasLocations && (
                                    <div className="space-y-2 mt-2 pl-2 border-l-2 border-gray-200 dark:border-gray-700">
                                      {allLocations.map((location) => {
                                        const locParts = location.locationCode.match(/^([A-Z]+\d+)(.*)$/i);
                                        const locZone = locParts ? locParts[1] : location.locationCode;
                                        const locRest = locParts ? locParts[2] : '';
                                        
                                        return (
                                          <div key={location.id} className="bg-white dark:bg-gray-900 rounded-lg p-3">
                                            {/* Location code row */}
                                            <div className="flex items-center justify-between mb-2">
                                              <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-base font-bold text-gray-900 dark:text-white font-mono">
                                                  <span className="text-blue-600 dark:text-blue-400">{locZone}</span>
                                                  {locRest && <span className="text-gray-600 dark:text-gray-400">{locRest}</span>}
                                                </span>
                                                {location.isPrimary && (
                                                  <Badge variant="outline" className="h-5 text-[10px] bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700">
                                                    {t('common:primary')}
                                                  </Badge>
                                                )}
                                              </div>
                                            </div>
                                            {/* Quantity with +/- buttons */}
                                            <div className="flex items-center justify-center gap-2 py-2 bg-gray-50 dark:bg-gray-800 rounded mb-2">
                                              {product.productType !== 'virtual' && product.productType !== 'physical_no_quantity' && (
                                                <Button
                                                  variant="outline"
                                                  size="icon"
                                                  className="h-10 w-10 hover:bg-red-50 hover:border-red-300 dark:hover:bg-red-900/20"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (location.quantity <= 0) {
                                                      toast({
                                                        title: t('cannotReduce'),
                                                        description: t('stockAlreadyZero'),
                                                        variant: "destructive"
                                                      });
                                                      return;
                                                    }
                                                    setSelectedLocation(location);
                                                    setQuickButtonType('remove');
                                                    setAdjustDialogOpen(true);
                                                  }}
                                                  disabled={location.quantity <= 0}
                                                  title={t('quickRemoveStock')}
                                                >
                                                  <Minus className="h-5 w-5" />
                                                </Button>
                                              )}
                                              <div className="text-center px-3">
                                                <p className="text-xl font-bold text-gray-900 dark:text-white">
                                                  {product.productType === 'virtual' || product.productType === 'physical_no_quantity' 
                                                    ? '∞' 
                                                    : location.quantity}
                                                </p>
                                                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">{t('units')}</p>
                                              </div>
                                              {product.productType !== 'virtual' && product.productType !== 'physical_no_quantity' && (
                                                <Button
                                                  variant="outline"
                                                  size="icon"
                                                  className="h-10 w-10 hover:bg-green-50 hover:border-green-300 dark:hover:bg-green-900/20"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedLocation(location);
                                                    setQuickButtonType('add');
                                                    setAdjustDialogOpen(true);
                                                  }}
                                                  title={t('quickAddStock')}
                                                >
                                                  <Plus className="h-5 w-5" />
                                                </Button>
                                              )}
                                            </div>
                                          {/* Action buttons for this location - hide for virtual, hide adjust for physical_no_quantity */}
                                          {product.productType !== 'virtual' && (
                                            <div className="flex gap-2 mt-2">
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1 h-8 text-xs"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setSelectedLocation(location);
                                                  setMoveDialogOpen(true);
                                                }}
                                              >
                                                <MoveRight className="h-3 w-3 mr-1" />
                                                {t('move')}
                                              </Button>
                                              {product.productType !== 'physical_no_quantity' && (
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  className="flex-1 h-8 text-xs"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedLocation(location);
                                                    setQuickButtonType(null);
                                                    setAdjustDialogOpen(true);
                                                  }}
                                                >
                                                  <ArrowUpDown className="h-3 w-3 mr-1" />
                                                  {t('adjust')}
                                                </Button>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                  {isExpanded && !hasLocations && (
                                    <p className="text-sm text-gray-400 italic mt-2">{t('common:noLocationAssigned')}</p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Warehouse Locations - Only show for products WITHOUT variants */}
                      {selectedProductData.variants.length === 0 && (locationsLoading ? (
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-16 w-full" />
                        </div>
                      ) : selectedProductData.locations && selectedProductData.locations.length > 0 ? (
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                              <MapPin className="h-5 w-5 text-blue-600" />
                              {t('warehouseLocations')} ({selectedProductData.locations.length})
                            </h4>
                            {/* Hide Add Location button for virtual products */}
                            {product.productType !== 'virtual' && (
                              <Button 
                                variant="outline" 
                                className="h-10 px-4 text-sm font-medium"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenAddLocationDialog(product.id, product.name);
                                }}
                                data-testid={`button-add-location-${product.id}`}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                {t('addLocation')}
                              </Button>
                            )}
                          </div>
                          <div className="space-y-3">
                            {selectedProductData.locations.map((loc) => {
                              const locationParts = loc.locationCode.match(/^([A-Z]+\d+)(.*)$/i);
                              const zoneCode = locationParts ? locationParts[1] : loc.locationCode;
                              const restCode = locationParts ? locationParts[2] : '';
                              
                              return (
                                <div
                                  key={loc.id}
                                  className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4"
                                  data-testid={`location-card-${loc.id}`}
                                >
                                  {/* Row 1: Location code and menu */}
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xl font-bold text-gray-900 dark:text-white font-mono leading-tight">
                                        <span className="text-blue-600 dark:text-blue-400">{zoneCode}</span>
                                        {restCode && (
                                          <span className="block sm:inline text-gray-700 dark:text-gray-300">{restCode}</span>
                                        )}
                                      </p>
                                    </div>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 shrink-0"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <MoreVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        {!loc.isPrimary && (
                                          <DropdownMenuItem
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleSetPrimaryLocation(loc);
                                            }}
                                          >
                                            <Star className="h-4 w-4 mr-2" />
                                            {t('setPrimaryLocation')}
                                          </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem
                                          className="text-red-600 focus:text-red-600"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteLocation(loc);
                                          }}
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          {t('deleteLocation')}
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                  
                                  {/* Row 2: Badges */}
                                  <div className="flex flex-wrap gap-2 mb-3">
                                    {loc.isPrimary && (
                                      <Badge variant="default" className="h-6 text-xs">
                                        {t('primary')}
                                      </Badge>
                                    )}
                                    {(() => {
                                      if (loc.variantName) {
                                        return (
                                          <Badge variant="outline" className="h-6 text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700">
                                            {loc.variantName}
                                          </Badge>
                                        );
                                      }
                                      const matchingVariant = selectedProductData?.variants?.find(
                                        v => v.locationCode === loc.locationCode
                                      );
                                      if (matchingVariant) {
                                        return (
                                          <Badge variant="outline" className="h-6 text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700">
                                            {matchingVariant.name}
                                          </Badge>
                                        );
                                      }
                                      return null;
                                    })()}
                                  </div>
                                  
                                  {/* Row 3: Quantity with +/- buttons */}
                                  <div className="flex items-center justify-center gap-3 py-3 bg-white dark:bg-gray-900 rounded-lg mb-3">
                                    {product.productType !== 'virtual' && product.productType !== 'physical_no_quantity' && (
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-12 w-12 hover:bg-red-50 hover:border-red-300 dark:hover:bg-red-900/20"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (loc.quantity <= 0) {
                                            toast({
                                              title: t('cannotReduce'),
                                              description: t('stockAlreadyZero'),
                                              variant: "destructive"
                                            });
                                            return;
                                          }
                                          setSelectedLocation(loc);
                                          setQuickButtonType('remove');
                                          setAdjustDialogOpen(true);
                                        }}
                                        disabled={loc.quantity <= 0}
                                        data-testid={`button-quick-minus-${loc.id}`}
                                        title={t('quickRemoveStock')}
                                      >
                                        <Minus className="h-6 w-6" />
                                      </Button>
                                    )}
                                    <div className="text-center px-4">
                                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {product.productType === 'virtual' || product.productType === 'physical_no_quantity' 
                                          ? '∞' 
                                          : loc.quantity}
                                      </p>
                                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                        {t('units')}
                                      </p>
                                    </div>
                                    {product.productType !== 'virtual' && product.productType !== 'physical_no_quantity' && (
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-12 w-12 hover:bg-green-50 hover:border-green-300 dark:hover:bg-green-900/20"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedLocation(loc);
                                          setQuickButtonType('add');
                                          setAdjustDialogOpen(true);
                                        }}
                                        data-testid={`button-quick-plus-${loc.id}`}
                                        title={t('quickAddStock')}
                                      >
                                        <Plus className="h-6 w-6" />
                                      </Button>
                                    )}
                                  </div>
                                  
                                  {/* Row 4: Move and Adjust buttons */}
                                  {product.productType !== 'virtual' && (
                                    <div className="grid grid-cols-2 gap-3">
                                      <Button
                                        variant="outline"
                                        className="h-12 text-sm font-medium"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedLocation(loc);
                                          setMoveDialogOpen(true);
                                        }}
                                        data-testid={`button-move-${loc.id}`}
                                      >
                                        <MoveRight className="h-4 w-4 mr-2" />
                                        {t('move')}
                                      </Button>
                                      {product.productType !== 'physical_no_quantity' ? (
                                        <Button
                                          variant="outline"
                                          className="h-12 text-sm font-medium"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedLocation(loc);
                                            setQuickButtonType(null);
                                            setAdjustDialogOpen(true);
                                          }}
                                          data-testid={`button-adjust-${loc.id}`}
                                        >
                                          <ArrowUpDown className="h-4 w-4 mr-2" />
                                          {t('adjust')}
                                        </Button>
                                      ) : (
                                        <div />
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              {t('warehouseLocations')}
                            </h4>
                          </div>
                          <div className="text-center py-2">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                              {product.productType === 'virtual' 
                                ? t('virtualProductNoTracking')
                                : t('noWarehouseLocations')}
                            </p>
                            {/* Hide Add Location button for virtual products */}
                            {product.productType !== 'virtual' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="h-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenAddLocationDialog(product.id, product.name);
                                }}
                                data-testid={`button-add-location-${product.id}`}
                              >
                                <Plus className="h-3.5 w-3.5 mr-1" />
                                {t('addLocation')}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Action Buttons - Full width with text */}
                      <div className="grid grid-cols-3 gap-3 mt-4">
                        {selectedProductData.description ? (
                          <Button
                            variant="outline"
                            className="h-14 flex flex-col items-center justify-center gap-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDescriptionDialogOpen(true);
                            }}
                            data-testid={`button-view-description-${product.id}`}
                          >
                            <FileText className="h-5 w-5" />
                            <span className="text-xs font-medium">{t('description')}</span>
                          </Button>
                        ) : (
                          <div />
                        )}
                        <Button
                          variant="outline"
                          className="h-14 flex flex-col items-center justify-center gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLabelDialogOpen(true);
                          }}
                          data-testid={`button-generate-label-${product.id}`}
                        >
                          <Printer className="h-5 w-5" />
                          <span className="text-xs font-medium">{t('label')}</span>
                        </Button>
                        <Button
                          variant="outline"
                          className="h-14 flex flex-col items-center justify-center gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInfoDialogOpen(true);
                          }}
                          data-testid={`button-show-info-${product.id}`}
                        >
                          <Info className="h-5 w-5" />
                          <span className="text-xs font-medium">{t('info')}</span>
                        </Button>
                      </div>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Item Description Dialog */}
      {selectedProduct && selectedProductData && selectedProductData.description && (
        <>
          {isMobile ? (
            <Drawer open={descriptionDialogOpen} onOpenChange={setDescriptionDialogOpen}>
              <DrawerContent className="max-h-[85vh]">
                <DrawerHeader>
                  <DrawerTitle className="text-left">{t('itemDescription')}</DrawerTitle>
                </DrawerHeader>
                <div className="px-4 pb-6 overflow-y-auto">
                  <div className="mb-4">
                    <div className="flex items-center gap-3 mb-4">
                      {selectedProductData.imageUrl && (
                        <img
                          src={selectedProductData.imageUrl}
                          alt={selectedProductData.name}
                          className="h-16 w-16 rounded-md object-cover bg-gray-100 dark:bg-gray-800"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-1">
                          {selectedProductData.name}
                        </h3>
                        {selectedProductData.sku && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                            {selectedProductData.sku}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {selectedProductData.description}
                    </p>
                  </div>
                </div>
              </DrawerContent>
            </Drawer>
          ) : (
            <Dialog open={descriptionDialogOpen} onOpenChange={setDescriptionDialogOpen}>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle>{t('itemDescription')}</DialogTitle>
                </DialogHeader>
                <div className="overflow-y-auto flex-1 pr-2">
                  <div className="mb-4">
                    <div className="flex items-center gap-3 mb-4">
                      {selectedProductData.imageUrl && (
                        <img
                          src={selectedProductData.imageUrl}
                          alt={selectedProductData.name}
                          className="h-16 w-16 rounded-md object-cover bg-gray-100 dark:bg-gray-800"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base text-gray-900 dark:text-white mb-1">
                          {selectedProductData.name}
                        </h3>
                        {selectedProductData.sku && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                            {selectedProductData.sku}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {selectedProductData.description}
                    </p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </>
      )}

      {/* Warehouse Management Dialogs */}
      {selectedProduct && selectedProductData && (
        <>
          <MoveInventoryDialog
            open={moveDialogOpen}
            onOpenChange={setMoveDialogOpen}
            productId={selectedProduct}
            productName={selectedProductData.name}
            fromLocation={selectedLocation}
            locations={selectedProductData.locations || []}
            onSuccess={() => {
              setSelectedLocation(null);
            }}
          />
          <StockAdjustmentDialog
            open={adjustDialogOpen}
            onOpenChange={(open) => {
              setAdjustDialogOpen(open);
              if (!open) {
                setQuickButtonType(null); // Clear quick button type when closing
              }
            }}
            productId={selectedProduct}
            productName={selectedProductData.name}
            location={selectedLocation}
            initialValues={
              quickButtonType && lastAdjustment
                ? { ...lastAdjustment, type: quickButtonType }
                : quickButtonType
                ? { type: quickButtonType, quantity: 1, reason: '' }
                : undefined
            }
            onValuesChange={(values) => {
              // Only save 'add' or 'remove' adjustments
              // Clear saved values if user chose 'set'
              if (values.type === 'add' || values.type === 'remove') {
                setLastAdjustment(values);
              } else {
                setLastAdjustment(null);
              }
            }}
            onSuccess={() => {
              setSelectedLocation(null);
              setQuickButtonType(null);
            }}
          />
          <WarehouseLabelPreview
            open={labelDialogOpen}
            onOpenChange={setLabelDialogOpen}
            product={selectedProductData}
          />
          
          {/* Variant Label Preview Dialog */}
          <WarehouseLabelPreview
            open={variantLabelDialogOpen}
            onOpenChange={setVariantLabelDialogOpen}
            product={selectedVariantForLabel}
          />
          
          {/* Product Information Dialog */}
          {isMobile ? (
            <Drawer open={infoDialogOpen} onOpenChange={setInfoDialogOpen}>
              <DrawerContent className="max-h-[85vh]">
                <DrawerHeader>
                  <DrawerTitle className="text-left flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    {t('productInformation')}
                  </DrawerTitle>
                </DrawerHeader>
                <div className="px-4 pb-6 overflow-y-auto space-y-4">
                  <div className="flex items-start gap-4">
                    {selectedProductData.imageUrl && (
                      <img
                        src={selectedProductData.imageUrl}
                        alt={selectedProductData.name}
                        className="h-20 w-20 rounded-lg object-cover bg-gray-100 dark:bg-gray-800 flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                        {selectedProductData.name}
                      </h3>
                      {selectedProductData.vietnameseName && selectedProductData.vietnameseName !== selectedProductData.name && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {selectedProductData.vietnameseName}
                        </p>
                      )}
                    </div>
                  </div>

                  {selectedProductData.description && (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium mb-1">{t('itemDescription')}</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedProductData.description}</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-3">
                    {selectedProductData.sku && (
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">{t('sku')}</p>
                        <p className="font-mono font-bold text-sm mt-1">{selectedProductData.sku}</p>
                      </div>
                    )}
                    {selectedProductData.barcode && (
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">{t('barcode')}</p>
                        <p className="font-mono font-bold text-sm mt-1">{selectedProductData.barcode}</p>
                      </div>
                    )}
                    {selectedProductData.categoryName && (
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">{t('category')}</p>
                        <p className="font-semibold text-sm mt-1">{selectedProductData.categoryName}</p>
                      </div>
                    )}
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">{t('totalStock')}</p>
                      <p className="font-bold text-lg mt-1">{selectedProductData.totalStock}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {selectedProductData.priceEur && (
                      <div className="bg-black text-white rounded-lg p-3">
                        <p className="text-xs text-gray-300 uppercase font-medium">{t('priceEur')}</p>
                        <p className="font-black text-xl mt-1">€{Number(selectedProductData.priceEur).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                    )}
                    {selectedProductData.priceCzk && (
                      <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">{t('priceCzk')}</p>
                        <p className="font-bold text-xl mt-1">{Number(selectedProductData.priceCzk).toLocaleString("cs-CZ")} Kč</p>
                      </div>
                    )}
                  </div>

                  {selectedProductData.locations && selectedProductData.locations.length > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium mb-2">{t('locations')}</p>
                      <div className="space-y-2">
                        {selectedProductData.locations.map((loc) => (
                          <div key={loc.id} className="flex items-center justify-between text-sm">
                            <span className="font-mono font-medium">{loc.locationCode}</span>
                            <Badge variant="secondary">{loc.quantity} {t('units')}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </DrawerContent>
            </Drawer>
          ) : (
            <Dialog open={infoDialogOpen} onOpenChange={setInfoDialogOpen}>
              <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    {t('productInformation')}
                  </DialogTitle>
                </DialogHeader>
                <div className="overflow-y-auto flex-1 pr-2 space-y-4">
                  <div className="flex items-start gap-4">
                    {selectedProductData.imageUrl && (
                      <img
                        src={selectedProductData.imageUrl}
                        alt={selectedProductData.name}
                        className="h-24 w-24 rounded-lg object-cover bg-gray-100 dark:bg-gray-800 flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-xl text-gray-900 dark:text-white">
                        {selectedProductData.name}
                      </h3>
                      {selectedProductData.vietnameseName && selectedProductData.vietnameseName !== selectedProductData.name && (
                        <p className="text-base text-gray-600 dark:text-gray-400 mt-1">
                          {selectedProductData.vietnameseName}
                        </p>
                      )}
                    </div>
                  </div>

                  {selectedProductData.description && (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium mb-1">{t('itemDescription')}</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedProductData.description}</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-3">
                    {selectedProductData.sku && (
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">{t('sku')}</p>
                        <p className="font-mono font-bold text-sm mt-1">{selectedProductData.sku}</p>
                      </div>
                    )}
                    {selectedProductData.barcode && (
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">{t('barcode')}</p>
                        <p className="font-mono font-bold text-sm mt-1">{selectedProductData.barcode}</p>
                      </div>
                    )}
                    {selectedProductData.categoryName && (
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">{t('category')}</p>
                        <p className="font-semibold text-sm mt-1">{selectedProductData.categoryName}</p>
                      </div>
                    )}
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">{t('totalStock')}</p>
                      <p className="font-bold text-lg mt-1">{selectedProductData.totalStock}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {selectedProductData.priceEur && (
                      <div className="bg-black text-white rounded-lg p-3">
                        <p className="text-xs text-gray-300 uppercase font-medium">{t('priceEur')}</p>
                        <p className="font-black text-xl mt-1">€{Number(selectedProductData.priceEur).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                    )}
                    {selectedProductData.priceCzk && (
                      <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">{t('priceCzk')}</p>
                        <p className="font-bold text-xl mt-1">{Number(selectedProductData.priceCzk).toLocaleString("cs-CZ")} Kč</p>
                      </div>
                    )}
                  </div>

                  {selectedProductData.locations && selectedProductData.locations.length > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium mb-2">{t('locations')}</p>
                      <div className="space-y-2">
                        {selectedProductData.locations.map((loc) => (
                          <div key={loc.id} className="flex items-center justify-between text-sm">
                            <span className="font-mono font-medium">{loc.locationCode}</span>
                            <Badge variant="secondary">{loc.quantity} {t('units')}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </>
      )}

      {/* Add Location Dialog */}
      <Dialog open={addLocationDialogOpen} onOpenChange={setAddLocationDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('common:addProductLocation')}</DialogTitle>
            <DialogDescription>
              {addLocationVariantName 
                ? `${addLocationProductName} - ${addLocationVariantName}`
                : t('common:addStorageLocationFor', { productName: addLocationProductName })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Variant Selector - only show if product has variants */}
            {selectedProductData?.variants && selectedProductData.variants.length > 0 && (
              <div>
                <Label htmlFor="add-location-variant">{t('common:selectVariant')}</Label>
                <Select
                  value={addLocationVariantId || "none"}
                  onValueChange={(value) => {
                    if (value === "none") {
                      setAddLocationVariantId(null);
                      setAddLocationVariantName("");
                    } else {
                      const variant = selectedProductData.variants.find(v => v.id === value);
                      setAddLocationVariantId(value);
                      setAddLocationVariantName(variant?.name || "");
                    }
                  }}
                >
                  <SelectTrigger className="w-full" data-testid="select-variant-for-location">
                    <SelectValue placeholder={t('common:selectVariant')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-gray-500">{t('common:baseProduct')} ({t('common:noVariant')})</span>
                    </SelectItem>
                    {selectedProductData.variants.map((variant) => (
                      <SelectItem key={variant.id} value={variant.id}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{variant.name}</span>
                          <span className="text-xs text-gray-500">({variant.quantity} {t('units')})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">{t('common:selectWhichVariantAtLocation')}</p>
              </div>
            )}

            <WarehouseLocationSelector
              value={newLocationCode}
              onChange={setNewLocationCode}
              locationType={newLocationType}
              onLocationTypeChange={setNewLocationType}
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="add-location-quantity">{t('common:quantityAtLocation')}</Label>
                <Input
                  id="add-location-quantity"
                  type="number"
                  value={newLocationQuantity === 0 ? '' : newLocationQuantity}
                  onChange={(e) => setNewLocationQuantity(e.target.value === '' ? 0 : parseInt(e.target.value))}
                  min="0"
                  data-testid="input-add-location-quantity"
                />
              </div>

              <div className="flex items-end">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="add-location-primary"
                    checked={newLocationIsPrimary}
                    onChange={(e) => setNewLocationIsPrimary(e.target.checked)}
                    className="h-4 w-4"
                    data-testid="checkbox-add-location-primary"
                  />
                  <Label htmlFor="add-location-primary" className="cursor-pointer">
                    {t('common:setAsPrimaryLocation')}
                  </Label>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="add-location-notes">{t('common:notes')}</Label>
              <Textarea
                id="add-location-notes"
                value={newLocationNotes}
                onChange={(e) => setNewLocationNotes(e.target.value)}
                placeholder={t('common:optionalNotesAboutLocation')}
                rows={2}
                data-testid="textarea-add-location-notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddLocationDialogOpen(false)}
              data-testid="button-cancel-add-location"
            >
              {t('common:cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleAddLocation}
              disabled={addLocationMutation.isPending || !newLocationCode}
              data-testid="button-save-add-location"
            >
              {t('common:addLocation')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Location Confirmation Dialog */}
      <Dialog open={deleteConfirmDialogOpen} onOpenChange={setDeleteConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteLocation')}</DialogTitle>
            <DialogDescription>
              {t('deleteLocationConfirmation', { location: locationToDelete?.locationCode })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmDialogOpen(false)}>
              {t('common:cancel')}
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDeleteLocation}
              disabled={deleteLocationMutation.isPending}
            >
              {deleteLocationMutation.isPending ? t('common:deleting') : t('common:delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
