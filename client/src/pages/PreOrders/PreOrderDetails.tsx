import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Calendar, 
  User,
  Package,
  Clock,
  FileText,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Clock3,
  TrendingUp,
  Bell,
  Send,
  Mail,
  Phone,
  ChevronDown,
  ChevronUp,
  MessageSquare
} from "lucide-react";
import { format, differenceInDays, subDays } from "date-fns";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface PreOrderReminder {
  id: number;
  preOrderId: string;
  channel: string;
  scheduledFor: string;
  sentAt: string | null;
  status: string;
  errorMessage: string | null;
  recipientPhone: string | null;
  recipientEmail: string | null;
  messageContent: string | null;
  createdAt: string;
}

const statusConfig = {
  pending: {
    labelKey: "pending",
    className: "bg-amber-100 text-amber-800 border-amber-200",
    icon: Clock3,
  },
  partially_arrived: {
    labelKey: "partiallyArrived",
    className: "bg-blue-100 text-blue-800 border-blue-200",
    icon: TrendingUp,
  },
  fully_arrived: {
    labelKey: "fullyArrived",
    className: "bg-green-100 text-green-800 border-green-200",
    icon: CheckCircle2,
  },
  cancelled: {
    labelKey: "cancelled",
    className: "bg-red-100 text-red-800 border-red-200",
    icon: XCircle,
  },
};

const reminderStatusConfig = {
  pending: {
    labelKey: "reminderStatusPending",
    className: "bg-amber-100 text-amber-800 border-amber-200",
    icon: Clock3,
  },
  sent: {
    labelKey: "reminderStatusSent",
    className: "bg-green-100 text-green-800 border-green-200",
    icon: CheckCircle2,
  },
  failed: {
    labelKey: "reminderStatusFailed",
    className: "bg-red-100 text-red-800 border-red-200",
    icon: XCircle,
  },
};

