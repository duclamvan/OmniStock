import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Printer,
  Wrench
} from "lucide-react";
import { formatCzechDate } from "@/lib/dateUtils";
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

interface ServiceItem {
  id: string;
  serviceId: string;
  productId: string;
  productName: string;
  sku: string | null;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  createdAt: string;
  updatedAt: string;
}

interface Service {
  id: string;
  customerId: string | null;
  orderId: string | null;
  customer?: {
    id: string;
    name: string;
  } | null;
  order?: {
    id: string;
    orderId: string;
  } | null;
  name: string;
  description: string | null;
  serviceDate: string | null;
  serviceCost: string;
  partsCost: string;
  totalCost: string;
  currency: string;
  status: string;
  notes: string | null;
  items?: ServiceItem[];
  createdAt: string;
  updatedAt: string;
}

export default function ServiceDetails() {
  const [, navigate] = useLocation();
  const { id } = useParams();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: service, isLoading, error } = useQuery<Service>({
    queryKey: [`/api/services/${id}`],
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('DELETE', `/api/services/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      toast({
        title: "Success",
        description: "Service deleted successfully",
      });
      navigate('/services');
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete service",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      return await apiRequest('PATCH', `/api/services/${id}`, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/services/${id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      toast({
        title: "Success",
        description: "Service status updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update service status",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-spinner">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !service) {
    return null;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900" data-testid="badge-status-pending">Pending</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900" data-testid="badge-status-in-progress">In Progress</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 hover:bg-green-100 dark:hover:bg-green-900" data-testid="badge-status-completed">Completed</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 hover:bg-red-100 dark:hover:bg-red-900" data-testid="badge-status-cancelled">Cancelled</Badge>;
      default:
        return <Badge variant="outline" data-testid={`badge-status-${status}`}>{status}</Badge>;
    }
  };

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount || '0');
    const currency = service?.currency || 'EUR';
    const symbols: Record<string, string> = {
      'USD': '$',
      'EUR': '€',
      'CZK': 'Kč',
      'VND': '₫',
      'CNY': '¥'
    };
    const symbol = symbols[currency] || currency;
    return currency === 'CZK' 
      ? `${num.toFixed(2)} ${symbol}`
      : `${symbol}${num.toFixed(2)}`;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Action Bar - Hidden on print */}
      <div className="bg-white dark:bg-slate-900 border-b print:hidden sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/services')}
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <h2 className="font-semibold text-sm">Service Bill</h2>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              data-testid="button-print"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/services/${id}/edit`)}
              data-testid="button-edit"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              data-testid="button-delete"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Bill Document */}
      <div className="max-w-5xl mx-auto p-6">
        <div className="bg-white dark:bg-slate-900 shadow-lg rounded-lg border border-slate-200 dark:border-slate-800">
          {/* Bill Header */}
          <div className="p-8 border-b-4 border-slate-900 dark:border-slate-700">
            <div className="flex justify-between items-start mb-8">
              {/* Company Info */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Wrench className="h-6 w-6 text-slate-700 dark:text-slate-300" />
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-white">SERVICE BILL</h1>
                </div>
                <p className="text-slate-600 dark:text-slate-400 font-medium">Davie Supply</p>
                <p className="text-sm text-slate-500 dark:text-slate-500">Professional Service & Repair</p>
              </div>
              
              {/* Bill Number & Status */}
              <div className="text-right">
                <div className="mb-3">
                  <p className="text-xs text-slate-500 dark:text-slate-500 uppercase tracking-wide mb-1">Bill ID</p>
                  <p className="text-lg font-mono font-semibold text-slate-900 dark:text-white" data-testid="text-service-id">
                    #{id?.substring(0, 8).toUpperCase()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-500 uppercase tracking-wide mb-2">Status</p>
                  <div className="flex flex-col gap-2 items-end">
                    {/* Visual Status Badge */}
                    <div className="print:block">
                      {getStatusBadge(service.status)}
                    </div>
                    {/* Status Selector - Hidden on Print */}
                    <div className="print:hidden">
                      <Select
                        value={service.status}
                        onValueChange={(value) => updateStatusMutation.mutate(value)}
                        disabled={updateStatusMutation.isPending}
                      >
                        <SelectTrigger className="w-[140px]" data-testid="select-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending" data-testid="option-status-pending">
                            Pending
                          </SelectItem>
                          <SelectItem value="in_progress" data-testid="option-status-in-progress">
                            In Progress
                          </SelectItem>
                          <SelectItem value="completed" data-testid="option-status-completed">
                            Completed
                          </SelectItem>
                          <SelectItem value="cancelled" data-testid="option-status-cancelled">
                            Cancelled
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bill To & Date Info */}
            <div className="grid grid-cols-2 gap-8">
              {/* Bill To */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wide mb-3">Bill To</h3>
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded border border-slate-200 dark:border-slate-700">
                  <p className="font-semibold text-lg text-slate-900 dark:text-white mb-1" data-testid="text-customer-name">
                    {service.customer?.name || 'Walk-in Customer'}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Customer ID: {service.customerId?.substring(0, 8).toUpperCase() || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Service Information */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wide mb-3">Service Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Service Date:</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white" data-testid="text-service-date">
                      {formatCzechDate(service.serviceDate)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Bill Created:</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white" data-testid="text-created-at">
                      {formatCzechDate(service.createdAt)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Currency:</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white" data-testid="text-currency">
                      {service.currency || 'EUR'}
                    </span>
                  </div>
                  {service.orderId && service.order && (
                    <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Linked Order:</span>
                      <span className="text-sm font-semibold text-blue-600 hover:text-blue-700 cursor-pointer" data-testid="text-linked-order" onClick={() => navigate(`/orders/${service.orderId}`)}>
                        {service.order.orderId}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Service Description */}
          <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wide mb-2">Service Description</h3>
            <p className="text-lg font-semibold text-slate-900 dark:text-white mb-2" data-testid="text-service-name">
              {service.name}
            </p>
            {service.description && (
              <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap" data-testid="text-description">
                {service.description}
              </p>
            )}
          </div>

          {/* Itemized Parts & Services */}
          <div className="px-8 py-6">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wide mb-4">Parts & Materials Used</h3>
            
            {/* Items Table */}
            <div className="overflow-x-auto mb-6">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-slate-900 dark:border-slate-700">
                    <th className="text-left py-3 text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide" data-testid="header-product-name">
                      Item Description
                    </th>
                    <th className="text-left py-3 text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide" data-testid="header-sku">
                      SKU
                    </th>
                    <th className="text-center py-3 text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide" data-testid="header-quantity">
                      Qty
                    </th>
                    <th className="text-right py-3 text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide" data-testid="header-unit-price">
                      Unit Price
                    </th>
                    <th className="text-right py-3 text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide" data-testid="header-total-price">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {service.items && service.items.length > 0 ? (
                    service.items.map((item, index) => (
                      <tr 
                        key={item.id} 
                        className={index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/30'}
                        data-testid={`row-item-${item.id}`}
                      >
                        <td className="py-3 text-sm text-slate-900 dark:text-white" data-testid={`text-product-name-${item.id}`}>
                          {item.productName}
                        </td>
                        <td className="py-3 text-sm text-slate-600 dark:text-slate-400 font-mono" data-testid={`text-sku-${item.id}`}>
                          {item.sku || '—'}
                        </td>
                        <td className="py-3 text-sm text-center text-slate-900 dark:text-white" data-testid={`text-quantity-${item.id}`}>
                          {item.quantity}
                        </td>
                        <td className="py-3 text-sm text-right text-slate-900 dark:text-white" data-testid={`text-unit-price-${item.id}`}>
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="py-3 text-sm text-right font-semibold text-slate-900 dark:text-white" data-testid={`text-item-total-${item.id}`}>
                          {formatCurrency(item.totalPrice)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-sm text-slate-500 dark:text-slate-500">
                        No parts used
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Cost Summary */}
            <div className="flex justify-end">
              <div className="w-full max-w-sm space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Parts Cost:</span>
                  <span className="text-base font-semibold text-slate-900 dark:text-white" data-testid="text-parts-cost">
                    {formatCurrency(service.partsCost)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Service Cost:</span>
                  <span className="text-base font-semibold text-slate-900 dark:text-white" data-testid="text-service-cost">
                    {formatCurrency(service.serviceCost)}
                  </span>
                </div>
                
                <Separator className="my-2" />
                
                <div className="flex justify-between items-center py-3 border-2 border-slate-900 dark:border-slate-300 rounded px-4">
                  <span className="text-base font-bold uppercase text-slate-900 dark:text-white">Total Amount:</span>
                  <span className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-total-cost">
                    {formatCurrency(service.totalCost)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes Section */}
          {service.notes && (
            <div className="px-8 py-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wide mb-2">Additional Notes</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap" data-testid="text-notes">
                {service.notes}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="px-8 py-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
            <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-500">
              <p>Thank you for your business!</p>
              <p data-testid="text-updated-at">
                {service.updatedAt && service.updatedAt !== service.createdAt 
                  ? `Last updated: ${formatCzechDate(service.updatedAt)}` 
                  : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="text-delete-dialog-title">Delete Service</AlertDialogTitle>
            <AlertDialogDescription data-testid="text-delete-dialog-description">
              Are you sure you want to delete this service? This action cannot be undone and will also delete all associated service items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
