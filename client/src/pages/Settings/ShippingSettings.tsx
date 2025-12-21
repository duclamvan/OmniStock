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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Truck, Save, Loader2, Package, Tag, Bell, DollarSign, Globe, Check } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { camelToSnake, deepCamelToSnake } from "@/utils/caseConverters";
import { useSettingsAutosave } from "@/hooks/useSettingsAutosave";

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

const DEFAULT_PPL_RATES = {
  countries: {
    CZ: { ratePerKg: 25, baseFee: 50, currency: 'CZK' },
    SK: { ratePerKg: 35, baseFee: 80, currency: 'CZK' },
  },
  codFees: {
    cash: { fee: 30, currency: 'CZK' },
    card: { fee: 50, currency: 'CZK' },
  },
};

const formSchema = z.object({
  ppl_default_sender_address: z.string().default(''),
  ppl_enable_auto_label: z.boolean().default(false),
  ppl_max_package_weight_kg: z.coerce.number().min(0).default(50),
  ppl_max_package_dimensions_cm: z.string().default('200x80x60'),
  ppl_shipping_rates: z.string().default(JSON.stringify(DEFAULT_PPL_RATES)),
  country_carrier_mapping: z.string().default('{"CZ":"PPL CZ","DE":"GLS DE","AT":"DHL DE"}'),
  gls_default_sender_address: z.string().default(''),
  gls_enable_manual_labels: z.boolean().default(false),
  gls_max_package_weight_kg: z.coerce.number().min(0).default(40),
  gls_max_girth_cm: z.coerce.number().min(0).default(300),
  gls_shipping_rates: z.string().default(JSON.stringify({ paketXS: 4.59, paketS: 5.19 })),
  dhl_default_sender_address: z.string().default(''),
  dhl_enable_auto_label: z.boolean().default(false),
  dhl_max_package_weight_kg: z.coerce.number().min(0).default(31.5),
  dhl_max_package_dimensions_cm: z.string().default('120x60x60'),
  dhl_shipping_rates: z.string().default(JSON.stringify({
    paket2kg: { price: 6.19, maxWeight: 2, dimensions: '60x30x15' },
    paket5kg: { price: 7.69, maxWeight: 5, dimensions: '120x60x60' },
    paket10kg: { price: 10.49, maxWeight: 10, dimensions: '120x60x60' },
    paket20kg: { price: 18.99, maxWeight: 20, dimensions: '120x60x60' },
    paket31kg: { price: 23.99, maxWeight: 31.5, dimensions: '120x60x60' },
    nachnahme: { fee: 8.99 }
  })),
  quick_select_czk: z.string().default('0,100,150,250'),
  quick_select_eur: z.string().default('0,5,10,13,15,20'),
  default_shipping_method: z.enum(['PPL', 'PPL CZ', 'GLS', 'GLS DE', 'DHL', 'DHL DE']).transform(normalizeCarrier).default('PPL CZ'),
  available_carriers: z.string().default('GLS DE,PPL CZ,DHL DE'),
  default_carrier: z.string().default('PPL CZ'),
  default_shipping_cost_eur: z.coerce.number().min(0).default(0),
  free_shipping_threshold_eur: z.coerce.number().min(0).default(0),
  default_shipping_cost_czk: z.coerce.number().min(0).default(0),
  free_shipping_threshold_czk: z.coerce.number().min(0).default(0),
  volumetric_weight_divisor: z.coerce.number().min(1).default(5000),
  default_label_size: z.enum(['A4', 'A5', '4x6', '10x15cm']).default('A4'),
  label_format: z.enum(['PDF', 'PNG', 'ZPL']).default('PDF'),
  auto_print_labels: z.boolean().default(false),
  include_packing_slip: z.boolean().default(true),
  include_invoice: z.boolean().default(false),
  enable_tracking: z.boolean().default(true),
  auto_update_tracking_status: z.boolean().default(true),
  tracking_update_frequency_hours: z.coerce.number().min(1).max(24).default(6),
  send_tracking_email_to_customer: z.boolean().default(true),
  include_estimated_delivery: z.boolean().default(true),
  ppl_default_shipping_price: z.coerce.number().min(0).default(0),
  gls_default_shipping_price: z.coerce.number().min(0).default(0),
  dhl_default_shipping_price: z.coerce.number().min(0).default(0),
});

