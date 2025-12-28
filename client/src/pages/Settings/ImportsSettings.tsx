import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Package, Save, Loader2, Plane, Ship, Train, Zap, Globe, Settings2 } from "lucide-react";
import { handleDecimalKeyDown, parseDecimal } from "@/lib/utils";

const formSchema = z.object({
  default_purchase_currency: z.enum(['USD', 'EUR', 'CZK', 'VND', 'CNY']).default('USD'),
  default_payment_currency: z.enum(['USD', 'EUR', 'CZK', 'VND', 'CNY']).default('CZK'),
  default_purchase_location: z.enum(['Europe', 'USA', 'China', 'Vietnam']).default('China'),
  auto_update_delivery_status: z.boolean().default(true),
  auto_generate_sku: z.boolean().default(true),
  sku_prefix: z.string().default(''),
  default_weight_unit: z.enum(['mg', 'g', 'kg', 'oz', 'lb']).default('kg'),
  
  default_consolidation_shipping_method: z.string().default('air_general'),
  default_consolidation_location: z.enum(['Europe', 'USA', 'China', 'Vietnam']).default('China'),
  max_consolidation_weight_kg: z.coerce.number().min(0).default(30),
  max_consolidation_items: z.coerce.number().min(0).default(100),
  
  air_general_rate_per_kg: z.coerce.number().min(0).default(15),
  air_sensitive_rate_per_kg: z.coerce.number().min(0).default(18),
  sea_general_rate_per_kg: z.coerce.number().min(0).default(3),
  sea_sensitive_rate_per_kg: z.coerce.number().min(0).default(5),
  express_rate_per_kg: z.coerce.number().min(0).default(25),
  railway_rate_per_kg: z.coerce.number().min(0).default(8),
  shipping_rate_currency: z.enum(['USD', 'EUR', 'CZK']).default('USD'),
  
  enable_ai_classification: z.boolean().default(true),
  auto_classify_on_unpack: z.boolean().default(false),
  default_item_classification: z.enum(['general', 'sensitive', 'unclassified']).default('unclassified'),
  
  enable_variant_distribution: z.boolean().default(true),
  auto_calculate_import_cost: z.boolean().default(true),
  include_shipping_in_cost: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

export default function ImportsSettings() {
  const { t } = useTranslation(['settings', 'common', 'imports']);
  const { toast } = useToast();

  const { data: settings = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/settings'],
  });

  const importsSettings = settings
    .filter((s: any) => s.category === 'imports')
    .reduce((acc: Record<string, any>, s: any) => {
      acc[s.key] = s.value;
      return acc;
    }, {});

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      default_purchase_currency: 'USD',
      default_payment_currency: 'CZK',
      default_purchase_location: 'China',
      auto_update_delivery_status: true,
      auto_generate_sku: true,
      sku_prefix: '',
      default_weight_unit: 'kg',
      default_consolidation_shipping_method: 'air_general',
      default_consolidation_location: 'China',
      max_consolidation_weight_kg: 30,
      max_consolidation_items: 100,
      air_general_rate_per_kg: 15,
      air_sensitive_rate_per_kg: 18,
      sea_general_rate_per_kg: 3,
      sea_sensitive_rate_per_kg: 5,
      express_rate_per_kg: 25,
      railway_rate_per_kg: 8,
      shipping_rate_currency: 'USD',
      enable_ai_classification: true,
      auto_classify_on_unpack: false,
      default_item_classification: 'unclassified',
      enable_variant_distribution: true,
      auto_calculate_import_cost: true,
      include_shipping_in_cost: true,
    },
  });

  useEffect(() => {
    if (Object.keys(importsSettings).length > 0) {
      const mappedSettings: Partial<FormValues> = {};
      Object.entries(importsSettings).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          (mappedSettings as any)[key] = value;
        }
      });
      form.reset({ ...form.getValues(), ...mappedSettings });
    }
  }, [importsSettings, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      return apiRequest('/api/settings', {
        method: 'POST',
        body: JSON.stringify({
          category: 'imports',
          settings: data,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({
        title: t('common:success'),
        description: t('settings:settingsSaved'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message || t('settings:settingsSaveFailed'),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    saveMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="purchase" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 gap-1 h-auto p-1">
            <TabsTrigger value="purchase" className="gap-1.5 px-3 py-2 text-xs sm:text-sm" data-testid="tab-purchase">
              <Package className="h-4 w-4" />
              {t('settings:purchaseOrders')}
            </TabsTrigger>
            <TabsTrigger value="consolidation" className="gap-1.5 px-3 py-2 text-xs sm:text-sm" data-testid="tab-consolidation">
              <Globe className="h-4 w-4" />
              {t('settings:consolidations')}
            </TabsTrigger>
            <TabsTrigger value="shipping" className="gap-1.5 px-3 py-2 text-xs sm:text-sm" data-testid="tab-intl-shipping">
              <Plane className="h-4 w-4" />
              {t('settings:internationalShipping')}
            </TabsTrigger>
            <TabsTrigger value="processing" className="gap-1.5 px-3 py-2 text-xs sm:text-sm" data-testid="tab-processing">
              <Settings2 className="h-4 w-4" />
              {t('settings:processing')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="purchase" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  {t('settings:purchaseOrderDefaults')}
                </CardTitle>
                <CardDescription>
                  {t('settings:purchaseOrderDefaultsDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="default_purchase_currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:defaultPurchaseCurrency')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-purchase-currency">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="USD">USD - US Dollar</SelectItem>
                            <SelectItem value="EUR">EUR - Euro</SelectItem>
                            <SelectItem value="CZK">CZK - Czech Koruna</SelectItem>
                            <SelectItem value="VND">VND - Vietnamese Dong</SelectItem>
                            <SelectItem value="CNY">CNY - Chinese Yuan</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>{t('settings:defaultPurchaseCurrencyDesc')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="default_payment_currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:defaultPaymentCurrency')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-payment-currency">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="USD">USD - US Dollar</SelectItem>
                            <SelectItem value="EUR">EUR - Euro</SelectItem>
                            <SelectItem value="CZK">CZK - Czech Koruna</SelectItem>
                            <SelectItem value="VND">VND - Vietnamese Dong</SelectItem>
                            <SelectItem value="CNY">CNY - Chinese Yuan</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>{t('settings:defaultPaymentCurrencyDesc')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="default_purchase_location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:defaultPurchaseLocation')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-purchase-location">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="China">🇨🇳 China</SelectItem>
                            <SelectItem value="Vietnam">🇻🇳 Vietnam</SelectItem>
                            <SelectItem value="Europe">🇪🇺 Europe</SelectItem>
                            <SelectItem value="USA">🇺🇸 USA</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>{t('settings:defaultPurchaseLocationDesc')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="default_weight_unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:defaultWeightUnit')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-weight-unit">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="mg">mg</SelectItem>
                            <SelectItem value="g">g</SelectItem>
                            <SelectItem value="kg">kg</SelectItem>
                            <SelectItem value="oz">oz</SelectItem>
                            <SelectItem value="lb">lb</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>{t('settings:defaultWeightUnitDesc')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <FormField
                    control={form.control}
                    name="auto_update_delivery_status"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>{t('settings:autoUpdateDeliveryStatus')}</FormLabel>
                          <FormDescription>
                            {t('settings:autoUpdateDeliveryStatusDesc')}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-auto-delivery"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="auto_generate_sku"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>{t('settings:autoGenerateSku')}</FormLabel>
                          <FormDescription>
                            {t('settings:autoGenerateSkuDesc')}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-auto-sku"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sku_prefix"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:skuPrefix')}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g., DS-"
                            className="max-w-[200px]"
                            data-testid="input-sku-prefix"
                          />
                        </FormControl>
                        <FormDescription>{t('settings:skuPrefixDesc')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="consolidation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  {t('settings:consolidationDefaults')}
                </CardTitle>
                <CardDescription>
                  {t('settings:consolidationDefaultsDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="default_consolidation_shipping_method"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:defaultShippingMethod')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-consolidation-method">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="air_general">
                              <div className="flex items-center gap-2">
                                <Plane className="h-4 w-4" />
                                {t('imports:airGeneral')}
                              </div>
                            </SelectItem>
                            <SelectItem value="air_sensitive">
                              <div className="flex items-center gap-2">
                                <Plane className="h-4 w-4 text-orange-500" />
                                {t('imports:airSensitive')}
                              </div>
                            </SelectItem>
                            <SelectItem value="sea_general">
                              <div className="flex items-center gap-2">
                                <Ship className="h-4 w-4" />
                                {t('imports:seaGeneral')}
                              </div>
                            </SelectItem>
                            <SelectItem value="sea_sensitive">
                              <div className="flex items-center gap-2">
                                <Ship className="h-4 w-4 text-orange-500" />
                                {t('imports:seaSensitive')}
                              </div>
                            </SelectItem>
                            <SelectItem value="express">
                              <div className="flex items-center gap-2">
                                <Zap className="h-4 w-4" />
                                {t('imports:express')}
                              </div>
                            </SelectItem>
                            <SelectItem value="railway">
                              <div className="flex items-center gap-2">
                                <Train className="h-4 w-4" />
                                {t('imports:railway')}
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>{t('settings:defaultShippingMethodDesc')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="default_consolidation_location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:defaultConsolidationLocation')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-consolidation-location">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="China">🇨🇳 China</SelectItem>
                            <SelectItem value="Vietnam">🇻🇳 Vietnam</SelectItem>
                            <SelectItem value="Europe">🇪🇺 Europe</SelectItem>
                            <SelectItem value="USA">🇺🇸 USA</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>{t('settings:defaultConsolidationLocationDesc')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="max_consolidation_weight_kg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:maxConsolidationWeight')}</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseDecimal(e.target.value))}
                              onKeyDown={handleDecimalKeyDown}
                              className="max-w-[120px]"
                              data-testid="input-max-weight"
                            />
                            <span className="text-sm text-muted-foreground">kg</span>
                          </div>
                        </FormControl>
                        <FormDescription>{t('settings:maxConsolidationWeightDesc')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="max_consolidation_items"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:maxConsolidationItems')}</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              className="max-w-[120px]"
                              data-testid="input-max-items"
                            />
                            <span className="text-sm text-muted-foreground">{t('common:items')}</span>
                          </div>
                        </FormControl>
                        <FormDescription>{t('settings:maxConsolidationItemsDesc')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shipping" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plane className="h-5 w-5" />
                  {t('settings:internationalShippingRates')}
                </CardTitle>
                <CardDescription>
                  {t('settings:internationalShippingRatesDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="shipping_rate_currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('settings:shippingRateCurrency')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="max-w-[200px]" data-testid="select-rate-currency">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="CZK">CZK</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>{t('settings:shippingRateCurrencyDesc')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                  <FormField
                    control={form.control}
                    name="air_general_rate_per_kg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Plane className="h-4 w-4" />
                          {t('imports:airGeneral')}
                        </FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseDecimal(e.target.value))}
                              onKeyDown={handleDecimalKeyDown}
                              className="max-w-[100px]"
                              data-testid="input-air-general-rate"
                            />
                            <span className="text-sm text-muted-foreground">/ kg</span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="air_sensitive_rate_per_kg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Plane className="h-4 w-4 text-orange-500" />
                          {t('imports:airSensitive')}
                        </FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseDecimal(e.target.value))}
                              onKeyDown={handleDecimalKeyDown}
                              className="max-w-[100px]"
                              data-testid="input-air-sensitive-rate"
                            />
                            <span className="text-sm text-muted-foreground">/ kg</span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sea_general_rate_per_kg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Ship className="h-4 w-4" />
                          {t('imports:seaGeneral')}
                        </FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseDecimal(e.target.value))}
                              onKeyDown={handleDecimalKeyDown}
                              className="max-w-[100px]"
                              data-testid="input-sea-general-rate"
                            />
                            <span className="text-sm text-muted-foreground">/ kg</span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sea_sensitive_rate_per_kg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Ship className="h-4 w-4 text-orange-500" />
                          {t('imports:seaSensitive')}
                        </FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseDecimal(e.target.value))}
                              onKeyDown={handleDecimalKeyDown}
                              className="max-w-[100px]"
                              data-testid="input-sea-sensitive-rate"
                            />
                            <span className="text-sm text-muted-foreground">/ kg</span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="express_rate_per_kg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Zap className="h-4 w-4" />
                          {t('imports:express')}
                        </FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseDecimal(e.target.value))}
                              onKeyDown={handleDecimalKeyDown}
                              className="max-w-[100px]"
                              data-testid="input-express-rate"
                            />
                            <span className="text-sm text-muted-foreground">/ kg</span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="railway_rate_per_kg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Train className="h-4 w-4" />
                          {t('imports:railway')}
                        </FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseDecimal(e.target.value))}
                              onKeyDown={handleDecimalKeyDown}
                              className="max-w-[100px]"
                              data-testid="input-railway-rate"
                            />
                            <span className="text-sm text-muted-foreground">/ kg</span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="processing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings2 className="h-5 w-5" />
                  {t('settings:itemProcessing')}
                </CardTitle>
                <CardDescription>
                  {t('settings:itemProcessingDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="default_item_classification"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('settings:defaultItemClassification')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="max-w-[200px]" data-testid="select-default-classification">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="unclassified">{t('imports:unclassified')}</SelectItem>
                          <SelectItem value="general">{t('imports:general')}</SelectItem>
                          <SelectItem value="sensitive">{t('imports:sensitive')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>{t('settings:defaultItemClassificationDesc')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-3 pt-4 border-t">
                  <FormField
                    control={form.control}
                    name="enable_ai_classification"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>{t('settings:enableAiClassification')}</FormLabel>
                          <FormDescription>
                            {t('settings:enableAiClassificationDesc')}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-ai-classification"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="auto_classify_on_unpack"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>{t('settings:autoClassifyOnUnpack')}</FormLabel>
                          <FormDescription>
                            {t('settings:autoClassifyOnUnpackDesc')}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-auto-classify"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="enable_variant_distribution"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>{t('settings:enableVariantDistribution')}</FormLabel>
                          <FormDescription>
                            {t('settings:enableVariantDistributionDesc')}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-variant-distribution"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="auto_calculate_import_cost"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>{t('settings:autoCalculateImportCost')}</FormLabel>
                          <FormDescription>
                            {t('settings:autoCalculateImportCostDesc')}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-auto-import-cost"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="include_shipping_in_cost"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>{t('settings:includeShippingInCost')}</FormLabel>
                          <FormDescription>
                            {t('settings:includeShippingInCostDesc')}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-include-shipping"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-4 border-t">
          <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-imports">
            {saveMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('common:saving')}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {t('common:saveChanges')}
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
