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
        title: t('common:error', 'Error'),
        description: t('financial:categoryNameRequired', 'Category name is required'),
      });
      return;
    }
    
    if (expenseCategories.includes(newCategory.trim())) {
      toast({
        variant: "destructive",
        title: t('common:error', 'Error'),
        description: t('financial:categoryAlreadyExists', 'Category already exists'),
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
        title: t('common:error', 'Error'),
        description: t('financial:categoryNameRequired', 'Category name is required'),
      });
      return;
    }
    
    if (editCategoryValue.trim() !== oldCategory && expenseCategories.includes(editCategoryValue.trim())) {
      toast({
        variant: "destructive",
        title: t('common:error', 'Error'),
        description: t('financial:categoryAlreadyExists', 'Category already exists'),
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
        title: t('common:success', 'Success'),
        description: t('financial:categoriesSavedSuccessfully', 'Categories saved successfully'),
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t('common:error', 'Error'),
        description: error.message || t('financial:failedToSaveCategories', 'Failed to save categories'),
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
          <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0 pb-1">
            <TabsList className="inline-flex w-auto min-w-max sm:grid sm:w-full sm:grid-cols-3 lg:grid-cols-6 gap-1 p-1">
              <TabsTrigger value="pricing" className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm whitespace-nowrap min-h-[40px]">
                <Percent className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                {t('settings:pricing', 'Pricing')}
              </TabsTrigger>
              <TabsTrigger value="tax" className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm whitespace-nowrap min-h-[40px]">
                <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                {t('settings:taxVAT', 'Tax & VAT')}
              </TabsTrigger>
              <TabsTrigger value="currency" className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm whitespace-nowrap min-h-[40px]">
                <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                {t('settings:currency', 'Currency')}
              </TabsTrigger>
              <TabsTrigger value="invoicing" className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm whitespace-nowrap min-h-[40px]">
                <Receipt className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                {t('settings:invoicing', 'Invoicing')}
              </TabsTrigger>
              <TabsTrigger value="accounting" className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm whitespace-nowrap min-h-[40px]">
                <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                {t('settings:accounting', 'Accounting')}
              </TabsTrigger>
              <TabsTrigger value="expenses" className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm whitespace-nowrap min-h-[40px]">
                <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                {t('financial:expenseCategories', 'Expenses')}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab 1: Pricing */}
          <TabsContent value="pricing" className="space-y-4">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Percent className="h-4 w-4 sm:h-5 sm:w-5" />
                  {t('settings:pricingMarginsTitle', 'Pricing & Margins')}
                </CardTitle>
                <CardDescription className="text-sm">{t('settings:pricingAndMarginsDescription', 'Configure markup percentages and pricing rules')}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="default_markup_percentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:defaultMarkupPercentageLabel', 'Default Markup Percentage')}</FormLabel>
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
                        <FormDescription>{t('settings:defaultMarkupPercentageDescription', 'Default markup applied to product prices')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="minimum_margin_percentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:minimumMarginPercentageLabel', 'Minimum Margin Percentage')}</FormLabel>
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
                        <FormDescription>{t('settings:minimumMarginPercentageDescription', 'Minimum margin required on products')}</FormDescription>
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
                        <FormLabel>{t('settings:priceRoundingLabel', 'Price Rounding')}</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleSelectChange('price_rounding')(value);
                          }} 
                          value={field.value || ''}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-price_rounding">
                              <SelectValue placeholder={t('common:selectRounding', 'Select rounding')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">{t('settings:selectNone', 'None')}</SelectItem>
                            <SelectItem value="0.50">{t('settings:roundTo050', 'Round to 0.50')}</SelectItem>
                            <SelectItem value="1.00">{t('settings:roundTo100', 'Round to 1.00')}</SelectItem>
                            <SelectItem value="5.00">{t('settings:roundTo500', 'Round to 5.00')}</SelectItem>
                            <SelectItem value="10.00">{t('settings:roundTo1000', 'Round to 10.00')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>{t('settings:priceRoundingDescription', 'How prices should be rounded')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="default_vat_rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:defaultVatRateLabel', 'Default VAT Rate')}</FormLabel>
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
                        <FormDescription>{t('settings:defaultVatRateDescription', 'Default VAT rate applied to products')}</FormDescription>
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
                        <FormLabel>{t('settings:showPricesWithVatLabel', 'Show Prices with VAT')}</FormLabel>
                        <FormDescription>
                          {t('settings:showPricesWithVatDescription', 'Display prices including VAT by default')}
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
                  {t('settings:taxVatConfigurationCard', 'Tax & VAT Configuration')}
                </CardTitle>
                <CardDescription className="text-sm">{t('settings:taxVatConfigurationCardDescription', 'Configure tax and VAT settings')}</CardDescription>
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
                        <FormLabel>{t('settings:enableVatLabel', 'Enable VAT')}</FormLabel>
                        <FormDescription>
                          {t('settings:enableVatDescription', 'Enable VAT calculations for your business')}
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
                      <FormLabel>{t('settings:vatRegistrationNumberLabel', 'VAT Registration Number')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ''}
                          placeholder={t('settings:vatRegistrationNumberPlaceholder', 'e.g., CZ12345678')}
                          data-testid="input-vat_registration_number"
                          onChange={(e) => {
                            field.onChange(e);
                            markPendingChange('vat_registration_number');
                          }}
                          onBlur={handleTextBlur('vat_registration_number')}
                        />
                      </FormControl>
                      <FormDescription>{t('settings:vatRegistrationNumberDescription', 'Your VAT registration number')}</FormDescription>
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
                        <FormLabel>{t('settings:defaultTaxRateCzkLabel', 'Default Tax Rate (CZK)')}</FormLabel>
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
                        <FormDescription>{t('settings:taxRatePercentageDescription', 'Tax rate percentage')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="default_tax_rate_eur"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:defaultTaxRateEurLabel', 'Default Tax Rate (EUR)')}</FormLabel>
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
                        <FormDescription>{t('settings:taxRatePercentageDescription', 'Tax rate percentage')}</FormDescription>
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
                        <FormLabel>{t('settings:reverseChargeMechanismLabel', 'Reverse Charge Mechanism')}</FormLabel>
                        <FormDescription>
                          {t('settings:reverseChargeMechanismDescription', 'Enable reverse charge for B2B transactions')}
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
                        <FormLabel>{t('settings:ossSchemeEnabledLabel', 'OSS Scheme Enabled')}</FormLabel>
                        <FormDescription>
                          {t('settings:ossSchemeEnabledDescription', 'Enable One Stop Shop for EU cross-border sales')}
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
                        <FormLabel>{t('settings:autoApplyTaxLabel', 'Auto Apply Tax')}</FormLabel>
                        <FormDescription>
                          {t('settings:autoApplyTaxDescription', 'Automatically apply tax to new orders')}
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
                  {t('settings:currencyExchangeCard', 'Currency & Exchange Rates')}
                </CardTitle>
                <CardDescription className="text-sm">{t('settings:currencyExchangeCardDescription', 'Configure currency and exchange rate settings')}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="base_currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:baseCurrencyLabel', 'Base Currency')}</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleSelectChange('base_currency')(value);
                          }} 
                          value={field.value || ''}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-base_currency">
                              <SelectValue placeholder={t('common:selectBaseCurrency', 'Select base currency')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="CZK">CZK</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>{t('settings:baseCurrencyDescription', 'Primary currency for your business')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="exchange_rate_api_source"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:exchangeRateSourceLabel', 'Exchange Rate Source')}</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleSelectChange('exchange_rate_api_source')(value);
                          }} 
                          value={field.value || ''}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-exchange_rate_api_source">
                              <SelectValue placeholder={t('common:selectSource', 'Select source')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ECB">ECB</SelectItem>
                            <SelectItem value="Frankfurter">Frankfurter</SelectItem>
                            <SelectItem value="Manual">{t('settings:exchangeRateSourceManual', 'Manual')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>{t('settings:exchangeRateSourceDescription', 'Source for exchange rate data')}</FormDescription>
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
                      <FormLabel>{t('settings:exchangeRateUpdateFrequencyLabel', 'Exchange Rate Update Frequency')}</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleSelectChange('exchange_rate_update_frequency')(value);
                        }} 
                        value={field.value || ''}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-exchange_rate_update_frequency">
                            <SelectValue placeholder={t('common:selectFrequency', 'Select frequency')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="hourly">{t('settings:updateFrequencyHourly', 'Hourly')}</SelectItem>
                          <SelectItem value="daily">{t('settings:updateFrequencyDaily', 'Daily')}</SelectItem>
                          <SelectItem value="weekly">{t('settings:updateFrequencyWeekly', 'Weekly')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>{t('settings:exchangeRateUpdateFrequencyDescription', 'How often to update exchange rates')}</FormDescription>
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
                        <FormLabel>{t('settings:autoUpdateExchangeRatesLabel', 'Auto Update Exchange Rates')}</FormLabel>
                        <FormDescription>
                          {t('settings:autoUpdateExchangeRatesDescription', 'Automatically update exchange rates')}
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
                      <FormLabel>{t('settings:legacyExchangeRateApiSourceLabel', 'Legacy Exchange Rate API Source')}</FormLabel>
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
                        {t('settings:legacyExchangeRateApiSourceDescription', 'Legacy setting for exchange rate source')}
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
                  {t('settings:invoicingBilling', 'Invoicing & Billing')}
                </CardTitle>
                <CardDescription className="text-sm">{t('settings:invoicingBillingDescription', 'Configure invoice and billing settings')}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="invoice_number_prefix"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:invoiceNumberPrefixLabel', 'Invoice Number Prefix')}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ''}
                            placeholder={t('settings:invoiceNumberPrefixPlaceholder', 'e.g., INV-')}
                            data-testid="input-invoice_number_prefix"
                            onChange={(e) => {
                              field.onChange(e);
                              markPendingChange('invoice_number_prefix');
                            }}
                            onBlur={handleTextBlur('invoice_number_prefix')}
                          />
                        </FormControl>
                        <FormDescription>{t('settings:invoiceNumberPrefixDescription', 'Prefix for invoice numbers')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="invoice_number_format"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:invoiceNumberFormatLabel', 'Invoice Number Format')}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ''}
                            placeholder={t('settings:invoiceNumberFormatPlaceholder', 'e.g., {prefix}{year}-{number}')}
                            data-testid="input-invoice_number_format"
                            onChange={(e) => {
                              field.onChange(e);
                              markPendingChange('invoice_number_format');
                            }}
                            onBlur={handleTextBlur('invoice_number_format')}
                          />
                        </FormControl>
                        <FormDescription>{t('settings:invoiceNumberFormatDescription', 'Format for invoice numbers')}</FormDescription>
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
                        <FormLabel>{t('settings:nextInvoiceNumberLabel', 'Next Invoice Number')}</FormLabel>
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
                        <FormDescription>{t('settings:nextInvoiceNumberDescription', 'Next invoice number to be used')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="payment_terms_days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:paymentTermsDaysLabel', 'Payment Terms (Days)')}</FormLabel>
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
                        <FormDescription>{t('settings:paymentTermsDaysDescription', 'Default payment term in days')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="late_payment_fee_percentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:latePaymentFeePercentageLabel', 'Late Payment Fee Percentage')}</FormLabel>
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
                        <FormDescription>{t('settings:latePaymentFeePercentageDescription', 'Fee percentage for late payments')}</FormDescription>
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
                  {t('settings:accountingTitle', 'Accounting')}
                </CardTitle>
                <CardDescription className="text-sm">{t('settings:accountingDescription', 'Configure accounting and cost calculation settings')}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="fiscal_year_start"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:fiscalYearStartLabel', 'Fiscal Year Start')}</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleSelectChange('fiscal_year_start')(value);
                          }} 
                          value={field.value || ''}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-fiscal_year_start">
                              <SelectValue placeholder={t('common:selectMonth', 'Select month')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {[
                              { value: 'January', key: 'monthJanuary' },
                              { value: 'February', key: 'monthFebruary' },
                              { value: 'March', key: 'monthMarch' },
                              { value: 'April', key: 'monthApril' },
                              { value: 'May', key: 'monthMay' },
                              { value: 'June', key: 'monthJune' },
                              { value: 'July', key: 'monthJuly' },
                              { value: 'August', key: 'monthAugust' },
                              { value: 'September', key: 'monthSeptember' },
                              { value: 'October', key: 'monthOctober' },
                              { value: 'November', key: 'monthNovember' },
                              { value: 'December', key: 'monthDecember' },
                            ].map((month) => (
                              <SelectItem key={month.value} value={month.value}>{t(`settings:${month.key}`, month.value)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>{t('settings:fiscalYearStartDescription', 'Month when your fiscal year starts')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cost_calculation_method"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:costCalculationMethodLabel', 'Cost Calculation Method')}</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleSelectChange('cost_calculation_method')(value);
                          }} 
                          value={field.value || ''}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-cost_calculation_method">
                              <SelectValue placeholder={t('common:selectMethod', 'Select method')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="FIFO">{t('settings:costMethodFIFO', 'FIFO (First In First Out)')}</SelectItem>
                            <SelectItem value="LIFO">{t('settings:costMethodLIFO', 'LIFO (Last In First Out)')}</SelectItem>
                            <SelectItem value="Average">{t('settings:costMethodAverage', 'Average Cost')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>{t('settings:costCalculationMethodDescription', 'Method for calculating inventory costs')}</FormDescription>
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
                        <FormLabel>{t('settings:includeShippingInCogsLabel', 'Include Shipping in COGS')}</FormLabel>
                        <FormDescription>
                          {t('settings:includeShippingInCogsDescription', 'Include shipping costs in cost of goods sold')}
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
                        <FormLabel>{t('settings:trackExpensesByCategoryLabel', 'Track Expenses by Category')}</FormLabel>
                        <FormDescription>
                          {t('settings:trackExpensesByCategoryDescription', 'Enable expense tracking by category')}
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
                  {t('financial:expenseCategories', 'Expense Categories')}
                </CardTitle>
                <CardDescription className="text-sm">
                  {t('financial:manageCategoriesDescription', 'Manage expense categories for tracking and reporting')}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-4">
                {/* Add new category */}
                <div className="flex gap-2">
                  <Input
                    placeholder={t('financial:newCategoryPlaceholder', 'New category name')}
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
                    {t('common:add', 'Add')}
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
                    {t('financial:saveCategories', 'Save Categories')}
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
            
            {/* Manual Save All Button (for text inputs) */}
            <Button 
              type="button"
              variant={hasPendingChanges ? "default" : "outline"}
              onClick={() => saveAllPending()}
              disabled={!hasPendingChanges}
              className="w-full sm:w-auto min-h-[44px]" 
              data-testid="button-save"
            >
              {hasPendingChanges ? (
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
