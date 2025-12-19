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
  CheckCircle2,
  XCircle,
  Clock3,
  TrendingUp,
  Bell,
  Send,
  Mail,
  Phone,
  MapPin
} from "lucide-react";
import { format } from "date-fns";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { Separator } from "@/components/ui/separator";

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

const priorityConfig = {
  low: { className: "bg-slate-100 text-slate-700", label: "Low" },
  normal: { className: "bg-blue-100 text-blue-700", label: "Normal" },
  high: { className: "bg-orange-100 text-orange-700", label: "High" },
  urgent: { className: "bg-red-100 text-red-700", label: "Urgent" },
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

  const { data: preOrder, isLoading, error } = useQuery<any>({
    queryKey: ['/api/pre-orders', id],
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-state">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !preOrder) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">{t('preOrderNotFound')}</p>
        <Button onClick={() => navigate('/orders/pre-orders')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('backToPreOrders')}
        </Button>
      </div>
    );
  }

  const config = statusConfig[preOrder.status as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = config.icon;
  const priority = priorityConfig[preOrder.priority as keyof typeof priorityConfig] || priorityConfig.normal;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    try {
      return format(new Date(dateString), "PPP");
    } catch {
      return "—";
    }
  };

  const customer = preOrder.customer;

  return (
    <div className="max-w-4xl mx-auto space-y-4 p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/orders/pre-orders')}
            className="flex-shrink-0"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold truncate" data-testid="heading-pre-order-details">
              {t('preOrderDetails')}
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/orders/pre-orders/edit/${id}`)}
            data-testid="button-edit"
          >
            <Edit className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{tCommon('edit')}</span>
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            data-testid="button-delete"
          >
            <Trash2 className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{tCommon('delete')}</span>
          </Button>
        </div>
      </div>

      {/* Status & Priority Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge 
          variant="outline" 
          className={`${config.className} px-3 py-1.5`}
          data-testid="badge-status"
        >
          <StatusIcon className="h-4 w-4 mr-1.5" />
          {t(config.labelKey)}
        </Badge>
        <Badge 
          variant="outline" 
          className={`${priority.className} px-3 py-1.5`}
          data-testid="badge-priority"
        >
          {t(`priority${preOrder.priority?.charAt(0).toUpperCase()}${preOrder.priority?.slice(1)}` || 'priorityNormal')}
        </Badge>
        {preOrder.reminderEnabled && (
          <Badge 
            variant="outline" 
            className="bg-green-50 text-green-700 border-green-200 px-3 py-1.5"
            data-testid="badge-reminder"
          >
            <Bell className="h-3.5 w-3.5 mr-1.5" />
            {t('remindersEnabled')}
          </Badge>
        )}
      </div>

      {/* Main Content - Two Column on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column - Customer & Details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Customer Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                {t('customer')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-semibold text-lg" data-testid="text-customer-name">
                  {customer?.name || t('unknownCustomer')}
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {customer?.billingEmail && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{customer.billingEmail}</span>
                  </div>
                )}
                {customer?.billingTel && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4 flex-shrink-0" />
                    <span>{customer.billingTel}</span>
                  </div>
                )}
                {customer?.country && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span>{customer.country}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Items Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                {t('preOrderItems')} ({preOrder.items?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {preOrder.items && preOrder.items.length > 0 ? (
                <div className="divide-y">
                  {preOrder.items.map((item: any, index: number) => (
                    <div
                      key={item.id}
                      className="py-3 first:pt-0 last:pb-0"
                      data-testid={`item-${item.id}`}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate" data-testid={`text-item-name-${item.id}`}>
                            {item.itemName || item.name}
                          </p>
                          {item.itemDescription && (
                            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                              {item.itemDescription}
                            </p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="font-semibold text-lg" data-testid={`text-quantity-${item.id}`}>
                            {item.quantity}
                          </span>
                          <span className="text-muted-foreground text-sm ml-1">{t('qty')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>{t('noItemsInPreOrder')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes Card */}
          {preOrder.notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {tCommon('notes')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap" data-testid="text-notes">
                  {preOrder.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Info & Actions */}
        <div className="space-y-4">
          {/* Key Details Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('details')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">{t('estimatedArrival')}</p>
                  <p className="font-medium" data-testid="text-expected-date">
                    {formatDate(preOrder.expectedDate)}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">{t('createdDate')}</p>
                  <p className="font-medium" data-testid="text-created-date">
                    {formatDate(preOrder.createdAt)}
                  </p>
                </div>
              </div>

              {preOrder.reminderEnabled && (
                <>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <Bell className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">{t('reminderChannel')}</p>
                      <p className="font-medium capitalize">
                        {preOrder.reminderChannel === 'both' 
                          ? t('smsBothEmail') 
                          : preOrder.reminderChannel?.toUpperCase() || 'SMS'}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{tCommon('actions')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {preOrder.reminderEnabled && (
                <Button
                  className="w-full justify-start"
                  onClick={() => setShowSendReminderDialog(true)}
                  data-testid="button-send-reminder"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {t('sendReminderNow')}
                </Button>
              )}
              
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => updateStatusMutation.mutate('partially_arrived')}
                disabled={updateStatusMutation.isPending || preOrder.status === 'partially_arrived' || preOrder.status === 'fully_arrived'}
                data-testid="action-mark-partially-arrived"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                {t('markAsPartiallyArrived')}
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => updateStatusMutation.mutate('fully_arrived')}
                disabled={updateStatusMutation.isPending || preOrder.status === 'fully_arrived'}
                data-testid="action-mark-fully-arrived"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {t('markAsFullyArrived')}
              </Button>

              {preOrder.status !== 'cancelled' && (
                <Button
                  variant="ghost"
                  className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => updateStatusMutation.mutate('cancelled')}
                  disabled={updateStatusMutation.isPending}
                  data-testid="action-cancel-pre-order"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {t('cancelPreOrder')}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

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
          
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">{t('selectChannel')}</label>
              <Select value={selectedChannel} onValueChange={(value: 'sms' | 'email' | 'both') => setSelectedChannel(value)}>
                <SelectTrigger data-testid="select-channel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      SMS
                    </div>
                  </SelectItem>
                  <SelectItem value="email">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </div>
                  </SelectItem>
                  <SelectItem value="both">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      {t('smsBothEmail')}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(selectedChannel === 'sms' || selectedChannel === 'both') && (
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('sendTo')}:</span>
                  <span className="font-medium">
                    {preOrder.reminderPhone || customer?.billingTel || '—'}
                  </span>
                </div>
              </div>
            )}

            {(selectedChannel === 'email' || selectedChannel === 'both') && (
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('sendTo')}:</span>
                  <span className="font-medium">
                    {preOrder.reminderEmail || customer?.billingEmail || '—'}
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
