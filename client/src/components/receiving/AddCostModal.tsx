import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  AlertCircle,
  RefreshCcw,
  Info
} from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Supported currencies
const CURRENCIES = [
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna' },
];

// Standard volumetric divisors
const VOLUMETRIC_DIVISORS = {
  AIR: 6000,
  SEA: 1000000,
  COURIER: 5000,
};

interface ShipmentCost {
  id: number;
  shipmentId: number;
  type: 'FREIGHT' | 'BROKERAGE' | 'INSURANCE' | 'PACKAGING' | 'OTHER';
  mode?: 'AIR' | 'SEA' | 'COURIER';
  volumetricDivisor?: number;
  amountOriginal: string;
  currency: string;
  fxRateUsed?: string;
  amountBase: string;
  notes?: string;
}

interface AddCostModalProps {
  shipmentId: number;
  cost?: ShipmentCost | null;
  onClose: () => void;
  onSave: () => void;
}

const costFormSchema = z.object({
  type: z.enum(['FREIGHT', 'BROKERAGE', 'INSURANCE', 'PACKAGING', 'OTHER']),
  mode: z.enum(['AIR', 'SEA', 'COURIER']).optional().nullable(),
  amountOriginal: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Amount must be a positive number"
  }),
  currency: z.string().min(1, "Currency is required"),
  volumetricDivisor: z.string().optional(),
  fxRate: z.string().optional(),
  notes: z.string().optional(),
});

type CostFormValues = z.infer<typeof costFormSchema>;

