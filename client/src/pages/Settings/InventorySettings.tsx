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
import { Package, Save, Loader2 } from "lucide-react";

const formSchema = z.object({
  low_stock_threshold: z.coerce.number().min(0).default(10),
  default_product_type: z.enum(['regular', 'bundle', 'service']).default('regular'),
  enable_barcode_scanning: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

export default function InventorySettings() {
  const { toast } = useToast();

  const { data: settings = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/settings'],
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      low_stock_threshold: 10,
      default_product_type: 'regular',
      enable_barcode_scanning: true,
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
        apiRequest('POST', `/api/settings`, { key, value, category: 'inventory' })
      );
      await Promise.all(savePromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({
        title: "Settings Saved",
        description: "Inventory settings have been updated successfully.",
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
              <Package className="h-4 w-4 sm:h-5 sm:w-5" />
              Inventory Defaults
            </CardTitle>
            <CardDescription className="text-sm">Default settings for inventory management</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="low_stock_threshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Low Stock Threshold</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        min="0"
                        placeholder="10" 
                        data-testid="input-low_stock_threshold" 
                      />
                    </FormControl>
                    <FormDescription>Alert when stock falls below this number</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="default_product_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Product Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-default_product_type">
                          <SelectValue placeholder="Select product type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="regular">Regular</SelectItem>
                        <SelectItem value="bundle">Bundle</SelectItem>
                        <SelectItem value="service">Service</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>Default type for new products</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="enable_barcode_scanning"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-enable_barcode_scanning"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Enable Barcode Scanning</FormLabel>
                    <FormDescription>
                      Enable barcode scanning features throughout the system
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
