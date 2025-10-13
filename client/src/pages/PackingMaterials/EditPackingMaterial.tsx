import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useState, useEffect } from "react";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save, Box, Layers, Shield, Package, Upload, X, FlaskConical, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Separator } from "@/components/ui/separator";
import { compressImage } from "@/lib/imageCompression";
import type { PackingMaterial } from "@shared/schema";

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

export default function EditPackingMaterial() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageUploading, setImageUploading] = useState(false);

  const { data: material, isLoading } = useQuery<PackingMaterial>({
    queryKey: [`/api/packing-materials/${id}`],
    enabled: !!id,
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

  // Parse and populate form when material data loads
  useEffect(() => {
    if (material) {
      // Parse dimensions
      let parsedLength = "";
      let parsedWidth = "";
      let parsedHeight = "";
      let parsedDimensionUnit = "cm";
      
      if (material.dimensions) {
        const dimMatch = material.dimensions.match(/^([\d.]+)×([\d.]+)×([\d.]+)\s*(\w+)$/);
        if (dimMatch) {
          parsedLength = dimMatch[1];
          parsedWidth = dimMatch[2];
          parsedHeight = dimMatch[3];
          parsedDimensionUnit = dimMatch[4];
        }
      }

      // Parse weight
      let parsedWeightValue = "";
      let parsedWeightUnit = "kg";
      
      if (material.weight) {
        const weightMatch = material.weight.match(/^([\d.]+)\s*(\w+)$/);
        if (weightMatch) {
          parsedWeightValue = weightMatch[1];
          parsedWeightUnit = weightMatch[2];
        }
      }

      // Set image preview if exists
      if (material.imageUrl) {
        setImagePreview(material.imageUrl);
      }

      form.reset({
        name: material.name || "",
        code: material.code || "",
        category: material.category || "",
        size: material.size || "",
        length: parsedLength,
        width: parsedWidth,
        height: parsedHeight,
        dimensionUnit: parsedDimensionUnit,
        weightValue: parsedWeightValue,
        weightUnit: parsedWeightUnit,
        dimensions: material.dimensions || "",
        weight: material.weight || "",
        stockQuantity: material.stockQuantity || 0,
        minStockLevel: material.minStockLevel || 10,
        cost: material.cost || "",
        currency: material.currency || "EUR",
        supplier: material.supplier || "",
        imageUrl: material.imageUrl || "",
        description: material.description || "",
        isFragile: material.isFragile || false,
        isReusable: material.isReusable || false,
        isActive: material.isActive ?? true,
      });
    }
  }, [material, form]);

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

  const updateMutation = useMutation({
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
            description: "The material will be updated without changing the image",
            variant: "destructive",
          });
        } finally {
          setImageUploading(false);
        }
      }

      return apiRequest("PATCH", `/api/packing-materials/${id}`, processedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packing-materials"] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-materials/${id}`] });
      toast({
        title: "Success",
        description: "Packing material updated successfully",
      });
      navigate("/packing-materials");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update packing material",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 max-w-5xl">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

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
          <CardTitle>Edit Packing Material</CardTitle>
          <CardDescription>
            Update packing material information in your warehouse inventory
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              {/* Material Classification */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Material Classification
                  </h3>
                  <p className="text-sm text-muted-foreground">Select the category of packing material</p>
                </div>
                <Separator />
                
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
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
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    Basic Information
                  </h3>
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
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                    Dimensions & Specifications
                  </h3>
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
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Cost & Inventory
                  </h3>
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
                        <FormLabel>Supplier Link</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://top-obaly.cz" 
                            {...field} 
                            value={field.value || ""} 
                            data-testid="input-supplier"
                          />
                        </FormControl>
                        <FormDescription>Enter the supplier's website URL to quickly reorder this material</FormDescription>
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
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                    Additional Details
                  </h3>
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
                      />
                      <label htmlFor="image-upload" className="cursor-pointer">
                        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                        <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 5MB</p>
                      </label>
                    </div>
                  ) : (
                    <div className="relative border rounded-lg p-4 bg-gray-50">
                      <div className="flex flex-col sm:flex-row items-start gap-4">
                        <div className="w-full sm:w-48 h-48 bg-white rounded-lg flex items-center justify-center overflow-hidden border">
                          <img
                            src={imagePreview}
                            alt="Material preview"
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                        <div className="flex-1 min-w-0 flex items-start justify-between w-full sm:w-auto">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {imageFile?.name || 'Current image'}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {imageFile ? `${(imageFile.size / 1024 / 1024).toFixed(2)} MB` : 'Uploaded'}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={removeImage}
                            className="h-8 w-8 ml-2"
                            data-testid="button-remove-image"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="isFragile"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Fragile Protection</FormLabel>
                          <FormDescription>
                            For fragile items
                          </FormDescription>
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

                  <FormField
                    control={form.control}
                    name="isReusable"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Reusable</FormLabel>
                          <FormDescription>
                            Can be reused
                          </FormDescription>
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
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Active</FormLabel>
                          <FormDescription>
                            Available for use
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-active"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <Link href="/packing-materials">
                  <Button type="button" variant="outline" data-testid="button-cancel">
                    Cancel
                  </Button>
                </Link>
                <Button 
                  type="submit" 
                  disabled={updateMutation.isPending || imageUploading}
                  data-testid="button-save"
                >
                  {updateMutation.isPending || imageUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {imageUploading ? "Uploading..." : "Updating..."}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Update Material
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
