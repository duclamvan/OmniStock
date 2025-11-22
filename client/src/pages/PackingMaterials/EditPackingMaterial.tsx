import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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

// Helper function to format supplier name from URL
function formatSupplierName(url: string): string {
  if (!url) return "";
  
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    const domain = urlObj.hostname.replace('www.', '');
    
    // Split by dots and hyphens, capitalize first letter of each part
    return domain.split(/[.-]/).map(part => 
      part.charAt(0).toUpperCase() + part.slice(1)
    ).join('-').replace(/-([a-z]{2,3})$/i, '.$1'); // Keep extension with dot
  } catch {
    return url;
  }
}

const createFormSchema = (t: (key: string) => string) => z.object({
  name: z.string().min(1, t("nameIsRequired")),
  code: z.string().min(1, t("codeIsRequired")),
  category: z.string().min(1, t("categoryIsRequired")),
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

type FormData = z.infer<ReturnType<typeof createFormSchema>>;

export default function EditPackingMaterial() {
  const { t } = useTranslation('warehouse');
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageUploading, setImageUploading] = useState(false);

  const formSchema = createFormSchema(t);

  // Material Categories with icons
  const MATERIAL_CATEGORIES = [
    { value: "cartons", label: t("categoryCartons"), icon: Box },
    { value: "filling", label: t("categoryFilling"), icon: Layers },
    { value: "protective", label: t("categoryProtective"), icon: Shield },
    { value: "supplies", label: t("categorySupplies"), icon: Package },
    { value: "packaging", label: t("categoryPackaging"), icon: FlaskConical },
  ];

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
        title: t('invalidFile'),
        description: t('pleaseSelectImageFile'),
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t('fileTooLarge'),
        description: t('pleaseSelectImageSmaller'),
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
            title: t('imageUploadFailed'),
            description: t('materialUpdatedWithoutImage'),
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
        title: t('success'),
        description: t('packingMaterialUpdatedSuccess'),
      });
      navigate("/packing-materials");
    },
    onError: (error: Error) => {
      toast({
        title: t('error'),
        description: error.message || t('failedToUpdatePackingMaterial'),
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
        <Button variant="ghost" size="sm" data-testid="button-back" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('backToPackingMaterials')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('editPackingMaterial')}</CardTitle>
          <CardDescription>
            {t('updateMaterialsInventory')}
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
                    {t('materialClassification')}
                  </h3>
                  <p className="text-sm text-muted-foreground">{t('selectCategoryOfPackingMaterial')}</p>
                </div>
                <Separator />
                
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('category')} *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder={t('selectCategory')} />
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
                    {t('basicInformation')}
                  </h3>
                  <p className="text-sm text-muted-foreground">{t('materialIdentificationNaming')}</p>
                </div>
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('materialNameLabel')} *</FormLabel>
                        <FormControl>
                          <Input placeholder={t('materialNamePlaceholder')} {...field} data-testid="input-name" />
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
                        <FormLabel>{t('materialCodeLabel')} *</FormLabel>
                        <FormControl>
                          <Input placeholder={t('materialCodePlaceholder')} {...field} data-testid="input-code" />
                        </FormControl>
                        <FormDescription>{t('materialCodeDescription')}</FormDescription>
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
                    {t('dimensionsSpecifications')}
                  </h3>
                  <p className="text-sm text-muted-foreground">{t('physicalMeasurementsWeight')}</p>
                </div>
                <Separator />
                
                <div className="space-y-4">
                  {/* Dimensions */}
                  <div>
                    <FormLabel className="text-base mb-3 block">{t('dimensions')}</FormLabel>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <FormField
                        control={form.control}
                        name="length"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">{t('length')}</FormLabel>
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
                            <FormLabel className="text-xs text-muted-foreground">{t('width')}</FormLabel>
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
                            <FormLabel className="text-xs text-muted-foreground">{t('height')}</FormLabel>
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
                            <FormLabel className="text-xs text-muted-foreground">{t('unit')}</FormLabel>
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
                    <FormLabel className="text-base mb-3 block">{t('weight')}</FormLabel>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="col-span-1 md:col-span-1">
                        <FormField
                          control={form.control}
                          name="weightValue"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs text-muted-foreground">{t('value')}</FormLabel>
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
                              <FormLabel className="text-xs text-muted-foreground">{t('unit')}</FormLabel>
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
                    {t('costInventory')}
                  </h3>
                  <p className="text-sm text-muted-foreground">{t('pricingStockManagement')}</p>
                </div>
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="cost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('unitCost')}</FormLabel>
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
                        <FormLabel>{t('currency')}</FormLabel>
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="stockQuantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('currentStock')}</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" {...field} data-testid="input-stock" />
                        </FormControl>
                        <FormDescription>{t('currentStockDescription')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="minStockLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('minStockAlert')}</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" {...field} data-testid="input-min-stock" />
                        </FormControl>
                        <FormDescription>{t('minStockAlertDescription')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Supplier Information */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    {t('supplierInformation')}
                  </h3>
                  <p className="text-sm text-muted-foreground">{t('supplierDetailsPurchaseLink')}</p>
                </div>
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="supplier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('purchaseLink')}</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder={t('purchaseLinkPlaceholder')} 
                            {...field} 
                            value={field.value || ""} 
                            data-testid="input-supplier"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormItem>
                    <FormLabel>{t('supplierName')}</FormLabel>
                    <FormControl>
                      <Input 
                        value={formatSupplierName(form.watch('supplier') || '')}
                        readOnly
                        className="bg-muted"
                        placeholder={t('supplierNamePlaceholder')}
                        data-testid="input-supplier-name"
                      />
                    </FormControl>
                  </FormItem>
                </div>
              </div>

              {/* Additional Details */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                    {t('materialProperties')}
                  </h3>
                  <p className="text-sm text-muted-foreground">{t('materialCharacteristics')}</p>
                </div>
                <Separator />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('description')}</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder={t('descriptionPlaceholder')} 
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
                  <FormLabel>{t('imageUpload')}</FormLabel>
                  <FormDescription className="mb-3">{t('uploadMaterialPhoto')} ({t('supportedFormats')})</FormDescription>
                  
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
                        <p className="text-sm text-gray-600">{t('clickOrDragImage')}</p>
                        <p className="text-xs text-gray-500 mt-1">{t('supportedFormats')}</p>
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
                          <FormLabel className="text-base">{t('fragile')}</FormLabel>
                          <FormDescription>
                            {t('fragileDescription')}
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
                          <FormLabel className="text-base">{t('reusable')}</FormLabel>
                          <FormDescription>
                            {t('reusableDescription')}
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
                          <FormLabel className="text-base">{t('active')}</FormLabel>
                          <FormDescription>
                            {t('activeDescription')}
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
                    {t('cancel')}
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
                      {imageUploading ? t('imageUploadSuccess') + '...' : t('saveMaterial') + '...'}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {t('saveMaterial')}
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
