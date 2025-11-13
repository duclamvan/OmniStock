import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Truck, Save, Loader2 } from "lucide-react";

const formSchema = z.object({
  quick_select_czk: z.string().default('0,100,150,250'),
  quick_select_eur: z.string().default('0,5,10,13,15,20'),
  default_shipping_method: z.enum(['PPL', 'DHL', 'Other']).default('PPL'),
  ppl_default_sender_address: z.string().default(''),
  dhl_default_sender_address: z.string().default(''),
});

type FormValues = z.infer<typeof formSchema>;

export default function ShippingSettings() {
  const { toast } = useToast();

  const { data: settings = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/settings'],
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quick_select_czk: '0,100,150,250',
      quick_select_eur: '0,5,10,13,15,20',
      default_shipping_method: 'PPL',
      ppl_default_sender_address: '',
      dhl_default_sender_address: '',
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
          const value = key.includes('address') ? JSON.stringify(settingsMap[key], null, 2) : settingsMap[key];
          form.setValue(key as keyof FormValues, value, { shouldDirty: false });
        }
      });
    }
  }, [settings, isLoading]);

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
        return apiRequest('POST', `/api/settings`, { key, value: processedValue, category: 'shipping' });
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
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Truck className="h-4 w-4 sm:h-5 sm:w-5" />
              Shipping Configuration
            </CardTitle>
            <CardDescription className="text-sm">Configure shipping methods and default addresses</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Default Sender Addresses</CardTitle>
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
