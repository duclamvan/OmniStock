import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Calendar, 
  DollarSign, 
  FileText,
  CreditCard,
  Building,
  Tag,
  RefreshCw,
  Clock
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

export default function ExpenseDetails() {
  const [, navigate] = useLocation();
  const { id } = useParams();
  const { toast } = useToast();
  const { t } = useTranslation(['financial', 'common']);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: expense, isLoading, error } = useQuery<any>({
    queryKey: [`/api/expenses/${id}`],
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('DELETE', `/api/expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      toast({
        title: t('common:success'),
        description: t('expenseDeletedSuccessfully'),
      });
      navigate('/expenses');
    },
    onError: () => {
      toast({
        title: t('common:error'),
        description: t('failedToDeleteExpense'),
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      return await apiRequest('PATCH', `/api/expenses/${id}`, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/expenses/${id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      toast({
        title: t('common:success'),
        description: t('expenseStatusUpdatedSuccessfully'),
      });
    },
    onError: () => {
      toast({
        title: t('common:error'),
        description: t('failedToUpdateExpenseStatus'),
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 bg-white dark:bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !expense) {
    return null;
  }

  // Determine currency symbol
  const getCurrencySymbol = (currency: string) => {
    switch(currency) {
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'CZK': return 'Kč';
      case 'VND': return '₫';
      case 'CNY': return '¥';
      default: return '';
    }
  };

  const symbol = getCurrencySymbol(expense.currency);
  const amount = expense.amount;
  const currency = expense.currency;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'overdue':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 overflow-x-hidden p-2 sm:p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">{t('expenseDetails')}</h1>
            <p className="text-sm sm:text-base text-muted-foreground dark:text-gray-400">{expense.expenseId}</p>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => navigate(`/expenses/edit/${id}`)}
        >
          <Edit className="mr-2 h-4 w-4" />
          {t('common:edit')}
        </Button>
      </div>

      {/* Main Details Card */}
      <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{t('expenseInformation')}</CardTitle>
              <CardDescription>
                {t('createdOn')} {format(new Date(expense.createdAt), 'PPP')}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={expense.status}
                onValueChange={(value) => updateStatusMutation.mutate(value)}
                disabled={updateStatusMutation.isPending}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={t('selectStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                      {t('pending')}
                    </div>
                  </SelectItem>
                  <SelectItem value="paid">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      {t('paid')}
                    </div>
                  </SelectItem>
                  <SelectItem value="overdue">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      {t('overdue')}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {updateStatusMutation.isPending && (
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-3 sm:p-6">
          {/* Amount and Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">{t('amount')}</p>
                  <p className="text-2xl font-bold">
                    {symbol}{parseFloat(amount).toFixed(2)} {currency}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Building className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">{t('common:name')}</p>
                  <p className="font-medium">{expense.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Tag className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">{t('category')}</p>
                  <p className="font-medium">{expense.category}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">{t('common:date')}</p>
                  <p className="font-medium">
                    {format(new Date(expense.date), 'PPP')}
                  </p>
                </div>
              </div>

              {expense.dueDate && (
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t('dueDate')}</p>
                    <p className="font-medium">
                      {format(new Date(expense.dueDate), 'PPP')}
                    </p>
                  </div>
                </div>
              )}

              {expense.paymentMethod && (
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t('paymentMethod')}</p>
                    <p className="font-medium">{expense.paymentMethod}</p>
                  </div>
                </div>
              )}

              {expense.recurring && expense.recurring !== 'none' && (
                <div className="flex items-center gap-3">
                  <RefreshCw className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t('recurring')}</p>
                    <p className="font-medium capitalize">{expense.recurring}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Description */}
          {expense.description && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-medium">{t('common:description')}</h3>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {expense.description}
              </p>
            </div>
          )}

          {/* Audit Trail */}
          <div className="space-y-2 pt-4 border-t">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-medium text-sm">{t('auditTrail')}</h3>
                <div className="text-sm text-muted-foreground space-y-1 mt-2">
                  <p>{t('created')}: {format(new Date(expense.createdAt), 'PPp')}</p>
                  {expense.updatedAt && expense.updatedAt !== expense.createdAt && (
                    <p>{t('lastUpdated')}: {format(new Date(expense.updatedAt), 'PPp')}</p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteExpense')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteExpenseConfirmation')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common:delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}