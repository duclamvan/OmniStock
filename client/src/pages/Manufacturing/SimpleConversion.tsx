import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Factory,
  Package,
  Check,
  AlertTriangle,
  Minus,
  Plus,
  MapPin,
  Loader2,
  History,
  Calendar,
  ChevronDown,
  ChevronRight,
  Layers,
  Box,
  Cloud,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format, isThisWeek, isThisMonth, isThisYear } from "date-fns";

interface ProductWithBom {
  id: string;
  name: string;
  sku: string;
  productType?: 'standard' | 'physical_no_quantity' | 'virtual';
}

interface ComponentRequirement {
  ingredientProductId: string;
  ingredientName: string;
  ingredientSku: string;
  requiredQty: number;
  availableStock: number;
  canFulfill: boolean;
  productType?: 'standard' | 'physical_no_quantity' | 'virtual';
}

interface RequirementsResponse {
  productId: string;
  productName: string;
  requestedQty: number;
  maxBuildable: number;
  canFullyBuild: boolean;
  ingredients: ComponentRequirement[];
}

interface LocationCode {
  id: string;
  code: string;
  name?: string;
  stock?: number;
}

interface ConsumedComponent {
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  quantityConsumed: number;
  locationCode: string;
  yieldQuantity: number;
}

interface ManufacturingRun {
  id: string;
  runNumber: string;
  productId: string;
  productName: string;
  quantity: number;
  status: string;
  completedAt?: string;
  createdAt: string;
  componentsConsumed?: ConsumedComponent[];
}

interface ParentChildLocation {
  locationCode: string;
  quantity: number;
}

interface ChildProduct {
  id: string;
  name: string;
  sku?: string;
  quantity: number;
  yieldQuantity: number;
  source: 'bom' | 'parentField';
  totalStock: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  locations: ParentChildLocation[];
  landingCost?: number;
}

interface ParentChildStock {
  id: string;
  name: string;
  sku?: string;
  vietnameseName?: string;
  totalStock: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  locations: ParentChildLocation[];
  children: ChildProduct[];
  source: 'bom' | 'parentField';
}

