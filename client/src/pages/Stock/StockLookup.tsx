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
import { Search, Package, MapPin, Barcode, TrendingUp, TrendingDown, AlertCircle, ChevronRight, Layers, MoveRight, ArrowUpDown, FileText, AlertTriangle, X, Plus, Minus, Filter, ArrowUpDown as SortIcon, Printer, Tag, Info, ClipboardCheck } from "lucide-react";
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
  warehouseId: string;
  locationCode: string;
  quantity: number;
  isPrimary: boolean;
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
}

export default function StockLookup() {
  const { t } = useTranslation(['inventory', 'common']);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [descriptionDialogOpen, setDescriptionDialogOpen] = useState(false);
  const [labelDialogOpen, setLabelDialogOpen] = useState(false);
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

  // Fetch all products
  const { data: rawProducts = [], isLoading: productsLoading } = useQuery<any[]>({
    queryKey: ['/api/products'],
  });

  // Fetch warehouses for location display
  const { data: warehouses = [] } = useQuery<any[]>({
    queryKey: ['/api/warehouses'],
  });

  // Fetch categories for filtering
  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ['/api/categories'],
  });

  // Fetch all product locations for display in collapsed view
  const { data: productLocationsMap = {} } = useQuery<Record<string, { locationCode: string; quantity: number }[]>>({
    queryKey: ['/api/products/primary-locations'],
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
        priceEur: p.priceEur
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
  const { data: selectedVariants = [] } = useQuery<Variant[]>({
    queryKey: [`/api/products/${selectedProduct}/variants`],
    enabled: !!selectedProduct,
  });

  // Fetch locations for selected product
  const { data: selectedLocations = [], isLoading: locationsLoading } = useQuery<ProductLocation[]>({
    queryKey: [`/api/products/${selectedProduct}/locations`],
    enabled: !!selectedProduct,
  });

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
    onError: () => {
      toast({
        title: t('common:error'),
        description: t('common:failedToAddLocation'),
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
      toast({
        title: t('common:success'),
        description: t('common:locationDeletedSuccessfully'),
      });
      setDeleteLocationId(null);
      setDeleteLocationProductId(null);
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
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">{t('stockLookup')}</h1>
            <div className="flex items-center gap-2">
              <Link href="/stock/approvals">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  data-testid="button-adjustment-approvals"
                >
                  <ClipboardCheck className="h-4 w-4 mr-1.5" />
                  {t('adjustmentApprovals')}
                </Button>
              </Link>
              <Link href="/stock/labels">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  data-testid="button-manage-labels"
                >
                  <Tag className="h-4 w-4 mr-1.5" />
                  {t('manageLabels')}
                </Button>
              </Link>
              {enableBarcodeScanning && (
                <Button
                  variant={barcodeMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setBarcodeMode(!barcodeMode)}
                  className="h-8"
                  data-testid="button-toggle-barcode-mode"
                >
                  <Barcode className="h-4 w-4 mr-1.5" />
                  {barcodeMode ? t('scanning') : t('scanLabel')}
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
              <div className="mt-3 flex gap-2 text-xs text-gray-600 dark:text-gray-400">
                <span>{products.length} {t('productsCount')}</span>
                <span>•</span>
                <span>{filteredProducts.length} {t('resultsCount')}</span>
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
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 p-2 bg-orange-100 dark:bg-orange-900/50 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-1">
                    {t('stockInconsistencies')}
                  </h3>
                  <p className="text-sm text-orange-800 dark:text-orange-200 mb-3">
                    <span className="font-bold">{inconsistenciesCount}</span> {inconsistenciesCount === 1 ? t('itemHas') : t('itemsHave')} {t('stockDiscrepancies').toLowerCase()}
                  </p>
                  <Link href="/stock/inconsistencies">
                    <Button 
                      size="sm" 
                      className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800 text-white"
                      data-testid="button-view-inconsistencies"
                    >
                      {t('viewAndResolveIssues')}
                    </Button>
                  </Link>
                </div>
                <Badge className="bg-orange-600 text-white text-sm font-bold flex-shrink-0">
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
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 p-2 bg-orange-100 dark:bg-orange-900/50 rounded-lg">
                  <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base text-orange-900 dark:text-orange-100 mb-0.5">
                    {t('showingInconsistentItems')}
                  </h3>
                  <p className="text-xs sm:text-sm text-orange-800 dark:text-orange-200">
                    {t('discrepanciesBetweenRecorded')}
                  </p>
                </div>
                <Badge className="bg-orange-600 text-white text-xs sm:text-sm font-bold flex-shrink-0">
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
                onClick={() => setSelectedProduct(isExpanded ? null : product.id)}
                data-testid={`card-product-${product.id}`}
              >
                <CardContent className="p-3">
                  {/* Product Header */}
                  <div className="flex gap-3">
                    {/* Product Image */}
                    <div className="flex-shrink-0">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-20 w-20 rounded-md object-cover bg-gray-100 dark:bg-gray-800"
                        />
                      ) : (
                        <div className="h-20 w-20 rounded-md bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                          <Package className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      {/* Top Row: Name + Stock */}
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-sm leading-tight text-gray-900 dark:text-white line-clamp-2" data-testid={`text-product-name-${product.id}`}>
                            {product.name}
                          </h3>
                          <Badge variant="outline" className={`${status.borderColor} ${status.textColor} flex items-center gap-1 flex-shrink-0 h-6 px-2`}>
                            <StatusIcon className="h-3 w-3" />
                            <span className="font-bold">{displayProduct.totalStock}</span>
                          </Badge>
                        </div>
                        
                        {/* SKU and Category - More compact */}
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 mb-1.5">
                          {product.sku && (
                            <span className="flex items-center gap-0.5 font-mono">
                              <Barcode className="h-3 w-3" />
                              {product.sku}
                            </span>
                          )}
                          {product.categoryName && (
                            <>
                              {product.sku && <span>•</span>}
                              <span className="truncate">{product.categoryName}</span>
                            </>
                          )}
                        </div>

                        {/* Prices */}
                        {(product.priceCzk || product.priceEur) && (
                          <div className="flex items-center gap-2 text-xs font-medium">
                            {product.priceCzk && (
                              <span className="text-blue-600 dark:text-blue-400">
                                {Number(product.priceCzk).toLocaleString('cs-CZ')} Kč
                              </span>
                            )}
                            {product.priceCzk && product.priceEur && (
                              <span className="text-gray-400 dark:text-gray-600">•</span>
                            )}
                            {product.priceEur && (
                              <span className="text-green-600 dark:text-green-400">
                                €{Number(product.priceEur).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Bottom Row: Location info */}
                      <div className="flex items-center justify-between mt-1">
                        {displayProduct.locations && displayProduct.locations.length > 0 ? (
                          <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                            <MapPin className="h-3.5 w-3.5 text-cyan-500" />
                            <span className="text-[11px] font-medium font-mono">
                              {displayProduct.locations[0].locationCode}
                            </span>
                            {displayProduct.locations.length > 1 && (
                              <span className="text-[10px] text-gray-400">+{displayProduct.locations.length - 1}</span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-gray-400 dark:text-gray-500">
                            <MapPin className="h-3.5 w-3.5" />
                            <span className="text-[11px]">{t('noLocation')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Expand Indicator */}
                    <ChevronRight className={`h-4 w-4 text-gray-400 flex-shrink-0 self-center transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && selectedProductData && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                      {/* Stock Breakdown */}
                      <div className={`grid gap-3 ${selectedProductData.variants.length > 0 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{t('baseStock')}</p>
                          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{selectedProductData.quantity}</p>
                        </div>
                        {selectedProductData.variants.length > 0 && (
                          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{t('variantStock')}</p>
                            <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                              {selectedProductData.variants.reduce((sum, v) => sum + (v.quantity || 0), 0)}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Variants List */}
                      {selectedProductData.variants.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                            <Layers className="h-4 w-4" />
                            {t('productVariants')} ({selectedProductData.variants.length})
                          </h4>
                          <div className="space-y-2">
                            {selectedProductData.variants.map((variant) => (
                              <div
                                key={variant.id}
                                className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg p-3"
                              >
                                <div className="flex items-center gap-3 flex-1">
                                  {variant.imageUrl ? (
                                    <img
                                      src={variant.imageUrl}
                                      alt={variant.name}
                                      className="h-10 w-10 rounded object-cover"
                                    />
                                  ) : (
                                    <div className="h-10 w-10 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                      <Package className="h-5 w-5 text-gray-400" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                      {variant.name}
                                    </p>
                                    {variant.barcode && (
                                      <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                        {variant.barcode}
                                      </p>
                                    )}
                                    {variant.locationCode ? (
                                      <div className="flex items-center gap-1 mt-1">
                                        <MapPin className="h-3 w-3 text-green-600 dark:text-green-400" />
                                        <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                                          {variant.locationCode}
                                        </span>
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <button 
                                              onClick={(e) => e.stopPropagation()}
                                              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded ml-1"
                                            >
                                              <svg className="h-3 w-3 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                              </svg>
                                            </button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenuItem
                                              className="text-red-600 dark:text-red-400"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (variant.locationId) {
                                                  handleDeleteVariantLocation(selectedProductData.id, variant.locationId);
                                                }
                                              }}
                                            >
                                              <X className="h-4 w-4 mr-2" />
                                              {t('common:deleteLocation')}
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setAddLocationProductId(selectedProductData.id);
                                          setAddLocationProductName(selectedProductData.name);
                                          setAddLocationVariantId(variant.id);
                                          setAddLocationVariantName(variant.name);
                                          setNewLocationType("warehouse");
                                          setNewLocationCode("");
                                          setNewLocationQuantity(variant.quantity || 0);
                                          setNewLocationIsPrimary(false);
                                          setNewLocationNotes("");
                                          setAddLocationDialogOpen(true);
                                        }}
                                        className="flex items-center gap-1 mt-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                      >
                                        <Plus className="h-3 w-3" />
                                        {t('common:addLocation')}
                                      </button>
                                    )}
                                    {(variant.priceCzk || variant.priceEur) && (
                                      <div className="flex items-center gap-2 text-[11px] font-medium mt-1">
                                        {variant.priceCzk && (
                                          <span className="text-blue-600 dark:text-blue-400">
                                            {Number(variant.priceCzk).toLocaleString('cs-CZ')} Kč
                                          </span>
                                        )}
                                        {variant.priceCzk && variant.priceEur && (
                                          <span className="text-gray-400 dark:text-gray-600">•</span>
                                        )}
                                        {variant.priceEur && (
                                          <span className="text-green-600 dark:text-green-400">
                                            €{Number(variant.priceEur).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <Badge variant="secondary" className="ml-2 flex-shrink-0">
                                  {variant.quantity} {t('units')}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Warehouse Locations */}
                      {locationsLoading ? (
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-16 w-full" />
                        </div>
                      ) : selectedProductData.locations && selectedProductData.locations.length > 0 ? (
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              {t('warehouseLocations')} ({selectedProductData.locations.length})
                            </h4>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenAddLocationDialog(product.id, product.name);
                              }}
                              data-testid={`button-add-location-${product.id}`}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              {t('addLocation')}
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {selectedProductData.locations.map((loc) => (
                              <div
                                key={loc.id}
                                className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3"
                                data-testid={`location-card-${loc.id}`}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white font-mono">
                                      {loc.locationCode}
                                    </p>
                                    {loc.isPrimary && (
                                      <Badge variant="default" className="mt-1 h-5 text-xs">
                                        {t('primary')}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 ml-2">
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-7 w-7 hover:bg-red-50 hover:border-red-300 dark:hover:bg-red-900/20"
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
                                      <Minus className="h-3.5 w-3.5" />
                                    </Button>
                                    <Badge variant="secondary" className="px-2.5">
                                      {loc.quantity} {t('units')}
                                    </Badge>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-7 w-7 hover:bg-green-50 hover:border-green-300 dark:hover:bg-green-900/20"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedLocation(loc);
                                        setQuickButtonType('add');
                                        setAdjustDialogOpen(true);
                                      }}
                                      data-testid={`button-quick-plus-${loc.id}`}
                                      title={t('quickAddStock')}
                                    >
                                      <Plus className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="flex gap-2 mt-3">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 h-8 text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedLocation(loc);
                                      setMoveDialogOpen(true);
                                    }}
                                    data-testid={`button-move-${loc.id}`}
                                  >
                                    <MoveRight className="h-3 w-3 mr-1" />
                                    {t('move')}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 h-8 text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedLocation(loc);
                                      setQuickButtonType(null); // Clear quick button type for manual adjust
                                      setAdjustDialogOpen(true);
                                    }}
                                    data-testid={`button-adjust-${loc.id}`}
                                  >
                                    <ArrowUpDown className="h-3 w-3 mr-1" />
                                    {t('adjust')}
                                  </Button>
                                </div>
                              </div>
                            ))}
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
                              {t('noWarehouseLocations')}
                            </p>
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
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        {selectedProductData.description && (
                          <Button
                            variant="outline"
                            className="flex-1 h-10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDescriptionDialogOpen(true);
                            }}
                            data-testid={`button-view-description-${product.id}`}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            {t('viewItemDescription')}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          className="flex-1 h-10"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLabelDialogOpen(true);
                          }}
                          data-testid={`button-generate-label-${product.id}`}
                        >
                          <Printer className="h-4 w-4 mr-2" />
                          {t('generateLabel')}
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1 h-10"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInfoDialogOpen(true);
                          }}
                          data-testid={`button-show-info-${product.id}`}
                        >
                          <Info className="h-4 w-4 mr-2" />
                          {t('showInfo')}
                        </Button>
                      </div>
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
                  value={newLocationQuantity}
                  onChange={(e) => setNewLocationQuantity(parseInt(e.target.value) || 0)}
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
    </div>
  );
}
