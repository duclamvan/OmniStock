import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Plus, 
  Trash2, 
  Package, 
  ShoppingCart, 
  Factory, 
  AlertCircle,
  Check,
  ChevronsUpDown,
  Edit2,
  Save,
  X
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface RecipeIngredient {
  id: string;
  productId: string;
  variantId?: string | null;
  ingredientProductId: string;
  ingredientVariantId?: string | null;
  quantityPerUnit: string;
  ingredientProduct?: {
    id: string;
    name: string;
    sku: string;
    quantity: number;
    imageUrl?: string;
  };
  ingredientVariant?: {
    id: string;
    name: string;
    sku: string;
    quantity: number;
    imageUrl?: string;
  };
}

interface RecipeTabProps {
  productId: string;
  variantId?: string | null;
  replenishmentMethod?: string;
}

export default function RecipeTab({ productId, variantId, replenishmentMethod }: RecipeTabProps) {
  const { t } = useTranslation(['products', 'common']);
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState("1");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingQty, setEditingQty] = useState("");

  const queryParams = variantId ? `?variantId=${variantId}` : '';
  
  const { data: recipe = [], isLoading } = useQuery<RecipeIngredient[]>({
    queryKey: ['/api/products', productId, 'recipe', variantId],
    queryFn: async () => {
      const res = await fetch(`/api/products/${productId}/recipe${queryParams}`);
      if (!res.ok) throw new Error('Failed to fetch recipe');
      return res.json();
    },
    enabled: !!productId,
  });

  const { data: products = [] } = useQuery<any[]>({
    queryKey: ['/api/products'],
  });

  const filteredProducts = products.filter(p => 
    p.id !== productId && 
    (p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     p.sku?.toLowerCase().includes(searchQuery.toLowerCase()))
  ).slice(0, 10);

  const updateReplenishmentMethod = useMutation({
    mutationFn: async (method: string) => {
      const res = await apiRequest('PATCH', `/api/products/${productId}/replenishment-method`, {
        replenishmentMethod: method,
        variantId
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products', productId] });
      toast({
        title: t('common:success'),
        description: t('products:replenishmentMethodUpdated'),
      });
    },
    onError: () => {
      toast({
        title: t('common:error'),
        description: t('products:replenishmentMethodError'),
        variant: "destructive",
      });
    },
  });

  const addIngredient = useMutation({
    mutationFn: async (data: { ingredientProductId: string; ingredientVariantId?: string; quantityPerUnit: string }) => {
      const res = await apiRequest('POST', `/api/products/${productId}/recipe`, {
        ...data,
        variantId
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products', productId, 'recipe', variantId] });
      setIsAddDialogOpen(false);
      setSelectedProduct(null);
      setQuantity("1");
      toast({
        title: t('common:success'),
        description: t('products:ingredientAdded'),
      });
    },
    onError: () => {
      toast({
        title: t('common:error'),
        description: t('products:ingredientAddError'),
        variant: "destructive",
      });
    },
  });

  const updateIngredient = useMutation({
    mutationFn: async ({ ingredientId, quantityPerUnit }: { ingredientId: string; quantityPerUnit: string }) => {
      const res = await apiRequest('PATCH', `/api/products/${productId}/recipe/${ingredientId}`, {
        quantityPerUnit
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products', productId, 'recipe', variantId] });
      setEditingId(null);
      toast({
        title: t('common:success'),
        description: t('products:ingredientUpdated'),
      });
    },
    onError: () => {
      toast({
        title: t('common:error'),
        description: t('products:ingredientUpdateError'),
        variant: "destructive",
      });
    },
  });

  const deleteIngredient = useMutation({
    mutationFn: async (ingredientId: string) => {
      await apiRequest('DELETE', `/api/products/${productId}/recipe/${ingredientId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products', productId, 'recipe', variantId] });
      toast({
        title: t('common:success'),
        description: t('products:ingredientDeleted'),
      });
    },
    onError: () => {
      toast({
        title: t('common:error'),
        description: t('products:ingredientDeleteError'),
        variant: "destructive",
      });
    },
  });

  const isMakeMode = replenishmentMethod === 'make';

  const handleAddIngredient = () => {
    if (!selectedProduct) return;
    addIngredient.mutate({
      ingredientProductId: selectedProduct.id,
      quantityPerUnit: quantity
    });
  };

  const startEditing = (item: RecipeIngredient) => {
    setEditingId(item.id);
    setEditingQty(item.quantityPerUnit);
  };

  const saveEditing = (item: RecipeIngredient) => {
    updateIngredient.mutate({
      ingredientId: item.id,
      quantityPerUnit: editingQty
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            {isMakeMode ? (
              <Factory className="h-5 w-5 text-blue-600" />
            ) : (
              <ShoppingCart className="h-5 w-5 text-green-600" />
            )}
            {t('products:replenishmentMethod')}
          </CardTitle>
          <CardDescription>
            {t('products:replenishmentMethodDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="replenishment-mode"
                  checked={isMakeMode}
                  onCheckedChange={(checked) => 
                    updateReplenishmentMethod.mutate(checked ? 'make' : 'buy')
                  }
                  disabled={updateReplenishmentMethod.isPending}
                  data-testid="switch-replenishment-method"
                />
                <Label htmlFor="replenishment-mode" className="font-medium">
                  {isMakeMode ? t('products:make') : t('products:buy')}
                </Label>
              </div>
              <Badge variant={isMakeMode ? "default" : "secondary"} data-testid="badge-replenishment-method">
                {isMakeMode ? (
                  <><Factory className="h-3 w-3 mr-1" /> {t('products:manufacturable')}</>
                ) : (
                  <><ShoppingCart className="h-3 w-3 mr-1" /> {t('products:purchasable')}</>
                )}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {isMakeMode && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  {t('products:recipe')}
                </CardTitle>
                <CardDescription>
                  {t('products:recipeDescription')}
                </CardDescription>
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" data-testid="button-add-ingredient">
                    <Plus className="h-4 w-4 mr-2" />
                    {t('products:addIngredient')}
                  </Button>
                </DialogTrigger>
                <DialogContent data-testid="dialog-add-ingredient">
                  <DialogHeader>
                    <DialogTitle>{t('products:addIngredient')}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>{t('products:selectIngredient')}</Label>
                      <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={searchOpen}
                            className="w-full justify-between"
                            data-testid="button-select-ingredient"
                          >
                            {selectedProduct ? (
                              <span>{selectedProduct.name} ({selectedProduct.sku})</span>
                            ) : (
                              <span className="text-muted-foreground">{t('products:searchProducts')}</span>
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0" align="start">
                          <Command>
                            <CommandInput 
                              placeholder={t('products:searchProducts')} 
                              value={searchQuery}
                              onValueChange={setSearchQuery}
                              data-testid="input-search-product"
                            />
                            <CommandList>
                              <CommandEmpty>{t('products:noProductsFound')}</CommandEmpty>
                              <CommandGroup>
                                {filteredProducts.map((product) => (
                                  <CommandItem
                                    key={product.id}
                                    value={product.id}
                                    onSelect={() => {
                                      setSelectedProduct(product);
                                      setSearchOpen(false);
                                    }}
                                    data-testid={`item-product-${product.id}`}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedProduct?.id === product.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <div className="flex flex-col">
                                      <span>{product.name}</span>
                                      <span className="text-xs text-muted-foreground">{product.sku}</span>
                                    </div>
                                    <Badge variant="outline" className="ml-auto">
                                      {product.quantity || 0} {t('common:inStock')}
                                    </Badge>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label>{t('products:quantityPerUnit')}</Label>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="1"
                        data-testid="input-quantity-per-unit"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      {t('common:cancel')}
                    </Button>
                    <Button 
                      onClick={handleAddIngredient} 
                      disabled={!selectedProduct || addIngredient.isPending}
                      data-testid="button-confirm-add-ingredient"
                    >
                      {addIngredient.isPending ? t('common:adding') : t('common:add')}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {recipe.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t('products:noIngredientsYet')}</p>
                <p className="text-sm">{t('products:addIngredientToStart')}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('products:ingredient')}</TableHead>
                    <TableHead>{t('products:sku')}</TableHead>
                    <TableHead className="text-right">{t('products:quantityPerUnit')}</TableHead>
                    <TableHead className="text-right">{t('products:currentStock')}</TableHead>
                    <TableHead className="text-right">{t('common:actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipe.map((item) => {
                    const ingredient = item.ingredientVariant || item.ingredientProduct;
                    const stock = ingredient?.quantity || 0;
                    const qtyNeeded = parseFloat(item.quantityPerUnit);
                    const isLowStock = stock < qtyNeeded;

                    return (
                      <TableRow key={item.id} data-testid={`row-ingredient-${item.id}`}>
                        <TableCell className="font-medium">
                          {ingredient?.name || t('common:unknown')}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {ingredient?.sku || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {editingId === item.id ? (
                            <Input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={editingQty}
                              onChange={(e) => setEditingQty(e.target.value)}
                              className="w-20 ml-auto"
                              data-testid={`input-quantity-${item.id}`}
                            />
                          ) : (
                            <span>{item.quantityPerUnit}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge 
                            variant={isLowStock ? "destructive" : "secondary"}
                            data-testid={`badge-stock-${item.id}`}
                          >
                            {isLowStock && <AlertCircle className="h-3 w-3 mr-1" />}
                            {stock}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {editingId === item.id ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => saveEditing(item)}
                                  disabled={updateIngredient.isPending}
                                  data-testid={`button-save-${item.id}`}
                                >
                                  <Save className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setEditingId(null)}
                                  data-testid={`button-cancel-${item.id}`}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => startEditing(item)}
                                  data-testid={`button-edit-${item.id}`}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteIngredient.mutate(item.id)}
                                  disabled={deleteIngredient.isPending}
                                  data-testid={`button-delete-${item.id}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