export default function SimpleConversion() {
  const { t } = useTranslation(["inventory", "manufacturing"]);
  const { toast } = useToast();

  const renderProductTypeBadge = (productType?: string) => {
    if (productType === 'virtual') {
      return (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-violet-400 text-violet-600 dark:text-violet-400">
          <Cloud className="h-2.5 w-2.5 mr-0.5" />
          {t('manufacturing:virtual')}
        </Badge>
      );
    }
    if (productType === 'physical_no_quantity') {
      return (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-400 text-blue-600 dark:text-blue-400">
          <MapPin className="h-2.5 w-2.5 mr-0.5" />
          {t('manufacturing:noQty')}
        </Badge>
      );
    }
    return null;
  };

  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [historyTab, setHistoryTab] = useState<string>("week");
  const [expandedChildId, setExpandedChildId] = useState<string | null>(null);
  const [stockSearch, setStockSearch] = useState("");

  const { data: productsWithBom = [], isLoading: isLoadingProducts } = useQuery<ProductWithBom[]>({
    queryKey: ["/api/manufacturing/products-with-bom"],
  });

  const { data: requirements, isLoading: isLoadingRequirements } = useQuery<RequirementsResponse>({
    queryKey: ["/api/manufacturing/calculate-requirements", { productId: selectedProductId, quantity: quantity.toString() }],
    enabled: !!selectedProductId && quantity > 0,
  });

  const { data: locations = [], isLoading: isLoadingLocations } = useQuery<LocationCode[]>({
    queryKey: ["/api/manufacturing/locations", { productId: selectedProductId }],
    enabled: true,
  });

  const { data: manufacturingRuns = [], isLoading: isLoadingRuns } = useQuery<ManufacturingRun[]>({
    queryKey: ["/api/manufacturing/runs"],
  });

  const { data: parentChildStock = [], isLoading: isLoadingParentChild } = useQuery<ParentChildStock[]>({
    queryKey: ["/api/manufacturing/parent-child-stock"],
  });

  const flattenedChildren = useMemo(() => {
    const children: Array<{
      id: string;
      name: string;
      sku?: string;
      totalStock: number;
      lowStockThreshold: number;
      isLowStock: boolean;
      locations: ParentChildLocation[];
      parentId: string;
      parentName: string;
      parentSku?: string;
      parentTotalStock: number;
      yieldQuantity: number;
    }> = [];
    
    parentChildStock.forEach(parent => {
      parent.children.forEach(child => {
        children.push({
          id: child.id,
          name: child.name,
          sku: child.sku,
          totalStock: child.totalStock,
          lowStockThreshold: child.lowStockThreshold,
          isLowStock: child.isLowStock,
          locations: child.locations,
          yieldQuantity: child.yieldQuantity,
          parentId: parent.id,
          parentName: parent.name,
          parentSku: parent.sku,
          parentTotalStock: parent.totalStock,
        });
      });
    });
    
    return children.sort((a, b) => a.totalStock - b.totalStock);
  }, [parentChildStock]);

  const filteredChildren = useMemo(() => {
    if (!stockSearch.trim()) return flattenedChildren;
    const search = stockSearch.toLowerCase();
    return flattenedChildren.filter(child => 
      child.name.toLowerCase().includes(search) ||
      child.sku?.toLowerCase().includes(search) ||
      child.parentName.toLowerCase().includes(search)
    );
  }, [flattenedChildren, stockSearch]);

  const manufacturingMutation = useMutation({
    mutationFn: async () => {
      const runRes = await apiRequest("POST", "/api/manufacturing/runs", {
        finishedProductId: selectedProductId,
        quantityProduced: quantity,
        finishedLocationCode: selectedLocationId || undefined,
      });
      const runData = await runRes.json();

      await apiRequest("POST", `/api/manufacturing/runs/${runData.id}/complete`);
      return runData;
    },
    onSuccess: () => {
      toast({
        title: t("manufacturingSuccess", "Manufacturing completed successfully"),
        variant: "default",
      });
      setSelectedProductId("");
      setQuantity(1);
      setSelectedLocationId("");
      queryClient.invalidateQueries({ queryKey: ["/api/manufacturing"] });
      queryClient.invalidateQueries({ queryKey: ["/api/manufacturing/runs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/manufacturing/parent-child-stock"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
    onError: (error: Error) => {
      toast({
        title: t("error", "Error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => Math.max(1, prev + delta));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 1;
    setQuantity(Math.max(1, value));
  };

  const hasNoIngredients = requirements && (!requirements.ingredients || requirements.ingredients.length === 0);
  const canSubmit =
    selectedProductId &&
    quantity > 0 &&
    selectedLocationId &&
    (hasNoIngredients || requirements?.canFullyBuild);

  const hasInsufficientStock = requirements?.ingredients?.some(
    (ing) => !ing.canFulfill
  ) && !hasNoIngredients;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-8">
          <Factory className="h-10 w-10 sm:h-12 sm:w-12 text-green-600" />
          <h1 className="text-2xl sm:text-4xl font-bold">
            {t("simpleConversion", "Simple Conversion")}
          </h1>
        </div>

        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl sm:text-2xl flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <Layers className="h-6 w-6" />
              {t("parentChildStockOverview", "Product Stock Overview")}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {t("parentChildStockDesc", "Components sorted by lowest stock first")}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t("searchProducts", "Search products...")}
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                className="pl-10 h-12 text-base"
              />
            </div>

            {isLoadingParentChild ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredChildren.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {stockSearch ? t("noSearchResults", "No products match your search") : t("noParentChildProducts", "No products with components found")}
              </div>
            ) : (
              <div className="max-h-[60vh] overflow-y-auto space-y-3">
                {filteredChildren.map((child) => (
                  <div
                    key={`${child.parentId}-${child.id}`}
                    className="bg-white dark:bg-gray-900 rounded-xl border shadow-sm"
                  >
                    <button
                      onClick={() => setExpandedChildId(expandedChildId === `${child.parentId}-${child.id}` ? null : `${child.parentId}-${child.id}`)}
                      className="w-full p-4 flex items-center justify-between"
                    >
                      <div className="flex-1 text-left">
                        <div className="text-lg font-semibold">{child.name}</div>
                        {child.sku && <div className="text-sm text-muted-foreground">SKU: {child.sku}</div>}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className={`text-2xl font-bold ${child.isLowStock ? 'text-red-600' : 'text-green-600'}`}>
                          {child.totalStock}
                        </div>
                        {expandedChildId === `${child.parentId}-${child.id}` ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {child.locations.length > 0 && (
                      <div className="px-4 pb-3 flex flex-wrap gap-2">
                        {child.locations.map((loc, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm">
                            <MapPin className="h-3 w-3" />
                            {loc.locationCode}: <span className="font-semibold">{loc.quantity}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {expandedChildId === `${child.parentId}-${child.id}` && (
                      <div className="border-t p-4 bg-blue-50 dark:bg-blue-950/30">
                        <div className="text-sm text-muted-foreground mb-1">{t("usedIn", "Used in")}:</div>
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <div>
                            <div className="font-semibold">{child.parentName}</div>
                            {child.parentSku && <div className="text-sm text-muted-foreground">SKU: {child.parentSku}</div>}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedProductId(child.parentId);
                              setQuantity(1);
                              setExpandedChildId(null);
                            }}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Factory className="h-4 w-4 mr-1" />
                            {t("manufacture", "Manufacture")}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl sm:text-3xl flex items-center gap-3">
              <Package className="h-7 w-7 sm:h-8 sm:w-8 text-green-600" />
              {t("selectProductToMake", "Select Product to Make")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingProducts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : productsWithBom.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-lg">
                {t("noProductsWithBom", "No products with recipes found")}
              </div>
            ) : (
              <Select
                value={selectedProductId}
                onValueChange={(val) => {
                  setSelectedProductId(val);
                  setSelectedLocationId("");
                }}
              >
                <SelectTrigger className="h-14 sm:h-16 text-lg sm:text-xl">
                  <SelectValue
                    placeholder={t("selectProductToMake", "Select Product to Make")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {productsWithBom.map((product) => (
                    <SelectItem
                      key={product.id}
                      value={product.id}
                      className="text-lg sm:text-xl py-3 sm:py-4"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>{product.name} ({product.sku})</span>
                        {renderProductTypeBadge(product.productType)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {selectedProductId && productsWithBom.find(p => p.id === selectedProductId)?.productType === 'virtual' && (
          <div className="p-4 bg-violet-50 dark:bg-violet-950/30 rounded-lg border border-violet-200 dark:border-violet-800">
            <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">{t('manufacturing:virtualCannotManufacture')}</span>
            </div>
          </div>
        )}

        {selectedProductId && productsWithBom.find(p => p.id === selectedProductId)?.productType === 'physical_no_quantity' && (
          <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <MapPin className="h-5 w-5" />
              <span className="font-medium">{t('manufacturing:physicalNoQtyNote')}</span>
            </div>
          </div>
        )}

        {selectedProductId && (
          <Card className="shadow-md">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl sm:text-3xl">
                {t("quantityToMake", "Quantity to Make")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-4 sm:gap-6">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-16 w-16 sm:h-20 sm:w-20 text-2xl sm:text-3xl font-bold border-2"
                  onClick={() => handleQuantityChange(-1)}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-8 w-8 sm:h-10 sm:w-10" />
                </Button>
                <Input
                  type="number"
                  value={quantity}
                  onChange={handleInputChange}
                  className="h-16 w-28 sm:h-20 sm:w-36 text-center text-3xl sm:text-4xl font-bold"
                  min={1}
                />
                <Button
                  variant="outline"
                  size="lg"
                  className="h-16 w-16 sm:h-20 sm:w-20 text-2xl sm:text-3xl font-bold border-2"
                  onClick={() => handleQuantityChange(1)}
                >
                  <Plus className="h-8 w-8 sm:h-10 sm:w-10" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {selectedProductId && (
          <Card className="shadow-md">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl sm:text-3xl">
                {t("componentsNeeded", "Components Needed")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingRequirements ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : !requirements?.ingredients?.length ? (
                <div className="text-center py-8 sm:py-10 bg-green-50 dark:bg-green-950/20 rounded-lg border-2 border-green-200 dark:border-green-800">
                  <Check className="h-10 w-10 sm:h-12 sm:w-12 text-green-600 mx-auto mb-3" />
                  <p className="text-lg sm:text-xl font-semibold text-green-700 dark:text-green-400">
                    {t("noComponents", "No components required")}
                  </p>
                  <p className="text-sm sm:text-base text-muted-foreground mt-2">
                    {t("readyToManufacture", "Ready to manufacture - select a location below")}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="hidden sm:grid grid-cols-4 gap-2 text-sm font-semibold text-muted-foreground border-b pb-2">
                    <div>{t("component", "Component")}</div>
                    <div className="text-center">{t("requiredQty", "Required")}</div>
                    <div className="text-center">{t("inStock", "In Stock")}</div>
                    <div className="text-center">{t("status", "Status")}</div>
                  </div>
                  {requirements.ingredients.map((component) => (
                    <div
                      key={component.ingredientProductId}
                      className={`p-3 rounded-lg ${
                        component.canFulfill
                          ? "bg-green-50 dark:bg-green-950/30"
                          : "bg-red-50 dark:bg-red-950/30"
                      }`}
                    >
                      <div className="sm:hidden space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-base flex flex-wrap items-center gap-1">
                            <span>{component.ingredientName}</span>
                            {renderProductTypeBadge(component.productType)}
                          </div>
                          {component.canFulfill ? (
                            <Check className="h-5 w-5 text-green-600" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                          )}
                        </div>
                        <div className="flex gap-4 text-sm">
                          <span>{t("requiredQty", "Required")}: <strong>{component.requiredQty}</strong></span>
                          <span className={component.canFulfill ? "text-green-600" : "text-red-600"}>
                            {t("inStock", "Stock")}: <strong>{component.availableStock}</strong>
                          </span>
                        </div>
                      </div>
                      <div className="hidden sm:grid grid-cols-4 gap-2 items-center">
                        <div className="font-medium text-base">
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="truncate">{component.ingredientName}</span>
                            {renderProductTypeBadge(component.productType)}
                            {component.productType === 'virtual' && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <AlertTriangle className="h-3.5 w-3.5 text-violet-500" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{t('manufacturing:virtualMaterialWarning')}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </div>
                        <div className="text-center text-lg font-semibold">
                          {component.requiredQty}
                        </div>
                        <div
                          className={`text-center text-lg font-semibold ${
                            component.canFulfill
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {component.availableStock}
                        </div>
                        <div className="flex justify-center">
                          {component.canFulfill ? (
                            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                              <Check className="h-5 w-5" />
                              <span className="text-sm">
                                {t("sufficient", "Sufficient")}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                              <AlertTriangle className="h-5 w-5" />
                              <span className="text-sm">
                                {t("insufficient", "Insufficient")}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {selectedProductId && (
          <Card className="shadow-md">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl sm:text-3xl flex items-center gap-3">
                <MapPin className="h-7 w-7 sm:h-8 sm:w-8 text-green-600" />
                {t("storageLocation", "Storage Location")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingLocations ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : locations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-lg">
                  {t("noLocationsConfigured", "No warehouse locations configured")}
                </div>
              ) : (
                <Select
                  value={selectedLocationId}
                  onValueChange={setSelectedLocationId}
                >
                  <SelectTrigger className="h-14 sm:h-16 text-lg sm:text-xl">
                    <SelectValue
                      placeholder={t("storageLocation", "Select Storage Location")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem
                        key={location.id}
                        value={location.id}
                        className="text-lg sm:text-xl py-3 sm:py-4"
                      >
                        <div className="flex justify-between items-center w-full gap-4">
                          <span>{location.code}</span>
                          <span className="text-muted-foreground">
                            ({location.stock || 0} in stock)
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>
        )}

        {selectedProductId && (
          <Button
            className="w-full py-6 sm:py-8 text-xl sm:text-2xl font-bold bg-green-600 hover:bg-green-700 text-white shadow-lg"
            size="lg"
            disabled={!canSubmit || manufacturingMutation.isPending}
            onClick={() => manufacturingMutation.mutate()}
          >
            {manufacturingMutation.isPending ? (
              <>
                <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 mr-3 animate-spin" />
                {t("processing", "Processing...")}
              </>
            ) : (
              <>
                <Factory className="h-6 w-6 sm:h-8 sm:w-8 mr-3" />
                {t("startManufacturing", "Start Manufacturing")}
              </>
            )}
          </Button>
        )}

        {hasInsufficientStock && (
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400 shrink-0" />
            <p className="text-red-700 dark:text-red-300 text-base sm:text-lg">
              {t(
                "insufficientStockWarning",
                "Cannot start manufacturing - some components have insufficient stock"
              )}
            </p>
          </div>
        )}

        <Card className="mt-8">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
              <History className="h-6 w-6" />
              {t("manufacturingHistory", "Manufacturing History")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={historyTab} onValueChange={setHistoryTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="week" className="text-sm sm:text-base flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("thisWeek", "This Week")}</span>
                  <span className="sm:hidden">{t("week", "Week")}</span>
                </TabsTrigger>
                <TabsTrigger value="month" className="text-sm sm:text-base">
                  <span className="hidden sm:inline">{t("thisMonth", "This Month")}</span>
                  <span className="sm:hidden">{t("month", "Month")}</span>
                </TabsTrigger>
                <TabsTrigger value="year" className="text-sm sm:text-base">
                  <span className="hidden sm:inline">{t("thisYear", "This Year")}</span>
                  <span className="sm:hidden">{t("year", "Year")}</span>
                </TabsTrigger>
              </TabsList>

              {isLoadingRuns ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {["week", "month", "year"].map((tab) => {
                    const filteredRuns = manufacturingRuns.filter((run) => {
                      const runDate = new Date(run.completedAt || run.createdAt);
                      if (tab === "week") return isThisWeek(runDate);
                      if (tab === "month") return isThisMonth(runDate);
                      return isThisYear(runDate);
                    });

                    return (
                      <TabsContent key={tab} value={tab} className="space-y-3">
                        {filteredRuns.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground text-base sm:text-lg">
                            {t("noRunsInPeriod", "No manufacturing runs in this period")}
                          </div>
                        ) : (
                          filteredRuns.map((run) => (
                            <div
                              key={run.id}
                              className="p-4 rounded-lg border bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                            >
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm sm:text-base font-bold">
                                    {run.runNumber}
                                  </span>
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                    {t("completed", "Completed")}
                                  </span>
                                  <span className="text-xs sm:text-sm text-muted-foreground">
                                    {format(new Date(run.completedAt || run.createdAt), "PPp")}
                                  </span>
                                </div>
                                <div className="text-base sm:text-lg font-semibold flex flex-wrap items-center gap-2">
                                  {run.componentsConsumed && run.componentsConsumed.length > 0 ? (
                                    <>
                                      {run.componentsConsumed.map((comp, idx) => (
                                        <span key={idx} className="text-orange-700 dark:text-orange-400">
                                          {comp.quantityConsumed} {comp.productName}
                                          {idx < (run.componentsConsumed?.length || 0) - 1 && " + "}
                                        </span>
                                      ))}
                                      <span className="text-muted-foreground mx-1">→</span>
                                      <span className="text-green-700 dark:text-green-400">
                                        {run.quantity} {run.productName}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-green-700 dark:text-green-400">
                                      {run.quantity} {run.productName}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </TabsContent>
                    );
                  })}
                </>
              )}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
