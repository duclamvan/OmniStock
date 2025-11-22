import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTranslation } from 'react-i18next';
import { Package, Save, Loader2, ClipboardCheck, Warehouse, ShieldCheck, Ruler, Image } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { useQuery } from "@tanstack/react-query";
import { camelToSnake, deepCamelToSnake } from "@/utils/caseConverters";

const formSchema = z.object({
  // Product Defaults
  low_stock_threshold: z.preprocess(
    (val) => val === '' || val === null || val === undefined ? undefined : val,
    z.coerce.number().min(0).optional()
  ),
  default_product_type: z.enum(['regular', 'bundle', 'service']).optional(),
  enable_barcode_scanning: z.boolean().optional(),
  default_packaging_requirement: z.enum(['carton', 'outer_carton', 'nylon_wrap']).optional(),
  auto_generate_sku: z.boolean().optional(),
  sku_prefix: z.string().optional(),
  track_serial_numbers: z.boolean().optional(),

  // Stock Management
  stock_adjustment_approval_required: z.boolean().optional(),
  allow_negative_stock: z.boolean().optional(),
  auto_reorder_point: z.preprocess(
    (val) => val === '' || val === null || val === undefined ? undefined : val,
    z.coerce.number().min(0).optional()
  ),
  safety_stock_level: z.preprocess(
    (val) => val === '' || val === null || val === undefined ? undefined : val,
    z.coerce.number().min(0).optional()
  ),
  stock_count_frequency_days: z.preprocess(
    (val) => val === '' || val === null || val === undefined ? undefined : val,
    z.coerce.number().min(1).optional()
  ),
  enable_batch_lot_tracking: z.boolean().optional(),
  enable_expiration_date_tracking: z.boolean().optional(),

  // Warehouse Operations
  default_warehouse: z.string().optional(),
  enable_multi_warehouse: z.boolean().optional(),
  auto_assign_warehouse_location: z.boolean().optional(),
  location_format: z.enum(['A-01-01', 'A01-R01-S01', 'Zone-Rack-Bin', 'Custom']).optional(),
  enable_bin_management: z.boolean().optional(),
  enable_zone_management: z.boolean().optional(),
  temperature_control_zones: z.boolean().optional(),

  // Product Quality
  enable_quality_control: z.boolean().optional(),
  qc_sampling_rate: z.preprocess(
    (val) => val === '' || val === null || val === undefined ? undefined : val,
    z.coerce.number().min(0).max(100).optional()
  ),
  damage_report_required: z.boolean().optional(),
  photo_evidence_required: z.boolean().optional(),
  condition_tracking: z.enum(['good', 'damaged', 'refurbished', 'returned']).optional(),

  // Measurement Units
  default_length_unit: z.enum(['cm', 'mm', 'm', 'in']).optional(),
  default_weight_unit: z.enum(['kg', 'g', 'lb', 'oz']).optional(),
  default_volume_unit: z.enum(['L', 'mL', 'gal', 'oz']).optional(),
  decimal_places_weight: z.preprocess(
    (val) => val === '' || val === null || val === undefined ? undefined : val,
    z.coerce.number().min(1).max(4).optional()
  ),
  decimal_places_dimensions: z.preprocess(
    (val) => val === '' || val === null || val === undefined ? undefined : val,
    z.coerce.number().min(1).max(4).optional()
  ),

  // Catalog Settings
  enable_product_variants: z.boolean().optional(),
  enable_bundles: z.boolean().optional(),
  enable_services: z.boolean().optional(),
  max_images_per_product: z.preprocess(
    (val) => val === '' || val === null || val === undefined ? undefined : val,
    z.coerce.number().min(1).max(20).optional()
  ),
  auto_compress_images: z.boolean().optional(),
  image_quality: z.preprocess(
    (val) => val === '' || val === null || val === undefined ? undefined : val,
    z.coerce.number().min(0).max(100).optional()
  ),
});

type FormValues = z.infer<typeof formSchema>;

