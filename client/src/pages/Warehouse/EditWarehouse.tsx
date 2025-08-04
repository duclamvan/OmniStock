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
import { ArrowLeft, Save, Trash2, FileUp, Calendar } from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";
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
  name: z.string().min(1, "Warehouse name is required"),
  location: z.string().optional(),
  status: z.enum(["active", "inactive", "maintenance", "rented"]).default("active"),
  rentedFromDate: z.string().optional(),
  expenseId: z.string().optional(),
  contact: z.string().optional(),
  notes: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
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
      location: "",
      status: "active",
      rentedFromDate: "",
      expenseId: "",
      contact: "",
      notes: "",
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
        location: warehouse.location || "",
        status: warehouse.status || "active",
        rentedFromDate: warehouse.rentedFromDate ? new Date(warehouse.rentedFromDate).toISOString().split('T')[0] : "",
        expenseId: warehouse.expenseId || "",
        contact: warehouse.contact || "",
        notes: warehouse.notes || "",
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

  const handleGetUploadParameters = async () => {
    const response = await apiRequest('POST', '/api/objects/upload');
    return {
      method: 'PUT' as const,
      url: response.uploadURL,
    };
  };

  const handleFileUploadComplete = (result: any) => {
    if (result.successful && result.successful.length > 0) {
      toast({
        title: "Success",
        description: "Files uploaded successfully",
      });
    }
  };

  const onSubmit = (data: WarehouseFormData) => {
    updateWarehouseMutation.mutate(data);
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    deleteWarehouseMutation.mutate();
    setShowDeleteDialog(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
    <div className="p-6 max-w-4xl mx-auto space-y-6">
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
            {/* Top Row - Warehouse Name and Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Warehouse Name</Label>
                <Input
                  id="name"
                  {...form.register("name")}
                  placeholder="Type here"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <Select value={form.watch("location") || ""} onValueChange={(value) => form.setValue("location", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Please select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warehouse-a">Warehouse A</SelectItem>
                    <SelectItem value="warehouse-b">Warehouse B</SelectItem>
                    <SelectItem value="warehouse-c">Warehouse C</SelectItem>
                    <SelectItem value="main-facility">Main Facility</SelectItem>
                    <SelectItem value="branch-office">Branch Office</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Second Row - Status and Rented From Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={form.watch("status")} onValueChange={(value: any) => form.setValue("status", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Please select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="rented">Rented</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="rentedFromDate">Rented From Date</Label>
                <div className="relative">
                  <Input
                    id="rentedFromDate"
                    type="date"
                    {...form.register("rentedFromDate")}
                  />
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Third Row - Contact and Expense ID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact">Contact</Label>
                <Input
                  id="contact"
                  {...form.register("contact")}
                  placeholder="Type here"
                />
              </div>

              <div>
                <Label htmlFor="expenseId">Expense ID</Label>
                <Input
                  id="expenseId"
                  {...form.register("expenseId")}
                  placeholder="Type here"
                />
              </div>
            </div>

            {/* Notes Section */}
            <div>
              <Label htmlFor="notes">Note</Label>
              <Textarea
                id="notes"
                {...form.register("notes")}
                placeholder="Type here..."
                className="min-h-[100px]"
              />
            </div>

            {/* File Upload Section */}
            <div>
              <Label>Add Attachments</Label>
              <div className="mt-2">
                <ObjectUploader
                  maxNumberOfFiles={5}
                  maxFileSize={50 * 1024 * 1024} // 50MB
                  onGetUploadParameters={handleGetUploadParameters}
                  onComplete={handleFileUploadComplete}
                  buttonClassName="w-full border-2 border-dashed border-slate-300 hover:border-slate-400 transition-colors py-8"
                >
                  <div className="flex flex-col items-center gap-2 text-slate-600">
                    <FileUp className="h-8 w-8" />
                    <p className="text-sm">Drag & Drop or choose file to upload</p>
                    <p className="text-xs text-slate-500">You can attach PDF, IMAGE, any file</p>
                  </div>
                </ObjectUploader>
              </div>
            </div>

            {/* Legacy fields in collapsible section */}
            <details className="mt-6">
              <summary className="cursor-pointer text-sm font-medium text-slate-600 hover:text-slate-900">
                Additional Information
              </summary>
              <div className="mt-4 space-y-4 pl-4 border-l-2 border-slate-200">
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    {...form.register("address")}
                    placeholder="123 Main Street"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      {...form.register("city")}
                      placeholder="Prague"
                    />
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="manager">Manager</Label>
                    <Input
                      id="manager"
                      {...form.register("manager")}
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <Label htmlFor="capacity">Capacity</Label>
                    <Input
                      id="capacity"
                      type="number"
                      {...form.register("capacity", { valueAsNumber: true })}
                      placeholder="1000"
                    />
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
              </div>
            </details>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteWarehouseMutation.isPending}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Warehouse
          </Button>

          <Button
            type="submit"
            disabled={updateWarehouseMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {updateWarehouseMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Warehouse</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this warehouse? This action cannot be undone.
              This will also remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
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