import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { formatCurrency } from "@/lib/currencyUtils";
import { Skeleton } from "@/components/ui/skeleton";

interface OrderItem {
  id?: number;
  productId?: string;
  bundleId?: string;
  productName: string;
  quantity: number;
  price?: string | number;
  total?: string | number;
  sku?: string;
  image?: string;
}

interface OrderItemsLoaderProps {
  orderId: string;
  currency?: string;
  variant?: 'compact' | 'full' | 'mobile';
  maxItems?: number;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

export function OrderItemsLoader({
  orderId,
  currency = 'EUR',
  variant = 'compact',
  maxItems = 5,
  expanded = false,
  onToggleExpand,
}: OrderItemsLoaderProps) {
  const { t } = useTranslation(['orders', 'common']);

  const { data: items = [], isLoading, error } = useQuery<OrderItem[]>({
    queryKey: ['/api/orders', orderId, 'items'],
    queryFn: async () => {
      const response = await fetch(`/api/orders/${orderId}/items`);
      if (!response.ok) throw new Error('Failed to fetch order items');
      return response.json();
    },
    staleTime: 60000,
    gcTime: 300000,
  });

  if (isLoading) {
    return <OrderItemsSkeleton variant={variant} count={2} />;
  }

  if (error || items.length === 0) {
    return null;
  }

  const displayedItems = expanded ? items : items.slice(0, maxItems);
  const hasMore = items.length > maxItems;

  if (variant === 'mobile') {
    return (
      <div className="border-t border-gray-100 dark:border-slate-800 pt-2">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('orders:itemsColon')}</p>
        <div className="space-y-1">
          {displayedItems.map((item, idx) => (
            <p key={item.id || idx} className="text-xs text-gray-700 dark:text-gray-300 truncate">
              <span className="font-medium text-blue-600 dark:text-blue-400">{item.quantity}×</span> {item.productName}
            </p>
          ))}
          {hasMore && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand?.();
              }}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium cursor-pointer hover:underline transition-colors"
              data-testid={`button-toggle-items-${orderId}`}
            >
              {expanded 
                ? t('orders:showLess')
                : t('orders:moreItems', { count: items.length - maxItems })}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div>
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">{t('orders:orderItemsHeader')}</h4>
        <div className="space-y-2">
          {items.map((item, index) => (
            <div
              key={item.id || index}
              className="flex items-center justify-between py-2 px-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-slate-900 dark:text-slate-100">
                  <span className="text-blue-600 dark:text-blue-400">{item.quantity}×</span> {item.productName}
                </p>
                {item.sku && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('orders:sku')} {item.sku}</p>
                )}
              </div>
              <div className="text-right ml-4">
                <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                  {formatCurrency(parseFloat(String(item.total || 0)), currency)}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {formatCurrency(parseFloat(String(item.price || 0)), currency)} {t('orders:each')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <span className="text-gray-600 dark:text-gray-400">
      {t('orders:itemsWithCount', { count: items.length })}
    </span>
  );
}

function OrderItemsSkeleton({ variant, count = 2 }: { variant: string; count?: number }) {
  if (variant === 'mobile') {
    return (
      <div className="border-t border-gray-100 dark:border-slate-800 pt-2">
        <div className="h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1"></div>
        <div className="space-y-1">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div>
        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-3"></div>
        <div className="space-y-2">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2 px-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="flex-1">
                <Skeleton className="h-4 w-48 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="text-right ml-4">
                <Skeleton className="h-4 w-16 mb-1" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <span className="inline-block h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />;
}

export function useOrderItemsCount(orderId: string) {
  const { data: items = [] } = useQuery<OrderItem[]>({
    queryKey: ['/api/orders', orderId, 'items'],
    queryFn: async () => {
      const response = await fetch(`/api/orders/${orderId}/items`);
      if (!response.ok) throw new Error('Failed to fetch order items');
      return response.json();
    },
    staleTime: 60000,
    gcTime: 300000,
  });

  return items.length;
}
