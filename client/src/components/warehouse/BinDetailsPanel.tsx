import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Package, MapPin, BarChart3, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "react-i18next";

interface BinDetailsPanelProps {
  bin: any;
  onClose: () => void;
  onUpdate: () => void;
}

export function BinDetailsPanel({ bin, onClose, onUpdate }: BinDetailsPanelProps) {
  const { t } = useTranslation(['warehouse']);
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const getOccupancyColor = (occupancy: number) => {
    if (occupancy === 0) return 'text-green-600';
    if (occupancy < 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="py-4 space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-2xl font-bold" data-testid="text-bin-code">{bin.code}</h3>
          <Badge className={getStatusColor(bin.status)} data-testid="badge-bin-status">
            {bin.status}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground" data-testid="text-bin-type">
          {bin.type} {t('binType')}
        </p>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium">{t('locationLabel')}</p>
            <p className="text-sm text-muted-foreground" data-testid="text-bin-location">
              {t('row')} {bin.row}, {t('column')} {bin.column}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('coordinates')}: ({bin.x}, {bin.y})
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <BarChart3 className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium">{t('capacity')}</p>
            <p className={`text-sm font-semibold ${getOccupancyColor(bin.occupancy || 0)}`} data-testid="text-bin-occupancy">
              {Math.round(bin.occupancy || 0)}{t('percentOccupied')}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('capacityUnits', { capacity: bin.capacity })}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium">{t('inventory')}</p>
            <p className="text-sm text-muted-foreground" data-testid="text-bin-inventory-count">
              {bin.inventoryItems || 0} {t('items')}
            </p>
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h4 className="text-sm font-semibold mb-3">{t('productsInThisBin')}</h4>
        {(!bin.products || bin.products.length === 0) ? (
          <div className="text-center py-8 text-muted-foreground" data-testid="text-no-products">
            <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{t('noProductsStoredInBin')}</p>
          </div>
        ) : (
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {bin.products.map((product: any, index: number) => (
                <div
                  key={product.id || index}
                  className="p-3 border rounded-lg hover:bg-accent transition-colors"
                  data-testid={`product-${index}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm" data-testid={`text-product-name-${index}`}>
                        {product.productId || t('unknownProduct')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('locationLabel')}: {product.locationCode}
                      </p>
                    </div>
                    <Badge variant="outline" data-testid={`badge-product-quantity-${index}`}>
                      {product.quantity || 0}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      <Separator />

      <div className="space-y-2">
        <Button variant="outline" className="w-full" disabled data-testid="button-move-inventory">
          {t('moveInventory')}
        </Button>
        <Button 
          variant="outline" 
          className="w-full"
          disabled
          data-testid="button-mark-inactive"
        >
          {bin.status === 'active' ? t('markAsInactive') : t('markAsActive')}
        </Button>
      </div>
    </div>
  );
}
