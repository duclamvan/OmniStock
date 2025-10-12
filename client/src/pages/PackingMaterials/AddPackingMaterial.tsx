import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState, useRef, useEffect } from "react";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save, Box, Layers, Shield, Package, Upload, X, Check, UserPlus, FlaskConical } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Separator } from "@/components/ui/separator";
import { compressImage } from "@/lib/imageCompression";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  category: z.string().min(1, "Category is required"),
  size: z.string().optional(),
  // Separate dimension fields
  length: z.string().optional(),
  width: z.string().optional(),
  height: z.string().optional(),
  dimensionUnit: z.string().default("cm"),
  // Separate weight fields
  weightValue: z.string().optional(),
  weightUnit: z.string().default("kg"),
  // Combined for backward compatibility
  dimensions: z.string().optional(),
  weight: z.string().optional(),
  stockQuantity: z.coerce.number().min(0).default(0),
  minStockLevel: z.coerce.number().min(0).default(10),
  cost: z.string().optional(),
  currency: z.string().default("EUR"),
  supplier: z.string().optional(),
  imageUrl: z.string().optional(),
  description: z.string().optional(),
  isFragile: z.boolean().default(false),
  isReusable: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

// Material Categories with icons
const MATERIAL_CATEGORIES = [
  { value: "cartons", label: "Cartons & Boxes", icon: Box },
  { value: "filling", label: "Filling Materials", icon: Layers },
  { value: "protective", label: "Protective Materials", icon: Shield },
  { value: "supplies", label: "General Supplies", icon: Package },
  { value: "packaging", label: "Product Packaging", icon: FlaskConical },
];

interface PmSupplier {
  id: string;
  name: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  website?: string | null;
  notes?: string | null;
  isActive: boolean;
}

