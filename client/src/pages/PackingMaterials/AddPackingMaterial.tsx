import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, Save, Box, Layers, Shield, Package, Upload, X, FlaskConical, ChevronDown, ChevronUp, Link2, Check, AlertCircle, Plus, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Separator } from "@/components/ui/separator";
import { compressImage } from "@/lib/imageCompression";
import { Badge } from "@/components/ui/badge";

function formatSupplierName(url: string): string {
  if (!url) return "";
  
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    const domain = urlObj.hostname.replace('www.', '');
    
    return domain.split(/[.-]/).map(part => 
      part.charAt(0).toUpperCase() + part.slice(1)
    ).join('-').replace(/-([a-z]{2,3})$/i, '.$1');
  } catch {
    return url;
  }
}

function isValidUrl(url: string): boolean {
  if (!url) return true;
  try {
    new URL(url.startsWith('http') ? url : `https://${url}`);
    return true;
  } catch {
    return false;
  }
}

function generateCartonCode(length: string, width: string, height: string): string {
  if (!length || !width || !height) return '';
  return `CART-${length}x${width}x${height}`;
}

const CARTON_PRESETS = [
  { id: 'small', label: 'cartonPresetSmall', length: '30', width: '20', height: '15' },
  { id: 'medium', label: 'cartonPresetMedium', length: '40', width: '30', height: '25' },
  { id: 'large', label: 'cartonPresetLarge', length: '60', width: '40', height: '40' },
  { id: 'xlarge', label: 'cartonPresetExtraLarge', length: '80', width: '60', height: '50' },
  { id: 'flat', label: 'cartonPresetFlat', length: '50', width: '40', height: '10' },
];