const AddCostModal = ({ shipmentId, cost, onClose, onSave }: AddCostModalProps) => {
  const { toast } = useToast();
  const [fetchingRate, setFetchingRate] = useState(false);
  const isEditing = !!cost;

  const form = useForm<CostFormValues>({
    resolver: zodResolver(costFormSchema),
    defaultValues: {
      type: cost?.type || 'FREIGHT',
      mode: cost?.mode || null,
      amountOriginal: cost?.amountOriginal || '',
      currency: cost?.currency || 'USD',
      volumetricDivisor: cost?.volumetricDivisor?.toString() || '',
      fxRate: cost?.fxRateUsed || '',
      notes: cost?.notes || '',
    },
  });

  const watchType = form.watch('type');
  const watchMode = form.watch('mode');
  const watchCurrency = form.watch('currency');
  const watchAmount = form.watch('amountOriginal');

  // Auto-set volumetric divisor based on mode
  useEffect(() => {
    if (watchType === 'FREIGHT' && watchMode) {
      const divisor = VOLUMETRIC_DIVISORS[watchMode];
      if (divisor) {
        form.setValue('volumetricDivisor', divisor.toString());
      }
    }
  }, [watchMode, watchType, form]);

  // Fetch exchange rate
  const fetchExchangeRate = async () => {
    if (watchCurrency === 'EUR') {
      form.setValue('fxRate', '1');
      return;
    }

    setFetchingRate(true);
    try {
      // In a real app, this would call an FX rate API
      // For now, we'll use mock rates
      const mockRates: Record<string, number> = {
        USD: 0.92,
        GBP: 1.16,
        CNY: 0.13,
        JPY: 0.0062,
        AUD: 0.59,
        CAD: 0.67,
        CHF: 1.03,
        HKD: 0.12,
        SGD: 0.68,
        CZK: 0.041,
      };
      
      const rate = mockRates[watchCurrency] || 1;
      form.setValue('fxRate', rate.toString());
      toast({
        title: "Exchange Rate Updated",
        description: `1 ${watchCurrency} = ${rate} EUR`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch exchange rate",
        variant: "destructive"
      });
    } finally {
      setFetchingRate(false);
    }
  };

  // Create/Update cost mutation
  const saveCostMutation = useMutation({
    mutationFn: async (data: CostFormValues) => {
      const payload = {
        type: data.type,
        mode: data.type === 'FREIGHT' ? data.mode : undefined,
        amountOriginal: parseFloat(data.amountOriginal),
        currency: data.currency,
        volumetricDivisor: data.volumetricDivisor ? parseInt(data.volumetricDivisor) : undefined,
        fxRate: data.fxRate ? parseFloat(data.fxRate) : undefined,
        notes: data.notes || undefined,
      };

      if (isEditing && cost) {
        return apiRequest('PUT', `/api/imports/shipments/${shipmentId}/costs/${cost.id}`, payload);
      } else {
        return apiRequest('POST', `/api/imports/shipments/${shipmentId}/costs`, payload);
      }
    },
    onSuccess: () => {
      toast({
        title: isEditing ? "Cost Updated" : "Cost Added",
        description: isEditing ? "Cost line has been updated" : "New cost line has been added",
      });
      onSave();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${isEditing ? 'update' : 'add'} cost`,
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: CostFormValues) => {
    saveCostMutation.mutate(data);
  };

  const calculateBaseAmount = () => {
    const amount = parseFloat(watchAmount);
    const rate = parseFloat(form.watch('fxRate'));
    if (!isNaN(amount) && !isNaN(rate)) {
      return (amount * rate).toFixed(4);
    }
    return '0.00';
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Cost' : 'Add Cost'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the details of this cost line' : 'Add a new cost line to this shipment'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Cost Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cost Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-cost-type">
                        <SelectValue placeholder="Select cost type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="FREIGHT">Freight</SelectItem>
                      <SelectItem value="BROKERAGE">Brokerage</SelectItem>
                      <SelectItem value="INSURANCE">Insurance</SelectItem>
                      <SelectItem value="PACKAGING">Packaging</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Mode (for freight only) */}
            {watchType === 'FREIGHT' && (
              <>
                <FormField
                  control={form.control}
                  name="mode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shipping Mode</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value || undefined}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-shipping-mode">
                            <SelectValue placeholder="Select shipping mode" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="AIR">Air Freight</SelectItem>
                          <SelectItem value="SEA">Sea Freight</SelectItem>
                          <SelectItem value="COURIER">Courier/Express</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        This affects volumetric weight calculations
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="volumetricDivisor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Volumetric Divisor
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3 w-3 ml-2 inline-block cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Used to calculate volumetric weight</p>
                              <p>Standard: Air=6000, Sea=1000000, Courier=5000</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="6000"
                          {...field}
                          data-testid="input-volumetric-divisor"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Amount and Currency */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amountOriginal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        data-testid="input-amount"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-currency">
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CURRENCIES.map(curr => (
                          <SelectItem key={curr.code} value={curr.code}>
                            {curr.code} ({curr.symbol}) - {curr.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* FX Rate */}
            {watchCurrency && watchCurrency !== 'EUR' && (
              <FormField
                control={form.control}
                name="fxRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Exchange Rate (1 {watchCurrency} = ? EUR)
                    </FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input
                          type="number"
                          step="0.000001"
                          placeholder="0.00"
                          {...field}
                          data-testid="input-fx-rate"
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={fetchExchangeRate}
                        disabled={fetchingRate}
                        data-testid="button-fetch-rate"
                      >
                        {fetchingRate ? (
                          <RefreshCcw className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <RefreshCcw className="h-4 w-4 mr-2" />
                            Fetch
                          </>
                        )}
                      </Button>
                    </div>
                    <FormDescription>
                      Leave blank to auto-fetch current rate
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Base Amount Preview */}
            {watchAmount && form.watch('fxRate') && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Converted Amount</AlertTitle>
                <AlertDescription>
                  {watchAmount} {watchCurrency} = <strong>{calculateBaseAmount()} EUR</strong>
                  {watchCurrency !== 'EUR' && (
                    <span className="text-xs ml-2">
                      (Rate: 1 {watchCurrency} = {form.watch('fxRate')} EUR)
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any relevant notes about this cost..."
                      className="resize-none"
                      rows={3}
                      {...field}
                      data-testid="textarea-notes"
                    />
                  </FormControl>
                  <FormDescription>
                    Any additional information about this cost
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={saveCostMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={saveCostMutation.isPending}
                data-testid="button-save-cost"
              >
                {saveCostMutation.isPending ? (
                  <>
                    <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  isEditing ? 'Update Cost' : 'Add Cost'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddCostModal;