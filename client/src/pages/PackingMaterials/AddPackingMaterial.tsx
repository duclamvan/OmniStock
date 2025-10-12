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
import { ArrowLeft, Save } from "lucide-react";
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

// Simplified Material Categories
const MATERIAL_CATEGORIES = [
  { value: "cartons", label: "Cartons & Boxes" },
  { value: "filling", label: "Filling Materials" },
  { value: "protective", label: "Protective Materials" },
  { value: "supplies", label: "General Supplies" },
];

// Simplified Type options
const CATEGORY_TYPES: Record<string, { value: string; label: string }[]> = {
  cartons: [
    { value: "small", label: "Small (20×15×10 cm)" },
    { value: "medium", label: "Medium (30×25×20 cm)" },
    { value: "large", label: "Large (40×35×30 cm)" },
    { value: "xlarge", label: "Extra Large (50×40×40 cm)" },
  ],
  filling: [
    { value: "bubble_wrap", label: "Bubble Wrap" },
    { value: "foam_sheets", label: "Foam Sheets" },
    { value: "air_pillows", label: "Air Pillows" },
    { value: "paper_fill", label: "Paper Fill" },
  ],
  protective: [
    { value: "stretch_film", label: "Stretch Film" },
    { value: "packing_tape", label: "Packing Tape" },
    { value: "fragile_tape", label: "Fragile Tape" },
    { value: "corner_protectors", label: "Corner Protectors" },
  ],
  supplies: [
    { value: "shipping_labels", label: "Shipping Labels" },
    { value: "markers", label: "Markers" },
    { value: "gloves", label: "Gloves" },
    { value: "tape_dispenser", label: "Tape Dispenser" },
  ],
};

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

  const handleCategoryChange = (value: string) => {
    form.setValue("category", value);
    form.setValue("type", "");
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
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="mb-6">
        <Link href="/packing-materials">
          <Button variant="ghost" size="sm" data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Packing Material</CardTitle>
          <CardDescription>
            Add packing materials and supplies to your inventory
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Category & Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <Select onValueChange={handleCategoryChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {MATERIAL_CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedCategory && (
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-type">
                              <SelectValue placeholder="Select type" />
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
                )}
              </div>

              {/* Name & Code */}
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
                      <FormLabel>Code *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., CART-L-001" {...field} data-testid="input-code" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Dimensions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dimensions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dimensions</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 40×35×30 cm" {...field} value={field.value || ""} data-testid="input-dimensions" />
                      </FormControl>
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Cost & Supplier */}
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
                        <Input placeholder="Supplier name" {...field} value={field.value || ""} data-testid="input-supplier" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Stock */}
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Material description or notes..." 
                        rows={3}
                        {...field} 
                        value={field.value || ""}
                        data-testid="textarea-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Properties */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="isReusable"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div>
                        <FormLabel className="text-sm font-medium">Reusable</FormLabel>
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
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div>
                        <FormLabel className="text-sm font-medium">Fragile</FormLabel>
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

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <Link href="/packing-materials">
                  <Button type="button" variant="outline" data-testid="button-cancel">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit">
                  <Save className="mr-2 h-4 w-4" />
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
