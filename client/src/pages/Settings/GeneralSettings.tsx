import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Building2, Save, Loader2, Globe, MapPin, User, Shield, Clock, Sparkles, FileText, Facebook, MessageCircle } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { useLocalization } from "@/contexts/LocalizationContext";
import { camelToSnake, deepCamelToSnake } from "@/utils/caseConverters";
import i18n from "@/i18n/i18n";
import { useTranslation } from 'react-i18next';

const formSchema = z.object({
  // Company Information
  company_name: z.string().default('Davie Supply'),
  company_email: z.string().email().optional().or(z.literal('')),
  company_phone: z.union([z.string(), z.number()]).transform(val => String(val)).refine(val => !/\s/.test(val), "Phone number cannot contain spaces").default(''),
  company_address: z.string().default(''),
  company_city: z.string().default(''),
  company_zip: z.string().default(''),
  company_country: z.string().default(''),
  company_website: z.string().default(''),
  company_vat_id: z.string().default(''),
  
  // Brand & Identity
  company_logo_url: z.string().default(''),
  company_invoice_stamp: z.string().default(''),
  company_facebook_url: z.string().default(''),
  company_whatsapp_number: z.string().default(''),
  company_zalo_number: z.string().default(''),
  company_linkedin_url: z.string().default(''),
  company_instagram_url: z.string().default(''),

  // Localization
  default_language: z.enum(['en', 'vi']).default('en'),
  default_date_format: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD.MM.YYYY', 'D.M.YYYY', 'DD-MM-YYYY']).default('DD/MM/YYYY'),
  default_time_format: z.enum(['12-hour', '24-hour']).default('24-hour'),
  default_timezone: z.string().default('Europe/Prague'),
  number_format: z.enum(['1,000.00', '1.000,00']).default('1,000.00'),

  // Currency Settings
  default_currency: z.enum(['CZK', 'EUR', 'USD', 'VND', 'CNY']).default('CZK'),
  currency_display: z.enum(['symbol', 'code', 'both']).default('symbol'),
  
  // Operational Settings - Order Defaults
  default_priority: z.enum(['low', 'medium', 'high']).default('medium'),
  default_order_warehouse_id: z.coerce.number().optional(),

  // Notification Preferences
  enable_email_notifications: z.boolean().default(true),
  enable_sms_notifications: z.boolean().default(false),
  low_stock_alert_email: z.boolean().default(true),
  order_status_change_notifications: z.boolean().default(true),
  daily_summary_report_email: z.boolean().default(false),
  weekly_report_email: z.boolean().default(true),
  
  // Customer Experience
  customer_portal_enabled: z.boolean().default(false),
  return_policy_text: z.string().default(''),
  
  // AI & Automation
  enable_ai_address_parsing: z.boolean().default(false),
  enable_ai_carton_packing: z.boolean().default(false),
  
  // Compliance
  audit_log_retention_days: z.coerce.number().min(7).max(365).default(90),
});

type FormValues = z.infer<typeof formSchema>;


const TIMEZONES = [
  { value: 'Europe/Prague', label: 'Europe/Prague (CET)' },
  { value: 'Asia/Ho_Chi_Minh', label: 'Asia/Ho Chi Minh (ICT)' },
  { value: 'America/New_York', label: 'America/New York (EST)' },
  { value: 'America/Los_Angeles', label: 'America/Los Angeles (PST)' },
  { value: 'Europe/London', label: 'Europe/London (GMT)' },
  { value: 'Asia/Shanghai', label: 'Asia/Shanghai (CST)' },
];

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

