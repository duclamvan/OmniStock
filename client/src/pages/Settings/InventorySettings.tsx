import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Package, Save, Loader2, ClipboardCheck, Warehouse, ShieldCheck, Ruler, Image } from "lucide-react";

const formSchema = z.object({
  // Product Defaults
  low_stock_threshold: z.coerce.number().min(0).default(10),
  default_product_type: z.enum(['regular', 'bundle', 'service']).default('regular'),
  enable_barcode_scanning: z.boolean().default(true),
  default_packaging_requirement: z.enum(['carton', 'outer_carton', 'nylon_wrap']).default('carton'),
  auto_generate_sku: z.boolean().default(false),
  sku_prefix: z.string().default(''),
  track_serial_numbers: z.boolean().default(false),

  // Stock Management
  stock_adjustment_approval_required: z.boolean().default(false),
  allow_negative_stock: z.boolean().default(false),
  auto_reorder_point: z.coerce.number().min(0).default(5),
  safety_stock_level: z.coerce.number().min(0).default(10),
  stock_count_frequency_days: z.coerce.number().min(1).default(30),
  enable_batch_lot_tracking: z.boolean().default(false),
  enable_expiration_date_tracking: z.boolean().default(false),

  // Warehouse Operations
  default_warehouse: z.string().default(''),
  enable_multi_warehouse: z.boolean().default(false),
  auto_assign_warehouse_location: z.boolean().default(false),
  location_format: z.enum(['A-01-01', 'A01-R01-S01', 'Zone-Rack-Bin', 'Custom']).default('A-01-01'),
  enable_bin_management: z.boolean().default(false),
  enable_zone_management: z.boolean().default(false),
  temperature_control_zones: z.boolean().default(false),

  // Product Quality
  enable_quality_control: z.boolean().default(false),
  qc_sampling_rate: z.coerce.number().min(0).max(100).default(10),
  damage_report_required: z.boolean().default(false),
  photo_evidence_required: z.boolean().default(false),
  condition_tracking: z.enum(['good', 'damaged', 'refurbished', 'returned']).default('good'),

  // Measurement Units
  default_length_unit: z.enum(['cm', 'mm', 'm', 'in']).default('cm'),
  default_weight_unit: z.enum(['kg', 'g', 'lb', 'oz']).default('kg'),
  default_volume_unit: z.enum(['L', 'mL', 'gal', 'oz']).default('L'),
  decimal_places_weight: z.coerce.number().min(1).max(4).default(2),
  decimal_places_dimensions: z.coerce.number().min(1).max(4).default(2),

  // Catalog Settings
  enable_product_variants: z.boolean().default(true),
  enable_bundles: z.boolean().default(true),
  enable_services: z.boolean().default(true),
  max_images_per_product: z.coerce.number().min(1).max(20).default(10),
  auto_compress_images: z.boolean().default(true),
  image_quality: z.coerce.number().min(0).max(100).default(80),
});

type FormValues = z.infer<typeof formSchema>;

