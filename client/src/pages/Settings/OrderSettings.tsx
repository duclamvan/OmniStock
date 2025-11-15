import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ShoppingCart, Save, Loader2, Package, CheckCircle2, Zap, DollarSign, MapPin } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { camelToSnake, deepCamelToSnake } from "@/utils/caseConverters";

const formSchema = z.object({
  // Order Defaults
  default_payment_method: z.enum(['Cash', 'Card', 'Transfer', 'COD', 'Pay Later', 'Bank Transfer', 'PayPal']).optional(),
  default_order_status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).optional(),
  default_payment_status: z.enum(['pending', 'paid', 'pay_later', 'refunded']).optional(),
  default_carrier: z.string().optional(),
  default_communication_channel: z.enum(['Viber', 'WhatsApp', 'Zalo', 'E-mail', 'Phone']).optional(),
  default_discount_type: z.enum(['flat', 'rate']).optional(),
  
  // Locations & Carriers - NEW FIELDS
  default_order_location: z.string().optional(),
  auto_assign_warehouse_by_region: z.boolean().optional(),
  czech_republic_carrier: z.string().optional(),
  european_union_carrier: z.string().optional(),
  rest_of_world_carrier: z.string().optional(),
  enable_location_based_routing: z.boolean().optional(),
  prefer_nearest_warehouse: z.boolean().optional(),
  
  // Fulfillment Settings
  default_fulfillment_stage: z.enum(['pending', 'picking', 'packing', 'ready_to_ship', 'shipped']).optional(),
  auto_assign_orders_to_warehouse: z.boolean().optional(),
  auto_create_packing_lists: z.boolean().optional(),
  auto_calculate_shipping: z.boolean().optional(),
  require_barcode_scan_for_picking: z.boolean().optional(),
  enable_ai_carton_packing: z.boolean().optional(),
  pick_pack_time_sla_hours: z.preprocess(
    (val) => val === '' || val === null || val === undefined ? undefined : val,
    z.coerce.number().min(0).optional()
  ),
  
  // Order Validation
  require_customer_email: z.boolean().optional(),
  require_shipping_address: z.boolean().optional(),
  require_phone_number: z.boolean().optional(),
  allow_negative_stock: z.boolean().optional(),
  minimum_order_value: z.preprocess(
    (val) => val === '' || val === null || val === undefined ? undefined : val,
    z.coerce.number().min(0).optional()
  ),
  block_duplicate_orders_hours: z.preprocess(
    (val) => val === '' || val === null || val === undefined ? undefined : val,
    z.coerce.number().min(0).optional()
  ),
  
  // Automation
  auto_send_order_confirmation_email: z.boolean().optional(),
  auto_send_shipping_notification: z.boolean().optional(),
  auto_send_delivery_notification: z.boolean().optional(),
  auto_update_stock_on_order: z.boolean().optional(),
  auto_create_return_request: z.boolean().optional(),
  
  // COD Settings
  enable_cod: z.boolean().optional(),
  default_cod_currency: z.enum(['CZK', 'EUR', 'USD']).optional(),
  cod_fee_percentage: z.preprocess(
    (val) => val === '' || val === null || val === undefined ? undefined : val,
    z.coerce.number().min(0).max(100).optional()
  ),
  cod_fee_fixed_amount: z.preprocess(
    (val) => val === '' || val === null || val === undefined ? undefined : val,
    z.coerce.number().min(0).optional()
  ),
  require_cod_signature: z.boolean().optional(),
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

export default function OrderSettings() {
  const { toast } = useToast();
  const { orderSettings, isLoading } = useSettings();
  const [originalSettings, setOriginalSettings] = useState<Partial<FormValues>>({});

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      default_payment_method: orderSettings.defaultPaymentMethod,
      default_order_status: orderSettings.defaultOrderStatus,
      default_payment_status: orderSettings.defaultPaymentStatus,
      default_carrier: orderSettings.defaultCarrier,
      default_communication_channel: orderSettings.defaultCommunicationChannel,
      default_discount_type: orderSettings.defaultDiscountType,
      default_order_location: orderSettings.defaultOrderLocation,
      auto_assign_warehouse_by_region: orderSettings.autoAssignWarehouseByRegion,
      czech_republic_carrier: orderSettings.czechRepublicCarrier,
      european_union_carrier: orderSettings.europeanUnionCarrier,
      rest_of_world_carrier: orderSettings.restOfWorldCarrier,
      enable_location_based_routing: orderSettings.enableLocationBasedRouting,
      prefer_nearest_warehouse: orderSettings.preferNearestWarehouse,
      default_fulfillment_stage: orderSettings.defaultFulfillmentStage,
      auto_assign_orders_to_warehouse: orderSettings.autoAssignOrdersToWarehouse,
      auto_create_packing_lists: orderSettings.autoCreatePackingLists,
      auto_calculate_shipping: orderSettings.autoCalculateShipping,
      require_barcode_scan_for_picking: orderSettings.requireBarcodeScanForPicking,
      enable_ai_carton_packing: orderSettings.enableAiCartonPacking,
      pick_pack_time_sla_hours: orderSettings.pickPackTimeSlaHours,
      require_customer_email: orderSettings.requireCustomerEmail,
      require_shipping_address: orderSettings.requireShippingAddress,
      require_phone_number: orderSettings.requirePhoneNumber,
      allow_negative_stock: orderSettings.allowNegativeStock,
      minimum_order_value: orderSettings.minimumOrderValue,
      block_duplicate_orders_hours: orderSettings.blockDuplicateOrdersHours,
      auto_send_order_confirmation_email: orderSettings.autoSendOrderConfirmationEmail,
      auto_send_shipping_notification: orderSettings.autoSendShippingNotification,
      auto_send_delivery_notification: orderSettings.autoSendDeliveryNotification,
      auto_update_stock_on_order: orderSettings.autoUpdateStockOnOrder,
      auto_create_return_request: orderSettings.autoCreateReturnRequest,
      enable_cod: orderSettings.enableCod,
      default_cod_currency: orderSettings.defaultCodCurrency,
      cod_fee_percentage: orderSettings.codFeePercentage,
      cod_fee_fixed_amount: orderSettings.codFeeFixedAmount,
      require_cod_signature: orderSettings.requireCodSignature,
    },
  });

  // Capture snapshot when settings load
  useEffect(() => {
    if (!isLoading) {
      const snapshot = {
        default_payment_method: orderSettings.defaultPaymentMethod,
        default_order_status: orderSettings.defaultOrderStatus,
        default_payment_status: orderSettings.defaultPaymentStatus,
        default_carrier: orderSettings.defaultCarrier,
        default_communication_channel: orderSettings.defaultCommunicationChannel,
        default_discount_type: orderSettings.defaultDiscountType,
        default_order_location: orderSettings.defaultOrderLocation,
        auto_assign_warehouse_by_region: orderSettings.autoAssignWarehouseByRegion,
        czech_republic_carrier: orderSettings.czechRepublicCarrier,
        european_union_carrier: orderSettings.europeanUnionCarrier,
        rest_of_world_carrier: orderSettings.restOfWorldCarrier,
        enable_location_based_routing: orderSettings.enableLocationBasedRouting,
        prefer_nearest_warehouse: orderSettings.preferNearestWarehouse,
        default_fulfillment_stage: orderSettings.defaultFulfillmentStage,
        auto_assign_orders_to_warehouse: orderSettings.autoAssignOrdersToWarehouse,
        auto_create_packing_lists: orderSettings.autoCreatePackingLists,
        auto_calculate_shipping: orderSettings.autoCalculateShipping,
        require_barcode_scan_for_picking: orderSettings.requireBarcodeScanForPicking,
        enable_ai_carton_packing: orderSettings.enableAiCartonPacking,
        pick_pack_time_sla_hours: orderSettings.pickPackTimeSlaHours,
        require_customer_email: orderSettings.requireCustomerEmail,
        require_shipping_address: orderSettings.requireShippingAddress,
        require_phone_number: orderSettings.requirePhoneNumber,
        allow_negative_stock: orderSettings.allowNegativeStock,
        minimum_order_value: orderSettings.minimumOrderValue,
        block_duplicate_orders_hours: orderSettings.blockDuplicateOrdersHours,
        auto_send_order_confirmation_email: orderSettings.autoSendOrderConfirmationEmail,
        auto_send_shipping_notification: orderSettings.autoSendShippingNotification,
        auto_send_delivery_notification: orderSettings.autoSendDeliveryNotification,
        auto_update_stock_on_order: orderSettings.autoUpdateStockOnOrder,
        auto_create_return_request: orderSettings.autoCreateReturnRequest,
        enable_cod: orderSettings.enableCod,
        default_cod_currency: orderSettings.defaultCodCurrency,
        cod_fee_percentage: orderSettings.codFeePercentage,
        cod_fee_fixed_amount: orderSettings.codFeeFixedAmount,
        require_cod_signature: orderSettings.requireCodSignature,
      };
      setOriginalSettings(snapshot);
      form.reset(snapshot);
    }
  }, [isLoading, form, orderSettings]);

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
          category: 'orders' 
        });
      });
      
      await Promise.all(savePromises);
    },
    onSuccess: async () => {
      // Invalidate and refetch settings to get true persisted state
      await queryClient.invalidateQueries({ queryKey: ['/api/settings', 'orders'] });
      
      // The useEffect will automatically update originalSettings when new data loads
      toast({
        title: "Settings Saved",
        description: "Order settings have been updated successfully.",
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
        <Tabs defaultValue="defaults" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
            <TabsTrigger value="defaults" className="flex items-center gap-1 sm:gap-2">
              <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Defaults</span>
            </TabsTrigger>
            <TabsTrigger value="locations" className="flex items-center gap-1 sm:gap-2">
              <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Locations</span>
            </TabsTrigger>
            <TabsTrigger value="fulfillment" className="flex items-center gap-1 sm:gap-2">
              <Package className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Fulfillment</span>
            </TabsTrigger>
            <TabsTrigger value="validation" className="flex items-center gap-1 sm:gap-2">
              <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Validation</span>
            </TabsTrigger>
            <TabsTrigger value="automation" className="flex items-center gap-1 sm:gap-2">
              <Zap className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Automation</span>
            </TabsTrigger>
            <TabsTrigger value="cod" className="flex items-center gap-1 sm:gap-2">
              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">COD</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Defaults */}
          <TabsContent value="defaults" className="space-y-4">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                  Order Defaults
                </CardTitle>
                <CardDescription className="text-sm">Default values for new orders</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="default_payment_method"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Payment Method</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-default_payment_method">
                              <SelectValue placeholder="Select payment method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Cash">Cash</SelectItem>
                            <SelectItem value="Card">Card</SelectItem>
                            <SelectItem value="Transfer">Transfer</SelectItem>
                            <SelectItem value="COD">COD</SelectItem>
                            <SelectItem value="Pay Later">Pay Later</SelectItem>
                            <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                            <SelectItem value="PayPal">PayPal</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="default_order_status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Order Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-default_order_status">
                              <SelectValue placeholder="Select order status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="processing">Processing</SelectItem>
                            <SelectItem value="shipped">Shipped</SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="default_payment_status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Payment Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-default_payment_status">
                              <SelectValue placeholder="Select payment status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="pay_later">Pay Later</SelectItem>
                            <SelectItem value="refunded">Refunded</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="default_carrier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Carrier</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-default_carrier">
                              <SelectValue placeholder="Select carrier" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="GLS">GLS</SelectItem>
                            <SelectItem value="GLS DE">GLS DE</SelectItem>
                            <SelectItem value="PPL">PPL</SelectItem>
                            <SelectItem value="PPL CZ">PPL CZ</SelectItem>
                            <SelectItem value="DHL">DHL</SelectItem>
                            <SelectItem value="DHL DE">DHL DE</SelectItem>
                            <SelectItem value="DPD">DPD</SelectItem>
                            <SelectItem value="UPS">UPS</SelectItem>
                            <SelectItem value="FedEx">FedEx</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="default_communication_channel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Communication Channel</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-default_communication_channel">
                              <SelectValue placeholder="Select channel" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Viber">Viber</SelectItem>
                            <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                            <SelectItem value="Zalo">Zalo</SelectItem>
                            <SelectItem value="E-mail">E-mail</SelectItem>
                            <SelectItem value="Phone">Phone</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="default_discount_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Discount Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-default_discount_type">
                              <SelectValue placeholder="Select discount type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="flat">Flat Amount</SelectItem>
                            <SelectItem value="rate">Percentage Rate</SelectItem>
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

          {/* Tab 2: Locations & Carriers */}
          <TabsContent value="locations" className="space-y-4">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />
                  Warehouse & Location Defaults
                </CardTitle>
                <CardDescription className="text-sm">Configure warehouse assignment and location routing</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <FormField
                  control={form.control}
                  name="default_order_location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Order Location</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Main Warehouse"
                          {...field}
                          value={field.value ?? ''}
                          data-testid="input-default_order_location"
                        />
                      </FormControl>
                      <FormDescription>Default warehouse location for new orders</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="auto_assign_warehouse_by_region"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value === true}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-auto_assign_warehouse_by_region"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Auto-assign Warehouse by Region</FormLabel>
                          <FormDescription>
                            Automatically assign warehouse based on shipping region
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="prefer_nearest_warehouse"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value === true}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-prefer_nearest_warehouse"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Prefer Nearest Warehouse</FormLabel>
                          <FormDescription>
                            Prefer nearest warehouse for order fulfillment
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="enable_location_based_routing"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value === true}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-enable_location_based_routing"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Enable Location-based Routing</FormLabel>
                          <FormDescription>
                            Route orders based on customer location
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />
                  Regional Carrier Selection
                </CardTitle>
                <CardDescription className="text-sm">Set default carriers for different regions</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="czech_republic_carrier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Czech Republic Carrier</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-czech_republic_carrier">
                              <SelectValue placeholder="Select carrier" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="PPL">PPL</SelectItem>
                            <SelectItem value="PPL CZ">PPL CZ</SelectItem>
                            <SelectItem value="GLS">GLS</SelectItem>
                            <SelectItem value="GLS DE">GLS DE</SelectItem>
                            <SelectItem value="DHL">DHL</SelectItem>
                            <SelectItem value="DHL DE">DHL DE</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>Default carrier for Czech orders</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="european_union_carrier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>European Union Carrier</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-european_union_carrier">
                              <SelectValue placeholder="Select carrier" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="PPL">PPL</SelectItem>
                            <SelectItem value="PPL CZ">PPL CZ</SelectItem>
                            <SelectItem value="GLS">GLS</SelectItem>
                            <SelectItem value="GLS DE">GLS DE</SelectItem>
                            <SelectItem value="DHL">DHL</SelectItem>
                            <SelectItem value="DHL DE">DHL DE</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>Default carrier for EU orders</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="rest_of_world_carrier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rest of World Carrier</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-rest_of_world_carrier">
                              <SelectValue placeholder="Select carrier" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="PPL">PPL</SelectItem>
                            <SelectItem value="PPL CZ">PPL CZ</SelectItem>
                            <SelectItem value="GLS">GLS</SelectItem>
                            <SelectItem value="GLS DE">GLS DE</SelectItem>
                            <SelectItem value="DHL">DHL</SelectItem>
                            <SelectItem value="DHL DE">DHL DE</SelectItem>
                            <SelectItem value="DPD">DPD</SelectItem>
                            <SelectItem value="UPS">UPS</SelectItem>
                            <SelectItem value="FedEx">FedEx</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>Default carrier for international orders</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Fulfillment */}
          <TabsContent value="fulfillment" className="space-y-4">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                  Fulfillment Settings
                </CardTitle>
                <CardDescription className="text-sm">Configure order fulfillment and warehouse operations</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="default_fulfillment_stage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Fulfillment Stage</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-default_fulfillment_stage">
                              <SelectValue placeholder="Select fulfillment stage" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="picking">Picking</SelectItem>
                            <SelectItem value="packing">Packing</SelectItem>
                            <SelectItem value="ready_to_ship">Ready to Ship</SelectItem>
                            <SelectItem value="shipped">Shipped</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>Initial stage for new orders</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pick_pack_time_sla_hours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pick & Pack Time SLA (hours)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            {...field}
                            value={field.value ?? ''}
                            data-testid="input-pick_pack_time_sla_hours"
                          />
                        </FormControl>
                        <FormDescription>Service level agreement for pick and pack operations</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="auto_assign_orders_to_warehouse"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value === true}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-auto_assign_orders_to_warehouse"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Auto-assign Orders to Warehouse</FormLabel>
                          <FormDescription>
                            Automatically assign new orders to the nearest warehouse
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="auto_create_packing_lists"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value === true}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-auto_create_packing_lists"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Auto-create Packing Lists</FormLabel>
                          <FormDescription>
                            Generate packing lists automatically when order is confirmed
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="auto_calculate_shipping"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value === true}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-auto_calculate_shipping"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Auto-calculate Shipping Cost</FormLabel>
                          <FormDescription>
                            Calculate shipping costs based on weight and destination
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="require_barcode_scan_for_picking"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value === true}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-require_barcode_scan_for_picking"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Require Barcode Scan for Picking</FormLabel>
                          <FormDescription>
                            Enforce barcode scanning during order picking
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
                            Use AI to suggest optimal carton sizes
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4: Validation */}
          <TabsContent value="validation" className="space-y-4">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
                  Order Validation Rules
                </CardTitle>
                <CardDescription className="text-sm">Configure validation requirements for orders</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="minimum_order_value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum Order Value</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            {...field}
                            value={field.value ?? ''}
                            data-testid="input-minimum_order_value"
                          />
                        </FormControl>
                        <FormDescription>Minimum value required for an order (0 = no minimum)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="block_duplicate_orders_hours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Block Duplicate Orders (hours)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            {...field}
                            value={field.value ?? ''}
                            data-testid="input-block_duplicate_orders_hours"
                          />
                        </FormControl>
                        <FormDescription>Prevent duplicate orders within specified hours (0 = disabled)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="require_customer_email"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value === true}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-require_customer_email"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Require Customer Email</FormLabel>
                          <FormDescription>
                            Make email address mandatory for orders
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="require_shipping_address"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value === true}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-require_shipping_address"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Require Shipping Address</FormLabel>
                          <FormDescription>
                            Make shipping address mandatory for orders
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="require_phone_number"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value === true}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-require_phone_number"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Require Phone Number</FormLabel>
                          <FormDescription>
                            Make phone number mandatory for orders
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="allow_negative_stock"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value === true}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-allow_negative_stock"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Allow Negative Stock</FormLabel>
                          <FormDescription>
                            Allow orders when stock is unavailable
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 5: Automation */}
          <TabsContent value="automation" className="space-y-4">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Zap className="h-4 w-4 sm:h-5 sm:w-5" />
                  Order Automation
                </CardTitle>
                <CardDescription className="text-sm">Automate notifications and stock updates</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="auto_send_order_confirmation_email"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value === true}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-auto_send_order_confirmation_email"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Auto-send Order Confirmation</FormLabel>
                          <FormDescription>
                            Send confirmation email when order is created
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="auto_send_shipping_notification"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value === true}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-auto_send_shipping_notification"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Auto-send Shipping Notification</FormLabel>
                          <FormDescription>
                            Send notification when order is shipped
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="auto_send_delivery_notification"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value === true}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-auto_send_delivery_notification"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Auto-send Delivery Notification</FormLabel>
                          <FormDescription>
                            Send notification when order is delivered
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="auto_update_stock_on_order"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value === true}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-auto_update_stock_on_order"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Auto-update Stock on Order</FormLabel>
                          <FormDescription>
                            Automatically reduce stock when order is created
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="auto_create_return_request"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value === true}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-auto_create_return_request"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Auto-create Return Request</FormLabel>
                          <FormDescription>
                            Automatically create return requests for eligible orders
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 6: COD */}
          <TabsContent value="cod" className="space-y-4">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
                  Cash on Delivery (COD) Settings
                </CardTitle>
                <CardDescription className="text-sm">Configure COD payment options and fees</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <FormField
                  control={form.control}
                  name="enable_cod"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value === true}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-enable_cod"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Enable Cash on Delivery</FormLabel>
                        <FormDescription>
                          Allow customers to pay on delivery
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="default_cod_currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default COD Currency</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-default_cod_currency">
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

                  <FormField
                    control={form.control}
                    name="cod_fee_percentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>COD Fee Percentage (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            {...field}
                            value={field.value ?? ''}
                            data-testid="input-cod_fee_percentage"
                          />
                        </FormControl>
                        <FormDescription>Percentage fee for COD orders</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cod_fee_fixed_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>COD Fixed Fee Amount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            {...field}
                            value={field.value ?? ''}
                            data-testid="input-cod_fee_fixed_amount"
                          />
                        </FormControl>
                        <FormDescription>Fixed fee amount for COD orders</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="require_cod_signature"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value === true}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-require_cod_signature"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Require Signature for COD</FormLabel>
                        <FormDescription>
                          Require customer signature when collecting COD payment
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={saveMutation.isPending}
            data-testid="button-save-settings"
            className="w-full sm:w-auto"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Order Settings
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
