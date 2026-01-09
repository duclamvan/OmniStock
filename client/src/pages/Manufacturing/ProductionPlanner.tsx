import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Factory, 
  Package, 
  Calculator,
  AlertTriangle,
  CheckCircle,
  Truck,
  RefreshCw,
  Box,
  CornerDownRight,
  Layers,
  Wrench
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ManufacturableProduct {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  imageUrl?: string;
  replenishmentMethod: string;
  parentProductId?: string | null;
}

interface IngredientRequirement {
  ingredientProductId: string;
  ingredientVariantId?: string | null;
  ingredientName: string;
  ingredientSku: string;
  requiredQty: number;
  availableStock: number;
  missingQty: number;
  canFulfill: boolean;
  supplier?: {
    id: string;
    name: string;
  } | null;
}

interface ProductionRequirements {
  productId: string;
  productName: string;
  requestedQty: number;
  maxBuildable: number;
  canFullyBuild: boolean;
  ingredients: IngredientRequirement[];
}

export default function ProductionPlanner() {
  usePageTitle('products:productionPlanner', 'Production Planner');
  const { t } = useTranslation(['products', 'common', 'inventory']);
  const { toast } = useToast();
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [quantityToBuild, setQuantityToBuild] = useState<string>("1");
  const [requirements, setRequirements] = useState<ProductionRequirements | null>(null);

  const { data: products = [], isLoading: isLoadingProducts } = useQuery<ManufacturableProduct[]>({
    queryKey: ['/api/products', 'manufacturable'],
    queryFn: async () => {
      const res = await fetch('/api/products?replenishmentMethod=make');
      if (!res.ok) throw new Error('Failed to fetch products');
      const allProducts = await res.json();
      return allProducts.filter((p: ManufacturableProduct) => p.replenishmentMethod === 'make');
    },
  });

  const { data: allProducts = [] } = useQuery<ManufacturableProduct[]>({
    queryKey: ['/api/products', 'all-for-bom'],
    queryFn: async () => {
      const res = await fetch('/api/products?limit=9999');
      if (!res.ok) throw new Error('Failed to fetch products');
      const response = await res.json();
      return Array.isArray(response) ? response : (response.items || []);
    },
  });

  const childCountMap = useMemo(() => {
    return allProducts.reduce((acc: { [key: string]: number }, product: ManufacturableProduct) => {
      if (product.parentProductId) {
        acc[product.parentProductId] = (acc[product.parentProductId] || 0) + 1;
      }
      return acc;
    }, {});
  }, [allProducts]);

  const childrenOfSelected = useMemo(() => {
    if (!selectedProductId) return [];
    return allProducts.filter(p => p.parentProductId === selectedProductId);
  }, [allProducts, selectedProductId]);

  const ingredientHasChildren = (ingredientProductId: string): boolean => {
    return (childCountMap[ingredientProductId] || 0) > 0;
  };

  const ingredientIsManufactured = (ingredientProductId: string): boolean => {
    const product = allProducts.find(p => p.id === ingredientProductId);
    return product?.replenishmentMethod === 'make';
  };

  const calculateRequirements = useMutation({
    mutationFn: async ({ productId, quantity }: { productId: string; quantity: number }) => {
      const res = await apiRequest('POST', '/api/manufacturing/calculate-requirements', {
        productId,
        quantity
      });
      return res.json();
    },
    onSuccess: (data) => {
      setRequirements(data);
    },
    onError: (error: Error) => {
      toast({
        title: t('common:error'),
        description: error.message || t('products:calculateRequirementsError'),
        variant: "destructive",
      });
    },
  });

  const handleCalculate = () => {
    if (!selectedProductId || !quantityToBuild) return;
    calculateRequirements.mutate({
      productId: selectedProductId,
      quantity: parseInt(quantityToBuild)
    });
  };

  const selectedProduct = products.find(p => p.id === selectedProductId);
  const selectedProductChildCount = selectedProductId ? (childCountMap[selectedProductId] || 0) : 0;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Factory className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">{t('products:productionPlanner')}</h1>
            <p className="text-muted-foreground">{t('products:productionPlannerDescription')}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              {t('products:calculateRequirements')}
            </CardTitle>
            <CardDescription>
              {t('products:calculateRequirementsDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>{t('products:selectProduct')}</Label>
                {isLoadingProducts ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select 
                    value={selectedProductId} 
                    onValueChange={setSelectedProductId}
                  >
                    <SelectTrigger data-testid="select-product">
                      <SelectValue placeholder={t('products:selectProductPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {products.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">
                          {t('products:noManufacturableProducts')}
                        </div>
                      ) : (
                        products.map((product) => {
                          const productChildCount = childCountMap[product.id] || 0;
                          return (
                            <SelectItem 
                              key={product.id} 
                              value={product.id}
                              data-testid={`product-option-${product.id}`}
                            >
                              <div className="flex items-center gap-2">
                                <span>{product.name}</span>
                                <span className="text-xs text-muted-foreground">({product.sku})</span>
                                {productChildCount > 0 && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-cyan-400 text-cyan-600 dark:text-cyan-400">
                                    <Factory className="h-2.5 w-2.5 mr-0.5" />
                                    {productChildCount}
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          );
                        })
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label>{t('products:quantityToBuild')}</Label>
                <Input
                  type="number"
                  min="1"
                  value={quantityToBuild}
                  onChange={(e) => setQuantityToBuild(e.target.value)}
                  placeholder="1"
                  data-testid="input-quantity-to-build"
                />
              </div>

              <div className="flex items-end">
                <Button
                  onClick={handleCalculate}
                  disabled={!selectedProductId || !quantityToBuild || calculateRequirements.isPending}
                  className="w-full"
                  data-testid="button-calculate"
                >
                  {calculateRequirements.isPending ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Calculator className="h-4 w-4 mr-2" />
                  )}
                  {t('products:calculate')}
                </Button>
              </div>
            </div>

            {selectedProduct && selectedProductChildCount > 0 && (
              <div className="mt-4 p-3 bg-cyan-50 dark:bg-cyan-950 rounded-lg border border-cyan-200 dark:border-cyan-800" data-testid="parent-product-indicator">
                <div className="flex items-center gap-2">
                  <Factory className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                  <span className="text-sm font-medium text-cyan-800 dark:text-cyan-200">
                    {t('products:parentProductWith', { count: selectedProductChildCount })}
                  </span>
                  <Badge variant="outline" className="border-cyan-400 text-cyan-600 dark:text-cyan-400">
                    <Layers className="h-3 w-3 mr-1" />
                    {selectedProductChildCount} {selectedProductChildCount === 1 ? t('inventory:component') : t('inventory:components')}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedProductId && childrenOfSelected.length > 0 && (
          <Card data-testid="card-components">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cyan-700 dark:text-cyan-300">
                <Layers className="h-5 w-5" />
                {t('products:directComponents')}
              </CardTitle>
              <CardDescription>
                {t('products:directComponentsDescription', { product: selectedProduct?.name })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {childrenOfSelected.map((child) => (
                  <div 
                    key={child.id} 
                    className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700"
                    data-testid={`component-${child.id}`}
                  >
                    <CornerDownRight className="h-4 w-4 text-gray-400" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{child.name}</span>
                        <span className="text-xs text-muted-foreground">({child.sku})</span>
                        {child.replenishmentMethod === 'make' && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-teal-400 text-teal-600 dark:text-teal-400">
                                  <Wrench className="h-2.5 w-2.5 mr-0.5" />
                                  {t('products:manufactured')}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t('products:manufacturedTooltip')}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {t('products:stock')}: {child.quantity || 0}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {requirements && (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Card data-testid="card-build-status" className={requirements.canFullyBuild ? "border-green-500 bg-green-50 dark:bg-green-950" : "border-orange-500 bg-orange-50 dark:bg-orange-950"}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{t('products:buildStatus')}</p>
                      <p className="text-2xl font-bold" data-testid="text-build-status">
                        {requirements.canFullyBuild ? t('products:canFullyBuild') : t('products:missingIngredients')}
                      </p>
                    </div>
                    {requirements.canFullyBuild ? (
                      <CheckCircle className="h-10 w-10 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-10 w-10 text-orange-600" />
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-requested-qty">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{t('products:requestedQty')}</p>
                      <p className="text-2xl font-bold" data-testid="text-requested-qty">{requirements.requestedQty}</p>
                    </div>
                    <Box className="h-10 w-10 text-primary opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-max-buildable">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{t('products:maxBuildable')}</p>
                      <p className="text-2xl font-bold" data-testid="text-max-buildable">{requirements.maxBuildable}</p>
                    </div>
                    <Factory className="h-10 w-10 text-primary opacity-50" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  {t('products:ingredientRequirements')}
                </CardTitle>
                <CardDescription>
                  {t('products:ingredientRequirementsFor', { product: requirements.productName, qty: requirements.requestedQty })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table data-testid="table-requirements">
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('products:ingredient')}</TableHead>
                      <TableHead>{t('products:sku')}</TableHead>
                      <TableHead className="text-right">{t('products:requiredQty')}</TableHead>
                      <TableHead className="text-right">{t('products:availableStock')}</TableHead>
                      <TableHead className="text-right">{t('products:missingQty')}</TableHead>
                      <TableHead>{t('products:status')}</TableHead>
                      <TableHead>{t('products:supplier')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requirements.ingredients.map((ingredient, idx) => {
                      const hasChildren = ingredientHasChildren(ingredient.ingredientProductId);
                      const isManufactured = ingredientIsManufactured(ingredient.ingredientProductId);
                      const ingredientChildCount = childCountMap[ingredient.ingredientProductId] || 0;
                      
                      return (
                        <TableRow key={idx} data-testid={`requirement-row-${idx}`}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span>{ingredient.ingredientName}</span>
                              {hasChildren && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-cyan-400 text-cyan-600 dark:text-cyan-400">
                                        <Factory className="h-2.5 w-2.5 mr-0.5" />
                                        {ingredientChildCount}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{t('products:ingredientHasComponents', { count: ingredientChildCount })}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              {isManufactured && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-teal-400 text-teal-600 dark:text-teal-400">
                                        <Wrench className="h-2.5 w-2.5 mr-0.5" />
                                        {t('products:make')}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{t('products:manufacturedIngredient')}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{ingredient.ingredientSku}</TableCell>
                          <TableCell className="text-right font-semibold">{ingredient.requiredQty}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={ingredient.canFulfill ? "secondary" : "destructive"}>
                              {ingredient.availableStock}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {ingredient.missingQty > 0 ? (
                              <span className="text-destructive font-semibold">-{ingredient.missingQty}</span>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {ingredient.canFulfill ? (
                              <Badge data-testid={`badge-status-sufficient-${idx}`} className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                {t('products:sufficient')}
                              </Badge>
                            ) : (
                              <Badge data-testid={`badge-status-insufficient-${idx}`} variant="destructive">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                {t('products:insufficient')}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {ingredient.supplier ? (
                              <div className="flex items-center gap-1 text-sm">
                                <Truck className="h-3 w-3" />
                                {ingredient.supplier.name}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {!requirements.canFullyBuild && requirements.ingredients.some(i => !i.canFulfill) && (
                  <div data-testid="alert-procurement-needed" className="mt-4 p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-orange-800 dark:text-orange-200">
                          {t('products:procurementNeeded')}
                        </p>
                        <p className="text-sm text-orange-600 dark:text-orange-300 mt-1">
                          {t('products:procurementNeededDescription', { 
                            count: requirements.ingredients.filter(i => !i.canFulfill).length 
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {!requirements && !calculateRequirements.isPending && selectedProduct && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Calculator className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
              <p className="text-muted-foreground">
                {t('products:clickCalculateToSeeRequirements')}
              </p>
            </CardContent>
          </Card>
        )}

        {products.length === 0 && !isLoadingProducts && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Factory className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
              <p className="text-lg font-medium text-muted-foreground mb-2">
                {t('products:noManufacturableProducts')}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('products:noManufacturableProductsDescription')}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
