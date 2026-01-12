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
  Archive,
  History,
} from "lucide-react";
import { format } from "date-fns";

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
}

export default function SimpleConversion() {
  const { t } = useTranslation("manufacturing");
  const { toast } = useToast();

  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [historyTab, setHistoryTab] = useState<string>("all");

  const { data: productsWithBom = [], isLoading: isLoadingProducts } = useQuery<ProductWithBom[]>({
    queryKey: ["/api/manufacturing/products-with-bom"],
  });

  const { data: requirements, isLoading: isLoadingRequirements } = useQuery<RequirementsResponse>({
    queryKey: ["/api/manufacturing/calculate-requirements", { productId: selectedProductId, quantity: quantity.toString() }],
    enabled: !!selectedProductId && quantity > 0,
  });

  const { data: locations = [] } = useQuery<LocationCode[]>({
    queryKey: ["/api/locations", { productId: selectedProductId }],
    enabled: !!selectedProductId,
  });

  const { data: manufacturingRuns = [], isLoading: isLoadingRuns } = useQuery<ManufacturingRun[]>({
    queryKey: ["/api/manufacturing/runs"],
  });

  const archiveMutation = useMutation({
    mutationFn: async (runId: string) => {
      await apiRequest("POST", `/api/manufacturing/runs/${runId}/archive`);
    },
    onSuccess: () => {
      toast({
        title: t("archiveSuccess", "Run archived successfully"),
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/manufacturing/runs"] });
    },
    onError: (error: Error) => {
      toast({
        title: t("error", "Error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const manufacturingMutation = useMutation({
    mutationFn: async () => {
      const runRes = await apiRequest("POST", "/api/manufacturing/runs", {
        productId: selectedProductId,
        quantity,
        locationId: selectedLocationId,
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

  const canSubmit =
    selectedProductId &&
    quantity > 0 &&
    selectedLocationId &&
    requirements?.canFullyBuild;

  const hasInsufficientStock = requirements?.ingredients?.some(
    (ing) => !ing.canFulfill
  );

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <Factory className="h-10 w-10 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">
            {t("simpleConversion", "Simple Conversion")}
          </h1>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
              <Package className="h-6 w-6" />
              {t("selectProduct", "Select Product to Make")}
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
                <SelectTrigger className="h-14 text-lg">
                  <SelectValue
                    placeholder={t("selectProduct", "Select Product to Make")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {productsWithBom.map((product) => (
                    <SelectItem
                      key={product.id}
                      value={product.id}
                      className="text-lg py-3"
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
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl sm:text-2xl">
                {t("quantityToMake", "Quantity to Make")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-16 w-16 text-2xl font-bold"
                  onClick={() => handleQuantityChange(-1)}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-8 w-8" />
                </Button>
                <Input
                  type="number"
                  value={quantity}
                  onChange={handleInputChange}
                  className="h-16 w-32 text-center text-3xl font-bold"
                  min={1}
                />
                <Button
                  variant="outline"
                  size="lg"
                  className="h-16 w-16 text-2xl font-bold"
                  onClick={() => handleQuantityChange(1)}
                >
                  <Plus className="h-8 w-8" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {selectedProductId && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl sm:text-2xl">
                {t("componentsNeeded", "Components Needed")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingRequirements ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : !requirements?.ingredients?.length ? (
                <div className="text-center py-8 text-muted-foreground text-lg">
                  {t("noComponents", "No components required")}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-2 text-sm font-semibold text-muted-foreground border-b pb-2">
                    <div>{t("component", "Component")}</div>
                    <div className="text-center">{t("required", "Required")}</div>
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

        {selectedProductId && locations.length > 0 && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
                <MapPin className="h-6 w-6" />
                {t("storageLocation", "Storage Location")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedLocationId}
                onValueChange={setSelectedLocationId}
              >
                <SelectTrigger className="h-14 text-lg">
                  <SelectValue
                    placeholder={t("storageLocation", "Storage Location")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem
                      key={location.id}
                      value={location.id}
                      className="text-lg py-3"
                    >
                      {location.code}
                      {location.name ? ` - ${location.name}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {selectedProductId && (
          <Button
            className="w-full py-6 text-xl font-bold"
            size="lg"
            disabled={!canSubmit || manufacturingMutation.isPending}
            onClick={() => manufacturingMutation.mutate()}
          >
            {manufacturingMutation.isPending ? (
              <>
                <Loader2 className="h-6 w-6 mr-2 animate-spin" />
                {t("processing", "Processing...")}
              </>
            ) : (
              <>
                <Factory className="h-6 w-6 mr-2" />
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
              {t("history", "Manufacturing History")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={historyTab} onValueChange={setHistoryTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="all" className="text-base">
                  {t("all", "All")}
                </TabsTrigger>
                <TabsTrigger value="completed" className="text-base">
                  {t("completed", "Completed")}
                </TabsTrigger>
                <TabsTrigger value="archived" className="text-base">
                  {t("archived", "Archived")}
                </TabsTrigger>
              </TabsList>

              {isLoadingRuns ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {["all", "completed", "archived"].map((tab) => {
                    const filteredRuns = manufacturingRuns.filter((run) => {
                      if (tab === "all") return run.status === "completed" || run.status === "archived";
                      return run.status === tab;
                    });

                    return (
                      <TabsContent key={tab} value={tab} className="space-y-3">
                        {filteredRuns.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground text-lg">
                            {t("noRuns", "No manufacturing runs yet")}
                          </div>
                        ) : (
                          filteredRuns.map((run) => (
                            <div
                              key={run.id}
                              className={`p-4 rounded-lg border ${
                                run.status === "completed"
                                  ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                                  : "bg-gray-50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700"
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg font-bold">
                                      {t("runNumber", "Run #")}{run.runNumber}
                                    </span>
                                    <span
                                      className={`text-sm px-2 py-0.5 rounded-full ${
                                        run.status === "completed"
                                          ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                          : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                                      }`}
                                    >
                                      {run.status === "completed"
                                        ? t("completed", "Completed")
                                        : t("archived", "Archived")}
                                    </span>
                                  </div>
                                  <div className="text-base text-muted-foreground">
                                    {run.productName}
                                  </div>
                                  <div className="flex items-center gap-4 text-base">
                                    <span>
                                      {t("produced", "Produced")}: <strong>{run.quantity}</strong>
                                    </span>
                                    <span className="text-muted-foreground">
                                      {format(new Date(run.completedAt || run.createdAt), "PPp")}
                                    </span>
                                  </div>
                                </div>
                                {run.status === "completed" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => archiveMutation.mutate(run.id)}
                                    disabled={archiveMutation.isPending}
                                    className="flex items-center gap-2"
                                  >
                                    {archiveMutation.isPending ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Archive className="h-4 w-4" />
                                    )}
                                    {t("archive", "Archive")}
                                  </Button>
                                )}
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
