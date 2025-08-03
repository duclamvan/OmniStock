import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, MoreHorizontal, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/currencyUtils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  barcode?: string;
  quantity: number;
  importCostUsd?: string;
  importCostCzk?: string;
  importCostEur?: string;
  createdAt: string;
}

interface ProductVariantsProps {
  productId: string;
}

export default function ProductVariants({ productId }: ProductVariantsProps) {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<string[]>([]);
  const [seriesInput, setSeriesInput] = useState("");
  const [newVariant, setNewVariant] = useState({
    name: "",
    barcode: "",
    quantity: 0,
    importCostUsd: "",
    importCostCzk: "",
    importCostEur: "",
  });

  // Fetch variants
  const { data: variants = [], isLoading } = useQuery<ProductVariant[]>({
    queryKey: [`/api/products/${productId}/variants`],
    enabled: !!productId,
  });

  // Create variant mutation
  const createVariantMutation = useMutation({
    mutationFn: async (data: typeof newVariant) => {
      await apiRequest("POST", `/api/products/${productId}/variants`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/products/${productId}/variants`] });
      toast({
        title: "Success",
        description: "Product variant created successfully",
      });
      setIsAddDialogOpen(false);
      setNewVariant({
        name: "",
        barcode: "",
        quantity: 0,
        importCostUsd: "",
        importCostCzk: "",
        importCostEur: "",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create product variant",
        variant: "destructive",
      });
    },
  });

  // Update variant mutation
  const updateVariantMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ProductVariant> }) => {
      await apiRequest("PATCH", `/api/products/${productId}/variants/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/products/${productId}/variants`] });
      toast({
        title: "Success",
        description: "Product variant updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update product variant",
        variant: "destructive",
      });
    },
  });

  // Delete variant mutation
  const deleteVariantMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/products/${productId}/variants/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/products/${productId}/variants`] });
      toast({
        title: "Success",
        description: "Product variant deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete product variant",
        variant: "destructive",
      });
    },
  });

  const handleToggleSelect = (variantId: string) => {
    setSelectedVariants((prev) =>
      prev.includes(variantId)
        ? prev.filter((id) => id !== variantId)
        : [...prev, variantId]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedVariants.length === variants.length) {
      setSelectedVariants([]);
    } else {
      setSelectedVariants(variants.map((v) => v.id));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedVariants.length === 0) return;
    
    Promise.all(selectedVariants.map((id) => deleteVariantMutation.mutateAsync(id)))
      .then(() => {
        setSelectedVariants([]);
      });
  };

  const handleCreateVariant = () => {
    createVariantMutation.mutate(newVariant);
  };

  const handleCreateSeries = async () => {
    // Parse series format like "Gel Polish <1-100>"
    const seriesMatch = seriesInput.match(/^(.+?)\s*<(\d+)-(\d+)>$/);
    
    if (!seriesMatch) {
      toast({
        title: "Invalid Format",
        description: 'Please use format like "Gel Polish <1-100>"',
        variant: "destructive",
      });
      return;
    }

    const [, baseName, startStr, endStr] = seriesMatch;
    const start = parseInt(startStr);
    const end = parseInt(endStr);

    if (start > end || end - start > 1000) {
      toast({
        title: "Invalid Range",
        description: "Range must be valid and not exceed 1000 items",
        variant: "destructive",
      });
      return;
    }

    // Create all variants in the series
    const variants = [];
    for (let i = start; i <= end; i++) {
      variants.push({
        name: `${baseName.trim()} ${i}`,
        barcode: "",
        quantity: 0,
        importCostUsd: "",
        importCostCzk: "",
        importCostEur: "",
      });
    }

    try {
      // Create variants in batches to avoid overwhelming the server
      const batchSize = 10;
      for (let i = 0; i < variants.length; i += batchSize) {
        const batch = variants.slice(i, i + batchSize);
        await Promise.all(
          batch.map(variant => 
            apiRequest("POST", `/api/products/${productId}/variants`, variant)
          )
        );
      }

      queryClient.invalidateQueries({ queryKey: [`/api/products/${productId}/variants`] });
      toast({
        title: "Success",
        description: `Created ${variants.length} product variants`,
      });
      setSeriesInput("");
      setIsAddDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create series",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading variants...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Product Variants</CardTitle>
        <div className="flex gap-2">
          {selectedVariants.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteSelected}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected ({selectedVariants.length})
            </Button>
          )}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Variant
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add Product Variants</DialogTitle>
                <DialogDescription>
                  Add a single variant or create a series of variants
                </DialogDescription>
              </DialogHeader>
              
              {/* Series Creation Section */}
              <div className="space-y-4 border-b pb-4">
                <div className="space-y-2">
                  <Label htmlFor="series-input">Create Series</Label>
                  <div className="flex gap-2">
                    <Input
                      id="series-input"
                      value={seriesInput}
                      onChange={(e) => setSeriesInput(e.target.value)}
                      placeholder='e.g., "Gel Polish <1-100>"'
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleCreateSeries}
                      disabled={!seriesInput}
                      type="button"
                    >
                      Add Series
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500">
                    For series: Use format like "Gel Polish &lt;1-100&gt;" to automatically create 100 variants
                  </p>
                </div>
              </div>

              {/* Single Variant Section */}
              <div className="space-y-4 pt-4">
                <div className="text-sm font-medium text-slate-600">Or add a single variant:</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="variant-name">Variant Name</Label>
                    <Input
                      id="variant-name"
                      value={newVariant.name}
                      onChange={(e) =>
                        setNewVariant((prev) => ({ ...prev, name: e.target.value }))
                      }
                      placeholder="e.g., Size XL"
                    />
                  </div>
                  <div>
                    <Label htmlFor="variant-barcode">Barcode</Label>
                    <Input
                      id="variant-barcode"
                      value={newVariant.barcode}
                      onChange={(e) =>
                        setNewVariant((prev) => ({ ...prev, barcode: e.target.value }))
                      }
                      placeholder="123456789012"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="variant-quantity">Quantity</Label>
                  <Input
                    id="variant-quantity"
                    type="number"
                    value={newVariant.quantity}
                    onChange={(e) =>
                      setNewVariant((prev) => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))
                    }
                    placeholder="0"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="variant-import-usd">Import Cost (USD)</Label>
                    <Input
                      id="variant-import-usd"
                      type="number"
                      step="0.01"
                      value={newVariant.importCostUsd}
                      onChange={(e) =>
                        setNewVariant((prev) => ({ ...prev, importCostUsd: e.target.value }))
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="variant-import-czk">Import Cost (CZK)</Label>
                    <Input
                      id="variant-import-czk"
                      type="number"
                      step="0.01"
                      value={newVariant.importCostCzk}
                      onChange={(e) =>
                        setNewVariant((prev) => ({ ...prev, importCostCzk: e.target.value }))
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="variant-import-eur">Import Cost (EUR)</Label>
                    <Input
                      id="variant-import-eur"
                      type="number"
                      step="0.01"
                      value={newVariant.importCostEur}
                      onChange={(e) =>
                        setNewVariant((prev) => ({ ...prev, importCostEur: e.target.value }))
                      }
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  onClick={handleCreateVariant}
                  disabled={!newVariant.name}
                >
                  Add Variant
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {variants.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No variants yet. Click "Add Variant" to create one.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={selectedVariants.length === variants.length && variants.length > 0}
                    onCheckedChange={handleToggleSelectAll}
                  />
                </TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>Barcode</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Import Cost (USD)</TableHead>
                <TableHead className="text-right">Import Cost (CZK)</TableHead>
                <TableHead className="text-right">Import Cost (EUR)</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variants.map((variant) => (
                <TableRow key={variant.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedVariants.includes(variant.id)}
                      onCheckedChange={() => handleToggleSelect(variant.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                        <Upload className="h-5 w-5 text-gray-400" />
                      </div>
                      {variant.name}
                    </div>
                  </TableCell>
                  <TableCell>{variant.barcode || "-"}</TableCell>
                  <TableCell className="text-right">{variant.quantity}</TableCell>
                  <TableCell className="text-right">
                    {variant.importCostUsd ? `$${parseFloat(variant.importCostUsd).toFixed(2)}` : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {variant.importCostCzk ? formatCurrency(parseFloat(variant.importCostCzk), "CZK") : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {variant.importCostEur ? formatCurrency(parseFloat(variant.importCostEur), "EUR") : "-"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => deleteVariantMutation.mutate(variant.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}