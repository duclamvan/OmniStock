import { useMutation, useQuery } from "@tanstack/react-query";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTranslation } from 'react-i18next';
import { Settings as SettingsIcon, Save, Loader2, Database, Shield, Plug, Bot, AlertTriangle, Trash2, Download, HardDrive, Clock, Archive, RefreshCw } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { camelToSnake, deepCamelToSnake } from "@/utils/caseConverters";
import { format } from "date-fns";

interface BackupRecord {
  id: number;
  backupType: 'manual' | 'auto_daily' | 'auto_weekly' | 'auto_monthly';
  status: 'in_progress' | 'completed' | 'failed';
  fileName: string;
  filePath: string;
  fileSize: number | null;
  recordCount: number | null;
  tablesIncluded: string[] | null;
  triggeredBy: string | null;
  createdAt: string;
  completedAt: string | null;
  expiresAt: string;
  errorMessage: string | null;
}

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
  const { t } = useTranslation(['settings', 'common']);
  const { toast } = useToast();
  const { systemSettings, isLoading } = useSettings();
  const [originalSettings, setOriginalSettings] = useState<Partial<FormValues>>({});
  const [showFactoryResetDialog, setShowFactoryResetDialog] = useState(false);
  const [confirmationPhrase, setConfirmationPhrase] = useState('');

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
        title: t('settings:settingsSaved'),
        description: t('settings:systemSettingsSavedSuccess'),
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

  const factoryResetMutation = useMutation({
    mutationFn: async (confirmationPhrase: string) => {
      const response = await apiRequest('POST', '/api/system/factory-reset', { confirmationPhrase });
      return response;
    },
    onSuccess: (data: any) => {
      setShowFactoryResetDialog(false);
      setConfirmationPhrase('');
      toast({
        title: t('settings:factoryResetSuccess'),
        description: `${data.totalDeleted} ${t('settings:recordsDeleted')}`,
      });
      // Invalidate all queries to refresh the UI
      queryClient.invalidateQueries();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: t('common:error'),
        description: error.message || t('settings:factoryResetFailed'),
      });
    },
  });

  const handleFactoryReset = () => {
    if (confirmationPhrase === 'DELETE ALL DATA') {
      factoryResetMutation.mutate(confirmationPhrase);
    }
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
              <span className="hidden sm:inline">{t('settings:system')}</span>
            </TabsTrigger>
            <TabsTrigger value="data" className="flex items-center gap-1 sm:gap-2">
              <Database className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('settings:data')}</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-1 sm:gap-2">
              <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('settings:security')}</span>
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center gap-1 sm:gap-2">
              <Plug className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('settings:integrations')}</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-1 sm:gap-2">
              <Bot className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('settings:aiAutomation')}</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: System */}
          <TabsContent value="system" className="space-y-4">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <SettingsIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  {t('settings:systemPreferences')}
                </CardTitle>
                <CardDescription className="text-sm">{t('settings:systemPreferencesDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <FormField
                  control={form.control}
                  name="app_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('settings:applicationName')}</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} placeholder={t('settings:applicationNamePlaceholder')} data-testid="input-app_name" />
                      </FormControl>
                      <FormDescription>{t('settings:applicationNameDescription')}</FormDescription>
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
                        <FormLabel>{t('settings:timezone')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-timezone">
                              <SelectValue placeholder={t('settings:selectTimezone')} />
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
                        <FormDescription>{t('settings:timezoneDescription')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="date_format"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:dateFormat')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-date_format">
                              <SelectValue placeholder={t('settings:selectDateFormat')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                            <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                            <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>{t('settings:dateFormatDescription')}</FormDescription>
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
                        <FormLabel>{t('settings:sessionTimeoutMinutes')}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ''}
                            type="number"
                            min="5"
                            placeholder={t('settings:sessionTimeoutMinutesPlaceholder')}
                            data-testid="input-session_timeout_minutes"
                          />
                        </FormControl>
                        <FormDescription>{t('settings:sessionTimeoutMinutesDescription')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="auto_save_interval_seconds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:autoSaveIntervalSeconds')}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ''}
                            type="number"
                            min="10"
                            placeholder={t('settings:autoSaveIntervalSecondsPlaceholder')}
                            data-testid="input-auto_save_interval_seconds"
                          />
                        </FormControl>
                        <FormDescription>{t('settings:autoSaveIntervalSecondsDescription')}</FormDescription>
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
                  {t('settings:dataManagementTitle')}
                </CardTitle>
                <CardDescription className="text-sm">{t('settings:dataManagementDescription')}</CardDescription>
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
                              <SelectValue placeholder={t('common:selectFrequency')} />
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

            {/* Backup History Card */}
            <BackupHistoryCard />

            {/* Factory Reset Card */}
            <Card className="border-red-200 dark:border-red-900">
              <CardHeader className="p-4 sm:p-6 bg-red-50 dark:bg-red-950/30">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-red-700 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
                  {t('settings:factoryResetTitle')}
                </CardTitle>
                <CardDescription className="text-sm text-red-600 dark:text-red-400">
                  {t('settings:factoryResetDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <Alert variant="destructive" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>{t('settings:factoryResetWarningTitle')}</AlertTitle>
                  <AlertDescription className="mt-2 space-y-2">
                    <p>{t('settings:factoryResetWarning1')}</p>
                    <p className="font-semibold">{t('settings:factoryResetWarning2')}</p>
                    <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
                      <li>{t('settings:factoryResetKeep1')}</li>
                      <li>{t('settings:factoryResetKeep2')}</li>
                      <li>{t('settings:factoryResetKeep3')}</li>
                    </ul>
                  </AlertDescription>
                </Alert>
                <Button
                  variant="destructive"
                  onClick={() => setShowFactoryResetDialog(true)}
                  className="w-full sm:w-auto"
                  data-testid="button-factory-reset"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('settings:factoryResetButton')}
                </Button>
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

      {/* Factory Reset Confirmation Dialog */}
      <Dialog open={showFactoryResetDialog} onOpenChange={setShowFactoryResetDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              {t('settings:factoryResetConfirmTitle')}
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-2">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{t('settings:factoryResetDialogWarning')}</AlertTitle>
                <AlertDescription className="mt-2">
                  <p className="text-sm">{t('settings:factoryResetDialogDescription')}</p>
                </AlertDescription>
              </Alert>
              <div className="space-y-2 text-sm">
                <p className="font-semibold">{t('settings:factoryResetWillDelete')}</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>{t('settings:factoryResetDelete1')}</li>
                  <li>{t('settings:factoryResetDelete2')}</li>
                  <li>{t('settings:factoryResetDelete3')}</li>
                  <li>{t('settings:factoryResetDelete4')}</li>
                </ul>
                <p className="font-semibold mt-3">{t('settings:factoryResetWillKeep')}</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>{t('settings:factoryResetKeep1')}</li>
                  <li>{t('settings:factoryResetKeep2')}</li>
                  <li>{t('settings:factoryResetKeep3')}</li>
                </ul>
              </div>
              <div className="space-y-2 pt-2">
                <p className="text-sm font-semibold">{t('settings:factoryResetConfirmInstructions')}</p>
                <Input
                  value={confirmationPhrase}
                  onChange={(e) => setConfirmationPhrase(e.target.value)}
                  placeholder="DELETE ALL DATA"
                  className="font-mono"
                  data-testid="input-factory-reset-confirm"
                />
                <p className="text-xs text-muted-foreground">{t('settings:factoryResetBackupRecommendation')}</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowFactoryResetDialog(false);
                setConfirmationPhrase('');
              }}
              data-testid="button-cancel-factory-reset"
            >
              {t('common:cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleFactoryReset}
              disabled={confirmationPhrase !== 'DELETE ALL DATA' || factoryResetMutation.isPending}
              data-testid="button-confirm-factory-reset"
            >
              {factoryResetMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('settings:factoryResetInProgress')}
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('settings:factoryResetConfirmButton')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Form>
  );
}

function BackupHistoryCard() {
  const { t } = useTranslation(['settings', 'common']);
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [backupToDelete, setBackupToDelete] = useState<BackupRecord | null>(null);

  const { data: backups = [], isLoading, refetch } = useQuery<BackupRecord[]>({
    queryKey: ['/api/backups'],
  });

  const createBackupMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/backups');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t('settings:backupCreated'),
        description: t('settings:backupCreatedDescription'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/backups'] });
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message || t('settings:backupFailed'),
        variant: 'destructive',
      });
    },
  });

  const deleteBackupMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/backups/${id}`);
    },
    onSuccess: () => {
      toast({
        title: t('settings:backupDeleted'),
        description: t('settings:backupDeletedDescription'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/backups'] });
      setShowDeleteDialog(false);
      setBackupToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message || t('settings:backupDeleteFailed'),
        variant: 'destructive',
      });
    },
  });

  const cleanupMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/backups/cleanup');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: t('settings:cleanupComplete'),
        description: t('settings:cleanupDescription', { count: data.deletedCount }),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/backups'] });
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message || t('settings:cleanupFailed'),
        variant: 'destructive',
      });
    },
  });

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">{t('settings:backupStatusCompleted')}</Badge>;
      case 'in_progress':
        return <Badge variant="secondary">{t('settings:backupStatusInProgress')}</Badge>;
      case 'failed':
        return <Badge variant="destructive">{t('settings:backupStatusFailed')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getBackupTypeBadge = (type: string) => {
    switch (type) {
      case 'manual':
        return <Badge variant="outline">{t('settings:backupTypeManual')}</Badge>;
      case 'auto_daily':
        return <Badge variant="secondary">{t('settings:backupTypeDaily')}</Badge>;
      case 'auto_weekly':
        return <Badge variant="secondary">{t('settings:backupTypeWeekly')}</Badge>;
      case 'auto_monthly':
        return <Badge variant="secondary">{t('settings:backupTypeMonthly')}</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const handleDownload = (backup: BackupRecord) => {
    window.open(`/api/backups/${backup.id}/download`, '_blank');
  };

  return (
    <>
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <HardDrive className="h-4 w-4 sm:h-5 sm:w-5" />
                {t('settings:backupHistory')}
              </CardTitle>
              <CardDescription className="text-sm">{t('settings:backupHistoryDescription')}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                data-testid="button-refresh-backups"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => cleanupMutation.mutate()}
                disabled={cleanupMutation.isPending}
                data-testid="button-cleanup-backups"
              >
                {cleanupMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Archive className="h-4 w-4" />
                )}
              </Button>
              <Button
                onClick={() => createBackupMutation.mutate()}
                disabled={createBackupMutation.isPending}
                data-testid="button-create-backup"
              >
                {createBackupMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('settings:creatingBackup')}
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    {t('settings:createBackup')}
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <HardDrive className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t('settings:noBackups')}</p>
              <p className="text-sm mt-2">{t('settings:noBackupsHint')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('settings:backupDate')}</TableHead>
                    <TableHead>{t('settings:backupType')}</TableHead>
                    <TableHead>{t('settings:backupStatus')}</TableHead>
                    <TableHead>{t('settings:backupSize')}</TableHead>
                    <TableHead>{t('settings:backupRecords')}</TableHead>
                    <TableHead>{t('settings:backupExpires')}</TableHead>
                    <TableHead className="text-right">{t('common:actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backups.map((backup) => (
                    <TableRow key={backup.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(backup.createdAt), 'dd/MM/yyyy HH:mm')}
                        </div>
                      </TableCell>
                      <TableCell>{getBackupTypeBadge(backup.backupType)}</TableCell>
                      <TableCell>{getStatusBadge(backup.status)}</TableCell>
                      <TableCell>{formatFileSize(backup.fileSize)}</TableCell>
                      <TableCell>{backup.recordCount?.toLocaleString() || '-'}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(backup.expiresAt), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {backup.status === 'completed' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(backup)}
                              data-testid={`button-download-backup-${backup.id}`}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setBackupToDelete(backup);
                              setShowDeleteDialog(true);
                            }}
                            data-testid={`button-delete-backup-${backup.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings:deleteBackupTitle')}</DialogTitle>
            <DialogDescription>
              {t('settings:deleteBackupDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setBackupToDelete(null);
              }}
            >
              {t('common:cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => backupToDelete && deleteBackupMutation.mutate(backupToDelete.id)}
              disabled={deleteBackupMutation.isPending}
            >
              {deleteBackupMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t('common:delete')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