const valuesAreEqual = (a: any, b: any): boolean => {
  // Only null, undefined, and empty string are considered "unset"
  // false and 0 are valid, intentional values
  const isUnsetA = a === null || a === undefined || a === '';
  const isUnsetB = b === null || b === undefined || b === '';
  
  if (isUnsetA && isUnsetB) return true; // Both unset = equal
  if (isUnsetA || isUnsetB) return false; // One set, one unset = not equal
  
  // Both are set values, compare normally
  return a === b;
};

export default function InventorySettings() {
  const { t } = useTranslation(['settings', 'common']);
  const { toast } = useToast();
  const { inventorySettings, isLoading } = useSettings();
  const [originalSettings, setOriginalSettings] = useState<Partial<FormValues>>({});

  const { data: warehouses = [] } = useQuery<any[]>({
    queryKey: ['/api/warehouses'],
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      low_stock_threshold: inventorySettings.lowStockThreshold,
      default_product_type: inventorySettings.defaultProductType,
      enable_barcode_scanning: inventorySettings.enableBarcodeScanning,
      default_packaging_requirement: inventorySettings.defaultPackagingRequirement,
      auto_generate_sku: inventorySettings.autoGenerateSku,
      sku_prefix: inventorySettings.skuPrefix,
      track_serial_numbers: inventorySettings.trackSerialNumbers,
      stock_adjustment_approval_required: inventorySettings.stockAdjustmentApprovalRequired,
      allow_negative_stock: inventorySettings.allowNegativeStock,
      auto_reorder_point: inventorySettings.autoReorderPoint,
      safety_stock_level: inventorySettings.safetyStockLevel,
      stock_count_frequency_days: inventorySettings.stockCountFrequencyDays,
      enable_batch_lot_tracking: inventorySettings.enableBatchLotTracking,
      enable_expiration_date_tracking: inventorySettings.enableExpirationDateTracking,
      default_warehouse: inventorySettings.defaultWarehouse,
      enable_multi_warehouse: inventorySettings.enableMultiWarehouse,
      auto_assign_warehouse_location: inventorySettings.autoAssignWarehouseLocation,
      location_format: inventorySettings.locationFormat,
      enable_bin_management: inventorySettings.enableBinManagement,
      enable_zone_management: inventorySettings.enableZoneManagement,
      temperature_control_zones: inventorySettings.temperatureControlZones,
      enable_quality_control: inventorySettings.enableQualityControl,
      qc_sampling_rate: inventorySettings.qcSamplingRate,
      damage_report_required: inventorySettings.damageReportRequired,
      photo_evidence_required: inventorySettings.photoEvidenceRequired,
      condition_tracking: inventorySettings.conditionTracking,
      default_length_unit: inventorySettings.defaultLengthUnit,
      default_weight_unit: inventorySettings.defaultWeightUnit,
      default_volume_unit: inventorySettings.defaultVolumeUnit,
      decimal_places_weight: inventorySettings.decimalPlacesWeight,
      decimal_places_dimensions: inventorySettings.decimalPlacesDimensions,
      enable_product_variants: inventorySettings.enableProductVariants,
      enable_bundles: inventorySettings.enableBundles,
      enable_services: inventorySettings.enableServices,
      max_images_per_product: inventorySettings.maxImagesPerProduct,
      auto_compress_images: inventorySettings.autoCompressImages,
      image_quality: inventorySettings.imageQuality,
    },
  });

  // Capture snapshot when settings load
  useEffect(() => {
    if (!isLoading) {
      const snapshot = {
        low_stock_threshold: inventorySettings.lowStockThreshold,
        default_product_type: inventorySettings.defaultProductType,
        enable_barcode_scanning: inventorySettings.enableBarcodeScanning,
        default_packaging_requirement: inventorySettings.defaultPackagingRequirement,
        auto_generate_sku: inventorySettings.autoGenerateSku,
        sku_prefix: inventorySettings.skuPrefix,
        track_serial_numbers: inventorySettings.trackSerialNumbers,
        stock_adjustment_approval_required: inventorySettings.stockAdjustmentApprovalRequired,
        allow_negative_stock: inventorySettings.allowNegativeStock,
        auto_reorder_point: inventorySettings.autoReorderPoint,
        safety_stock_level: inventorySettings.safetyStockLevel,
        stock_count_frequency_days: inventorySettings.stockCountFrequencyDays,
        enable_batch_lot_tracking: inventorySettings.enableBatchLotTracking,
        enable_expiration_date_tracking: inventorySettings.enableExpirationDateTracking,
        default_warehouse: inventorySettings.defaultWarehouse,
        enable_multi_warehouse: inventorySettings.enableMultiWarehouse,
        auto_assign_warehouse_location: inventorySettings.autoAssignWarehouseLocation,
        location_format: inventorySettings.locationFormat,
        enable_bin_management: inventorySettings.enableBinManagement,
        enable_zone_management: inventorySettings.enableZoneManagement,
        temperature_control_zones: inventorySettings.temperatureControlZones,
        enable_quality_control: inventorySettings.enableQualityControl,
        qc_sampling_rate: inventorySettings.qcSamplingRate,
        damage_report_required: inventorySettings.damageReportRequired,
        photo_evidence_required: inventorySettings.photoEvidenceRequired,
        condition_tracking: inventorySettings.conditionTracking,
        default_length_unit: inventorySettings.defaultLengthUnit,
        default_weight_unit: inventorySettings.defaultWeightUnit,
        default_volume_unit: inventorySettings.defaultVolumeUnit,
        decimal_places_weight: inventorySettings.decimalPlacesWeight,
        decimal_places_dimensions: inventorySettings.decimalPlacesDimensions,
        enable_product_variants: inventorySettings.enableProductVariants,
        enable_bundles: inventorySettings.enableBundles,
        enable_services: inventorySettings.enableServices,
        max_images_per_product: inventorySettings.maxImagesPerProduct,
        auto_compress_images: inventorySettings.autoCompressImages,
        image_quality: inventorySettings.imageQuality,
      };
      setOriginalSettings(snapshot);
      form.reset(snapshot);
    }
  }, [isLoading, form, inventorySettings]);

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      // Compare current values against original snapshot
      const changedEntries = Object.entries(values).filter(([key, value]) => {
        const originalValue = originalSettings[key as keyof FormValues];
        // Only save if value actually changed from original
        return !valuesAreEqual(value, originalValue);
      });
      
      // Convert empty strings and undefined to null for explicit clearing
      const savePromises = changedEntries.map(([key, value]) => {
        const cleanValue = (value === '' || value === undefined) ? null : value;
        return apiRequest('POST', `/api/settings`, { 
          key: camelToSnake(key), 
          value: deepCamelToSnake(cleanValue), 
          category: 'inventory' 
        });
      });
      
      await Promise.all(savePromises);
    },
    onSuccess: async () => {
      // Invalidate and refetch settings to get true persisted state
      await queryClient.invalidateQueries({ queryKey: ['/api/settings', 'inventory'] });
      
      // The useEffect will automatically update originalSettings when new data loads
      toast({
        title: t('settings:settingsSaved'),
        description: t('settings:inventorySettingsSavedSuccess'),
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: t('common:error'),
        description: error.message || t('settings:settingsSaveError'),
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    saveMutation.mutate(values);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8 sm:py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
        <Tabs defaultValue="products" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
            <TabsTrigger value="products" className="flex items-center gap-1 sm:gap-2">
              <Package className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('settings:products')}</span>
            </TabsTrigger>
            <TabsTrigger value="stock" className="flex items-center gap-1 sm:gap-2">
              <ClipboardCheck className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('settings:stock')}</span>
            </TabsTrigger>
            <TabsTrigger value="warehouse" className="flex items-center gap-1 sm:gap-2">
              <Warehouse className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('settings:warehouse')}</span>
            </TabsTrigger>
            <TabsTrigger value="quality" className="flex items-center gap-1 sm:gap-2">
              <ShieldCheck className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('settings:quality')}</span>
            </TabsTrigger>
            <TabsTrigger value="units" className="flex items-center gap-1 sm:gap-2">
              <Ruler className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('settings:units')}</span>
            </TabsTrigger>
            <TabsTrigger value="catalog" className="flex items-center gap-1 sm:gap-2">
              <Image className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('settings:catalog')}</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Products */}
          <TabsContent value="products" className="space-y-4">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                  {t('settings:productDefaults')}
                </CardTitle>
                <CardDescription className="text-sm">{t('settings:productDefaultsDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="low_stock_threshold"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:lowStockThreshold')}</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value ?? ''}
                            type="number" 
                            min="0"
                            placeholder={t('settings:lowStockThresholdPlaceholder')} 
                            data-testid="input-low_stock_threshold" 
                          />
                        </FormControl>
                        <FormDescription>{t('settings:lowStockThresholdDescription')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="default_product_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:defaultProductType')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-default_product_type">
                              <SelectValue placeholder={t('settings:selectProductType')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="regular">{t('settings:productTypeRegular')}</SelectItem>
                            <SelectItem value="bundle">{t('settings:productTypeBundle')}</SelectItem>
                            <SelectItem value="service">{t('settings:productTypeService')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>{t('settings:defaultProductTypeDescription')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="default_packaging_requirement"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:defaultPackagingType')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-default_packaging_requirement">
                              <SelectValue placeholder={t('settings:selectPackagingType')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="carton">{t('settings:packagingTypeCarton')}</SelectItem>
                            <SelectItem value="outer_carton">{t('settings:packagingTypeOuterCarton')}</SelectItem>
                            <SelectItem value="nylon_wrap">{t('settings:packagingTypeNylonWrap')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>{t('settings:defaultPackagingTypeDescription')}</FormDescription>
                        <FormMessage />
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
                            value={field.value ?? ''}
                            placeholder={t('settings:skuPrefixPlaceholder')} 
                            data-testid="input-sku_prefix" 
                          />
                        </FormControl>
                        <FormDescription>{t('settings:skuPrefixDescription')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="enable_barcode_scanning"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value === true}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-enable_barcode_scanning"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Enable Barcode Scanning</FormLabel>
                          <FormDescription>
                            Enable barcode scanning features throughout the system
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="auto_generate_sku"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value === true}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-auto_generate_sku"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Auto-generate SKU</FormLabel>
                          <FormDescription>
                            Automatically generate SKU codes for new products
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="track_serial_numbers"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value === true}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-track_serial_numbers"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Track Serial Numbers</FormLabel>
                          <FormDescription>
                            Enable serial number tracking for products
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Stock */}
          <TabsContent value="stock" className="space-y-4">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <ClipboardCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                  {t('settings:stockManagement')}
                </CardTitle>
                <CardDescription className="text-sm">{t('settings:stockManagementDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="auto_reorder_point"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:autoReorderPoint')}</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value ?? ''}
                            type="number" 
                            min="0"
                            placeholder={t('settings:autoReorderPointPlaceholder')} 
                            data-testid="input-auto_reorder_point" 
                          />
                        </FormControl>
                        <FormDescription>{t('settings:autoReorderPointDescription')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="safety_stock_level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:safetyStockLevel')}</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value ?? ''}
                            type="number" 
                            min="0"
                            placeholder={t('settings:safetyStockLevelPlaceholder')} 
                            data-testid="input-safety_stock_level" 
                          />
                        </FormControl>
                        <FormDescription>{t('settings:safetyStockLevelDescription')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="stock_count_frequency_days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:stockCountFrequency')}</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value ?? ''}
                            type="number" 
                            min="1"
                            placeholder={t('settings:stockCountFrequencyPlaceholder')} 
                            data-testid="input-stock_count_frequency_days" 
                          />
                        </FormControl>
                        <FormDescription>{t('settings:stockCountFrequencyDescription')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="stock_adjustment_approval_required"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value === true}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-stock_adjustment_approval_required"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Stock Adjustment Approval Required</FormLabel>
                          <FormDescription>
                            Require manager approval for stock adjustments
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="allow_negative_stock"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value === true}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-allow_negative_stock"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Allow Negative Stock</FormLabel>
                          <FormDescription>
                            Allow stock to go below zero (backorders)
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="enable_batch_lot_tracking"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value === true}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-enable_batch_lot_tracking"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Enable Batch/Lot Tracking</FormLabel>
                          <FormDescription>
                            Track inventory by batch or lot numbers
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="enable_expiration_date_tracking"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value === true}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-enable_expiration_date_tracking"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Enable Expiration Date Tracking</FormLabel>
                          <FormDescription>
                            Track product expiration dates
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Warehouse */}
          <TabsContent value="warehouse" className="space-y-4">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Warehouse className="h-4 w-4 sm:h-5 sm:w-5" />
                  Warehouse Operations
                </CardTitle>
                <CardDescription className="text-sm">Warehouse and location management settings</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="default_warehouse"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Warehouse</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-default_warehouse">
                              <SelectValue placeholder="Select default warehouse" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {warehouses.map((warehouse: any) => (
                              <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                                {warehouse.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>Default warehouse for new products</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="location_format"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location Format</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-location_format">
                              <SelectValue placeholder="Select location format" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="A-01-01">A-01-01</SelectItem>
                            <SelectItem value="A01-R01-S01">A01-R01-S01</SelectItem>
                            <SelectItem value="Zone-Rack-Bin">Zone-Rack-Bin</SelectItem>
                            <SelectItem value="Custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>Format for warehouse location codes</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="enable_multi_warehouse"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value === true}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-enable_multi_warehouse"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Enable Multi-warehouse</FormLabel>
                          <FormDescription>
                            Allow managing inventory across multiple warehouses
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="auto_assign_warehouse_location"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value === true}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-auto_assign_warehouse_location"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Auto-assign Warehouse Location</FormLabel>
                          <FormDescription>
                            Automatically assign locations to new products
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="enable_bin_management"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value === true}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-enable_bin_management"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Enable Bin Management</FormLabel>
                          <FormDescription>
                            Track inventory at bin level
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="enable_zone_management"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value === true}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-enable_zone_management"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Enable Zone Management</FormLabel>
                          <FormDescription>
                            Organize warehouse into zones
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="temperature_control_zones"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value === true}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-temperature_control_zones"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Temperature Control Zones</FormLabel>
                          <FormDescription>
                            Enable temperature-controlled storage zones
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4: Quality */}
          <TabsContent value="quality" className="space-y-4">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                  Product Quality
                </CardTitle>
                <CardDescription className="text-sm">Quality control and inspection settings</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="qc_sampling_rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>QC Sampling Rate (%)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value ?? ''}
                            type="number" 
                            min="0"
                            max="100"
                            placeholder="10" 
                            data-testid="input-qc_sampling_rate" 
                          />
                        </FormControl>
                        <FormDescription>Percentage of items to quality check</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="condition_tracking"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Condition Tracking</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-condition_tracking">
                              <SelectValue placeholder="Select condition" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="good">Good</SelectItem>
                            <SelectItem value="damaged">Damaged</SelectItem>
                            <SelectItem value="refurbished">Refurbished</SelectItem>
                            <SelectItem value="returned">Returned</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>Default condition for products</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="enable_quality_control"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value === true}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-enable_quality_control"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Enable Quality Control</FormLabel>
                          <FormDescription>
                            Enable QC processes for incoming inventory
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="damage_report_required"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value === true}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-damage_report_required"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Damage Report Required</FormLabel>
                          <FormDescription>
                            Require damage reports for damaged items
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="photo_evidence_required"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value === true}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-photo_evidence_required"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Photo Evidence Required</FormLabel>
                          <FormDescription>
                            Require photo evidence for damage reports
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 5: Units */}
          <TabsContent value="units" className="space-y-4">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Ruler className="h-4 w-4 sm:h-5 sm:w-5" />
                  Measurement Units
                </CardTitle>
                <CardDescription className="text-sm">Default measurement units and precision</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="default_length_unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Length Unit</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-default_length_unit">
                              <SelectValue placeholder="Select length unit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="cm">Centimeters (cm)</SelectItem>
                            <SelectItem value="mm">Millimeters (mm)</SelectItem>
                            <SelectItem value="m">Meters (m)</SelectItem>
                            <SelectItem value="in">Inches (in)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>Unit for measuring length</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="default_weight_unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Weight Unit</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-default_weight_unit">
                              <SelectValue placeholder="Select weight unit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="kg">Kilograms (kg)</SelectItem>
                            <SelectItem value="g">Grams (g)</SelectItem>
                            <SelectItem value="lb">Pounds (lb)</SelectItem>
                            <SelectItem value="oz">Ounces (oz)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>Unit for measuring weight</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="default_volume_unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Volume Unit</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-default_volume_unit">
                              <SelectValue placeholder="Select volume unit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="L">Liters (L)</SelectItem>
                            <SelectItem value="mL">Milliliters (mL)</SelectItem>
                            <SelectItem value="gal">Gallons (gal)</SelectItem>
                            <SelectItem value="oz">Fluid Ounces (oz)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>Unit for measuring volume</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="decimal_places_weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Decimal Places for Weight</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value ?? ''}
                            type="number" 
                            min="1"
                            max="4"
                            placeholder="2" 
                            data-testid="input-decimal_places_weight" 
                          />
                        </FormControl>
                        <FormDescription>Precision for weight (1-4 decimals)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="decimal_places_dimensions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Decimal Places for Dimensions</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value ?? ''}
                            type="number" 
                            min="1"
                            max="4"
                            placeholder="2" 
                            data-testid="input-decimal_places_dimensions" 
                          />
                        </FormControl>
                        <FormDescription>Precision for dimensions (1-4 decimals)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 6: Catalog */}
          <TabsContent value="catalog" className="space-y-4">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Image className="h-4 w-4 sm:h-5 sm:w-5" />
                  Catalog Settings
                </CardTitle>
                <CardDescription className="text-sm">Product catalog and image management settings</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="max_images_per_product"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Images per Product</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value ?? ''}
                            type="number" 
                            min="1"
                            max="20"
                            placeholder="10" 
                            data-testid="input-max_images_per_product" 
                          />
                        </FormControl>
                        <FormDescription>Maximum number of images allowed</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="image_quality"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Image Quality (%) - {field.value ?? 0}%</FormLabel>
                        <FormControl>
                          <Slider
                            min={0}
                            max={100}
                            step={5}
                            value={[field.value ?? 80]}
                            onValueChange={(vals) => field.onChange(vals[0])}
                            className="w-full"
                            data-testid="slider-image_quality"
                          />
                        </FormControl>
                        <FormDescription>Compression quality for images (higher = better quality)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="enable_product_variants"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value === true}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-enable_product_variants"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Enable Product Variants</FormLabel>
                          <FormDescription>
                            Allow products with multiple variants (size, color, etc.)
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="enable_bundles"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value === true}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-enable_bundles"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Enable Bundles</FormLabel>
                          <FormDescription>
                            Allow creation of product bundles and kits
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="enable_services"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value === true}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-enable_services"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Enable Services</FormLabel>
                          <FormDescription>
                            Allow service products (non-physical items)
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="auto_compress_images"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value === true}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-auto_compress_images"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Auto-compress Images</FormLabel>
                          <FormDescription>
                            Automatically compress uploaded images to save space
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button type="submit" disabled={saveMutation.isPending} className="w-full sm:w-auto" data-testid="button-save">
            {saveMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('settings:savingSettings')}
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {t('common:save')} {t('settings:settings')}
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