export default function InventorySettings() {
  const { toast } = useToast();

  const { data: settings = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/settings'],
  });

  const { data: warehouses = [] } = useQuery<any[]>({
    queryKey: ['/api/warehouses'],
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      // Product Defaults
      low_stock_threshold: 10,
      default_product_type: 'regular',
      enable_barcode_scanning: true,
      default_packaging_requirement: 'carton',
      auto_generate_sku: false,
      sku_prefix: '',
      track_serial_numbers: false,

      // Stock Management
      stock_adjustment_approval_required: false,
      allow_negative_stock: false,
      auto_reorder_point: 5,
      safety_stock_level: 10,
      stock_count_frequency_days: 30,
      enable_batch_lot_tracking: false,
      enable_expiration_date_tracking: false,

      // Warehouse Operations
      default_warehouse: '',
      enable_multi_warehouse: false,
      auto_assign_warehouse_location: false,
      location_format: 'A-01-01',
      enable_bin_management: false,
      enable_zone_management: false,
      temperature_control_zones: false,

      // Product Quality
      enable_quality_control: false,
      qc_sampling_rate: 10,
      damage_report_required: false,
      photo_evidence_required: false,
      condition_tracking: 'good',

      // Measurement Units
      default_length_unit: 'cm',
      default_weight_unit: 'kg',
      default_volume_unit: 'L',
      decimal_places_weight: 2,
      decimal_places_dimensions: 2,

      // Catalog Settings
      enable_product_variants: true,
      enable_bundles: true,
      enable_services: true,
      max_images_per_product: 10,
      auto_compress_images: true,
      image_quality: 80,
    },
  });

  useEffect(() => {
    if (settings.length > 0 && !isLoading) {
      const settingsMap = settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, any>);

      const keys = Object.keys(formSchema.shape);
      keys.forEach((key) => {
        if (settingsMap[key] !== undefined) {
          form.setValue(key as keyof FormValues, settingsMap[key], { shouldDirty: false });
        }
      });
    }
  }, [settings, isLoading]);

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const savePromises = Object.entries(values).map(([key, value]) =>
        apiRequest('POST', `/api/settings`, { key, value, category: 'inventory' })
      );
      await Promise.all(savePromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({
        title: "Settings Saved",
        description: "Inventory settings have been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save settings.",
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    saveMutation.mutate(values);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8 sm:py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
        {/* 1. Product Defaults Section */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Package className="h-4 w-4 sm:h-5 sm:w-5" />
              Product Defaults
            </CardTitle>
            <CardDescription className="text-sm">Default settings for product management and creation</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="low_stock_threshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Low Stock Threshold</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        min="0"
                        placeholder="10" 
                        data-testid="input-low_stock_threshold" 
                      />
                    </FormControl>
                    <FormDescription>Alert when stock falls below this number</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="default_product_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Product Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-default_product_type">
                          <SelectValue placeholder="Select product type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="regular">Regular</SelectItem>
                        <SelectItem value="bundle">Bundle</SelectItem>
                        <SelectItem value="service">Service</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>Default type for new products</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="default_packaging_requirement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Packaging Requirement</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-default_packaging_requirement">
                          <SelectValue placeholder="Select packaging type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="carton">Carton</SelectItem>
                        <SelectItem value="outer_carton">Outer Carton</SelectItem>
                        <SelectItem value="nylon_wrap">Nylon Wrap</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>Default packaging for products</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sku_prefix"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU Prefix</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="e.g., PRD-" 
                        data-testid="input-sku_prefix" 
                      />
                    </FormControl>
                    <FormDescription>Prefix for auto-generated SKUs</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-3">
              <FormField
                control={form.control}
                name="enable_barcode_scanning"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-enable_barcode_scanning"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Enable Barcode Scanning</FormLabel>
                      <FormDescription>
                        Enable barcode scanning features throughout the system
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="auto_generate_sku"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-auto_generate_sku"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Auto-generate SKU</FormLabel>
                      <FormDescription>
                        Automatically generate SKU codes for new products
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="track_serial_numbers"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-track_serial_numbers"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Track Serial Numbers</FormLabel>
                      <FormDescription>
                        Enable serial number tracking for products
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* 2. Stock Management Section */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <ClipboardCheck className="h-4 w-4 sm:h-5 sm:w-5" />
              Stock Management
            </CardTitle>
            <CardDescription className="text-sm">Configure stock control and replenishment settings</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="auto_reorder_point"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Auto-reorder Point</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        min="0"
                        placeholder="5" 
                        data-testid="input-auto_reorder_point" 
                      />
                    </FormControl>
                    <FormDescription>Trigger reorder when stock reaches this level</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="safety_stock_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Safety Stock Level</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        min="0"
                        placeholder="10" 
                        data-testid="input-safety_stock_level" 
                      />
                    </FormControl>
                    <FormDescription>Minimum buffer stock to maintain</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="stock_count_frequency_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock Count Frequency (days)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        min="1"
                        placeholder="30" 
                        data-testid="input-stock_count_frequency_days" 
                      />
                    </FormControl>
                    <FormDescription>How often to conduct stock counts</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-3">
              <FormField
                control={form.control}
                name="stock_adjustment_approval_required"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-stock_adjustment_approval_required"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Stock Adjustment Approval Required</FormLabel>
                      <FormDescription>
                        Require manager approval for stock adjustments
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="allow_negative_stock"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-allow_negative_stock"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Allow Negative Stock</FormLabel>
                      <FormDescription>
                        Allow stock to go below zero (backorders)
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="enable_batch_lot_tracking"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-enable_batch_lot_tracking"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Enable Batch/Lot Tracking</FormLabel>
                      <FormDescription>
                        Track products by batch or lot numbers
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="enable_expiration_date_tracking"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-enable_expiration_date_tracking"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Enable Expiration Date Tracking</FormLabel>
                      <FormDescription>
                        Track and alert for product expiration dates
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* 3. Warehouse Operations Section */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Warehouse className="h-4 w-4 sm:h-5 sm:w-5" />
              Warehouse Operations
            </CardTitle>
            <CardDescription className="text-sm">Configure warehouse layout and location management</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="default_warehouse"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Warehouse</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-default_warehouse">
                          <SelectValue placeholder="Select warehouse" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {warehouses.map((warehouse: any) => (
                          <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                            {warehouse.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Default warehouse for new inventory</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location_format"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location Format</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-location_format">
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="A-01-01">A-01-01 (Aisle-Rack-Bin)</SelectItem>
                        <SelectItem value="A01-R01-S01">A01-R01-S01 (Zone-Rack-Shelf)</SelectItem>
                        <SelectItem value="Zone-Rack-Bin">Zone-Rack-Bin (Descriptive)</SelectItem>
                        <SelectItem value="Custom">Custom Format</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>Location naming convention</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-3">
              <FormField
                control={form.control}
                name="enable_multi_warehouse"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-enable_multi_warehouse"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Enable Multi-warehouse</FormLabel>
                      <FormDescription>
                        Support inventory across multiple warehouses
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="auto_assign_warehouse_location"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-auto_assign_warehouse_location"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Auto-assign Warehouse Location</FormLabel>
                      <FormDescription>
                        Automatically assign locations based on available space
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="enable_bin_management"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-enable_bin_management"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Enable Bin Management</FormLabel>
                      <FormDescription>
                        Track inventory at bin/shelf level
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="enable_zone_management"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-enable_zone_management"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Enable Zone Management</FormLabel>
                      <FormDescription>
                        Organize warehouse into zones (picking, storage, etc.)
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="temperature_control_zones"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-temperature_control_zones"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Temperature Control Zones</FormLabel>
                      <FormDescription>
                        Enable temperature-controlled storage zones
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* 4. Product Quality Section */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />
              Product Quality
            </CardTitle>
            <CardDescription className="text-sm">Quality control and condition tracking settings</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="qc_sampling_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>QC Sampling Rate (%)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        min="0"
                        max="100"
                        placeholder="10" 
                        data-testid="input-qc_sampling_rate" 
                      />
                    </FormControl>
                    <FormDescription>Percentage of items to inspect</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="condition_tracking"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Condition Tracking</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-condition_tracking">
                          <SelectValue placeholder="Select condition" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="good">Good</SelectItem>
                        <SelectItem value="damaged">Damaged</SelectItem>
                        <SelectItem value="refurbished">Refurbished</SelectItem>
                        <SelectItem value="returned">Returned</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>Default condition for new items</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-3">
              <FormField
                control={form.control}
                name="enable_quality_control"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-enable_quality_control"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Enable Quality Control</FormLabel>
                      <FormDescription>
                        Enable QC inspections for incoming and outgoing products
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="damage_report_required"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-damage_report_required"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Damage Report Required</FormLabel>
                      <FormDescription>
                        Require damage reports for defective items
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="photo_evidence_required"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-photo_evidence_required"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Photo Evidence Required</FormLabel>
                      <FormDescription>
                        Require photo documentation for quality issues
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* 5. Measurement Units Section */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Ruler className="h-4 w-4 sm:h-5 sm:w-5" />
              Measurement Units
            </CardTitle>
            <CardDescription className="text-sm">Default units and precision for measurements</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="default_length_unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Length Unit</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-default_length_unit">
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cm">Centimeters (cm)</SelectItem>
                        <SelectItem value="mm">Millimeters (mm)</SelectItem>
                        <SelectItem value="m">Meters (m)</SelectItem>
                        <SelectItem value="in">Inches (in)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>Default unit for dimensions</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="default_weight_unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Weight Unit</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-default_weight_unit">
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="kg">Kilograms (kg)</SelectItem>
                        <SelectItem value="g">Grams (g)</SelectItem>
                        <SelectItem value="lb">Pounds (lb)</SelectItem>
                        <SelectItem value="oz">Ounces (oz)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>Default unit for weight</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="default_volume_unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Volume Unit</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-default_volume_unit">
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="L">Liters (L)</SelectItem>
                        <SelectItem value="mL">Milliliters (mL)</SelectItem>
                        <SelectItem value="gal">Gallons (gal)</SelectItem>
                        <SelectItem value="oz">Fluid Ounces (oz)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>Default unit for volume</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="decimal_places_weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Decimal Places for Weight</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        min="1"
                        max="4"
                        placeholder="2" 
                        data-testid="input-decimal_places_weight" 
                      />
                    </FormControl>
                    <FormDescription>Precision for weight (1-4 decimals)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="decimal_places_dimensions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Decimal Places for Dimensions</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        min="1"
                        max="4"
                        placeholder="2" 
                        data-testid="input-decimal_places_dimensions" 
                      />
                    </FormControl>
                    <FormDescription>Precision for dimensions (1-4 decimals)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* 6. Catalog Settings Section */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Image className="h-4 w-4 sm:h-5 sm:w-5" />
              Catalog Settings
            </CardTitle>
            <CardDescription className="text-sm">Product catalog and image management settings</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="max_images_per_product"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Images per Product</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        min="1"
                        max="20"
                        placeholder="10" 
                        data-testid="input-max_images_per_product" 
                      />
                    </FormControl>
                    <FormDescription>Maximum number of images allowed</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="image_quality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image Quality (%) - {field.value}%</FormLabel>
                    <FormControl>
                      <Slider
                        min={0}
                        max={100}
                        step={5}
                        value={[field.value]}
                        onValueChange={(vals) => field.onChange(vals[0])}
                        className="w-full"
                        data-testid="slider-image_quality"
                      />
                    </FormControl>
                    <FormDescription>Compression quality for images (higher = better quality)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-3">
              <FormField
                control={form.control}
                name="enable_product_variants"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-enable_product_variants"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Enable Product Variants</FormLabel>
                      <FormDescription>
                        Allow products with multiple variants (size, color, etc.)
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="enable_bundles"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-enable_bundles"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Enable Bundles</FormLabel>
                      <FormDescription>
                        Allow creation of product bundles and kits
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="enable_services"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-enable_services"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Enable Services</FormLabel>
                      <FormDescription>
                        Allow service products (non-physical items)
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="auto_compress_images"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-auto_compress_images"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Auto-compress Images</FormLabel>
                      <FormDescription>
                        Automatically compress uploaded images to save space
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saveMutation.isPending} className="w-full sm:w-auto" data-testid="button-save">
            {saveMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
