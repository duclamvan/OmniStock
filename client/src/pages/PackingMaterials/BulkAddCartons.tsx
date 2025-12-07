import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { nanoid } from "nanoid";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, Trash2, Box, Loader2, Check, AlertCircle, Link2 } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CartonEntry {
  id: string;
  name: string;
  code: string;
  length: string;
  width: string;
  height: string;
  dimensionUnit: string;
  stockQuantity: number;
  cost: string;
}

const CARTON_PRESETS = [
  { id: 'small', label: 'cartonPresetSmall', length: '30', width: '20', height: '15' },
  { id: 'medium', label: 'cartonPresetMedium', length: '40', width: '30', height: '25' },
  { id: 'large', label: 'cartonPresetLarge', length: '60', width: '40', height: '40' },
  { id: 'xlarge', label: 'cartonPresetExtraLarge', length: '80', width: '60', height: '50' },
  { id: 'flat', label: 'cartonPresetFlat', length: '50', width: '40', height: '10' },
];

function generateCartonCode(length: string, width: string, height: string): string {
  if (!length || !width || !height) return '';
  return `CART-${length}x${width}x${height}`;
}

function generateCartonName(length: string, width: string, height: string, unit: string): string {
  if (!length || !width || !height) return '';
  return `Carton ${length}×${width}×${height} ${unit}`;
}

function isValidUrl(url: string): boolean {
  if (!url) return true;
  try {
    new URL(url.startsWith('http') ? url : `https://${url}`);
    return true;
  } catch {
    return false;
  }
}

function createEmptyCarton(): CartonEntry {
  return {
    id: nanoid(),
    name: '',
    code: '',
    length: '',
    width: '',
    height: '',
    dimensionUnit: 'cm',
    stockQuantity: 0,
    cost: '',
  };
}

