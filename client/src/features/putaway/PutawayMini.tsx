import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Package, MapPin, TrendingUp, CheckCircle } from "lucide-react";
import type { PutawaySuggestion } from "@shared/schema";
import { useTranslation } from "react-i18next";

export function PutawayMini() {
  const { t } = useTranslation();
  const [productCode, setProductCode] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [selectedSuggestion, setSelectedSuggestion] = useState<PutawaySuggestion | null>(null);

  // Fetch products
  const { data: products } = useQuery({
    queryKey: ["/api/products"],
  });

  // Get product by code
  const currentProduct = products?.find((p: any) => 
    p.productCode === productCode || p.barcode === productCode
  );

  // Fetch putaway suggestions
  const { data: suggestions, isLoading } = useQuery({
    queryKey: [`/api/putaway/suggestions`, currentProduct?.id, quantity],
    queryFn: async () => {
      if (!currentProduct) return [];
      const response = await apiRequest('GET', `/api/putaway/suggestions?productId=${currentProduct.id}&quantity=${quantity}`);
      return response.json();
    },
    enabled: !!currentProduct,
  });

  // Complete putaway mutation
  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSuggestion) throw new Error("No suggestion selected");
      
      const response = await apiRequest("POST", "/api/putaway/complete", {
        suggestionId: selectedSuggestion.id,
        actualQuantity: quantity,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t("warehouse:putawayCompleted"),
        description: `${quantity} ${t("warehouse:unitsPutawayTo")} ${selectedSuggestion?.locationAddress}`,
      });
      // Reset form
      setProductCode("");
      setQuantity(1);
      setSelectedSuggestion(null);
      queryClient.invalidateQueries({ queryKey: ["/api/putaway/suggestions"] });
    },
    onError: () => {
      toast({
        title: t("common:error"),
        description: t("warehouse:failedToCompletePutaway"),
        variant: "destructive",
      });
    },
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800";
    if (score >= 60) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle>{t("warehouse:scanProduct")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="product">{t("warehouse:productCodeBarcode")}</Label>
              <Input
                id="product"
                value={productCode}
                onChange={(e) => setProductCode(e.target.value)}
                placeholder={t("warehouse:scanOrEnterCode")}
                autoFocus
              />
            </div>

            <div>
              <Label htmlFor="quantity">{t("common:quantity")}</Label>
              <Input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value))}
                min={1}
              />
            </div>

            {currentProduct && (
              <Card className="bg-blue-50">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span className="font-medium">{currentProduct.name}</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {t("warehouse:currentStock")}: {currentProduct.quantity} {t("common:units")}
                  </div>
                  {currentProduct.warehouseLocation && (
                    <div className="text-sm text-gray-600">
                      {t("warehouse:currentLocation")}: {currentProduct.warehouseLocation}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Suggestions Section */}
      <Card>
        <CardHeader>
          <CardTitle>{t("warehouse:suggestedLocations")}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : suggestions && suggestions.length > 0 ? (
            <div className="space-y-2">
              {suggestions.map((suggestion: PutawaySuggestion) => (
                <Card
                  key={suggestion.id}
                  className={`cursor-pointer transition-all ${
                    selectedSuggestion?.id === suggestion.id ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setSelectedSuggestion(suggestion)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">{suggestion.locationAddress}</span>
                      </div>
                      <Badge className={getScoreColor(suggestion.score)}>
                        {t("warehouse:score")}: {suggestion.score}
                      </Badge>
                    </div>
                    
                    <div className="mt-2 text-sm text-gray-600">
                      <div>{t("warehouse:strategy")}: {suggestion.strategy}</div>
                      {suggestion.reason && (
                        <div className="text-xs mt-1">{suggestion.reason}</div>
                      )}
                    </div>

                    <div className="flex gap-2 mt-2">
                      {suggestion.priority === "high" && (
                        <Badge variant="destructive" className="text-xs">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {t("warehouse:priority")}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : currentProduct ? (
            <div className="text-center py-8 text-gray-500">
              {t("warehouse:noPutawayLocationsAvailable")}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              {t("warehouse:scanProductToSeeSuggestions")}
            </div>
          )}

          {selectedSuggestion && (
            <Button
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending}
              className="w-full mt-4"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {completeMutation.isPending ? t("warehouse:processing") : t("warehouse:completePutaway")}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}