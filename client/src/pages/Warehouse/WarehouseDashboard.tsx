import { useQuery, useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Package, 
  Truck, 
  CheckCircle2,
  ArrowRight,
  Calendar,
  Bell,
  BellOff,
  ClipboardCheck,
  BoxesIcon,
  Clock,
  PlayCircle,
  Layers,
  ShoppingBag,
  RefreshCw,
  Plus,
  Loader2
} from "lucide-react";
import { useState, useEffect } from 'react';
import { Link } from "wouter";
import { formatDate } from "@/lib/currencyUtils";
import { useTranslation } from 'react-i18next';
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAuth } from "@/hooks/useAuth";

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
  const { t } = useTranslation(['common', 'warehouse']);
  const { toast } = useToast();
  const { isAdministrator } = useAuth();
  const [timeSinceUpdate, setTimeSinceUpdate] = useState('');
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    type: 'general',
    dueAt: ''
  });
  
  const {
    isSupported: pushSupported,
    permission: pushPermission,
    isSubscribed: isPushSubscribed,
    isSubscribing,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush
  } = usePushNotifications();
  
  const { data, isLoading, dataUpdatedAt, isFetching } = useQuery<WarehouseDashboardData>({
    queryKey: ['/api/dashboard/warehouse'],
    staleTime: 5000, // Consider data stale after 5 seconds for near real-time
    refetchInterval: 10000, // Refetch every 10 seconds for real-time order updates
    refetchOnWindowFocus: true, // Immediately refresh when returning to the page
    refetchIntervalInBackground: false, // Don't poll when tab is not active (saves resources)
  });
  
  // Update the "time since last update" display every second
  useEffect(() => {
    const updateTimeSince = () => {
      if (!dataUpdatedAt) return;
      const seconds = Math.floor((Date.now() - dataUpdatedAt) / 1000);
      if (seconds < 5) {
        setTimeSinceUpdate(t('common:justNow'));
      } else if (seconds < 60) {
        setTimeSinceUpdate(`${seconds}s ${t('common:ago')}`);
      } else {
        const minutes = Math.floor(seconds / 60);
        setTimeSinceUpdate(`${minutes}m ${t('common:ago')}`);
      }
    };
    
    updateTimeSince();
    const interval = setInterval(updateTimeSince, 1000);
    return () => clearInterval(interval);
  }, [dataUpdatedAt, t]);
  
  const handlePushToggle = async () => {
    try {
      if (isPushSubscribed) {
        await unsubscribePush();
        toast({
          title: t('common:pushNotificationsDisabled'),
          description: t('common:pushNotificationsDisabledDesc'),
        });
      } else {
        await subscribePush(['new_order']);
        toast({
          title: t('common:pushNotificationsEnabled'),
          description: t('common:pushNotificationsEnabledDesc'),
        });
      }
    } catch (error: any) {
      toast({
        title: t('common:error'),
        description: error.message || t('common:pushNotificationsFailed'),
        variant: 'destructive',
      });
    }
  };

  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      return apiRequest('PATCH', `/api/warehouse-tasks/${taskId}`, { status: 'completed' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/warehouse'] });
      queryClient.invalidateQueries({ queryKey: ['/api/warehouse-tasks'] });
      toast({
        title: t('common:success'),
        description: t('warehouse:taskCompleted'),
      });
    },
    onError: () => {
      toast({
        title: t('common:error'),
        description: t('warehouse:taskCompletionFailed'),
        variant: 'destructive',
      });
    },
  });
  
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: typeof newTask) => {
      const payload: Record<string, unknown> = {
        title: taskData.title,
        description: taskData.description || undefined,
        priority: taskData.priority,
        type: taskData.type,
        status: 'pending',
      };
      if (taskData.dueAt && taskData.dueAt.trim() !== '') {
        payload.dueAt = taskData.dueAt;
      }
      return apiRequest('POST', '/api/warehouse-tasks', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/warehouse'] });
      queryClient.invalidateQueries({ queryKey: ['/api/warehouse-tasks'] });
      toast({
        title: t('common:success'),
        description: t('warehouse:taskCreated'),
      });
      setIsAddTaskOpen(false);
      setNewTask({ title: '', description: '', priority: 'medium', type: 'general', dueAt: '' });
    },
    onError: () => {
      toast({
        title: t('common:error'),
        description: t('warehouse:taskCreationFailed'),
        variant: 'destructive',
      });
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-amber-500 text-white';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getArrivingLabel = (estimatedArrival: string) => {
    const arrivalDate = new Date(estimatedArrival);
    const now = new Date();
    const diffDays = Math.ceil((arrivalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return t('common:today');
    if (diffDays === 1) return t('common:tomorrow');
    return `${diffDays} ${t('common:days')}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-2">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  const ordersToPickPack = data?.ordersToPickPack || [];
  const pickPackStats = data?.pickPackStats || { pending: 0, picking: 0, packing: 0, ready: 0 };
  const incomingShipments = data?.incomingShipments || [];
  const adminTasks = data?.adminTasks || [];
  
  const totalOrders = pickPackStats.pending + pickPackStats.picking + pickPackStats.packing + pickPackStats.ready;
  const totalItems = ordersToPickPack.reduce((sum, order) => {
    return sum + (order.items?.reduce((itemSum, item) => itemSum + item.quantity, 0) || 0);
  }, 0);

  const today = new Date();
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Today's Header - Big and Clear */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Calendar className="h-6 w-6 opacity-80" />
              <span className="text-lg font-medium opacity-90">{dayName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">{dateStr}</h1>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Real-time Update Indicator */}
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2">
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              <span className="text-xs font-medium opacity-90">
                {isFetching ? t('common:updating') : timeSinceUpdate}
              </span>
              <div className={`w-2 h-2 rounded-full ${isFetching ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`} />
            </div>
            
            {/* Push Notification Toggle */}
            {pushSupported && (
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3">
                {isPushSubscribed ? (
                  <Bell className="h-5 w-5" />
                ) : (
                  <BellOff className="h-5 w-5 opacity-60" />
                )}
                <span className="text-sm font-medium">
                  {t('common:orderAlerts')}
                </span>
                <Switch
                  checked={isPushSubscribed}
                  onCheckedChange={handlePushToggle}
                  disabled={isSubscribing || pushPermission === 'denied'}
                  className="data-[state=checked]:bg-white data-[state=checked]:text-blue-600"
                  data-testid="switch-push-notifications"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Stats - Large Numbers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Orders */}
        <Link href="/orders/pick-pack">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border-2 border-blue-100 dark:border-blue-900 hover:border-blue-300 dark:hover:border-blue-700 transition-colors cursor-pointer" data-testid="stat-total-orders">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                <ShoppingBag className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('common:orders')}</span>
            </div>
            <div className="text-4xl font-bold text-gray-900 dark:text-gray-100">{totalOrders}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('common:toPick')}</div>
          </div>
        </Link>
        
        {/* Total Items */}
        <Link href="/orders/pick-pack">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border-2 border-purple-100 dark:border-purple-900 hover:border-purple-300 dark:hover:border-purple-700 transition-colors cursor-pointer" data-testid="stat-total-items">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                <BoxesIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('common:items')}</span>
            </div>
            <div className="text-4xl font-bold text-gray-900 dark:text-gray-100">{totalItems}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('common:toPick')}</div>
          </div>
        </Link>
        
        {/* Ready to Ship */}
        <Link href="/orders/pick-pack?tab=ready">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border-2 border-green-100 dark:border-green-900 hover:border-green-300 dark:hover:border-green-700 transition-colors cursor-pointer" data-testid="stat-ready-to-ship">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                <Truck className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('warehouse:readyToShip')}</span>
            </div>
            <div className="text-4xl font-bold text-gray-900 dark:text-gray-100">{pickPackStats.ready}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('warehouse:packed')}</div>
          </div>
        </Link>
        
        {/* Incoming */}
        <Link href="/imports/kanban">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border-2 border-amber-100 dark:border-amber-900 hover:border-amber-300 dark:hover:border-amber-700 transition-colors cursor-pointer" data-testid="stat-incoming">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
                <Package className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('common:incoming')}</span>
            </div>
            <div className="text-4xl font-bold text-gray-900 dark:text-gray-100">{incomingShipments.length}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('common:shipments')}</div>
          </div>
        </Link>
      </div>

      {/* Quick Status Bar */}
      {totalOrders > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('common:orderStatus')}</h2>
            <Link href="/orders/pick-pack">
              <Button variant="outline" size="sm" className="text-sm" data-testid="button-go-to-pickpack">
                <PlayCircle className="h-4 w-4 mr-2" />
                {t('warehouse:startPicking')}
              </Button>
            </Link>
          </div>
          <div className="flex gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-4 py-2.5 rounded-lg text-base font-medium" data-testid="status-pending">
              <Clock className="h-5 w-5" />
              <span className="text-xl font-bold">{pickPackStats.pending}</span>
              <span>{t('common:pending')}</span>
            </div>
            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-2.5 rounded-lg text-base font-medium" data-testid="status-picking">
              <Layers className="h-5 w-5" />
              <span className="text-xl font-bold">{pickPackStats.picking}</span>
              <span>{t('warehouse:picking')}</span>
            </div>
            <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-4 py-2.5 rounded-lg text-base font-medium" data-testid="status-packing">
              <Package className="h-5 w-5" />
              <span className="text-xl font-bold">{pickPackStats.packing}</span>
              <span>{t('warehouse:packing')}</span>
            </div>
            <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-4 py-2.5 rounded-lg text-base font-medium" data-testid="status-ready">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-xl font-bold">{pickPackStats.ready}</span>
              <span>{t('common:ready')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Two Column Layout for Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Shipments - Only show if there are any */}
        {incomingShipments.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b dark:border-gray-700 bg-amber-50 dark:bg-amber-900/20">
              <div className="flex items-center gap-3">
                <Truck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('common:upcomingShipments')}</h2>
              </div>
              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 text-sm px-3">
                {incomingShipments.length}
              </Badge>
            </div>
            <div className="divide-y dark:divide-gray-700">
              {incomingShipments.slice(0, 5).map((shipment) => (
                <div key={shipment.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors" data-testid={`row-shipment-${shipment.id}`}>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-base text-gray-900 dark:text-gray-100 truncate">{shipment.supplier}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {shipment.trackingNumber || t('common:noTracking')}
                    </p>
                  </div>
                  <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 text-sm whitespace-nowrap ml-3">
                    {getArrivingLabel(shipment.estimatedArrival)}
                  </Badge>
                </div>
              ))}
            </div>
            {incomingShipments.length > 5 && (
              <div className="px-5 py-3 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <Link href="/imports/kanban">
                  <Button variant="ghost" className="w-full" data-testid="button-view-all-shipments">
                    {t('common:viewAll')} ({incomingShipments.length})
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Admin Tasks - Show for admins always, or if there are tasks */}
        {(adminTasks.length > 0 || isAdministrator) && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b dark:border-gray-700 bg-red-50 dark:bg-red-900/20">
              <div className="flex items-center gap-3">
                <ClipboardCheck className="h-5 w-5 text-red-600 dark:text-red-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('warehouse:tasks')}</h2>
                {adminTasks.length > 0 && (
                  <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-sm px-3">
                    {adminTasks.length}
                  </Badge>
                )}
              </div>
              {/* Add Task Button - Admin Only */}
              {isAdministrator && (
                <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="h-9 px-4" data-testid="button-add-task">
                      <Plus className="h-4 w-4 mr-2" />
                      {t('warehouse:addTask')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                      <DialogTitle>{t('warehouse:createTask')}</DialogTitle>
                      <DialogDescription>
                        {t('warehouse:createTaskDescription')}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="task-title">{t('warehouse:taskTitle')} *</Label>
                        <Input
                          id="task-title"
                          value={newTask.title}
                          onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                          placeholder={t('warehouse:enterTaskTitle')}
                          data-testid="input-task-title"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="task-description">{t('common:description')}</Label>
                        <Textarea
                          id="task-description"
                          value={newTask.description}
                          onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                          placeholder={t('warehouse:enterTaskDescription')}
                          rows={3}
                          data-testid="input-task-description"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{t('common:priority')}</Label>
                          <Select
                            value={newTask.priority}
                            onValueChange={(value) => setNewTask(prev => ({ ...prev, priority: value }))}
                          >
                            <SelectTrigger data-testid="select-task-priority">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">{t('warehouse:low')}</SelectItem>
                              <SelectItem value="medium">{t('warehouse:medium')}</SelectItem>
                              <SelectItem value="high">{t('warehouse:high')}</SelectItem>
                              <SelectItem value="urgent">{t('warehouse:urgent')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>{t('warehouse:taskType')}</Label>
                          <Select
                            value={newTask.type}
                            onValueChange={(value) => setNewTask(prev => ({ ...prev, type: value }))}
                          >
                            <SelectTrigger data-testid="select-task-type">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="general">{t('warehouse:general')}</SelectItem>
                              <SelectItem value="inventory">{t('common:inventory')}</SelectItem>
                              <SelectItem value="receiving">{t('warehouse:receiving')}</SelectItem>
                              <SelectItem value="shipping">{t('warehouse:shipping')}</SelectItem>
                              <SelectItem value="cleaning">{t('warehouse:cleaning')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="task-due-date">{t('common:dueDate')}</Label>
                        <Input
                          id="task-due-date"
                          type="date"
                          value={newTask.dueAt}
                          onChange={(e) => setNewTask(prev => ({ ...prev, dueAt: e.target.value }))}
                          data-testid="input-task-due-date"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsAddTaskOpen(false)}
                        data-testid="button-cancel-task"
                      >
                        {t('common:cancel')}
                      </Button>
                      <Button
                        onClick={() => createTaskMutation.mutate(newTask)}
                        disabled={!newTask.title.trim() || createTaskMutation.isPending}
                        data-testid="button-create-task"
                      >
                        {createTaskMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            {t('warehouse:creating')}
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            {t('warehouse:createTask')}
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            {adminTasks.length > 0 ? (
              <div className="divide-y dark:divide-gray-700">
                {adminTasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors" data-testid={`row-task-${task.id}`}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={`${getPriorityColor(task.priority)} text-xs px-2 py-0.5`}>
                          {task.priority.toUpperCase()}
                        </Badge>
                        {task.dueAt && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(task.dueAt)}
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-base text-gray-900 dark:text-gray-100">{task.title}</p>
                      {task.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">{task.description}</p>
                      )}
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="ml-3 shrink-0"
                      onClick={() => completeTaskMutation.mutate(task.id)}
                      disabled={completeTaskMutation.isPending}
                      data-testid={`button-complete-task-${task.id}`}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-5 py-8 text-center">
                <ClipboardCheck className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('warehouse:noTasksYet')}</p>
                {isAdministrator && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {t('warehouse:clickAddTaskToCreate')}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Empty State - When everything is done (don't show if admin can see task panel) */}
      {totalOrders === 0 && incomingShipments.length === 0 && adminTasks.length === 0 && !isAdministrator && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-12 shadow-sm border dark:border-gray-700 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('warehouse:allCaughtUp')}</h2>
          <p className="text-gray-500 dark:text-gray-400 text-lg">{t('warehouse:noTasksToday')}</p>
        </div>
      )}
    </div>
  );
}
