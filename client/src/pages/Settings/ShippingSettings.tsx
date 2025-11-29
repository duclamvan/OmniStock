import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Truck, Save, Loader2, Package, Tag, Bell, DollarSign, Globe } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { camelToSnake, deepCamelToSnake } from "@/utils/caseConverters";

// Helper function to normalize carrier names for backward compatibility
const normalizeCarrier = (value: string): string => {
  const map: Record<string, string> = {
    'PPL': 'PPL CZ',
    'GLS': 'GLS DE',
    'DHL': 'DHL DE',
    'PPL CZ': 'PPL CZ',
    'GLS DE': 'GLS DE',
    'DHL DE': 'DHL DE',
  };
  return map[value] || value;
};

const formSchema = z.object({
  // PPL CZ Settings
  ppl_default_sender_address: z.string().default(''),
  ppl_enable_auto_label: z.boolean().default(false),
  ppl_max_package_weight_kg: z.coerce.number().min(0).default(50),
  ppl_max_package_dimensions_cm: z.string().default('200x80x60'),
  
  // Country Carrier Mapping (JSON string for country code -> carrier)
  country_carrier_mapping: z.string().default('{"CZ":"PPL CZ","DE":"GLS DE","AT":"DHL DE"}'),
  
  // GLS DE Settings
  gls_default_sender_address: z.string().default(''),
  gls_enable_manual_labels: z.boolean().default(false),
  gls_max_package_weight_kg: z.coerce.number().min(0).default(40),
  gls_max_girth_cm: z.coerce.number().min(0).default(300),
  
  // DHL DE Settings
  dhl_default_sender_address: z.string().default(''),
  dhl_enable_auto_label: z.boolean().default(false),
  dhl_max_package_weight_kg: z.coerce.number().min(0).default(31.5),
  dhl_max_package_dimensions_cm: z.string().default('120x60x60'),
  
  // General Settings
  quick_select_czk: z.string().default('0,100,150,250'),
  quick_select_eur: z.string().default('0,5,10,13,15,20'),
  default_shipping_method: z.enum(['PPL', 'PPL CZ', 'GLS', 'GLS DE', 'DHL', 'DHL DE']).transform(normalizeCarrier).default('PPL CZ'),
  available_carriers: z.string().default('GLS DE,PPL CZ,DHL DE'),
  default_carrier: z.string().default('PPL CZ'),
  
  // Shipping Costs
  free_shipping_threshold: z.coerce.number().min(0).default(0),
  default_shipping_cost: z.coerce.number().min(0).default(0),
  shipping_cost_currency: z.enum(['CZK', 'EUR', 'USD']).default('CZK'),
  volumetric_weight_divisor: z.coerce.number().min(1).default(5000),
  
  // Label Generation
  default_label_size: z.enum(['A4', 'A5', '4x6', '10x15cm']).default('A4'),
  label_format: z.enum(['PDF', 'PNG', 'ZPL']).default('PDF'),
  auto_print_labels: z.boolean().default(false),
  include_packing_slip: z.boolean().default(true),
  include_invoice: z.boolean().default(false),
  
  // Tracking & Notifications
  enable_tracking: z.boolean().default(true),
  auto_update_tracking_status: z.boolean().default(true),
  tracking_update_frequency_hours: z.coerce.number().min(1).max(24).default(6),
  send_tracking_email_to_customer: z.boolean().default(true),
  include_estimated_delivery: z.boolean().default(true),
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

export default function ShippingSettings() {
  const { t } = useTranslation(['settings', 'common']);
  const { toast } = useToast();
  const { shippingSettings, isLoading } = useSettings();
  const [originalSettings, setOriginalSettings] = useState<Partial<FormValues>>({});

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ppl_default_sender_address: '',
      ppl_enable_auto_label: false,
      ppl_max_package_weight_kg: 50,
      ppl_max_package_dimensions_cm: '200x80x60',
      country_carrier_mapping: '{"CZ":"PPL CZ","DE":"GLS DE","AT":"DHL DE"}',
      gls_default_sender_address: '',
      gls_enable_manual_labels: false,
      gls_max_package_weight_kg: 40,
      gls_max_girth_cm: 300,
      dhl_default_sender_address: '',
      dhl_enable_auto_label: false,
      dhl_max_package_weight_kg: 31.5,
      dhl_max_package_dimensions_cm: '120x60x60',
      quick_select_czk: '0,100,150,250',
      quick_select_eur: '0,5,10,13,15,20',
      default_shipping_method: 'PPL CZ',
      available_carriers: 'GLS DE,PPL CZ,DHL DE',
      default_carrier: 'PPL CZ',
      free_shipping_threshold: 0,
      default_shipping_cost: 0,
      shipping_cost_currency: 'CZK',
      volumetric_weight_divisor: 5000,
      default_label_size: 'A4',
      label_format: 'PDF',
      auto_print_labels: false,
      include_packing_slip: true,
      include_invoice: false,
      enable_tracking: true,
      auto_update_tracking_status: true,
      tracking_update_frequency_hours: 6,
      send_tracking_email_to_customer: true,
      include_estimated_delivery: true,
    },
  });

  // Helper function to convert object/string to JSON string for textarea
  const toJsonString = (value: any): string => {
    if (!value) return '';
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return value;
  };

  // Reset form when settings load
  useEffect(() => {
    if (!isLoading) {
      const snapshot = {
        ppl_default_sender_address: toJsonString(shippingSettings.pplDefaultSenderAddress),
        ppl_enable_auto_label: shippingSettings.pplEnableAutoLabel,
        ppl_max_package_weight_kg: shippingSettings.pplMaxPackageWeightKg ?? 50,
        ppl_max_package_dimensions_cm: shippingSettings.pplMaxPackageDimensionsCm ?? '200x80x60',
        country_carrier_mapping: toJsonString(shippingSettings.countryCarrierMapping || {"CZ":"PPL CZ","DE":"GLS DE","AT":"DHL DE"}),
        gls_default_sender_address: toJsonString(shippingSettings.glsDefaultSenderAddress),
        gls_enable_manual_labels: shippingSettings.glsEnableManualLabels,
        gls_max_package_weight_kg: shippingSettings.glsMaxPackageWeightKg ?? 40,
        gls_max_girth_cm: shippingSettings.glsMaxGirthCm ?? 300,
        dhl_default_sender_address: toJsonString(shippingSettings.dhlDefaultSenderAddress),
        dhl_enable_auto_label: shippingSettings.dhlEnableAutoLabel,
        dhl_max_package_weight_kg: shippingSettings.dhlMaxPackageWeightKg ?? 31.5,
        dhl_max_package_dimensions_cm: shippingSettings.dhlMaxPackageDimensionsCm ?? '120x60x60',
        quick_select_czk: shippingSettings.quickSelectCzk,
        quick_select_eur: shippingSettings.quickSelectEur,
        default_shipping_method: normalizeCarrier(shippingSettings.defaultShippingMethod || 'PPL CZ'),
        available_carriers: shippingSettings.availableCarriers,
        default_carrier: normalizeCarrier(shippingSettings.defaultCarrier || 'PPL CZ'),
        free_shipping_threshold: shippingSettings.freeShippingThreshold,
        default_shipping_cost: shippingSettings.defaultShippingCost,
        shipping_cost_currency: shippingSettings.shippingCostCurrency,
        volumetric_weight_divisor: shippingSettings.volumetricWeightDivisor,
        default_label_size: shippingSettings.defaultLabelSize,
        label_format: shippingSettings.labelFormat,
        auto_print_labels: shippingSettings.autoPrintLabels,
        include_packing_slip: shippingSettings.includePackingSlip,
        include_invoice: shippingSettings.includeInvoice,
        enable_tracking: shippingSettings.enableTracking,
        auto_update_tracking_status: shippingSettings.autoUpdateTrackingStatus,
        tracking_update_frequency_hours: shippingSettings.trackingUpdateFrequencyHours,
        send_tracking_email_to_customer: shippingSettings.sendTrackingEmailToCustomer,
        include_estimated_delivery: shippingSettings.includeEstimatedDelivery,
      };
      setOriginalSettings(snapshot);
      form.reset(snapshot);
    }
  }, [isLoading, shippingSettings, form]);

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
        let processedValue = (value === '' || value === undefined) ? null : value;
        
        // Parse JSON for address fields and country_carrier_mapping
        if ((key.includes('address') || key === 'country_carrier_mapping') && typeof processedValue === 'string' && processedValue.trim()) {
          try {
            processedValue = JSON.parse(processedValue);
          } catch (e) {
            throw new Error(`Invalid JSON format for ${key}`);
          }
        }
        
        return apiRequest('POST', `/api/settings`, { 
          key: camelToSnake(key), 
          value: deepCamelToSnake(processedValue), 
          category: 'shipping' 
        });
      });
      
      await Promise.all(savePromises);
    },
    onSuccess: async () => {
      // Invalidate and refetch settings to get true persisted state
      await queryClient.invalidateQueries({ queryKey: ['/api/settings', 'shipping'] });
      
      // The useEffect will automatically update originalSettings when new data loads
      toast({
        title: t('settings:settingsSaved'),
        description: t('settings:shippingSettingsSavedSuccess'),
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
        <Tabs defaultValue="ppl-cz" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="ppl-cz" className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              <span className="hidden sm:inline">PPL CZ</span>
              <span className="sm:hidden">PPL</span>
            </TabsTrigger>
            <TabsTrigger value="gls-de" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">GLS DE</span>
              <span className="sm:hidden">GLS</span>
            </TabsTrigger>
            <TabsTrigger value="dhl-de" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">DHL DE</span>
              <span className="sm:hidden">DHL</span>
            </TabsTrigger>
            <TabsTrigger value="general" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">{t('settings:general')}</span>
              <span className="sm:hidden">{t('settings:general').substring(0, 3)}</span>
            </TabsTrigger>
            <TabsTrigger value="rules" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              <span className="hidden sm:inline">{t('settings:rules')}</span>
              <span className="sm:hidden">{t('settings:rules')}</span>
            </TabsTrigger>
          </TabsList>

          {/* PPL CZ Tab */}
          <TabsContent value="ppl-cz" className="space-y-4">
            {/* Carrier Configuration */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Truck className="h-4 w-4 sm:h-5 sm:w-5" />
                  PPL CZ Carrier Configuration
                </CardTitle>
                <CardDescription className="text-sm">Configure PPL Czech Republic carrier settings</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <FormField
                  control={form.control}
                  name="ppl_enable_auto_label"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-ppl_enable_auto_label"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Enable Auto Label Generation</FormLabel>
                        <FormDescription>
                          Automatically generate PPL labels when order is marked ready to ship
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Sender Address */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  PPL CZ Sender Address
                </CardTitle>
                <CardDescription className="text-sm">Default sender address for PPL shipments (JSON format)</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <FormField
                  control={form.control}
                  name="ppl_default_sender_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sender Address (JSON)</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder={`{
  "name": "Company Name",
  "street": "Street Address",
  "city": "City",
  "zip": "12345",
  "country": "CZ",
  "phone": "+420123456789",
  "email": "sender@example.com"
}`}
                          className="font-mono text-sm min-h-[200px]"
                          data-testid="textarea-ppl_default_sender_address"
                        />
                      </FormControl>
                      <FormDescription>
                        Enter sender address in JSON format. Will be used as default for all PPL shipments.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* PPL CZ Package Limits */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                  PPL CZ Package Limits
                </CardTitle>
                <CardDescription className="text-sm">Maximum package weight and dimensions for PPL Czech Republic (max 50kg, 200×80×60cm)</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="ppl_max_package_weight_kg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maximum Weight (kg)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            max="50"
                            step="0.1"
                            placeholder="50"
                            data-testid="input-ppl_max_package_weight_kg"
                          />
                        </FormControl>
                        <FormDescription>PPL max: 50kg</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ppl_max_package_dimensions_cm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maximum Dimensions (cm)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="200x80x60" data-testid="input-ppl_max_package_dimensions_cm" />
                        </FormControl>
                        <FormDescription>L×W×H (PPL max: 200×80×60)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* GLS DE Tab */}
          <TabsContent value="gls-de" className="space-y-4">
            {/* Carrier Configuration */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                  GLS DE Carrier Configuration
                </CardTitle>
                <CardDescription className="text-sm">Configure GLS Germany carrier settings</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <FormField
                  control={form.control}
                  name="gls_enable_manual_labels"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-gls_enable_manual_labels"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Enable Manual Label Entry</FormLabel>
                        <FormDescription>
                          Allow manual entry of GLS tracking numbers instead of API generation
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Sender Address */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  GLS DE Sender Address
                </CardTitle>
                <CardDescription className="text-sm">Default sender address for GLS shipments (JSON format)</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <FormField
                  control={form.control}
                  name="gls_default_sender_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sender Address (JSON)</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder={`{
  "name": "Company Name",
  "street": "Straße",
  "city": "Stadt",
  "zip": "12345",
  "country": "DE",
  "phone": "+49123456789",
  "email": "sender@example.de"
}`}
                          className="font-mono text-sm min-h-[200px]"
                          data-testid="textarea-gls_default_sender_address"
                        />
                      </FormControl>
                      <FormDescription>
                        Enter sender address in JSON format. Will be used as default for all GLS shipments.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* GLS DE Package Limits */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                  GLS DE Package Limits
                </CardTitle>
                <CardDescription className="text-sm">Maximum package weight and girth constraint for GLS Germany</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="gls_max_package_weight_kg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maximum Weight (kg)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            max="40"
                            step="0.1"
                            placeholder="40"
                            data-testid="input-gls_max_package_weight_kg"
                          />
                        </FormControl>
                        <FormDescription>GLS max: 40kg</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="gls_max_girth_cm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maximum Girth + Longest Side (cm)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            max="300"
                            step="1"
                            placeholder="300"
                            data-testid="input-gls_max_girth_cm"
                          />
                        </FormControl>
                        <FormDescription>Girth (2×W + 2×H) + longest side (GLS max: 300cm)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* DHL DE Tab */}
          <TabsContent value="dhl-de" className="space-y-4">
            {/* Carrier Configuration */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Globe className="h-4 w-4 sm:h-5 sm:w-5" />
                  DHL DE Carrier Configuration
                </CardTitle>
                <CardDescription className="text-sm">Configure DHL Germany carrier settings</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <FormField
                  control={form.control}
                  name="dhl_enable_auto_label"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-dhl_enable_auto_label"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Enable Auto Label Generation</FormLabel>
                        <FormDescription>
                          Automatically generate DHL labels when order is marked ready to ship
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Sender Address */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  DHL DE Sender Address
                </CardTitle>
                <CardDescription className="text-sm">Default sender address for DHL shipments (JSON format)</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <FormField
                  control={form.control}
                  name="dhl_default_sender_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sender Address (JSON)</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder={`{
  "name": "Company Name",
  "street": "Straße",
  "city": "Stadt",
  "zip": "12345",
  "country": "DE",
  "phone": "+49123456789",
  "email": "sender@example.de"
}`}
                          className="font-mono text-sm min-h-[200px]"
                          data-testid="textarea-dhl_default_sender_address"
                        />
                      </FormControl>
                      <FormDescription>
                        Enter sender address in JSON format. Will be used as default for all DHL shipments.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* DHL DE Package Limits */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                  DHL DE Package Limits
                </CardTitle>
                <CardDescription className="text-sm">Maximum package weight and dimensions for DHL Germany (max 31.5kg, 120×60×60cm)</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="dhl_max_package_weight_kg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maximum Weight (kg)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            max="31.5"
                            step="0.1"
                            placeholder="31.5"
                            data-testid="input-dhl_max_package_weight_kg"
                          />
                        </FormControl>
                        <FormDescription>DHL max: 31.5kg</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dhl_max_package_dimensions_cm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maximum Dimensions (cm)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="120x60x60" data-testid="input-dhl_max_package_dimensions_cm" />
                        </FormControl>
                        <FormDescription>L×W×H (DHL max: 120×60×60)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-4">
            {/* Default Carrier for Country */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Globe className="h-4 w-4 sm:h-5 sm:w-5" />
                  Default Carrier for Country
                </CardTitle>
                <CardDescription className="text-sm">
                  Map countries to default carriers. When adding a new order, the carrier will be auto-selected based on the customer's country.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <FormField
                  control={form.control}
                  name="country_carrier_mapping"
                  render={({ field }) => {
                    const parsedMapping = (() => {
                      try {
                        return typeof field.value === 'string' ? JSON.parse(field.value || '{}') : (field.value || {});
                      } catch {
                        return {};
                      }
                    })();
                    
                    const updateMapping = (country: string, carrier: string) => {
                      const newMapping = { ...parsedMapping, [country]: carrier };
                      field.onChange(JSON.stringify(newMapping, null, 2));
                    };
                    
                    const removeMapping = (country: string) => {
                      const newMapping = { ...parsedMapping };
                      delete newMapping[country];
                      field.onChange(JSON.stringify(newMapping, null, 2));
                    };
                    
                    const countries = [
                      { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿' },
                      { code: 'DE', name: 'Germany', flag: '🇩🇪' },
                      { code: 'AT', name: 'Austria', flag: '🇦🇹' },
                      { code: 'SK', name: 'Slovakia', flag: '🇸🇰' },
                      { code: 'PL', name: 'Poland', flag: '🇵🇱' },
                      { code: 'HU', name: 'Hungary', flag: '🇭🇺' },
                      { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
                      { code: 'BE', name: 'Belgium', flag: '🇧🇪' },
                      { code: 'FR', name: 'France', flag: '🇫🇷' },
                      { code: 'IT', name: 'Italy', flag: '🇮🇹' },
                      { code: 'ES', name: 'Spain', flag: '🇪🇸' },
                      { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
                      { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
                      { code: 'CH', name: 'Switzerland', flag: '🇨🇭' },
                      { code: 'SI', name: 'Slovenia', flag: '🇸🇮' },
                      { code: 'HR', name: 'Croatia', flag: '🇭🇷' },
                      { code: 'RO', name: 'Romania', flag: '🇷🇴' },
                      { code: 'BG', name: 'Bulgaria', flag: '🇧🇬' },
                    ];
                    
                    const carriers = ['PPL CZ', 'GLS DE', 'DHL DE'];
                    const usedCountries = Object.keys(parsedMapping);
                    const availableCountries = countries.filter(c => !usedCountries.includes(c.code));
                    
                    return (
                      <FormItem>
                        <div className="space-y-3">
                          {Object.entries(parsedMapping).map(([countryCode, carrier]) => {
                            const country = countries.find(c => c.code === countryCode);
                            return (
                              <div key={countryCode} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                                <span className="text-xl">{country?.flag || '🌍'}</span>
                                <span className="font-medium min-w-[120px]">{country?.name || countryCode}</span>
                                <span className="text-muted-foreground">→</span>
                                <Select 
                                  value={carrier as string} 
                                  onValueChange={(value) => updateMapping(countryCode, value)}
                                >
                                  <SelectTrigger className="w-[140px]" data-testid={`select-country-carrier-${countryCode}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {carriers.map(c => (
                                      <SelectItem key={c} value={c}>{c}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="ml-auto text-destructive hover:text-destructive"
                                  onClick={() => removeMapping(countryCode)}
                                  data-testid={`button-remove-country-${countryCode}`}
                                >
                                  ×
                                </Button>
                              </div>
                            );
                          })}
                          
                          {availableCountries.length > 0 && (
                            <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed">
                              <Select
                                onValueChange={(countryCode) => updateMapping(countryCode, 'PPL CZ')}
                              >
                                <SelectTrigger className="w-full" data-testid="select-add-country">
                                  <SelectValue placeholder="+ Add country..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableCountries.map(c => (
                                    <SelectItem key={c.code} value={c.code}>
                                      {c.flag} {c.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                        <FormDescription className="mt-3">
                          When a customer from a mapped country is selected, the order's carrier will automatically be set.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </CardContent>
            </Card>

            {/* Quick Select Buttons */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  Quick Select Buttons
                </CardTitle>
                <CardDescription className="text-sm">Configure quick select shipping cost buttons</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <FormField
                  control={form.control}
                  name="quick_select_czk"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quick Select CZK</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="0,100,150,250" data-testid="input-quick_select_czk" />
                      </FormControl>
                      <FormDescription>Comma-separated shipping costs in CZK for quick selection</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quick_select_eur"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quick Select EUR</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="0,5,10,13,15,20" data-testid="input-quick_select_eur" />
                      </FormControl>
                      <FormDescription>Comma-separated shipping costs in EUR for quick selection</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="default_shipping_method"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Shipping Method</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-default_shipping_method">
                              <SelectValue placeholder={t('common:selectShippingMethod')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="PPL CZ">PPL CZ</SelectItem>
                            <SelectItem value="GLS DE">GLS DE</SelectItem>
                            <SelectItem value="DHL DE">DHL DE</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="default_carrier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Carrier</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-default_carrier">
                              <SelectValue placeholder={t('common:selectDefaultCarrier')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="PPL CZ">PPL CZ</SelectItem>
                            <SelectItem value="GLS DE">GLS DE</SelectItem>
                            <SelectItem value="DHL DE">DHL DE</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="available_carriers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Available Carriers</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t('settings:availableCarriersPlaceholder')} data-testid="input-available_carriers" />
                      </FormControl>
                      <FormDescription>Comma-separated list of available carriers</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Shipping Costs */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
                  Shipping Costs
                </CardTitle>
                <CardDescription className="text-sm">Configure default shipping costs and thresholds</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="default_shipping_cost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Shipping Cost</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0"
                            data-testid="input-default_shipping_cost"
                          />
                        </FormControl>
                        <FormDescription>Default cost for shipping</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="free_shipping_threshold"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Free Shipping Threshold</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0"
                            data-testid="input-free_shipping_threshold"
                          />
                        </FormControl>
                        <FormDescription>Order value for free shipping</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="shipping_cost_currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Currency</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-shipping_cost_currency">
                              <SelectValue placeholder={t('common:selectCurrency')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="CZK">CZK</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="volumetric_weight_divisor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Volumetric Weight Divisor</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="1"
                          placeholder="5000"
                          data-testid="input-volumetric_weight_divisor"
                        />
                      </FormControl>
                      <FormDescription>
                        Divisor for volumetric weight calculation (Length × Width × Height / Divisor)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rules Tab */}
          <TabsContent value="rules" className="space-y-4">
            {/* Label Generation */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Tag className="h-4 w-4 sm:h-5 sm:w-5" />
                  Label Generation
                </CardTitle>
                <CardDescription className="text-sm">Configure shipping label preferences and formats</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="default_label_size"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Label Size</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-default_label_size">
                              <SelectValue placeholder={t('common:selectLabelSize')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="A4">A4</SelectItem>
                            <SelectItem value="A5">A5</SelectItem>
                            <SelectItem value="4x6">4x6</SelectItem>
                            <SelectItem value="10x15cm">10x15cm</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="label_format"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Label Format</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-label_format">
                              <SelectValue placeholder={t('common:selectLabelFormat')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="PDF">PDF</SelectItem>
                            <SelectItem value="PNG">PNG</SelectItem>
                            <SelectItem value="ZPL">ZPL</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="auto_print_labels"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-auto_print_labels"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Auto-print Labels</FormLabel>
                        <FormDescription>
                          Automatically print labels after generation
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="include_packing_slip"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-include_packing_slip"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Include Packing Slip</FormLabel>
                        <FormDescription>
                          Include packing slip with shipping labels
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="include_invoice"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-include_invoice"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Include Invoice</FormLabel>
                        <FormDescription>
                          Include invoice with shipping labels
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Tracking & Notifications */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                  Tracking & Notifications
                </CardTitle>
                <CardDescription className="text-sm">Configure tracking and customer notification settings</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <FormField
                  control={form.control}
                  name="enable_tracking"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-enable_tracking"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Enable Tracking</FormLabel>
                        <FormDescription>
                          Enable shipment tracking functionality
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="auto_update_tracking_status"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-auto_update_tracking_status"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Auto-update Tracking Status</FormLabel>
                        <FormDescription>
                          Automatically update tracking status from carriers
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tracking_update_frequency_hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tracking Update Frequency (hours)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="1"
                          max="24"
                          placeholder="6"
                          data-testid="input-tracking_update_frequency_hours"
                        />
                      </FormControl>
                      <FormDescription>How often to check for tracking updates (1-24 hours)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="send_tracking_email_to_customer"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-send_tracking_email_to_customer"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Send Tracking Email to Customer</FormLabel>
                        <FormDescription>
                          Send tracking number via email to customer when shipment is created
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="include_estimated_delivery"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-include_estimated_delivery"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Include Estimated Delivery</FormLabel>
                        <FormDescription>
                          Include estimated delivery date in tracking notifications
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={saveMutation.isPending}
            className="w-full sm:w-auto"
            data-testid="button-save-shipping-settings"
          >
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
