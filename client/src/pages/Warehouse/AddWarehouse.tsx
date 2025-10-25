import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  ArrowLeft, 
  Save, 
  FileUp, 
  Calendar, 
  Building2, 
  MapPin, 
  Phone,
  Mail,
  User,
  Banknote,
  Settings,
  FileText,
  Hash,
  Ruler,
  Plus
} from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

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
  floorArea: z.number().min(0).optional(),
});

type WarehouseFormData = z.infer<typeof warehouseSchema>;

export default function AddWarehouse() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

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
      floorArea: 0,
    },
  });

  const createWarehouseMutation = useMutation({
    mutationFn: (data: WarehouseFormData) => 
      apiRequest('POST', '/api/warehouses', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/warehouses'] });
      toast({
        title: "Success",
        description: "Warehouse created successfully",
      });
      navigate("/warehouses");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create warehouse",
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
    createWarehouseMutation.mutate(data);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Warehouses
          </Button>
        </div>
        <Badge variant="outline" className="text-green-600 border-green-600">
          <Plus className="h-3 w-3 mr-1" />
          New Warehouse
        </Badge>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-slate-900">Add New Warehouse</h1>
        <p className="text-slate-600 mt-1">Create a new warehouse location and configure its details</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  Basic Information
                </CardTitle>
                <CardDescription>Essential warehouse details and identification</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Warehouse Name *</Label>
                    <Input
                      id="name"
                      {...form.register("name")}
                      placeholder="e.g., Berlin EU Distribution"
                      className="mt-1"
                    />
                    {form.formState.errors.name && (
                      <p className="text-sm text-red-600 mt-1">{form.formState.errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="type">Warehouse Type</Label>
                    <Select value={form.watch("type")} onValueChange={(value: any) => form.setValue("type", value)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="main">Main Hub</SelectItem>
                        <SelectItem value="branch">Branch Location</SelectItem>
                        <SelectItem value="temporary">Temporary Storage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="status">Operating Status</Label>
                    <Select value={form.watch("status")} onValueChange={(value: any) => form.setValue("status", value)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 bg-green-500 rounded-full" />
                            Active
                          </div>
                        </SelectItem>
                        <SelectItem value="inactive">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 bg-gray-500 rounded-full" />
                            Inactive
                          </div>
                        </SelectItem>
                        <SelectItem value="maintenance">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 bg-yellow-500 rounded-full" />
                            Maintenance
                          </div>
                        </SelectItem>
                        <SelectItem value="rented">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 bg-blue-500 rounded-full" />
                            Rented
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="manager">Warehouse Manager</Label>
                    <div className="relative mt-1">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="manager"
                        {...form.register("manager")}
                        placeholder="e.g., John Smith"
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="capacity">Storage Capacity (units)</Label>
                    <div className="relative mt-1">
                      <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="capacity"
                        type="number"
                        {...form.register("capacity", { valueAsNumber: true })}
                        placeholder="e.g., 5000"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="floorArea">Floor Area (m²)</Label>
                    <div className="relative mt-1">
                      <Ruler className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="floorArea"
                        type="number"
                        {...form.register("floorArea", { valueAsNumber: true })}
                        placeholder="e.g., 2500"
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Location Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-green-600" />
                  Location & Address
                </CardTitle>
                <CardDescription>Physical location and contact information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="address">Street Address</Label>
                  <Input
                    id="address"
                    {...form.register("address")}
                    placeholder="e.g., 123 Industrial Park Road"
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      {...form.register("city")}
                      placeholder="e.g., Berlin"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="zipCode">ZIP/Postal Code</Label>
                    <Input
                      id="zipCode"
                      {...form.register("zipCode")}
                      placeholder="e.g., 10115"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      {...form.register("country")}
                      placeholder="e.g., Germany"
                      className="mt-1"
                    />
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative mt-1">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="phone"
                        {...form.register("phone")}
                        placeholder="e.g., +49 30 12345678"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative mt-1">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="email"
                        type="email"
                        {...form.register("email")}
                        placeholder="e.g., warehouse@company.com"
                        className="pl-10"
                      />
                    </div>
                    {form.formState.errors.email && (
                      <p className="text-sm text-red-600 mt-1">{form.formState.errors.email.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="contact">Primary Contact Person</Label>
                  <Input
                    id="contact"
                    {...form.register("contact")}
                    placeholder="e.g., Jane Doe - Operations Manager"
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Financial & Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-orange-600" />
                  Financial & Additional Info
                </CardTitle>
                <CardDescription>Rental details, expenses, and notes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rentedFromDate">Rental Start Date</Label>
                    <div className="relative mt-1">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="rentedFromDate"
                        type="date"
                        {...form.register("rentedFromDate")}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="expenseId">Expense Reference ID</Label>
                    <Input
                      id="expenseId"
                      {...form.register("expenseId")}
                      placeholder="e.g., EXP-2025-001"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="location">Location Reference/Code</Label>
                  <Input
                    id="location"
                    {...form.register("location")}
                    placeholder="e.g., WH-BER-01"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Internal Notes</Label>
                  <Textarea
                    id="notes"
                    {...form.register("notes")}
                    placeholder="Add any important notes about this warehouse..."
                    className="min-h-[120px] mt-1"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - 1/3 width */}
          <div className="space-y-6">
            {/* File Upload Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-600" />
                  Documents
                </CardTitle>
                <CardDescription>Upload contracts, photos, or documents</CardDescription>
              </CardHeader>
              <CardContent>
                <ObjectUploader
                  maxNumberOfFiles={10}
                  maxFileSize={50 * 1024 * 1024} // 50MB
                  onGetUploadParameters={handleGetUploadParameters}
                  onComplete={handleFileUploadComplete}
                  buttonClassName="w-full border-2 border-dashed border-slate-300 hover:border-blue-400 transition-all duration-200 py-8 bg-slate-50 hover:bg-blue-50"
                >
                  <div className="flex flex-col items-center gap-2 text-slate-600">
                    <FileUp className="h-10 w-10 text-blue-500" />
                    <p className="text-sm font-medium">Click or drag files</p>
                    <p className="text-xs text-slate-500">PDF, Images, Documents (max 50MB)</p>
                  </div>
                </ObjectUploader>
              </CardContent>
            </Card>

            {/* Quick Actions Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-gray-600" />
                  Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={createWarehouseMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {createWarehouseMutation.isPending ? "Creating..." : "Create Warehouse"}
                </Button>
                
                <Button 
                  type="button"
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate("/warehouses")}
                >
                  Cancel
                </Button>

                <Separator />

                {/* Tips */}
                <div className="pt-3 space-y-2 text-sm text-slate-600">
                  <h4 className="font-medium text-slate-700">Quick Tips:</h4>
                  <ul className="space-y-1 text-xs">
                    <li>• Fill in required fields marked with *</li>
                    <li>• Floor area helps calculate storage density</li>
                    <li>• Upload relevant documents for easy access</li>
                    <li>• Set status to "Inactive" if not operational yet</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}