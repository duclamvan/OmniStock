import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ShoppingCart, Save, Loader2 } from "lucide-react";

const formSchema = z.object({
  default_payment_method: z.enum(['Cash', 'Card', 'Transfer', 'COD', 'Pay Later']).default('Transfer'),
  default_order_status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).default('pending'),
  default_payment_status: z.enum(['pending', 'paid', 'pay_later', 'refunded']).default('pending'),
  auto_calculate_shipping: z.boolean().default(false),
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
      auto_calculate_shipping: false,
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
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Order Defaults
            </CardTitle>
            <CardDescription>Default values for new orders</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>

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
                      Automatically calculate shipping costs based on order weight and destination
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save">
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
