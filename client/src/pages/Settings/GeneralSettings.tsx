import { useMutation } from "@tanstack/react-query";
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
import { camelToSnake, deepCamelToSnake } from "@/utils/caseConverters";
import i18n from "@/i18n/i18n";

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
  default_date_format: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']).default('DD/MM/YYYY'),
  default_time_format: z.enum(['12-hour', '24-hour']).default('24-hour'),
  default_timezone: z.string().default('Europe/Prague'),
  number_format: z.enum(['1,000.00', '1.000,00']).default('1,000.00'),

  // Currency Settings
  default_currency: z.enum(['CZK', 'EUR', 'USD', 'VND', 'CNY']).default('CZK'),
  currency_display: z.enum(['symbol', 'code', 'both']).default('symbol'),
  
  // Operational Settings
  default_priority: z.enum(['low', 'medium', 'high']).default('medium'),
  default_order_location: z.string().default(''),
  working_days: z.array(z.string()).default(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']),
  business_hours_start: z.string().default('09:00'),
  business_hours_end: z.string().default('17:00'),
  warehouse_emergency_contact: z.string().default(''),
  warehouse_contact_email: z.string().default(''),
  pickup_cutoff_time: z.string().default('14:00'),
  max_order_processing_days: z.coerce.number().min(1).max(30).default(2),

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

const WEEKDAYS = [
  { id: 'monday', label: 'Monday' },
  { id: 'tuesday', label: 'Tuesday' },
  { id: 'wednesday', label: 'Wednesday' },
  { id: 'thursday', label: 'Thursday' },
  { id: 'friday', label: 'Friday' },
  { id: 'saturday', label: 'Saturday' },
  { id: 'sunday', label: 'Sunday' },
];

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
  const { toast } = useToast();
  const { generalSettings, isLoading } = useSettings();
  const [originalSettings, setOriginalSettings] = useState<Partial<FormValues>>({});

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
      default_order_location: generalSettings.defaultOrderLocation || '',
      working_days: generalSettings.workingDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      business_hours_start: generalSettings.businessHoursStart || '09:00',
      business_hours_end: generalSettings.businessHoursEnd || '17:00',
      warehouse_emergency_contact: generalSettings.warehouseEmergencyContact || '',
      warehouse_contact_email: generalSettings.warehouseContactEmail || '',
      pickup_cutoff_time: generalSettings.pickupCutoffTime || '14:00',
      max_order_processing_days: generalSettings.maxOrderProcessingDays || 2,
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
        default_order_location: generalSettings.defaultOrderLocation || '',
        working_days: generalSettings.workingDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        business_hours_start: generalSettings.businessHoursStart || '09:00',
        business_hours_end: generalSettings.businessHoursEnd || '17:00',
        warehouse_emergency_contact: generalSettings.warehouseEmergencyContact || '',
        warehouse_contact_email: generalSettings.warehouseContactEmail || '',
        pickup_cutoff_time: generalSettings.pickupCutoffTime || '14:00',
        max_order_processing_days: generalSettings.maxOrderProcessingDays || 2,
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
      console.log('💾 Settings saved! Checking language change...', {
        desiredLanguage: values.default_language,
        currentI18nLanguage: i18n.language,
      });
      
      // CRITICAL: Change language if the desired language differs from current i18n language
      // This ensures language switches even if it was already saved in the database
      if (values.default_language && values.default_language !== i18n.language) {
        console.log(`🌐 Changing language from ${i18n.language} to ${values.default_language}`);
        try {
          await i18n.changeLanguage(values.default_language);
          // Persist to localStorage immediately
          localStorage.setItem('app_language', values.default_language);
          console.log('✅ Language changed successfully to:', i18n.language);
        } catch (error) {
          console.error('❌ Failed to change language:', error);
        }
      } else {
        console.log('⏭️ Language already matches desired setting');
      }
      
      // Invalidate ALL settings caches to ensure changes take effect immediately
      await queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      
      // The useEffect will automatically update originalSettings when new data loads
      toast({
        title: "Settings Saved",
        description: "General settings have been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save settings.",
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
              <span className="hidden sm:inline">Company Profile</span>
              <span className="sm:hidden">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="localization" className="flex items-center gap-2 px-3 py-2" data-testid="tab-localization">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Localization</span>
              <span className="sm:hidden">Local</span>
            </TabsTrigger>
            <TabsTrigger value="operations" className="flex items-center gap-2 px-3 py-2" data-testid="tab-operations">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Operations</span>
              <span className="sm:hidden">Ops</span>
            </TabsTrigger>
            <TabsTrigger value="customer" className="flex items-center gap-2 px-3 py-2" data-testid="tab-customer">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Customer</span>
              <span className="sm:hidden">Customer</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2 px-3 py-2" data-testid="tab-security">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Security</span>
              <span className="sm:hidden">Security</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Company Profile */}
          <TabsContent value="profile" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Company Information
                </CardTitle>
                <CardDescription>Basic company details and contact information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="company_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Davie Supply" data-testid="input-company_name" />
                        </FormControl>
                        <FormDescription>Your business legal name</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="company_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="info@daviesupply.com" data-testid="input-company_email" />
                        </FormControl>
                        <FormDescription>Primary business email</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="company_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Phone</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="+420 XXX XXX XXX" data-testid="input-company_phone" />
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
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://daviesupply.com" data-testid="input-company_website" />
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
                        <FormLabel>Street Address</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="123 Main Street" data-testid="input-company_address" />
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
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Prague" data-testid="input-company_city" />
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
                        <FormLabel>ZIP / Postal Code</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="110 00" data-testid="input-company_zip" />
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
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Czech Republic" data-testid="input-company_country" />
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
                        <FormLabel>VAT / Tax ID</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="CZ12345678" data-testid="input-company_vat_id" />
                        </FormControl>
                        <FormDescription>Your company's tax identification number</FormDescription>
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
                  Brand & Identity
                </CardTitle>
                <CardDescription>Company logos, stamps, and social media links</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="company_logo_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Logo URL</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://example.com/logo.png" data-testid="input-company_logo_url" />
                        </FormControl>
                        <FormDescription>URL to your company logo</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="company_invoice_stamp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invoice Stamp URL</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://example.com/stamp.png" data-testid="input-company_invoice_stamp" />
                        </FormControl>
                        <FormDescription>Company seal or stamp for invoices</FormDescription>
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
                          Facebook URL
                        </FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://facebook.com/yourpage" data-testid="input-company_facebook_url" />
                        </FormControl>
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
                          WhatsApp Number
                        </FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="+420123456789" data-testid="input-company_whatsapp_number" />
                        </FormControl>
                        <FormDescription>Include country code</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="company_zalo_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Zalo Number</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="+84123456789" data-testid="input-company_zalo_number" />
                        </FormControl>
                        <FormDescription>For Vietnamese customers</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="company_linkedin_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>LinkedIn URL</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://linkedin.com/company/yourcompany" data-testid="input-company_linkedin_url" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="company_instagram_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instagram URL</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://instagram.com/yourcompany" data-testid="input-company_instagram_url" />
                        </FormControl>
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
                  Language & Formats
                </CardTitle>
                <CardDescription>Date, time, and number formatting preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="default_language"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Language</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-default_language">
                              <SelectValue placeholder="Select language" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="vi">Tiếng Việt</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>System default language</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="default_date_format"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date Format</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-default_date_format">
                              <SelectValue placeholder="Select date format" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                            <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                            <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="default_time_format"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Time Format</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-default_time_format">
                              <SelectValue placeholder="Select time format" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="12-hour">12-hour (AM/PM)</SelectItem>
                            <SelectItem value="24-hour">24-hour</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="default_timezone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Timezone</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-default_timezone">
                              <SelectValue placeholder="Select timezone" />
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="number_format"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number Format</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-number_format">
                              <SelectValue placeholder="Select format" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1,000.00">1,000.00 (comma separator)</SelectItem>
                            <SelectItem value="1.000,00">1.000,00 (dot separator)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>How numbers are displayed</FormDescription>
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
                  Currency Settings
                </CardTitle>
                <CardDescription>Default currency and display preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="default_currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Currency</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-default_currency">
                              <SelectValue placeholder="Select currency" />
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
                        <FormDescription>Primary currency for transactions</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="currency_display"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Currency Display</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-currency_display">
                              <SelectValue placeholder="Select display" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="symbol">Symbol ($, €, Kč)</SelectItem>
                            <SelectItem value="code">Code (USD, EUR, CZK)</SelectItem>
                            <SelectItem value="both">Both ($ USD)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>How currency is shown</FormDescription>
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
                  <Clock className="h-5 w-5" />
                  Business Hours
                </CardTitle>
                <CardDescription>Operating hours and working days</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="business_hours_start"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                          <Input {...field} type="time" data-testid="input-business_hours_start" />
                        </FormControl>
                        <FormDescription>When operations begin</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="business_hours_end"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Time</FormLabel>
                        <FormControl>
                          <Input {...field} type="time" data-testid="input-business_hours_end" />
                        </FormControl>
                        <FormDescription>When operations end</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="working_days"
                  render={() => (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel className="text-base">Working Days</FormLabel>
                        <FormDescription>Select the days your business operates</FormDescription>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                        {WEEKDAYS.map((day) => (
                          <FormField
                            key={day.id}
                            control={form.control}
                            name="working_days"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={day.id}
                                  className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(day.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, day.id])
                                          : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== day.id
                                              )
                                            )
                                      }}
                                      data-testid={`checkbox-working_day_${day.id}`}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal text-sm">
                                    {day.label}
                                  </FormLabel>
                                </FormItem>
                              )
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Operational Settings
                </CardTitle>
                <CardDescription>Warehouse and order processing configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="default_order_location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Order Location</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Warehouse A" data-testid="input-default_order_location" />
                        </FormControl>
                        <FormDescription>Default warehouse for new orders</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="default_priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Priority</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-default_priority">
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>Default order priority</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pickup_cutoff_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pickup Cutoff Time</FormLabel>
                        <FormControl>
                          <Input {...field} type="time" data-testid="input-pickup_cutoff_time" />
                        </FormControl>
                        <FormDescription>Last time for same-day pickup</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="max_order_processing_days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Processing Days</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number" 
                            min="1"
                            max="30"
                            data-testid="input-max_order_processing_days" 
                          />
                        </FormControl>
                        <FormDescription>Maximum days to process orders (1-30 days)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="warehouse_emergency_contact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Emergency Contact Number</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="+420 XXX XXX XXX" data-testid="input-warehouse_emergency_contact" />
                        </FormControl>
                        <FormDescription>24/7 warehouse emergency line</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="warehouse_contact_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Warehouse Contact Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="warehouse@daviesupply.com" data-testid="input-warehouse_contact_email" />
                        </FormControl>
                        <FormDescription>General warehouse inquiries</FormDescription>
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
                  Notification Preferences
                </CardTitle>
                <CardDescription>Email and SMS notification settings</CardDescription>
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
                          <FormLabel>Email Notifications</FormLabel>
                          <FormDescription>
                            Receive notifications via email
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
                          <FormLabel>SMS Notifications</FormLabel>
                          <FormDescription>
                            Receive notifications via SMS
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
                          <FormLabel>Low Stock Alerts</FormLabel>
                          <FormDescription>
                            Get notified when inventory is low
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
                          <FormLabel>Order Status Changes</FormLabel>
                          <FormDescription>
                            Get notified when order status changes
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
                          <FormLabel>Daily Summary Report</FormLabel>
                          <FormDescription>
                            Receive daily business summary
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
                          <FormLabel>Weekly Report</FormLabel>
                          <FormDescription>
                            Receive weekly business report
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
                  Customer Portal
                </CardTitle>
                <CardDescription>Self-service customer portal and policies</CardDescription>
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
                        <FormLabel>Enable Customer Portal</FormLabel>
                        <FormDescription>
                          Allow customers to track orders and manage their account
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
                      <FormLabel>Return Policy</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Enter your return policy here..."
                          rows={6}
                          data-testid="textarea-return_policy_text"
                        />
                      </FormControl>
                      <FormDescription>
                        This text will be displayed to customers
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
                  AI Features
                </CardTitle>
                <CardDescription>Artificial intelligence and automation features</CardDescription>
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
                          <FormLabel>AI Address Parsing</FormLabel>
                          <FormDescription>
                            Automatically parse and validate customer addresses
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
                          <FormLabel>AI Carton Packing</FormLabel>
                          <FormDescription>
                            Optimize package selection with AI
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
                  Compliance & Security
                </CardTitle>
                <CardDescription>Audit logs and data retention policies</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="audit_log_retention_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Audit Log Retention (Days)</FormLabel>
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
                        How long to keep audit logs (7-365 days, recommended: 90 days)
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
                ⚠️ Form Validation Errors ({Object.keys(form.formState.errors).length})
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
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save All Settings
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
