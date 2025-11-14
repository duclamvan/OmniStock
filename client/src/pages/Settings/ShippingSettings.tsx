import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Truck, Save, Loader2, Package, Tag, Bell, DollarSign } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { camelToSnake, deepCamelToSnake } from "@/utils/caseConverters";

const formSchema = z.object({
  quick_select_czk: z.string().default('0,100,150,250'),
  quick_select_eur: z.string().default('0,5,10,13,15,20'),
  default_shipping_method: z.enum(['PPL', 'DHL', 'Other']).default('PPL'),
  ppl_default_sender_address: z.string().default(''),
  dhl_default_sender_address: z.string().default(''),
  
  available_carriers: z.string().default('GLS,PPL,DHL'),
  default_carrier: z.string().default('PPL'),
  enable_carrier_rate_shopping: z.boolean().default(false),
  auto_select_cheapest_carrier: z.boolean().default(false),
  
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
  
  free_shipping_threshold: z.coerce.number().min(0).default(0),
  default_shipping_cost: z.coerce.number().min(0).default(0),
  shipping_cost_currency: z.enum(['CZK', 'EUR', 'USD']).default('CZK'),
  volumetric_weight_divisor: z.coerce.number().min(1).default(5000),
  max_package_weight_kg: z.coerce.number().min(0).default(30),
  max_package_dimensions_cm: z.string().default('120x80x80'),
});

type FormValues = z.infer<typeof formSchema>;