const createFormSchema = (t: (key: string) => string) => z.object({
  name: z.string().min(1, t("nameIsRequired")),
  code: z.string().min(1, t("codeIsRequired")),
  category: z.string().min(1, t("categoryIsRequired")),
  size: z.string().optional(),
  length: z.string().optional(),
  width: z.string().optional(),
  height: z.string().optional(),
  dimensionUnit: z.string().default("cm"),
  weightValue: z.string().optional(),
  weightUnit: z.string().default("kg"),
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

export default function AddPackingMaterial() {
  const { t } = useTranslation('warehouse');
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageUploading, setImageUploading] = useState(false);
  
  const [openSections, setOpenSections] = useState({
    classification: true,
    basic: true,
    dimensions: true,
    cost: true,
    supplier: true,
    properties: true,
  });

  const formSchema = createFormSchema(t);

  const MATERIAL_CATEGORIES = [
    { value: "cartons", label: t("categoryCartons"), icon: Box },
    { value: "filling", label: t("categoryFilling"), icon: Layers },
    { value: "protective", label: t("categoryProtective"), icon: Shield },
    { value: "supplies", label: t("categorySupplies"), icon: Package },
    { value: "packaging", label: t("categoryPackaging"), icon: FlaskConical },
  ];

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

  const watchCategory = form.watch("category");
  const watchLength = form.watch("length");
  const watchWidth = form.watch("width");
  const watchHeight = form.watch("height");
  const watchSupplier = form.watch("supplier");

  const isCartonCategory = watchCategory === "cartons";
  const supplierUrlValid = isValidUrl(watchSupplier || '');
  
  const suggestedCode = useMemo(() => {
    if (isCartonCategory && watchLength && watchWidth && watchHeight) {
      return generateCartonCode(watchLength, watchWidth, watchHeight);
    }
    return '';
  }, [isCartonCategory, watchLength, watchWidth, watchHeight]);

  const applyCartonPreset = (preset: typeof CARTON_PRESETS[0]) => {
    form.setValue("length", preset.length);
    form.setValue("width", preset.width);
    form.setValue("height", preset.height);
    form.setValue("dimensionUnit", "cm");
  };

  const applySuggestedCode = () => {
    if (suggestedCode) {
      form.setValue("code", suggestedCode);
    }
  };

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: t('invalidFile'),
        description: t('pleaseSelectImageFile'),
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t('fileTooLarge'),
        description: t('pleaseSelectImageSmaller'),
        variant: "destructive",
      });
      return;
    }

    setImageFile(file);
    
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

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const processedData = { ...data };
      if (data.length || data.width || data.height) {
        const dims = [data.length, data.width, data.height].filter(Boolean);
        processedData.dimensions = dims.length > 0 ? `${dims.join('×')} ${data.dimensionUnit}` : '';
      }
      if (data.weightValue) {
        processedData.weight = `${data.weightValue} ${data.weightUnit}`;
      }

      if (imageFile) {
        setImageUploading(true);
        try {
          const compressed = await compressImage(imageFile, {
            maxWidth: 1920,
            maxHeight: 1920,
            quality: 0.8,
            format: 'jpeg'
          });

          const base64Response = await fetch(compressed);
          const blob = await base64Response.blob();
          
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
            description: t('materialWillBeCreatedWithoutImage'),
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
        title: t('success'),
        description: t('packingMaterialCreatedSuccess'),
      });
      navigate("/packing-materials");
    },
    onError: (error: Error) => {
      toast({
        title: t('error'),
        description: error.message || t('failedToCreatePackingMaterial'),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createMutation.mutate(data);
  };

  const handleAddAnother = () => {
    const currentSupplier = form.getValues("supplier");
    const currentCurrency = form.getValues("currency");
    
    form.reset({
      name: "",
      code: "",
      category: "cartons",
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
      currency: currentCurrency,
      supplier: currentSupplier,
      imageUrl: "",
      description: "",
      isFragile: false,
      isReusable: false,
      isActive: true,
    });
    
    setImageFile(null);
    setImagePreview("");
    
    toast({
      title: t('success'),
      description: t('addAnotherCartonDesc'),
    });
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const SectionHeader = ({ 
    title, 
    description, 
    colorClass, 
    sectionKey, 
    icon: Icon 
  }: { 
    title: string; 
    description: string; 
    colorClass: string; 
    sectionKey: keyof typeof openSections;
    icon?: React.ElementType;
  }) => (
    <CollapsibleTrigger asChild>
      <button 
        type="button"
        onClick={() => toggleSection(sectionKey)}
        className="flex items-center justify-between w-full py-2 text-left hover:bg-muted/50 rounded-lg transition-colors -mx-2 px-2"
      >
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${colorClass}`}></span>
          {Icon && <Icon className="h-4 w-4 text-muted-foreground md:hidden" />}
          <div>
            <h3 className="text-base md:text-lg font-semibold">{title}</h3>
            <p className="text-xs md:text-sm text-muted-foreground hidden md:block">{description}</p>
          </div>
        </div>
        {openSections[sectionKey] ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        )}
      </button>
    </CollapsibleTrigger>
  );

  return (
    <div className="container mx-auto py-3 md:py-6 px-2 md:px-4 max-w-5xl pb-24 md:pb-6">
      <div className="mb-4 md:mb-6">
        <Button variant="ghost" size="sm" data-testid="button-back" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">{t('backToPackingMaterials')}</span>
          <span className="sm:hidden">{t('cancel')}</span>
        </Button>
      </div>

      <Card className="border-0 md:border shadow-none md:shadow-sm">
        <CardHeader className="px-3 md:px-6 py-3 md:py-6">
          <CardTitle className="text-xl md:text-2xl">{t('addPackingMaterial')}</CardTitle>
          <CardDescription className="text-sm">
            {t('manageMaterialsInventory')}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-3 md:px-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
              
              {/* Material Classification */}
              <Collapsible open={openSections.classification} onOpenChange={() => toggleSection('classification')}>
                <SectionHeader 
                  title={t('materialClassification')} 
                  description={t('selectCategoryOfPackingMaterial')}
                  colorClass="bg-blue-500"
                  sectionKey="classification"
                  icon={Box}
                />
                <CollapsibleContent>
                  <Separator className="my-3" />
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">{t('category')} *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-11" data-testid="select-category">
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
                </CollapsibleContent>
              </Collapsible>

              {/* Basic Information */}
              <Collapsible open={openSections.basic} onOpenChange={() => toggleSection('basic')}>
                <SectionHeader 
                  title={t('basicInformation')} 
                  description={t('materialIdentificationNaming')}
                  colorClass="bg-green-500"
                  sectionKey="basic"
                />
                <CollapsibleContent>
                  <Separator className="my-3" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">{t('materialNameLabel')} *</FormLabel>
                          <FormControl>
                            <Input 
                              className="h-11" 
                              placeholder={t('materialNamePlaceholder')} 
                              {...field} 
                              data-testid="input-name" 
                            />
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
                          <FormLabel className="text-sm">{t('materialCodeLabel')} *</FormLabel>
                          <FormControl>
                            <div className="space-y-2">
                              <Input 
                                className="h-11" 
                                placeholder={t('materialCodePlaceholder')} 
                                {...field} 
                                data-testid="input-code" 
                              />
                              {isCartonCategory && suggestedCode && field.value !== suggestedCode && (
                                <div className="flex items-center gap-2 text-xs">
                                  <Sparkles className="h-3 w-3 text-amber-500" />
                                  <span className="text-muted-foreground">{t('suggestedCode')}:</span>
                                  <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80" onClick={applySuggestedCode}>
                                    {suggestedCode}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </FormControl>
                          <FormDescription className="text-xs">{t('materialCodeDescription')}</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Dimensions & Specifications */}
              <Collapsible open={openSections.dimensions} onOpenChange={() => toggleSection('dimensions')}>
                <SectionHeader 
                  title={t('dimensionsSpecifications')} 
                  description={t('physicalMeasurementsWeight')}
                  colorClass="bg-purple-500"
                  sectionKey="dimensions"
                />
                <CollapsibleContent>
                  <Separator className="my-3" />
                  <div className="space-y-4">
                    {/* Carton Presets - Only show for cartons category */}
                    {isCartonCategory && (
                      <div className="bg-muted/50 rounded-lg p-3 md:p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Box className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">{t('cartonSizePresets')}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {CARTON_PRESETS.map((preset) => (
                            <Button
                              key={preset.id}
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-9 text-xs md:text-sm"
                              onClick={() => applyCartonPreset(preset)}
                              data-testid={`preset-${preset.id}`}
                            >
                              {t(preset.label)}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Dimensions */}
                    <div>
                      <FormLabel className="text-sm mb-2 block">{t('dimensions')}</FormLabel>
                      <div className="grid grid-cols-4 gap-2">
                        <FormField
                          control={form.control}
                          name="length"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs text-muted-foreground">{t('length')}</FormLabel>
                              <FormControl>
                                <Input 
                                  className="h-11 text-center" 
                                  placeholder="0" 
                                  inputMode="decimal"
                                  {...field} 
                                  value={field.value || ""} 
                                  data-testid="input-length" 
                                />
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
                                <Input 
                                  className="h-11 text-center" 
                                  placeholder="0" 
                                  inputMode="decimal"
                                  {...field} 
                                  value={field.value || ""} 
                                  data-testid="input-width" 
                                />
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
                                <Input 
                                  className="h-11 text-center" 
                                  placeholder="0" 
                                  inputMode="decimal"
                                  {...field} 
                                  value={field.value || ""} 
                                  data-testid="input-height" 
                                />
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
                                  <SelectTrigger className="h-11" data-testid="select-dimension-unit">
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
                      <FormLabel className="text-sm mb-2 block">{t('weight')}</FormLabel>
                      <div className="grid grid-cols-2 gap-2">
                        <FormField
                          control={form.control}
                          name="weightValue"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs text-muted-foreground">{t('value')}</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.001" 
                                  className="h-11" 
                                  placeholder="0.0" 
                                  inputMode="decimal"
                                  {...field} 
                                  value={field.value || ""} 
                                  data-testid="input-weight-value" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="weightUnit"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs text-muted-foreground">{t('unit')}</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-11" data-testid="select-weight-unit">
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
                </CollapsibleContent>
              </Collapsible>

              {/* Cost & Inventory */}
              <Collapsible open={openSections.cost} onOpenChange={() => toggleSection('cost')}>
                <SectionHeader 
                  title={t('costInventory')} 
                  description={t('pricingStockManagement')}
                  colorClass="bg-amber-500"
                  sectionKey="cost"
                />
                <CollapsibleContent>
                  <Separator className="my-3" />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="cost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">{t('unitCost')}</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              className="h-11" 
                              placeholder="0.00" 
                              inputMode="decimal"
                              {...field} 
                              data-testid="input-cost" 
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
                          <FormLabel className="text-sm">{t('currency')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-11" data-testid="select-currency">
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
                      name="stockQuantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">{t('currentStock')}</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              className="h-11" 
                              inputMode="numeric"
                              {...field} 
                              data-testid="input-stock" 
                            />
                          </FormControl>
                          <FormDescription className="text-xs hidden md:block">{t('currentStockDescription')}</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="minStockLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">{t('minStockAlert')}</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              className="h-11" 
                              inputMode="numeric"
                              {...field} 
                              data-testid="input-min-stock" 
                            />
                          </FormControl>
                          <FormDescription className="text-xs hidden md:block">{t('minStockAlertDescription')}</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Supplier Information */}
              <Collapsible open={openSections.supplier} onOpenChange={() => toggleSection('supplier')}>
                <SectionHeader 
                  title={t('supplierInformation')} 
                  description={t('supplierDetailsPurchaseLink')}
                  colorClass="bg-indigo-500"
                  sectionKey="supplier"
                />
                <CollapsibleContent>
                  <Separator className="my-3" />
                  <div className="space-y-3">
                    <FormField
                      control={form.control}
                      name="supplier"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm flex items-center gap-2">
                            <Link2 className="h-4 w-4" />
                            {t('purchaseLink')}
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                className="h-11 pr-10" 
                                placeholder={t('purchaseLinkPlaceholder')} 
                                {...field} 
                                value={field.value || ""} 
                                data-testid="input-supplier"
                              />
                              {field.value && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                  {supplierUrlValid ? (
                                    <Check className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <AlertCircle className="h-4 w-4 text-destructive" />
                                  )}
                                </div>
                              )}
                            </div>
                          </FormControl>
                          {field.value && !supplierUrlValid && (
                            <p className="text-xs text-destructive">{t('invalidUrl')}</p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormItem>
                      <FormLabel className="text-sm">{t('supplierName')}</FormLabel>
                      <FormControl>
                        <Input 
                          className="h-11 bg-muted"
                          value={formatSupplierName(watchSupplier || '')}
                          readOnly
                          placeholder={t('supplierNamePlaceholder')}
                          data-testid="input-supplier-name"
                        />
                      </FormControl>
                    </FormItem>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Material Properties */}
              <Collapsible open={openSections.properties} onOpenChange={() => toggleSection('properties')}>
                <SectionHeader 
                  title={t('materialProperties')} 
                  description={t('materialCharacteristics')}
                  colorClass="bg-slate-500"
                  sectionKey="properties"
                />
                <CollapsibleContent>
                  <Separator className="my-3" />
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">{t('description')}</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder={t('descriptionPlaceholder')} 
                              rows={3}
                              className="resize-none"
                              {...field} 
                              value={field.value || ""}
                              data-testid="textarea-description"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Image Upload - Compact on mobile */}
                    <div>
                      <FormLabel className="text-sm">{t('imageUpload')}</FormLabel>
                      <FormDescription className="text-xs mb-2">{t('uploadMaterialPhoto')}</FormDescription>
                      
                      {!imagePreview ? (
                        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 md:p-6 text-center hover:border-muted-foreground/50 transition-colors">
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
                            <Upload className="h-8 w-8 md:h-10 md:w-10 text-muted-foreground/50" />
                            <div className="text-sm text-muted-foreground">
                              {t('clickOrDragImage')}
                            </div>
                            <div className="text-xs text-muted-foreground/70">
                              {t('supportedFormats')}
                            </div>
                          </label>
                        </div>
                      ) : (
                        <div className="relative border rounded-lg p-3 bg-muted/50">
                          <div className="flex items-start gap-3">
                            <div className="w-20 h-20 md:w-32 md:h-32 bg-background rounded-lg flex items-center justify-center overflow-hidden border shrink-0">
                              <img
                                src={imagePreview}
                                alt="Material preview"
                                className="max-w-full max-h-full object-contain"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {imageFile?.name}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {imageFile ? `${(imageFile.size / 1024 / 1024).toFixed(2)} MB` : ''}
                              </p>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={removeImage}
                                className="mt-2 h-8 text-destructive hover:text-destructive"
                                data-testid="button-remove-image"
                              >
                                <X className="h-4 w-4 mr-1" />
                                {t('removeImage')}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Switches - 2 column grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="isReusable"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 md:p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-sm font-medium">{t('reusable')}</FormLabel>
                              <FormDescription className="text-xs">{t('reusableDescription')}</FormDescription>
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
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 md:p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-sm font-medium">{t('fragile')}</FormLabel>
                              <FormDescription className="text-xs">{t('fragileDescription')}</FormDescription>
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
                </CollapsibleContent>
              </Collapsible>

              {/* Action Buttons - Desktop */}
              <div className="hidden md:flex justify-end gap-3 pt-6 border-t">
                <Link href="/packing-materials">
                  <Button type="button" variant="outline" data-testid="button-cancel">
                    {t('cancel')}
                  </Button>
                </Link>
                {isCartonCategory && (
                  <Button 
                    type="button" 
                    variant="secondary"
                    onClick={handleAddAnother}
                    data-testid="button-add-another"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {t('addAnotherCarton')}
                  </Button>
                )}
                <Button type="submit" disabled={createMutation.isPending || imageUploading} data-testid="button-submit">
                  <Save className="mr-2 h-4 w-4" />
                  {imageUploading ? t('imageUploadSuccess') + '...' : createMutation.isPending ? t('addMaterial') + '...' : t('addMaterial')}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Sticky Submit Button - Mobile Only */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-background border-t md:hidden z-50">
        <div className="flex gap-2 max-w-5xl mx-auto">
          {isCartonCategory && (
            <Button 
              type="button" 
              variant="outline"
              className="h-12 flex-1"
              onClick={handleAddAnother}
              data-testid="button-add-another-mobile"
            >
              <Plus className="mr-1 h-4 w-4" />
              {t('addAnotherCarton')}
            </Button>
          )}
          <Button 
            type="submit" 
            className={`h-12 ${isCartonCategory ? 'flex-1' : 'w-full'}`}
            disabled={createMutation.isPending || imageUploading} 
            onClick={form.handleSubmit(onSubmit)}
            data-testid="button-submit-mobile"
          >
            <Save className="mr-2 h-4 w-4" />
            {imageUploading ? t('imageUploadSuccess') + '...' : createMutation.isPending ? t('addMaterial') + '...' : t('addMaterial')}
          </Button>
        </div>
      </div>
    </div>
  );
}
