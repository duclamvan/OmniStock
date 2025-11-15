import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Search,
  Package,
  Check,
  X
} from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { fuzzySearch } from '@/lib/fuzzySearch';
import type { Product } from '@shared/schema';
import { useSettings } from '@/contexts/SettingsContext';

interface CartItem {
  id: string;
  productId?: string;
  variantId?: string;
  bundleId?: string;
  name: string;
  price: number;
  quantity: number;
  type: 'product' | 'variant' | 'bundle';
  sku?: string;
}

export default function POS() {
  const { toast } = useToast();
  const { financialHelpers } = useSettings();
  const [currency, setCurrency] = useState<'EUR' | 'CZK'>('EUR');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>(() => {
    return localStorage.getItem('pos_warehouse') || '';
  });

  // Fetch products
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
    queryFn: async () => {
      const response = await fetch('/api/products');
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
  });

  // Fetch product variants
  const { data: productVariants = [] } = useQuery<any[]>({
    queryKey: ['/api/variants'],
    queryFn: async () => {
      const response = await fetch('/api/variants');
      if (!response.ok) throw new Error('Failed to fetch variants');
      return response.json();
    },
  });

  // Fetch bundles
  const { data: bundles = [] } = useQuery<any[]>({
    queryKey: ['/api/bundles']
  });

  // Fetch warehouses
  const { data: warehouses = [] } = useQuery({
    queryKey: ['/api/warehouses'],
    queryFn: async () => {
      const response = await fetch('/api/warehouses');
      if (!response.ok) throw new Error('Failed to fetch warehouses');
      return response.json();
    },
  });

  // Combine products, variants, and bundles
  const allItems = [
    ...products.map((p: any) => ({ ...p, itemType: 'product' as const })),
    ...productVariants.map((v: any) => ({ 
      id: v.id,
      name: v.name,
      sku: v.sku,
      barcode: v.barcode,
      priceEur: v.priceEur,
      priceCzk: v.priceCzk,
      imageUrl: v.imageUrl,
      productId: v.productId,
      variantId: v.id,
      itemType: 'variant' as const,
    })),
    ...bundles.map((b: any) => ({
      id: b.id,
      name: b.name,
      sku: b.sku,
      priceEur: b.priceEur,
      priceCzk: b.priceCzk,
      bundleId: b.bundleId,
      itemType: 'bundle' as const
    }))
  ];

  // Fuzzy search
  const searchResults = searchQuery.trim()
    ? fuzzySearch(allItems, searchQuery, {
        fields: ['name', 'sku', 'barcode'],
        threshold: 0.2,
        fuzzy: true,
        vietnameseNormalization: true,
      })
    : allItems.map(item => ({ item, score: 0 }));

  const displayProducts = searchResults.map(r => r.item);

  // Auto-select first warehouse
  useEffect(() => {
    if (warehouses && Array.isArray(warehouses) && warehouses.length > 0 && !selectedWarehouse) {
      const firstWarehouse = warehouses[0];
      if (firstWarehouse && firstWarehouse.id) {
        setSelectedWarehouse(firstWarehouse.id);
      }
    }
  }, [warehouses, selectedWarehouse]);

  // Save warehouse to localStorage
  useEffect(() => {
    if (selectedWarehouse) {
      localStorage.setItem('pos_warehouse', selectedWarehouse);
    }
  }, [selectedWarehouse]);

  // Add to cart
  const addToCart = (item: any) => {
    const price = currency === 'EUR' ? parseFloat(item.priceEur || '0') : parseFloat(item.priceCzk || '0');
    const itemType = item.itemType || 'product';
    const productId = itemType === 'variant' ? item.productId : item.id;
    const variantId = itemType === 'variant' ? item.id : undefined;
    const bundleId = itemType === 'bundle' ? item.bundleId || item.id : undefined;

    const existingItem = cart.find(cartItem => 
      cartItem.id === item.id && cartItem.type === itemType
    );

    if (existingItem) {
      updateQuantity(existingItem.id, existingItem.quantity + 1);
    } else {
      setCart([...cart, {
        id: item.id,
        productId,
        variantId,
        bundleId,
        name: item.name,
        price,
        quantity: 1,
        type: itemType,
        sku: item.sku,
      }]);
    }
    
    toast({
      title: "Added to cart",
      description: item.name,
    });
  };

  // Update quantity
  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
    } else {
      setCart(cart.map(item => 
        item.id === id ? { ...item, quantity } : item
      ));
    }
  };

  // Remove from cart
  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  // Clear cart
  const clearCart = () => {
    setCart([]);
    setCartOpen(false);
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = subtotal;
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!selectedWarehouse) {
        throw new Error('Please select a warehouse');
      }

      const orderData = {
        customerId: null,
        warehouseId: selectedWarehouse,
        currency: currency,
        status: 'completed',
        items: cart.map(item => ({
          productId: item.productId,
          variantId: item.variantId,
          bundleId: item.bundleId,
          quantity: item.quantity,
          price: item.price.toString(),
        })),
        subtotal: subtotal.toString(),
        total: total.toString(),
        paymentMethod: 'cash',
        fulfillmentStage: 'completed',
      };

      return await apiRequest('POST', '/api/orders', orderData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Sale completed successfully",
      });
      clearCart();
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete sale",
        variant: "destructive",
      });
    },
  });

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast({
        title: 'Cart Empty',
        description: 'Please add items to cart',
        variant: 'destructive'
      });
      return;
    }

    if (!selectedWarehouse) {
      toast({
        title: 'Warehouse Required',
        description: 'Please select a warehouse',
        variant: 'destructive'
      });
      return;
    }

    createOrderMutation.mutate();
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Mobile Header */}
      <div className="sticky top-0 z-50 bg-primary text-primary-foreground shadow-lg">
        <div className="p-4 space-y-3">
          {/* Title and Currency */}
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">POS</h1>
            <div className="flex items-center gap-2">
              <Select value={currency} onValueChange={(v) => setCurrency(v as 'EUR' | 'CZK')}>
                <SelectTrigger className="w-20 h-9 bg-primary-foreground text-primary border-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="CZK">CZK</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Warehouse Selection */}
          <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
            <SelectTrigger className="w-full bg-primary-foreground text-primary border-0" data-testid="select-warehouse">
              <SelectValue placeholder="Select Warehouse" />
            </SelectTrigger>
            <SelectContent>
              {warehouses.map((warehouse: any) => (
                <SelectItem key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 bg-white dark:bg-slate-800 border-0"
              data-testid="input-search"
            />
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <ScrollArea className="flex-1">
        <div className="p-3 pb-28">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
            {displayProducts.map((product: any) => {
              const cartItem = cart.find(item => item.id === product.id);
              const isInCart = !!cartItem;
              const price = currency === 'EUR' 
                ? parseFloat(product.priceEur || '0')
                : parseFloat(product.priceCzk || '0');

              return (
                <Card
                  key={product.id}
                  className={cn(
                    "cursor-pointer transition-all active:scale-95",
                    "border-2 relative overflow-hidden",
                    isInCart ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                  )}
                  onClick={() => addToCart(product)}
                  data-testid={`card-product-${product.id}`}
                >
                  {/* Type Badge */}
                  {product.itemType === 'variant' && (
                    <div className="absolute top-1 left-1 bg-purple-600 text-white rounded px-1.5 py-0.5 text-[10px] font-semibold z-10">
                      V
                    </div>
                  )}
                  {product.itemType === 'bundle' && (
                    <div className="absolute top-1 left-1 bg-orange-600 text-white rounded px-1.5 py-0.5 text-[10px] font-semibold z-10">
                      B
                    </div>
                  )}

                  {/* Quantity Badge */}
                  {isInCart && cartItem && (
                    <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold z-10">
                      {cartItem.quantity}
                    </div>
                  )}
                  
                  <CardContent className="p-0">
                    {/* Image */}
                    <div className="relative h-20 sm:h-24 bg-muted/30 border-b">
                      {product.imageUrl ? (
                        <img 
                          src={product.imageUrl} 
                          alt={product.name}
                          className="w-full h-full object-contain p-1"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    
                    {/* Details */}
                    <div className="p-2 space-y-1">
                      <h3 className="font-medium text-xs sm:text-sm leading-tight line-clamp-2 min-h-[2rem] sm:min-h-[2.5rem]">
                        {product.name}
                      </h3>
                      <p className="text-sm sm:text-base font-bold text-primary">
                        {currency} {price.toFixed(2)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </ScrollArea>

      {/* Fixed Bottom Cart Bar - Mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t shadow-lg z-50">
        <div className="p-3 space-y-2">
          {/* Cart Summary */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <span className="font-semibold">{totalItems} Items</span>
            </div>
            <div className="text-lg font-bold text-primary">
              {currency} {total.toFixed(2)}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Sheet open={cartOpen} onOpenChange={setCartOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="outline" 
                  size="lg"
                  className="w-full h-12"
                  disabled={cart.length === 0}
                  data-testid="button-view-cart"
                >
                  View Cart
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[80vh]">
                <SheetHeader>
                  <SheetTitle className="flex items-center justify-between">
                    <span>Cart ({totalItems} items)</span>
                    {cart.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearCart}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
                        data-testid="button-clear-cart"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Clear
                      </Button>
                    )}
                  </SheetTitle>
                </SheetHeader>

                <div className="mt-4 space-y-3">
                  {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <ShoppingCart className="h-16 w-16 mb-4 opacity-30" />
                      <p>Cart is empty</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[50vh]">
                      <div className="space-y-2 pr-4">
                        {cart.map((item) => (
                          <Card key={item.id} className="p-3">
                            <div className="flex items-start gap-3">
                              {/* Item Info */}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm line-clamp-2">{item.name}</h4>
                                {item.sku && (
                                  <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                                )}
                                <p className="text-sm font-semibold text-primary mt-1">
                                  {currency} {item.price.toFixed(2)}
                                </p>
                              </div>

                              {/* Quantity Controls */}
                              <div className="flex items-center gap-2 shrink-0">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                  data-testid={`button-decrease-${item.id}`}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="font-bold min-w-[2rem] text-center">
                                  {item.quantity}
                                </span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  data-testid={`button-increase-${item.id}`}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
                                  onClick={() => removeFromCart(item.id)}
                                  data-testid={`button-remove-${item.id}`}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            {/* Item Total */}
                            <div className="flex justify-end mt-2 pt-2 border-t">
                              <span className="font-semibold">
                                {currency} {(item.price * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>

                {/* Total and Checkout */}
                {cart.length > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t space-y-3">
                    <div className="flex items-center justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-primary">{currency} {total.toFixed(2)}</span>
                    </div>
                    <Button
                      size="lg"
                      className="w-full h-12"
                      onClick={handleCheckout}
                      disabled={createOrderMutation.isPending}
                      data-testid="button-checkout"
                    >
                      {createOrderMutation.isPending ? (
                        "Processing..."
                      ) : (
                        <>
                          <Check className="mr-2 h-5 w-5" />
                          Complete Sale
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </SheetContent>
            </Sheet>

            <Button 
              size="lg"
              className="w-full h-12"
              onClick={handleCheckout}
              disabled={cart.length === 0 || createOrderMutation.isPending}
              data-testid="button-quick-checkout"
            >
              {createOrderMutation.isPending ? (
                "Processing..."
              ) : (
                <>
                  <Check className="mr-2 h-5 w-5" />
                  Checkout
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
