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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DollarSign, Save, Loader2 } from "lucide-react";

const formSchema = z.object({
  default_tax_rate_czk: z.coerce.number().min(0).max(100).default(21),
  default_tax_rate_eur: z.coerce.number().min(0).max(100).default(19),
  auto_apply_tax: z.boolean().default(false),
  exchange_rate_source: z.string().default("Fawaz Ahmed's free currency API"),
});

type FormValues = z.infer<typeof formSchema>;

export default function FinancialSettings() {
  const { toast } = useToast();

  const { data: settings = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/settings'],
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      default_tax_rate_czk: 21,
      default_tax_rate_eur: 19,
      auto_apply_tax: false,
      exchange_rate_source: "Fawaz Ahmed's free currency API",
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
        apiRequest('POST', `/api/settings`, { key, value, category: 'financial' })
      );
      await Promise.all(savePromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({
        title: "Settings Saved",
        description: "Financial settings have been updated successfully.",
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
              <DollarSign className="h-5 w-5" />
              Tax Configuration
            </CardTitle>
            <CardDescription>Default tax rates and settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="default_tax_rate_czk"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Tax Rate for CZK (%)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        min="0" 
                        max="100" 
                        step="0.01"
                        placeholder="21" 
                        data-testid="input-default_tax_rate_czk" 
                      />
                    </FormControl>
                    <FormDescription>Tax rate in percentage</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="default_tax_rate_eur"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Tax Rate for EUR (%)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        min="0" 
                        max="100" 
                        step="0.01"
                        placeholder="19" 
                        data-testid="input-default_tax_rate_eur" 
                      />
                    </FormControl>
                    <FormDescription>Tax rate in percentage</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="auto_apply_tax"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-auto_apply_tax"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Auto-apply Tax</FormLabel>
                    <FormDescription>
                      Automatically apply tax rates to new orders based on currency
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Exchange Rate Configuration</CardTitle>
            <CardDescription>Currency exchange rate data source</CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="exchange_rate_source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Exchange Rate API Source</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      readOnly 
                      className="bg-slate-50 dark:bg-slate-900"
                      data-testid="input-exchange_rate_source" 
                    />
                  </FormControl>
                  <FormDescription>
                    Using Fawaz Ahmed's free currency exchange rate API
                  </FormDescription>
                  <FormMessage />
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
