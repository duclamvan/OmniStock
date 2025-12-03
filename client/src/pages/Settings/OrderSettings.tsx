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
import { useTranslation } from 'react-i18next';
import { ShoppingCart, Save, Loader2, Package, CheckCircle2, Zap, DollarSign, MapPin, Check } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { camelToSnake, deepCamelToSnake } from "@/utils/caseConverters";
import { useSettingsAutosave, SaveStatus } from "@/hooks/useSettingsAutosave";

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

export default function OrderSettings() {
  const { t } = useTranslation(['settings', 'common']);
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
    category: 'order',
    originalValues: originalSettings,
    getCurrentValue: (fieldName) => form.getValues(fieldName as keyof FormValues),
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
    mutationFn: async () => {
      await saveAllPending();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/settings', 'order'] });
      toast({
        title: t('settings:settingsSaved'),
        description: t('settings:orderSettingsSavedSuccess'),
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
        <Tabs defaultValue="defaults" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
            <TabsTrigger value="defaults" className="flex items-center gap-1 sm:gap-2">
              <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('settings:orderDefaults')}</span>
            </TabsTrigger>
            <TabsTrigger value="locations" className="flex items-center gap-1 sm:gap-2">
              <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('settings:locations')}</span>
            </TabsTrigger>
            <TabsTrigger value="fulfillment" className="flex items-center gap-1 sm:gap-2">
              <Package className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('settings:fulfillment')}</span>
            </TabsTrigger>
            <TabsTrigger value="validation" className="flex items-center gap-1 sm:gap-2">
              <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('settings:validation')}</span>
            </TabsTrigger>
            <TabsTrigger value="automation" className="flex items-center gap-1 sm:gap-2">
              <Zap className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('settings:automation')}</span>
            </TabsTrigger>
            <TabsTrigger value="cod" className="flex items-center gap-1 sm:gap-2">
              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('settings:cod')}</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Defaults */}
          <TabsContent value="defaults" className="space-y-4">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                  {t('settings:orderDefaultsTitle')}
                </CardTitle>
                <CardDescription className="text-sm">{t('settings:orderDefaultsDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="default_payment_method"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:defaultPaymentMethod')}</FormLabel>
                        <Select 
                          onValueChange={(val) => {
                            const newValue = val === '__not_set__' ? '' : val;
                            field.onChange(newValue);
                            handleSelectChange('default_payment_method')(newValue);
                          }} 
                          value={field.value || ''}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-default_payment_method">
                              <SelectValue placeholder={t('settings:selectOption')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__not_set__">{t('settings:notSet')}</SelectItem>
                            <SelectItem value="Cash">{t('settings:paymentMethodCash')}</SelectItem>
                            <SelectItem value="Card">{t('settings:paymentMethodCard')}</SelectItem>
                            <SelectItem value="Transfer">{t('settings:paymentMethodTransfer')}</SelectItem>
                            <SelectItem value="COD">{t('settings:paymentMethodCOD')}</SelectItem>
                            <SelectItem value="Pay Later">{t('settings:paymentMethodPayLater')}</SelectItem>
                            <SelectItem value="Bank Transfer">{t('settings:paymentMethodBankTransfer')}</SelectItem>
                            <SelectItem value="PayPal">{t('settings:paymentMethodPayPal')}</SelectItem>
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
                        <FormLabel>{t('settings:defaultOrderStatus')}</FormLabel>
                        <Select 
                          onValueChange={(val) => {
                            const newValue = val === '__not_set__' ? '' : val;
                            field.onChange(newValue);
                            handleSelectChange('default_order_status')(newValue);
                          }} 
                          value={field.value || ''}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-default_order_status">
                              <SelectValue placeholder={t('settings:selectOption')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__not_set__">{t('settings:notSet')}</SelectItem>
                            <SelectItem value="pending">{t('settings:statusPending')}</SelectItem>
                            <SelectItem value="processing">{t('settings:statusProcessing')}</SelectItem>
                            <SelectItem value="shipped">{t('settings:statusShipped')}</SelectItem>
                            <SelectItem value="delivered">{t('settings:statusDelivered')}</SelectItem>
                            <SelectItem value="cancelled">{t('settings:statusCancelled')}</SelectItem>
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
                        <FormLabel>{t('settings:defaultPaymentStatus')}</FormLabel>
                        <Select 
                          onValueChange={(val) => {
                            const newValue = val === '__not_set__' ? '' : val;
                            field.onChange(newValue);
                            handleSelectChange('default_payment_status')(newValue);
                          }} 
                          value={field.value || ''}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-default_payment_status">
                              <SelectValue placeholder={t('settings:selectOption')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__not_set__">{t('settings:notSet')}</SelectItem>
                            <SelectItem value="pending">{t('settings:statusPending')}</SelectItem>
                            <SelectItem value="paid">{t('settings:statusPaid')}</SelectItem>
                            <SelectItem value="pay_later">{t('settings:statusPayLater')}</SelectItem>
                            <SelectItem value="refunded">{t('settings:statusRefunded')}</SelectItem>
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
                        <FormLabel>{t('settings:defaultCarrier')}</FormLabel>
                        <Select 
                          onValueChange={(val) => {
                            const newValue = val === '__not_set__' ? '' : val;
                            field.onChange(newValue);
                            handleSelectChange('default_carrier')(newValue);
                          }} 
                          value={field.value || ''}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-default_carrier">
                              <SelectValue placeholder={t('settings:selectOption')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__not_set__">{t('settings:notSet')}</SelectItem>
                            <SelectItem value="GLS">GLS</SelectItem>
                            <SelectItem value="GLS DE">GLS DE</SelectItem>
                            <SelectItem value="PPL">PPL</SelectItem>
                            <SelectItem value="PPL CZ">PPL CZ</SelectItem>
                            <SelectItem value="DHL">DHL</SelectItem>
                            <SelectItem value="DHL DE">DHL DE</SelectItem>
                            <SelectItem value="DPD">DPD</SelectItem>
                            <SelectItem value="UPS">UPS</SelectItem>
                            <SelectItem value="FedEx">FedEx</SelectItem>
                            <SelectItem value="Other">{t('settings:carrierOther')}</SelectItem>
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
                        <FormLabel>{t('settings:defaultCommunicationChannel')}</FormLabel>
                        <Select 
                          onValueChange={(val) => {
                            const newValue = val === '__not_set__' ? '' : val;
                            field.onChange(newValue);
                            handleSelectChange('default_communication_channel')(newValue);
                          }} 
                          value={field.value || ''}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-default_communication_channel">
                              <SelectValue placeholder={t('settings:selectOption')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__not_set__">{t('settings:notSet')}</SelectItem>
                            <SelectItem value="Viber">Viber</SelectItem>
                            <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                            <SelectItem value="Zalo">Zalo</SelectItem>
                            <SelectItem value="E-mail">{t('settings:email')}</SelectItem>
                            <SelectItem value="Phone">{t('settings:phone')}</SelectItem>
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
                        <FormLabel>{t('settings:defaultDiscountType')}</FormLabel>
                        <Select 
                          onValueChange={(val) => {
                            const newValue = val === '__not_set__' ? '' : val;
                            field.onChange(newValue);
                            handleSelectChange('default_discount_type')(newValue);
                          }} 
                          value={field.value || ''}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-default_discount_type">
                              <SelectValue placeholder={t('settings:selectOption')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__not_set__">{t('settings:notSet')}</SelectItem>
                            <SelectItem value="flat">{t('settings:discountTypeFlatAmount')}</SelectItem>
                            <SelectItem value="rate">{t('settings:discountTypePercentage')}</SelectItem>
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
                  {t('settings:warehouseLocationDefaults')}
                </CardTitle>
                <CardDescription className="text-sm">{t('settings:warehouseLocationDefaultsDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <FormField
                  control={form.control}
                  name="default_order_location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('settings:defaultOrderLocation')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('settings:defaultOrderLocationPlaceholder')}
                          {...field}
                          value={field.value ?? ''}
                          data-testid="input-default_order_location"
                          onChange={(e) => {
                            field.onChange(e);
                            markPendingChange('default_order_location');
                          }}
                          onBlur={handleTextBlur('default_order_location')}
                        />
                      </FormControl>
                      <FormDescription>{t('settings:defaultOrderLocationDescription')}</FormDescription>
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
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleCheckboxChange('auto_assign_warehouse_by_region')(checked as boolean);
                            }}
                            data-testid="checkbox-auto_assign_warehouse_by_region"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t('settings:autoAssignWarehouseByRegion')}</FormLabel>
                          <FormDescription>
                            {t('settings:autoAssignWarehouseByRegionDescription')}
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
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleCheckboxChange('prefer_nearest_warehouse')(checked as boolean);
                            }}
                            data-testid="checkbox-prefer_nearest_warehouse"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t('settings:preferNearestWarehouse')}</FormLabel>
                          <FormDescription>
                            {t('settings:preferNearestWarehouseDescription')}
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
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleCheckboxChange('enable_location_based_routing')(checked as boolean);
                            }}
                            data-testid="checkbox-enable_location_based_routing"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t('settings:enableLocationBasedRouting')}</FormLabel>
                          <FormDescription>
                            {t('settings:enableLocationBasedRoutingDescription')}
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
                  {t('settings:regionalCarrierSelection')}
                </CardTitle>
                <CardDescription className="text-sm">{t('settings:regionalCarrierSelectionDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="czech_republic_carrier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:czechRepublicCarrier')}</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleSelectChange('czech_republic_carrier')(value);
                          }} 
                          value={field.value || ''}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-czech_republic_carrier">
                              <SelectValue placeholder={t('settings:selectCarrier')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="PPL">{t('settings:carrierPPL')}</SelectItem>
                            <SelectItem value="PPL CZ">{t('settings:carrierPPLCZ')}</SelectItem>
                            <SelectItem value="GLS">{t('settings:carrierGLS')}</SelectItem>
                            <SelectItem value="GLS DE">{t('settings:carrierGLSDE')}</SelectItem>
                            <SelectItem value="DHL">{t('settings:carrierDHL')}</SelectItem>
                            <SelectItem value="DHL DE">{t('settings:carrierDHLDE')}</SelectItem>
                            <SelectItem value="Other">{t('settings:carrierOther')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>{t('settings:czechCarrierDescription')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="european_union_carrier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:europeanUnionCarrier')}</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleSelectChange('european_union_carrier')(value);
                          }} 
                          value={field.value || ''}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-european_union_carrier">
                              <SelectValue placeholder={t('settings:selectCarrier')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="PPL">{t('settings:carrierPPL')}</SelectItem>
                            <SelectItem value="PPL CZ">{t('settings:carrierPPLCZ')}</SelectItem>
                            <SelectItem value="GLS">{t('settings:carrierGLS')}</SelectItem>
                            <SelectItem value="GLS DE">{t('settings:carrierGLSDE')}</SelectItem>
                            <SelectItem value="DHL">{t('settings:carrierDHL')}</SelectItem>
                            <SelectItem value="DHL DE">{t('settings:carrierDHLDE')}</SelectItem>
                            <SelectItem value="Other">{t('settings:carrierOther')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>{t('settings:euCarrierDescription')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="rest_of_world_carrier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:restOfWorldCarrier')}</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleSelectChange('rest_of_world_carrier')(value);
                          }} 
                          value={field.value || ''}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-rest_of_world_carrier">
                              <SelectValue placeholder={t('settings:selectCarrier')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="PPL">{t('settings:carrierPPL')}</SelectItem>
                            <SelectItem value="PPL CZ">{t('settings:carrierPPLCZ')}</SelectItem>
                            <SelectItem value="GLS">{t('settings:carrierGLS')}</SelectItem>
                            <SelectItem value="GLS DE">{t('settings:carrierGLSDE')}</SelectItem>
                            <SelectItem value="DHL">{t('settings:carrierDHL')}</SelectItem>
                            <SelectItem value="DHL DE">{t('settings:carrierDHLDE')}</SelectItem>
                            <SelectItem value="DPD">{t('settings:carrierDPD')}</SelectItem>
                            <SelectItem value="UPS">{t('settings:carrierUPS')}</SelectItem>
                            <SelectItem value="FedEx">{t('settings:carrierFedEx')}</SelectItem>
                            <SelectItem value="Other">{t('settings:carrierOther')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>{t('settings:internationalCarrierDescription')}</FormDescription>
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
                  {t('settings:fulfillmentSettings')}
                </CardTitle>
                <CardDescription className="text-sm">{t('settings:fulfillmentSettingsDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="default_fulfillment_stage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:initialFulfillmentStage')}</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleSelectChange('default_fulfillment_stage')(value);
                          }} 
                          value={field.value || ''}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-default_fulfillment_stage">
                              <SelectValue placeholder={t('settings:selectFulfillmentStage')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="pending">{t('settings:fulfillmentStagePending')}</SelectItem>
                            <SelectItem value="picking">{t('settings:fulfillmentStagePicking')}</SelectItem>
                            <SelectItem value="packing">{t('settings:fulfillmentStagePacking')}</SelectItem>
                            <SelectItem value="ready_to_ship">{t('settings:fulfillmentStageReadyToShip')}</SelectItem>
                            <SelectItem value="shipped">{t('settings:fulfillmentStageShipped')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>{t('settings:initialFulfillmentStageDescription')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pick_pack_time_sla_hours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:pickAndPackSla')}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            {...field}
                            value={field.value ?? ''}
                            data-testid="input-pick_pack_time_sla_hours"
                            onChange={(e) => {
                              field.onChange(e);
                              markPendingChange('pick_pack_time_sla_hours');
                            }}
                            onBlur={handleTextBlur('pick_pack_time_sla_hours')}
                          />
                        </FormControl>
                        <FormDescription>{t('settings:pickAndPackSlaDescription')}</FormDescription>
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
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleCheckboxChange('auto_assign_orders_to_warehouse')(checked as boolean);
                            }}
                            data-testid="checkbox-auto_assign_orders_to_warehouse"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t('settings:autoAssignOrdersToWarehouse')}</FormLabel>
                          <FormDescription>
                            {t('settings:autoAssignOrdersToWarehouseDescription')}
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
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleCheckboxChange('auto_create_packing_lists')(checked as boolean);
                            }}
                            data-testid="checkbox-auto_create_packing_lists"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t('settings:autoCreatePackingLists')}</FormLabel>
                          <FormDescription>
                            {t('settings:autoCreatePackingListsDescription')}
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
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleCheckboxChange('auto_calculate_shipping')(checked as boolean);
                            }}
                            data-testid="checkbox-auto_calculate_shipping"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t('settings:autoCalculateShippingCost')}</FormLabel>
                          <FormDescription>
                            {t('settings:autoCalculateShippingDescription')}
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
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleCheckboxChange('require_barcode_scan_for_picking')(checked as boolean);
                            }}
                            data-testid="checkbox-require_barcode_scan_for_picking"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t('settings:requireBarcodeScanForPicking')}</FormLabel>
                          <FormDescription>
                            {t('settings:requireBarcodeScanForPickingDescription')}
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
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleCheckboxChange('enable_ai_carton_packing')(checked as boolean);
                            }}
                            data-testid="checkbox-enable_ai_carton_packing"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t('settings:enableAiCartonPackingLabel')}</FormLabel>
                          <FormDescription>
                            {t('settings:enableAiCartonPackingLabelDescription')}
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
                  {t('settings:orderValidationRules')}
                </CardTitle>
                <CardDescription className="text-sm">{t('settings:orderValidationRulesDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="minimum_order_value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:minimumOrderValue')}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            {...field}
                            value={field.value ?? ''}
                            data-testid="input-minimum_order_value"
                            onChange={(e) => {
                              field.onChange(e);
                              markPendingChange('minimum_order_value');
                            }}
                            onBlur={handleTextBlur('minimum_order_value')}
                          />
                        </FormControl>
                        <FormDescription>{t('settings:minimumOrderValueDescription')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="block_duplicate_orders_hours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:duplicateOrderPreventionHours')}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            {...field}
                            value={field.value ?? ''}
                            data-testid="input-block_duplicate_orders_hours"
                            onChange={(e) => {
                              field.onChange(e);
                              markPendingChange('block_duplicate_orders_hours');
                            }}
                            onBlur={handleTextBlur('block_duplicate_orders_hours')}
                          />
                        </FormControl>
                        <FormDescription>{t('settings:duplicateOrderPreventionHoursDescription')}</FormDescription>
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
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleCheckboxChange('require_customer_email')(checked as boolean);
                            }}
                            data-testid="checkbox-require_customer_email"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t('settings:requireCustomerEmail')}</FormLabel>
                          <FormDescription>
                            {t('settings:requireCustomerEmailDescription')}
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
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleCheckboxChange('require_shipping_address')(checked as boolean);
                            }}
                            data-testid="checkbox-require_shipping_address"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t('settings:requireShippingAddress')}</FormLabel>
                          <FormDescription>
                            {t('settings:requireShippingAddressDescription')}
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
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleCheckboxChange('require_phone_number')(checked as boolean);
                            }}
                            data-testid="checkbox-require_phone_number"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t('settings:requirePhoneNumber')}</FormLabel>
                          <FormDescription>
                            {t('settings:requirePhoneNumberDescription')}
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
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleCheckboxChange('allow_negative_stock')(checked as boolean);
                            }}
                            data-testid="checkbox-allow_negative_stock"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t('settings:allowNegativeStock')}</FormLabel>
                          <FormDescription>
                            {t('settings:allowNegativeStockDescription')}
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
                  {t('settings:orderAutomation')}
                </CardTitle>
                <CardDescription className="text-sm">{t('settings:orderAutomationDescription')}</CardDescription>
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
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleCheckboxChange('auto_send_order_confirmation_email')(checked as boolean);
                            }}
                            data-testid="checkbox-auto_send_order_confirmation_email"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t('settings:autoSendOrderConfirmation')}</FormLabel>
                          <FormDescription>
                            {t('settings:autoSendOrderConfirmationDescription')}
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
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleCheckboxChange('auto_send_shipping_notification')(checked as boolean);
                            }}
                            data-testid="checkbox-auto_send_shipping_notification"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t('settings:autoSendShippingNotification')}</FormLabel>
                          <FormDescription>
                            {t('settings:autoSendShippingNotificationDescription')}
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
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleCheckboxChange('auto_send_delivery_notification')(checked as boolean);
                            }}
                            data-testid="checkbox-auto_send_delivery_notification"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t('settings:autoSendDeliveryNotification')}</FormLabel>
                          <FormDescription>
                            {t('settings:autoSendDeliveryNotificationDescription')}
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
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleCheckboxChange('auto_update_stock_on_order')(checked as boolean);
                            }}
                            data-testid="checkbox-auto_update_stock_on_order"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t('settings:autoUpdateStockOnOrder')}</FormLabel>
                          <FormDescription>
                            {t('settings:autoUpdateStockOnOrderDescription')}
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
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              handleCheckboxChange('auto_create_return_request')(checked as boolean);
                            }}
                            data-testid="checkbox-auto_create_return_request"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t('settings:autoCreateReturnRequest')}</FormLabel>
                          <FormDescription>
                            {t('settings:autoCreateReturnRequestDescription')}
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
                  {t('settings:codSettings')}
                </CardTitle>
                <CardDescription className="text-sm">{t('settings:codSettingsDescription')}</CardDescription>
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
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            handleCheckboxChange('enable_cod')(checked as boolean);
                          }}
                          data-testid="checkbox-enable_cod"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>{t('settings:enableCashOnDelivery')}</FormLabel>
                        <FormDescription>
                          {t('settings:enableCashOnDeliveryDescription')}
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
                        <FormLabel>{t('settings:defaultCodCurrency')}</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleSelectChange('default_cod_currency')(value);
                          }} 
                          value={field.value || ''}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-default_cod_currency">
                              <SelectValue placeholder={t('settings:selectCurrency')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="CZK">{t('common:currencyCZK')}</SelectItem>
                            <SelectItem value="EUR">{t('common:currencyEUR')}</SelectItem>
                            <SelectItem value="USD">{t('common:currencyUSD')}</SelectItem>
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
                        <FormLabel>{t('settings:codPercentageFee')}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            {...field}
                            value={field.value ?? ''}
                            data-testid="input-cod_fee_percentage"
                            onChange={(e) => {
                              field.onChange(e);
                              markPendingChange('cod_fee_percentage');
                            }}
                            onBlur={handleTextBlur('cod_fee_percentage')}
                          />
                        </FormControl>
                        <FormDescription>{t('settings:codPercentageFeeDescription')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cod_fee_fixed_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings:codFixedFee')}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            {...field}
                            value={field.value ?? ''}
                            data-testid="input-cod_fee_fixed_amount"
                            onChange={(e) => {
                              field.onChange(e);
                              markPendingChange('cod_fee_fixed_amount');
                            }}
                            onBlur={handleTextBlur('cod_fee_fixed_amount')}
                          />
                        </FormControl>
                        <FormDescription>{t('settings:codFixedFeeDescription')}</FormDescription>
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
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            handleCheckboxChange('require_cod_signature')(checked as boolean);
                          }}
                          data-testid="checkbox-require_cod_signature"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>{t('settings:requireSignatureForCod')}</FormLabel>
                        <FormDescription>
                          {t('settings:requireSignatureForCodDescription')}
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
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
              disabled={saveMutation.isPending || !hasPendingChanges}
              className="min-h-[44px]" 
              data-testid="button-save-settings"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('settings:savingSettings')}
                </>
              ) : hasPendingChanges ? (
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
