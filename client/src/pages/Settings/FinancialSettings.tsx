import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DollarSign, Save, Loader2, Percent, CreditCard, Receipt, BookOpen } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { camelToSnake, deepCamelToSnake } from "@/utils/caseConverters";

const formSchema = z.object({
  // Pricing
  default_markup_percentage: z.preprocess(
    (val) => val === '' || val === null || val === undefined ? undefined : val,
    z.coerce.number().min(0).optional()
  ),
  minimum_margin_percentage: z.preprocess(
    (val) => val === '' || val === null || val === undefined ? undefined : val,
    z.coerce.number().min(0).optional()
  ),
  price_rounding: z.enum(['none', '0.50', '1.00', '5.00', '10.00']).optional(),
  show_prices_with_vat: z.boolean().optional(),
  default_vat_rate: z.preprocess(
    (val) => val === '' || val === null || val === undefined ? undefined : val,
    z.coerce.number().min(0).max(100).optional()
  ),
  
  // Tax & VAT
  enable_vat: z.boolean().optional(),
  vat_registration_number: z.string().optional(),
  default_tax_rate_czk: z.preprocess(
    (val) => val === '' || val === null || val === undefined ? undefined : val,
    z.coerce.number().min(0).max(100).optional()
  ),
  default_tax_rate_eur: z.preprocess(
    (val) => val === '' || val === null || val === undefined ? undefined : val,
    z.coerce.number().min(0).max(100).optional()
  ),
  reverse_charge_mechanism: z.boolean().optional(),
  oss_scheme_enabled: z.boolean().optional(),
  auto_apply_tax: z.boolean().optional(),
  
  // Currency
  base_currency: z.enum(['CZK', 'EUR', 'USD']).optional(),
  auto_update_exchange_rates: z.boolean().optional(),
  exchange_rate_api_source: z.enum(['ECB', 'Frankfurter', 'Manual']).optional(),
  exchange_rate_update_frequency: z.enum(['hourly', 'daily', 'weekly']).optional(),
  exchange_rate_source: z.string().optional(),
  
  // Invoicing
  invoice_number_prefix: z.string().optional(),
  invoice_number_format: z.string().optional(),
  next_invoice_number: z.preprocess(
    (val) => val === '' || val === null || val === undefined ? undefined : val,
    z.coerce.number().min(1).optional()
  ),
  payment_terms_days: z.preprocess(
    (val) => val === '' || val === null || val === undefined ? undefined : val,
    z.coerce.number().min(0).optional()
  ),
  late_payment_fee_percentage: z.preprocess(
    (val) => val === '' || val === null || val === undefined ? undefined : val,
    z.coerce.number().min(0).optional()
  ),
  
  // Accounting
  fiscal_year_start: z.enum(['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']).optional(),
  cost_calculation_method: z.enum(['FIFO', 'LIFO', 'Average']).optional(),
  include_shipping_in_cogs: z.boolean().optional(),
  track_expenses_by_category: z.boolean().optional(),
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

export default function FinancialSettings() {
  const { t } = useTranslation(['settings', 'common']);
  const { toast } = useToast();
  const { financialSettings, isLoading } = useSettings();
  const [originalSettings, setOriginalSettings] = useState<Partial<FormValues>>({});

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      default_markup_percentage: financialSettings.defaultMarkupPercentage,
      minimum_margin_percentage: financialSettings.minimumMarginPercentage,
      price_rounding: financialSettings.priceRounding,
      show_prices_with_vat: financialSettings.showPricesWithVat,
      default_vat_rate: financialSettings.defaultVatRate,
      
      enable_vat: financialSettings.enableVat,
      vat_registration_number: financialSettings.vatRegistrationNumber,
      default_tax_rate_czk: financialSettings.defaultTaxRateCzk,
      default_tax_rate_eur: financialSettings.defaultTaxRateEur,
      reverse_charge_mechanism: financialSettings.reverseChargeMechanism,
      oss_scheme_enabled: financialSettings.ossSchemeEnabled,
      auto_apply_tax: financialSettings.autoApplyTax,
      
      base_currency: financialSettings.baseCurrency,
      auto_update_exchange_rates: financialSettings.autoUpdateExchangeRates,
      exchange_rate_api_source: financialSettings.exchangeRateApiSource,
      exchange_rate_update_frequency: financialSettings.exchangeRateUpdateFrequency,
      exchange_rate_source: financialSettings.exchangeRateSource,
      
      invoice_number_prefix: financialSettings.invoiceNumberPrefix,
      invoice_number_format: financialSettings.invoiceNumberFormat,
      next_invoice_number: financialSettings.nextInvoiceNumber,
      payment_terms_days: financialSettings.paymentTermsDays,
      late_payment_fee_percentage: financialSettings.latePaymentFeePercentage,
      
      fiscal_year_start: financialSettings.fiscalYearStart,
      cost_calculation_method: financialSettings.costCalculationMethod,
      include_shipping_in_cogs: financialSettings.includeShippingInCogs,
      track_expenses_by_category: financialSettings.trackExpensesByCategory,
    },
  });

  // Capture snapshot when settings load
  useEffect(() => {
    if (!isLoading) {
      const snapshot = {
        default_markup_percentage: financialSettings.defaultMarkupPercentage,
        minimum_margin_percentage: financialSettings.minimumMarginPercentage,
        price_rounding: financialSettings.priceRounding,
        show_prices_with_vat: financialSettings.showPricesWithVat,
        default_vat_rate: financialSettings.defaultVatRate,
        
        enable_vat: financialSettings.enableVat,
        vat_registration_number: financialSettings.vatRegistrationNumber,
        default_tax_rate_czk: financialSettings.defaultTaxRateCzk,
        default_tax_rate_eur: financialSettings.defaultTaxRateEur,
        reverse_charge_mechanism: financialSettings.reverseChargeMechanism,
        oss_scheme_enabled: financialSettings.ossSchemeEnabled,
        auto_apply_tax: financialSettings.autoApplyTax,
        
        base_currency: financialSettings.baseCurrency,
        auto_update_exchange_rates: financialSettings.autoUpdateExchangeRates,
        exchange_rate_api_source: financialSettings.exchangeRateApiSource,
        exchange_rate_update_frequency: financialSettings.exchangeRateUpdateFrequency,
        exchange_rate_source: financialSettings.exchangeRateSource,
        
        invoice_number_prefix: financialSettings.invoiceNumberPrefix,
        invoice_number_format: financialSettings.invoiceNumberFormat,
        next_invoice_number: financialSettings.nextInvoiceNumber,
        payment_terms_days: financialSettings.paymentTermsDays,
        late_payment_fee_percentage: financialSettings.latePaymentFeePercentage,
        
        fiscal_year_start: financialSettings.fiscalYearStart,
        cost_calculation_method: financialSettings.costCalculationMethod,
        include_shipping_in_cogs: financialSettings.includeShippingInCogs,
        track_expenses_by_category: financialSettings.trackExpensesByCategory,
      };
      setOriginalSettings(snapshot);
      form.reset(snapshot);
    }
  }, [isLoading, form, financialSettings]);

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
          category: 'financial' 
        });
      });
      
      await Promise.all(savePromises);
    },
    onSuccess: async () => {
      // Invalidate and refetch settings to get true persisted state
      await queryClient.invalidateQueries({ queryKey: ['/api/settings', 'financial'] });
      
      // The useEffect will automatically update originalSettings when new data loads
      toast({
        title: t('settings:settingsSaved'),
        description: t('settings:financialSettingsSavedSuccess'),
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
        <Tabs defaultValue="pricing" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-5">
            <TabsTrigger value="pricing" className="flex items-center gap-1 sm:gap-2">
              <Percent className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Pricing</span>
            </TabsTrigger>
            <TabsTrigger value="tax" className="flex items-center gap-1 sm:gap-2">
              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Tax & VAT</span>
            </TabsTrigger>
            <TabsTrigger value="currency" className="flex items-center gap-1 sm:gap-2">
              <CreditCard className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Currency</span>
            </TabsTrigger>
            <TabsTrigger value="invoicing" className="flex items-center gap-1 sm:gap-2">
              <Receipt className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Invoicing</span>
            </TabsTrigger>
            <TabsTrigger value="accounting" className="flex items-center gap-1 sm:gap-2">
              <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Accounting</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Pricing */}
          <TabsContent value="pricing" className="space-y-4">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Percent className="h-4 w-4 sm:h-5 sm:w-5" />
                  Pricing & Margins
                </CardTitle>
                <CardDescription className="text-sm">Configure pricing rules and margin settings</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="default_markup_percentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Markup Percentage (%)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ''}
                            type="number"
                            min="0"
                            step="0.1"
                            placeholder="30"
                            data-testid="input-default_markup_percentage"
                          />
                        </FormControl>
                        <FormDescription>Default markup for new products</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="minimum_margin_percentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum Margin Percentage (%)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ''}
                            type="number"
                            min="0"
                            step="0.1"
                            placeholder="10"
                            data-testid="input-minimum_margin_percentage"
                          />
                        </FormControl>
                        <FormDescription>Minimum acceptable margin</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price_rounding"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price Rounding</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-price_rounding">
                              <SelectValue placeholder="Select rounding" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="0.50">Round to 0.50</SelectItem>
                            <SelectItem value="1.00">Round to 1.00</SelectItem>
                            <SelectItem value="5.00">Round to 5.00</SelectItem>
                            <SelectItem value="10.00">Round to 10.00</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>Automatic price rounding</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="default_vat_rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default VAT Rate (%)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ''}
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            placeholder="21"
                            data-testid="input-default_vat_rate"
                          />
                        </FormControl>
                        <FormDescription>Default VAT rate for pricing</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="show_prices_with_vat"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value === true}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-show_prices_with_vat"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Show Prices With VAT</FormLabel>
                        <FormDescription>
                          Display prices including VAT by default
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Tax & VAT */}
          <TabsContent value="tax" className="space-y-4">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
                  Tax & VAT Configuration
                </CardTitle>
                <CardDescription className="text-sm">VAT and tax settings</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <FormField
                  control={form.control}
                  name="enable_vat"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value === true}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-enable_vat"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Enable VAT</FormLabel>
                        <FormDescription>
                          Enable VAT calculation and reporting
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vat_registration_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>VAT Registration Number</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ''}
                          placeholder="CZ12345678"
                          data-testid="input-vat_registration_number"
                        />
                      </FormControl>
                      <FormDescription>Your VAT registration number</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="default_tax_rate_czk"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Tax Rate for CZK (%)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value ?? ''}
                            type="number" 
                            min="0" 
                            max="100" 
                            step="0.01"
                            placeholder="21" 
                            data-testid="input-default_tax_rate_czk" 
                          />
                        </FormControl>
                        <FormDescription>Tax rate in percentage</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="default_tax_rate_eur"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Tax Rate for EUR (%)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value ?? ''}
                            type="number" 
                            min="0" 
                            max="100" 
                            step="0.01"
                            placeholder="19" 
                            data-testid="input-default_tax_rate_eur" 
                          />
                        </FormControl>
                        <FormDescription>Tax rate in percentage</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="reverse_charge_mechanism"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value === true}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-reverse_charge_mechanism"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Reverse Charge Mechanism</FormLabel>
                        <FormDescription>
                          Enable reverse charge for B2B transactions
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="oss_scheme_enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value === true}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-oss_scheme_enabled"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>OSS Scheme Enabled</FormLabel>
                        <FormDescription>
                          Enable One-Stop-Shop VAT scheme for EU
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="auto_apply_tax"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value === true}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-auto_apply_tax"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Auto-apply Tax</FormLabel>
                        <FormDescription>
                          Automatically apply tax rates to new orders based on currency
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Currency */}
          <TabsContent value="currency" className="space-y-4">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
                  Currency & Exchange
                </CardTitle>
                <CardDescription className="text-sm">Currency and exchange rate settings</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="base_currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base Currency</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-base_currency">
                              <SelectValue placeholder="Select base currency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="CZK">CZK</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>Default currency for the system</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="exchange_rate_api_source"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Exchange Rate Source</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-exchange_rate_api_source">
                              <SelectValue placeholder="Select source" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ECB">European Central Bank (ECB)</SelectItem>
                            <SelectItem value="Frankfurter">Frankfurter API</SelectItem>
                            <SelectItem value="Manual">Manual Entry</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>Source for exchange rates</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="exchange_rate_update_frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Exchange Rate Update Frequency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger data-testid="select-exchange_rate_update_frequency">
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="hourly">Hourly</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>How often to update exchange rates</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="auto_update_exchange_rates"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value === true}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-auto_update_exchange_rates"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Auto-update Exchange Rates</FormLabel>
                        <FormDescription>
                          Automatically fetch and update exchange rates
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="exchange_rate_source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Legacy Exchange Rate API Source</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={field.value ?? ''}
                          readOnly 
                          className="bg-slate-50 dark:bg-slate-900"
                          data-testid="input-exchange_rate_source" 
                        />
                      </FormControl>
                      <FormDescription>
                        Legacy field - Using Fawaz Ahmed's free currency exchange rate API
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4: Invoicing */}
          <TabsContent value="invoicing" className="space-y-4">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Receipt className="h-4 w-4 sm:h-5 sm:w-5" />
                  Invoicing & Billing
                </CardTitle>
                <CardDescription className="text-sm">Invoice numbering and payment settings</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="invoice_number_prefix"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invoice Number Prefix</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ''}
                            placeholder="INV-"
                            data-testid="input-invoice_number_prefix"
                          />
                        </FormControl>
                        <FormDescription>Prefix for invoice numbers</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="invoice_number_format"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invoice Number Format</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ''}
                            placeholder="INV-0001 or 2024-0001"
                            data-testid="input-invoice_number_format"
                          />
                        </FormControl>
                        <FormDescription>Format example for invoices</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="next_invoice_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Next Invoice Number</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ''}
                            type="number"
                            min="1"
                            placeholder="1"
                            data-testid="input-next_invoice_number"
                          />
                        </FormControl>
                        <FormDescription>Next sequential number</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="payment_terms_days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Terms (days)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ''}
                            type="number"
                            min="0"
                            placeholder="14"
                            data-testid="input-payment_terms_days"
                          />
                        </FormControl>
                        <FormDescription>Default payment terms</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="late_payment_fee_percentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Late Payment Fee (%)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ''}
                            type="number"
                            min="0"
                            step="0.1"
                            placeholder="0"
                            data-testid="input-late_payment_fee_percentage"
                          />
                        </FormControl>
                        <FormDescription>Fee for late payments</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 5: Accounting */}
          <TabsContent value="accounting" className="space-y-4">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
                  Accounting
                </CardTitle>
                <CardDescription className="text-sm">Accounting methods and fiscal year settings</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="fiscal_year_start"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fiscal Year Start</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-fiscal_year_start">
                              <SelectValue placeholder="Select month" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month) => (
                              <SelectItem key={month} value={month}>{month}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>Month when fiscal year begins</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cost_calculation_method"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cost Calculation Method</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-cost_calculation_method">
                              <SelectValue placeholder="Select method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="FIFO">FIFO (First In, First Out)</SelectItem>
                            <SelectItem value="LIFO">LIFO (Last In, First Out)</SelectItem>
                            <SelectItem value="Average">Average Cost</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>Inventory cost calculation method</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="include_shipping_in_cogs"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value === true}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-include_shipping_in_cogs"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Include Shipping in COGS</FormLabel>
                        <FormDescription>
                          Include shipping costs in Cost of Goods Sold
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="track_expenses_by_category"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value === true}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-track_expenses_by_category"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Track Expenses by Category</FormLabel>
                        <FormDescription>
                          Enable categorization of expenses for reporting
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
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
