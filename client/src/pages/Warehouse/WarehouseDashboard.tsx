import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Package, 
  Truck, 
  ClipboardList,
  Clock,
  CheckCircle2,
  ArrowRight,
  AlertTriangle,
  Calendar,
  User
} from "lucide-react";
import { Link } from "wouter";
import { formatDate } from "@/lib/currencyUtils";
import { useTranslation } from 'react-i18next';
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface WarehouseDashboardData {
  ordersToPickPack: Array<{
    id: string;
    orderId: string;
    status: string;
    pickStatus?: string;
    packStatus?: string;
    customer?: { name?: string };
    items?: Array<{ productName: string; quantity: number }>;
    createdAt: string;
  }>;
  pickPackStats: {
    pending: number;
    picking: number;
    packing: number;
    ready: number;
  };
  receivingTasks: Array<{
    id: number;
    supplier: string;
    trackingNumber?: string;
    receivingStatus: string;
    estimatedArrival?: string;
  }>;
  incomingShipments: Array<{
    id: number;
    supplier: string;
    trackingNumber?: string;
    estimatedArrival: string;
    status: string;
  }>;
  adminTasks: Array<{
    id: number;
    title: string;
    description?: string;
    type: string;
    priority: string;
    status: string;
    dueAt?: string;
    assignedToUserId?: string;
    createdByUserId: string;
    notes?: string;
    createdAt: string;
  }>;
}