export default function BulkAddCartons() {
  const { t } = useTranslation('warehouse');
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [supplierUrl, setSupplierUrl] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [cartons, setCartons] = useState<CartonEntry[]>([createEmptyCarton()]);
  const [result, setResult] = useState<{ createdCount: number; errors?: { index: number; error: string }[] } | null>(null);

  const supplierUrlValid = isValidUrl(supplierUrl);

  const updateCarton = useCallback((id: string, field: keyof CartonEntry, value: string | number) => {
    setCartons(prev => prev.map(carton => {
      if (carton.id !== id) return carton;
      
      const updated = { ...carton, [field]: value };
      
      if (field === 'length' || field === 'width' || field === 'height' || field === 'dimensionUnit') {
        const { length, width, height, dimensionUnit } = updated;
        updated.code = generateCartonCode(length, width, height);
        updated.name = generateCartonName(length, width, height, dimensionUnit);
      }
      
      return updated;
    }));
  }, []);

  const addRow = useCallback(() => {
    setCartons(prev => [...prev, createEmptyCarton()]);
  }, []);

  const removeRow = useCallback((id: string) => {
    setCartons(prev => prev.length > 1 ? prev.filter(c => c.id !== id) : prev);
  }, []);

  const addPresetCarton = useCallback((preset: typeof CARTON_PRESETS[0]) => {
    const newCarton: CartonEntry = {
      id: nanoid(),
      name: generateCartonName(preset.length, preset.width, preset.height, 'cm'),
      code: generateCartonCode(preset.length, preset.width, preset.height),
      length: preset.length,
      width: preset.width,
      height: preset.height,
      dimensionUnit: 'cm',
      stockQuantity: 0,
      cost: '',
    };
    setCartons(prev => [...prev, newCarton]);
  }, []);

  const bulkCreateMutation = useMutation({
    mutationFn: async (materials: any[]) => {
      const response = await apiRequest("POST", "/api/packing-materials/bulk", { materials });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/packing-materials"] });
      setResult(data);
      
      if (data.createdCount > 0) {
        toast({
          title: t('success'),
          description: t('cartonsCreatedSuccess', { count: data.createdCount }),
        });
      }
      
      if (data.errors && data.errors.length > 0) {
        toast({
          title: t('warning'),
          description: t('someCartonsFailed', { failed: data.errors.length }),
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: t('error'),
        description: error.message || t('failedToCreatePackingMaterial'),
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    const validCartons = cartons.filter(c => c.length && c.width && c.height && c.code);
    
    if (validCartons.length === 0) {
      toast({
        title: t('noCartonsToCreate'),
        description: t('addAtLeastOneCarton'),
        variant: "destructive",
      });
      return;
    }

    const materials = validCartons.map(carton => ({
      name: carton.name || generateCartonName(carton.length, carton.width, carton.height, carton.dimensionUnit),
      code: carton.code,
      category: 'cartons',
      dimensions: `${carton.length}×${carton.width}×${carton.height} ${carton.dimensionUnit}`,
      stockQuantity: carton.stockQuantity,
      cost: carton.cost || undefined,
      currency,
      supplier: supplierUrl || undefined,
      isActive: true,
      isFragile: false,
      isReusable: false,
    }));

    bulkCreateMutation.mutate(materials);
  };

  const validCartonCount = cartons.filter(c => c.length && c.width && c.height && c.code).length;

  return (
    <div className="container mx-auto py-3 md:py-6 px-2 md:px-4 max-w-5xl pb-24 md:pb-6 overflow-x-hidden">
      <div className="mb-4 md:mb-6">
        <Button variant="ghost" size="sm" data-testid="button-back" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">{t('backToPackingMaterials')}</span>
          <span className="sm:hidden">{t('cancel')}</span>
        </Button>
      </div>

      <Card className="border-0 md:border shadow-none md:shadow-sm">
        <CardHeader className="px-3 md:px-6 py-3 md:py-6">
          <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
            <Box className="h-6 w-6" />
            {t('bulkAddCartons')}
          </CardTitle>
          <CardDescription className="text-sm">
            {t('addMultipleCartonsAtOnce')}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-3 md:px-6 space-y-6">
          
          {result && result.createdCount > 0 && (
            <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
              <Check className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                {t('cartonsCreatedSuccess', { count: result.createdCount })}
                {result.errors && result.errors.length > 0 && (
                  <span className="ml-2 text-amber-600">
                    ({t('someCartonsFailed', { failed: result.errors.length })})
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div>
              <h3 className="text-base md:text-lg font-semibold mb-3">{t('supplierForAllCartons')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">{t('supplierUrl')}</Label>
                  <div className="relative mt-1">
                    <Input
                      className="h-11 pr-10"
                      placeholder={t('supplierUrlPlaceholder')}
                      value={supplierUrl}
                      onChange={(e) => setSupplierUrl(e.target.value)}
                      data-testid="input-supplier-url"
                    />
                    {supplierUrl && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {supplierUrlValid ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-sm">{t('currency')}</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger className="h-11 mt-1" data-testid="select-currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="CZK">CZK (Kč)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base md:text-lg font-semibold">{t('presetSizes')}</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {CARTON_PRESETS.map((preset) => (
                  <Button
                    key={preset.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs md:text-sm"
                    onClick={() => addPresetCarton(preset)}
                    data-testid={`preset-${preset.id}`}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {t(preset.label)}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base md:text-lg font-semibold">
                  {t('cartonEntries')}
                  {validCartonCount > 0 && (
                    <Badge variant="secondary" className="ml-2">{validCartonCount}</Badge>
                  )}
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addRow}
                  data-testid="button-add-row"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t('addRow')}
                </Button>
              </div>

              <div className="space-y-4">
                {cartons.map((carton, index) => (
                  <Card key={carton.id} className="p-3 md:p-4 bg-muted/30">
                    <div className="flex items-start gap-2 mb-3">
                      <Badge variant="outline" className="text-xs">#{index + 1}</Badge>
                      {carton.code && (
                        <Badge variant="secondary" className="text-xs font-mono">{carton.code}</Badge>
                      )}
                      <div className="flex-1" />
                      {cartons.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeRow(carton.id)}
                          data-testid={`button-remove-row-${index}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                      <div className="col-span-2 md:col-span-2">
                        <Label className="text-xs text-muted-foreground">{t('materialNameLabel')}</Label>
                        <Input
                          className="h-10 mt-1"
                          placeholder={t('cartonNamePlaceholder')}
                          value={carton.name}
                          onChange={(e) => updateCarton(carton.id, 'name', e.target.value)}
                          data-testid={`input-name-${index}`}
                        />
                      </div>
                      
                      <div>
                        <Label className="text-xs text-muted-foreground">{t('length')}</Label>
                        <Input
                          className="h-10 mt-1 text-center"
                          placeholder="0"
                          inputMode="decimal"
                          value={carton.length}
                          onChange={(e) => updateCarton(carton.id, 'length', e.target.value)}
                          data-testid={`input-length-${index}`}
                        />
                      </div>
                      
                      <div>
                        <Label className="text-xs text-muted-foreground">{t('width')}</Label>
                        <Input
                          className="h-10 mt-1 text-center"
                          placeholder="0"
                          inputMode="decimal"
                          value={carton.width}
                          onChange={(e) => updateCarton(carton.id, 'width', e.target.value)}
                          data-testid={`input-width-${index}`}
                        />
                      </div>
                      
                      <div>
                        <Label className="text-xs text-muted-foreground">{t('height')}</Label>
                        <Input
                          className="h-10 mt-1 text-center"
                          placeholder="0"
                          inputMode="decimal"
                          value={carton.height}
                          onChange={(e) => updateCarton(carton.id, 'height', e.target.value)}
                          data-testid={`input-height-${index}`}
                        />
                      </div>
                      
                      <div>
                        <Label className="text-xs text-muted-foreground">{t('unit')}</Label>
                        <Select 
                          value={carton.dimensionUnit} 
                          onValueChange={(value) => updateCarton(carton.id, 'dimensionUnit', value)}
                        >
                          <SelectTrigger className="h-10 mt-1" data-testid={`select-unit-${index}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cm">cm</SelectItem>
                            <SelectItem value="mm">mm</SelectItem>
                            <SelectItem value="in">in</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">{t('stockQty')}</Label>
                        <Input
                          className="h-10 mt-1 text-center"
                          type="number"
                          min="0"
                          value={carton.stockQuantity}
                          onChange={(e) => updateCarton(carton.id, 'stockQuantity', parseInt(e.target.value) || 0)}
                          data-testid={`input-stock-${index}`}
                        />
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">{t('unitCost')}</Label>
                        <Input
                          className="h-10 mt-1"
                          placeholder="0.00"
                          inputMode="decimal"
                          value={carton.cost}
                          onChange={(e) => updateCarton(carton.id, 'cost', e.target.value)}
                          data-testid={`input-cost-${index}`}
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="order-2 md:order-1"
              onClick={() => navigate('/packing-materials')}
              data-testid="button-cancel"
            >
              {t('cancel')}
            </Button>
            <Button
              type="button"
              className="order-1 md:order-2 flex-1 md:flex-none"
              onClick={handleSubmit}
              disabled={bulkCreateMutation.isPending || validCartonCount === 0}
              data-testid="button-create-all"
            >
              {bulkCreateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('creatingCartons')}
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  {t('createAllCartons')} ({validCartonCount})
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
