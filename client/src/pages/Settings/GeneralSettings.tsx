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
import { Building2, Save, Loader2, Globe, MapPin, User, Shield, Clock, Sparkles, FileText, Facebook, MessageCircle, Check, Eye, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useSettings } from "@/contexts/SettingsContext";
import { useLocalization } from "@/contexts/LocalizationContext";
import { camelToSnake, deepCamelToSnake } from "@/utils/caseConverters";
import i18n from "@/i18n/i18n";
import { useTranslation } from 'react-i18next';
import { useSettingsAutosave, SaveStatus } from "@/hooks/useSettingsAutosave";

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

  // Admin Notifications
  low_stock_alert_email: z.boolean().default(true),
  order_status_change_notifications: z.boolean().default(true),
  daily_summary_report_email: z.boolean().default(false),
  weekly_report_email: z.boolean().default(true),
  monthly_report_email: z.boolean().default(false),
  yearly_report_email: z.boolean().default(false),
  
  // AI & Automation
  enable_ai_address_parsing: z.boolean().default(false),
  enable_ai_carton_packing: z.boolean().default(false),
  
  // Compliance & Security
  audit_log_retention_days: z.coerce.number().min(7).max(365).default(90),
  session_timeout_minutes: z.coerce.number().min(5).max(480).default(60),
  require_2fa_for_admins: z.boolean().default(false),
  max_login_attempts: z.coerce.number().min(3).max(10).default(5),
  enable_data_export: z.boolean().default(true),
  auto_logout_on_idle: z.boolean().default(true),
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
  const [reportPreviewHtml, setReportPreviewHtml] = useState<string>('');
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  
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
      low_stock_alert_email: generalSettings.lowStockAlertEmail ?? true,
      order_status_change_notifications: generalSettings.orderStatusChangeNotifications ?? true,
      daily_summary_report_email: generalSettings.dailySummaryReportEmail ?? false,
      weekly_report_email: generalSettings.weeklyReportEmail ?? true,
      monthly_report_email: generalSettings.monthlyReportEmail ?? false,
      yearly_report_email: generalSettings.yearlyReportEmail ?? false,
      enable_ai_address_parsing: generalSettings.enableAiAddressParsing ?? false,
      enable_ai_carton_packing: generalSettings.enableAiCartonPacking ?? false,
      audit_log_retention_days: generalSettings.auditLogRetentionDays || 90,
      session_timeout_minutes: generalSettings.sessionTimeoutMinutes || 60,
      require_2fa_for_admins: generalSettings.require2faForAdmins ?? false,
      max_login_attempts: generalSettings.maxLoginAttempts || 5,
      enable_data_export: generalSettings.enableDataExport ?? true,
      auto_logout_on_idle: generalSettings.autoLogoutOnIdle ?? true,
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
    category: 'general',
    originalValues: originalSettings,
    getCurrentValue: (fieldName) => form.getValues(fieldName as keyof FormValues),
  });

  const previewReportMutation = useMutation({
    mutationFn: async (timeframe: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
      const response = await apiRequest('POST', '/api/reports/preview', { timeframe });
      return response.json();
    },
    onSuccess: (data) => {
      if (data?.html) {
        setReportPreviewHtml(data.html);
        setPreviewDialogOpen(true);
      } else {
        toast({
          title: t('common:error', 'Error'),
          description: t('settings:reportPreviewError', 'Failed to generate report preview'),
          variant: 'destructive',
        });
      }
    },
    onError: () => {
      toast({
        title: t('common:error', 'Error'),
        description: t('settings:reportPreviewError', 'Failed to generate report preview'),
        variant: 'destructive',
      });
    },
  });

  const handleDownloadReport = () => {
    const blob = new Blob([reportPreviewHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
        low_stock_alert_email: generalSettings.lowStockAlertEmail ?? true,
        order_status_change_notifications: generalSettings.orderStatusChangeNotifications ?? true,
        daily_summary_report_email: generalSettings.dailySummaryReportEmail ?? false,
        weekly_report_email: generalSettings.weeklyReportEmail ?? true,
        monthly_report_email: generalSettings.monthlyReportEmail ?? false,
        yearly_report_email: generalSettings.yearlyReportEmail ?? false,
        enable_ai_address_parsing: generalSettings.enableAiAddressParsing ?? false,
        enable_ai_carton_packing: generalSettings.enableAiCartonPacking ?? false,
        audit_log_retention_days: generalSettings.auditLogRetentionDays || 90,
        session_timeout_minutes: generalSettings.sessionTimeoutMinutes || 60,
        require_2fa_for_admins: generalSettings.require2faForAdmins ?? false,
        max_login_attempts: generalSettings.maxLoginAttempts || 5,
        enable_data_export: generalSettings.enableDataExport ?? true,
        auto_logout_on_idle: generalSettings.autoLogoutOnIdle ?? true,
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
        title: t('settings:settingsSaved', 'Settings Saved'),
        description: t('settings:localizationApplied', 'Localization settings applied'),
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: t('common:error', 'Error'),
        description: error.message || t('settings:settingsSaveError', 'Failed to save settings'),
      });
    },
  });

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
    <>
    <Form {...form}>
      <form className="space-y-6">
        <Tabs defaultValue="profile" className="w-full">
          <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-3 lg:grid-cols-5 h-auto gap-1 sm:gap-2 p-1">
              <TabsTrigger value="profile" className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm whitespace-nowrap" data-testid="tab-profile">
                <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">{t('settings:tabCompany', 'Company')}</span>
              </TabsTrigger>
              <TabsTrigger value="localization" className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm whitespace-nowrap" data-testid="tab-localization">
                <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">{t('settings:tabLocalization', 'Localization')}</span>
              </TabsTrigger>
              <TabsTrigger value="operations" className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm whitespace-nowrap" data-testid="tab-operations">
                <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">{t('settings:tabOperations', 'Operations')}</span>
              </TabsTrigger>
              <TabsTrigger value="customer" className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm whitespace-nowrap" data-testid="tab-customer">
                <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">{t('settings:tabCustomer', 'Customer')}</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm whitespace-nowrap" data-testid="tab-security">
                <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">{t('settings:tabSecurity', 'Security')}</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab 1: Company Profile */}
          <TabsContent value="profile" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {t('settings:companyInformation', 'Company Information')}
                </CardTitle>
                <CardDescription>{t('settings:companyInfoDescription', 'Basic information about your company')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="company_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:companyName', 'Company Name')}</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder={t('settings:companyNamePlaceholder', 'Enter company name')} 
                            data-testid="input-company_name"
                            onChange={(e) => {
                              field.onChange(e);
                              markPendingChange('company_name');
                            }}
                            onBlur={handleTextBlur('company_name')}
                          />
                        </FormControl>
                        <FormDescription>{t('common:yourBusinessLegalName', 'Your business legal name')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="company_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:companyEmail', 'Company Email')}</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="email" 
                            placeholder={t('settings:companyEmailPlaceholder', 'Enter company email')} 
                            data-testid="input-company_email"
                            onChange={(e) => {
                              field.onChange(e);
                              markPendingChange('company_email');
                            }}
                            onBlur={handleTextBlur('company_email')}
                          />
                        </FormControl>
                        <FormDescription>{t('common:primaryBusinessEmail', 'Primary business email')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="company_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:companyPhone', 'Company Phone')}</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder={t('settings:companyPhonePlaceholder', 'Enter phone number')} 
                            data-testid="input-company_phone"
                            onChange={(e) => {
                              field.onChange(e);
                              markPendingChange('company_phone');
                            }}
                            onBlur={handleTextBlur('company_phone')}
                          />
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
                        <FormLabel>{t('settings:companyWebsite', 'Company Website')}</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder={t('settings:companyWebsitePlaceholder', 'https://example.com')} 
                            data-testid="input-company_website"
                            onChange={(e) => {
                              field.onChange(e);
                              markPendingChange('company_website');
                            }}
                            onBlur={handleTextBlur('company_website')}
                          />
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
                        <FormLabel>{t('settings:companyAddress', 'Company Address')}</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder={t('settings:companyAddressPlaceholder', 'Enter company address')} 
                            data-testid="input-company_address"
                            onChange={(e) => {
                              field.onChange(e);
                              markPendingChange('company_address');
                            }}
                            onBlur={handleTextBlur('company_address')}
                          />
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
                        <FormLabel>{t('settings:companyCity', 'City')}</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder={t('settings:companyCityPlaceholder', 'Enter city')} 
                            data-testid="input-company_city"
                            onChange={(e) => {
                              field.onChange(e);
                              markPendingChange('company_city');
                            }}
                            onBlur={handleTextBlur('company_city')}
                          />
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
                        <FormLabel>{t('settings:companyZip', 'Zip Code')}</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder={t('settings:companyZipPlaceholder', 'Enter zip code')} 
                            data-testid="input-company_zip"
                            onChange={(e) => {
                              field.onChange(e);
                              markPendingChange('company_zip');
                            }}
                            onBlur={handleTextBlur('company_zip')}
                          />
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
                        <FormLabel>{t('settings:companyCountry', 'Country')}</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder={t('settings:selectCountry', 'Select country')} 
                            data-testid="input-company_country"
                            onChange={(e) => {
                              field.onChange(e);
                              markPendingChange('company_country');
                            }}
                            onBlur={handleTextBlur('company_country')}
                          />
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
                        <FormLabel>{t('settings:companyVatId', 'VAT ID')}</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder={t('settings:companyVatIdPlaceholder', 'Enter VAT ID')} 
                            data-testid="input-company_vat_id"
                            onChange={(e) => {
                              field.onChange(e);
                              markPendingChange('company_vat_id');
                            }}
                            onBlur={handleTextBlur('company_vat_id')}
                          />
                        </FormControl>
                        <FormDescription>{t('common:yourCompanyTaxId', 'Your company tax ID')}</FormDescription>
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
                  {t('settings:brandIdentity', 'Brand Identity')}
                </CardTitle>
                <CardDescription>{t('settings:brandIdentityDescription', 'Logo, stamp, and social media links')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="company_logo_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:companyLogoUrl', 'Company Logo URL')}</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder={t('settings:companyWebsitePlaceholder', 'https://example.com')} 
                            data-testid="input-company_logo_url"
                            onChange={(e) => {
                              field.onChange(e);
                              markPendingChange('company_logo_url');
                            }}
                            onBlur={handleTextBlur('company_logo_url')}
                          />
                        </FormControl>
                        <FormDescription>{t('settings:companyLogoUrlDescription', 'URL to your company logo')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="company_invoice_stamp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:invoiceStamp', 'Invoice Stamp')}</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder={t('settings:companyWebsitePlaceholder', 'https://example.com')} 
                            data-testid="input-company_invoice_stamp"
                            onChange={(e) => {
                              field.onChange(e);
                              markPendingChange('company_invoice_stamp');
                            }}
                            onBlur={handleTextBlur('company_invoice_stamp')}
                          />
                        </FormControl>
                        <FormDescription>{t('settings:invoiceStampDescription', 'URL to your invoice stamp image')}</FormDescription>
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
                          {t('settings:facebookUrl', 'Facebook URL')}
                        </FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder={t('settings:facebookUrlPlaceholder', 'https://facebook.com/yourpage')} 
                            data-testid="input-company_facebook_url"
                            onChange={(e) => {
                              field.onChange(e);
                              markPendingChange('company_facebook_url');
                            }}
                            onBlur={handleTextBlur('company_facebook_url')}
                          />
                        </FormControl>
                        <FormDescription>{t('settings:facebookUrlDescription', 'Your Facebook page URL')}</FormDescription>
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
                          {t('settings:whatsappNumber', 'WhatsApp Number')}
                        </FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder={t('settings:whatsappNumberPlaceholder', '+1234567890')} 
                            data-testid="input-company_whatsapp_number"
                            onChange={(e) => {
                              field.onChange(e);
                              markPendingChange('company_whatsapp_number');
                            }}
                            onBlur={handleTextBlur('company_whatsapp_number')}
                          />
                        </FormControl>
                        <FormDescription>{t('settings:whatsappNumberDescription', 'Your WhatsApp business number')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="company_zalo_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:zaloNumber', 'Zalo Number')}</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder={t('settings:zaloNumberPlaceholder', 'Enter Zalo number')} 
                            data-testid="input-company_zalo_number"
                            onChange={(e) => {
                              field.onChange(e);
                              markPendingChange('company_zalo_number');
                            }}
                            onBlur={handleTextBlur('company_zalo_number')}
                          />
                        </FormControl>
                        <FormDescription>{t('settings:zaloNumberDescription', 'Your Zalo number for customer contact')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="company_linkedin_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:linkedinUrl', 'LinkedIn URL')}</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder={t('settings:linkedinUrlPlaceholder', 'https://linkedin.com/company/yourcompany')} 
                            data-testid="input-company_linkedin_url"
                            onChange={(e) => {
                              field.onChange(e);
                              markPendingChange('company_linkedin_url');
                            }}
                            onBlur={handleTextBlur('company_linkedin_url')}
                          />
                        </FormControl>
                        <FormDescription>{t('settings:linkedinUrlDescription', 'Your LinkedIn company page')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="company_instagram_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:instagramUrl', 'Instagram URL')}</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder={t('settings:instagramUrlPlaceholder', 'https://instagram.com/yourprofile')} 
                            data-testid="input-company_instagram_url"
                            onChange={(e) => {
                              field.onChange(e);
                              markPendingChange('company_instagram_url');
                            }}
                            onBlur={handleTextBlur('company_instagram_url')}
                          />
                        </FormControl>
                        <FormDescription>{t('settings:instagramUrlDescription', 'Your Instagram profile URL')}</FormDescription>
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
                  {t('settings:localization', 'Localization')}
                </CardTitle>
                <CardDescription>{t('settings:localizationDescription', 'Language, date, and time settings')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="default_language"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:defaultLanguage', 'Default Language')}</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleSelectChange('default_language')(value);
                          }} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-default_language">
                              <SelectValue placeholder={t('settings:selectLanguage', 'Select language')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="en">{t('settings:english', 'English')}</SelectItem>
                            <SelectItem value="vi">{t('settings:vietnamese', 'Vietnamese')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>{t('settings:languageDescription', 'System default language')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="default_date_format"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:defaultDateFormat', 'Date Format')}</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleSelectChange('default_date_format')(value);
                          }} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-default_date_format">
                              <SelectValue placeholder={t('settings:selectDateFormat', 'Select date format')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="DD/MM/YYYY">DD/MM/YYYY ({t('settings:dateFormatUK', 'UK')})</SelectItem>
                            <SelectItem value="MM/DD/YYYY">MM/DD/YYYY ({t('settings:dateFormatUS', 'US')})</SelectItem>
                            <SelectItem value="YYYY-MM-DD">YYYY-MM-DD ({t('settings:dateFormatISO', 'ISO')})</SelectItem>
                            <SelectItem value="DD.MM.YYYY">DD.MM.YYYY ({t('settings:dateFormatEU', 'EU')})</SelectItem>
                            <SelectItem value="D.M.YYYY">D.M.YYYY ({t('settings:dateFormatEUShort', 'EU Short')})</SelectItem>
                            <SelectItem value="DD-MM-YYYY">DD-MM-YYYY ({t('settings:dateFormatNL', 'NL')})</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>{t('settings:dateFormatDescription', 'How dates are displayed')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="default_time_format"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:defaultTimeFormat', 'Time Format')}</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleSelectChange('default_time_format')(value);
                          }} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-default_time_format">
                              <SelectValue placeholder={t('settings:selectOption', 'Select option')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="12-hour">{t('settings:timeFormat12Hour', '12-Hour')}</SelectItem>
                            <SelectItem value="24-hour">{t('settings:timeFormat24Hour', '24-Hour')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>{t('settings:timeFormatDescription', 'How times are displayed')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="default_timezone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:defaultTimezone', 'Timezone')}</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleSelectChange('default_timezone')(value);
                          }} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-default_timezone">
                              <SelectValue placeholder={t('settings:selectTimezone', 'Select timezone')} />
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
                        <FormDescription>{t('settings:timezoneDescription', 'Your business timezone')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="number_format"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:numberFormat', 'Number Format')}</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleSelectChange('number_format')(value);
                          }} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-number_format">
                              <SelectValue placeholder={t('settings:selectOption', 'Select option')} />
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
                  {t('settings:currency', 'Currency')}
                </CardTitle>
                <CardDescription>{t('settings:currencyManagementDescription', 'Configure your default currency settings')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="default_currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:defaultCurrency', 'Default Currency')}</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleSelectChange('default_currency')(value);
                          }} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-default_currency">
                              <SelectValue placeholder={t('settings:selectCurrency', 'Select currency')} />
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
                        <FormLabel>{t('settings:currencyDisplay', 'Currency Display')}</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleSelectChange('currency_display')(value);
                          }} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-currency_display">
                              <SelectValue placeholder={t('settings:selectOption', 'Select option')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="symbol">{t('settings:currencyDisplaySymbol', 'Symbol Only ($)')}</SelectItem>
                            <SelectItem value="code">{t('settings:currencyDisplayCode', 'Code Only (USD)')}</SelectItem>
                            <SelectItem value="both">{t('settings:currencyDisplayBoth', 'Both ($ USD)')}</SelectItem>
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
                  {t('settings:orderDefaults', 'Order Defaults')}
                </CardTitle>
                <CardDescription>{t('settings:orderDefaultsDescription', 'Default settings for new orders')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="default_order_warehouse_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:defaultWarehouse', 'Default Warehouse')}</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            const parsedValue = value ? parseInt(value) : undefined;
                            field.onChange(parsedValue);
                            handleSelectChange('default_order_warehouse_id')(value);
                          }} 
                          value={field.value?.toString() || ""}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-default_order_warehouse_id">
                              <SelectValue placeholder={t('settings:selectWarehouse', 'Select warehouse')} />
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
                        <FormDescription>{t('settings:defaultWarehouseDescription', 'Default warehouse for new orders')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="default_priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:defaultPriority', 'Default Priority')}</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleSelectChange('default_priority')(value);
                          }} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-default_priority">
                              <SelectValue placeholder={t('settings:selectOption', 'Select option')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">{t('settings:priorityLow', 'Low')}</SelectItem>
                            <SelectItem value="medium">{t('settings:priorityMedium', 'Medium')}</SelectItem>
                            <SelectItem value="high">{t('settings:priorityHigh', 'High')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>{t('settings:defaultPriorityDescription', 'Default priority for new orders')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4: Notifications */}
          <TabsContent value="customer" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {t('settings:adminNotifications', 'Admin Notifications')}
                </CardTitle>
                <CardDescription>{t('settings:adminNotificationsDescription', 'Configure notification settings')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="low_stock_alert_email"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleCheckboxChange('low_stock_alert_email')(checked as boolean);
                            }}
                            data-testid="checkbox-low_stock_alert_email"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t('settings:lowStockAlertsLabel', 'Low Stock Alerts')}</FormLabel>
                          <FormDescription>
                            {t('settings:lowStockAlertsDescription', 'Receive email alerts when stock is low')}
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
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleCheckboxChange('order_status_change_notifications')(checked as boolean);
                            }}
                            data-testid="checkbox-order_status_change_notifications"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t('settings:orderStatusChangesLabel', 'Order Status Changes')}</FormLabel>
                          <FormDescription>
                            {t('settings:orderStatusChangesDescription', 'Get notified when order status changes')}
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
                  {t('settings:reportsTitle', 'Reports')}
                </CardTitle>
                <CardDescription>{t('settings:reportsDescription', 'Configure scheduled report emails')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="daily_summary_report_email"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleCheckboxChange('daily_summary_report_email')(checked as boolean);
                            }}
                            data-testid="checkbox-daily_summary_report_email"
                          />
                        </FormControl>
                        <div className="flex-1 space-y-1 leading-none">
                          <FormLabel>{t('settings:dailyReportLabel', 'Daily Report')}</FormLabel>
                          <FormDescription>
                            {t('settings:dailyReportDescription', 'Receive daily summary report')}
                          </FormDescription>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => previewReportMutation.mutate('daily')}
                          disabled={previewReportMutation.isPending}
                          data-testid="button-preview-daily-report"
                        >
                          {previewReportMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                        </Button>
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
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleCheckboxChange('weekly_report_email')(checked as boolean);
                            }}
                            data-testid="checkbox-weekly_report_email"
                          />
                        </FormControl>
                        <div className="flex-1 space-y-1 leading-none">
                          <FormLabel>{t('settings:weeklyReportLabel', 'Weekly Report')}</FormLabel>
                          <FormDescription>
                            {t('settings:weeklyReportDescription', 'Receive weekly summary report')}
                          </FormDescription>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => previewReportMutation.mutate('weekly')}
                          disabled={previewReportMutation.isPending}
                          data-testid="button-preview-weekly-report"
                        >
                          {previewReportMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="monthly_report_email"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleCheckboxChange('monthly_report_email')(checked as boolean);
                            }}
                            data-testid="checkbox-monthly_report_email"
                          />
                        </FormControl>
                        <div className="flex-1 space-y-1 leading-none">
                          <FormLabel>{t('settings:monthlyReportLabel', 'Monthly Report')}</FormLabel>
                          <FormDescription>
                            {t('settings:monthlyReportDescription', 'Receive monthly summary report')}
                          </FormDescription>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => previewReportMutation.mutate('monthly')}
                          disabled={previewReportMutation.isPending}
                          data-testid="button-preview-monthly-report"
                        >
                          {previewReportMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="yearly_report_email"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleCheckboxChange('yearly_report_email')(checked as boolean);
                            }}
                            data-testid="checkbox-yearly_report_email"
                          />
                        </FormControl>
                        <div className="flex-1 space-y-1 leading-none">
                          <FormLabel>{t('settings:yearlyReportLabel', 'Yearly Report')}</FormLabel>
                          <FormDescription>
                            {t('settings:yearlyReportDescription', 'Receive yearly summary report')}
                          </FormDescription>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => previewReportMutation.mutate('yearly')}
                          disabled={previewReportMutation.isPending}
                          data-testid="button-preview-yearly-report"
                        >
                          {previewReportMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 5: Automation & Security */}
          <TabsContent value="security" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  {t('settings:aiFeaturesTitle', 'AI Features')}
                </CardTitle>
                <CardDescription>{t('settings:aiFeaturesDescription', 'Configure AI-powered automation')}</CardDescription>
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
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleCheckboxChange('enable_ai_address_parsing')(checked as boolean);
                            }}
                            data-testid="checkbox-enable_ai_address_parsing"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t('settings:aiAddressParsingLabel', 'AI Address Parsing')}</FormLabel>
                          <FormDescription>
                            {t('settings:aiAddressParsingDescription', 'Use AI to parse customer addresses')}
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
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleCheckboxChange('enable_ai_carton_packing')(checked as boolean);
                            }}
                            data-testid="checkbox-enable_ai_carton_packing"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t('settings:aiCartonPackingLabel', 'AI Carton Packing')}</FormLabel>
                          <FormDescription>
                            {t('settings:aiCartonPackingDescription', 'Use AI for optimal carton packing suggestions')}
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
                  {t('settings:complianceSecurityTitle', 'Compliance & Security')}
                </CardTitle>
                <CardDescription>{t('settings:complianceSecurityDescription', 'Security and compliance settings')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Session & Access Control */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground">{t('settings:sessionAccessControl', 'Session & Access Control')}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="session_timeout_minutes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('settings:sessionTimeoutLabel', 'Session Timeout (minutes)')}</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              min="5"
                              max="480"
                              data-testid="input-session_timeout_minutes"
                              onChange={(e) => {
                                field.onChange(e);
                                markPendingChange('session_timeout_minutes');
                              }}
                              onBlur={handleTextBlur('session_timeout_minutes')}
                            />
                          </FormControl>
                          <FormDescription>
                            {t('settings:sessionTimeoutDescription', 'Time before inactive sessions expire')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="max_login_attempts"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('settings:maxLoginAttemptsLabel', 'Max Login Attempts')}</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              min="3"
                              max="10"
                              data-testid="input-max_login_attempts"
                              onChange={(e) => {
                                field.onChange(e);
                                markPendingChange('max_login_attempts');
                              }}
                              onBlur={handleTextBlur('max_login_attempts')}
                            />
                          </FormControl>
                          <FormDescription>
                            {t('settings:maxLoginAttemptsDescription', 'Maximum failed login attempts before lockout')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="auto_logout_on_idle"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={(checked) => {
                                field.onChange(checked);
                                handleCheckboxChange('auto_logout_on_idle')(checked as boolean);
                              }}
                              data-testid="checkbox-auto_logout_on_idle"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>{t('settings:autoLogoutOnIdleLabel', 'Auto Logout on Idle')}</FormLabel>
                            <FormDescription>
                              {t('settings:autoLogoutOnIdleDescription', 'Automatically log out users when idle')}
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="require_2fa_for_admins"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={(checked) => {
                                field.onChange(checked);
                                handleCheckboxChange('require_2fa_for_admins')(checked as boolean);
                              }}
                              data-testid="checkbox-require_2fa_for_admins"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>{t('settings:require2faForAdminsLabel', 'Require 2FA for Admins')}</FormLabel>
                            <FormDescription>
                              {t('settings:require2faForAdminsDescription', 'Require two-factor authentication for admins')}
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Data & Audit */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground">{t('settings:dataAuditSection', 'Data & Audit')}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="audit_log_retention_days"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('settings:auditLogRetentionLabel', 'Audit Log Retention (days)')}</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              min="7"
                              max="365"
                              data-testid="input-audit_log_retention_days"
                              onChange={(e) => {
                                field.onChange(e);
                                markPendingChange('audit_log_retention_days');
                              }}
                              onBlur={handleTextBlur('audit_log_retention_days')}
                            />
                          </FormControl>
                          <FormDescription>
                            {t('settings:auditLogRetentionDescription', 'How long to keep audit logs')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="enable_data_export"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={(checked) => {
                                field.onChange(checked);
                                handleCheckboxChange('enable_data_export')(checked as boolean);
                              }}
                              data-testid="checkbox-enable_data_export"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>{t('settings:enableDataExportLabel', 'Enable Data Export')}</FormLabel>
                            <FormDescription>
                              {t('settings:enableDataExportDescription', 'Allow users to export their data')}
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Development: Show Validation Errors */}
        {import.meta.env.DEV && Object.keys(form.formState.errors).length > 0 && (
          <Card className="border-red-500 bg-red-50 dark:bg-red-950/20">
            <CardHeader>
              <CardTitle className="text-red-700 dark:text-red-400 text-sm">
                ⚠️ {t('settings:formValidationErrors', 'Form Validation Errors')} ({Object.keys(form.formState.errors).length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs text-red-600 dark:text-red-300 overflow-auto max-h-48">
                {JSON.stringify(form.formState.errors, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

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
                <span className="text-destructive">{t('settings:saveFailed', 'Save Failed')}</span>
              )}
              {saveStatus === 'idle' && lastSavedAt && (
                <span className="text-muted-foreground text-xs">
                  {t('settings:lastSaved', 'Last Saved')}: {lastSavedAt.toLocaleTimeString()}
                </span>
              )}
              {saveStatus === 'idle' && hasPendingChanges && (
                <span className="text-amber-600">{t('settings:unsavedChanges', 'Unsaved Changes')}</span>
              )}
            </div>
            
            {/* Manual Save All Button (for text inputs) */}
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

    <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{t('settings:reportPreviewTitle', 'Report Preview')}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadReport}
              data-testid="button-download-report"
            >
              <Download className="h-4 w-4 mr-2" />
              {t('settings:downloadReport', 'Download')}
            </Button>
          </DialogTitle>
          <DialogDescription>
            {t('settings:reportPreviewDescription', 'Preview of your warehouse operations report')}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-auto min-h-[400px]">
          <iframe
            srcDoc={reportPreviewHtml}
            className="w-full h-full min-h-[500px] border rounded"
            title="Report Preview"
            data-testid="iframe-report-preview"
          />
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
