import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocalization } from "@/contexts/LocalizationContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Trash2, Undo2, AlertTriangle, Package, ChevronDown, ChevronUp } from "lucide-react";

// Component to display order items for a trashed order
function OrderItemsList({ orderId, currency }: { orderId: string; currency: string }) {
  const { formatCurrency } = useLocalization();
  const { t } = useTranslation(['orders']);
  
  const { data: items = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/orders', orderId, 'items'],
  });

  if (isLoading) {
    return <div className="text-xs text-slate-400 animate-pulse">{t('common:loading')}...</div>;
  }

  if (items.length === 0) {
    return <div className="text-xs text-slate-400">{t('orders:noItems')}</div>;
  }

  return (
    <div className="mt-2 space-y-1">
      {items.map((item: any) => (
        <div key={item.id} className="flex justify-between text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded px-2 py-1">
          <span className="flex-1 truncate">
            {item.quantity}× {item.productName}
            {item.isVirtual && <Badge variant="outline" className="ml-1 text-[9px] px-1 py-0">Virtual</Badge>}
          </span>
          <span className="ml-2 font-medium">
            {formatCurrency(parseFloat(item.total || '0'), currency)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function OrdersTrash() {
  const { t } = useTranslation(['orders', 'common']);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { formatCurrency, formatDate } = useLocalization();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<any>(null);

  const { data: trashedOrders = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/orders/trash'],
  });

  const restoreMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return apiRequest('POST', `/api/orders/${orderId}/restore`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders/trash'] });
      toast({
        title: t('orders:orderRestored'),
        description: t('orders:orderRestoredDescription'),
      });
    },
    onError: () => {
      toast({
        title: t('common:error'),
        description: t('orders:restoreError'),
        variant: "destructive",
      });
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return apiRequest('DELETE', `/api/orders/${orderId}/permanent`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders/trash'] });
      toast({
        title: t('orders:orderPermanentlyDeleted'),
        description: t('orders:inventoryRestored'),
      });
      setDeleteConfirmOpen(false);
      setOrderToDelete(null);
    },
    onError: () => {
      toast({
        title: t('common:error'),
        description: t('orders:permanentDeleteError'),
        variant: "destructive",
      });
    },
  });

  const handleRestore = (orderId: string) => {
    restoreMutation.mutate(orderId);
  };

  const handlePermanentDelete = (order: any) => {
    setOrderToDelete(order);
    setDeleteConfirmOpen(true);
  };

  const confirmPermanentDelete = () => {
    if (orderToDelete) {
      permanentDeleteMutation.mutate(orderToDelete.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-slate-600 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-slate-600 dark:text-slate-400">{t('common:loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/orders')} data-testid="button-back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Trash2 className="h-6 w-6 sm:h-8 sm:w-8 text-slate-500" />
            {t('orders:trash')}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t('orders:trashDescription')}
          </p>
        </div>
      </div>

      {trashedOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
            <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t('orders:trashEmpty')}
            </h3>
            <p className="text-slate-500 dark:text-slate-400">
              {t('orders:trashEmptyDescription')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {trashedOrders.map((order: any) => (
            <Card key={order.id} className="border-slate-200 dark:border-slate-700">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-lg">{order.orderId}</span>
                      <Badge variant="secondary">{order.orderStatus}</Badge>
                      {order.pickStatus === 'completed' && (
                        <Badge variant="outline" className="text-green-600 border-green-300">Picked</Badge>
                      )}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400 space-y-0.5">
                      <p>{order.customer?.name || t('orders:walkInCustomer')}</p>
                      <p>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {formatCurrency(parseFloat(order.grandTotal || '0'), order.currency || 'EUR')}
                        </span>
                        {' • '}
                        {t('orders:deletedOn')}: {formatDate(order.updatedAt)}
                      </p>
                    </div>
                    <OrderItemsList orderId={order.id} currency={order.currency || 'EUR'} />
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestore(order.id)}
                      disabled={restoreMutation.isPending}
                      data-testid={`button-restore-${order.id}`}
                    >
                      <Undo2 className="h-4 w-4 mr-1" />
                      {t('orders:restore')}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handlePermanentDelete(order)}
                      disabled={permanentDeleteMutation.isPending}
                      data-testid={`button-permanent-delete-${order.id}`}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      {t('orders:deletePermanently')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="z-[1200]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              {t('orders:permanentDeleteTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('orders:permanentDeleteWarning', { orderId: orderToDelete?.orderId })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmPermanentDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {t('orders:deletePermanently')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
