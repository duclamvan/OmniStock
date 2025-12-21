import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, 
  Package, 
  Edit, 
  TrendingUp, 
  TrendingDown,
  Image as ImageIcon,
  Hand,
  PackageOpen,
  FileType,
  DollarSign,
  MapPin,
  Barcode,
  Box,
  Euro,
  Warehouse,
  Users,
  Ruler,
  Weight,
  ShoppingCart,
  BarChart3,
  Sparkles,
  Layers,
  FileText,
  MapPinned,
  Truck,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Info,
  Tag,
  Repeat,
  ChevronRight,
  Grid3X3,
  Settings2,
  History,
  Minus,
  ExternalLink
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/currencyUtils";
import CostHistoryChart from "@/components/products/CostHistoryChart";
import ProductFiles from "@/components/ProductFiles";
import ProductLocations from "@/components/ProductLocations";
import ProductVariants from "@/components/ProductVariants";
import { ImagePlaceholder } from "@/components/ImagePlaceholder";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const IMAGE_PURPOSE_ICONS = {
  main: { icon: ImageIcon, color: 'text-blue-600', labelKey: 'mainWmsImage' },
  in_hand: { icon: Hand, color: 'text-emerald-600', labelKey: 'inHand' },
  detail: { icon: PackageOpen, color: 'text-indigo-600', labelKey: 'detailShot' },
  packaging: { icon: Package, color: 'text-orange-600', labelKey: 'packagingLabel' },
  label: { icon: FileType, color: 'text-cyan-600', labelKey: 'labelBarcode' },
};

interface NavSection {
  id: string;
  label: string;
  icon: React.ElementType;
}