type FormValues = z.infer<typeof formSchema>;

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
      ppl_shipping_rates: JSON.stringify(DEFAULT_PPL_RATES),
      country_carrier_mapping: '{"CZ":"PPL CZ","DE":"GLS DE","AT":"DHL DE"}',
      gls_default_sender_address: '',
      gls_enable_manual_labels: false,
      gls_max_package_weight_kg: 40,
      gls_max_girth_cm: 300,
      gls_shipping_rates: JSON.stringify({ paketXS: 4.59, paketS: 5.19 }),
      dhl_default_sender_address: '',
      dhl_enable_auto_label: false,
      dhl_max_package_weight_kg: 31.5,
      dhl_max_package_dimensions_cm: '120x60x60',
      dhl_shipping_rates: JSON.stringify({
        paket2kg: { price: 6.19, maxWeight: 2, dimensions: '60x30x15' },
        paket5kg: { price: 7.69, maxWeight: 5, dimensions: '120x60x60' },
        paket10kg: { price: 10.49, maxWeight: 10, dimensions: '120x60x60' },
        paket20kg: { price: 18.99, maxWeight: 20, dimensions: '120x60x60' },
        paket31kg: { price: 23.99, maxWeight: 31.5, dimensions: '120x60x60' },
        nachnahme: { fee: 8.99 }
      }),
      quick_select_czk: '0,100,150,250',
      quick_select_eur: '0,5,10,13,15,20',
      default_shipping_method: 'PPL CZ',
      available_carriers: 'GLS DE,PPL CZ,DHL DE',
      default_carrier: 'PPL CZ',
      default_shipping_cost_eur: 0,
      free_shipping_threshold_eur: 0,
      default_shipping_cost_czk: 0,
      free_shipping_threshold_czk: 0,
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
      ppl_default_shipping_price: 0,
      gls_default_shipping_price: 0,
      dhl_default_shipping_price: 0,
    },
  });

  const {
    handleSelectChange,
    handleCheckboxChange,
    handleTextBlur,
    markPendingChange,
    saveStatus,
    lastSavedAt,
    hasPendingChanges,
    saveAllPending,
  } = useSettingsAutosave({
    category: 'shipping',
    originalValues: originalSettings,
    getCurrentValue: (fieldName) => form.getValues(fieldName as keyof FormValues),
  });

  const toJsonString = (value: any): string => {
    if (!value) return '';
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return value;
  };

  useEffect(() => {
    if (!isLoading) {
      const snapshot = {
        ppl_default_sender_address: toJsonString(shippingSettings.pplDefaultSenderAddress),
        ppl_enable_auto_label: shippingSettings.pplEnableAutoLabel,
        ppl_max_package_weight_kg: shippingSettings.pplMaxPackageWeightKg ?? 50,
        ppl_max_package_dimensions_cm: shippingSettings.pplMaxPackageDimensionsCm ?? '200x80x60',
        ppl_shipping_rates: toJsonString(shippingSettings.pplShippingRates || DEFAULT_PPL_RATES),
        country_carrier_mapping: toJsonString(shippingSettings.countryCarrierMapping || {"CZ":"PPL CZ","DE":"GLS DE","AT":"DHL DE"}),
        gls_default_sender_address: toJsonString(shippingSettings.glsDefaultSenderAddress),
        gls_enable_manual_labels: shippingSettings.glsEnableManualLabels,
        gls_max_package_weight_kg: shippingSettings.glsMaxPackageWeightKg ?? 40,
        gls_max_girth_cm: shippingSettings.glsMaxGirthCm ?? 300,
        gls_shipping_rates: toJsonString(shippingSettings.glsShippingRates || { paketXS: 4.59, paketS: 5.19 }),
        dhl_default_sender_address: toJsonString(shippingSettings.dhlDefaultSenderAddress),
        dhl_enable_auto_label: shippingSettings.dhlEnableAutoLabel,
        dhl_max_package_weight_kg: shippingSettings.dhlMaxPackageWeightKg ?? 31.5,
        dhl_max_package_dimensions_cm: shippingSettings.dhlMaxPackageDimensionsCm ?? '120x60x60',
        dhl_shipping_rates: toJsonString(shippingSettings.dhlShippingRates || {
          paket2kg: { price: 6.19, maxWeight: 2, dimensions: '60x30x15' },
          paket5kg: { price: 7.69, maxWeight: 5, dimensions: '120x60x60' },
          paket10kg: { price: 10.49, maxWeight: 10, dimensions: '120x60x60' },
          paket20kg: { price: 18.99, maxWeight: 20, dimensions: '120x60x60' },
          paket31kg: { price: 23.99, maxWeight: 31.5, dimensions: '120x60x60' },
          nachnahme: { fee: 8.99 }
        }),
        quick_select_czk: shippingSettings.quickSelectCzk,
        quick_select_eur: shippingSettings.quickSelectEur,
        default_shipping_method: normalizeCarrier(shippingSettings.defaultShippingMethod || 'PPL CZ'),
        available_carriers: shippingSettings.availableCarriers,
        default_carrier: normalizeCarrier(shippingSettings.defaultCarrier || 'PPL CZ'),
        default_shipping_cost_eur: shippingSettings.defaultShippingCostEur ?? 0,
        free_shipping_threshold_eur: shippingSettings.freeShippingThresholdEur ?? 0,
        default_shipping_cost_czk: shippingSettings.defaultShippingCostCzk ?? 0,
        free_shipping_threshold_czk: shippingSettings.freeShippingThresholdCzk ?? 0,
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
        ppl_default_shipping_price: shippingSettings.pplDefaultShippingPrice ?? 0,
        ppl_default_shipping_price_with_dobirka: shippingSettings.pplDefaultShippingPriceWithDobirka ?? 150,
        gls_default_shipping_price: shippingSettings.glsDefaultShippingPrice ?? 0,
        dhl_default_shipping_price: shippingSettings.dhlDefaultShippingPrice ?? 0,
      };
      setOriginalSettings(snapshot);
      form.reset(snapshot);
    }
  }, [isLoading, shippingSettings, form]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await saveAllPending();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: t('common:error'),
        description: error.message || t('settings:settingsSaveError', 'Failed to save settings'),
      });
    },
  });

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
      <form className="space-y-4 sm:space-y-6">
        <Tabs defaultValue="ppl-cz" className="w-full">
          <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0 mb-4">
            <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-5 gap-1 p-1">
              <TabsTrigger value="ppl-cz" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm whitespace-nowrap">
                <Truck className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">PPL CZ</span>
                <span className="sm:hidden">PPL</span>
              </TabsTrigger>
              <TabsTrigger value="gls-de" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm whitespace-nowrap">
                <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">GLS DE</span>
                <span className="sm:hidden">GLS</span>
              </TabsTrigger>
              <TabsTrigger value="dhl-de" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm whitespace-nowrap">
                <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">DHL DE</span>
                <span className="sm:hidden">DHL</span>
              </TabsTrigger>
              <TabsTrigger value="general" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm whitespace-nowrap">
                <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">{t('settings:general', 'General')}</span>
                <span className="sm:hidden">{t('settings:general', 'General').substring(0, 3)}</span>
              </TabsTrigger>
              <TabsTrigger value="rules" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm whitespace-nowrap">
                <Tag className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">{t('settings:rules', 'Rules')}</span>
                <span className="sm:hidden">{t('settings:rules', 'Rules')}</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* PPL CZ Tab */}
          <TabsContent value="ppl-cz" className="space-y-4">
            {/* Carrier Configuration */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Truck className="h-4 w-4 sm:h-5 sm:w-5" />
                  {t('settings:pplCzCarrierConfiguration', 'PPL CZ Carrier Configuration')}
                </CardTitle>
                <CardDescription className="text-sm">{t('settings:pplCzCarrierConfigurationDescription', 'Configure PPL CZ carrier settings and automation')}</CardDescription>
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
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            handleCheckboxChange('ppl_enable_auto_label')(checked as boolean);
                          }}
                          data-testid="checkbox-ppl_enable_auto_label"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>{t('settings:enableAutoLabelGenerationLabel', 'Enable Auto Label Generation')}</FormLabel>
                        <FormDescription>
                          {t('settings:enableAutoLabelGenerationDescriptionPpl', 'Automatically generate shipping labels when orders are ready for shipment via PPL')}
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
                  {t('settings:pplCzSenderAddressTitle', 'PPL CZ Sender Address')}
                </CardTitle>
                <CardDescription className="text-sm">{t('settings:pplCzSenderAddressDescription', 'Default sender address for PPL CZ shipments')}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <FormField
                  control={form.control}
                  name="ppl_default_sender_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('settings:senderAddressJsonLabel', 'Sender Address (JSON)')}</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            markPendingChange('ppl_default_sender_address');
                          }}
                          onBlur={handleTextBlur('ppl_default_sender_address')}
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
                        {t('settings:senderAddressJsonDescriptionPpl', 'Enter sender address in JSON format for PPL shipments')}
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
                  {t('settings:pplCzPackageLimitsTitle', 'PPL CZ Package Limits')}
                </CardTitle>
                <CardDescription className="text-sm">{t('settings:pplCzPackageLimitsDescription', 'Maximum package weight and dimensions for PPL CZ')}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="ppl_max_package_weight_kg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:maximumWeightKg', 'Maximum Weight (kg)')}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              markPendingChange('ppl_max_package_weight_kg');
                            }}
                            onBlur={handleTextBlur('ppl_max_package_weight_kg')}
                            type="number"
                            min="0"
                            max="50"
                            step="0.1"
                            placeholder="50"
                            data-testid="input-ppl_max_package_weight_kg"
                          />
                        </FormControl>
                        <FormDescription>{t('settings:pplMaxWeightDescription', 'Maximum weight limit for PPL packages (up to 50kg)')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ppl_max_package_dimensions_cm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:maximumDimensionsCm', 'Maximum Dimensions (cm)')}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              markPendingChange('ppl_max_package_dimensions_cm');
                            }}
                            onBlur={handleTextBlur('ppl_max_package_dimensions_cm')}
                            placeholder="200x80x60"
                            data-testid="input-ppl_max_package_dimensions_cm"
                          />
                        </FormControl>
                        <FormDescription>{t('settings:pplMaxDimensionsDescription', 'Maximum dimensions in LxWxH format for PPL packages')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* PPL Shipping Rates */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
                  {t('settings:pplShippingRatesTitle', 'PPL Shipping Rates')}
                </CardTitle>
                <CardDescription className="text-sm">
                  {t('settings:pplShippingRatesDescription', 'Configure shipping rates for PPL by country and COD fees')}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-4">
                <FormField
                  control={form.control}
                  name="ppl_shipping_rates"
                  render={({ field }) => {
                    const parsedRates = (() => {
                      try {
                        const parsed = typeof field.value === 'string' ? JSON.parse(field.value || '{}') : (field.value || {});
                        if (!parsed.countries) parsed.countries = {};
                        if (!parsed.codFees) parsed.codFees = { cash: { fee: 0, currency: 'CZK' }, card: { fee: 0, currency: 'CZK' } };
                        return parsed;
                      } catch {
                        return { countries: {}, codFees: { cash: { fee: 0, currency: 'CZK' }, card: { fee: 0, currency: 'CZK' } } };
                      }
                    })();
                    
                    const updateCountryRate = (countryCode: string, key: 'ratePerKg' | 'baseFee', value: number) => {
                      const newRates = { ...parsedRates };
                      if (!newRates.countries[countryCode]) {
                        newRates.countries[countryCode] = { ratePerKg: 0, baseFee: 0, currency: 'CZK' };
                      }
                      newRates.countries[countryCode] = { ...newRates.countries[countryCode], [key]: value };
                      field.onChange(JSON.stringify(newRates, null, 2));
                      markPendingChange('ppl_shipping_rates');
                    };
                    
                    const updateCodFee = (type: 'cash' | 'card', key: string, value: number) => {
                      const newRates = { ...parsedRates };
                      newRates.codFees[type] = { ...newRates.codFees[type], [key]: value, currency: 'CZK' };
                      field.onChange(JSON.stringify(newRates, null, 2));
                      markPendingChange('ppl_shipping_rates');
                    };
                    
                    const addCountry = (countryCode: string) => {
                      const newRates = { ...parsedRates };
                      if (!newRates.countries[countryCode]) {
                        newRates.countries[countryCode] = { ratePerKg: 0, baseFee: 0, currency: 'CZK' };
                        field.onChange(JSON.stringify(newRates, null, 2));
                        markPendingChange('ppl_shipping_rates');
                      }
                    };
                    
                    const removeCountry = (countryCode: string) => {
                      const newRates = { ...parsedRates };
                      delete newRates.countries[countryCode];
                      field.onChange(JSON.stringify(newRates, null, 2));
                      markPendingChange('ppl_shipping_rates');
                    };
                    
                    const countryFlags: Record<string, string> = {
                      CZ: '🇨🇿', SK: '🇸🇰', PL: '🇵🇱', AT: '🇦🇹', DE: '🇩🇪', HU: '🇭🇺'
                    };
                    const countryNames: Record<string, string> = {
                      CZ: t('settings:countryCzechRepublic', 'Czech Republic'), SK: t('settings:countrySlovakia', 'Slovakia'), PL: t('settings:countryPoland', 'Poland'), AT: t('settings:countryAustria', 'Austria'), DE: t('settings:countryGermany', 'Germany'), HU: t('settings:countryHungary', 'Hungary')
                    };
                    const availableCountries = ['CZ', 'SK', 'PL', 'AT', 'DE', 'HU'];
                    const configuredCountries = Object.keys(parsedRates.countries || {});
                    const unconfiguredCountries = availableCountries.filter(c => !configuredCountries.includes(c));
                    
                    return (
                      <FormItem>
                        <div className="space-y-6">
                          {/* Country Rates */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">{t('settings:countryShippingRatesCzk', 'Country Shipping Rates (CZK)')}</h4>
                              {unconfiguredCountries.length > 0 && (
                                <Select onValueChange={(v) => addCountry(v)}>
                                  <SelectTrigger className="w-40" data-testid="select-add-country">
                                    <SelectValue placeholder={t('settings:addCountry', 'Add Country')} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {unconfiguredCountries.map(code => (
                                      <SelectItem key={code} value={code}>
                                        {countryFlags[code]} {countryNames[code]}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                            <div className="space-y-2">
                              {configuredCountries.map((code) => {
                                const rate = parsedRates.countries[code];
                                return (
                                  <div key={code} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                                    <span className="text-lg w-8">{countryFlags[code] || '🌍'}</span>
                                    <span className="text-sm font-medium flex-1">{countryNames[code] || code}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-muted-foreground">{t('settings:perKgLabel', 'Per kg')}</span>
                                      <Input
                                        type="number"
                                        value={rate?.ratePerKg || 0}
                                        onChange={(e) => updateCountryRate(code, 'ratePerKg', parseFloat(e.target.value) || 0)}
                                        onBlur={handleTextBlur('ppl_shipping_rates')}
                                        className="w-20"
                                        min="0"
                                        step="1"
                                        data-testid={`input-${code}-rateperkg`}
                                      />
                                      <span className="text-xs text-muted-foreground">{t('settings:czkPerKg', 'CZK/kg')}</span>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="ml-auto text-destructive hover:text-destructive"
                                      onClick={() => removeCountry(code)}
                                      data-testid={`button-remove-${code}`}
                                    >
                                      ✕
                                    </Button>
                                  </div>
                                );
                              })}
                              {configuredCountries.length === 0 && (
                                <p className="text-sm text-muted-foreground italic p-3">{t('settings:noCountriesConfigured', 'No countries configured')}</p>
                              )}
                            </div>
                          </div>
                          
                          {/* COD Fees */}
                          <div className="space-y-3">
                            <h4 className="font-medium">{t('settings:dobirkaCodFees', 'Dobírka (COD) Fees')}</h4>
                            <div className="space-y-3">
                              <div className="p-3 rounded-lg border bg-muted/30">
                                <div className="flex items-center gap-3">
                                  <span className="text-lg">💵</span>
                                  <span className="text-sm font-medium flex-1">{t('settings:cashPayment', 'Cash Payment')}</span>
                                  <Input
                                    type="number"
                                    value={parsedRates.codFees?.cash?.fee || 0}
                                    onChange={(e) => updateCodFee('cash', 'fee', parseFloat(e.target.value) || 0)}
                                    onBlur={handleTextBlur('ppl_shipping_rates')}
                                    className="w-24"
                                    min="0"
                                    step="1"
                                    data-testid="input-cod-cash-fee"
                                  />
                                  <span className="text-sm">CZK</span>
                                </div>
                              </div>
                              <div className="p-3 rounded-lg border bg-muted/30 space-y-3">
                                <div className="flex items-center gap-3">
                                  <span className="text-lg">💳</span>
                                  <span className="text-sm font-medium flex-1">{t('settings:cardPayment', 'Card Payment')}</span>
                                  <Input
                                    type="number"
                                    value={parsedRates.codFees?.card?.fee || 0}
                                    onChange={(e) => updateCodFee('card', 'fee', parseFloat(e.target.value) || 0)}
                                    onBlur={handleTextBlur('ppl_shipping_rates')}
                                    className="w-24"
                                    min="0"
                                    step="1"
                                    data-testid="input-cod-card-fee"
                                  />
                                  <span className="text-sm">CZK</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 ml-8 text-sm">
                                  <span className="text-muted-foreground">+</span>
                                  <Input
                                    type="number"
                                    value={parsedRates.codFees?.card?.percentFee || 0}
                                    onChange={(e) => updateCodFee('card', 'percentFee', parseFloat(e.target.value) || 0)}
                                    onBlur={handleTextBlur('ppl_shipping_rates')}
                                    className="w-16"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    data-testid="input-cod-card-percent"
                                  />
                                  <span className="text-muted-foreground">%</span>
                                  <span className="text-muted-foreground">{t('settings:afterAmount', 'after')}</span>
                                  <Input
                                    type="number"
                                    value={parsedRates.codFees?.card?.thresholdCzk || 0}
                                    onChange={(e) => updateCodFee('card', 'thresholdCzk', parseFloat(e.target.value) || 0)}
                                    onBlur={handleTextBlur('ppl_shipping_rates')}
                                    className="w-24"
                                    min="0"
                                    step="100"
                                    data-testid="input-cod-card-threshold"
                                  />
                                  <span className="text-muted-foreground">CZK</span>
                                </div>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {t('settings:codFeesDescription', 'Configure cash on delivery fees for different payment methods')}
                            </p>
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </CardContent>
            </Card>

            {/* PPL Default Shipping Price */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
                  {t('settings:pplDefaultShippingPrice', 'PPL Default Shipping Price')}
                </CardTitle>
                <CardDescription className="text-sm">{t('settings:pplDefaultShippingPriceDescription', 'Default shipping price for PPL CZ orders')}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="ppl_default_shipping_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:defaultShippingPriceCzk', 'Default Shipping Price (CZK)')}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              markPendingChange('ppl_default_shipping_price');
                            }}
                            onBlur={handleTextBlur('ppl_default_shipping_price')}
                            type="number"
                            min="0"
                            step="1"
                            placeholder="0"
                            data-testid="input-ppl_default_shipping_price"
                          />
                        </FormControl>
                        <FormDescription>{t('settings:defaultShippingPriceAutoApplyDescription', 'This price will be automatically applied to new orders')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ppl_default_shipping_price_with_dobirka"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:defaultShippingPriceWithDobirkaCzk', 'Default Price with Dobírka (CZK)')}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              markPendingChange('ppl_default_shipping_price_with_dobirka');
                            }}
                            onBlur={handleTextBlur('ppl_default_shipping_price_with_dobirka')}
                            type="number"
                            min="0"
                            step="1"
                            placeholder="150"
                            data-testid="input-ppl_default_shipping_price_with_dobirka"
                          />
                        </FormControl>
                        <FormDescription>{t('settings:defaultShippingPriceWithDobirkaDescription', 'Applied when payment is Cash on Delivery (COD)')}</FormDescription>
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
            {/* GLS DE Package Limits & Shipping Rates - Combined Card */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                  {t('settings:glsDePackageLimitsRatesTitle', 'GLS DE Package Limits & Rates')}
                </CardTitle>
                <CardDescription className="text-sm">{t('settings:glsDePackageLimitsRatesDescription', 'Configure GLS Germany package limits and shipping rates')}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-6">
                {/* Package Limits */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">{t('settings:packageLimits', 'Package Limits')}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="gls_max_package_weight_kg"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('settings:maximumWeightKg', 'Maximum Weight (kg)')}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                markPendingChange('gls_max_package_weight_kg');
                              }}
                              onBlur={handleTextBlur('gls_max_package_weight_kg')}
                              type="number"
                              min="0"
                              max="40"
                              step="0.1"
                              placeholder="40"
                              data-testid="input-gls_max_package_weight_kg"
                            />
                          </FormControl>
                          <FormDescription>{t('settings:glsMaxWeightDescription', 'Maximum weight limit for GLS packages (up to 40kg)')}</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="gls_max_girth_cm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('settings:maximumGirthLongestSide', 'Maximum Girth + Longest Side (cm)')}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                markPendingChange('gls_max_girth_cm');
                              }}
                              onBlur={handleTextBlur('gls_max_girth_cm')}
                              type="number"
                              min="0"
                              max="300"
                              step="1"
                              placeholder="300"
                              data-testid="input-gls_max_girth_cm"
                            />
                          </FormControl>
                          <FormDescription>{t('settings:glsMaxGirthDescription', 'Maximum girth plus longest side for GLS packages')}</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Shipping Rates */}
                <div className="space-y-3 pt-4 border-t">
                  <h4 className="text-sm font-medium text-muted-foreground">{t('settings:shippingRatesEur', 'Shipping Rates (EUR)')}</h4>
                  <FormField
                    control={form.control}
                    name="gls_shipping_rates"
                    render={({ field }) => {
                      const parsedRates = (() => {
                        try {
                          return typeof field.value === 'string' ? JSON.parse(field.value || '{}') : (field.value || {});
                        } catch {
                          return { paketXS: 4.59, paketS: 5.19 };
                        }
                      })();

                      const updateRate = (size: string, value: number) => {
                        const newRates = { ...parsedRates, [size]: value };
                        field.onChange(JSON.stringify(newRates));
                        markPendingChange('gls_shipping_rates');
                      };

                      return (
                        <FormItem>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">{t('settings:paketXS', 'Paket XS')}</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  value={parsedRates.paketXS || 4.59}
                                  onChange={(e) => updateRate('paketXS', parseFloat(e.target.value) || 0)}
                                  onBlur={handleTextBlur('gls_shipping_rates')}
                                  className="w-24"
                                  min="0"
                                  step="0.01"
                                  data-testid="input-gls-rate-xs"
                                />
                                <span className="text-sm text-muted-foreground">EUR</span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">{t('settings:paketS', 'Paket S')}</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  value={parsedRates.paketS || 5.19}
                                  onChange={(e) => updateRate('paketS', parseFloat(e.target.value) || 0)}
                                  onBlur={handleTextBlur('gls_shipping_rates')}
                                  className="w-24"
                                  min="0"
                                  step="0.01"
                                  data-testid="input-gls-rate-s"
                                />
                                <span className="text-sm text-muted-foreground">EUR</span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">{t('settings:paketM', 'Paket M')}</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  value={parsedRates.paketM || 0}
                                  onChange={(e) => updateRate('paketM', parseFloat(e.target.value) || 0)}
                                  onBlur={handleTextBlur('gls_shipping_rates')}
                                  className="w-24"
                                  min="0"
                                  step="0.01"
                                  data-testid="input-gls-rate-m"
                                />
                                <span className="text-sm text-muted-foreground">EUR</span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">{t('settings:paketL', 'Paket L')}</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  value={parsedRates.paketL || 0}
                                  onChange={(e) => updateRate('paketL', parseFloat(e.target.value) || 0)}
                                  onBlur={handleTextBlur('gls_shipping_rates')}
                                  className="w-24"
                                  min="0"
                                  step="0.01"
                                  data-testid="input-gls-rate-l"
                                />
                                <span className="text-sm text-muted-foreground">EUR</span>
                              </div>
                            </div>
                          </div>
                          <FormDescription className="mt-2">
                            {t('settings:glsPackageSizeRatesDescription', 'Set shipping rates for each GLS package size category')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Carrier Configuration */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Globe className="h-4 w-4 sm:h-5 sm:w-5" />
                  {t('settings:glsDeCarrierConfiguration', 'GLS DE Carrier Configuration')}
                </CardTitle>
                <CardDescription className="text-sm">{t('settings:glsDeCarrierConfigurationDescription', 'Configure GLS Germany carrier settings')}</CardDescription>
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
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            handleCheckboxChange('gls_enable_manual_labels')(checked as boolean);
                          }}
                          data-testid="checkbox-gls_enable_manual_labels"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>{t('settings:enableManualLabelEntryLabel', 'Enable Manual Label Entry')}</FormLabel>
                        <FormDescription>
                          {t('settings:enableManualLabelEntryDescription', 'Allow manual entry of tracking numbers and labels for GLS shipments')}
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* GLS DE Sender Address - Always at bottom */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  {t('settings:glsDeSenderAddressTitle', 'GLS DE Sender Address')}
                </CardTitle>
                <CardDescription className="text-sm">{t('settings:glsDeSenderAddressDescription', 'Default sender address for GLS Germany shipments')}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <FormField
                  control={form.control}
                  name="gls_default_sender_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('settings:senderAddressJsonLabel', 'Sender Address (JSON)')}</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            markPendingChange('gls_default_sender_address');
                          }}
                          onBlur={handleTextBlur('gls_default_sender_address')}
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
                        {t('settings:senderAddressJsonDescriptionGls', 'Enter sender address in JSON format for GLS shipments')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* GLS Default Shipping Price */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
                  {t('settings:glsDefaultShippingPrice', 'GLS Default Shipping Price')}
                </CardTitle>
                <CardDescription className="text-sm">{t('settings:glsDefaultShippingPriceDescription', 'Default shipping price for GLS Germany orders')}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <FormField
                  control={form.control}
                  name="gls_default_shipping_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('settings:defaultShippingPriceEur', 'Default Shipping Price (EUR)')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            markPendingChange('gls_default_shipping_price');
                          }}
                          onBlur={handleTextBlur('gls_default_shipping_price')}
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0"
                          data-testid="input-gls_default_shipping_price"
                        />
                      </FormControl>
                      <FormDescription>{t('settings:defaultShippingPriceAutoApplyDescription', 'This price will be automatically applied to new orders')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* DHL DE Tab */}
          <TabsContent value="dhl-de" className="space-y-4">
            {/* DHL DE Package Rates & Limits */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                  {t('settings:dhlDePackageRatesLimitsTitle', 'DHL DE Package Rates & Limits')}
                </CardTitle>
                <CardDescription className="text-sm">{t('settings:dhlDePackageRatesLimitsDescription', 'Configure DHL Germany package rates and size limits')}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-6">
                {/* Package Rates */}
                <FormField
                  control={form.control}
                  name="dhl_shipping_rates"
                  render={({ field }) => {
                    const parsedRates = (() => {
                      try {
                        return typeof field.value === 'string' ? JSON.parse(field.value || '{}') : (field.value || {});
                      } catch {
                        return {
                          paket2kg: { price: 6.19, maxWeight: 2, dimensions: '60x30x15' },
                          paket5kg: { price: 7.69, maxWeight: 5, dimensions: '120x60x60' },
                          paket10kg: { price: 10.49, maxWeight: 10, dimensions: '120x60x60' },
                          paket20kg: { price: 18.99, maxWeight: 20, dimensions: '120x60x60' },
                          paket31kg: { price: 23.99, maxWeight: 31.5, dimensions: '120x60x60' },
                          nachnahme: { fee: 8.99 }
                        };
                      }
                    })();

                    const updateRate = (size: string, key: string, value: number | string) => {
                      const newRates = { 
                        ...parsedRates, 
                        [size]: { ...parsedRates[size], [key]: value } 
                      };
                      field.onChange(JSON.stringify(newRates, null, 2));
                      markPendingChange('dhl_shipping_rates');
                    };

                    const packageSizes = [
                      { key: 'paket2kg', label: 'Paket 2kg', defaultWeight: 2, defaultDim: '60x30x15', defaultPrice: 6.19 },
                      { key: 'paket5kg', label: 'Paket 5kg', defaultWeight: 5, defaultDim: '120x60x60', defaultPrice: 7.69 },
                      { key: 'paket10kg', label: 'Paket 10kg', defaultWeight: 10, defaultDim: '120x60x60', defaultPrice: 10.49 },
                      { key: 'paket20kg', label: 'Paket 20kg', defaultWeight: 20, defaultDim: '120x60x60', defaultPrice: 18.99 },
                      { key: 'paket31kg', label: 'Paket 31.5kg', defaultWeight: 31.5, defaultDim: '120x60x60', defaultPrice: 23.99 },
                    ];

                    return (
                      <FormItem>
                        <div className="space-y-4">
                          {packageSizes.map((pkg) => (
                            <div 
                              key={pkg.key} 
                              className="flex flex-wrap items-center gap-3 p-3 rounded-lg border bg-muted/30"
                            >
                              <span className="font-medium min-w-[100px]">{pkg.label}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Price:</span>
                                <Input
                                  type="number"
                                  value={parsedRates[pkg.key]?.price ?? pkg.defaultPrice}
                                  onChange={(e) => updateRate(pkg.key, 'price', parseFloat(e.target.value) || 0)}
                                  onBlur={handleTextBlur('dhl_shipping_rates')}
                                  className="w-20 h-8 text-sm"
                                  min="0"
                                  step="0.01"
                                  data-testid={`input-dhl-${pkg.key}-price`}
                                />
                                <span className="text-xs text-muted-foreground">EUR</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Max:</span>
                                <Input
                                  type="number"
                                  value={parsedRates[pkg.key]?.maxWeight ?? pkg.defaultWeight}
                                  onChange={(e) => updateRate(pkg.key, 'maxWeight', parseFloat(e.target.value) || 0)}
                                  onBlur={handleTextBlur('dhl_shipping_rates')}
                                  className="w-16 h-8 text-sm"
                                  min="0"
                                  step="0.1"
                                  data-testid={`input-dhl-${pkg.key}-weight`}
                                />
                                <span className="text-xs text-muted-foreground">kg</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Dim:</span>
                                <Input
                                  type="text"
                                  value={parsedRates[pkg.key]?.dimensions ?? pkg.defaultDim}
                                  onChange={(e) => updateRate(pkg.key, 'dimensions', e.target.value)}
                                  onBlur={handleTextBlur('dhl_shipping_rates')}
                                  className="w-28 h-8 text-sm"
                                  placeholder="L×W×H"
                                  data-testid={`input-dhl-${pkg.key}-dim`}
                                />
                              </div>
                            </div>
                          ))}

                          {/* Nachnahme (COD) Fee */}
                          <div className="pt-4 border-t">
                            <h4 className="text-sm font-medium text-muted-foreground mb-3">{t('settings:nachnahmeCodFee', 'Nachnahme (COD) Fee')}</h4>
                            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 w-fit">
                              <span className="text-sm font-medium">Nachnahme</span>
                              <span className="text-muted-foreground">+</span>
                              <Input
                                type="number"
                                value={parsedRates.nachnahme?.fee ?? 8.99}
                                onChange={(e) => updateRate('nachnahme', 'fee', parseFloat(e.target.value) || 0)}
                                onBlur={handleTextBlur('dhl_shipping_rates')}
                                className="w-20 h-8 text-sm"
                                min="0"
                                step="0.01"
                                data-testid="input-dhl-nachnahme-fee"
                              />
                              <span className="text-sm text-muted-foreground">EUR</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              Fee added for cash on delivery shipments
                            </p>
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </CardContent>
            </Card>

            {/* Carrier Configuration */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Globe className="h-4 w-4 sm:h-5 sm:w-5" />
                  {t('settings:dhlDeCarrierConfiguration', 'DHL DE Carrier Configuration')}
                </CardTitle>
                <CardDescription className="text-sm">{t('settings:dhlDeCarrierConfigurationDescription', 'Configure DHL Germany carrier settings')}</CardDescription>
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
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            handleCheckboxChange('dhl_enable_auto_label')(checked as boolean);
                          }}
                          data-testid="checkbox-dhl_enable_auto_label"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>{t('settings:enableAutoLabelGenerationLabel', 'Enable Auto Label Generation')}</FormLabel>
                        <FormDescription>
                          {t('settings:enableAutoLabelGenerationDescriptionDhl', 'Automatically generate shipping labels for DHL shipments')}
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* DHL DE Sender Address - Always at bottom */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  {t('settings:dhlDeSenderAddressTitle', 'DHL DE Sender Address')}
                </CardTitle>
                <CardDescription className="text-sm">{t('settings:dhlDeSenderAddressDescription', 'Default sender address for DHL Germany shipments')}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <FormField
                  control={form.control}
                  name="dhl_default_sender_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('settings:senderAddressJsonLabel', 'Sender Address (JSON)')}</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            markPendingChange('dhl_default_sender_address');
                          }}
                          onBlur={handleTextBlur('dhl_default_sender_address')}
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
                        {t('settings:senderAddressJsonDescriptionDhl', 'Enter sender address in JSON format for DHL shipments')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* DHL Default Shipping Price */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
                  {t('settings:dhlDefaultShippingPrice', 'DHL Default Shipping Price')}
                </CardTitle>
                <CardDescription className="text-sm">{t('settings:dhlDefaultShippingPriceDescription', 'Default shipping price for DHL Germany orders')}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <FormField
                  control={form.control}
                  name="dhl_default_shipping_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('settings:defaultShippingPriceEur', 'Default Shipping Price (EUR)')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            markPendingChange('dhl_default_shipping_price');
                          }}
                          onBlur={handleTextBlur('dhl_default_shipping_price')}
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0"
                          data-testid="input-dhl_default_shipping_price"
                        />
                      </FormControl>
                      <FormDescription>{t('settings:defaultShippingPriceAutoApplyDescription', 'This price will be automatically applied to new orders')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                  {t('settings:defaultCarrierForCountry', 'Default Carrier for Country')}
                </CardTitle>
                <CardDescription className="text-sm">
                  {t('settings:defaultCarrierForCountryDescription', 'Set which carrier to use for each country')}
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
                      markPendingChange('country_carrier_mapping');
                    };
                    
                    const removeMapping = (country: string) => {
                      const newMapping = { ...parsedMapping };
                      delete newMapping[country];
                      field.onChange(JSON.stringify(newMapping, null, 2));
                      markPendingChange('country_carrier_mapping');
                    };
                    
                    const countries = [
                      { code: 'CZ', name: t('settings:countryCzechRepublic', 'Czech Republic'), flag: '🇨🇿' },
                      { code: 'DE', name: t('settings:countryGermany', 'Germany'), flag: '🇩🇪' },
                      { code: 'AT', name: t('settings:countryAustria', 'Austria'), flag: '🇦🇹' },
                      { code: 'SK', name: t('settings:countrySlovakia', 'Slovakia'), flag: '🇸🇰' },
                      { code: 'PL', name: t('settings:countryPoland', 'Poland'), flag: '🇵🇱' },
                      { code: 'HU', name: t('settings:countryHungary', 'Hungary'), flag: '🇭🇺' },
                      { code: 'NL', name: t('settings:countryNetherlands', 'Netherlands'), flag: '🇳🇱' },
                      { code: 'BE', name: t('settings:countryBelgium', 'Belgium'), flag: '🇧🇪' },
                      { code: 'FR', name: t('settings:countryFrance', 'France'), flag: '🇫🇷' },
                      { code: 'IT', name: t('settings:countryItaly', 'Italy'), flag: '🇮🇹' },
                      { code: 'ES', name: t('settings:countrySpain', 'Spain'), flag: '🇪🇸' },
                      { code: 'PT', name: t('settings:countryPortugal', 'Portugal'), flag: '🇵🇹' },
                      { code: 'GB', name: t('settings:countryUnitedKingdom', 'United Kingdom'), flag: '🇬🇧' },
                      { code: 'CH', name: t('settings:countrySwitzerland', 'Switzerland'), flag: '🇨🇭' },
                      { code: 'SI', name: t('settings:countrySlovenia', 'Slovenia'), flag: '🇸🇮' },
                      { code: 'HR', name: t('settings:countryCroatia', 'Croatia'), flag: '🇭🇷' },
                      { code: 'RO', name: t('settings:countryRomania', 'Romania'), flag: '🇷🇴' },
                      { code: 'BG', name: t('settings:countryBulgaria', 'Bulgaria'), flag: '🇧🇬' },
                    ];
                    
                    const carriers = ['PPL CZ', 'GLS DE', 'DHL DE'];
                    const usedCountries = Object.keys(parsedMapping);
                    const availableCountries = countries.filter(c => !usedCountries.includes(c.code));
                    
                    return (
                      <FormItem>
                        <div className="space-y-3">
                          {Object.entries(parsedMapping).map(([countryCode, carrier]) => {
                            const country = countries.find(c => c.code.toUpperCase() === countryCode.toUpperCase());
                            return (
                              <div key={countryCode} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                                <span className="text-xl">{country?.flag || '🌍'}</span>
                                <span className="font-medium min-w-[120px]">{country?.name || countryCode}</span>
                                <span className="text-muted-foreground">→</span>
                                <Select 
                                  value={carrier as string} 
                                  onValueChange={(value) => {
                                    updateMapping(countryCode, value);
                                    handleSelectChange('country_carrier_mapping')(form.getValues('country_carrier_mapping'));
                                  }}
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
                                onValueChange={(countryCode) => {
                                  updateMapping(countryCode, 'PPL CZ');
                                  handleSelectChange('country_carrier_mapping')(form.getValues('country_carrier_mapping'));
                                }}
                              >
                                <SelectTrigger className="w-full" data-testid="select-add-country">
                                  <SelectValue placeholder={t('settings:addCountryPlaceholder', 'Add a country...')} />
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
                          {t('settings:countryCarrierMappingDescription', 'Configure default carrier for each destination country')}
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
                  {t('settings:quickSelectButtonsTitle', 'Quick Select Buttons')}
                </CardTitle>
                <CardDescription className="text-sm">{t('settings:quickSelectButtonsDescription', 'Configure quick shipping price buttons')}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <FormField
                  control={form.control}
                  name="quick_select_czk"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('settings:quickSelectCzkLabel', 'Quick Select CZK')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            markPendingChange('quick_select_czk');
                          }}
                          onBlur={handleTextBlur('quick_select_czk')}
                          placeholder="0,100,150,250"
                          data-testid="input-quick_select_czk"
                        />
                      </FormControl>
                      <FormDescription>{t('settings:quickSelectCzkDescription', 'Comma-separated values for CZK quick select buttons')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quick_select_eur"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('settings:quickSelectEurLabel', 'Quick Select EUR')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            markPendingChange('quick_select_eur');
                          }}
                          onBlur={handleTextBlur('quick_select_eur')}
                          placeholder="0,5,10,13,15,20"
                          data-testid="input-quick_select_eur"
                        />
                      </FormControl>
                      <FormDescription>{t('settings:quickSelectEurDescription', 'Comma-separated values for EUR quick select buttons')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="available_carriers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('settings:availableCarriersLabel', 'Available Carriers')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            markPendingChange('available_carriers');
                          }}
                          onBlur={handleTextBlur('available_carriers')}
                          placeholder={t('settings:availableCarriersPlaceholder', 'GLS DE,PPL CZ,DHL DE')}
                          data-testid="input-available_carriers"
                        />
                      </FormControl>
                      <FormDescription>{t('settings:availableCarriersListDescription', 'Comma-separated list of available carriers')}</FormDescription>
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
                  {t('settings:shippingCostsTitle', 'Shipping Costs')}
                </CardTitle>
                <CardDescription className="text-sm">{t('settings:shippingCostsDescription', 'Configure default shipping costs and thresholds')}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                {/* EUR Row */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded">EUR</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="default_shipping_cost_eur"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('settings:defaultShippingCostEur', 'Default Shipping Cost (EUR)')}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                markPendingChange('default_shipping_cost_eur');
                              }}
                              onBlur={handleTextBlur('default_shipping_cost_eur')}
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0"
                              data-testid="input-default_shipping_cost_eur"
                            />
                          </FormControl>
                          <FormDescription>{t('settings:defaultCostEurDescription', 'Default shipping cost in EUR')}</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="free_shipping_threshold_eur"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('settings:freeShippingThresholdEur', 'Free Shipping Threshold (EUR)')}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                markPendingChange('free_shipping_threshold_eur');
                              }}
                              onBlur={handleTextBlur('free_shipping_threshold_eur')}
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0"
                              data-testid="input-free_shipping_threshold_eur"
                            />
                          </FormControl>
                          <FormDescription>{t('settings:freeShippingEurDescription', 'Order value for free shipping in EUR')}</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* CZK Row */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-0.5 rounded">CZK</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="default_shipping_cost_czk"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('settings:defaultShippingCostCzk', 'Default Shipping Cost (CZK)')}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                markPendingChange('default_shipping_cost_czk');
                              }}
                              onBlur={handleTextBlur('default_shipping_cost_czk')}
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0"
                              data-testid="input-default_shipping_cost_czk"
                            />
                          </FormControl>
                          <FormDescription>{t('settings:defaultCostCzkDescription', 'Default shipping cost in CZK')}</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="free_shipping_threshold_czk"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('settings:freeShippingThresholdCzk', 'Free Shipping Threshold (CZK)')}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                markPendingChange('free_shipping_threshold_czk');
                              }}
                              onBlur={handleTextBlur('free_shipping_threshold_czk')}
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0"
                              data-testid="input-free_shipping_threshold_czk"
                            />
                          </FormControl>
                          <FormDescription>{t('settings:freeShippingCzkDescription', 'Order value for free shipping in CZK')}</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="volumetric_weight_divisor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('settings:volumetricWeightDivisorLabel', 'Volumetric Weight Divisor')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            markPendingChange('volumetric_weight_divisor');
                          }}
                          onBlur={handleTextBlur('volumetric_weight_divisor')}
                          type="number"
                          min="1"
                          placeholder="5000"
                          data-testid="input-volumetric_weight_divisor"
                        />
                      </FormControl>
                      <FormDescription>
                        {t('settings:volumetricWeightDivisorDescription', 'Divisor for calculating volumetric weight (L×W×H/divisor)')}
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
                  {t('settings:labelGenerationTitle', 'Label Generation')}
                </CardTitle>
                <CardDescription className="text-sm">{t('settings:labelGenerationDescription', 'Configure shipping label generation settings')}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="default_label_size"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:defaultLabelSizeLabel', 'Default Label Size')}</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleSelectChange('default_label_size')(value);
                          }} 
                          value={field.value}
                        >
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
                        <FormLabel>{t('settings:labelFormatLabel', 'Label Format')}</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleSelectChange('label_format')(value);
                          }} 
                          value={field.value}
                        >
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
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            handleCheckboxChange('auto_print_labels')(checked as boolean);
                          }}
                          data-testid="checkbox-auto_print_labels"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>{t('settings:autoPrintLabelsLabel', 'Auto Print Labels')}</FormLabel>
                        <FormDescription>
                          {t('settings:autoPrintLabelsDescription', 'Automatically print labels when generated')}
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
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            handleCheckboxChange('include_packing_slip')(checked as boolean);
                          }}
                          data-testid="checkbox-include_packing_slip"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>{t('settings:includePackingSlipLabel', 'Include Packing Slip')}</FormLabel>
                        <FormDescription>
                          {t('settings:includePackingSlipDescription', 'Include packing slip with shipment')}
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
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            handleCheckboxChange('include_invoice')(checked as boolean);
                          }}
                          data-testid="checkbox-include_invoice"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>{t('settings:includeInvoiceLabel', 'Include Invoice')}</FormLabel>
                        <FormDescription>
                          {t('settings:includeInvoiceDescription', 'Include invoice with shipment')}
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
                  {t('settings:trackingSettingsTitle', 'Tracking Settings')}
                </CardTitle>
                <CardDescription className="text-sm">{t('settings:trackingSettingsDescription', 'Configure shipment tracking and notifications')}</CardDescription>
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
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            handleCheckboxChange('enable_tracking')(checked as boolean);
                          }}
                          data-testid="checkbox-enable_tracking"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>{t('settings:enableTrackingLabel', 'Enable Tracking')}</FormLabel>
                        <FormDescription>
                          {t('settings:enableTrackingDescription', 'Enable shipment tracking for orders')}
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
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            handleCheckboxChange('auto_update_tracking_status')(checked as boolean);
                          }}
                          data-testid="checkbox-auto_update_tracking_status"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>{t('settings:autoUpdateTrackingStatusLabel', 'Auto Update Tracking Status')}</FormLabel>
                        <FormDescription>
                          {t('settings:autoUpdateTrackingStatusDescriptionAlt', 'Automatically update tracking status')}
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
                      <FormLabel>{t('settings:trackingUpdateFrequencyLabel', 'Tracking Update Frequency (hours)')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            markPendingChange('tracking_update_frequency_hours');
                          }}
                          onBlur={handleTextBlur('tracking_update_frequency_hours')}
                          type="number"
                          min="1"
                          max="24"
                          placeholder="6"
                          data-testid="input-tracking_update_frequency_hours"
                        />
                      </FormControl>
                      <FormDescription>{t('settings:trackingUpdateFrequencyDescription', 'How often to check for tracking updates')}</FormDescription>
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
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            handleCheckboxChange('send_tracking_email_to_customer')(checked as boolean);
                          }}
                          data-testid="checkbox-send_tracking_email_to_customer"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>{t('settings:sendTrackingEmailLabel', 'Send Tracking Email')}</FormLabel>
                        <FormDescription>
                          {t('settings:sendTrackingEmailDescription', 'Send tracking email to customer')}
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
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            handleCheckboxChange('include_estimated_delivery')(checked as boolean);
                          }}
                          data-testid="checkbox-include_estimated_delivery"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>{t('settings:includeEstimatedDeliveryLabel', 'Include Estimated Delivery')}</FormLabel>
                        <FormDescription>
                          {t('settings:includeEstimatedDeliveryDescription', 'Include estimated delivery date in tracking')}
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Sticky Action Bar */}
        <div className="sticky bottom-0 bg-white dark:bg-slate-950 border-t pt-4 pb-2 -mx-1 px-1 sm:px-0 sm:mx-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm">
              {saveStatus === 'saving' && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-muted-foreground">{t('settings:saving', 'Saving...')}</span>
                </>
              )}
              {saveStatus === 'saved' && (
                <>
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">{t('settings:saved', 'Saved')}</span>
                </>
              )}
              {saveStatus === 'error' && (
                <span className="text-destructive">{t('settings:saveFailed', 'Save failed')}</span>
              )}
              {saveStatus === 'idle' && lastSavedAt && (
                <span className="text-muted-foreground text-xs">
                  {t('settings:lastSaved', 'Last saved')}: {lastSavedAt.toLocaleTimeString()}
                </span>
              )}
              {saveStatus === 'idle' && hasPendingChanges && (
                <span className="text-amber-600">{t('settings:unsavedChanges', 'Unsaved changes')}</span>
              )}
            </div>
            
            <Button 
              type="button"
              variant={hasPendingChanges ? "default" : "outline"}
              onClick={() => saveAllPending()}
              disabled={saveMutation.isPending || !hasPendingChanges}
              className="w-full sm:w-auto min-h-[44px]" 
              data-testid="button-save"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('settings:savingSettings', 'Saving Settings...')}
                </>
              ) : hasPendingChanges ? (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {t('settings:saveChanges', 'Save Changes')}
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {t('settings:allSaved', 'All Saved')}
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
