import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocalization } from "@/contexts/LocalizationContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeft, Trash2, Undo2, AlertTriangle, Package, Search, ArrowUpDown, Calendar, MoreVertical } from "lucide-react";

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

type SortOption = 'deleted_desc' | 'deleted_asc' | 'created_desc' | 'created_asc' | 'orderId_asc' | 'orderId_desc';

export default function OrdersTrash() {
  const { t } = useTranslation(['orders', 'common']);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { formatCurrency, formatDate } = useLocalization();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<any>(null);
  const [deleteAllConfirmOpen, setDeleteAllConfirmOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('deleted_desc');

  const { data: trashedOrders = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/orders/trash'],
  });

  const filteredAndSortedOrders = useMemo(() => {
    let result = [...trashedOrders];
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((order: any) => {
        const orderId = (order.orderId || '').toLowerCase();
        const customerName = (order.customer?.name || order.guestName || '').toLowerCase();
        return orderId.includes(query) || customerName.includes(query);
      });
    }
    
    result.sort((a: any, b: any) => {
      switch (sortBy) {
        case 'deleted_desc':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'deleted_asc':
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        case 'created_desc':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'created_asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'orderId_asc':
          return (a.orderId || '').localeCompare(b.orderId || '');
        case 'orderId_desc':
          return (b.orderId || '').localeCompare(a.orderId || '');
        default:
          return 0;
      }
    });
    
    return result;
  }, [trashedOrders, searchQuery, sortBy]);

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

  const deleteAllPermanentlyMutation = useMutation({
    mutationFn: async () => {
      for (const order of trashedOrders) {
        await apiRequest('DELETE', `/api/orders/${order.id}/permanent`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders/trash'] });
      toast({
        title: t('orders:allOrdersDeleted'),
        description: t('orders:trashEmptied'),
      });
      setDeleteAllConfirmOpen(false);
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders/trash'] });
      toast({
        title: t('common:error'),
        description: t('orders:deleteAllError'),
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
      <div className="flex items-center justify-between gap-4">
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
        {trashedOrders.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" data-testid="button-trash-menu">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20"
                onClick={() => setDeleteAllConfirmOpen(true)}
                data-testid="menu-delete-all-permanently"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('orders:deleteAllPermanently')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Search and Sort Controls */}
      {trashedOrders.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder={t('orders:searchTrash')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-trash"
            />
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-sort-trash">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="deleted_desc">{t('orders:sortDeletedNewest')}</SelectItem>
              <SelectItem value="deleted_asc">{t('orders:sortDeletedOldest')}</SelectItem>
              <SelectItem value="created_desc">{t('orders:sortCreatedNewest')}</SelectItem>
              <SelectItem value="created_asc">{t('orders:sortCreatedOldest')}</SelectItem>
              <SelectItem value="orderId_desc">{t('orders:sortOrderIdDesc')}</SelectItem>
              <SelectItem value="orderId_asc">{t('orders:sortOrderIdAsc')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

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
      ) : filteredAndSortedOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="h-12 w-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
            <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t('orders:noSearchResults')}
            </h3>
            <p className="text-slate-500 dark:text-slate-400">
              {t('orders:tryDifferentSearch')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredAndSortedOrders.map((order: any) => (
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
                      <p className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{t('orders:orderDate')}: {formatDate(order.createdAt)}</span>
                      </p>
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

      <AlertDialog open={deleteAllConfirmOpen} onOpenChange={setDeleteAllConfirmOpen}>
        <AlertDialogContent className="z-[1200]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              {t('orders:deleteAllPermanentlyTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('orders:deleteAllPermanentlyWarning', { count: trashedOrders.length })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAllPermanentlyMutation.mutate()}
              disabled={deleteAllPermanentlyMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteAllPermanentlyMutation.isPending ? t('common:deleting') : t('orders:deleteAllPermanently')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
