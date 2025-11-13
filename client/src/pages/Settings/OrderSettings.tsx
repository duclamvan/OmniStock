import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ShoppingCart, Save, Loader2, Package, CheckCircle2, Zap, DollarSign } from "lucide-react";

const formSchema = z.object({
  // Order Defaults
  default_payment_method: z.enum(['Cash', 'Card', 'Transfer', 'COD', 'Pay Later', 'Bank Transfer', 'PayPal']).default('Transfer'),
  default_order_status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).default('pending'),
  default_payment_status: z.enum(['pending', 'paid', 'pay_later', 'refunded']).default('pending'),
  default_carrier: z.enum(['GLS', 'PPL', 'DHL', 'DPD', 'UPS', 'FedEx', 'Other']).default('GLS'),
  default_communication_channel: z.enum(['Viber', 'WhatsApp', 'Zalo', 'E-mail', 'Phone']).default('E-mail'),
  default_discount_type: z.enum(['flat', 'rate']).default('flat'),
  
  // Fulfillment Settings
  default_fulfillment_stage: z.enum(['pending', 'picking', 'packing', 'ready_to_ship', 'shipped']).default('pending'),
  auto_assign_orders_to_warehouse: z.boolean().default(false),
  auto_create_packing_lists: z.boolean().default(false),
  auto_calculate_shipping: z.boolean().default(false),
  require_barcode_scan_for_picking: z.boolean().default(false),
  enable_ai_carton_packing: z.boolean().default(false),
  pick_pack_time_sla_hours: z.coerce.number().min(0).default(24),
  
  // Order Validation
  require_customer_email: z.boolean().default(false),
  require_shipping_address: z.boolean().default(true),
  require_phone_number: z.boolean().default(false),
  allow_negative_stock: z.boolean().default(false),
  minimum_order_value: z.coerce.number().min(0).default(0),
  block_duplicate_orders_hours: z.coerce.number().min(0).default(0),
  
  // Automation
  auto_send_order_confirmation_email: z.boolean().default(false),
  auto_send_shipping_notification: z.boolean().default(false),
  auto_send_delivery_notification: z.boolean().default(false),
  auto_update_stock_on_order: z.boolean().default(true),
  auto_create_return_request: z.boolean().default(false),
  
  // COD Settings
  enable_cod: z.boolean().default(true),
  default_cod_currency: z.enum(['CZK', 'EUR', 'USD']).default('CZK'),
  cod_fee_percentage: z.coerce.number().min(0).max(100).default(0),
  cod_fee_fixed_amount: z.coerce.number().min(0).default(0),
  require_cod_signature: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

export default function OrderSettings() {
  const { toast } = useToast();

  const { data: settings = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/settings'],
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      default_payment_method: 'Transfer',
      default_order_status: 'pending',
      default_payment_status: 'pending',
      default_carrier: 'GLS',
      default_communication_channel: 'E-mail',
      default_discount_type: 'flat',
      default_fulfillment_stage: 'pending',
      auto_assign_orders_to_warehouse: false,
      auto_create_packing_lists: false,
      auto_calculate_shipping: false,
      require_barcode_scan_for_picking: false,
      enable_ai_carton_packing: false,
      pick_pack_time_sla_hours: 24,
      require_customer_email: false,
      require_shipping_address: true,
      require_phone_number: false,
      allow_negative_stock: false,
      minimum_order_value: 0,
      block_duplicate_orders_hours: 0,
      auto_send_order_confirmation_email: false,
      auto_send_shipping_notification: false,
      auto_send_delivery_notification: false,
      auto_update_stock_on_order: true,
      auto_create_return_request: false,
      enable_cod: true,
      default_cod_currency: 'CZK',
      cod_fee_percentage: 0,
      cod_fee_fixed_amount: 0,
      require_cod_signature: true,
    },
  });

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
        apiRequest('POST', `/api/settings`, { key, value, category: 'orders' })
      );
      await Promise.all(savePromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
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
        {/* 1. Order Defaults Section */}
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-default_carrier">
                          <SelectValue placeholder="Select carrier" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="GLS">GLS</SelectItem>
                        <SelectItem value="PPL">PPL</SelectItem>
                        <SelectItem value="DHL">DHL</SelectItem>
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                    <Select onValueChange={field.onChange} value={field.value}>
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

        {/* 2. Fulfillment Settings Section */}
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                        checked={field.value}
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
                        checked={field.value}
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
                        checked={field.value}
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
                        checked={field.value}
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
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-enable_ai_carton_packing"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Enable AI Carton Packing</FormLabel>
                      <FormDescription>
                        Use AI to optimize carton selection and packing
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* 3. Order Validation Section */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
              Order Validation
            </CardTitle>
            <CardDescription className="text-sm">Define validation rules for order processing</CardDescription>
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
                        data-testid="input-minimum_order_value"
                      />
                    </FormControl>
                    <FormDescription>Minimum total value required for orders (0 = no minimum)</FormDescription>
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
                        data-testid="input-block_duplicate_orders_hours"
                      />
                    </FormControl>
                    <FormDescription>Block duplicate orders within X hours (0 = disabled)</FormDescription>
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
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-require_customer_email"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Require Customer Email</FormLabel>
                      <FormDescription>
                        Make customer email mandatory for all orders
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
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-require_shipping_address"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Require Shipping Address</FormLabel>
                      <FormDescription>
                        Make shipping address mandatory for all orders
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
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-require_phone_number"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Require Phone Number</FormLabel>
                      <FormDescription>
                        Make customer phone number mandatory for all orders
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
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-allow_negative_stock"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Allow Negative Stock</FormLabel>
                      <FormDescription>
                        Allow orders even when inventory stock goes negative
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* 4. Automation Section */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Zap className="h-4 w-4 sm:h-5 sm:w-5" />
              Automation
            </CardTitle>
            <CardDescription className="text-sm">Automate order notifications and updates</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="auto_send_order_confirmation_email"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-auto_send_order_confirmation_email"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Auto-send Order Confirmation Email</FormLabel>
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
                        checked={field.value}
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
                        checked={field.value}
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
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-auto_update_stock_on_order"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Auto-update Stock on Order</FormLabel>
                      <FormDescription>
                        Automatically update inventory when order is placed
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
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-auto_create_return_request"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Auto-create Return Request</FormLabel>
                      <FormDescription>
                        Automatically create return request when requested
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* 5. COD Settings Section */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
              COD Settings
            </CardTitle>
            <CardDescription className="text-sm">Configure Cash on Delivery payment options</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="default_cod_currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default COD Currency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-default_cod_currency">
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="CZK">CZK (Czech Koruna)</SelectItem>
                        <SelectItem value="EUR">EUR (Euro)</SelectItem>
                        <SelectItem value="USD">USD (US Dollar)</SelectItem>
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
                        data-testid="input-cod_fee_percentage"
                      />
                    </FormControl>
                    <FormDescription>Percentage-based COD fee</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cod_fee_fixed_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>COD Fee Fixed Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        {...field}
                        data-testid="input-cod_fee_fixed_amount"
                      />
                    </FormControl>
                    <FormDescription>Fixed amount COD fee</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="enable_cod"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-enable_cod"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Enable COD</FormLabel>
                      <FormDescription>
                        Allow Cash on Delivery payment method
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="require_cod_signature"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-require_cod_signature"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Require COD Signature</FormLabel>
                      <FormDescription>
                        Require customer signature for COD deliveries
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>
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