export default function GeneralSettings() {
  const { t } = useTranslation(['settings', 'common']);
  const { toast } = useToast();
  const { generalSettings, isLoading } = useSettings();
  const { applySettings } = useLocalization();
  const [originalSettings, setOriginalSettings] = useState<Partial<FormValues>>({});
  
  // Fetch warehouses for the default order warehouse dropdown
  const { data: warehouses = [] } = useQuery<any[]>({ queryKey: ['/api/warehouses'] });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      company_name: generalSettings.companyName || 'Davie Supply',
      company_email: generalSettings.companyEmail || '',
      company_phone: generalSettings.companyPhone || '',
      company_address: generalSettings.companyAddress || '',
      company_city: generalSettings.companyCity || '',
      company_zip: generalSettings.companyZip || '',
      company_country: generalSettings.companyCountry || '',
      company_website: generalSettings.companyWebsite || '',
      company_vat_id: generalSettings.companyVatId || '',
      company_logo_url: generalSettings.companyLogoUrl || '',
      company_invoice_stamp: generalSettings.companyInvoiceStamp || '',
      company_facebook_url: generalSettings.companyFacebookUrl || '',
      company_whatsapp_number: generalSettings.companyWhatsAppNumber || '',
      company_zalo_number: generalSettings.companyZaloNumber || '',
      company_linkedin_url: generalSettings.companyLinkedInUrl || '',
      company_instagram_url: generalSettings.companyInstagramUrl || '',
      default_language: generalSettings.defaultLanguage || 'en',
      default_date_format: generalSettings.defaultDateFormat || 'DD/MM/YYYY',
      default_time_format: generalSettings.defaultTimeFormat || '24-hour',
      default_timezone: generalSettings.defaultTimezone || 'Europe/Prague',
      number_format: generalSettings.numberFormat || '1,000.00',
      default_currency: generalSettings.defaultCurrency || 'CZK',
      currency_display: generalSettings.currencyDisplay || 'symbol',
      default_priority: generalSettings.defaultPriority || 'medium',
      default_order_warehouse_id: generalSettings.defaultOrderWarehouseId || undefined,
      enable_email_notifications: generalSettings.enableEmailNotifications ?? true,
      enable_sms_notifications: generalSettings.enableSmsNotifications ?? false,
      low_stock_alert_email: generalSettings.lowStockAlertEmail ?? true,
      order_status_change_notifications: generalSettings.orderStatusChangeNotifications ?? true,
      daily_summary_report_email: generalSettings.dailySummaryReportEmail ?? false,
      weekly_report_email: generalSettings.weeklyReportEmail ?? true,
      customer_portal_enabled: generalSettings.customerPortalEnabled ?? false,
      return_policy_text: generalSettings.returnPolicyText || '',
      enable_ai_address_parsing: generalSettings.enableAiAddressParsing ?? false,
      enable_ai_carton_packing: generalSettings.enableAiCartonPacking ?? false,
      audit_log_retention_days: generalSettings.auditLogRetentionDays || 90,
    },
  });

  // Reset form when settings load (with proper fallbacks matching defaultValues)
  useEffect(() => {
    if (!isLoading) {
      const snapshot = {
        company_name: generalSettings.companyName || 'Davie Supply',
        company_email: generalSettings.companyEmail || '',
        company_phone: generalSettings.companyPhone || '',
        company_address: generalSettings.companyAddress || '',
        company_city: generalSettings.companyCity || '',
        company_zip: generalSettings.companyZip || '',
        company_country: generalSettings.companyCountry || '',
        company_website: generalSettings.companyWebsite || '',
        company_vat_id: generalSettings.companyVatId || '',
        company_logo_url: generalSettings.companyLogoUrl || '',
        company_invoice_stamp: generalSettings.companyInvoiceStamp || '',
        company_facebook_url: generalSettings.companyFacebookUrl || '',
        company_whatsapp_number: generalSettings.companyWhatsAppNumber || '',
        company_zalo_number: generalSettings.companyZaloNumber || '',
        company_linkedin_url: generalSettings.companyLinkedInUrl || '',
        company_instagram_url: generalSettings.companyInstagramUrl || '',
        default_language: generalSettings.defaultLanguage || 'en',
        default_date_format: generalSettings.defaultDateFormat || 'DD/MM/YYYY',
        default_time_format: generalSettings.defaultTimeFormat || '24-hour',
        default_timezone: generalSettings.defaultTimezone || 'Europe/Prague',
        number_format: generalSettings.numberFormat || '1,000.00',
        default_currency: generalSettings.defaultCurrency || 'CZK',
        currency_display: generalSettings.currencyDisplay || 'symbol',
        default_priority: generalSettings.defaultPriority || 'medium',
        default_order_warehouse_id: generalSettings.defaultOrderWarehouseId || undefined,
        enable_email_notifications: generalSettings.enableEmailNotifications ?? true,
        enable_sms_notifications: generalSettings.enableSmsNotifications ?? false,
        low_stock_alert_email: generalSettings.lowStockAlertEmail ?? true,
        order_status_change_notifications: generalSettings.orderStatusChangeNotifications ?? true,
        daily_summary_report_email: generalSettings.dailySummaryReportEmail ?? false,
        weekly_report_email: generalSettings.weeklyReportEmail ?? true,
        customer_portal_enabled: generalSettings.customerPortalEnabled ?? false,
        return_policy_text: generalSettings.returnPolicyText || '',
        enable_ai_address_parsing: generalSettings.enableAiAddressParsing ?? false,
        enable_ai_carton_packing: generalSettings.enableAiCartonPacking ?? false,
        audit_log_retention_days: generalSettings.auditLogRetentionDays || 90,
      };
      setOriginalSettings(snapshot);
      form.reset(snapshot);
    }
  }, [isLoading, form, generalSettings]);

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
          category: 'general' 
        });
      });
      
      await Promise.all(savePromises);
      
      // Return the values to access in onSuccess
      return values;
    },
    onSuccess: async (values) => {
      console.log('💾 Settings saved! Applying localization settings immediately...');
      
      // Apply all localization settings immediately through the LocalizationContext
      applySettings({
        language: values.default_language,
        dateFormat: values.default_date_format,
        timeFormat: values.default_time_format,
        timezone: values.default_timezone,
        numberFormat: values.number_format,
        currency: values.default_currency,
        currencyDisplay: values.currency_display,
      });
      
      // CRITICAL: Change language if the desired language differs from current i18n language
      // This ensures language switches even if it was already saved in the database
      if (values.default_language && values.default_language !== i18n.language) {
        console.log(`🌐 Changing language from ${i18n.language} to ${values.default_language}`);
        try {
          await i18n.changeLanguage(values.default_language);
          // Persist to localStorage immediately
          localStorage.setItem('app_language', values.default_language);
          localStorage.setItem('i18nextLng', values.default_language);
          console.log('✅ Language changed successfully to:', i18n.language);
        } catch (error) {
          console.error('❌ Failed to change language:', error);
        }
      }
      
      // Invalidate ALL settings caches to ensure changes take effect immediately
      await queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      
      // The useEffect will automatically update originalSettings when new data loads
      toast({
        title: t('settings:settingsSaved'),
        description: t('settings:localizationApplied'),
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
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400 dark:text-slate-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 h-auto gap-2">
            <TabsTrigger value="profile" className="flex items-center gap-2 px-3 py-2" data-testid="tab-profile">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">{t('settings:tabCompany')}</span>
              <span className="sm:hidden">{t('settings:tabCompany')}</span>
            </TabsTrigger>
            <TabsTrigger value="localization" className="flex items-center gap-2 px-3 py-2" data-testid="tab-localization">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">{t('settings:tabLocalization')}</span>
              <span className="sm:hidden">{t('settings:tabLocalization')}</span>
            </TabsTrigger>
            <TabsTrigger value="operations" className="flex items-center gap-2 px-3 py-2" data-testid="tab-operations">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">{t('settings:tabOperations')}</span>
              <span className="sm:hidden">{t('settings:tabOperations')}</span>
            </TabsTrigger>
            <TabsTrigger value="customer" className="flex items-center gap-2 px-3 py-2" data-testid="tab-customer">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{t('settings:tabCustomer')}</span>
              <span className="sm:hidden">{t('settings:tabCustomer')}</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2 px-3 py-2" data-testid="tab-security">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">{t('settings:tabSecurity')}</span>
              <span className="sm:hidden">{t('settings:tabSecurity')}</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Company Profile */}
          <TabsContent value="profile" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {t('settings:companyInformation')}
                </CardTitle>
                <CardDescription>{t('settings:companyInfoDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="company_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:companyName')}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={t('settings:companyNamePlaceholder')} data-testid="input-company_name" />
                        </FormControl>
                        <FormDescription>{t('common:yourBusinessLegalName')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="company_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:companyEmail')}</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder={t('settings:companyEmailPlaceholder')} data-testid="input-company_email" />
                        </FormControl>
                        <FormDescription>{t('common:primaryBusinessEmail')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="company_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:companyPhone')}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={t('settings:companyPhonePlaceholder')} data-testid="input-company_phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="company_website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:companyWebsite')}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={t('settings:companyWebsitePlaceholder')} data-testid="input-company_website" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="company_address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:companyAddress')}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={t('settings:companyAddressPlaceholder')} data-testid="input-company_address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="company_city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:companyCity')}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={t('settings:companyCityPlaceholder')} data-testid="input-company_city" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="company_zip"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:companyZip')}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={t('settings:companyZipPlaceholder')} data-testid="input-company_zip" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="company_country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:companyCountry')}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={t('settings:selectCountry')} data-testid="input-company_country" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="company_vat_id"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>{t('settings:companyVatId')}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={t('settings:companyVatIdPlaceholder')} data-testid="input-company_vat_id" />
                        </FormControl>
                        <FormDescription>{t('common:yourCompanyTaxId')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  {t('settings:brandIdentity')}
                </CardTitle>
                <CardDescription>{t('settings:brandIdentityDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="company_logo_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:companyLogoUrl')}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={t('settings:companyWebsitePlaceholder')} data-testid="input-company_logo_url" />
                        </FormControl>
                        <FormDescription>{t('settings:companyLogoUrlDescription')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="company_invoice_stamp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:invoiceStamp')}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={t('settings:companyWebsitePlaceholder')} data-testid="input-company_invoice_stamp" />
                        </FormControl>
                        <FormDescription>{t('settings:invoiceStampDescription')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="company_facebook_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Facebook className="h-4 w-4" />
                          {t('settings:facebookUrl')}
                        </FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={t('settings:facebookUrlPlaceholder')} data-testid="input-company_facebook_url" />
                        </FormControl>
                        <FormDescription>{t('settings:facebookUrlDescription')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="company_whatsapp_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <MessageCircle className="h-4 w-4" />
                          {t('settings:whatsappNumber')}
                        </FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={t('settings:whatsappNumberPlaceholder')} data-testid="input-company_whatsapp_number" />
                        </FormControl>
                        <FormDescription>{t('settings:whatsappNumberDescription')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="company_zalo_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:zaloNumber')}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={t('settings:zaloNumberPlaceholder')} data-testid="input-company_zalo_number" />
                        </FormControl>
                        <FormDescription>{t('settings:zaloNumberDescription')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="company_linkedin_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:linkedinUrl')}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={t('settings:linkedinUrlPlaceholder')} data-testid="input-company_linkedin_url" />
                        </FormControl>
                        <FormDescription>{t('settings:linkedinUrlDescription')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="company_instagram_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:instagramUrl')}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={t('settings:instagramUrlPlaceholder')} data-testid="input-company_instagram_url" />
                        </FormControl>
                        <FormDescription>{t('settings:instagramUrlDescription')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Localization & Finance */}
          <TabsContent value="localization" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  {t('settings:localization')}
                </CardTitle>
                <CardDescription>{t('settings:localizationDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="default_language"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:defaultLanguage')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-default_language">
                              <SelectValue placeholder={t('settings:selectLanguage')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="en">{t('settings:english')}</SelectItem>
                            <SelectItem value="vi">{t('settings:vietnamese')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>{t('settings:languageDescription')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="default_date_format"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:defaultDateFormat')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-default_date_format">
                              <SelectValue placeholder={t('settings:selectDateFormat')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="DD/MM/YYYY">DD/MM/YYYY ({t('settings:dateFormatUK')})</SelectItem>
                            <SelectItem value="MM/DD/YYYY">MM/DD/YYYY ({t('settings:dateFormatUS')})</SelectItem>
                            <SelectItem value="YYYY-MM-DD">YYYY-MM-DD ({t('settings:dateFormatISO')})</SelectItem>
                            <SelectItem value="DD.MM.YYYY">DD.MM.YYYY ({t('settings:dateFormatEU')})</SelectItem>
                            <SelectItem value="D.M.YYYY">D.M.YYYY ({t('settings:dateFormatEUShort')})</SelectItem>
                            <SelectItem value="DD-MM-YYYY">DD-MM-YYYY ({t('settings:dateFormatNL')})</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>{t('settings:dateFormatDescription')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="default_time_format"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:defaultTimeFormat')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-default_time_format">
                              <SelectValue placeholder={t('settings:selectOption')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="12-hour">{t('settings:timeFormat12Hour')}</SelectItem>
                            <SelectItem value="24-hour">{t('settings:timeFormat24Hour')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>{t('settings:timeFormatDescription')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="default_timezone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:defaultTimezone')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-default_timezone">
                              <SelectValue placeholder={t('settings:selectTimezone')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {TIMEZONES.map((tz) => (
                              <SelectItem key={tz.value} value={tz.value}>
                                {tz.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>{t('settings:timezoneDescription')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="number_format"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:numberFormat')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-number_format">
                              <SelectValue placeholder={t('settings:selectOption')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1,000.00">1,000.00</SelectItem>
                            <SelectItem value="1.000,00">1.000,00</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {t('settings:currency')}
                </CardTitle>
                <CardDescription>{t('settings:currencyManagementDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="default_currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:defaultCurrency')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-default_currency">
                              <SelectValue placeholder={t('settings:selectCurrency')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="CZK">CZK (Czech Koruna)</SelectItem>
                            <SelectItem value="EUR">EUR (Euro)</SelectItem>
                            <SelectItem value="USD">USD (US Dollar)</SelectItem>
                            <SelectItem value="VND">VND (Vietnamese Dong)</SelectItem>
                            <SelectItem value="CNY">CNY (Chinese Yuan)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="currency_display"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:currencyDisplay')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-currency_display">
                              <SelectValue placeholder={t('settings:selectOption')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="symbol">{t('settings:currencyDisplaySymbol')}</SelectItem>
                            <SelectItem value="code">{t('settings:currencyDisplayCode')}</SelectItem>
                            <SelectItem value="both">{t('settings:currencyDisplayBoth')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Warehouses & Operations */}
          <TabsContent value="operations" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {t('settings:orderDefaults')}
                </CardTitle>
                <CardDescription>{t('settings:orderDefaultsDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="default_order_warehouse_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:defaultWarehouse')}</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)} 
                          value={field.value?.toString() || ""}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-default_order_warehouse_id">
                              <SelectValue placeholder={t('settings:selectWarehouse')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {warehouses.map((warehouse: any) => (
                              <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                                {warehouse.name} {warehouse.code ? `(${warehouse.code})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>{t('settings:defaultWarehouseDescription')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="default_priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:defaultPriority')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-default_priority">
                              <SelectValue placeholder={t('settings:selectOption')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">{t('settings:priorityLow')}</SelectItem>
                            <SelectItem value="medium">{t('settings:priorityMedium')}</SelectItem>
                            <SelectItem value="high">{t('settings:priorityHigh')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>{t('settings:defaultPriorityDescription')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4: Customer Experience */}
          <TabsContent value="customer" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {t('settings:notificationPreferences')}
                </CardTitle>
                <CardDescription>{t('settings:notificationPreferencesDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="enable_email_notifications"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-enable_email_notifications"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t('settings:emailNotificationsLabel')}</FormLabel>
                          <FormDescription>
                            {t('settings:emailNotificationsDescription')}
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="enable_sms_notifications"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-enable_sms_notifications"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t('settings:smsNotificationsLabel')}</FormLabel>
                          <FormDescription>
                            {t('settings:smsNotificationsDescription')}
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="low_stock_alert_email"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-low_stock_alert_email"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t('settings:lowStockAlertsLabel')}</FormLabel>
                          <FormDescription>
                            {t('settings:lowStockAlertsDescription')}
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="order_status_change_notifications"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-order_status_change_notifications"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t('settings:orderStatusChangesLabel')}</FormLabel>
                          <FormDescription>
                            {t('settings:orderStatusChangesDescription')}
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="daily_summary_report_email"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-daily_summary_report_email"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t('settings:dailySummaryLabel')}</FormLabel>
                          <FormDescription>
                            {t('settings:dailySummaryDescription')}
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="weekly_report_email"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-weekly_report_email"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t('settings:weeklyReportLabel')}</FormLabel>
                          <FormDescription>
                            {t('settings:weeklyReportDescription')}
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {t('settings:customerPortalTitle')}
                </CardTitle>
                <CardDescription>{t('settings:customerPortalDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="customer_portal_enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-customer_portal_enabled"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>{t('settings:enableCustomerPortalLabel')}</FormLabel>
                        <FormDescription>
                          {t('settings:enableCustomerPortalDescription')}
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="return_policy_text"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('settings:returnPolicyLabel')}</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder={t('settings:returnPolicyPlaceholder')}
                          rows={6}
                          data-testid="textarea-return_policy_text"
                        />
                      </FormControl>
                      <FormDescription>
                        {t('settings:returnPolicyDescription')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 5: Automation & Security */}
          <TabsContent value="security" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  {t('settings:aiFeaturesTitle')}
                </CardTitle>
                <CardDescription>{t('settings:aiFeaturesDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="enable_ai_address_parsing"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-enable_ai_address_parsing"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t('settings:aiAddressParsingLabel')}</FormLabel>
                          <FormDescription>
                            {t('settings:aiAddressParsingDescription')}
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="enable_ai_carton_packing"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-enable_ai_carton_packing"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t('settings:aiCartonPackingLabel')}</FormLabel>
                          <FormDescription>
                            {t('settings:aiCartonPackingDescription')}
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  {t('settings:complianceSecurityTitle')}
                </CardTitle>
                <CardDescription>{t('settings:complianceSecurityDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="audit_log_retention_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('settings:auditLogRetentionLabel')}</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          min="7"
                          max="365"
                          data-testid="input-audit_log_retention_days" 
                        />
                      </FormControl>
                      <FormDescription>
                        {t('settings:auditLogRetentionDescription')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Development: Show Validation Errors */}
        {import.meta.env.DEV && Object.keys(form.formState.errors).length > 0 && (
          <Card className="border-red-500 bg-red-50 dark:bg-red-950/20">
            <CardHeader>
              <CardTitle className="text-red-700 dark:text-red-400 text-sm">
                ⚠️ {t('settings:formValidationErrors')} ({Object.keys(form.formState.errors).length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs text-red-600 dark:text-red-300 overflow-auto max-h-48">
                {JSON.stringify(form.formState.errors, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Sticky Action Bar */}
        <div className="sticky bottom-0 bg-white dark:bg-slate-950 border-t pt-4 pb-2 -mx-1 px-1 sm:px-0 sm:mx-0">
          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={saveMutation.isPending} 
              className="w-full sm:w-auto min-h-[44px]" 
              data-testid="button-save"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('settings:savingSettings')}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {t('settings:saveAllSettings')}
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
