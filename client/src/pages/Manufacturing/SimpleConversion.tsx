import { useState } from "react";
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
} from "lucide-react";
import { format, isThisWeek, isThisMonth, isThisYear } from "date-fns";

interface ProductWithBom {
  id: string;
  name: string;
  sku: string;
}

interface ComponentRequirement {
  ingredientProductId: string;
  ingredientName: string;
  ingredientSku: string;
  requiredQty: number;
  availableStock: number;
  canFulfill: boolean;
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

interface ComponentLocation {
  locationCode: string;
  quantity: number;
}

interface LowStockComponent {
  childProductId: string;
  childVariantId: string | null;
  productName: string;
  variantName: string | null;
  sku: string | null;
  quantityPerUnit: number;
  requiredForRecommended: number;
  totalStock: number;
  shortfall: number;
  canFulfill: boolean;
  locations: ComponentLocation[];
  yieldQuantity: number;
}

interface LowStockAlert {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  threshold: number;
  recommendedBuild: number;
  allComponentsAvailable: boolean;
  components: LowStockComponent[];
  locations: ComponentLocation[];
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
  const { t } = useTranslation("inventory");
  const { toast } = useToast();

  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [historyTab, setHistoryTab] = useState<string>("week");

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

  const { data: lowStockAlerts = [], isLoading: isLoadingLowStock } = useQuery<LowStockAlert[]>({
    queryKey: ["/api/manufacturing/low-stock"],
  });

  const { data: parentChildStock = [], isLoading: isLoadingParentChild } = useQuery<ParentChildStock[]>({
    queryKey: ["/api/manufacturing/parent-child-stock"],
  });

  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);
  const [expandedParentId, setExpandedParentId] = useState<string | null>(null);

  const handleStartConversion = (alert: LowStockAlert) => {
    setSelectedProductId(alert.productId);
    setQuantity(alert.recommendedBuild);
    setSelectedLocationId("");
  };

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
      queryClient.invalidateQueries({ queryKey: ["/api/manufacturing/low-stock"] });
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

  // Allow manufacturing when: product selected, quantity > 0, location selected, and either:
  // 1. No ingredients required (empty BOM = always buildable), or
  // 2. All ingredients can be fulfilled (canFullyBuild = true)
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
          <Factory className="h-12 w-12 text-green-600" />
          <h1 className="text-3xl sm:text-4xl font-bold">
            {t("simpleConversion", "Simple Conversion")}
          </h1>
        </div>

