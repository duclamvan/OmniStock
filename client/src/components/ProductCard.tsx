import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Package, TrendingUp, AlertTriangle, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Product } from '@shared/schema';

interface ProductCardProps {
  product: Product;
  currency: 'EUR' | 'CZK';
  onAddToCart: (product: any) => void;
  isFavorite?: boolean;
  isQuickAccess?: boolean;
  shortcutKey?: string;
  className?: string;
}

export const ProductCard = memo(function ProductCard({
  product,
  currency,
  onAddToCart,
  isFavorite = false,
  isQuickAccess = false,
  shortcutKey,
  className
}: ProductCardProps) {
  const price = currency === 'EUR' 
    ? parseFloat(product.priceEur || '0')
    : parseFloat(product.priceCzk || '0');

  const handleAddToCart = () => {
    onAddToCart({
      id: product.id,
      name: product.name,
      price: price,
      type: 'product',
      sku: product.sku,
      landingCost: product.latestLandingCost
    });
  };

  const isLowStock = (product.quantity || 0) <= (product.lowStockAlert || 5);
  const isOutOfStock = (product.quantity || 0) === 0;
  const isBelowCost = product.latestLandingCost && price < product.latestLandingCost;

  return (
    <Card 
      className={cn(
        "group pos-card-interactive cursor-pointer pos-animate-fade-in-up bg-white dark:bg-slate-900 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg touch-target-large",
        isQuickAccess && "ring-2 ring-blue-500/30 bg-blue-50/50 dark:bg-blue-900/20",
        className
      )}
      onClick={handleAddToCart}
      data-testid={`product-card-${product.id}`}
    >
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            {isFavorite && (
              <Badge className="pos-badge-warning text-xs font-medium px-2 py-1">
                <Star className="mr-1 h-3 w-3 fill-current" />
                Featured
              </Badge>
            )}
            {shortcutKey && (
              <Badge variant="outline" className="text-xs font-mono bg-slate-100 dark:bg-slate-800">
                {shortcutKey}
              </Badge>
            )}
          </div>
          
          <Button
            size="sm"
            className="pos-button-primary h-8 w-8 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
            onClick={(e) => {
              e.stopPropagation();
              handleAddToCart();
            }}
            data-testid={`quick-add-${product.id}`}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-tight mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {product.name}
            </h3>
            {product.sku && (
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                SKU: {product.sku}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xl font-bold text-green-600 dark:text-green-400">
                {currency} {price.toFixed(2)}
              </span>
              {product.latestLandingCost && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Cost: {currency} {product.latestLandingCost.toFixed(2)}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {isOutOfStock && (
                <Badge variant="destructive" className="text-xs">
                  Out of Stock
                </Badge>
              )}
              {!isOutOfStock && isLowStock && (
                <Badge variant="outline" className="text-xs border-orange-300 text-orange-600 bg-orange-50 dark:bg-orange-900/20">
                  Low Stock
                </Badge>
              )}
              {isBelowCost && (
                <div className="flex items-center" title="Selling below cost!">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              <Package className="inline h-3 w-3 mr-1" />
              {product.quantity || 0} in stock
            </span>
            {product.latestLandingCost && price > product.latestLandingCost && (
              <span className="flex items-center text-green-600 dark:text-green-400">
                <TrendingUp className="h-3 w-3 mr-1" />
                {(((price - product.latestLandingCost) / product.latestLandingCost) * 100).toFixed(1)}% margin
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});