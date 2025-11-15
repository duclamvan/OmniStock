import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Settings as SettingsIcon, Save, Loader2, Database, Shield, Plug, Bot } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { camelToSnake, deepCamelToSnake } from "@/utils/caseConverters";

const formSchema = z.object({
  app_name: z.string().optional(),
  timezone: z.string().optional(),
  date_format: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']).optional(),
  enable_dark_mode: z.boolean().optional(),
  
  session_timeout_minutes: z.preprocess(
    (val) => val === '' || val === null || val === undefined ? undefined : val,
    z.coerce.number().min(5).optional()
  ),
  auto_save_interval_seconds: z.preprocess(
    (val) => val === '' || val === null || val === undefined ? undefined : val,
    z.coerce.number().min(10).optional()
  ),
  compact_view: z.boolean().optional(),
  
  auto_backup_enabled: z.boolean().optional(),
  backup_frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
  data_retention_period_days: z.preprocess(
    (val) => val === '' || val === null || val === undefined ? undefined : val,
    z.coerce.number().min(1).optional()
  ),
  archive_old_orders: z.boolean().optional(),
  archive_after_days: z.preprocess(
    (val) => val === '' || val === null || val === undefined ? undefined : val,
    z.coerce.number().min(1).optional()
  ),
  
  require_strong_passwords: z.boolean().optional(),
  password_expiry_days: z.preprocess(
    (val) => val === '' || val === null || val === undefined ? undefined : val,
    z.coerce.number().min(0).optional()
  ),
  two_factor_authentication: z.boolean().optional(),
  session_logging: z.boolean().optional(),
  ip_whitelist_enabled: z.boolean().optional(),
  
  facebook_integration_enabled: z.boolean().optional(),
  openai_integration_enabled: z.boolean().optional(),
  deepseek_ai_enabled: z.boolean().optional(),
  nominatim_geocoding_enabled: z.boolean().optional(),
  frankfurter_exchange_rates_enabled: z.boolean().optional(),
  
  enable_ai_address_parsing: z.boolean().optional(),
  enable_ai_carton_packing: z.boolean().optional(),
  enable_ai_weight_estimation: z.boolean().optional(),
  auto_optimize_warehouse_locations: z.boolean().optional(),
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

const timezones = [
  { value: 'Europe/Prague', label: 'Europe/Prague (CET)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (CET)' },
  { value: 'Europe/London', label: 'Europe/London (GMT)' },
  { value: 'America/New_York', label: 'America/New York (EST)' },
  { value: 'America/Los_Angeles', label: 'America/Los Angeles (PST)' },
  { value: 'America/Chicago', label: 'America/Chicago (CST)' },
  { value: 'Asia/Ho_Chi_Minh', label: 'Asia/Ho Chi Minh (ICT)' },
  { value: 'Asia/Shanghai', label: 'Asia/Shanghai (CST)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEDT)' },
  { value: 'UTC', label: 'UTC' },
];

export default function SystemSettings() {
  const { toast } = useToast();
  const { systemSettings, isLoading } = useSettings();
  const [originalSettings, setOriginalSettings] = useState<Partial<FormValues>>({});

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      app_name: systemSettings.appName,
      timezone: systemSettings.timezone,
      date_format: systemSettings.dateFormat,
      enable_dark_mode: systemSettings.enableDarkMode,
      
      session_timeout_minutes: systemSettings.sessionTimeoutMinutes,
      auto_save_interval_seconds: systemSettings.autoSaveIntervalSeconds,
      compact_view: systemSettings.compactView,
      
      auto_backup_enabled: systemSettings.autoBackupEnabled,
      backup_frequency: systemSettings.backupFrequency,
      data_retention_period_days: systemSettings.dataRetentionPeriodDays,
      archive_old_orders: systemSettings.archiveOldOrders,
      archive_after_days: systemSettings.archiveAfterDays,
      
      require_strong_passwords: systemSettings.requireStrongPasswords,
      password_expiry_days: systemSettings.passwordExpiryDays,
      two_factor_authentication: systemSettings.twoFactorAuthentication,
      session_logging: systemSettings.sessionLogging,
      ip_whitelist_enabled: systemSettings.ipWhitelistEnabled,
      
      facebook_integration_enabled: systemSettings.facebookIntegrationEnabled,
      openai_integration_enabled: systemSettings.openaiIntegrationEnabled,
      deepseek_ai_enabled: systemSettings.deepseekAiEnabled,
      nominatim_geocoding_enabled: systemSettings.nominatimGeocodingEnabled,
      frankfurter_exchange_rates_enabled: systemSettings.frankfurterExchangeRatesEnabled,
      
      enable_ai_address_parsing: systemSettings.enableAiAddressParsing,
      enable_ai_carton_packing: systemSettings.enableAiCartonPacking,
      enable_ai_weight_estimation: systemSettings.enableAiWeightEstimation,
      auto_optimize_warehouse_locations: systemSettings.autoOptimizeWarehouseLocations,
    },
  });

  // Capture snapshot when settings load
  useEffect(() => {
    if (!isLoading) {
      const snapshot = {
        app_name: systemSettings.appName,
        timezone: systemSettings.timezone,
        date_format: systemSettings.dateFormat,
        enable_dark_mode: systemSettings.enableDarkMode,
        
        session_timeout_minutes: systemSettings.sessionTimeoutMinutes,
        auto_save_interval_seconds: systemSettings.autoSaveIntervalSeconds,
        compact_view: systemSettings.compactView,
        
        auto_backup_enabled: systemSettings.autoBackupEnabled,
        backup_frequency: systemSettings.backupFrequency,
        data_retention_period_days: systemSettings.dataRetentionPeriodDays,
        archive_old_orders: systemSettings.archiveOldOrders,
        archive_after_days: systemSettings.archiveAfterDays,
        
        require_strong_passwords: systemSettings.requireStrongPasswords,
        password_expiry_days: systemSettings.passwordExpiryDays,
        two_factor_authentication: systemSettings.twoFactorAuthentication,
        session_logging: systemSettings.sessionLogging,
        ip_whitelist_enabled: systemSettings.ipWhitelistEnabled,
        
        facebook_integration_enabled: systemSettings.facebookIntegrationEnabled,
        openai_integration_enabled: systemSettings.openaiIntegrationEnabled,
        deepseek_ai_enabled: systemSettings.deepseekAiEnabled,
        nominatim_geocoding_enabled: systemSettings.nominatimGeocodingEnabled,
        frankfurter_exchange_rates_enabled: systemSettings.frankfurterExchangeRatesEnabled,
        
        enable_ai_address_parsing: systemSettings.enableAiAddressParsing,
        enable_ai_carton_packing: systemSettings.enableAiCartonPacking,
        enable_ai_weight_estimation: systemSettings.enableAiWeightEstimation,
        auto_optimize_warehouse_locations: systemSettings.autoOptimizeWarehouseLocations,
      };
      setOriginalSettings(snapshot);
      form.reset(snapshot);
    }
  }, [isLoading, form, systemSettings]);

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
          category: 'system' 
        });
      });
      
      await Promise.all(savePromises);
    },
    onSuccess: async () => {
      // Invalidate and refetch settings to get true persisted state
      await queryClient.invalidateQueries({ queryKey: ['/api/settings', 'system'] });
      
      // The useEffect will automatically update originalSettings when new data loads
      toast({
        title: "Settings Saved",
        description: "System settings have been updated successfully.",
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
        <CardContent className="flex items-center justify-center py-8 sm:py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
        <Tabs defaultValue="system" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="system" className="flex items-center gap-1 sm:gap-2">
              <SettingsIcon className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">System</span>
            </TabsTrigger>
            <TabsTrigger value="data" className="flex items-center gap-1 sm:gap-2">
              <Database className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Data</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-1 sm:gap-2">
              <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center gap-1 sm:gap-2">
              <Plug className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Integrations</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-1 sm:gap-2">
              <Bot className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">AI & Automation</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: System */}
          <TabsContent value="system" className="space-y-4">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <SettingsIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  System Preferences
                </CardTitle>
                <CardDescription className="text-sm">Application-wide system settings</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <FormField
                  control={form.control}
                  name="app_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Application Name</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} placeholder="Davie Supply" data-testid="input-app_name" />
                      </FormControl>
                      <FormDescription>Name displayed throughout the application</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="timezone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Timezone</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-timezone">
                              <SelectValue placeholder="Select timezone" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {timezones.map((tz) => (
                              <SelectItem key={tz.value} value={tz.value}>
                                {tz.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>Default timezone for the system</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="date_format"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date Format</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-date_format">
                              <SelectValue placeholder="Select date format" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                            <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                            <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>Default date format for display</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="session_timeout_minutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Session Timeout (minutes)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ''}
                            type="number"
                            min="5"
                            placeholder="60"
                            data-testid="input-session_timeout_minutes"
                          />
                        </FormControl>
                        <FormDescription>Auto logout after inactivity</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="auto_save_interval_seconds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Auto-save Interval (seconds)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ''}
                            type="number"
                            min="10"
                            placeholder="30"
                            data-testid="input-auto_save_interval_seconds"
                          />
                        </FormControl>
                        <FormDescription>How often to auto-save drafts</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="enable_dark_mode"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value === true}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-enable_dark_mode"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Enable Dark Mode</FormLabel>
                        <FormDescription>
                          Enable dark mode as the default theme
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="compact_view"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value === true}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-compact_view"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Compact View</FormLabel>
                        <FormDescription>
                          Use compact layout for tables and lists
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Data */}
          <TabsContent value="data" className="space-y-4">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Database className="h-4 w-4 sm:h-5 sm:w-5" />
                  Data Management
                </CardTitle>
                <CardDescription className="text-sm">Backup, retention, and archival settings</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <FormField
                  control={form.control}
                  name="auto_backup_enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value === true}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-auto_backup_enabled"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Auto-backup Enabled</FormLabel>
                        <FormDescription>
                          Automatically backup data on schedule
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="backup_frequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Backup Frequency</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-backup_frequency">
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>How often to create backups</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="data_retention_period_days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Retention Period (days)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ''}
                            type="number"
                            min="1"
                            placeholder="365"
                            data-testid="input-data_retention_period_days"
                          />
                        </FormControl>
                        <FormDescription>How long to keep data</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="archive_old_orders"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value === true}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-archive_old_orders"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Archive Old Orders</FormLabel>
                        <FormDescription>
                          Automatically archive completed orders
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="archive_after_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Archive After (days)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ''}
                          type="number"
                          min="1"
                          placeholder="90"
                          data-testid="input-archive_after_days"
                        />
                      </FormControl>
                      <FormDescription>Archive orders after this many days</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Security */}
          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
                  Security
                </CardTitle>
                <CardDescription className="text-sm">Security and authentication settings</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <FormField
                  control={form.control}
                  name="require_strong_passwords"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value === true}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-require_strong_passwords"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Require Strong Passwords</FormLabel>
                        <FormDescription>
                          Enforce strong password requirements
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password_expiry_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password Expiry (days)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ''}
                          type="number"
                          min="0"
                          placeholder="90"
                          data-testid="input-password_expiry_days"
                        />
                      </FormControl>
                      <FormDescription>Password expires after this many days (0 = never)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="two_factor_authentication"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value === true}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-two_factor_authentication"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Two-Factor Authentication</FormLabel>
                        <FormDescription>
                          Enable two-factor authentication for all users
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="session_logging"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value === true}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-session_logging"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Session Logging</FormLabel>
                        <FormDescription>
                          Log all user sessions for audit trail
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ip_whitelist_enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value === true}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-ip_whitelist_enabled"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>IP Whitelist Enabled</FormLabel>
                        <FormDescription>
                          Restrict access to whitelisted IP addresses
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4: Integrations */}
          <TabsContent value="integrations" className="space-y-4">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Plug className="h-4 w-4 sm:h-5 sm:w-5" />
                  Integrations
                </CardTitle>
                <CardDescription className="text-sm">Third-party service integrations</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <FormField
                  control={form.control}
                  name="facebook_integration_enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value === true}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-facebook_integration_enabled"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Facebook Integration Enabled</FormLabel>
                        <FormDescription>
                          Enable Facebook Marketplace integration
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="openai_integration_enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value === true}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-openai_integration_enabled"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>OpenAI Integration Enabled</FormLabel>
                        <FormDescription>
                          Enable OpenAI API integration for AI features
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="deepseek_ai_enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value === true}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-deepseek_ai_enabled"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>DeepSeek AI Enabled</FormLabel>
                        <FormDescription>
                          Enable DeepSeek AI integration
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nominatim_geocoding_enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value === true}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-nominatim_geocoding_enabled"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Nominatim Geocoding Enabled</FormLabel>
                        <FormDescription>
                          Enable Nominatim for address geocoding
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="frankfurter_exchange_rates_enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value === true}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-frankfurter_exchange_rates_enabled"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Frankfurter Exchange Rates Enabled</FormLabel>
                        <FormDescription>
                          Enable Frankfurter API for exchange rates
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 5: AI & Automation */}
          <TabsContent value="ai" className="space-y-4">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Bot className="h-4 w-4 sm:h-5 sm:w-5" />
                  AI & Automation
                </CardTitle>
                <CardDescription className="text-sm">AI-powered automation features</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <FormField
                  control={form.control}
                  name="enable_ai_address_parsing"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value === true}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-enable_ai_address_parsing"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Enable AI Address Parsing</FormLabel>
                        <FormDescription>
                          Use AI to parse and validate addresses
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
                          checked={field.value === true}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-enable_ai_carton_packing"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Enable AI Carton Packing</FormLabel>
                        <FormDescription>
                          Use AI to optimize carton packing
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="enable_ai_weight_estimation"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value === true}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-enable_ai_weight_estimation"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Enable AI Weight Estimation</FormLabel>
                        <FormDescription>
                          Use AI to estimate package weights
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="auto_optimize_warehouse_locations"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value === true}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-auto_optimize_warehouse_locations"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Auto-optimize Warehouse Locations</FormLabel>
                        <FormDescription>
                          Automatically optimize inventory locations
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
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