export default function AddPackingMaterial() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageUploading, setImageUploading] = useState(false);
  
  // Supplier autocomplete state
  const [supplierDropdownOpen, setSupplierDropdownOpen] = useState(false);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const supplierDropdownRef = useRef<HTMLDivElement>(null);
  
  // New supplier dialog state
  const [newSupplierDialogOpen, setNewSupplierDialogOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    name: "",
    contactPerson: "",
    email: "",
    phone: "",
    address: "",
    website: "",
    notes: "",
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      code: "",
      category: "",
      size: "",
      length: "",
      width: "",
      height: "",
      dimensionUnit: "cm",
      weightValue: "",
      weightUnit: "kg",
      dimensions: "",
      weight: "",
      stockQuantity: 0,
      minStockLevel: 10,
      cost: "",
      currency: "EUR",
      supplier: "",
      imageUrl: "",
      description: "",
      isFragile: false,
      isReusable: false,
      isActive: true,
    },
  });

  const supplierValue = form.watch("supplier");

  // Fetch PM suppliers
  const { data: pmSuppliers = [] } = useQuery<PmSupplier[]>({
    queryKey: ["/api/pm-suppliers"],
  });

  // Filter suppliers based on search
  const filteredSuppliers = pmSuppliers.filter(s => {
    if (!supplierValue) return false;
    return s.name.toLowerCase().includes(supplierValue.toLowerCase());
  });

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(event.target as Node)) {
        setSupplierDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setImageFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
    form.setValue("imageUrl", "");
  };

  // Create new supplier mutation
  const createSupplierMutation = useMutation({
    mutationFn: async (supplierData: typeof newSupplier) => {
      return apiRequest("POST", "/api/pm-suppliers", supplierData);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm-suppliers"] });
      toast({
        title: "Success",
        description: "PM supplier created successfully",
      });
      // Set the new supplier in the form
      form.setValue("supplier", data.name);
      setSupplierId(data.id);
      setNewSupplierDialogOpen(false);
      // Reset new supplier form
      setNewSupplier({
        name: "",
        contactPerson: "",
        email: "",
        phone: "",
        address: "",
        website: "",
        notes: "",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create PM supplier",
        variant: "destructive",
      });
    },
  });

  const handleCreateSupplier = () => {
    if (!newSupplier.name) {
      toast({
        title: "Validation Error",
        description: "Supplier name is required",
        variant: "destructive",
      });
      return;
    }
    createSupplierMutation.mutate(newSupplier);
  };

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // Combine dimensions if separate fields are provided
      const processedData = { ...data };
      if (data.length || data.width || data.height) {
        const dims = [data.length, data.width, data.height].filter(Boolean);
        processedData.dimensions = dims.length > 0 ? `${dims.join('×')} ${data.dimensionUnit}` : '';
      }
      if (data.weightValue) {
        processedData.weight = `${data.weightValue} ${data.weightUnit}`;
      }

      // Upload image if one is selected
      if (imageFile) {
        setImageUploading(true);
        try {
          const compressed = await compressImage(imageFile, {
            maxWidth: 1920,
            maxHeight: 1920,
            quality: 0.8,
            format: 'jpeg'
          });

          // Convert base64 to blob
          const base64Response = await fetch(compressed);
          const blob = await base64Response.blob();
          
          // Create FormData for upload
          const formData = new FormData();
          formData.append('image', blob, imageFile.name);
          
          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          if (!uploadResponse.ok) {
            throw new Error('Image upload failed');
          }

          const uploadResult = await uploadResponse.json();
          processedData.imageUrl = uploadResult.imageUrl;
        } catch (error) {
          console.error('Image upload error:', error);
          toast({
            title: "Image upload failed",
            description: "The material will be created without an image",
            variant: "destructive",
          });
        } finally {
          setImageUploading(false);
        }
      }

      return apiRequest("POST", "/api/packing-materials", processedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packing-materials"] });
      toast({
        title: "Success",
        description: "Packing material created successfully",
      });
      navigate("/packing-materials");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create packing material",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createMutation.mutate(data);
  };

  return (
    <div className="container mx-auto py-6 max-w-5xl">
      <div className="mb-6">
        <Link href="/packing-materials">
          <Button variant="ghost" size="sm" data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Packing Materials
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Packing Material</CardTitle>
          <CardDescription>
            Add packing materials and supplies to your warehouse inventory
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              {/* Material Classification */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Material Classification</h3>
                  <p className="text-sm text-muted-foreground">Select the category of packing material</p>
                </div>
                <Separator />
                
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {MATERIAL_CATEGORIES.map((cat) => {
                            const IconComponent = cat.icon;
                            return (
                              <SelectItem key={cat.value} value={cat.value}>
                                <div className="flex items-center gap-2">
                                  <IconComponent className="h-4 w-4" />
                                  <span>{cat.label}</span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Basic Information */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Basic Information</h3>
                  <p className="text-sm text-muted-foreground">Material identification and naming</p>
                </div>
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Material Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Large Shipping Carton" {...field} data-testid="input-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Material Code *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., CART-L-001" {...field} data-testid="input-code" />
                        </FormControl>
                        <FormDescription>Unique identifier for tracking</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Dimensions & Specifications */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Dimensions & Specifications</h3>
                  <p className="text-sm text-muted-foreground">Physical measurements and weight</p>
                </div>
                <Separator />
                
                <div className="space-y-4">
                  {/* Dimensions */}
                  <div>
                    <FormLabel className="text-base mb-3 block">Dimensions</FormLabel>
                    <div className="grid grid-cols-4 gap-3">
                      <FormField
                        control={form.control}
                        name="length"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">Length</FormLabel>
                            <FormControl>
                              <Input placeholder="0" {...field} value={field.value || ""} data-testid="input-length" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="width"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">Width</FormLabel>
                            <FormControl>
                              <Input placeholder="0" {...field} value={field.value || ""} data-testid="input-width" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="height"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">Height</FormLabel>
                            <FormControl>
                              <Input placeholder="0" {...field} value={field.value || ""} data-testid="input-height" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="dimensionUnit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">Unit</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-dimension-unit">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="cm">cm</SelectItem>
                                <SelectItem value="mm">mm</SelectItem>
                                <SelectItem value="m">m</SelectItem>
                                <SelectItem value="in">in</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Weight */}
                  <div>
                    <FormLabel className="text-base mb-3 block">Weight</FormLabel>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="col-span-1 md:col-span-1">
                        <FormField
                          control={form.control}
                          name="weightValue"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs text-muted-foreground">Value</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.001" placeholder="0.0" {...field} value={field.value || ""} data-testid="input-weight-value" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-1 md:col-span-1">
                        <FormField
                          control={form.control}
                          name="weightUnit"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs text-muted-foreground">Unit</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-weight-unit">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="kg">kg</SelectItem>
                                  <SelectItem value="g">g</SelectItem>
                                  <SelectItem value="lb">lb</SelectItem>
                                  <SelectItem value="oz">oz</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cost & Inventory */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Cost & Inventory</h3>
                  <p className="text-sm text-muted-foreground">Pricing and stock management</p>
                </div>
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="cost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit Cost</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0.00" {...field} data-testid="input-cost" />
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
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="EUR">EUR (€)</SelectItem>
                            <SelectItem value="CZK">CZK (Kč)</SelectItem>
                            <SelectItem value="USD">USD ($)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="supplier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Supplier</FormLabel>
                        <FormControl>
                          <div className="relative" ref={supplierDropdownRef}>
                            <Input 
                              placeholder="Search or add supplier" 
                              {...field} 
                              value={field.value || ""} 
                              data-testid="input-supplier"
                              onChange={(e) => {
                                field.onChange(e);
                                setSupplierId(null);
                                setSupplierDropdownOpen(true);
                              }}
                              onFocus={() => setSupplierDropdownOpen(true)}
                            />
                            
                            {/* Supplier suggestions dropdown */}
                            {supplierDropdownOpen && (
                              <div className="absolute top-full left-0 right-0 mt-1 border rounded-md shadow-lg bg-white max-h-72 overflow-y-auto z-50">
                                {filteredSuppliers.length > 0 ? (
                                  filteredSuppliers.map((s) => (
                                    <button
                                      key={s.id}
                                      type="button"
                                      className="w-full px-3 py-2 text-left hover:bg-accent flex items-center"
                                      onClick={() => {
                                        field.onChange(s.name);
                                        setSupplierId(s.id);
                                        setSupplierDropdownOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          supplierId === s.id ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      {s.name}
                                    </button>
                                  ))
                                ) : field.value ? (
                                  <div className="p-2">
                                    <p className="text-sm text-muted-foreground mb-2">No supplier found</p>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setNewSupplier({ ...newSupplier, name: field.value || "" });
                                        setNewSupplierDialogOpen(true);
                                        setSupplierDropdownOpen(false);
                                      }}
                                      className="w-full"
                                      data-testid="button-add-supplier"
                                    >
                                      <UserPlus className="mr-2 h-4 w-4" />
                                      Add new supplier "{field.value}"
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="p-4 text-center text-slate-500">
                                    <div className="text-sm">Start typing to search suppliers</div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="stockQuantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Stock</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" {...field} data-testid="input-stock" />
                        </FormControl>
                        <FormDescription>Units currently in stock</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="minStockLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Min Stock Alert</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" {...field} data-testid="input-min-stock" />
                        </FormControl>
                        <FormDescription>Alert when stock falls below this level</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Additional Details */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Additional Details</h3>
                  <p className="text-sm text-muted-foreground">Description and properties</p>
                </div>
                <Separator />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter material description, specifications, or usage notes..." 
                          rows={4}
                          {...field} 
                          value={field.value || ""}
                          data-testid="textarea-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Image Upload */}
                <div>
                  <FormLabel>Material Image</FormLabel>
                  <FormDescription className="mb-3">Upload a photo for visual reference (max 5MB)</FormDescription>
                  
                  {!imagePreview ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                        id="image-upload"
                        data-testid="input-image-upload"
                      />
                      <label
                        htmlFor="image-upload"
                        className="cursor-pointer flex flex-col items-center gap-2"
                      >
                        <Upload className="h-10 w-10 text-gray-400" />
                        <div className="text-sm text-gray-600">
                          <span className="text-blue-600 font-medium">Click to upload</span> or drag and drop
                        </div>
                        <div className="text-xs text-gray-500">
                          PNG, JPG, WEBP up to 5MB
                        </div>
                      </label>
                    </div>
                  ) : (
                    <div className="relative border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-start gap-4">
                        <img
                          src={imagePreview}
                          alt="Material preview"
                          className="w-32 h-32 object-cover rounded-lg"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {imageFile?.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {imageFile ? `${(imageFile.size / 1024 / 1024).toFixed(2)} MB` : ''}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={removeImage}
                          className="h-8 w-8"
                          data-testid="button-remove-image"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="isReusable"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Reusable Material</FormLabel>
                          <FormDescription>Can be reused multiple times</FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-reusable"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isFragile"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Fragile / Delicate</FormLabel>
                          <FormDescription>Requires careful handling</FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-fragile"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t">
                <Link href="/packing-materials">
                  <Button type="button" variant="outline" data-testid="button-cancel">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={createMutation.isPending || imageUploading} data-testid="button-submit">
                  <Save className="mr-2 h-4 w-4" />
                  {imageUploading ? "Uploading image..." : createMutation.isPending ? "Creating..." : "Create Material"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* New Supplier Dialog */}
      <Dialog open={newSupplierDialogOpen} onOpenChange={setNewSupplierDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New PM Supplier</DialogTitle>
            <DialogDescription>
              Create a new packing material supplier for future use
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Supplier Name *</label>
                <Input
                  value={newSupplier.name}
                  onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                  placeholder="Enter supplier name"
                  data-testid="input-new-supplier-name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Contact Person</label>
                <Input
                  value={newSupplier.contactPerson}
                  onChange={(e) => setNewSupplier({ ...newSupplier, contactPerson: e.target.value })}
                  placeholder="Contact person name"
                  data-testid="input-new-supplier-contact"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={newSupplier.email}
                  onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                  placeholder="supplier@example.com"
                  data-testid="input-new-supplier-email"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone</label>
                <Input
                  value={newSupplier.phone}
                  onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                  placeholder="+1234567890"
                  data-testid="input-new-supplier-phone"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Address</label>
              <Input
                value={newSupplier.address}
                onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                placeholder="Full address"
                data-testid="input-new-supplier-address"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Website</label>
              <Input
                type="url"
                value={newSupplier.website}
                onChange={(e) => setNewSupplier({ ...newSupplier, website: e.target.value })}
                placeholder="https://example.com"
                data-testid="input-new-supplier-website"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={newSupplier.notes}
                onChange={(e) => setNewSupplier({ ...newSupplier, notes: e.target.value })}
                placeholder="Additional notes about this supplier"
                rows={3}
                data-testid="textarea-new-supplier-notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setNewSupplierDialogOpen(false);
                setNewSupplier({
                  name: "",
                  contactPerson: "",
                  email: "",
                  phone: "",
                  address: "",
                  website: "",
                  notes: "",
                });
              }}
              data-testid="button-cancel-supplier"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateSupplier}
              disabled={createSupplierMutation.isPending}
              data-testid="button-save-supplier"
            >
              {createSupplierMutation.isPending ? "Creating..." : "Create Supplier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
