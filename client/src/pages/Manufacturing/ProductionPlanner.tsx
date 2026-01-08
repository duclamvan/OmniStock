import { useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import { 
  Factory, 
  Package, 
  Calculator,
  AlertTriangle,
  CheckCircle,
  Truck,
  ArrowRight,
  RefreshCw,
  Box
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
  const { t } = useTranslation(['products', 'common']);
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
                        products.map((product) => (
                          <SelectItem 
                            key={product.id} 
                            value={product.id}
                            data-testid={`product-option-${product.id}`}
                          >
                            <div className="flex items-center gap-2">
                              <span>{product.name}</span>
                              <span className="text-xs text-muted-foreground">({product.sku})</span>
                            </div>
                          </SelectItem>
                        ))
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
          </CardContent>
        </Card>

        {requirements && (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Card className={requirements.canFullyBuild ? "border-green-500 bg-green-50 dark:bg-green-950" : "border-orange-500 bg-orange-50 dark:bg-orange-950"}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{t('products:buildStatus')}</p>
                      <p className="text-2xl font-bold">
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

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{t('products:requestedQty')}</p>
                      <p className="text-2xl font-bold">{requirements.requestedQty}</p>
                    </div>
                    <Box className="h-10 w-10 text-primary opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{t('products:maxBuildable')}</p>
                      <p className="text-2xl font-bold">{requirements.maxBuildable}</p>
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
                <Table>
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
                    {requirements.ingredients.map((ingredient, idx) => (
                      <TableRow key={idx} data-testid={`requirement-row-${idx}`}>
                        <TableCell className="font-medium">{ingredient.ingredientName}</TableCell>
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
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {t('products:sufficient')}
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
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
                    ))}
                  </TableBody>
                </Table>

                {!requirements.canFullyBuild && requirements.ingredients.some(i => !i.canFulfill) && (
                  <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
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