        {/* Low Stock Manufacturing Alerts */}
        {isLoadingLowStock ? (
          <Card>
            <CardContent className="py-8">
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ) : lowStockAlerts.length > 0 && (
          <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl sm:text-2xl flex items-center gap-2 text-orange-700 dark:text-orange-400">
                <AlertTriangle className="h-6 w-6" />
                {t("lowStockManufacturingAlerts", "Low Stock Alerts - Need Manufacturing")}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {t("lowStockManufacturingDesc", "Products running low that can be manufactured")}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {lowStockAlerts.map((alert) => (
                <div
                  key={alert.productId}
                  className="bg-white dark:bg-background rounded-lg border p-4 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{alert.productName}</h3>
                      <p className="text-sm text-muted-foreground">SKU: {alert.sku}</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-xl font-bold text-red-600">{alert.currentStock}</div>
                        <div className="text-xs text-muted-foreground">{t("currentStock", "Current Stock")}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold">{alert.threshold}</div>
                        <div className="text-xs text-muted-foreground">{t("stockThreshold", "Threshold")}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-green-600">{alert.recommendedBuild}</div>
                        <div className="text-xs text-muted-foreground">{t("recommendedBuild", "Recommended Build")}</div>
                      </div>
                    </div>
                  </div>

                  {/* Product Locations */}
                  {alert.locations.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {alert.locations.map((loc, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-100 dark:bg-gray-800 rounded text-base font-medium">
                          <MapPin className="h-4 w-4 text-slate-500" />
                          <span className="text-slate-600 dark:text-slate-400">{loc.locationCode}:</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">{loc.quantity}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Component availability indicator */}
                  <div className="flex items-center gap-2">
                    {alert.allComponentsAvailable ? (
                      <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                        <Check className="h-4 w-4" />
                        {t("allComponentsAvailable", "All components available")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-orange-600 text-sm">
                        <AlertTriangle className="h-4 w-4" />
                        {t("someComponentsMissing", "Some components missing")}
                      </span>
                    )}
                  </div>

                  {/* Expandable component details */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-sm"
                    onClick={() => setExpandedAlertId(expandedAlertId === alert.productId ? null : alert.productId)}
                  >
                    {expandedAlertId === alert.productId ? "Hide" : "Show"} {t("manufacturingChildComponents", "Components")} ({alert.components.length})
                  </Button>

                  {expandedAlertId === alert.productId && (
                    <div className="mt-2 space-y-2 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                      {alert.components.map((comp, idx) => (
                        <div 
                          key={idx} 
                          className={`p-3 rounded-lg text-sm ${
                            comp.canFulfill 
                              ? "bg-green-50 dark:bg-green-950/30" 
                              : "bg-red-50 dark:bg-red-950/30"
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <span className="font-medium">{comp.productName}</span>
                              {comp.variantName && <span className="text-muted-foreground ml-1">({comp.variantName})</span>}
                              {comp.sku && <span className="text-muted-foreground text-xs ml-2">SKU: {comp.sku}</span>}
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                              <span className="text-muted-foreground">
                                {t("requiredQty", "Required")}: {comp.requiredForRecommended.toFixed(1)}
                              </span>
                              <span className={comp.canFulfill ? "text-green-600" : "text-red-600"}>
                                {t("manufacturingTotalStock", "Total Stock")}: {comp.totalStock}
                              </span>
                              {!comp.canFulfill && (
                                <span className="text-red-600 font-medium">
                                  {t("manufacturingShortfall", "Shortfall")}: {comp.shortfall.toFixed(1)}
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Component locations */}
                          {comp.locations.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {comp.locations.map((loc, locIdx) => (
                                <span key={locIdx} className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-sm font-medium ${
                                  loc.quantity === 0 
                                    ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300' 
                                    : 'bg-gray-100 dark:bg-gray-800'
                                }`}>
                                  <MapPin className="h-3.5 w-3.5" />
                                  <span className="text-slate-600 dark:text-slate-400">{loc.locationCode}:</span>
                                  <span className={`font-bold ${loc.quantity === 0 ? 'text-red-700 dark:text-red-300' : 'text-slate-900 dark:text-slate-100'}`}>{loc.quantity}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action button */}
                  <Button
                    onClick={() => handleStartConversion(alert)}
                    className="w-full sm:w-auto mt-3 py-5 text-xl font-semibold bg-green-600 hover:bg-green-700 text-white"
                    disabled={!alert.allComponentsAvailable}
                  >
                    {t("startConversion", "Start Conversion")}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Parent/Child Stock Overview */}
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl sm:text-2xl flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <Layers className="h-6 w-6" />
              {t("parentChildStockOverview", "Product Stock Overview")}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {t("parentChildStockDesc", "View all products with components and their stock levels")}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoadingParentChild ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : parentChildStock.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t("noParentChildProducts", "No products with components found")}
              </div>
            ) : (
              parentChildStock.map((parent) => (
                <div
                  key={parent.id}
                  className="bg-white dark:bg-background rounded-lg border overflow-hidden"
                >
                  {/* Parent header - clickable to expand */}
                  <button
                    onClick={() => setExpandedParentId(expandedParentId === parent.id ? null : parent.id)}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {expandedParentId === parent.id ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold">{parent.name}</h3>
                          {parent.isLowStock && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 rounded-full text-xs font-medium">
                              {t("lowStock", "Low Stock")}
                            </span>
                          )}
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-full text-xs">
                            {parent.source === 'bom' ? 'BOM' : 'Variant'}
                          </span>
                        </div>
                        {parent.sku && (
                          <p className="text-sm text-muted-foreground">SKU: {parent.sku}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-right">
                      <div>
                        <div className={`text-xl font-bold ${parent.isLowStock ? 'text-red-600' : 'text-green-600'}`}>
                          {parent.totalStock}
                        </div>
                        <div className="text-xs text-muted-foreground">{t("stock", "Stock")}</div>
                      </div>
                      <div>
                        <div className="text-lg font-medium text-muted-foreground">{parent.lowStockThreshold}</div>
                        <div className="text-xs text-muted-foreground">{t("threshold", "Threshold")}</div>
                      </div>
                    </div>
                  </button>

                  {/* Parent locations */}
                  {parent.locations.length > 0 && (
                    <div className="px-4 pb-2 flex flex-wrap gap-2">
                      {parent.locations.map((loc, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-100 dark:bg-gray-800 rounded text-base font-medium">
                          <MapPin className="h-4 w-4 text-slate-500" />
                          <span className="text-slate-600 dark:text-slate-400">{loc.locationCode}:</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">{loc.quantity}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Expanded children section */}
                  {expandedParentId === parent.id && parent.children.length > 0 && (
                    <div className="border-t bg-gray-50 dark:bg-gray-900/50 p-4 space-y-2">
                      <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 mb-3">
                        <Box className="h-4 w-4" />
                        {t("componentsIngredients", "Components / Ingredients")} ({parent.children.length})
                      </h4>
                      {parent.children.map((child) => (
                        <div
                          key={child.id}
                          className={`p-3 rounded-lg ${
                            child.isLowStock
                              ? 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800'
                              : 'bg-white dark:bg-background border'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <span className="font-medium">{child.name}</span>
                              {child.sku && (
                                <span className="text-muted-foreground text-xs ml-2">SKU: {child.sku}</span>
                              )}
                              {child.isLowStock && (
                                <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 rounded text-xs">
                                  {t("lowStock", "Low Stock")}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <span className={child.isLowStock ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                                {t("stock", "Stock")}: {child.totalStock}
                              </span>
                              <span className="text-muted-foreground">
                                {t("threshold", "Threshold")}: {child.lowStockThreshold}
                              </span>
                              {child.quantity > 1 && (
                                <span className="text-muted-foreground">
                                  {t("qtyNeeded", "Qty")}: {child.quantity}
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Child locations */}
                          {child.locations.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {child.locations.map((loc, idx) => (
                                <span key={idx} className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-sm font-medium ${
                                  loc.quantity === 0 
                                    ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300' 
                                    : 'bg-gray-100 dark:bg-gray-800'
                                }`}>
                                  <MapPin className="h-3.5 w-3.5" />
                                  <span className="text-slate-600 dark:text-slate-400">{loc.locationCode}:</span>
                                  <span className={`font-bold ${loc.quantity === 0 ? 'text-red-700 dark:text-red-300' : 'text-slate-900 dark:text-slate-100'}`}>{loc.quantity}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {/* Quick manufacture button if parent is low stock */}
                      {parent.isLowStock && (
                        <Button
                          onClick={() => {
                            setSelectedProductId(parent.id);
                            setQuantity(Math.max(1, parent.lowStockThreshold - parent.totalStock + 5));
                            setSelectedLocationId("");
                          }}
                          className="w-full mt-3 py-4 text-lg font-semibold bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Factory className="h-5 w-5 mr-2" />
                          {t("manufactureThis", "Manufacture This Product")}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl sm:text-3xl flex items-center gap-3">
              <Package className="h-8 w-8 text-green-600" />
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
                <SelectTrigger className="h-16 text-xl">
                  <SelectValue
                    placeholder={t("selectProductToMake", "Select Product to Make")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {productsWithBom.map((product) => (
                    <SelectItem
                      key={product.id}
                      value={product.id}
                      className="text-xl py-4"
                    >
                      {product.name} ({product.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {selectedProductId && (
          <Card className="shadow-md">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl sm:text-3xl">
                {t("quantityToMake", "Quantity to Make")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-6">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-20 w-20 text-3xl font-bold border-2"
                  onClick={() => handleQuantityChange(-1)}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-10 w-10" />
                </Button>
                <Input
                  type="number"
                  value={quantity}
                  onChange={handleInputChange}
                  className="h-20 w-36 text-center text-4xl font-bold"
                  min={1}
                />
                <Button
                  variant="outline"
                  size="lg"
                  className="h-20 w-20 text-3xl font-bold border-2"
                  onClick={() => handleQuantityChange(1)}
                >
                  <Plus className="h-10 w-10" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {selectedProductId && (
          <Card className="shadow-md">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl sm:text-3xl">
                {t("componentsNeeded", "Components Needed")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingRequirements ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : !requirements?.ingredients?.length ? (
                <div className="text-center py-10 bg-green-50 dark:bg-green-950/20 rounded-lg border-2 border-green-200 dark:border-green-800">
                  <Check className="h-12 w-12 text-green-600 mx-auto mb-3" />
                  <p className="text-xl font-semibold text-green-700 dark:text-green-400">
                    {t("noComponents", "No components required")}
                  </p>
                  <p className="text-base text-muted-foreground mt-2">
                    {t("readyToManufacture", "Ready to manufacture - select a location below")}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-2 text-sm font-semibold text-muted-foreground border-b pb-2">
                    <div>{t("component", "Component")}</div>
                    <div className="text-center">{t("requiredQty", "Required")}</div>
                    <div className="text-center">{t("inStock", "In Stock")}</div>
                    <div className="text-center">{t("status", "Status")}</div>
                  </div>
                  {requirements.ingredients.map((component) => (
                    <div
                      key={component.ingredientProductId}
                      className={`grid grid-cols-4 gap-2 items-center py-3 px-2 rounded-lg ${
                        component.canFulfill
                          ? "bg-green-50 dark:bg-green-950/30"
                          : "bg-red-50 dark:bg-red-950/30"
                      }`}
                    >
                      <div className="font-medium text-base truncate">
                        {component.ingredientName}
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
                            <span className="text-sm hidden sm:inline">
                              {t("sufficient", "Sufficient")}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                            <AlertTriangle className="h-5 w-5" />
                            <span className="text-sm hidden sm:inline">
                              {t("insufficient", "Insufficient")}
                            </span>
                          </div>
                        )}
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
              <CardTitle className="text-2xl sm:text-3xl flex items-center gap-3">
                <MapPin className="h-8 w-8 text-green-600" />
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
                  <SelectTrigger className="h-16 text-xl">
                    <SelectValue
                      placeholder={t("storageLocation", "Select Storage Location")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem
                        key={location.id}
                        value={location.id}
                        className="text-xl py-4"
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
            className="w-full py-8 text-2xl font-bold bg-green-600 hover:bg-green-700 text-white shadow-lg"
            size="lg"
            disabled={!canSubmit || manufacturingMutation.isPending}
            onClick={() => manufacturingMutation.mutate()}
          >
            {manufacturingMutation.isPending ? (
              <>
                <Loader2 className="h-8 w-8 mr-3 animate-spin" />
                {t("processing", "Processing...")}
              </>
            ) : (
              <>
                <Factory className="h-8 w-8 mr-3" />
                {t("startManufacturing", "Start Manufacturing")}
              </>
            )}
          </Button>
        )}

        {hasInsufficientStock && (
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400 shrink-0" />
            <p className="text-red-700 dark:text-red-300 text-lg">
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
                <TabsTrigger value="week" className="text-base flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {t("thisWeek", "This Week")}
                </TabsTrigger>
                <TabsTrigger value="month" className="text-base">
                  {t("thisMonth", "This Month")}
                </TabsTrigger>
                <TabsTrigger value="year" className="text-base">
                  {t("thisYear", "This Year")}
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
                          <div className="text-center py-8 text-muted-foreground text-lg">
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
                                  <span className="text-base font-bold">
                                    {run.runNumber}
                                  </span>
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                    {t("completed", "Completed")}
                                  </span>
                                  <span className="text-sm text-muted-foreground">
                                    {format(new Date(run.completedAt || run.createdAt), "PPp")}
                                  </span>
                                </div>
                                {/* Conversion details: components -> finished product */}
                                <div className="text-lg font-semibold flex flex-wrap items-center gap-2">
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
