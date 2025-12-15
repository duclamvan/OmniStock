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
import { queryClient } from "@/lib/queryClient";
import { useTranslation } from 'react-i18next';
import { Package, Loader2, ClipboardCheck, Warehouse, ShieldCheck, Ruler, Image, Check, RotateCcw, Plus, Trash2, Edit2, Save, X, AlertTriangle } from "lucide-react";
import { useSettings, DEFAULT_RETURN_TYPES, ReturnTypeConfig, DEFAULT_BULK_UNITS, BulkUnitConfig } from "@/contexts/SettingsContext";
import { useQuery } from "@tanstack/react-query";
import { useSettingsAutosave, SaveStatus } from "@/hooks/useSettingsAutosave";
import { apiRequest } from "@/lib/queryClient";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

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
  default_low_stock_percentage: z.preprocess(
    (val) => val === '' || val === null || val === undefined ? undefined : val,
    z.coerce.number().min(0).max(100).optional()
  ),
  default_low_stock_amount: z.preprocess(
    (val) => val === '' || val === null || val === undefined ? undefined : val,
    z.coerce.number().min(0).optional()
  ),
});

type FormValues = z.infer<typeof formSchema>;

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
      default_low_stock_percentage: inventorySettings.defaultLowStockPercentage,
      default_low_stock_amount: inventorySettings.defaultLowStockAmount,
    },
  });

  const {
    handleSelectChange,
    handleCheckboxChange,
    handleTextBlur,
    markPendingChange,
    saveField,
    saveStatus,
    lastSavedAt,
    hasPendingChanges,
    saveAllPending,
  } = useSettingsAutosave({
    category: 'inventory',
    originalValues: originalSettings,
    getCurrentValue: (fieldName) => form.getValues(fieldName as keyof FormValues),
  });

  // Return types management state
  const [returnTypes, setReturnTypes] = useState<ReturnTypeConfig[]>(
    inventorySettings.returnTypes || DEFAULT_RETURN_TYPES
  );
  const [newReturnType, setNewReturnType] = useState('');
  const [newReturnTypeLabelKey, setNewReturnTypeLabelKey] = useState('');
  const [editingReturnType, setEditingReturnType] = useState<string | null>(null);
  const [editReturnTypeValue, setEditReturnTypeValue] = useState('');
  const [editReturnTypeLabelKey, setEditReturnTypeLabelKey] = useState('');
  const [returnTypesSaving, setReturnTypesSaving] = useState(false);

  // Bulk units management state
  const [bulkUnits, setBulkUnits] = useState<BulkUnitConfig[]>(
    inventorySettings.bulkUnits || DEFAULT_BULK_UNITS
  );
  const [newBulkUnit, setNewBulkUnit] = useState('');
  const [newBulkUnitLabelKey, setNewBulkUnitLabelKey] = useState('');
  const [bulkUnitsSaving, setBulkUnitsSaving] = useState(false);

  // Sync local returnTypes with context when inventorySettings changes
  useEffect(() => {
    if (inventorySettings.returnTypes) {
      setReturnTypes(inventorySettings.returnTypes);
    }
  }, [inventorySettings.returnTypes]);

  // Sync local bulkUnits with context when inventorySettings changes
  useEffect(() => {
    if (inventorySettings.bulkUnits) {
      setBulkUnits(inventorySettings.bulkUnits);
    }
  }, [inventorySettings.bulkUnits]);

  // Return type handlers
  const handleToggleReturnType = (value: string, enabled: boolean) => {
    setReturnTypes(
      returnTypes.map(rt => rt.value === value ? { ...rt, enabled } : rt)
    );
  };

  const handleToggleDisposesInventory = (value: string, disposesInventory: boolean) => {
    setReturnTypes(
      returnTypes.map(rt => rt.value === value ? { ...rt, disposesInventory } : rt)
    );
  };

  const handleAddReturnType = () => {
    if (!newReturnType.trim()) {
      toast({
        variant: "destructive",
        title: t('common:error'),
        description: t('settings:returnTypeValueRequired'),
      });
      return;
    }
    
    const valueSnakeCase = newReturnType.trim().toLowerCase().replace(/\s+/g, '_');
    
    if (returnTypes.find(rt => rt.value === valueSnakeCase)) {
      toast({
        variant: "destructive",
        title: t('common:error'),
        description: t('settings:returnTypeAlreadyExists'),
      });
      return;
    }
    
    const labelKey = newReturnTypeLabelKey.trim() || newReturnType.trim().replace(/\s+/g, '') + 'Type';
    
    setReturnTypes([...returnTypes, { 
      value: valueSnakeCase, 
      labelKey,
      enabled: true 
    }]);
    setNewReturnType('');
    setNewReturnTypeLabelKey('');
  };

  const handleDeleteReturnType = (value: string) => {
    setReturnTypes(returnTypes.filter(rt => rt.value !== value));
  };

  const handleSaveReturnTypes = async () => {
    setReturnTypesSaving(true);
    try {
      try {
        await apiRequest('PATCH', '/api/settings/return_types', {
          value: returnTypes,
          category: 'inventory'
        });
      } catch (patchError: any) {
        if (patchError.status === 404 || patchError.message?.includes('not found')) {
          await apiRequest('POST', '/api/settings', {
            key: 'return_types',
            value: returnTypes,
            category: 'inventory',
            description: 'Return types configuration for returns management'
          });
        } else {
          throw patchError;
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      
      toast({
        title: t('common:success'),
        description: t('settings:returnTypesSaved'),
      });
    } catch (error) {
      console.error('Error saving return types:', error);
      toast({
        variant: "destructive",
        title: t('common:error'),
        description: t('settings:returnTypesSaveError'),
      });
    } finally {
      setReturnTypesSaving(false);
    }
  };

  const handleResetReturnTypes = () => {
    setReturnTypes(DEFAULT_RETURN_TYPES);
  };

  // Bulk unit handlers
  const handleToggleBulkUnit = (value: string, enabled: boolean) => {
    setBulkUnits(
      bulkUnits.map(bu => bu.value === value ? { ...bu, enabled } : bu)
    );
  };

  const handleAddBulkUnit = () => {
    if (!newBulkUnit.trim()) {
      toast({
        variant: "destructive",
        title: t('common:error'),
        description: t('settings:bulkUnitValueRequired', 'Please enter a bulk unit name'),
      });
      return;
    }
    
    const valueSnakeCase = newBulkUnit.trim().toLowerCase().replace(/\s+/g, '_');
    
    if (bulkUnits.find(bu => bu.value === valueSnakeCase)) {
      toast({
        variant: "destructive",
        title: t('common:error'),
        description: t('settings:bulkUnitAlreadyExists', 'This bulk unit already exists'),
      });
      return;
    }
    
    const labelKey = newBulkUnitLabelKey.trim() || 'unit' + newBulkUnit.trim().replace(/\s+/g, '').charAt(0).toUpperCase() + newBulkUnit.trim().replace(/\s+/g, '').slice(1);
    
    setBulkUnits([...bulkUnits, { 
      value: valueSnakeCase, 
      labelKey,
      enabled: true 
    }]);
    setNewBulkUnit('');
    setNewBulkUnitLabelKey('');
  };

  const handleDeleteBulkUnit = (value: string) => {
    setBulkUnits(bulkUnits.filter(bu => bu.value !== value));
  };

  const handleSaveBulkUnits = async () => {
    setBulkUnitsSaving(true);
    try {
      try {
        await apiRequest('PATCH', '/api/settings/bulk_units', {
          value: bulkUnits,
          category: 'inventory'
        });
      } catch (patchError: any) {
        if (patchError.status === 404 || patchError.message?.includes('not found')) {
          await apiRequest('POST', '/api/settings', {
            key: 'bulk_units',
            value: bulkUnits,
            category: 'inventory',
            description: 'Bulk unit types configuration for product packaging'
          });
        } else {
          throw patchError;
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      
      toast({
        title: t('common:success'),
        description: t('settings:bulkUnitsSaved', 'Bulk units saved successfully'),
      });
    } catch (error) {
      console.error('Error saving bulk units:', error);
      toast({
        variant: "destructive",
        title: t('common:error'),
        description: t('settings:bulkUnitsSaveError', 'Failed to save bulk units'),
      });
    } finally {
      setBulkUnitsSaving(false);
    }
  };

  const handleResetBulkUnits = () => {
    setBulkUnits(DEFAULT_BULK_UNITS);
  };

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
        default_low_stock_percentage: inventorySettings.defaultLowStockPercentage,
        default_low_stock_amount: inventorySettings.defaultLowStockAmount,
      };
      setOriginalSettings(snapshot);
      form.reset(snapshot);
    }
  }, [isLoading, form, inventorySettings]);

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
      <div className="space-y-4 sm:space-y-6">
        <Tabs defaultValue="products" className="w-full">
          <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-4 lg:grid-cols-7 gap-1 p-1">
              <TabsTrigger value="products" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm whitespace-nowrap">
                <Package className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">{t('settings:products')}</span>
              </TabsTrigger>
              <TabsTrigger value="stock" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm whitespace-nowrap">
                <ClipboardCheck className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">{t('settings:stock')}</span>
              </TabsTrigger>
              <TabsTrigger value="warehouse" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm whitespace-nowrap">
                <Warehouse className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">{t('settings:warehouse')}</span>
              </TabsTrigger>
              <TabsTrigger value="quality" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm whitespace-nowrap">
                <ShieldCheck className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">{t('settings:quality')}</span>
              </TabsTrigger>
              <TabsTrigger value="units" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm whitespace-nowrap">
                <Ruler className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">{t('settings:units')}</span>
              </TabsTrigger>
              <TabsTrigger value="catalog" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm whitespace-nowrap">
                <Image className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">{t('settings:catalog')}</span>
              </TabsTrigger>
              <TabsTrigger value="returns" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm whitespace-nowrap">
                <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">{t('settings:returns')}</span>
              </TabsTrigger>
            </TabsList>
          </div>

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
                    name="default_product_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:defaultProductType')}</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleSelectChange('default_product_type')(value);
                          }} 
                          value={field.value || ''}
                        >
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
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleSelectChange('default_packaging_requirement')(value);
                          }} 
                          value={field.value || ''}
                        >
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
                            onChange={(e) => {
                              field.onChange(e);
                              markPendingChange('sku_prefix');
                            }}
                            onBlur={handleTextBlur('sku_prefix')}
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
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleCheckboxChange('enable_barcode_scanning')(checked as boolean);
                            }}
                            data-testid="checkbox-enable_barcode_scanning"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t('settings:enableBarcodeScanningLabel')}</FormLabel>
                          <FormDescription>
                            {t('settings:enableBarcodeScanningDescription')}
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
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleCheckboxChange('auto_generate_sku')(checked as boolean);
                            }}
                            data-testid="checkbox-auto_generate_sku"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t('settings:autoGenerateSkuLabel')}</FormLabel>
                          <FormDescription>
                            {t('settings:autoGenerateSkuDescription')}
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
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleCheckboxChange('track_serial_numbers')(checked as boolean);
                            }}
                            data-testid="checkbox-track_serial_numbers"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t('settings:trackSerialNumbersLabel')}</FormLabel>
                          <FormDescription>
                            {t('settings:trackSerialNumbersDescription')}
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
                            onChange={(e) => {
                              field.onChange(e);
                              markPendingChange('low_stock_threshold');
                            }}
                            onBlur={handleTextBlur('low_stock_threshold')}
                          />
                        </FormControl>
                        <FormDescription>{t('settings:lowStockThresholdDescription')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="default_low_stock_percentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:defaultLowStockPercentage', 'Default Low Stock Percentage')}</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value ?? ''}
                            type="number" 
                            min="0"
                            max="100"
                            placeholder={t('settings:defaultLowStockPercentagePlaceholder', 'e.g. 45')} 
                            data-testid="input-default_low_stock_percentage"
                            onChange={(e) => {
                              field.onChange(e);
                              markPendingChange('default_low_stock_percentage');
                            }}
                            onBlur={handleTextBlur('default_low_stock_percentage')}
                          />
                        </FormControl>
                        <FormDescription>{t('settings:defaultLowStockPercentageDescription', 'Alert when stock falls below this percentage of usual levels')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="default_low_stock_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:defaultLowStockAmount', 'Default Low Stock Amount')}</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value ?? ''}
                            type="number" 
                            min="0"
                            placeholder={t('settings:defaultLowStockAmountPlaceholder', 'e.g. 50')} 
                            data-testid="input-default_low_stock_amount"
                            onChange={(e) => {
                              field.onChange(e);
                              markPendingChange('default_low_stock_amount');
                            }}
                            onBlur={handleTextBlur('default_low_stock_amount')}
                          />
                        </FormControl>
                        <FormDescription>{t('settings:defaultLowStockAmountDescription', 'Fixed amount threshold for low stock alerts')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                            onChange={(e) => {
                              field.onChange(e);
                              markPendingChange('auto_reorder_point');
                            }}
                            onBlur={handleTextBlur('auto_reorder_point')}
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
                            onChange={(e) => {
                              field.onChange(e);
                              markPendingChange('safety_stock_level');
                            }}
                            onBlur={handleTextBlur('safety_stock_level')}
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
                            onChange={(e) => {
                              field.onChange(e);
                              markPendingChange('stock_count_frequency_days');
                            }}
                            onBlur={handleTextBlur('stock_count_frequency_days')}
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
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleCheckboxChange('stock_adjustment_approval_required')(checked as boolean);
                            }}
                            data-testid="checkbox-stock_adjustment_approval_required"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t('settings:stockAdjustmentApprovalRequiredLabel')}</FormLabel>
                          <FormDescription>
                            {t('settings:stockAdjustmentApprovalRequiredDescriptionAlt')}
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
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleCheckboxChange('allow_negative_stock')(checked as boolean);
                            }}
                            data-testid="checkbox-allow_negative_stock"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t('settings:allowNegativeStockLabel')}</FormLabel>
                          <FormDescription>
                            {t('settings:allowNegativeStockDescriptionAlt')}
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
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleCheckboxChange('enable_batch_lot_tracking')(checked as boolean);
                            }}
                            data-testid="checkbox-enable_batch_lot_tracking"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t('settings:enableBatchLotTrackingLabel')}</FormLabel>
                          <FormDescription>
                            {t('settings:enableBatchLotTrackingDescriptionAlt')}
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
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleCheckboxChange('enable_expiration_date_tracking')(checked as boolean);
                            }}
                            data-testid="checkbox-enable_expiration_date_tracking"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t('settings:enableExpirationDateTrackingLabel')}</FormLabel>
                          <FormDescription>
                            {t('settings:enableExpirationDateTrackingDescriptionAlt')}
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
                  {t('settings:warehouseOperationsCard')}
                </CardTitle>
                <CardDescription className="text-sm">{t('settings:warehouseOperationsCardDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="default_warehouse"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:defaultWarehouseLabel')}</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleSelectChange('default_warehouse')(value);
                          }} 
                          value={field.value || ''}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-default_warehouse">
                              <SelectValue placeholder={t('common:selectDefaultWarehouse')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">{t('common:none')}</SelectItem>
                            {warehouses.map((warehouse: any) => (
                              <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                                {warehouse.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>{t('settings:defaultWarehouseDescriptionAlt')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="location_format"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:locationFormatLabel')}</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleSelectChange('location_format')(value);
                          }} 
                          value={field.value || ''}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-location_format">
                              <SelectValue placeholder={t('common:selectLocationFormat')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="A-01-01">A-01-01</SelectItem>
                            <SelectItem value="A01-R01-S01">A01-R01-S01</SelectItem>
                            <SelectItem value="Zone-Rack-Bin">Zone-Rack-Bin</SelectItem>
                            <SelectItem value="Custom">{t('settings:locationFormatCustom')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>{t('settings:locationFormatDescriptionAlt')}</FormDescription>
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
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleCheckboxChange('enable_multi_warehouse')(checked as boolean);
                            }}
                            data-testid="checkbox-enable_multi_warehouse"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t('settings:enableMultiWarehouseLabel')}</FormLabel>
                          <FormDescription>
                            {t('settings:enableMultiWarehouseDescription')}
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
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleCheckboxChange('auto_assign_warehouse_location')(checked as boolean);
                            }}
                            data-testid="checkbox-auto_assign_warehouse_location"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t('settings:autoAssignWarehouseLocationLabel')}</FormLabel>
                          <FormDescription>
                            {t('settings:autoAssignWarehouseLocationDescriptionAlt')}
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
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleCheckboxChange('enable_bin_management')(checked as boolean);
                            }}
                            data-testid="checkbox-enable_bin_management"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t('settings:enableBinManagementLabel')}</FormLabel>
                          <FormDescription>
                            {t('settings:enableBinManagementDescriptionAlt')}
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
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleCheckboxChange('enable_zone_management')(checked as boolean);
                            }}
                            data-testid="checkbox-enable_zone_management"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t('settings:enableZoneManagementLabel')}</FormLabel>
                          <FormDescription>
                            {t('settings:enableZoneManagementDescriptionAlt')}
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
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleCheckboxChange('temperature_control_zones')(checked as boolean);
                            }}
                            data-testid="checkbox-temperature_control_zones"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t('settings:temperatureControlZonesLabel')}</FormLabel>
                          <FormDescription>
                            {t('settings:temperatureControlZonesDescriptionAlt')}
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
                  {t('settings:productQualityCard')}
                </CardTitle>
                <CardDescription className="text-sm">{t('settings:productQualityCardDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="qc_sampling_rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:qcSamplingRateLabel')}</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value ?? ''}
                            type="number" 
                            min="0"
                            max="100"
                            placeholder="10" 
                            data-testid="input-qc_sampling_rate"
                            onChange={(e) => {
                              field.onChange(e);
                              markPendingChange('qc_sampling_rate');
                            }}
                            onBlur={handleTextBlur('qc_sampling_rate')}
                          />
                        </FormControl>
                        <FormDescription>{t('settings:qcSamplingRateDescriptionAlt')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="condition_tracking"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:defaultConditionTrackingLabel')}</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleSelectChange('condition_tracking')(value);
                          }} 
                          value={field.value || ''}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-condition_tracking">
                              <SelectValue placeholder={t('common:selectCondition')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="good">{t('settings:conditionGood')}</SelectItem>
                            <SelectItem value="damaged">{t('settings:conditionDamaged')}</SelectItem>
                            <SelectItem value="refurbished">{t('settings:conditionRefurbished')}</SelectItem>
                            <SelectItem value="returned">{t('settings:conditionReturned')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>{t('settings:defaultConditionTrackingDescription')}</FormDescription>
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
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleCheckboxChange('enable_quality_control')(checked as boolean);
                            }}
                            data-testid="checkbox-enable_quality_control"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t('settings:enableQualityControlLabel')}</FormLabel>
                          <FormDescription>
                            {t('settings:enableQualityControlDescription')}
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
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleCheckboxChange('damage_report_required')(checked as boolean);
                            }}
                            data-testid="checkbox-damage_report_required"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t('settings:damageReportRequiredLabel')}</FormLabel>
                          <FormDescription>
                            {t('settings:damageReportRequiredDescriptionAlt')}
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
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleCheckboxChange('photo_evidence_required')(checked as boolean);
                            }}
                            data-testid="checkbox-photo_evidence_required"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t('settings:photoEvidenceRequiredLabel')}</FormLabel>
                          <FormDescription>
                            {t('settings:photoEvidenceRequiredDescriptionAlt')}
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
                  {t('settings:measurementUnitsCard')}
                </CardTitle>
                <CardDescription className="text-sm">{t('settings:measurementUnitsCardDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="default_length_unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:defaultLengthUnitLabel')}</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleSelectChange('default_length_unit')(value);
                          }} 
                          value={field.value || ''}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-default_length_unit">
                              <SelectValue placeholder={t('common:selectLengthUnit')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="cm">Centimeters (cm)</SelectItem>
                            <SelectItem value="mm">Millimeters (mm)</SelectItem>
                            <SelectItem value="m">Meters (m)</SelectItem>
                            <SelectItem value="in">Inches (in)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>{t('settings:defaultLengthUnitDescription')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="default_weight_unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:defaultWeightUnitLabel')}</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleSelectChange('default_weight_unit')(value);
                          }} 
                          value={field.value || ''}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-default_weight_unit">
                              <SelectValue placeholder={t('common:selectWeightUnit')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="kg">Kilograms (kg)</SelectItem>
                            <SelectItem value="g">Grams (g)</SelectItem>
                            <SelectItem value="lb">Pounds (lb)</SelectItem>
                            <SelectItem value="oz">Ounces (oz)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>{t('settings:defaultWeightUnitDescription')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="default_volume_unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:defaultVolumeUnitLabel')}</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleSelectChange('default_volume_unit')(value);
                          }} 
                          value={field.value || ''}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-default_volume_unit">
                              <SelectValue placeholder={t('common:selectVolumeUnit')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="L">Liters (L)</SelectItem>
                            <SelectItem value="mL">Milliliters (mL)</SelectItem>
                            <SelectItem value="gal">Gallons (gal)</SelectItem>
                            <SelectItem value="oz">Fluid Ounces (oz)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>{t('settings:defaultVolumeUnitDescription')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="decimal_places_weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:decimalPlacesWeightLabel')}</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value ?? ''}
                            type="number" 
                            min="1"
                            max="4"
                            placeholder="2" 
                            data-testid="input-decimal_places_weight"
                            onChange={(e) => {
                              field.onChange(e);
                              markPendingChange('decimal_places_weight');
                            }}
                            onBlur={handleTextBlur('decimal_places_weight')}
                          />
                        </FormControl>
                        <FormDescription>{t('settings:decimalPlacesWeightDescription')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="decimal_places_dimensions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:decimalPlacesDimensionsLabel')}</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value ?? ''}
                            type="number" 
                            min="1"
                            max="4"
                            placeholder="2" 
                            data-testid="input-decimal_places_dimensions"
                            onChange={(e) => {
                              field.onChange(e);
                              markPendingChange('decimal_places_dimensions');
                            }}
                            onBlur={handleTextBlur('decimal_places_dimensions')}
                          />
                        </FormControl>
                        <FormDescription>{t('settings:decimalPlacesDimensionsDescription')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Bulk Units Configuration Card */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                  {t('settings:bulkUnitsCard', 'Bulk Units')}
                </CardTitle>
                <CardDescription className="text-sm">
                  {t('settings:bulkUnitsCardDescription', 'Configure available bulk unit options for product packaging (carton, case, pallet, etc.)')}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-4">
                {/* Existing Bulk Units List */}
                <div className="space-y-2">
                  {bulkUnits.map((bu) => (
                    <div 
                      key={bu.value} 
                      className="flex items-center justify-between p-3 border rounded-lg bg-slate-50 dark:bg-slate-800"
                      data-testid={`bulk-unit-item-${bu.value}`}
                    >
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={bu.enabled}
                          onCheckedChange={(checked) => handleToggleBulkUnit(bu.value, checked)}
                          data-testid={`switch-bulk-unit-${bu.value}`}
                        />
                        <div>
                          <p className="font-medium text-sm">{t(`products:units.${bu.labelKey}`, bu.value.replace(/_/g, ' '))}</p>
                          <p className="text-xs text-slate-500">{bu.value}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteBulkUnit(bu.value)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        data-testid={`delete-bulk-unit-${bu.value}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Add New Bulk Unit */}
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-2">{t('settings:addNewBulkUnit', 'Add New Bulk Unit')}</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder={t('settings:bulkUnitNamePlaceholder', 'e.g., box, pack, set')}
                      value={newBulkUnit}
                      onChange={(e) => setNewBulkUnit(e.target.value)}
                      className="flex-1"
                      data-testid="input-new-bulk-unit"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddBulkUnit}
                      data-testid="btn-add-bulk-unit"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {t('common:add')}
                    </Button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleResetBulkUnits}
                    data-testid="btn-reset-bulk-units"
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    {t('common:resetToDefaults', 'Reset to Defaults')}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveBulkUnits}
                    disabled={bulkUnitsSaving}
                    data-testid="btn-save-bulk-units"
                  >
                    {bulkUnitsSaving ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-1" />
                    )}
                    {t('common:save')}
                  </Button>
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
                  {t('settings:catalogSettingsCard')}
                </CardTitle>
                <CardDescription className="text-sm">{t('settings:catalogSettingsCardDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="max_images_per_product"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:maxImagesPerProductLabel')}</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value ?? ''}
                            type="number" 
                            min="1"
                            max="20"
                            placeholder="10" 
                            data-testid="input-max_images_per_product"
                            onChange={(e) => {
                              field.onChange(e);
                              markPendingChange('max_images_per_product');
                            }}
                            onBlur={handleTextBlur('max_images_per_product')}
                          />
                        </FormControl>
                        <FormDescription>{t('settings:maxImagesPerProductDescriptionAlt')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="image_quality"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:imageQualityLabel')} - {field.value ?? 0}%</FormLabel>
                        <FormControl>
                          <Slider
                            min={0}
                            max={100}
                            step={5}
                            value={[field.value ?? 80]}
                            onValueChange={(vals) => {
                              field.onChange(vals[0]);
                              saveField('image_quality', vals[0]);
                            }}
                            className="w-full"
                            data-testid="slider-image_quality"
                          />
                        </FormControl>
                        <FormDescription>{t('settings:imageQualityDescriptionAlt')}</FormDescription>
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
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleCheckboxChange('enable_product_variants')(checked as boolean);
                            }}
                            data-testid="checkbox-enable_product_variants"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t('settings:enableProductVariantsLabel')}</FormLabel>
                          <FormDescription>
                            {t('settings:enableProductVariantsDescriptionAlt')}
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
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleCheckboxChange('enable_bundles')(checked as boolean);
                            }}
                            data-testid="checkbox-enable_bundles"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t('settings:enableBundlesLabel')}</FormLabel>
                          <FormDescription>
                            {t('settings:enableBundlesDescriptionAlt')}
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
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleCheckboxChange('enable_services')(checked as boolean);
                            }}
                            data-testid="checkbox-enable_services"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t('settings:enableServicesLabel')}</FormLabel>
                          <FormDescription>
                            {t('settings:enableServicesDescriptionAlt')}
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
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleCheckboxChange('auto_compress_images')(checked as boolean);
                            }}
                            data-testid="checkbox-auto_compress_images"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t('settings:autoCompressImagesLabel')}</FormLabel>
                          <FormDescription>
                            {t('settings:autoCompressImagesDescriptionAlt')}
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 7: Returns */}
          <TabsContent value="returns" className="space-y-4">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <RotateCcw className="h-4 w-4 sm:h-5 sm:w-5" />
                  {t('settings:returnTypesTitle')}
                </CardTitle>
                <CardDescription className="text-sm">
                  {t('settings:returnTypesDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-4">
                {/* Add new return type */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    placeholder={t('settings:newReturnTypePlaceholder')}
                    value={newReturnType}
                    onChange={(e) => setNewReturnType(e.target.value)}
                    className="flex-1"
                    data-testid="input-new-return-type"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddReturnType();
                      }
                    }}
                  />
                  <Button 
                    type="button"
                    onClick={handleAddReturnType}
                    variant="secondary"
                    className="min-h-[56px] sm:min-h-0"
                    data-testid="button-add-return-type"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('common:add')}
                  </Button>
                </div>

                {/* List of return types */}
                <div className="space-y-2">
                  {returnTypes.map((returnType) => (
                    <div 
                      key={returnType.value}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 gap-3"
                      data-testid={`return-type-item-${returnType.value}`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Switch
                          checked={returnType.enabled}
                          onCheckedChange={(checked) => handleToggleReturnType(returnType.value, checked)}
                          data-testid={`switch-return-type-${returnType.value}`}
                        />
                        <div className="flex-1">
                          <div className="font-medium">
                            {t(`inventory:${returnType.labelKey}`, returnType.value.replace(/_/g, ' '))}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {returnType.value}
                          </div>
                        </div>
                        {returnType.disposesInventory && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {t('settings:disposesInventory')}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={returnType.disposesInventory || false}
                            onCheckedChange={(checked) => handleToggleDisposesInventory(returnType.value, checked as boolean)}
                            data-testid={`checkbox-disposes-${returnType.value}`}
                          />
                          <span className="text-muted-foreground">{t('settings:markAsDisposed')}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteReturnType(returnType.value)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 min-h-[44px] min-w-[44px]"
                          data-testid={`button-delete-return-type-${returnType.value}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleResetReturnTypes}
                    className="flex-1 min-h-[56px] sm:min-h-0"
                    data-testid="button-reset-return-types"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    {t('settings:resetToDefaults')}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveReturnTypes}
                    disabled={returnTypesSaving}
                    className="flex-1 min-h-[56px] sm:min-h-0"
                    data-testid="button-save-return-types"
                  >
                    {returnTypesSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t('settings:savingSettings')}
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {t('settings:saveReturnTypes')}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Sticky action bar with save status */}
        <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t py-3 -mx-4 px-4 sm:-mx-6 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {saveStatus === 'saving' && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{t('settings:savingSettings')}</span>
                </>
              )}
              {saveStatus === 'saved' && (
                <>
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-green-500">{t('settings:settingsSaved')}</span>
                </>
              )}
              {saveStatus === 'error' && (
                <span className="text-destructive">{t('settings:settingsSaveError')}</span>
              )}
              {saveStatus === 'idle' && hasPendingChanges && (
                <span>{t('common:unsavedChanges')}</span>
              )}
            </div>
            {hasPendingChanges && (
              <Button 
                type="button" 
                onClick={() => saveAllPending()}
                disabled={saveStatus === 'saving'}
                className="w-full sm:w-auto min-h-[44px]"
                data-testid="button-save-pending"
              >
                {saveStatus === 'saving' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('settings:savingSettings')}
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    {t('common:saveChanges')}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Form>
  );
}