export default function ShippingSettings() {
  const { toast } = useToast();
  const { shippingSettings, isLoading } = useSettings();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quick_select_czk: shippingSettings.quickSelectCzk || '0,100,150,250',
      quick_select_eur: shippingSettings.quickSelectEur || '0,5,10,13,15,20',
      default_shipping_method: shippingSettings.defaultShippingMethod || 'PPL',
      ppl_default_sender_address: typeof shippingSettings.pplDefaultSenderAddress === 'object' 
        ? JSON.stringify(shippingSettings.pplDefaultSenderAddress, null, 2) 
        : shippingSettings.pplDefaultSenderAddress || '',
      dhl_default_sender_address: typeof shippingSettings.dhlDefaultSenderAddress === 'object'
        ? JSON.stringify(shippingSettings.dhlDefaultSenderAddress, null, 2)
        : shippingSettings.dhlDefaultSenderAddress || '',
      
      available_carriers: shippingSettings.availableCarriers || 'GLS,PPL,DHL',
      default_carrier: shippingSettings.defaultCarrier || 'PPL',
      enable_carrier_rate_shopping: shippingSettings.enableCarrierRateShopping ?? false,
      auto_select_cheapest_carrier: shippingSettings.autoSelectCheapestCarrier ?? false,
      
      default_label_size: shippingSettings.defaultLabelSize || 'A4',
      label_format: shippingSettings.labelFormat || 'PDF',
      auto_print_labels: shippingSettings.autoPrintLabels ?? false,
      include_packing_slip: shippingSettings.includePackingSlip ?? true,
      include_invoice: shippingSettings.includeInvoice ?? false,
      
      enable_tracking: shippingSettings.enableTracking ?? true,
      auto_update_tracking_status: shippingSettings.autoUpdateTrackingStatus ?? true,
      tracking_update_frequency_hours: shippingSettings.trackingUpdateFrequencyHours ?? 6,
      send_tracking_email_to_customer: shippingSettings.sendTrackingEmailToCustomer ?? true,
      include_estimated_delivery: shippingSettings.includeEstimatedDelivery ?? true,
      
      free_shipping_threshold: shippingSettings.freeShippingThreshold ?? 0,
      default_shipping_cost: shippingSettings.defaultShippingCost ?? 0,
      shipping_cost_currency: shippingSettings.shippingCostCurrency || 'CZK',
      volumetric_weight_divisor: shippingSettings.volumetricWeightDivisor ?? 5000,
      max_package_weight_kg: shippingSettings.maxPackageWeightKg ?? 30,
      max_package_dimensions_cm: shippingSettings.maxPackageDimensionsCm || '120x80x80',
    },
  });

  // Reset form when settings load
  useEffect(() => {
    if (!isLoading) {
      form.reset({
        quick_select_czk: shippingSettings.quickSelectCzk || '0,100,150,250',
        quick_select_eur: shippingSettings.quickSelectEur || '0,5,10,13,15,20',
        default_shipping_method: shippingSettings.defaultShippingMethod || 'PPL',
        ppl_default_sender_address: typeof shippingSettings.pplDefaultSenderAddress === 'object' 
          ? JSON.stringify(shippingSettings.pplDefaultSenderAddress, null, 2) 
          : shippingSettings.pplDefaultSenderAddress || '',
        dhl_default_sender_address: typeof shippingSettings.dhlDefaultSenderAddress === 'object'
          ? JSON.stringify(shippingSettings.dhlDefaultSenderAddress, null, 2)
          : shippingSettings.dhlDefaultSenderAddress || '',
        
        available_carriers: shippingSettings.availableCarriers || 'GLS,PPL,DHL',
        default_carrier: shippingSettings.defaultCarrier || 'PPL',
        enable_carrier_rate_shopping: shippingSettings.enableCarrierRateShopping ?? false,
        auto_select_cheapest_carrier: shippingSettings.autoSelectCheapestCarrier ?? false,
        
        default_label_size: shippingSettings.defaultLabelSize || 'A4',
        label_format: shippingSettings.labelFormat || 'PDF',
        auto_print_labels: shippingSettings.autoPrintLabels ?? false,
        include_packing_slip: shippingSettings.includePackingSlip ?? true,
        include_invoice: shippingSettings.includeInvoice ?? false,
        
        enable_tracking: shippingSettings.enableTracking ?? true,
        auto_update_tracking_status: shippingSettings.autoUpdateTrackingStatus ?? true,
        tracking_update_frequency_hours: shippingSettings.trackingUpdateFrequencyHours ?? 6,
        send_tracking_email_to_customer: shippingSettings.sendTrackingEmailToCustomer ?? true,
        include_estimated_delivery: shippingSettings.includeEstimatedDelivery ?? true,
        
        free_shipping_threshold: shippingSettings.freeShippingThreshold ?? 0,
        default_shipping_cost: shippingSettings.defaultShippingCost ?? 0,
        shipping_cost_currency: shippingSettings.shippingCostCurrency || 'CZK',
        volumetric_weight_divisor: shippingSettings.volumetricWeightDivisor ?? 5000,
        max_package_weight_kg: shippingSettings.maxPackageWeightKg ?? 30,
        max_package_dimensions_cm: shippingSettings.maxPackageDimensionsCm || '120x80x80',
      });
    }
  }, [isLoading, form, shippingSettings]);

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const savePromises = Object.entries(values).map(([key, value]) => {
        let processedValue = value;
        // Parse JSON for address fields
        if (key.includes('address') && typeof value === 'string' && value.trim()) {
          try {
            processedValue = JSON.parse(value);
          } catch (e) {
            throw new Error(`Invalid JSON format for ${key}`);
          }
        }
        return apiRequest('POST', `/api/settings`, { key: camelToSnake(key), value: deepCamelToSnake(processedValue), category: 'shipping' });
      });
      await Promise.all(savePromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({
        title: "Settings Saved",
        description: "Shipping settings have been updated successfully.",
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
        {/* Carrier Configuration */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Truck className="h-4 w-4 sm:h-5 sm:w-5" />
              Carrier Configuration
            </CardTitle>
            <CardDescription className="text-sm">Configure available carriers and carrier preferences</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
            <FormField
              control={form.control}
              name="available_carriers"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Available Carriers</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="GLS,PPL,DHL,DPD,UPS,FedEx,17TRACK" data-testid="input-available_carriers" />
                  </FormControl>
                  <FormDescription>Comma-separated list of available carriers</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="default_carrier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Carrier</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-default_carrier">
                          <SelectValue placeholder="Select default carrier" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="GLS">GLS</SelectItem>
                        <SelectItem value="PPL">PPL</SelectItem>
                        <SelectItem value="DHL">DHL</SelectItem>
                        <SelectItem value="DPD">DPD</SelectItem>
                        <SelectItem value="UPS">UPS</SelectItem>
                        <SelectItem value="FedEx">FedEx</SelectItem>
                        <SelectItem value="17TRACK">17TRACK</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="default_shipping_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Shipping Method</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-default_shipping_method">
                          <SelectValue placeholder="Select shipping method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PPL">PPL</SelectItem>
                        <SelectItem value="DHL">DHL</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="enable_carrier_rate_shopping"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-enable_carrier_rate_shopping"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Enable Carrier Rate Shopping</FormLabel>
                    <FormDescription>
                      Compare rates across multiple carriers before shipping
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="auto_select_cheapest_carrier"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-auto_select_cheapest_carrier"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Auto-select Cheapest Carrier</FormLabel>
                    <FormDescription>
                      Automatically select the carrier with the lowest shipping cost
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Label Generation */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Tag className="h-4 w-4 sm:h-5 sm:w-5" />
              Label Generation
            </CardTitle>
            <CardDescription className="text-sm">Configure shipping label preferences and formats</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="default_label_size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Label Size</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-default_label_size">
                          <SelectValue placeholder="Select label size" />
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
                    <FormLabel>Label Format</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-label_format">
                          <SelectValue placeholder="Select label format" />
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
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-auto_print_labels"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Auto-print Labels</FormLabel>
                    <FormDescription>
                      Automatically print labels after generation
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
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-include_packing_slip"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Include Packing Slip</FormLabel>
                    <FormDescription>
                      Include packing slip with shipping labels
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
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-include_invoice"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Include Invoice</FormLabel>
                    <FormDescription>
                      Include invoice with shipping labels
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
              Tracking & Notifications
            </CardTitle>
            <CardDescription className="text-sm">Configure tracking and customer notification settings</CardDescription>
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
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-enable_tracking"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Enable Tracking</FormLabel>
                    <FormDescription>
                      Enable shipment tracking functionality
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
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-auto_update_tracking_status"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Auto-update Tracking Status</FormLabel>
                    <FormDescription>
                      Automatically update tracking status from carriers
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
                  <FormLabel>Tracking Update Frequency (hours)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      min="1"
                      max="24"
                      placeholder="6"
                      data-testid="input-tracking_update_frequency_hours"
                    />
                  </FormControl>
                  <FormDescription>How often to check for tracking updates (1-24 hours)</FormDescription>
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
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-send_tracking_email_to_customer"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Send Tracking Email to Customer</FormLabel>
                    <FormDescription>
                      Email tracking information to customers after shipment
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
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-include_estimated_delivery"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Include Estimated Delivery</FormLabel>
                    <FormDescription>
                      Include estimated delivery date in tracking emails
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Shipping Rules */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
              Shipping Rules
            </CardTitle>
            <CardDescription className="text-sm">Configure shipping costs and package limitations</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="free_shipping_threshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Free Shipping Threshold</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        data-testid="input-free_shipping_threshold"
                      />
                    </FormControl>
                    <FormDescription>Order value for free shipping</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="default_shipping_cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Shipping Cost</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        data-testid="input-default_shipping_cost"
                      />
                    </FormControl>
                    <FormDescription>Default shipping cost</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="shipping_cost_currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shipping Cost Currency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-shipping_cost_currency">
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="CZK">CZK</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quick_select_czk"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quick Select Amounts for CZK</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="0,100,150,250" data-testid="input-quick_select_czk" />
                    </FormControl>
                    <FormDescription>Comma-separated values</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quick_select_eur"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quick Select Amounts for EUR</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="0,5,10,13,15,20" data-testid="input-quick_select_eur" />
                    </FormControl>
                    <FormDescription>Comma-separated values</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="volumetric_weight_divisor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Volumetric Weight Divisor</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="1"
                        placeholder="5000"
                        data-testid="input-volumetric_weight_divisor"
                      />
                    </FormControl>
                    <FormDescription>For volumetric weight calculation</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="max_package_weight_kg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Package Weight (kg)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="30"
                        data-testid="input-max_package_weight_kg"
                      />
                    </FormControl>
                    <FormDescription>Maximum package weight</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="max_package_dimensions_cm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Package Dimensions (cm)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="120x80x80"
                        data-testid="input-max_package_dimensions_cm"
                      />
                    </FormControl>
                    <FormDescription>LxWxH in cm</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Default Sender Addresses */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Package className="h-4 w-4 sm:h-5 sm:w-5" />
              Default Sender Addresses
            </CardTitle>
            <CardDescription className="text-sm">Default sender addresses for shipping labels (JSON format)</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
            <FormField
              control={form.control}
              name="ppl_default_sender_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>PPL Default Sender Address</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder='{"name": "Your Company", "street": "Street Name", "city": "Prague", "zip": "12000", "country": "CZ"}'
                      className="font-mono text-sm"
                      rows={6}
                      data-testid="textarea-ppl_default_sender_address"
                    />
                  </FormControl>
                  <FormDescription>JSON format for PPL API</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dhl_default_sender_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>DHL Default Sender Address</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder='{"name": "Your Company", "street": "Street Name", "city": "Prague", "zip": "12000", "country": "CZ"}'
                      className="font-mono text-sm"
                      rows={6}
                      data-testid="textarea-dhl_default_sender_address"
                    />
                  </FormControl>
                  <FormDescription>JSON format for DHL API</FormDescription>
                  <FormMessage />
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
