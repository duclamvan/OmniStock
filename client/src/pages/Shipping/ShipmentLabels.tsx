import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, DataTableColumn } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { formatDate } from '@/lib/currencyUtils';
import { fuzzySearch } from '@/lib/fuzzySearch';
import { Package, XCircle, ExternalLink, Search, Eye, Filter, Truck, CheckCircle, XOctagon } from 'lucide-react';
import { Link } from 'wouter';

interface ShipmentLabel {
  id: string;
  orderId: string;
  carrier: 'PPL' | 'GLS' | 'DHL';
  trackingNumbers: string[];
  batchId: string | null;
  labelBase64: string;
  labelData: any;
  status: 'active' | 'cancelled';
  shipmentCount: number;
  cancelReason: string | null;
  createdAt: string;
  cancelledAt: string | null;
  updatedAt: string;
  customOrderId?: string | null;
  customerName?: string | null;
}

export default function ShipmentLabels() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLabel, setSelectedLabel] = useState<ShipmentLabel | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [carrierFilter, setCarrierFilter] = useState<string>('all');

  const { data: labels = [], isLoading } = useQuery<ShipmentLabel[]>({
    queryKey: ['/api/shipment-labels'],
    refetchInterval: 5000, // Auto-refresh every 5 seconds to show new labels in real-time
  });

  const cancelLabelMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest('POST', `/api/shipment-labels/${id}/cancel`, {
        reason: 'Cancelled by user',
      }),
    onSuccess: () => {
      toast({
        title: 'Label Cancelled',
        description: 'The shipment label has been cancelled successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/shipment-labels'] });
      setShowCancelDialog(false);
      setSelectedLabel(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel shipment label',
        variant: 'destructive',
      });
    },
  });

  const handleCancelClick = (label: ShipmentLabel) => {
    setSelectedLabel(label);
    setShowCancelDialog(true);
  };

  const handleCancelConfirm = () => {
    if (selectedLabel) {
      cancelLabelMutation.mutate(selectedLabel.id);
    }
  };

  // Calculate carrier statistics
  const carrierStats = {
    all: labels.length,
    PPL: labels.filter(l => l.carrier === 'PPL').length,
    GLS: labels.filter(l => l.carrier === 'GLS').length,
    DHL: labels.filter(l => l.carrier === 'DHL').length,
  };

  const statusStats = {
    active: labels.filter(l => l.status === 'active').length,
    cancelled: labels.filter(l => l.status === 'cancelled').length,
  };

  const filteredLabels = labels.filter((label) => {
    // Status filter
    if (statusFilter !== 'all' && label.status !== statusFilter) {
      return false;
    }
    
    // Carrier filter
    if (carrierFilter !== 'all' && label.carrier !== carrierFilter) {
      return false;
    }
    
    // Search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = (
        label.orderId.toLowerCase().includes(query) ||
        (label.customOrderId && label.customOrderId.toLowerCase().includes(query)) ||
        (label.customerName && label.customerName.toLowerCase().includes(query)) ||
        label.carrier.toLowerCase().includes(query) ||
        label.trackingNumbers.some((tn) => tn.toLowerCase().includes(query)) ||
        (label.batchId && label.batchId.toLowerCase().includes(query))
      );
      if (!matchesSearch) return false;
    }
    
    return true;
  });

  const columns: DataTableColumn<ShipmentLabel>[] = [
    {
      key: 'orderId',
      header: 'Order & Customer',
      sortable: true,
      sortKey: 'customOrderId',
      cell: (label: ShipmentLabel) => (
        <div className="flex flex-col gap-1">
          <a 
            href={`/orders/${label.orderId}`}
            className="text-blue-600 hover:underline font-medium flex items-center gap-1" 
            data-testid={`link-order-${label.id}`}
          >
            {label.customOrderId || label.orderId}
            <ExternalLink className="w-3 h-3" />
          </a>
          {label.customerName && (
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {label.customerName}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'carrier',
      header: 'Carrier',
      sortable: true,
      cell: (label: ShipmentLabel) => (
        <Badge variant="outline" data-testid={`badge-carrier-${label.id}`}>
          {label.carrier}
        </Badge>
      ),
    },
    {
      key: 'trackingNumbers',
      header: 'Tracking Numbers',
      cell: (label: ShipmentLabel) => (
        <div className="space-y-1" data-testid={`text-tracking-${label.id}`}>
          {label.trackingNumbers.map((tn: string, index: number) => (
            <div key={index} className="text-sm font-mono">
              {tn}
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (label: ShipmentLabel) => (
        <Badge
          variant={label.status === 'active' ? 'default' : 'secondary'}
          className={
            label.status === 'cancelled'
              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
              : ''
          }
          data-testid={`badge-status-${label.id}`}
        >
          {label.status}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      cell: (label: ShipmentLabel) => (
        <span className="text-sm" data-testid={`text-created-${label.id}`}>
          {formatDate(label.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (label: ShipmentLabel) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Convert base64 to blob for proper PDF display
              const byteCharacters = atob(label.labelBase64);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const blob = new Blob([byteArray], { type: 'application/pdf' });
              const url = URL.createObjectURL(blob);
              window.open(url, '_blank');
              // Clean up the URL after a delay
              setTimeout(() => URL.revokeObjectURL(url), 100);
            }}
            data-testid={`button-view-label-${label.id}`}
          >
            <Eye className="w-4 h-4 mr-1" />
            View
          </Button>
          {label.status === 'active' && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleCancelClick(label)}
              data-testid={`button-cancel-${label.id}`}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Cancel
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 space-y-4" data-testid="page-shipment-labels">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="title-shipment-labels">
            <Package className="w-6 h-6" />
            Shipment Labels
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage all shipping labels (PPL, GLS, DHL) created for orders
          </p>
        </div>
      </div>

      {/* Carrier Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* All Carriers */}
        <Card
          className={`cursor-pointer transition-all hover:shadow-sm ${
            carrierFilter === 'all' ? 'ring-1 ring-blue-500 bg-blue-50 dark:bg-blue-950' : ''
          }`}
          onClick={() => setCarrierFilter('all')}
          data-testid="card-filter-all"
        >
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground truncate">All</p>
                <p className="text-xl font-bold">{carrierStats.all}</p>
              </div>
              <Truck className="h-5 w-5 text-blue-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        {/* PPL */}
        <Card
          className={`cursor-pointer transition-all hover:shadow-sm ${
            carrierFilter === 'PPL' ? 'ring-1 ring-orange-500 bg-orange-50 dark:bg-orange-950' : ''
          }`}
          onClick={() => setCarrierFilter('PPL')}
          data-testid="card-filter-ppl"
        >
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground truncate">PPL</p>
                <p className="text-xl font-bold">{carrierStats.PPL}</p>
              </div>
              <Package className="h-5 w-5 text-orange-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        {/* GLS */}
        <Card
          className={`cursor-pointer transition-all hover:shadow-sm ${
            carrierFilter === 'GLS' ? 'ring-1 ring-green-500 bg-green-50 dark:bg-green-950' : ''
          }`}
          onClick={() => setCarrierFilter('GLS')}
          data-testid="card-filter-gls"
        >
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground truncate">GLS</p>
                <p className="text-xl font-bold">{carrierStats.GLS}</p>
              </div>
              <Package className="h-5 w-5 text-green-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        {/* DHL */}
        <Card
          className={`cursor-pointer transition-all hover:shadow-sm ${
            carrierFilter === 'DHL' ? 'ring-1 ring-red-500 bg-red-50 dark:bg-red-950' : ''
          }`}
          onClick={() => setCarrierFilter('DHL')}
          data-testid="card-filter-dhl"
        >
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground truncate">DHL</p>
                <p className="text-xl font-bold">{carrierStats.DHL}</p>
              </div>
              <Package className="h-5 w-5 text-red-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 gap-2">
        <Card
          className={`cursor-pointer transition-all hover:shadow-sm ${
            statusFilter === 'active' ? 'ring-1 ring-green-500 bg-green-50 dark:bg-green-950' : ''
          }`}
          onClick={() => setStatusFilter(statusFilter === 'active' ? 'all' : 'active')}
          data-testid="card-filter-active"
        >
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground truncate">Active</p>
                <p className="text-xl font-bold">{statusStats.active}</p>
              </div>
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:shadow-sm ${
            statusFilter === 'cancelled' ? 'ring-1 ring-red-500 bg-red-50 dark:bg-red-950' : ''
          }`}
          onClick={() => setStatusFilter(statusFilter === 'cancelled' ? 'all' : 'cancelled')}
          data-testid="card-filter-cancelled"
        >
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground truncate">Cancelled</p>
                <p className="text-xl font-bold">{statusStats.cancelled}</p>
              </div>
              <XOctagon className="h-5 w-5 text-red-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Labels</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Showing {filteredLabels.length} of {labels.length}
              </p>
            </div>
            
            {/* Search and Clear Filters */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-sm w-full sm:w-[200px]"
                  data-testid="input-search"
                />
              </div>
              
              {/* Clear Filters Button */}
              {(searchQuery || statusFilter !== 'all' || carrierFilter !== 'all') && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setCarrierFilter('all');
                  }}
                  data-testid="button-clear-filters"
                >
                  <XCircle className="h-3.5 w-3.5 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="loading-labels">
              Loading labels...
            </div>
          ) : filteredLabels.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="empty-labels">
              No shipment labels found
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="sm:hidden space-y-3 p-3">
                {filteredLabels.map((label) => (
                  <div
                    key={label.id}
                    className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-100 dark:border-slate-800 p-4"
                    data-testid={`card-label-${label.id}`}
                  >
                    <div className="space-y-3">
                      {/* Top Row - Order, Status, and Carrier */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <a
                            href={`/orders/${label.orderId}`}
                            className="text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1"
                            data-testid={`link-order-mobile-${label.id}`}
                          >
                            {label.customOrderId || label.orderId}
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                          {label.customerName && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                              {label.customerName}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant="outline" data-testid={`badge-carrier-mobile-${label.id}`}>
                            {label.carrier}
                          </Badge>
                          <Badge
                            variant={label.status === 'active' ? 'default' : 'secondary'}
                            className={
                              label.status === 'cancelled'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                                : ''
                            }
                            data-testid={`badge-status-mobile-${label.id}`}
                          >
                            {label.status}
                          </Badge>
                        </div>
                      </div>

                      {/* Middle Row - Tracking and Details */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400 text-xs">Tracking Number</p>
                          <div className="font-mono text-xs mt-0.5">
                            {label.trackingNumbers.map((tn, index) => (
                              <div key={index} className="font-medium text-gray-900 dark:text-gray-100">
                                {tn}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400 text-xs">Created</p>
                          <p className="font-medium text-gray-900 dark:text-gray-100 mt-0.5">
                            {formatDate(label.createdAt)}
                          </p>
                        </div>
                      </div>

                      {/* Additional Details Row */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {label.shipmentCount && (
                          <div>
                            <p className="text-gray-500 dark:text-gray-400 text-xs">Packages</p>
                            <p className="font-medium text-gray-900 dark:text-gray-100 mt-0.5">
                              {label.shipmentCount}
                            </p>
                          </div>
                        )}
                        {label.batchId && (
                          <div>
                            <p className="text-gray-500 dark:text-gray-400 text-xs">Batch ID</p>
                            <p className="font-medium text-gray-900 dark:text-gray-100 mt-0.5 truncate">
                              {label.batchId}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            // Convert base64 to blob for proper PDF display
                            const byteCharacters = atob(label.labelBase64);
                            const byteNumbers = new Array(byteCharacters.length);
                            for (let i = 0; i < byteCharacters.length; i++) {
                              byteNumbers[i] = byteCharacters.charCodeAt(i);
                            }
                            const byteArray = new Uint8Array(byteNumbers);
                            const blob = new Blob([byteArray], { type: 'application/pdf' });
                            const url = URL.createObjectURL(blob);
                            window.open(url, '_blank');
                            // Clean up the URL after a delay
                            setTimeout(() => URL.revokeObjectURL(url), 100);
                          }}
                          data-testid={`button-view-label-mobile-${label.id}`}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View Label
                        </Button>
                        {label.status === 'active' && (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleCancelClick(label)}
                            data-testid={`button-cancel-mobile-${label.id}`}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block">
                <DataTable
                  data={filteredLabels}
                  columns={columns}
                  getRowKey={(label) => label.id}
                  data-testid="table-shipment-labels"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent data-testid="dialog-cancel-label">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Shipment Label</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this shipment label? This action cannot be
              undone and the label will no longer be valid.
              {selectedLabel && (
                <div className="mt-4 bg-muted p-3 rounded-lg">
                  <p className="text-sm">
                    <strong>Order ID:</strong> {selectedLabel.orderId}
                  </p>
                  <p className="text-sm">
                    <strong>Carrier:</strong> {selectedLabel.carrier}
                  </p>
                  <p className="text-sm">
                    <strong>Tracking:</strong>{' '}
                    {selectedLabel.trackingNumbers.join(', ')}
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-dialog-no">
              No, Keep Label
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelConfirm}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-cancel-dialog-yes"
            >
              Yes, Cancel Label
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
