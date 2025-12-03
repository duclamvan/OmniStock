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
import { DollarSign, Save, Loader2, Percent, CreditCard, Receipt, BookOpen, Plus, X, Edit2, Tag, Wallet, Check, Trash2 } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { useSettingsAutosave, SaveStatus } from "@/hooks/useSettingsAutosave";

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

export default function FinancialSettings() {
  const { t } = useTranslation(['settings', 'common', 'financial']);
  const { toast } = useToast();
  const { financialSettings, isLoading } = useSettings();
  const [originalSettings, setOriginalSettings] = useState<Partial<FormValues>>({});
  
  // Expense category management state (local state synced with financialSettings)
  const [expenseCategories, setExpenseCategories] = useState<string[]>(
    financialSettings.expenseCategories || []
  );
  const [newCategory, setNewCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryValue, setEditCategoryValue] = useState('');

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
    category: 'financial',
    originalValues: originalSettings,
    getCurrentValue: (fieldName) => form.getValues(fieldName as keyof FormValues),
  });

  // Sync local expenseCategories with context when financialSettings changes
  useEffect(() => {
    if (financialSettings.expenseCategories) {
      setExpenseCategories(financialSettings.expenseCategories);
    }
  }, [financialSettings.expenseCategories]);

  // Expense category handlers
  const handleAddCategory = () => {
    if (!newCategory.trim()) {
      toast({
        variant: "destructive",
        title: t('common:error'),
        description: t('financial:categoryNameRequired'),
      });
      return;
    }
    
    if (expenseCategories.includes(newCategory.trim())) {
      toast({
        variant: "destructive",
        title: t('common:error'),
        description: t('financial:categoryAlreadyExists'),
      });
      return;
    }
    
    setExpenseCategories([...expenseCategories, newCategory.trim()]);
    setNewCategory('');
  };

  const handleEditCategory = (oldCategory: string) => {
    if (!editCategoryValue.trim()) {
      toast({
        variant: "destructive",
        title: t('common:error'),
        description: t('financial:categoryNameRequired'),
      });
      return;
    }
    
    if (editCategoryValue.trim() !== oldCategory && expenseCategories.includes(editCategoryValue.trim())) {
      toast({
        variant: "destructive",
        title: t('common:error'),
        description: t('financial:categoryAlreadyExists'),
      });
      return;
    }
    
    setExpenseCategories(
      expenseCategories.map(cat => cat === oldCategory ? editCategoryValue.trim() : cat)
    );
    setEditingCategory(null);
    setEditCategoryValue('');
  };

  const handleDeleteCategory = (category: string) => {
    setExpenseCategories(expenseCategories.filter(cat => cat !== category));
  };

  const handleSaveCategories = async () => {
    try {
      // Try to update first (PATCH), if setting doesn't exist, create it (POST)
      try {
        await apiRequest('PATCH', '/api/settings/expense_categories', {
          value: expenseCategories,
          category: 'financial'
        });
      } catch (patchError: any) {
        // If setting doesn't exist (404), create it with POST
        if (patchError.status === 404 || patchError.message?.includes('not found')) {
          await apiRequest('POST', '/api/settings', {
            key: 'expense_categories',
            value: expenseCategories,
            category: 'financial',
            description: 'Expense categories for tracking and reporting'
          });
        } else {
          throw patchError;
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      
      toast({
        title: t('common:success'),
        description: t('financial:categoriesSavedSuccessfully'),
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t('common:error'),
        description: error.message || t('financial:failedToSaveCategories'),
      });
    }
  };

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
        <Tabs defaultValue="pricing" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
            <TabsTrigger value="pricing" className="flex items-center gap-1 sm:gap-2">
              <Percent className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('settings:pricing')}</span>
            </TabsTrigger>
            <TabsTrigger value="tax" className="flex items-center gap-1 sm:gap-2">
              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('settings:taxVAT')}</span>
            </TabsTrigger>
            <TabsTrigger value="currency" className="flex items-center gap-1 sm:gap-2">
              <CreditCard className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('settings:currency')}</span>
            </TabsTrigger>
            <TabsTrigger value="invoicing" className="flex items-center gap-1 sm:gap-2">
              <Receipt className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('settings:invoicing')}</span>
            </TabsTrigger>
            <TabsTrigger value="accounting" className="flex items-center gap-1 sm:gap-2">
              <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('settings:accounting')}</span>
            </TabsTrigger>
            <TabsTrigger value="expenses" className="flex items-center gap-1 sm:gap-2">
              <Wallet className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('financial:expenseCategories')}</span>
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
                            onChange={(e) => {
                              field.onChange(e);
                              markPendingChange('default_markup_percentage');
                            }}
                            onBlur={handleTextBlur('default_markup_percentage')}
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
                            onChange={(e) => {
                              field.onChange(e);
                              markPendingChange('minimum_margin_percentage');
                            }}
                            onBlur={handleTextBlur('minimum_margin_percentage')}
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
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleSelectChange('price_rounding')(value);
                          }} 
                          value={field.value || ''}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-price_rounding">
                              <SelectValue placeholder={t('common:selectRounding')} />
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
                            onChange={(e) => {
                              field.onChange(e);
                              markPendingChange('default_vat_rate');
                            }}
                            onBlur={handleTextBlur('default_vat_rate')}
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
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            handleCheckboxChange('show_prices_with_vat')(checked as boolean);
                          }}
                          data-testid="checkbox-show_prices_with_vat"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>{t('settings:showPricesWithVatLabel')}</FormLabel>
                        <FormDescription>
                          {t('settings:showPricesWithVatDescription')}
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
                  {t('settings:taxVatConfigurationCard')}
                </CardTitle>
                <CardDescription className="text-sm">{t('settings:taxVatConfigurationCardDescription')}</CardDescription>
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
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            handleCheckboxChange('enable_vat')(checked as boolean);
                          }}
                          data-testid="checkbox-enable_vat"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>{t('settings:enableVatLabel')}</FormLabel>
                        <FormDescription>
                          {t('settings:enableVatDescription')}
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
                      <FormLabel>{t('settings:vatRegistrationNumberLabel')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ''}
                          placeholder={t('settings:vatRegistrationNumberPlaceholder')}
                          data-testid="input-vat_registration_number"
                          onChange={(e) => {
                            field.onChange(e);
                            markPendingChange('vat_registration_number');
                          }}
                          onBlur={handleTextBlur('vat_registration_number')}
                        />
                      </FormControl>
                      <FormDescription>{t('settings:vatRegistrationNumberDescription')}</FormDescription>
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
                        <FormLabel>{t('settings:defaultTaxRateCzkLabel')}</FormLabel>
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
                            onChange={(e) => {
                              field.onChange(e);
                              markPendingChange('default_tax_rate_czk');
                            }}
                            onBlur={handleTextBlur('default_tax_rate_czk')}
                          />
                        </FormControl>
                        <FormDescription>{t('settings:taxRatePercentageDescription')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="default_tax_rate_eur"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:defaultTaxRateEurLabel')}</FormLabel>
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
                            onChange={(e) => {
                              field.onChange(e);
                              markPendingChange('default_tax_rate_eur');
                            }}
                            onBlur={handleTextBlur('default_tax_rate_eur')}
                          />
                        </FormControl>
                        <FormDescription>{t('settings:taxRatePercentageDescription')}</FormDescription>
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
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            handleCheckboxChange('reverse_charge_mechanism')(checked as boolean);
                          }}
                          data-testid="checkbox-reverse_charge_mechanism"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>{t('settings:reverseChargeMechanismLabel')}</FormLabel>
                        <FormDescription>
                          {t('settings:reverseChargeMechanismDescription')}
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
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            handleCheckboxChange('oss_scheme_enabled')(checked as boolean);
                          }}
                          data-testid="checkbox-oss_scheme_enabled"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>{t('settings:ossSchemeEnabledLabel')}</FormLabel>
                        <FormDescription>
                          {t('settings:ossSchemeEnabledDescription')}
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
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            handleCheckboxChange('auto_apply_tax')(checked as boolean);
                          }}
                          data-testid="checkbox-auto_apply_tax"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>{t('settings:autoApplyTaxLabel')}</FormLabel>
                        <FormDescription>
                          {t('settings:autoApplyTaxDescription')}
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
                  {t('settings:currencyExchangeCard')}
                </CardTitle>
                <CardDescription className="text-sm">{t('settings:currencyExchangeCardDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="base_currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:baseCurrencyLabel')}</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleSelectChange('base_currency')(value);
                          }} 
                          value={field.value || ''}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-base_currency">
                              <SelectValue placeholder={t('common:selectBaseCurrency')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="CZK">CZK</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>{t('settings:baseCurrencyDescription')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="exchange_rate_api_source"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:exchangeRateSourceLabel')}</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleSelectChange('exchange_rate_api_source')(value);
                          }} 
                          value={field.value || ''}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-exchange_rate_api_source">
                              <SelectValue placeholder={t('common:selectSource')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ECB">European Central Bank (ECB)</SelectItem>
                            <SelectItem value="Frankfurter">Frankfurter API</SelectItem>
                            <SelectItem value="Manual">Manual Entry</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>{t('settings:exchangeRateSourceDescription')}</FormDescription>
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
                      <FormLabel>{t('settings:exchangeRateUpdateFrequencyLabel')}</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleSelectChange('exchange_rate_update_frequency')(value);
                        }} 
                        value={field.value || ''}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-exchange_rate_update_frequency">
                            <SelectValue placeholder={t('common:selectFrequency')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="hourly">Hourly</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>{t('settings:exchangeRateUpdateFrequencyDescription')}</FormDescription>
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
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            handleCheckboxChange('auto_update_exchange_rates')(checked as boolean);
                          }}
                          data-testid="checkbox-auto_update_exchange_rates"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>{t('settings:autoUpdateExchangeRatesLabel')}</FormLabel>
                        <FormDescription>
                          {t('settings:autoUpdateExchangeRatesDescription')}
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
                      <FormLabel>{t('settings:legacyExchangeRateApiSourceLabel')}</FormLabel>
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
                        {t('settings:legacyExchangeRateApiSourceDescription')}
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
                  {t('settings:invoicingBilling')}
                </CardTitle>
                <CardDescription className="text-sm">{t('settings:invoicingBillingDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="invoice_number_prefix"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:invoiceNumberPrefixLabel')}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ''}
                            placeholder={t('settings:invoiceNumberPrefixPlaceholder')}
                            data-testid="input-invoice_number_prefix"
                            onChange={(e) => {
                              field.onChange(e);
                              markPendingChange('invoice_number_prefix');
                            }}
                            onBlur={handleTextBlur('invoice_number_prefix')}
                          />
                        </FormControl>
                        <FormDescription>{t('settings:invoiceNumberPrefixDescription')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="invoice_number_format"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:invoiceNumberFormatLabel')}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ''}
                            placeholder={t('settings:invoiceNumberFormatPlaceholder')}
                            data-testid="input-invoice_number_format"
                            onChange={(e) => {
                              field.onChange(e);
                              markPendingChange('invoice_number_format');
                            }}
                            onBlur={handleTextBlur('invoice_number_format')}
                          />
                        </FormControl>
                        <FormDescription>{t('settings:invoiceNumberFormatDescription')}</FormDescription>
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
                        <FormLabel>{t('settings:nextInvoiceNumberLabel')}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ''}
                            type="number"
                            min="1"
                            placeholder="1"
                            data-testid="input-next_invoice_number"
                            onChange={(e) => {
                              field.onChange(e);
                              markPendingChange('next_invoice_number');
                            }}
                            onBlur={handleTextBlur('next_invoice_number')}
                          />
                        </FormControl>
                        <FormDescription>{t('settings:nextInvoiceNumberDescription')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="payment_terms_days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:paymentTermsDaysLabel')}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ''}
                            type="number"
                            min="0"
                            placeholder="14"
                            data-testid="input-payment_terms_days"
                            onChange={(e) => {
                              field.onChange(e);
                              markPendingChange('payment_terms_days');
                            }}
                            onBlur={handleTextBlur('payment_terms_days')}
                          />
                        </FormControl>
                        <FormDescription>{t('settings:paymentTermsDaysDescription')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="late_payment_fee_percentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:latePaymentFeePercentageLabel')}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ''}
                            type="number"
                            min="0"
                            step="0.1"
                            placeholder="0"
                            data-testid="input-late_payment_fee_percentage"
                            onChange={(e) => {
                              field.onChange(e);
                              markPendingChange('late_payment_fee_percentage');
                            }}
                            onBlur={handleTextBlur('late_payment_fee_percentage')}
                          />
                        </FormControl>
                        <FormDescription>{t('settings:latePaymentFeePercentageDescription')}</FormDescription>
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
                  {t('settings:accountingTitle')}
                </CardTitle>
                <CardDescription className="text-sm">{t('settings:accountingDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="fiscal_year_start"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:fiscalYearStartLabel')}</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleSelectChange('fiscal_year_start')(value);
                          }} 
                          value={field.value || ''}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-fiscal_year_start">
                              <SelectValue placeholder={t('common:selectMonth')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month) => (
                              <SelectItem key={month} value={month}>{month}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>{t('settings:fiscalYearStartDescription')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cost_calculation_method"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:costCalculationMethodLabel')}</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleSelectChange('cost_calculation_method')(value);
                          }} 
                          value={field.value || ''}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-cost_calculation_method">
                              <SelectValue placeholder={t('common:selectMethod')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="FIFO">FIFO (First In, First Out)</SelectItem>
                            <SelectItem value="LIFO">LIFO (Last In, First Out)</SelectItem>
                            <SelectItem value="Average">Average Cost</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>{t('settings:costCalculationMethodDescription')}</FormDescription>
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
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            handleCheckboxChange('include_shipping_in_cogs')(checked as boolean);
                          }}
                          data-testid="checkbox-include_shipping_in_cogs"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>{t('settings:includeShippingInCogsLabel')}</FormLabel>
                        <FormDescription>
                          {t('settings:includeShippingInCogsDescription')}
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
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            handleCheckboxChange('track_expenses_by_category')(checked as boolean);
                          }}
                          data-testid="checkbox-track_expenses_by_category"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>{t('settings:trackExpensesByCategoryLabel')}</FormLabel>
                        <FormDescription>
                          {t('settings:trackExpensesByCategoryDescription')}
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 6: Expense Categories */}
          <TabsContent value="expenses" className="space-y-4">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Wallet className="h-4 w-4 sm:h-5 sm:w-5" />
                  {t('financial:expenseCategories')}
                </CardTitle>
                <CardDescription className="text-sm">
                  {t('financial:manageCategoriesDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-4">
                {/* Add new category */}
                <div className="flex gap-2">
                  <Input
                    placeholder={t('financial:newCategoryPlaceholder')}
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
                    data-testid="input-new-category"
                  />
                  <Button 
                    type="button" 
                    onClick={handleAddCategory}
                    data-testid="button-add-category"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('common:add')}
                  </Button>
                </div>

                {/* List of categories */}
                <div className="space-y-2">
                  {expenseCategories.map((category) => (
                    <div 
                      key={category}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                      data-testid={`category-item-${category}`}
                    >
                      {editingCategory === category ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            value={editCategoryValue}
                            onChange={(e) => setEditCategoryValue(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleEditCategory(category)}
                            className="flex-1"
                            data-testid="input-edit-category"
                          />
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleEditCategory(category)}
                            data-testid="button-confirm-edit"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingCategory(null);
                              setEditCategoryValue('');
                            }}
                            data-testid="button-cancel-edit"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span className="font-medium">{category}</span>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingCategory(category);
                                setEditCategoryValue(category);
                              }}
                              data-testid={`button-edit-${category}`}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteCategory(category)}
                              data-testid={`button-delete-${category}`}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>

                {/* Save categories button */}
                <div className="flex justify-end pt-4">
                  <Button
                    type="button"
                    onClick={handleSaveCategories}
                    data-testid="button-save-categories"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {t('financial:saveCategories')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Sticky Action Bar with Save Status */}
        <div className="sticky bottom-0 bg-white dark:bg-slate-950 border-t pt-4 pb-2 -mx-1 px-1 sm:px-0 sm:mx-0">
          <div className="flex items-center justify-between gap-4">
            {/* Save Status Indicator */}
            <div className="flex items-center gap-2 text-sm">
              {saveStatus === 'saving' && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-muted-foreground">{t('settings:saving')}</span>
                </>
              )}
              {saveStatus === 'saved' && (
                <>
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">{t('settings:saved')}</span>
                </>
              )}
              {saveStatus === 'error' && (
                <span className="text-destructive">{t('settings:saveFailed')}</span>
              )}
              {saveStatus === 'idle' && lastSavedAt && (
                <span className="text-muted-foreground text-xs">
                  {t('settings:lastSaved')}: {lastSavedAt.toLocaleTimeString()}
                </span>
              )}
              {saveStatus === 'idle' && hasPendingChanges && (
                <span className="text-amber-600">{t('settings:unsavedChanges')}</span>
              )}
            </div>
            
            {/* Manual Save All Button (for text inputs) */}
            <Button 
              type="button"
              variant={hasPendingChanges ? "default" : "outline"}
              onClick={() => saveAllPending()}
              disabled={!hasPendingChanges}
              className="min-h-[44px]" 
              data-testid="button-save"
            >
              {hasPendingChanges ? (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {t('settings:saveChanges')}
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {t('settings:allSaved')}
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
