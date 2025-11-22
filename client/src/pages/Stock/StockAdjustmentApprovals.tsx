import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { fuzzySearch } from "@/lib/fuzzySearch";
import { Plus, Minus, Package, Search, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
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
import { Label } from "@/components/ui/label";

interface StockAdjustmentRequest {
  id: string;
  productId: string;
  locationId: string;
  requestedBy: string;
  adjustmentType: 'add' | 'remove' | 'set';
  currentQuantity: number;
  requestedQuantity: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy: string | null;
  approvedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export default function StockAdjustmentApprovals() {
  const { t } = useTranslation(['inventory', 'common']);
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [selectedRequest, setSelectedRequest] = useState<StockAdjustmentRequest | null>(null);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: requests = [], isLoading, error } = useQuery<StockAdjustmentRequest[]>({
    queryKey: ['/api/stock-adjustment-requests'],
    retry: false,
  });

  const { data: products = [] } = useQuery<any[]>({
    queryKey: ['/api/products'],
  });

  const { data: locations = [] } = useQuery<any[]>({
    queryKey: ['/api/products'],
  });

  useEffect(() => {
    if (error) {
      toast({
        title: t('common:error'),
        description: t('failedToLoadAdjustmentRequests'),
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('PATCH', `/api/stock-adjustment-requests/${id}/approve`, {
        approvedBy: "test-user"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stock-adjustment-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: t('common:success'),
        description: t('stockAdjustmentApproved'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message || t('failedToApproveRequest'),
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return await apiRequest('PATCH', `/api/stock-adjustment-requests/${id}/reject`, {
        approvedBy: "test-user",
        reason
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stock-adjustment-requests'] });
      toast({
        title: t('common:success'),
        description: t('stockAdjustmentRejected'),
      });
      setRejectionDialogOpen(false);
      setSelectedRequest(null);
      setRejectionReason("");
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message || t('failedToRejectRequest'),
        variant: "destructive",
      });
    },
  });

  const handleApprove = (request: StockAdjustmentRequest) => {
    if (window.confirm(`Approve this stock adjustment?\n\nThis will ${request.adjustmentType} ${request.requestedQuantity} units.`)) {
      approveMutation.mutate(request.id);
    }
  };

  const handleReject = (request: StockAdjustmentRequest) => {
    setSelectedRequest(request);
    setRejectionDialogOpen(true);
  };

  const submitRejection = () => {
    if (!selectedRequest) return;
    
    if (!rejectionReason.trim()) {
      toast({
        title: t('common:error'),
        description: t('provideRejectionReason'),
        variant: "destructive",
      });
      return;
    }

    rejectMutation.mutate({
      id: selectedRequest.id,
      reason: rejectionReason
    });
  };

  const getProductName = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product?.name || productId;
  };

  const getLocationCode = (locationId: string) => {
    // We'll need to fetch location details
    return locationId;
  };

  // Filter requests based on search query and status
  const filteredRequests = requests.filter(req => {
    const matchesStatus = statusFilter === "all" || req.status === statusFilter;
    if (!matchesStatus) return false;

    if (!searchQuery) return true;

    const productName = getProductName(req.productId).toLowerCase();
    const searchLower = searchQuery.toLowerCase();
    return productName.includes(searchLower) || 
           req.reason.toLowerCase().includes(searchLower) ||
           req.id.toLowerCase().includes(searchLower);
  });

  // Calculate stats
  const totalRequests = requests?.length || 0;
  const pendingRequests = requests?.filter((r: any) => r.status === 'pending').length || 0;
  const approvedRequests = requests?.filter((r: any) => r.status === 'approved').length || 0;
  const rejectedRequests = requests?.filter((r: any) => r.status === 'rejected').length || 0;

  const getAdjustmentTypeIcon = (type: string) => {
    switch (type) {
      case 'add': return <Plus className="h-3 w-3" />;
      case 'remove': return <Minus className="h-3 w-3" />;
      case 'set': return <Package className="h-3 w-3" />;
      default: return null;
    }
  };

  const getAdjustmentTypeColor = (type: string) => {
    switch (type) {
      case 'add': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'remove': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'set': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" />{t('pendingApproval')}</Badge>;
      case 'approved': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />{t('approved')}</Badge>;
      case 'rejected': return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" />{t('rejected')}</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const columns: DataTableColumn<StockAdjustmentRequest>[] = [
    {
      key: "createdAt",
      header: t('requested'),
      sortable: true,
      cell: (request) => (
        <div className="text-sm">
          <div className="text-gray-900 dark:text-white">
            {format(new Date(request.createdAt), 'MMM d, yyyy')}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {format(new Date(request.createdAt), 'h:mm a')}
          </div>
        </div>
      ),
    },
    {
      key: "product",
      header: t('common:product'),
      sortable: true,
      cell: (request) => (
        <div className="text-sm text-gray-900 dark:text-white font-medium">
          {getProductName(request.productId)}
        </div>
      ),
    },
    {
      key: "adjustmentType",
      header: t('type'),
      sortable: true,
      cell: (request) => (
        <Badge className={getAdjustmentTypeColor(request.adjustmentType)}>
          {getAdjustmentTypeIcon(request.adjustmentType)}
          <span className="ml-1 capitalize">{request.adjustmentType}</span>
        </Badge>
      ),
    },
    {
      key: "quantities",
      header: t('quantityChange'),
      cell: (request) => {
        const getNewQuantity = () => {
          if (request.adjustmentType === 'set') return request.requestedQuantity;
          if (request.adjustmentType === 'add') return request.currentQuantity + request.requestedQuantity;
          if (request.adjustmentType === 'remove') return request.currentQuantity - request.requestedQuantity;
          return request.currentQuantity;
        };

        const newQty = getNewQuantity();
        const diff = newQty - request.currentQuantity;

        return (
          <div className="text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-600 dark:text-gray-400">{request.currentQuantity}</span>
              <span className="text-gray-400">→</span>
              <span className="font-semibold text-gray-900 dark:text-white">{newQty}</span>
              {diff !== 0 && (
                <span className={`text-xs ${diff > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ({diff > 0 ? '+' : ''}{diff})
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: "reason",
      header: t('reason'),
      cell: (request) => (
        <div className="text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate">
          {request.reason}
        </div>
      ),
    },
    {
      key: "status",
      header: t('common:status'),
      sortable: true,
      cell: (request) => getStatusBadgeVariant(request.status),
    },
    {
      key: "actions",
      header: t('common:actions'),
      cell: (request) => (
        <div className="flex gap-2">
          {request.status === 'pending' && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="text-green-600 hover:text-green-700 border-green-200 hover:border-green-300"
                onClick={() => handleApprove(request)}
                disabled={approveMutation.isPending}
                data-testid={`button-approve-${request.id}`}
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                {t('approve')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                onClick={() => handleReject(request)}
                disabled={rejectMutation.isPending}
                data-testid={`button-reject-${request.id}`}
              >
                <XCircle className="h-3 w-3 mr-1" />
                {t('reject')}
              </Button>
            </>
          )}
          {request.status === 'rejected' && request.rejectionReason && (
            <div className="text-xs text-gray-500 italic">
              {t('reason')}: {request.rejectionReason}
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            {t('stockAdjustmentApprovals')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('reviewAndApproveRequests')}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t('totalRequests')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalRequests}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
              {t('pendingApproval')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{pendingRequests}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400">
              {t('approved')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{approvedRequests}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">
              {t('rejected')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{rejectedRequests}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder={t('searchByProductReasonId')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-requests"
                />
              </div>
            </div>
            <div className="md:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allStatus')}</SelectItem>
                  <SelectItem value="pending">{t('pendingApproval')}</SelectItem>
                  <SelectItem value="approved">{t('approved')}</SelectItem>
                  <SelectItem value="rejected">{t('rejected')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card>
        <CardContent className="p-0 sm:p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 dark:text-gray-400 mt-4">{t('loadingRequests')}</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">{t('noAdjustmentRequests')}</p>
              {searchQuery && (
                <p className="text-sm text-gray-500 mt-2">
                  {t('tryAdjustingSearch')}
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="sm:hidden space-y-3 p-3">
                {filteredRequests.map((request) => {
                  const getNewQuantity = () => {
                    if (request.adjustmentType === 'set') return request.requestedQuantity;
                    if (request.adjustmentType === 'add') return request.currentQuantity + request.requestedQuantity;
                    if (request.adjustmentType === 'remove') return request.currentQuantity - request.requestedQuantity;
                    return request.currentQuantity;
                  };

                  const newQty = getNewQuantity();
                  const diff = newQty - request.currentQuantity;

                  return (
                    <div 
                      key={request.id} 
                      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4"
                      data-testid={`card-request-${request.id}`}
                    >
                      <div className="space-y-3">
                        {/* Top Row - Request ID, Status */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Request ID</p>
                            <p className="font-mono text-sm text-gray-900 dark:text-white truncate">
                              {request.id.slice(0, 8)}
                            </p>
                          </div>
                          <div className="flex-shrink-0">
                            {getStatusBadgeVariant(request.status)}
                          </div>
                        </div>

                        {/* Product Name & Type Badge */}
                        <div className="space-y-2">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Product</p>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {getProductName(request.productId)}
                            </p>
                          </div>
                          <div>
                            <Badge className={getAdjustmentTypeColor(request.adjustmentType)}>
                              {getAdjustmentTypeIcon(request.adjustmentType)}
                              <span className="ml-1 capitalize">{request.adjustmentType}</span>
                            </Badge>
                          </div>
                        </div>

                        {/* Grid Details */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Quantity Change</p>
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-gray-600 dark:text-gray-400">{request.currentQuantity}</span>
                              <span className="text-gray-400">→</span>
                              <span className="font-semibold text-gray-900 dark:text-white">{newQty}</span>
                              {diff !== 0 && (
                                <span className={`text-xs ${diff > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  ({diff > 0 ? '+' : ''}{diff})
                                </span>
                              )}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Requested By</p>
                            <p className="font-medium text-gray-900 dark:text-white mt-1">
                              {request.requestedBy}
                            </p>
                          </div>
                        </div>

                        {/* Request Date */}
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Request Date</p>
                          <p className="text-sm text-gray-900 dark:text-white mt-1">
                            {format(new Date(request.createdAt), 'MMM d, yyyy')} at {format(new Date(request.createdAt), 'h:mm a')}
                          </p>
                        </div>

                        {/* Reason */}
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Reason</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                            {request.reason}
                          </p>
                        </div>

                        {/* Rejection Reason if applicable */}
                        {request.status === 'rejected' && request.rejectionReason && (
                          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                            <p className="text-xs text-red-700 dark:text-red-400 font-medium">Rejection Reason</p>
                            <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                              {request.rejectionReason}
                            </p>
                          </div>
                        )}

                        {/* Action Buttons */}
                        {request.status === 'pending' && (
                          <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                            <Button
                              className="flex-1 text-green-600 hover:text-green-700 border-green-200 hover:border-green-300 dark:border-green-800 dark:hover:border-green-700"
                              variant="outline"
                              size="sm"
                              onClick={() => handleApprove(request)}
                              disabled={approveMutation.isPending}
                              data-testid={`button-approve-mobile-${request.id}`}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              {t('approve')}
                            </Button>
                            <Button
                              className="flex-1 text-red-600 hover:text-red-700 border-red-200 hover:border-red-300 dark:border-red-800 dark:hover:border-red-700"
                              variant="outline"
                              size="sm"
                              onClick={() => handleReject(request)}
                              disabled={rejectMutation.isPending}
                              data-testid={`button-reject-mobile-${request.id}`}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              {t('reject')}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block">
                <DataTable
                  columns={columns}
                  data={filteredRequests}
                  getRowKey={(request) => request.id}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Rejection Dialog */}
      <Dialog open={rejectionDialogOpen} onOpenChange={setRejectionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('rejectStockAdjustment')}</DialogTitle>
            <DialogDescription>
              {t('provideRejectReason')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">{t('rejectionReason')} *</Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={t('explainRejection')}
                className="h-24"
                data-testid="input-rejection-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectionDialogOpen(false);
                setRejectionReason("");
                setSelectedRequest(null);
              }}
              data-testid="button-cancel-rejection"
            >
              {t('common:cancel')}
            </Button>
            <Button
              onClick={submitRejection}
              disabled={!rejectionReason.trim() || rejectMutation.isPending}
              variant="destructive"
              data-testid="button-confirm-rejection"
            >
              {rejectMutation.isPending ? t('rejecting') : t('rejectRequest')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