export default function WarehouseDashboard() {
  const { t } = useTranslation('common');
  const { toast } = useToast();
  
  const { data, isLoading } = useQuery<WarehouseDashboardData>({
    queryKey: ['/api/dashboard/warehouse'],
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      return apiRequest('PATCH', `/api/warehouse-tasks/${taskId}`, { status: 'completed' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/warehouse'] });
      queryClient.invalidateQueries({ queryKey: ['/api/warehouse-tasks'] });
      toast({
        title: t('success'),
        description: t('updateSuccess'),
      });
    },
    onError: () => {
      toast({
        title: t('error'),
        description: t('updateFailed'),
        variant: 'destructive',
      });
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'medium': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getTaskTypeLabel = (type: string) => {
    switch (type) {
      case 'general': return t('generalTask');
      case 'urgent': return t('urgentTask');
      case 'inventory': return t('inventoryTask');
      case 'maintenance': return t('maintenanceTask');
      case 'other': return t('otherTask');
      default: return type;
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent': return t('urgent');
      case 'high': return t('high');
      case 'medium': return t('medium');
      case 'low': return t('low');
      default: return priority;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
      case 'processing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'confirmed': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getArrivingLabel = (estimatedArrival: string) => {
    const arrivalDate = new Date(estimatedArrival);
    const now = new Date();
    const diffDays = Math.ceil((arrivalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return t('today');
    if (diffDays === 1) return t('tomorrow');
    return `${diffDays} ${t('days')}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48 mt-2" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="h-80">
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-40 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const ordersToPickPack = data?.ordersToPickPack || [];
  const pickPackStats = data?.pickPackStats || { pending: 0, picking: 0, packing: 0, ready: 0 };
  const receivingTasks = data?.receivingTasks || [];
  const incomingShipments = data?.incomingShipments || [];
  const adminTasks = data?.adminTasks || [];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100">
            {t('warehouseDashboard')}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {t('warehouseDashboardSubtitle')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="border-l-4 border-l-blue-500" data-testid="card-orders-to-pick">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Package className="h-5 w-5 text-blue-600" />
              {t('ordersToPickPack')}
              {ordersToPickPack.length > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {ordersToPickPack.length}
                </Badge>
              )}
            </CardTitle>
            <p className="text-xs text-muted-foreground">{t('ordersToPickPackDesc')}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Pick & Pack Stats Overview */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 rounded-lg p-2 text-center" data-testid="stat-pending">
                <div className="text-lg font-bold text-orange-600 dark:text-orange-400">{pickPackStats.pending}</div>
                <div className="text-[10px] text-orange-700 dark:text-orange-200">{t('pending')}</div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-2 text-center" data-testid="stat-picking">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{pickPackStats.picking}</div>
                <div className="text-[10px] text-blue-700 dark:text-blue-200">{t('picking')}</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg p-2 text-center" data-testid="stat-packing">
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{pickPackStats.packing}</div>
                <div className="text-[10px] text-purple-700 dark:text-purple-200">{t('packing')}</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-2 text-center" data-testid="stat-ready">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">{pickPackStats.ready}</div>
                <div className="text-[10px] text-green-700 dark:text-green-200">{t('ready')}</div>
              </div>
            </div>
            
            {/* Orders List */}
            <div className="max-h-40 overflow-y-auto space-y-2">
            {ordersToPickPack.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-4 text-center text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mb-2 text-green-500" />
                <p className="text-sm">{t('noOrdersToPick')}</p>
              </div>
            ) : (
              ordersToPickPack.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg" data-testid={`row-order-${order.id}`}>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">#{order.orderId}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {order.customer?.name || 'Unknown'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(order.pickStatus || order.status)} variant="secondary">
                      {order.pickStatus === 'in_progress' ? 'picking' : 
                       order.packStatus === 'in_progress' ? 'packing' :
                       order.packStatus === 'completed' ? 'ready' :
                       order.pickStatus === 'completed' ? 'packing' : 'pending'}
                    </Badge>
                    <Link href={`/orders/${order.id}`}>
                      <Button size="sm" variant="outline" className="min-h-[32px] h-8" data-testid={`button-pick-${order.id}`}>
                        {t('view')}
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
            </div>
            {ordersToPickPack.length > 5 && (
              <Link href="/pick-pack">
                <Button variant="ghost" className="w-full text-sm" data-testid="button-view-all-orders">
                  {t('view')} {ordersToPickPack.length - 5} {t('more')}...
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500" data-testid="card-receiving-tasks">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <ClipboardList className="h-5 w-5 text-green-600" />
              {t('receivingTasks')}
              {receivingTasks.length > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {receivingTasks.length}
                </Badge>
              )}
            </CardTitle>
            <p className="text-xs text-muted-foreground">{t('receivingTasksDesc')}</p>
          </CardHeader>
          <CardContent className="space-y-3 max-h-64 overflow-y-auto">
            {receivingTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 mb-2 text-green-500" />
                <p className="text-sm">{t('noReceivingTasks')}</p>
              </div>
            ) : (
              receivingTasks.slice(0, 5).map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg" data-testid={`row-receiving-${task.id}`}>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{task.supplier}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {task.trackingNumber || 'No tracking'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(task.receivingStatus)} variant="secondary">
                      {task.receivingStatus}
                    </Badge>
                    <Link href={`/receiving/${task.id}`}>
                      <Button size="sm" variant="outline" className="min-h-[36px]" data-testid={`button-receive-${task.id}`}>
                        {t('continueReceiving')}
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500" data-testid="card-incoming-shipments">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Truck className="h-5 w-5 text-amber-600" />
              {t('incomingShipments')}
              {incomingShipments.length > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {incomingShipments.length}
                </Badge>
              )}
            </CardTitle>
            <p className="text-xs text-muted-foreground">{t('incomingShipmentsDesc')}</p>
          </CardHeader>
          <CardContent className="space-y-3 max-h-64 overflow-y-auto">
            {incomingShipments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 mb-2 text-green-500" />
                <p className="text-sm">{t('noIncomingShipments')}</p>
              </div>
            ) : (
              incomingShipments.slice(0, 5).map((shipment) => (
                <div key={shipment.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg" data-testid={`row-shipment-${shipment.id}`}>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{shipment.supplier}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {shipment.trackingNumber || 'No tracking'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" variant="secondary">
                      <Clock className="h-3 w-3 mr-1" />
                      {t('arrivingIn')} {getArrivingLabel(shipment.estimatedArrival)}
                    </Badge>
                    <Link href={`/imports/kanban`}>
                      <Button size="sm" variant="outline" className="min-h-[36px]" data-testid={`button-shipment-${shipment.id}`}>
                        {t('viewShipment')}
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500" data-testid="card-admin-tasks">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <AlertTriangle className="h-5 w-5 text-purple-600" />
              {t('adminTasks')}
              {adminTasks.length > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {adminTasks.length}
                </Badge>
              )}
            </CardTitle>
            <p className="text-xs text-muted-foreground">{t('adminTasksDesc')}</p>
          </CardHeader>
          <CardContent className="space-y-3 max-h-64 overflow-y-auto">
            {adminTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 mb-2 text-green-500" />
                <p className="text-sm">{t('noAdminTasks')}</p>
              </div>
            ) : (
              adminTasks.slice(0, 5).map((task) => (
                <div key={task.id} className="flex flex-col p-3 bg-muted/50 rounded-lg" data-testid={`row-task-${task.id}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm">{task.title}</p>
                      {task.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {task.description}
                        </p>
                      )}
                    </div>
                    <Badge className={getPriorityColor(task.priority)} variant="secondary">
                      {getPriorityLabel(task.priority)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs">
                        {getTaskTypeLabel(task.type)}
                      </Badge>
                      {task.dueAt && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(task.dueAt)}
                        </span>
                      )}
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="min-h-[32px] text-xs"
                      onClick={() => completeTaskMutation.mutate(task.id)}
                      disabled={completeTaskMutation.isPending}
                      data-testid={`button-complete-task-${task.id}`}
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {t('markComplete')}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
