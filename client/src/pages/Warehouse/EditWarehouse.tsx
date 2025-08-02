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

const warehouseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  country: z.string().default("Czech Republic"),
  zipCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  manager: z.string().optional(),
  capacity: z.number().min(0).optional(),
  type: z.enum(["main", "branch", "temporary"]).default("branch"),
});

type WarehouseFormData = z.infer<typeof warehouseSchema>;

export default function EditWarehouse() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: warehouse, isLoading } = useQuery({
    queryKey: ['/api/warehouses', id],
    queryFn: () => apiRequest('GET', `/api/warehouses/${id}`),
    enabled: !!id,
  });

  const form = useForm<WarehouseFormData>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: {
      name: "",
      address: "",
      city: "",
      country: "Czech Republic",
      zipCode: "",
      phone: "",
      email: "",
      manager: "",
      capacity: 0,
      type: "branch",
    },
  });

  useEffect(() => {
    if (warehouse) {
      form.reset({
        name: warehouse.name || "",
        address: warehouse.address || "",
        city: warehouse.city || "",
        country: warehouse.country || "Czech Republic",
        zipCode: warehouse.zipCode || "",
        phone: warehouse.phone || "",
        email: warehouse.email || "",
        manager: warehouse.manager || "",
        capacity: warehouse.capacity || 0,
        type: warehouse.type || "branch",
      });
    }
  }, [warehouse, form]);

  const updateWarehouseMutation = useMutation({
    mutationFn: (data: WarehouseFormData) => 
      apiRequest('PATCH', `/api/warehouses/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/warehouses'] });
      toast({
        title: "Success",
        description: "Warehouse updated successfully",
      });
      navigate("/warehouse");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update warehouse",
        variant: "destructive",
      });
    },
  });

  const deleteWarehouseMutation = useMutation({
    mutationFn: () => apiRequest('DELETE', `/api/warehouses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/warehouses'] });
      toast({
        title: "Success",
        description: "Warehouse deleted successfully",
      });
      navigate("/warehouse");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message.includes('referenced') || error.message.includes('constraint')
          ? "Cannot delete warehouse - it's being used in existing records" 
          : error.message || "Failed to delete warehouse",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: WarehouseFormData) => {
    updateWarehouseMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600">Loading warehouse...</p>
        </div>
      </div>
    );
  }

  if (!warehouse) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-600">Warehouse not found</p>
        <Button className="mt-4" onClick={() => navigate("/warehouse")}>
          Back to Warehouses
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
            onClick={() => navigate("/warehouse")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">Edit Warehouse</h1>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Warehouse Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Warehouse Name</Label>
                <Input
                  id="name"
                  {...form.register("name")}
                  placeholder="Main Warehouse"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="type">Type</Label>
                <Select value={form.watch("type")} onValueChange={(value: any) => form.setValue("type", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main">Main</SelectItem>
                    <SelectItem value="branch">Branch</SelectItem>
                    <SelectItem value="temporary">Temporary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                {...form.register("address")}
                placeholder="123 Main Street"
              />
              {form.formState.errors.address && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.address.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  {...form.register("city")}
                  placeholder="Prague"
                />
                {form.formState.errors.city && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.city.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="zipCode">ZIP Code</Label>
                <Input
                  id="zipCode"
                  {...form.register("zipCode")}
                  placeholder="10000"
                />
              </div>

              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  {...form.register("country")}
                  placeholder="Czech Republic"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  {...form.register("phone")}
                  placeholder="+420 123 456 789"
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...form.register("email")}
                  placeholder="warehouse@company.com"
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.email.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="manager">Manager</Label>
                <Input
                  id="manager"
                  {...form.register("manager")}
                  placeholder="John Doe"
                />
              </div>

              <div>
                <Label htmlFor="capacity">Capacity (units)</Label>
                <Input
                  id="capacity"
                  type="number"
                  {...form.register("capacity", { valueAsNumber: true })}
                  placeholder="10000"
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
            Delete Warehouse
          </Button>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/warehouse")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateWarehouseMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </form>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Warehouse</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{warehouse.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteWarehouseMutation.mutate()}
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