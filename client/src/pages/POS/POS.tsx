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
  X,
  FileText,
  CreditCard
} from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { fuzzySearch } from '@/lib/fuzzySearch';
import type { Product } from '@shared/schema';
import { insertInvoiceSchema } from '@shared/schema';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from 'react-i18next';

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
  imageUrl?: string;
}

export default function POS() {
  const { t } = useTranslation(['common', 'orders', 'products', 'financial']);
  const { toast } = useToast();
  const { financialHelpers } = useSettings();
  const [currency, setCurrency] = useState<'EUR' | 'CZK'>('EUR');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer'>('cash');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>(() => {
    return localStorage.getItem('pos_warehouse') || '';
  });
  const [lastSaleId, setLastSaleId] = useState<string | null>(null);

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
  const warehousesQuery = useQuery({
    queryKey: ['/api/warehouses'],
    queryFn: async () => {
      const response = await fetch('/api/warehouses');
      if (!response.ok) throw new Error('Failed to fetch warehouses');
      return response.json();
    },
  });
  const warehouses = warehousesQuery.data || [];

  // Fetch POS settings (returns object with defaults)
  const posSettingsQuery = useQuery({
    queryKey: ['/api/settings/pos'],
    queryFn: async () => {
      const response = await fetch('/api/settings/pos');
      if (!response.ok) {
        throw new Error('Failed to fetch POS settings');
      }
      return response.json();
    },
  });
  const posSettings = posSettingsQuery.data;

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

  // Auto-select warehouse from POS settings or first warehouse (with deterministic fallback)
  // Wait for BOTH queries to complete before attempting auto-selection
  useEffect(() => {
    // Skip if either query is still loading
    if (posSettingsQuery.isLoading || warehousesQuery.isLoading) return;
    
    // Skip if warehouses data is not available yet
    if (!warehouses || warehouses.length === 0) return;
    
    // Auto-select warehouse only if none is currently selected
    if (!selectedWarehouse) {
      const defaultId = posSettings?.defaultWarehouseId;
      const warehouseToSelect = defaultId 
        ? warehouses.find((w: any) => w.id === defaultId) || warehouses[0]
        : warehouses[0];
      setSelectedWarehouse(warehouseToSelect.id);
    }
  }, [posSettings, posSettingsQuery.isLoading, warehousesQuery.isLoading, selectedWarehouse, warehouses]);

  // Save warehouse to localStorage
  useEffect(() => {
    if (selectedWarehouse) {
      localStorage.setItem('pos_warehouse', selectedWarehouse);
    }
  }, [selectedWarehouse]);

  // Recalculate cart prices when currency changes to maintain currency-specific totals
  useEffect(() => {
    if (cart.length === 0) return;

    // Update all cart item prices based on new currency
    setCart(prevCart => prevCart.map(cartItem => {
      // Find the original item in allItems
      const originalItem = allItems.find(item => 
        item.id === cartItem.id && 
        (item.itemType || 'product') === cartItem.type
      );

      if (!originalItem) return cartItem;

      // Get the price for the current currency
      const newPrice = currency === 'EUR' 
        ? parseFloat(originalItem.priceEur || '0') 
        : parseFloat(originalItem.priceCzk || '0');

      // Return updated cart item with new price
      return {
        ...cartItem,
        price: newPrice
      };
    }));
  }, [currency]); // Only run when currency changes

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
        imageUrl: item.imageUrl,
      }]);
    }
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
        throw new Error(t('financial:pleaseSelectWarehouse'));
      }

      const orderData = {
        customerId: null,
        warehouseId: selectedWarehouse,
        currency: currency,
        orderStatus: 'completed',
        paymentStatus: 'paid',
        orderType: 'pos',
        items: cart.map(item => ({
          productId: item.productId,
          variantId: item.variantId,
          bundleId: item.bundleId,
          quantity: item.quantity,
          price: item.price.toFixed(2),
        })),
        subtotal: subtotal.toFixed(2),
        total: total.toFixed(2),
        grandTotal: total.toFixed(2),
        paymentMethod: paymentMethod,
        fulfillmentStage: 'completed',
        customerEmail: 'walkin@pos.local',
        customerName: t('financial:walkInCustomer'),
        customerPhone: '+420000000000',
      };

      return await apiRequest('POST', '/api/orders', orderData);
    },
    onSuccess: (data: any) => {
      toast({
        title: t('common:success'),
        description: t('financial:saleCompletedSuccessfully'),
      });
      setLastSaleId(data.id);
      clearCart();
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message || t('financial:failedToCompleteSale'),
        variant: "destructive",
      });
    },
  });

  // Generate invoice mutation with proper schema validation
  const generateInvoiceMutation = useMutation({
    mutationFn: async () => {
      if (!lastSaleId) {
        throw new Error('No recent sale to generate invoice for');
      }

      // Prepare invoice data with proper fields from schema
      // Status must be one of: 'draft', 'generated', 'sent'
      // pdfUrl is optional and omitted here (will be generated server-side if needed)
      const invoiceData = {
        posSaleId: lastSaleId, // Use posSaleId for POS sales
        status: 'generated' as const,
        invoiceNumber: `INV-${Date.now()}`,
      };

      // Validate using insertInvoiceSchema before sending
      const validatedData = insertInvoiceSchema.parse(invoiceData);

      return await apiRequest('POST', '/api/invoices', validatedData);
    },
    onSuccess: () => {
      toast({
        title: t('common:success'),
        description: t('financial:invoiceGeneratedSuccessfully'),
      });
      setLastSaleId(null);
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message || t('financial:failedToGenerateInvoice'),
        variant: "destructive",
      });
    },
  });

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast({
        title: t('financial:cartEmpty'),
        description: t('financial:pleaseAddItemsToCart'),
        variant: 'destructive'
      });
      return;
    }

    if (!selectedWarehouse) {
      toast({
        title: t('financial:warehouseRequired'),
        description: t('financial:pleaseSelectWarehouse'),
        variant: 'destructive'
      });
      return;
    }

    createOrderMutation.mutate();
  };

  // Reusable Cart Content Component
  const CartContent = ({ showHeader = true }: { showHeader?: boolean }) => (
    <>
      {showHeader && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">
            {t('financial:cart')} ({totalItems} {t('common:items')})
          </h3>
          {cart.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearCart}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
              data-testid="button-clear-cart"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {t('common:clear')}
            </Button>
          )}
        </div>
      )}

      <div className="space-y-3 flex-1">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <ShoppingCart className="h-16 w-16 mb-4 opacity-30" />
            <p>{t('financial:cartIsEmpty')}</p>
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-280px)] lg:h-[calc(100vh-320px)]">
            <div className="space-y-2 pr-4">
              {cart.map((item) => (
                <Card key={item.id} className="p-3">
                  <div className="flex gap-3">
                    {/* Product Image */}
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-20 h-20 object-cover rounded-lg border-2 border-gray-200 dark:border-gray-700 shrink-0"
                        data-testid={`img-cart-item-${item.id}`}
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-lg border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center shrink-0">
                        <Package className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                    
                    {/* Item Info & Controls */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      {/* Product Name - Full Display */}
                      <div>
                        <h4 className="font-semibold text-xs leading-tight break-words">{item.name}</h4>
                        {item.sku && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">{t('financial:sku')}: {item.sku}</p>
                        )}
                      </div>

                      {/* Price & Quantity Row */}
                      <div className="flex items-center justify-between gap-2">
                        {/* Unit Price */}
                        <div className="text-xs">
                          <span className="text-muted-foreground">{t('financial:unit')}: </span>
                          <span className="font-semibold text-primary">
                            {currency} {item.price.toFixed(2)}
                          </span>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            data-testid={`button-decrease-${item.id}`}
                          >
                            <Minus className="h-2.5 w-2.5" />
                          </Button>
                          <span className="font-bold min-w-[2rem] text-center text-sm">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            data-testid={`button-increase-${item.id}`}
                          >
                            <Plus className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Subtotal & Remove */}
                      <div className="flex items-center justify-between pt-1 border-t">
                        <div className="text-xs">
                          <span className="text-muted-foreground">{t('financial:subtotal')}: </span>
                          <span className="font-bold text-sm text-primary">
                            {currency} {(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 -mr-2"
                          onClick={() => removeFromCart(item.id)}
                          data-testid={`button-remove-${item.id}`}
                        >
                          <X className="h-3 w-3 mr-0.5" />
                          {t('common:remove')}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Total and Checkout */}
      {cart.length > 0 && (
        <div className="pt-3 border-t space-y-2 mt-3">
          {/* Payment Method Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t('financial:selectPaymentMethod')}</label>
            <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as 'cash' | 'card' | 'bank_transfer')}>
              <SelectTrigger className="w-full h-9 text-sm" data-testid="select-payment-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">{t('financial:cash')}</SelectItem>
                <SelectItem value="card">{t('financial:card')}</SelectItem>
                <SelectItem value="bank_transfer">{t('financial:bankTransfer')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between text-base font-bold pt-2">
            <span className="text-sm">{t('financial:total')}</span>
            <span className="text-primary text-lg">{currency} {total.toFixed(2)}</span>
          </div>
          
          <Button
            size="lg"
            className="w-full h-11"
            onClick={handleCheckout}
            disabled={createOrderMutation.isPending}
            data-testid="button-checkout"
          >
            {createOrderMutation.isPending ? (
              t('common:processing')
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                {t('financial:completeSale')}
              </>
            )}
          </Button>

          {/* Invoice Generation Button */}
          {lastSaleId && (
            <Button
              variant="outline"
              size="sm"
              className="w-full h-9"
              onClick={() => generateInvoiceMutation.mutate()}
              disabled={generateInvoiceMutation.isPending}
              data-testid="button-generate-invoice"
            >
              {generateInvoiceMutation.isPending ? (
                t('common:processing')
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  {t('financial:generateInvoice')}
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </>
  );

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-background overflow-hidden">
      {/* Left Panel: Products (Mobile: full screen, Desktop: 2/3 width) */}
      <div className="flex flex-col flex-1 lg:flex-[2] overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-primary text-primary-foreground shadow-lg">
          <div className="p-4 space-y-3">
            {/* Title and Currency */}
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-bold">{t('financial:pos')}</h1>
              <div className="flex items-center gap-2">
                <Select value={currency} onValueChange={(v) => setCurrency(v as 'EUR' | 'CZK')}>
                  <SelectTrigger className="w-16 h-8 bg-primary-foreground text-primary border-0 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="CZK">CZK</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder={t('products:searchItems')}
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
          <div className="p-2 pb-28 lg:pb-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 3xl:grid-cols-10 gap-1.5 sm:gap-2">
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
                    <div className="absolute top-0.5 left-0.5 bg-purple-600 text-white rounded px-1 py-0.5 text-[9px] font-semibold z-10">
                      V
                    </div>
                  )}
                  {product.itemType === 'bundle' && (
                    <div className="absolute top-0.5 left-0.5 bg-orange-600 text-white rounded px-1 py-0.5 text-[9px] font-semibold z-10">
                      B
                    </div>
                  )}

                  {/* Quantity Badge */}
                  {isInCart && cartItem && (
                    <div className="absolute top-0.5 right-0.5 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold z-10">
                      {cartItem.quantity}
                    </div>
                  )}
                  
                  <CardContent className="p-0">
                    {/* Image */}
                    <div className="relative h-16 sm:h-20 bg-muted/30 border-b">
                      {product.imageUrl ? (
                        <img 
                          src={product.imageUrl} 
                          alt={product.name}
                          className="w-full h-full object-contain p-0.5"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    
                    {/* Details */}
                    <div className="p-1.5 space-y-0.5">
                      <h3 className="font-medium text-[10px] sm:text-xs leading-tight line-clamp-2 min-h-[1.5rem]">
                        {product.name}
                      </h3>
                      <p className="text-xs sm:text-sm font-bold text-primary">
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
      </div>

      {/* Right Panel: Desktop Cart (Hidden on Mobile, Visible on lg+) */}
      <div className="hidden lg:flex lg:flex-col lg:flex-1 border-l bg-card">
        <div className="p-4 border-b bg-primary text-primary-foreground">
          <h2 className="text-xl font-bold">{t('financial:cart')}</h2>
        </div>
        <div className="flex flex-col p-4 overflow-hidden h-full">
          <CartContent showHeader={false} />
        </div>
      </div>

      {/* Fixed Bottom Cart Bar - Mobile Only (Hidden on Desktop) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t shadow-lg z-50">
        <div className="p-3 space-y-2">
          {/* Cart Summary */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <span className="font-semibold">{totalItems} {t('common:items')}</span>
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
                  {t('financial:viewCart')}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[80vh]">
                <SheetHeader>
                  <SheetTitle className="flex items-center justify-between">
                    <span>{t('financial:cart')} ({totalItems} {t('common:items')})</span>
                    {cart.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearCart}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
                        data-testid="button-clear-cart"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        {t('common:clear')}
                      </Button>
                    )}
                  </SheetTitle>
                </SheetHeader>

                <div className="mt-4 flex flex-col h-[calc(80vh-120px)]">
                  <CartContent showHeader={false} />
                </div>
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
                t('common:processing')
              ) : (
                <>
                  <Check className="mr-2 h-5 w-5" />
                  {t('financial:checkout')}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