export default function ProductDetails() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { canViewImportCost: canAccessFinancialData } = useAuth();
  const { t } = useTranslation(['products', 'common']);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [activeSection, setActiveSection] = useState('overview');
  const { toast } = useToast();
  
  // Store section references for scroll detection
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const isManualScrollingRef = useRef(false);

  const { data: product, isLoading } = useQuery<any>({
    queryKey: ['/api/products', id],
    enabled: !!id,
  });

  const { data: orders } = useQuery<any[]>({ queryKey: ['/api/orders'] });
  const { data: warehouses } = useQuery<any[]>({ queryKey: ['/api/warehouses'] });
  const { data: categories } = useQuery<any[]>({ queryKey: ['/api/categories'] });
  const { data: suppliers } = useQuery<any[]>({ queryKey: ['/api/suppliers'] });
  const { data: packingMaterials } = useQuery<any[]>({ queryKey: ['/api/packing-materials'] });
  const { data: variants = [] } = useQuery<any[]>({
    queryKey: [`/api/products/${id}/variants`],
    enabled: !!id,
  });
  const { data: tieredPricing = [] } = useQuery<any[]>({
    queryKey: ['/api/products', id, 'tiered-pricing'],
    enabled: !!id,
  });
  const { data: costHistory = [] } = useQuery<any[]>({
    queryKey: ['/api/products', id, 'cost-history'],
    enabled: !!id,
  });
  const { data: bundles = [] } = useQuery<any[]>({
    queryKey: ['/api/bundles'],
    staleTime: 5 * 60 * 1000,
  });

  // Calculate cost trend from history
  const costTrend = (() => {
    if (!costHistory || costHistory.length < 2) return null;
    
    // Sort by date descending (most recent first)
    const sorted = [...costHistory].sort((a, b) => 
      new Date(b.computedAt || b.createdAt).getTime() - new Date(a.computedAt || a.createdAt).getTime()
    );
    
    const latest = parseFloat(sorted[0]?.landingCostUnitBase || '0');
    const previous = parseFloat(sorted[1]?.landingCostUnitBase || '0');
    
    if (previous === 0 || latest === 0) return null;
    
    const changePercent = ((latest - previous) / previous) * 100;
    const direction = changePercent > 0 ? 'up' : changePercent < 0 ? 'down' : 'same';
    
    return {
      latest,
      previous,
      changePercent: Math.abs(changePercent).toFixed(1),
      direction,
      historyCount: costHistory.length
    };
  })();

  const recalculateReorderRate = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/products/${id}/reorder-rate`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to recalculate reorder rate');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products', id] });
      toast({
        title: t('common:success'),
        description: t('products:reorderRateSuccess'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('common:error'),
        description: error.message || t('products:reorderRateError'),
        variant: "destructive",
      });
    },
  });

  // Build navigation sections dynamically
  const navSections: NavSection[] = [
    { id: 'overview', label: t('products:overview', 'Overview'), icon: Info },
    { id: 'stock', label: t('products:stockInventory', 'Stock & Inventory'), icon: Box },
    { id: 'pricing', label: t('products:pricingInformation', 'Pricing'), icon: Euro },
    { id: 'details', label: t('products:productDetails', 'Details'), icon: Tag },
    { id: 'warehouse', label: t('common:warehouseLocation', 'Warehouse'), icon: Warehouse },
    ...(variants.length > 0 ? [{ id: 'variants', label: t('products:variantsTab', 'Variants'), icon: Sparkles }] : []),
    ...(tieredPricing.length > 0 ? [{ id: 'tiered', label: t('products:tieredPricing.title', 'Tiered Pricing'), icon: BarChart3 }] : []),
    { id: 'packing', label: t('products:packingInstructions', 'Packing'), icon: Package },
    { id: 'files', label: t('products:productFiles', 'Files'), icon: FileText },
  ];

  // Use scroll event for precise section detection
  useEffect(() => {
    const handleScroll = () => {
      if (isManualScrollingRef.current) return;
      
      const isAtBottom = (window.innerHeight + window.scrollY) >= (document.documentElement.scrollHeight - 50);
      
      if (isAtBottom && navSections.length > 0) {
        setActiveSection(navSections[navSections.length - 1].id);
        return;
      }
      
      const triggerPoint = 120;
      
      const sectionsWithPositions = Object.entries(sectionRefs.current)
        .filter(([_, el]) => el !== null)
        .map(([id, el]) => ({
          id,
          top: el!.getBoundingClientRect().top
        }))
        .sort((a, b) => a.top - b.top);
      
      let activeId = sectionsWithPositions[0]?.id || 'overview';
      
      for (const section of sectionsWithPositions) {
        if (section.top <= triggerPoint) {
          activeId = section.id;
        } else {
          break;
        }
      }
      
      setActiveSection(activeId);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [navSections]);

  // Ref callback to register sections
  const setSectionRef = useCallback((sectionId: string) => (el: HTMLElement | null) => {
    sectionRefs.current[sectionId] = el;
  }, []);

  const scrollToSection = (sectionId: string) => {
    isManualScrollingRef.current = true;
    setActiveSection(sectionId);
    const element = sectionRefs.current[sectionId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setTimeout(() => {
      isManualScrollingRef.current = false;
    }, 1000);
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!product) return null;

  const productOrders = orders?.filter(order => 
    order.items?.some((item: any) => item.productId === product.id)
  ) || [];
  const totalSold = productOrders.reduce((sum, order) => {
    const items = order.items?.filter((item: any) => item.productId === product.id) || [];
    return sum + items.reduce((itemSum: number, item: any) => itemSum + (item.quantity || 0), 0);
  }, 0);
  const totalRevenue = productOrders.reduce((sum, order) => {
    const items = order.items?.filter((item: any) => item.productId === product.id) || [];
    return sum + items.reduce((itemSum: number, item: any) => itemSum + ((item.price || 0) * (item.quantity || 0)), 0);
  }, 0);

  const warehouse = warehouses?.find((w: any) => w.id === product.warehouseId);
  const category = categories?.find((c: any) => String(c.id) === product.categoryId);
  const supplier = suppliers?.find((s: any) => s.id === product.supplierId);
  const packingMaterial = packingMaterials?.find((pm: any) => pm.id === product.packingMaterialId);

  // Parse images
  let productImages: any[] = [];
  try {
    if (product.images) {
      const parsed = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
      productImages = Array.isArray(parsed) ? parsed : [];
    }
  } catch {
    productImages = [];
  }
  if (productImages.length === 0 && product.imageUrl) {
    productImages = [{ url: product.imageUrl, purpose: 'main', isPrimary: true }];
  }

  const displayImage = productImages[selectedImageIndex]?.url || productImages[0]?.url || product.imageUrl;

  // Calculate margins
  const landingCostEur = parseFloat(product.latestLandingCost) || parseFloat(product.importCostEur) || 0;
  const landingCostCzk = parseFloat(product.importCostCzk) || 0;
  const priceEur = parseFloat(product.priceEur) || 0;
  const priceCzk = parseFloat(product.priceCzk) || 0;
  const marginEur = priceEur && landingCostEur ? ((priceEur - landingCostEur) / priceEur * 100).toFixed(1) : null;
  const marginCzk = priceCzk && landingCostCzk ? ((priceCzk - landingCostCzk) / priceCzk * 100).toFixed(1) : null;
  const primaryMargin = marginEur || marginCzk || '0';

  // Stock status
  const stockStatus = product.quantity <= 0 ? 'out' : product.quantity <= (product.lowStockAlert || 5) ? 'critical' : product.quantity <= (product.lowStockAlert || 5) * 2 ? 'low' : 'healthy';

  // Parse packing instructions
  let packingInstructions: any[] = [];
  try {
    const texts = product.packingInstructionsTexts ? JSON.parse(product.packingInstructionsTexts) : [];
    const images = product.packingInstructionsImages ? JSON.parse(product.packingInstructionsImages) : [];
    packingInstructions = texts.map((text: string, i: number) => ({
      text,
      image: images[i] || null
    }));
  } catch {}

  // Bundles containing this product
  const productBundles = bundles.filter((b: any) => b.items?.some((item: any) => item.productId === id));

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header */}
      <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="w-full px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => window.history.back()} 
                className="shrink-0 h-9 w-9"
                data-testid="button-back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold truncate">{product.name}</h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-mono">{product.sku}</span>
                  {product.barcode && (
                    <>
                      <span className="text-border">•</span>
                      <span className="font-mono text-xs">{product.barcode}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <Link href={`/inventory/${id}/edit`}>
              <Button size="sm" className="shrink-0" data-testid="button-edit-product">
                <Edit className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">{t('products:editProduct')}</span>
                <span className="sm:hidden">{t('common:edit')}</span>
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Mobile Navigation Pills */}
        <div className="lg:hidden border-t">
          <ScrollArea className="w-full">
            <div className="flex gap-1 p-2">
              {navSections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                      activeSection === section.id 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                    }`}
                    data-testid={`nav-mobile-${section.id}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {section.label}
                  </button>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </div>

      <div className="flex">
        {/* Desktop Sidebar Navigation - Sticky position */}
        <aside className="hidden lg:block w-56 shrink-0">
          <nav className="sticky top-20 h-fit max-h-[calc(100vh-6rem)] overflow-y-auto border-r bg-muted/30 p-3 space-y-1">
            {navSections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                    activeSection === section.id 
                      ? 'bg-primary text-primary-foreground shadow-sm' 
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                  data-testid={`nav-desktop-${section.id}`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{section.label}</span>
                  {activeSection === section.id && (
                    <ChevronRight className="h-4 w-4 ml-auto shrink-0" />
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-4 py-3 sm:py-6 space-y-4 sm:space-y-6">
          
          {/* HERO: Location, Stock & Packaging Emphasis */}
          <section 
            id="overview" 
            ref={setSectionRef('overview')}
            className="scroll-mt-32 lg:scroll-mt-24"
          >
            {/* Primary Stats - Location, Stock, Packaging */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-3 sm:mb-6">
              {/* Location Code - EMPHASIZED */}
              <div className="relative overflow-hidden rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-2.5 sm:p-5 text-white shadow-md sm:shadow-lg">
                <div className="absolute top-0 right-0 opacity-10 hidden sm:block">
                  <MapPin className="h-24 w-24 -mt-4 -mr-4" />
                </div>
                <div className="relative">
                  <p className="text-blue-100 text-[10px] sm:text-sm font-medium">{t('common:locationCode')}</p>
                  <p className="text-lg sm:text-3xl font-bold font-mono tracking-wide truncate">
                    {product.warehouseLocation || '—'}
                  </p>
                  <p className="text-blue-200 text-[10px] sm:text-xs mt-0.5 sm:mt-2 truncate hidden sm:block">{warehouse?.name || t('common:notAssigned')}</p>
                </div>
              </div>

              {/* Stock Quantity - EMPHASIZED */}
              <div className={`relative overflow-hidden rounded-lg sm:rounded-xl p-2.5 sm:p-5 text-white shadow-md sm:shadow-lg ${
                stockStatus === 'out' ? 'bg-gradient-to-br from-red-500 to-red-600' :
                stockStatus === 'critical' ? 'bg-gradient-to-br from-orange-500 to-orange-600' :
                stockStatus === 'low' ? 'bg-gradient-to-br from-yellow-500 to-yellow-600' :
                'bg-gradient-to-br from-emerald-500 to-emerald-600'
              }`}>
                <div className="absolute top-0 right-0 opacity-10 hidden sm:block">
                  <Box className="h-24 w-24 -mt-4 -mr-4" />
                </div>
                <div className="relative">
                  <p className={`text-[10px] sm:text-sm font-medium ${
                    stockStatus === 'out' ? 'text-red-100' :
                    stockStatus === 'critical' ? 'text-orange-100' :
                    stockStatus === 'low' ? 'text-yellow-100' :
                    'text-emerald-100'
                  }`}>{t('products:stockQty')}</p>
                  <p className="text-lg sm:text-3xl font-bold">{product.quantity || 0}</p>
                  <div className="hidden sm:flex items-center gap-1.5 mt-2">
                    {stockStatus === 'out' && <AlertTriangle className="h-3.5 w-3.5" />}
                    {stockStatus === 'critical' && <AlertTriangle className="h-3.5 w-3.5" />}
                    {stockStatus === 'low' && <AlertTriangle className="h-3.5 w-3.5" />}
                    {stockStatus === 'healthy' && <CheckCircle className="h-3.5 w-3.5" />}
                    <span className="text-xs">
                      {stockStatus === 'out' ? t('products:outOfStock') :
                       stockStatus === 'critical' ? t('products:criticalStock') :
                       stockStatus === 'low' ? t('products:lowStock') :
                       t('products:inStock')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Packaging Unit - EMPHASIZED */}
              <div className="relative overflow-hidden rounded-lg sm:rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 p-2.5 sm:p-5 text-white shadow-md sm:shadow-lg">
                <div className="absolute top-0 right-0 opacity-10 hidden sm:block">
                  <Package className="h-24 w-24 -mt-4 -mr-4" />
                </div>
                <div className="relative">
                  <p className="text-purple-100 text-[10px] sm:text-sm font-medium">{t('products:packingMaterial')}</p>
                  <p className="text-sm sm:text-xl font-bold truncate">
                    {packingMaterial?.name || '—'}
                  </p>
                  {packingMaterial?.dimensions && (
                    <p className="text-purple-200 text-[10px] sm:text-xs mt-0.5 sm:mt-2 font-mono truncate hidden sm:block">{packingMaterial.dimensions}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Product Image & Quick Info - Mobile: side-by-side */}
            <div className="grid grid-cols-5 sm:grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6">
              {/* Product Image - Smaller on mobile */}
              <div className="col-span-2 sm:col-span-1 md:col-span-1">
                <div className="aspect-square bg-muted rounded-lg sm:rounded-xl overflow-hidden border">
                  {displayImage ? (
                    <img src={displayImage} alt={product.name} className="w-full h-full object-contain" />
                  ) : (
                    <ImagePlaceholder className="w-full h-full" />
                  )}
                </div>
                {productImages.length > 1 && (
                  <div className="grid grid-cols-5 gap-1 sm:gap-2 mt-1.5 sm:mt-3">
                    {productImages.slice(0, 5).map((img, idx) => {
                      const config = IMAGE_PURPOSE_ICONS[img.purpose as keyof typeof IMAGE_PURPOSE_ICONS];
                      const Icon = config?.icon || ImageIcon;
                      return (
                        <button
                          key={idx}
                          onClick={() => setSelectedImageIndex(idx)}
                          className={`aspect-square rounded border-2 overflow-hidden transition-all ${
                            idx === selectedImageIndex 
                              ? 'border-primary ring-1 ring-primary/20' 
                              : 'border-border hover:border-primary/50'
                          }`}
                          data-testid={`image-thumb-${idx}`}
                        >
                          {img.url ? (
                            <img src={img.url} alt="" className="w-full h-full object-contain" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-muted">
                              <Icon className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Quick Stats Grid - Compact on mobile */}
              <div className="col-span-3 sm:col-span-1 md:col-span-2 grid grid-cols-2 gap-1.5 sm:gap-3">
                <div className="rounded-lg border bg-card p-2 sm:p-4">
                  <div className="flex items-center justify-between mb-0.5 sm:mb-2">
                    <span className="text-[10px] sm:text-sm text-muted-foreground">{t('common:totalSold')}</span>
                    <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                  </div>
                  <p className="text-base sm:text-2xl font-bold">{totalSold}</p>
                </div>

                <div className="rounded-lg border bg-card p-2 sm:p-4">
                  <div className="flex items-center justify-between mb-0.5 sm:mb-2">
                    <span className="text-[10px] sm:text-sm text-muted-foreground">{t('common:totalRevenue')}</span>
                    <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm sm:text-2xl font-bold truncate">{formatCurrency(totalRevenue, 'CZK')}</p>
                </div>

                {canAccessFinancialData && (
                  <div className="rounded-lg border bg-card p-2 sm:p-4">
                    <div className="flex items-center justify-between mb-0.5 sm:mb-2">
                      <span className="text-[10px] sm:text-sm text-muted-foreground">{t('products:margin')}</span>
                      <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                    </div>
                    <p className={`text-base sm:text-2xl font-bold ${
                      parseFloat(primaryMargin) > 30 ? 'text-green-600' : 
                      parseFloat(primaryMargin) > 15 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {primaryMargin}%
                    </p>
                  </div>
                )}

                <div className="rounded-lg border bg-card p-2 sm:p-4">
                  <div className="flex items-center justify-between mb-0.5 sm:mb-2">
                    <span className="text-[10px] sm:text-sm text-muted-foreground">{t('common:reorderRate')}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => recalculateReorderRate.mutate()}
                      disabled={recalculateReorderRate.isPending}
                      className="h-5 w-5 sm:h-6 sm:w-6"
                      data-testid="button-recalculate-reorder-rate"
                    >
                      <RefreshCw className={`h-2.5 w-2.5 sm:h-3 sm:w-3 ${recalculateReorderRate.isPending ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                  <p className="text-base sm:text-2xl font-bold">
                    {product.reorderRate !== null && product.reorderRate !== undefined 
                      ? `${parseFloat(product.reorderRate).toFixed(1)}%` 
                      : t('common:na')}
                  </p>
                </div>

                <div className="rounded-lg border bg-card p-2 sm:p-4">
                  <div className="flex items-center justify-between mb-0.5 sm:mb-2">
                    <span className="text-[10px] sm:text-sm text-muted-foreground">{t('products:category')}</span>
                    <Grid3X3 className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs sm:text-lg font-semibold truncate">{category?.name || t('common:uncategorized')}</p>
                </div>

                <div className="rounded-lg border bg-card p-2 sm:p-4">
                  <div className="flex items-center justify-between mb-0.5 sm:mb-2">
                    <span className="text-[10px] sm:text-sm text-muted-foreground">{t('products:lowStockThreshold')}</span>
                    <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs sm:text-lg font-semibold">{product.lowStockAlert || 5}</p>
                </div>
              </div>
            </div>
          </section>

          <Separator />

          {/* Stock & Inventory Section */}
          <section 
            id="stock" 
            ref={setSectionRef('stock')}
            className="scroll-mt-32 lg:scroll-mt-24 space-y-2 sm:space-y-4"
          >
            <h2 className="text-base sm:text-xl font-semibold flex items-center gap-2">
              <Box className="h-4 w-4 sm:h-5 sm:w-5" />
              {t('products:stockInventory', 'Stock & Inventory')}
            </h2>
            
            <div className="rounded-lg sm:rounded-xl border bg-card">
              <div className="p-2.5 sm:p-4 grid grid-cols-4 gap-2 sm:gap-4">
                <div>
                  <p className="text-[10px] sm:text-sm text-muted-foreground">{t('products:currentStock')}</p>
                  <p className="text-lg sm:text-2xl font-bold">{product.quantity || 0}</p>
                </div>
                <div>
                  <p className="text-[10px] sm:text-sm text-muted-foreground">{t('products:lowStockThreshold')}</p>
                  <p className="text-lg sm:text-2xl font-bold">{product.lowStockAlert || 5}</p>
                </div>
                <div>
                  <p className="text-[10px] sm:text-sm text-muted-foreground">{t('products:reservedStock', 'Reserved')}</p>
                  <p className="text-lg sm:text-2xl font-bold">{product.reservedQuantity || 0}</p>
                </div>
                <div>
                  <p className="text-[10px] sm:text-sm text-muted-foreground">{t('products:availableStock', 'Available')}</p>
                  <p className="text-lg sm:text-2xl font-bold text-green-600">
                    {(product.quantity || 0) - (product.reservedQuantity || 0)}
                  </p>
                </div>
              </div>
              
              {/* Product Locations */}
              <Separator />
              <div className="p-2.5 sm:p-4">
                <h3 className="font-medium mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
                  <MapPinned className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  {t('products:productLocations')}
                </h3>
                <ProductLocations productId={id!} />
              </div>
            </div>
          </section>

          <Separator />

          {/* Pricing Section */}
          <section 
            id="pricing" 
            ref={setSectionRef('pricing')}
            className="scroll-mt-32 lg:scroll-mt-24 space-y-2 sm:space-y-4"
          >
            <h2 className="text-base sm:text-xl font-semibold flex items-center gap-2">
              <Euro className="h-4 w-4 sm:h-5 sm:w-5" />
              {t('products:pricingInformation')}
            </h2>
            
            <div className="rounded-lg sm:rounded-xl border bg-card p-2.5 sm:p-4 space-y-3 sm:space-y-6">
              {/* Selling Prices */}
              <div>
                <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
                  <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  {t('common:sellingPrice')}
                </h3>
                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  <div className="p-2 sm:p-4 rounded-lg bg-muted/50">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">CZK</p>
                    <p className="text-base sm:text-2xl font-bold">{formatCurrency(priceCzk, 'CZK')}</p>
                  </div>
                  <div className="p-2 sm:p-4 rounded-lg bg-muted/50">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">EUR</p>
                    <p className="text-base sm:text-2xl font-bold">{formatCurrency(priceEur, 'EUR')}</p>
                  </div>
                </div>
              </div>

              {/* Import Costs */}
              {canAccessFinancialData && (landingCostEur > 0 || landingCostCzk > 0 || product.importCostUsd) && (
                <div>
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground flex items-center gap-1.5 sm:gap-2">
                      <Truck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      {t('products:importCost')}
                      {costTrend && (
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                          costTrend.direction === 'up' 
                            ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400' 
                            : costTrend.direction === 'down'
                              ? 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {costTrend.direction === 'up' && <TrendingUp className="h-3 w-3" />}
                          {costTrend.direction === 'down' && <TrendingDown className="h-3 w-3" />}
                          {costTrend.direction === 'same' && <Minus className="h-3 w-3" />}
                          {costTrend.direction === 'up' ? '+' : costTrend.direction === 'down' ? '-' : ''}{costTrend.changePercent}%
                        </span>
                      )}
                    </h3>
                    {costHistory.length > 0 && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground" data-testid="button-view-cost-history">
                            <History className="h-3 w-3" />
                            {t('products:viewHistory', 'View History')} ({costHistory.length})
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] sm:max-h-[80vh] overflow-hidden">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <History className="h-5 w-5" />
                              {t('products:costHistory')} - {product.name}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 overflow-y-auto max-h-[60vh]">
                            {/* Chart */}
                            <div className="p-4 bg-muted/30 rounded-lg">
                              <CostHistoryChart data={costHistory} />
                            </div>
                            
                            {/* Summary Stats */}
                            {costTrend && (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="p-3 rounded-lg border bg-card">
                                  <p className="text-xs text-muted-foreground">{t('products:latestCost', 'Latest Cost')}</p>
                                  <p className="text-lg font-bold">{formatCurrency(costTrend.latest, 'CZK')}</p>
                                </div>
                                <div className="p-3 rounded-lg border bg-card">
                                  <p className="text-xs text-muted-foreground">{t('products:previousCost', 'Previous Cost')}</p>
                                  <p className="text-lg font-bold">{formatCurrency(costTrend.previous, 'CZK')}</p>
                                </div>
                                <div className={`p-3 rounded-lg border ${
                                  costTrend.direction === 'up' 
                                    ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' 
                                    : costTrend.direction === 'down'
                                      ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
                                      : 'bg-muted/50'
                                }`}>
                                  <p className="text-xs text-muted-foreground">{t('products:change', 'Change')}</p>
                                  <p className={`text-lg font-bold flex items-center gap-1 ${
                                    costTrend.direction === 'up' ? 'text-red-600' : costTrend.direction === 'down' ? 'text-green-600' : ''
                                  }`}>
                                    {costTrend.direction === 'up' && <TrendingUp className="h-4 w-4" />}
                                    {costTrend.direction === 'down' && <TrendingDown className="h-4 w-4" />}
                                    {costTrend.direction === 'up' ? '+' : costTrend.direction === 'down' ? '-' : ''}{costTrend.changePercent}%
                                  </p>
                                </div>
                              </div>
                            )}
                            
                            {/* History Table */}
                            <div className="border rounded-lg overflow-x-auto">
                              <Table className="min-w-[320px]">
                                <TableHeader>
                                  <TableRow className="bg-muted/30">
                                    <TableHead className="text-xs">{t('common:date', 'Date')}</TableHead>
                                    <TableHead className="text-xs text-right">{t('products:landingCost', 'Landing Cost')}</TableHead>
                                    <TableHead className="text-xs">{t('products:method', 'Method')}</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {[...costHistory]
                                    .sort((a, b) => new Date(b.computedAt || b.createdAt).getTime() - new Date(a.computedAt || a.createdAt).getTime())
                                    .map((entry: any, index: number) => (
                                      <TableRow key={entry.id || index} className="text-sm">
                                        <TableCell className="font-medium">
                                          {new Date(entry.computedAt || entry.createdAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                          {formatCurrency(parseFloat(entry.landingCostUnitBase || '0'), 'CZK')}
                                        </TableCell>
                                        <TableCell>
                                          <Badge variant="outline" className="text-xs capitalize">
                                            {entry.method?.replace('_', ' ') || 'import'}
                                          </Badge>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
                    {product.importCostUsd && (
                      <div className="p-1.5 sm:p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                        <p className="text-[10px] sm:text-xs text-muted-foreground">USD</p>
                        <p className="text-sm sm:text-lg font-semibold">${parseFloat(product.importCostUsd).toFixed(2)}</p>
                      </div>
                    )}
                    {landingCostCzk > 0 && (
                      <div className="p-1.5 sm:p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                        <p className="text-[10px] sm:text-xs text-muted-foreground">CZK</p>
                        <p className="text-sm sm:text-lg font-semibold">{formatCurrency(landingCostCzk, 'CZK')}</p>
                      </div>
                    )}
                    {landingCostEur > 0 && (
                      <div className="p-1.5 sm:p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                        <p className="text-[10px] sm:text-xs text-muted-foreground">EUR</p>
                        <p className="text-sm sm:text-lg font-semibold">{formatCurrency(landingCostEur, 'EUR')}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Margins */}
              {canAccessFinancialData && (marginEur || marginCzk) && (
                <div>
                  <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
                    <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    {t('products:margin')}
                  </h3>
                  <div className="grid grid-cols-2 gap-1.5 sm:gap-3">
                    {marginCzk && (
                      <div className="p-2 sm:p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
                        <p className="text-[10px] sm:text-xs text-muted-foreground">{t('common:marginCzk')}</p>
                        <p className="text-base sm:text-xl font-bold text-green-600">{marginCzk}%</p>
                      </div>
                    )}
                    {marginEur && (
                      <div className="p-2 sm:p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
                        <p className="text-[10px] sm:text-xs text-muted-foreground">{t('common:marginEur')}</p>
                        <p className="text-base sm:text-xl font-bold text-green-600">{marginEur}%</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Cost History Chart - hidden on mobile, accessible via dialog */}
              {canAccessFinancialData && costHistory.length > 0 && (
                <div className="hidden sm:block">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    {t('products:costHistory')}
                  </h3>
                  <CostHistoryChart data={costHistory} />
                </div>
              )}
            </div>
          </section>

          <Separator />

          {/* Product Details Section */}
          <section 
            id="details" 
            ref={setSectionRef('details')}
            className="scroll-mt-32 lg:scroll-mt-24 space-y-2 sm:space-y-4"
          >
            <h2 className="text-base sm:text-xl font-semibold flex items-center gap-2">
              <Tag className="h-4 w-4 sm:h-5 sm:w-5" />
              {t('products:productDetails', 'Product Details')}
            </h2>
            
            <div className="rounded-lg sm:rounded-xl border bg-card p-2.5 sm:p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
                <div>
                  <p className="text-[10px] sm:text-sm text-muted-foreground">{t('products:productName')}</p>
                  <p className="text-xs sm:text-base font-medium truncate">{product.name}</p>
                </div>
                <div>
                  <p className="text-[10px] sm:text-sm text-muted-foreground">{t('products:sku')}</p>
                  <p className="text-xs sm:text-base font-medium font-mono">{product.sku}</p>
                </div>
                {product.barcode && (
                  <div>
                    <p className="text-[10px] sm:text-sm text-muted-foreground">{t('products:barcode')}</p>
                    <p className="text-xs sm:text-base font-medium font-mono truncate">{product.barcode}</p>
                  </div>
                )}
                {product.vietnameseName && (
                  <div>
                    <p className="text-[10px] sm:text-sm text-muted-foreground">{t('products:vietnameseName')}</p>
                    <p className="text-xs sm:text-base font-medium truncate">{product.vietnameseName}</p>
                  </div>
                )}
                {supplier && (
                  <div>
                    <p className="text-[10px] sm:text-sm text-muted-foreground">{t('products:supplier')}</p>
                    <p className="text-xs sm:text-base font-medium truncate">{supplier.name}</p>
                  </div>
                )}
              </div>

              {product.description && (
                <div className="mt-2 sm:mt-4 pt-2 sm:pt-4 border-t">
                  <p className="text-[10px] sm:text-sm text-muted-foreground mb-1">{t('products:description')}</p>
                  <p className="text-xs sm:text-sm line-clamp-2 sm:line-clamp-none">{product.description}</p>
                </div>
              )}

              {/* Customs & Import Information */}
              {(product.hsCode || product.dutyRatePercent) && canAccessFinancialData && (
                <div className="mt-2 sm:mt-4 pt-2 sm:pt-4 border-t">
                  <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
                    <Truck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    {t('products:customsInfo', 'Customs & Import')}
                  </h3>
                  <div className="grid grid-cols-2 gap-1.5 sm:gap-3">
                    {product.hsCode && (
                      <div className="p-2 sm:p-3 rounded-lg bg-muted/50">
                        <p className="text-[10px] sm:text-xs text-muted-foreground">{t('products:hsCode', 'HS Code')}</p>
                        <p className="text-xs sm:text-base font-semibold font-mono">{product.hsCode}</p>
                      </div>
                    )}
                    {product.dutyRatePercent && (
                      <div className="p-2 sm:p-3 rounded-lg bg-muted/50">
                        <p className="text-[10px] sm:text-xs text-muted-foreground">{t('products:dutyRate', 'Duty Rate')}</p>
                        <p className="text-xs sm:text-base font-semibold">{product.dutyRatePercent}%</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Unit Configuration */}
              {(product.unitType || product.unitName || product.unitsPerItem) && (
                <div className="mt-2 sm:mt-4 pt-2 sm:pt-4 border-t">
                  <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
                    <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    {t('products:unitConfiguration', 'Unit Configuration')}
                  </h3>
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
                    {product.unitType && (
                      <div className="p-2 sm:p-3 rounded-lg bg-muted/50">
                        <p className="text-[10px] sm:text-xs text-muted-foreground">{t('products:unitType', 'Unit Type')}</p>
                        <p className="text-xs sm:text-base font-semibold capitalize">{product.unitType}</p>
                      </div>
                    )}
                    {product.unitName && (
                      <div className="p-2 sm:p-3 rounded-lg bg-muted/50">
                        <p className="text-[10px] sm:text-xs text-muted-foreground">{t('products:unitName', 'Unit Name')}</p>
                        <p className="text-xs sm:text-base font-semibold">{product.unitName}</p>
                      </div>
                    )}
                    {product.unitsPerItem && (
                      <div className="p-2 sm:p-3 rounded-lg bg-muted/50">
                        <p className="text-[10px] sm:text-xs text-muted-foreground">{t('products:unitsPerItem', 'Units/Item')}</p>
                        <p className="text-xs sm:text-base font-semibold">{product.unitsPerItem}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Physical Dimensions */}
              {(product.length || product.width || product.height || product.weight) && (
                <div className="mt-2 sm:mt-4 pt-2 sm:pt-4 border-t">
                  <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
                    <Ruler className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    {t('products:physicalAttributes')}
                  </h3>
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
                    {product.length && (
                      <div className="p-1.5 sm:p-3 rounded-lg bg-muted/50">
                        <p className="text-[10px] sm:text-xs text-muted-foreground">{t('products:length')}</p>
                        <p className="text-xs sm:text-base font-semibold">{product.length}</p>
                      </div>
                    )}
                    {product.width && (
                      <div className="p-1.5 sm:p-3 rounded-lg bg-muted/50">
                        <p className="text-[10px] sm:text-xs text-muted-foreground">{t('products:width')}</p>
                        <p className="text-xs sm:text-base font-semibold">{product.width}</p>
                      </div>
                    )}
                    {product.height && (
                      <div className="p-1.5 sm:p-3 rounded-lg bg-muted/50">
                        <p className="text-[10px] sm:text-xs text-muted-foreground">{t('products:height')}</p>
                        <p className="text-xs sm:text-base font-semibold">{product.height}</p>
                      </div>
                    )}
                    {product.weight && (
                      <div className="p-1.5 sm:p-3 rounded-lg bg-muted/50">
                        <p className="text-[10px] sm:text-xs text-muted-foreground">{t('products:weight')}</p>
                        <p className="text-xs sm:text-base font-semibold">{parseFloat(product.weight).toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>

          <Separator />

          {/* Warehouse Section */}
          <section 
            id="warehouse" 
            ref={setSectionRef('warehouse')}
            className="scroll-mt-32 lg:scroll-mt-24 space-y-2 sm:space-y-4"
          >
            <h2 className="text-base sm:text-xl font-semibold flex items-center gap-2">
              <Warehouse className="h-4 w-4 sm:h-5 sm:w-5" />
              {t('common:warehouseLocation')}
            </h2>
            
            <div className="rounded-lg sm:rounded-xl border bg-card p-2.5 sm:p-4">
              <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-2 sm:mb-4">
                <div>
                  <p className="text-[10px] sm:text-sm text-muted-foreground">{t('common:warehouse')}</p>
                  <p className="text-xs sm:text-base font-medium truncate">{warehouse?.name || t('common:notAssigned')}</p>
                </div>
                <div>
                  <p className="text-[10px] sm:text-sm text-muted-foreground">{t('common:locationCode')}</p>
                  <p className="text-sm sm:text-lg font-bold font-mono text-primary">
                    {product.warehouseLocation || '—'}
                  </p>
                </div>
              </div>
              
              {product.shipmentNotes && (
                <div className="pt-2 sm:pt-4 border-t">
                  <p className="text-[10px] sm:text-sm text-muted-foreground mb-1">{t('common:shipmentNotes')}</p>
                  <p className="text-xs sm:text-sm bg-yellow-50 dark:bg-yellow-950/30 p-2 sm:p-3 rounded-lg border border-yellow-200 dark:border-yellow-800 line-clamp-2 sm:line-clamp-none">
                    {product.shipmentNotes}
                  </p>
                </div>
              )}

              {/* Supplier Info */}
              {supplier && (
                <div className="mt-2 sm:mt-4 pt-2 sm:pt-4 border-t">
                  <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
                    <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    {t('products:supplierSection')}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                    <div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">{t('products:supplier')}</p>
                      <p className="text-xs sm:text-base font-medium truncate">{supplier.name}</p>
                    </div>
                    {supplier.country && (
                      <div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">{t('common:country')}</p>
                        <p className="text-xs sm:text-base font-medium">{supplier.country}</p>
                      </div>
                    )}
                    {supplier.contactPerson && (
                      <div className="hidden sm:block">
                        <p className="text-xs text-muted-foreground">{t('common:contactPerson')}</p>
                        <p className="font-medium">{supplier.contactPerson}</p>
                      </div>
                    )}
                    {supplier.email && (
                      <div className="hidden sm:block">
                        <p className="text-xs text-muted-foreground">{t('common:email')}</p>
                        <p className="font-medium text-sm truncate">{supplier.email}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Variants Section */}
          {variants.length > 0 && (
            <>
              <Separator />
              <section 
                id="variants" 
                ref={setSectionRef('variants')}
                className="scroll-mt-32 lg:scroll-mt-24 space-y-2 sm:space-y-4"
              >
                <h2 className="text-base sm:text-xl font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                  {t('products:variantsTab')} ({variants.length})
                </h2>
                
                <div className="rounded-lg sm:rounded-xl border bg-card p-2.5 sm:p-4">
                  <ProductVariants productId={id!} />
                </div>
              </section>
            </>
          )}

          {/* Tiered Pricing Section */}
          {tieredPricing.length > 0 && (
            <>
              <Separator />
              <section 
                id="tiered" 
                ref={setSectionRef('tiered')}
                className="scroll-mt-32 lg:scroll-mt-24 space-y-2 sm:space-y-4"
              >
                <h2 className="text-base sm:text-xl font-semibold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
                  {t('products:tieredPricing.title')}
                </h2>
                
                <div className="rounded-lg sm:rounded-xl border bg-card overflow-x-auto">
                  <Table className="min-w-[280px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap text-xs sm:text-sm">{t('products:quantityRange')}</TableHead>
                        <TableHead className="text-right whitespace-nowrap text-xs sm:text-sm">CZK</TableHead>
                        <TableHead className="text-right whitespace-nowrap text-xs sm:text-sm">EUR</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tieredPricing.map((tier: any) => (
                        <TableRow key={tier.id}>
                          <TableCell className="font-medium whitespace-nowrap text-xs sm:text-sm py-2 sm:py-4">
                            {tier.minQuantity}+
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap text-xs sm:text-sm py-2 sm:py-4">{formatCurrency(parseFloat(tier.priceCzk || '0'), 'CZK')}</TableCell>
                          <TableCell className="text-right whitespace-nowrap text-xs sm:text-sm py-2 sm:py-4">{formatCurrency(parseFloat(tier.priceEur || '0'), 'EUR')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </section>
            </>
          )}

          <Separator />

          {/* Packing Section */}
          <section 
            id="packing" 
            ref={setSectionRef('packing')}
            className="scroll-mt-32 lg:scroll-mt-24 space-y-2 sm:space-y-4"
          >
            <h2 className="text-base sm:text-xl font-semibold flex items-center gap-2">
              <Package className="h-4 w-4 sm:h-5 sm:w-5" />
              {t('products:packingInstructions')}
            </h2>
            
            <div className="rounded-lg sm:rounded-xl border bg-card p-2.5 sm:p-4 space-y-2 sm:space-y-4">
              {/* Packing Material */}
              {packingMaterial && (
                <div className="flex items-center gap-2 sm:gap-4 p-2 sm:p-4 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                  {packingMaterial.imageUrl && (
                    <img src={packingMaterial.imageUrl} alt="" className="w-10 h-10 sm:w-16 sm:h-16 object-contain rounded-lg border bg-white" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-xs text-purple-600 dark:text-purple-400 font-medium">{t('products:packingMaterial')}</p>
                    <p className="text-sm sm:text-lg font-bold truncate">{packingMaterial.name}</p>
                    {packingMaterial.dimensions && (
                      <p className="text-[10px] sm:text-sm text-muted-foreground font-mono truncate">{packingMaterial.dimensions}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Instructions */}
              {packingInstructions.length > 0 ? (
                <div className="space-y-2 sm:space-y-3">
                  <h3 className="font-medium text-xs sm:text-sm text-muted-foreground">
                    {t('common:steps')} ({packingInstructions.length})
                  </h3>
                  {packingInstructions.map((instruction, index) => (
                    <div key={index} className="flex gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border bg-muted/30">
                      <div className="shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs sm:text-sm font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        {instruction.image && (
                          <img 
                            src={instruction.image} 
                            alt={`${t('common:step')} ${index + 1}`} 
                            className="w-full max-w-xs h-20 sm:h-32 object-contain rounded border mb-1 sm:mb-2 bg-white" 
                          />
                        )}
                        {instruction.text && (
                          <p className="text-xs sm:text-sm">{instruction.text}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-muted-foreground text-center py-4 sm:py-8">
                  {t('products:noPackingInstructions', 'No packing instructions available')}
                </p>
              )}

              {/* Bundles containing this product */}
              {productBundles.length > 0 && (
                <div className="pt-2 sm:pt-4 border-t">
                  <h3 className="font-medium text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
                    <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    {t('common:includedInBundles')} ({productBundles.length})
                  </h3>
                  <div className="space-y-1.5 sm:space-y-2">
                    {productBundles.map((bundle: any) => {
                      const bundleItem = bundle.items?.find((item: any) => item.productId === id);
                      return (
                        <div key={bundle.id} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border bg-muted/30">
                          {bundle.imageUrl && (
                            <img src={bundle.imageUrl} alt={bundle.name} className="w-8 h-8 sm:w-10 sm:h-10 object-contain rounded border bg-white" />
                          )}
                          <div className="flex-1 min-w-0">
                            <Link href={`/inventory/bundles/${bundle.id}`}>
                              <p className="text-xs sm:text-base font-medium text-primary hover:underline truncate">{bundle.name}</p>
                            </Link>
                            {bundleItem && (
                              <p className="text-[10px] sm:text-xs text-muted-foreground">
                                {bundleItem.quantity}×
                              </p>
                            )}
                          </div>
                          {bundle.priceEur && (
                            <p className="text-xs sm:text-sm font-semibold shrink-0">{formatCurrency(parseFloat(bundle.priceEur), 'EUR')}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>

          <Separator />

          {/* Files Section */}
          <section 
            id="files" 
            ref={setSectionRef('files')}
            className="scroll-mt-32 lg:scroll-mt-24 space-y-2 sm:space-y-4 pb-4 sm:pb-8"
          >
            <h2 className="text-base sm:text-xl font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
              {t('products:productFiles')}
            </h2>
            
            <div className="rounded-lg sm:rounded-xl border bg-card p-2.5 sm:p-4">
              <ProductFiles productId={id!} />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
