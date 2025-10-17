import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Grid3x3, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const layoutSchema = z.object({
  name: z.string().min(1, "Layout name is required"),
  width: z.number().min(1, "Width must be at least 1"),
  length: z.number().min(1, "Length must be at least 1"),
  rows: z.number().min(1, "Rows must be at least 1").max(26, "Maximum 26 rows (A-Z)"),
  columns: z.number().min(1, "Columns must be at least 1"),
  binWidth: z.number().min(0.1, "Bin width must be at least 0.1"),
  binHeight: z.number().min(0.1, "Bin height must be at least 0.1"),
  aisleWidth: z.number().min(0, "Aisle width cannot be negative"),
  binCapacity: z.number().min(1, "Bin capacity must be at least 1"),
});

type LayoutFormData = z.infer<typeof layoutSchema>;

interface LayoutGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouseId: string;
  onSuccess: () => void;
}

export function LayoutGeneratorDialog({ open, onOpenChange, warehouseId, onSuccess }: LayoutGeneratorDialogProps) {
  const form = useForm<LayoutFormData>({
    resolver: zodResolver(layoutSchema),
    defaultValues: {
      name: "Auto-generated Layout",
      width: 10,
      length: 10,
      rows: 10,
      columns: 10,
      binWidth: 1,
      binHeight: 1,
      aisleWidth: 0.5,
      binCapacity: 100,
    },
  });

  const generateLayoutMutation = useMutation({
    mutationFn: async (data: LayoutFormData) => {
      return apiRequest("POST", `/api/warehouses/${warehouseId}/layout/generate`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/warehouses', warehouseId, 'layout'] });
      queryClient.invalidateQueries({ queryKey: ['/api/warehouses', warehouseId, 'layout', 'bins'] });
      queryClient.invalidateQueries({ queryKey: ['/api/warehouses', warehouseId, 'layout', 'stats'] });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate layout",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LayoutFormData) => {
    generateLayoutMutation.mutate(data);
  };

  const estimatedBins = form.watch("rows") * form.watch("columns");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-layout-generator">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Grid3x3 className="h-5 w-5" />
            Generate Warehouse Layout
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Layout Name</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-layout-name" />
                  </FormControl>
                  <FormDescription>
                    A descriptive name for this warehouse layout
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="width"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Warehouse Width (m)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        data-testid="input-warehouse-width"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="length"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Warehouse Length (m)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        data-testid="input-warehouse-length"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="rows"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Rows (A-Z)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-rows"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="columns"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Columns</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-columns"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="binWidth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bin Width (m)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        data-testid="input-bin-width"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="binHeight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bin Height (m)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        data-testid="input-bin-height"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="aisleWidth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Aisle Width (m)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        data-testid="input-aisle-width"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="binCapacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bin Capacity (units)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-bin-capacity"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-semibold text-sm mb-2">Layout Preview</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p data-testid="text-estimated-bins">Total bins: {estimatedBins}</p>
                <p>Grid: {form.watch("rows")} rows × {form.watch("columns")} columns</p>
                <p>Bin codes: A1 to {String.fromCharCode(64 + form.watch("rows"))}{form.watch("columns")}</p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={generateLayoutMutation.isPending}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={generateLayoutMutation.isPending}
                data-testid="button-generate"
              >
                {generateLayoutMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Grid3x3 className="mr-2 h-4 w-4" />
                    Generate Layout
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