export default function PreOrderDetails() {
  const { t } = useTranslation('orders');
  const { t: tCommon } = useTranslation('common');
  const [, navigate] = useLocation();
  const { id } = useParams();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSendReminderDialog, setShowSendReminderDialog] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<'sms' | 'email' | 'both'>('sms');
  const [expandedReminders, setExpandedReminders] = useState<Set<number>>(new Set());

  const { data: preOrder, isLoading, error } = useQuery<any>({
    queryKey: ['/api/pre-orders', id],
    enabled: !!id,
  });

  const { data: reminders = [] } = useQuery<PreOrderReminder[]>({
    queryKey: ['/api/pre-orders', id, 'reminders'],
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('DELETE', `/api/pre-orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pre-orders'] });
      toast({
        title: tCommon('success'),
        description: t('preOrderDeletedSuccess'),
      });
      navigate('/orders/pre-orders');
    },
    onError: () => {
      toast({
        title: tCommon('error'),
        description: t('preOrderDeleteFailed'),
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      return await apiRequest('PATCH', `/api/pre-orders/${id}`, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pre-orders', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/pre-orders'] });
      toast({
        title: tCommon('success'),
        description: t('preOrderStatusUpdatedSuccess'),
      });
    },
    onError: () => {
      toast({
        title: tCommon('error'),
        description: t('preOrderStatusUpdateFailed'),
        variant: "destructive",
      });
    },
  });

  const sendReminderMutation = useMutation({
    mutationFn: async (channel: 'sms' | 'email' | 'both') => {
      return await apiRequest('POST', `/api/pre-orders/${id}/send-reminder`, { channel });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pre-orders', id, 'reminders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pre-orders', id] });
      setShowSendReminderDialog(false);
      toast({
        title: tCommon('success'),
        description: t('reminderSent'),
      });
    },
    onError: () => {
      toast({
        title: tCommon('error'),
        description: t('reminderFailed'),
        variant: "destructive",
      });
    },
  });

  const toggleReminderExpand = (reminderId: number) => {
    setExpandedReminders(prev => {
      const next = new Set(prev);
      if (next.has(reminderId)) {
        next.delete(reminderId);
      } else {
        next.add(reminderId);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-state">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !preOrder) {
    return null;
  }

  const config = statusConfig[preOrder.status as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = config.icon;

  const calculateProgress = (item: any) => {
    if (!item.quantity) return 0;
    return Math.round((item.arrivedQuantity / item.quantity) * 100);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    try {
      return format(new Date(dateString), "PPP");
    } catch {
      return "—";
    }
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "—";
    try {
      return format(new Date(dateString), "PPP p");
    } catch {
      return "—";
    }
  };

  const calculateNextReminderDate = () => {
    if (!preOrder.expectedDate || !preOrder.reminderEnabled) return null;
    const expectedDate = new Date(preOrder.expectedDate);
    const daysBefore = preOrder.reminderDaysBefore || [1, 3];
    const now = new Date();
    
    const upcomingDates = daysBefore
      .map((days: number) => subDays(expectedDate, days))
      .filter((date: Date) => date > now)
      .sort((a: Date, b: Date) => a.getTime() - b.getTime());
    
    return upcomingDates.length > 0 ? upcomingDates[0] : null;
  };

  const calculateDaysUntilNextReminder = () => {
    const nextDate = calculateNextReminderDate();
    if (!nextDate) return null;
    return differenceInDays(nextDate, new Date());
  };

  const nextReminderDate = calculateNextReminderDate();
  const daysUntilNextReminder = calculateDaysUntilNextReminder();
  const sentReminders = reminders.filter(r => r.status === 'sent');

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'sms':
        return <Phone className="h-3 w-3" />;
      case 'email':
        return <Mail className="h-3 w-3" />;
      default:
        return <MessageSquare className="h-3 w-3" />;
    }
  };

  const getChannelLabel = (channel: string) => {
    switch (channel) {
      case 'sms':
        return t('sms');
      case 'email':
        return t('email');
      default:
        return channel.toUpperCase();
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 p-2 sm:p-4 md:p-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.history.back()}
            className="flex-shrink-0"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold truncate" data-testid="heading-pre-order-details">
              {t('preOrderDetails')}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 truncate">
              {preOrder.customer?.name || t('unknownCustomer')}
            </p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <Button
            onClick={() => setShowSendReminderDialog(true)}
            className="bg-primary w-full sm:w-auto"
            data-testid="button-send-reminder"
          >
            <Send className="h-4 w-4 mr-2" />
            {t('sendReminderNow')}
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto" data-testid="button-actions">
                <MoreVertical className="h-4 w-4 mr-2" />
                {tCommon('actions')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                onClick={() => navigate(`/orders/pre-orders/edit/${id}`)}
                data-testid="action-edit"
              >
                <Edit className="h-4 w-4 mr-2" />
                {tCommon('edit')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => updateStatusMutation.mutate('partially_arrived')}
                disabled={updateStatusMutation.isPending || preOrder.status === 'partially_arrived'}
                data-testid="action-mark-partially-arrived"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                {t('markAsPartiallyArrived')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => updateStatusMutation.mutate('fully_arrived')}
                disabled={updateStatusMutation.isPending || preOrder.status === 'fully_arrived'}
                data-testid="action-mark-fully-arrived"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {t('markAsFullyArrived')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => updateStatusMutation.mutate('cancelled')}
                disabled={updateStatusMutation.isPending || preOrder.status === 'cancelled'}
                className="text-red-600 focus:text-red-600"
                data-testid="action-cancel-pre-order"
              >
                <XCircle className="h-4 w-4 mr-2" />
                {t('cancelPreOrder')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-600 focus:text-red-600"
                data-testid="action-delete"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {tCommon('delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Header Card with Quick Stats */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-xl md:text-2xl">{t('preOrderInformation')}</CardTitle>
            <Badge 
              variant="outline" 
              className={`${config.className} px-3 py-1 text-sm font-medium border`}
              data-testid="badge-status"
            >
              <StatusIcon className="h-4 w-4 mr-2" />
              {t(config.labelKey)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">{t('customer')}</p>
                <p className="font-medium text-base" data-testid="text-customer-name">
                  {preOrder.customer?.name || t('unknownCustomer')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">{t('expectedArrivalDate')}</p>
                <p className="font-medium text-base" data-testid="text-expected-date">
                  {formatDate(preOrder.expectedDate)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">{t('createdDate')}</p>
                <p className="font-medium text-base" data-testid="text-created-date">
                  {formatDate(preOrder.createdAt)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">{t('totalItems')}</p>
                <p className="font-medium text-base" data-testid="text-total-items">
                  {preOrder.items?.length || 0} {preOrder.items?.length === 1 ? t('item') : t('items')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Bell className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">{t('reminderStatus')}</p>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline"
                    className={preOrder.reminderEnabled 
                      ? "bg-green-100 text-green-800 border-green-200" 
                      : "bg-gray-100 text-gray-800 border-gray-200"
                    }
                    data-testid="badge-reminder-status"
                  >
                    {preOrder.reminderEnabled ? t('enabled') : t('disabled')}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Send className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">{t('remindersSent')}</p>
                <p className="font-medium text-base" data-testid="text-reminders-sent">
                  {sentReminders.length}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reminder Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t('reminderSettings')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-900">
              <p className="text-sm text-muted-foreground mb-1">{t('currentSettings')}</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">{t('reminderChannel')}</span>
                  <Badge variant="secondary" className="capitalize">
                    {getChannelIcon(preOrder.reminderChannel || 'sms')}
                    <span className="ml-1">{getChannelLabel(preOrder.reminderChannel || 'sms')}</span>
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">{t('reminderDaysBefore')}</span>
                  <span className="text-sm font-medium">
                    {(preOrder.reminderDaysBefore || [1, 3]).join(', ')} {t('days')}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-900">
              <p className="text-sm text-muted-foreground mb-1">{t('upcomingReminders')}</p>
              {nextReminderDate ? (
                <div className="space-y-2">
                  <p className="font-medium">{formatDate(nextReminderDate.toISOString())}</p>
                  {daysUntilNextReminder !== null && (
                    <p className="text-sm text-muted-foreground">
                      {t('nextReminderIn', { days: daysUntilNextReminder })}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {preOrder.expectedDate ? t('reminderNotConfigured') : t('noExpectedDate')}
                </p>
              )}
            </div>

            <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-900">
              <p className="text-sm text-muted-foreground mb-1">{t('lastReminderSent')}</p>
              {preOrder.lastReminderSentAt ? (
                <div className="space-y-2">
                  <p className="font-medium">{formatDateTime(preOrder.lastReminderSentAt)}</p>
                  <Badge 
                    variant="outline"
                    className={reminderStatusConfig[preOrder.lastReminderStatus as keyof typeof reminderStatusConfig]?.className || "bg-gray-100 text-gray-800"}
                  >
                    {t(reminderStatusConfig[preOrder.lastReminderStatus as keyof typeof reminderStatusConfig]?.labelKey || 'reminderStatusPending')}
                  </Badge>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t('neverSent')}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reminder Timeline Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t('reminderTimeline')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reminders.length > 0 ? (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
              <div className="space-y-6">
                {reminders.map((reminder, index) => {
                  const statusConf = reminderStatusConfig[reminder.status as keyof typeof reminderStatusConfig] || reminderStatusConfig.pending;
                  const ReminderIcon = statusConf.icon;
                  const isExpanded = expandedReminders.has(reminder.id);

                  return (
                    <div key={reminder.id} className="relative pl-10" data-testid={`reminder-item-${reminder.id}`}>
                      <div 
                        className={`absolute left-2 w-5 h-5 rounded-full flex items-center justify-center ${
                          reminder.status === 'sent' 
                            ? 'bg-green-100 text-green-600' 
                            : reminder.status === 'failed' 
                            ? 'bg-red-100 text-red-600' 
                            : 'bg-amber-100 text-amber-600'
                        }`}
                      >
                        <ReminderIcon className="h-3 w-3" />
                      </div>
                      
                      <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-900">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="capitalize">
                              {getChannelIcon(reminder.channel)}
                              <span className="ml-1">{getChannelLabel(reminder.channel)}</span>
                            </Badge>
                            <Badge 
                              variant="outline"
                              className={statusConf.className}
                            >
                              {t(statusConf.labelKey)}
                            </Badge>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {formatDateTime(reminder.sentAt || reminder.scheduledFor)}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">{t('recipient')}: </span>
                            <span className="font-medium">
                              {reminder.channel === 'email' 
                                ? reminder.recipientEmail 
                                : reminder.recipientPhone || '—'}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{t('sentDate')}: </span>
                            <span className="font-medium">
                              {reminder.sentAt ? formatDateTime(reminder.sentAt) : t('reminderStatusPending')}
                            </span>
                          </div>
                        </div>

                        {reminder.errorMessage && (
                          <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-600 dark:text-red-400">
                            {reminder.errorMessage}
                          </div>
                        )}

                        {reminder.messageContent && (
                          <Collapsible open={isExpanded} onOpenChange={() => toggleReminderExpand(reminder.id)}>
                            <CollapsibleTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="mt-3 w-full justify-start text-muted-foreground"
                                data-testid={`button-toggle-message-${reminder.id}`}
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronUp className="h-4 w-4 mr-2" />
                                    {t('hideMessage')}
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="h-4 w-4 mr-2" />
                                    {t('viewMessage')}
                                  </>
                                )}
                              </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="mt-2 p-3 bg-white dark:bg-slate-800 border rounded text-sm">
                                <p className="text-muted-foreground mb-1 text-xs uppercase">{t('messageContent')}</p>
                                <p className="whitespace-pre-wrap">{reminder.messageContent}</p>
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <Bell className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500 text-center" data-testid="text-no-reminders">
                {t('noRemindersYet')}
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setShowSendReminderDialog(true)}
                data-testid="button-send-first-reminder"
              >
                <Send className="h-4 w-4 mr-2" />
                {t('sendReminderNow')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Items Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t('preOrderItems')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {preOrder.items && preOrder.items.length > 0 ? (
            <div className="space-y-4">
              {preOrder.items.map((item: any, index: number) => {
                const progress = calculateProgress(item);
                const isFullyArrived = item.arrivedQuantity >= item.quantity;
                const isPartiallyArrived = item.arrivedQuantity > 0 && item.arrivedQuantity < item.quantity;

                return (
                  <div
                    key={item.id}
                    className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-900 space-y-3"
                    data-testid={`item-${item.id}`}
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-base" data-testid={`text-item-name-${item.id}`}>
                          {item.name || item.itemName}
                        </h3>
                        {(item.description || item.itemDescription) && (
                          <p className="text-sm text-muted-foreground mt-1" data-testid={`text-item-description-${item.id}`}>
                            {item.description || item.itemDescription}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            isFullyArrived
                              ? "bg-green-100 text-green-800 border-green-200"
                              : isPartiallyArrived
                              ? "bg-blue-100 text-blue-800 border-blue-200"
                              : "bg-gray-100 text-gray-800 border-gray-200"
                          }
                          data-testid={`badge-item-status-${item.id}`}
                        >
                          {item.arrivedQuantity} / {item.quantity} {t('arrived')}
                        </Badge>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>{t('arrivalProgress')}</span>
                        <span data-testid={`text-progress-${item.id}`}>{progress}%</span>
                      </div>
                      <Progress 
                        value={progress} 
                        className="h-2"
                        data-testid={`progress-bar-${item.id}`}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t text-sm">
                      <div>
                        <p className="text-muted-foreground">{t('orderedQuantity')}</p>
                        <p className="font-medium" data-testid={`text-quantity-${item.id}`}>
                          {item.quantity}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t('arrivedQuantity')}</p>
                        <p className="font-medium" data-testid={`text-arrived-quantity-${item.id}`}>
                          {item.arrivedQuantity || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500 text-center" data-testid="text-no-items">
                {t('noItemsInPreOrder')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes Card (only show if notes exist) */}
      {preOrder.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t('notes')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap" data-testid="text-notes">
              {preOrder.notes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deletePreOrder')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deletePreOrderConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              {tCommon('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              {tCommon('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send Reminder Dialog */}
      <Dialog open={showSendReminderDialog} onOpenChange={setShowSendReminderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('sendReminderConfirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('sendReminderConfirmDesc')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">{t('selectChannel')}</label>
            <Select value={selectedChannel} onValueChange={(value: 'sms' | 'email' | 'both') => setSelectedChannel(value)}>
              <SelectTrigger data-testid="select-channel">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sms">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {t('sms')}
                  </div>
                </SelectItem>
                <SelectItem value="email">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {t('email')}
                  </div>
                </SelectItem>
                <SelectItem value="both">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    {t('bothChannels')}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {(selectedChannel === 'sms' || selectedChannel === 'both') && (
              <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('reminderWillBeSentTo')}:</span>
                  <span className="font-medium">
                    {preOrder.reminderPhone || preOrder.customer?.billingTel || '—'}
                  </span>
                </div>
              </div>
            )}

            {(selectedChannel === 'email' || selectedChannel === 'both') && (
              <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('reminderWillBeSentTo')}:</span>
                  <span className="font-medium">
                    {preOrder.reminderEmail || preOrder.customer?.billingEmail || '—'}
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowSendReminderDialog(false)}
              data-testid="button-cancel-send-reminder"
            >
              {tCommon('cancel')}
            </Button>
            <Button 
              onClick={() => sendReminderMutation.mutate(selectedChannel)}
              disabled={sendReminderMutation.isPending}
              data-testid="button-confirm-send-reminder"
            >
              {sendReminderMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  {t('sending')}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {t('sendReminder')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
