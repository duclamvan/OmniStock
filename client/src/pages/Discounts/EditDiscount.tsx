import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const saleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  code: z.string().min(1, "Code is required"),
  type: z.enum(["percentage", "fixed", "buy_x_get_y"]),
  value: z.string().min(1, "Value is required"),
  currency: z.enum(["CZK", "EUR", "USD", "VND", "CNY"]).optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  minimumAmount: z.string().optional(),
  maximumDiscount: z.string().optional(),
});

type SaleFormData = z.infer<typeof saleSchema>;

export default function EditDiscount() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: sale, isLoading } = useQuery({
    queryKey: ['/api/discounts', id],
    queryFn: () => apiRequest('GET', `/api/discounts/${id}`),
    enabled: !!id,
  });

  const form = useForm<SaleFormData>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      name: "",
      description: "",
      code: "",
      type: "percentage",
      value: "",
      currency: "EUR",
      startDate: "",
      endDate: "",
      minimumAmount: "",
      maximumDiscount: "",
    },
  });

  useEffect(() => {
    if (sale) {
      form.reset({
        name: sale.name || "",
        description: sale.description || "",
        code: sale.code || "",
        type: sale.type || "percentage",
        value: sale.value?.toString() || "",
        currency: sale.currency || "EUR",
        startDate: sale.startDate ? new Date(sale.startDate).toISOString().split('T')[0] : "",
        endDate: sale.endDate ? new Date(sale.endDate).toISOString().split('T')[0] : "",
        minimumAmount: sale.minimumAmount?.toString() || "",
        maximumDiscount: sale.maximumDiscount?.toString() || "",
      });
    }
  }, [sale, form]);

  const updateSaleMutation = useMutation({
    mutationFn: (data: SaleFormData) => {
      const payload = {
        ...data,
        value: parseFloat(data.value),
        minimumAmount: data.minimumAmount ? parseFloat(data.minimumAmount) : undefined,
        maximumDiscount: data.maximumDiscount ? parseFloat(data.maximumDiscount) : undefined,
      };
      return apiRequest('PATCH', `/api/discounts/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/discounts'] });
      toast({
        title: "Success",
        description: "Discount updated successfully",
      });
      navigate("/discounts");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update discount",
        variant: "destructive",
      });
    },
  });

  const deleteSaleMutation = useMutation({
    mutationFn: () => apiRequest('DELETE', `/api/discounts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/discounts'] });
      toast({
        title: "Success",
        description: "Discount deleted successfully",
      });
      navigate("/discounts");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message.includes('referenced') || error.message.includes('constraint')
          ? "Cannot delete discount - it's being used in existing records" 
          : error.message || "Failed to delete discount",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SaleFormData) => {
    updateSaleMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600">Loading discount...</p>
        </div>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-600">Discount not found</p>
        <Button className="mt-4" onClick={() => navigate("/discounts")}>
          Back to Discounts
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/discounts")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">Edit Discount</h1>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Discount Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Discount Name</Label>
                <Input
                  id="name"
                  {...form.register("name")}
                  placeholder="Summer Sale"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  {...form.register("code")}
                  placeholder="SUMMER2025"
                />
                {form.formState.errors.code && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.code.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...form.register("description")}
                placeholder="Sale description..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="type">Type</Label>
                <Select value={form.watch("type")} onValueChange={(value: any) => form.setValue("type", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                    <SelectItem value="buy_x_get_y">Buy X Get Y</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="value">
                  {form.watch("type") === "percentage" ? "Percentage (%)" : "Value"}
                </Label>
                <Input
                  id="value"
                  type="number"
                  step="0.01"
                  {...form.register("value")}
                  placeholder={form.watch("type") === "percentage" ? "10" : "100"}
                />
                {form.formState.errors.value && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.value.message}</p>
                )}
              </div>

              {form.watch("type") === "fixed" && (
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={form.watch("currency")} onValueChange={(value: any) => form.setValue("currency", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CZK">CZK</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="VND">VND</SelectItem>
                      <SelectItem value="CNY">CNY</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  {...form.register("startDate")}
                />
                {form.formState.errors.startDate && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.startDate.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  {...form.register("endDate")}
                />
                {form.formState.errors.endDate && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.endDate.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="minimumAmount">Minimum Amount (optional)</Label>
                <Input
                  id="minimumAmount"
                  type="number"
                  step="0.01"
                  {...form.register("minimumAmount")}
                  placeholder="100"
                />
              </div>

              <div>
                <Label htmlFor="maximumDiscount">Maximum Discount (optional)</Label>
                <Input
                  id="maximumDiscount"
                  type="number"
                  step="0.01"
                  {...form.register("maximumDiscount")}
                  placeholder="500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button
            type="button"
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Discount
          </Button>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/discounts")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateSaleMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </form>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Discount</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{sale.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteSaleMutation.mutate()}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}