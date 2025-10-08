import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save, Package, Box, Layers, Wrench, PaletteIcon as Pallet, Shield } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  category: z.string().min(1, "Category is required"),
  type: z.string().min(1, "Type is required"),
  size: z.string().optional(),
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

// Material Categories for nail salon B2B warehouse
const MATERIAL_CATEGORIES = [
  { value: "cartons", label: "Cartons & Boxes", icon: Box },
  { value: "filling", label: "Filling Materials", icon: Layers },
  { value: "pallets", label: "Pallets & Platforms", icon: Pallet },
  { value: "protective", label: "Protective Materials", icon: Shield },
  { value: "tools", label: "Packing Tools", icon: Wrench },
  { value: "supplies", label: "General Supplies", icon: Package },
];

// Type options for each category
const CATEGORY_TYPES: Record<string, { value: string; label: string }[]> = {
  cartons: [
    { value: "small_carton", label: "Small Carton (20x15x10 cm)" },
    { value: "medium_carton", label: "Medium Carton (30x25x20 cm)" },
    { value: "large_carton", label: "Large Carton (40x35x30 cm)" },
    { value: "xlarge_carton", label: "Extra Large Carton (50x40x40 cm)" },
    { value: "display_box", label: "Display Box" },
    { value: "mailer_box", label: "Mailer Box" },
    { value: "shipping_carton", label: "Shipping Carton" },
    { value: "gift_box", label: "Gift Box" },
  ],
  filling: [
    { value: "bubble_wrap", label: "Bubble Wrap" },
    { value: "foam_sheets", label: "Foam Sheets" },
    { value: "air_pillows", label: "Air Pillows" },
    { value: "packing_peanuts", label: "Packing Peanuts" },
    { value: "paper_fill", label: "Paper Fill" },
    { value: "shredded_paper", label: "Shredded Paper" },
    { value: "foam_corners", label: "Foam Corner Protectors" },
    { value: "void_fill", label: "Void Fill Material" },
  ],
  pallets: [
    { value: "euro_pallet", label: "Euro Pallet (120x80 cm)" },
    { value: "standard_pallet", label: "Standard Pallet (100x120 cm)" },
    { value: "half_pallet", label: "Half Pallet" },
    { value: "quarter_pallet", label: "Quarter Pallet" },
    { value: "plastic_pallet", label: "Plastic Pallet" },
    { value: "wooden_pallet", label: "Wooden Pallet" },
  ],
  protective: [
    { value: "stretch_film", label: "Stretch Film / Wrap" },
    { value: "shrink_wrap", label: "Shrink Wrap" },
    { value: "packing_tape", label: "Packing Tape" },
    { value: "fragile_tape", label: "Fragile Tape" },
    { value: "edge_protectors", label: "Edge Protectors" },
    { value: "corner_boards", label: "Corner Boards" },
    { value: "moisture_barrier", label: "Moisture Barrier Bags" },
  ],
  tools: [
    { value: "tape_dispenser", label: "Tape Dispenser" },
    { value: "box_cutter", label: "Box Cutter / Knife" },
    { value: "stretch_wrap_dispenser", label: "Stretch Wrap Dispenser" },
    { value: "label_printer", label: "Label Printer" },
    { value: "scale", label: "Packing Scale" },
    { value: "stapler", label: "Heavy-Duty Stapler" },
    { value: "strapping_tool", label: "Strapping Tool" },
  ],
  supplies: [
    { value: "shipping_labels", label: "Shipping Labels" },
    { value: "barcode_labels", label: "Barcode Labels" },
    { value: "fragile_stickers", label: "Fragile Stickers" },
    { value: "packing_list_envelopes", label: "Packing List Envelopes" },
    { value: "gloves", label: "Packing Gloves" },
    { value: "markers", label: "Permanent Markers" },
    { value: "strapping_bands", label: "Strapping Bands" },
  ],
};

const SIZE_OPTIONS = [
  { value: "xs", label: "Extra Small (XS)" },
  { value: "s", label: "Small (S)" },
  { value: "m", label: "Medium (M)" },
  { value: "l", label: "Large (L)" },
  { value: "xl", label: "Extra Large (XL)" },
  { value: "xxl", label: "Double XL (XXL)" },
  { value: "custom", label: "Custom Size" },
];

export default function AddPackingMaterial() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      code: "",
      category: "",
      type: "",
      size: "",
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

  const selectedCategory = form.watch("category");
  const typeOptions = selectedCategory ? CATEGORY_TYPES[selectedCategory] || [] : [];

  // Reset type when category changes
  const handleCategoryChange = (value: string) => {
    form.setValue("category", value);
    form.setValue("type", ""); // Reset type selection
  };

  const createMutation = useMutation({
    mutationFn: (data: FormData) => apiRequest("POST", "/api/packing-materials", data),
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
          <CardTitle className="text-2xl">Add Packing Material</CardTitle>
          <CardDescription>
            Add warehouse packing materials and supplies to your inventory
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Category Selection - Primary */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Material Category</h3>
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <Select onValueChange={handleCategoryChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder="Select a material category" />
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

              {/* Type Selection - Shows based on category */}
              {selectedCategory && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Material Type</h3>
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-type">
                              <SelectValue placeholder="Select material type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {typeOptions.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        <FormDescription>
                          Unique identifier for warehouse tracking
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Dimensions & Specifications */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Dimensions & Specifications</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="size"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Size</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-size">
                              <SelectValue placeholder="Select size" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SIZE_OPTIONS.map((size) => (
                              <SelectItem key={size.value} value={size.value}>
                                {size.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dimensions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dimensions</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 40x35x30 cm" {...field} value={field.value || ""} data-testid="input-dimensions" />
                        </FormControl>
                        <FormDescription>
                          L × W × H format
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weight</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 0.5 kg" {...field} value={field.value || ""} data-testid="input-weight" />
                        </FormControl>
                        <FormDescription>
                          Per unit weight
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Cost & Inventory */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Cost & Inventory</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="grid grid-cols-2 gap-4">
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
                  </div>

                  <FormField
                    control={form.control}
                    name="supplier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Supplier</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Packaging Solutions Ltd." {...field} value={field.value || ""} data-testid="input-supplier" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="stockQuantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Stock</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" {...field} data-testid="input-stock" />
                        </FormControl>
                        <FormDescription>
                          Units currently in stock
                        </FormDescription>
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
                        <FormDescription>
                          Alert when stock falls below
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Description & Notes */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Additional Information</h3>
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

                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Image URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/image.jpg" {...field} value={field.value || ""} data-testid="input-image-url" />
                      </FormControl>
                      <FormDescription>
                        Optional image for visual reference
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Material Properties */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Material Properties</h3>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="isReusable"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Reusable Material
                          </FormLabel>
                          <FormDescription>
                            Can this material be reused multiple times?
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
                    name="isFragile"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Fragile / Delicate
                          </FormLabel>
                          <FormDescription>
                            Requires careful handling or storage
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
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-4 pt-6 border-t">
                <Link href="/packing-materials">
                  <Button type="button" variant="outline" data-testid="button-cancel">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit">
                  <Save className="h-4 w-4 mr-2" />
                  {createMutation.isPending ? "Creating..." : "Create Material"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
