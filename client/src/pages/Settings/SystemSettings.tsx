import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Settings as SettingsIcon, Save, Loader2, Database, Shield, Plug, Bot } from "lucide-react";

const formSchema = z.object({
  app_name: z.string().default('Davie Supply'),
  timezone: z.string().default('Europe/Prague'),
  date_format: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']).default('DD/MM/YYYY'),
  enable_dark_mode: z.boolean().default(false),
  
  session_timeout_minutes: z.coerce.number().min(5).default(60),
  auto_save_interval_seconds: z.coerce.number().min(10).default(30),
  compact_view: z.boolean().default(false),
  
  auto_backup_enabled: z.boolean().default(false),
  backup_frequency: z.enum(['daily', 'weekly', 'monthly']).default('weekly'),
  data_retention_period_days: z.coerce.number().min(1).default(365),
  archive_old_orders: z.boolean().default(false),
  archive_after_days: z.coerce.number().min(1).default(90),
  
  require_strong_passwords: z.boolean().default(true),
  password_expiry_days: z.coerce.number().min(0).default(90),
  two_factor_authentication: z.boolean().default(false),
  session_logging: z.boolean().default(true),
  ip_whitelist_enabled: z.boolean().default(false),
  
  facebook_integration_enabled: z.boolean().default(false),
  openai_integration_enabled: z.boolean().default(false),
  deepseek_ai_enabled: z.boolean().default(false),
  nominatim_geocoding_enabled: z.boolean().default(false),
  frankfurter_exchange_rates_enabled: z.boolean().default(true),
  
  enable_ai_address_parsing: z.boolean().default(false),
  enable_ai_carton_packing: z.boolean().default(false),
  enable_ai_weight_estimation: z.boolean().default(false),
  auto_optimize_warehouse_locations: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

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

  const { data: settings = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/settings'],
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      app_name: 'Davie Supply',
      timezone: 'Europe/Prague',
      date_format: 'DD/MM/YYYY',
      enable_dark_mode: false,
      
      session_timeout_minutes: 60,
      auto_save_interval_seconds: 30,
      compact_view: false,
      
      auto_backup_enabled: false,
      backup_frequency: 'weekly',
      data_retention_period_days: 365,
      archive_old_orders: false,
      archive_after_days: 90,
      
      require_strong_passwords: true,
      password_expiry_days: 90,
      two_factor_authentication: false,
      session_logging: true,
      ip_whitelist_enabled: false,
      
      facebook_integration_enabled: false,
      openai_integration_enabled: false,
      deepseek_ai_enabled: false,
      nominatim_geocoding_enabled: false,
      frankfurter_exchange_rates_enabled: true,
      
      enable_ai_address_parsing: false,
      enable_ai_carton_packing: false,
      enable_ai_weight_estimation: false,
      auto_optimize_warehouse_locations: false,
    },
  });

  // Update form when settings are loaded
  useEffect(() => {
    if (settings.length > 0 && !isLoading) {
      const settingsMap = settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, any>);

      const keys = Object.keys(formSchema.shape);
      keys.forEach((key) => {
        if (settingsMap[key] !== undefined) {
          form.setValue(key as keyof FormValues, settingsMap[key], { shouldDirty: false });
        }
      });
    }
  }, [settings, isLoading]);

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const savePromises = Object.entries(values).map(([key, value]) =>
        apiRequest('POST', `/api/settings`, { key, value, category: 'system' })
      );
      await Promise.all(savePromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
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
        {/* System Preferences */}
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
                    <Input {...field} placeholder="Davie Supply" data-testid="input-app_name" />
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                      checked={field.value}
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
                      checked={field.value}
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

        {/* Data Management */}
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
                      checked={field.value}
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                      checked={field.value}
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

        {/* Security */}
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
                      checked={field.value}
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
                      checked={field.value}
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
                      checked={field.value}
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
                      checked={field.value}
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

        {/* Integrations */}
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
                      checked={field.value}
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
                      checked={field.value}
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
                      checked={field.value}
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
                      checked={field.value}
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
                      checked={field.value}
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

        {/* Automation & AI */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Bot className="h-4 w-4 sm:h-5 sm:w-5" />
              Automation & AI
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
                      checked={field.value}
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
                      checked={field.value}
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
                      checked={field.value}
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
                      checked={field.value}
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
