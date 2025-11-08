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
              const dataUrl = `data:application/pdf;base64,${label.labelBase64}`;
              window.open(dataUrl, '_blank');
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
    <div className="p-4 sm:p-6 space-y-6" data-testid="page-shipment-labels">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2" data-testid="title-shipment-labels">
            <Package className="w-6 h-6 sm:w-8 sm:h-8" />
            Shipment Labels
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage all shipping labels (PPL, GLS, DHL) created for orders
          </p>
        </div>
      </div>

      {/* Carrier Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* All Carriers */}
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            carrierFilter === 'all' ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950' : ''
          }`}
          onClick={() => setCarrierFilter('all')}
          data-testid="card-filter-all"
        >
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">All Labels</p>
                <p className="text-2xl sm:text-3xl font-bold mt-1">{carrierStats.all}</p>
              </div>
              <Truck className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        {/* PPL */}
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            carrierFilter === 'PPL' ? 'ring-2 ring-orange-500 bg-orange-50 dark:bg-orange-950' : ''
          }`}
          onClick={() => setCarrierFilter('PPL')}
          data-testid="card-filter-ppl"
        >
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">PPL</p>
                <p className="text-2xl sm:text-3xl font-bold mt-1">{carrierStats.PPL}</p>
              </div>
              <Package className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        {/* GLS */}
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            carrierFilter === 'GLS' ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-950' : ''
          }`}
          onClick={() => setCarrierFilter('GLS')}
          data-testid="card-filter-gls"
        >
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">GLS</p>
                <p className="text-2xl sm:text-3xl font-bold mt-1">{carrierStats.GLS}</p>
              </div>
              <Package className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        {/* DHL */}
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            carrierFilter === 'DHL' ? 'ring-2 ring-red-500 bg-red-50 dark:bg-red-950' : ''
          }`}
          onClick={() => setCarrierFilter('DHL')}
          data-testid="card-filter-dhl"
        >
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">DHL</p>
                <p className="text-2xl sm:text-3xl font-bold mt-1">{carrierStats.DHL}</p>
              </div>
              <Package className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            statusFilter === 'active' ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-950' : ''
          }`}
          onClick={() => setStatusFilter(statusFilter === 'active' ? 'all' : 'active')}
          data-testid="card-filter-active"
        >
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Active Labels</p>
                <p className="text-2xl sm:text-3xl font-bold mt-1">{statusStats.active}</p>
              </div>
              <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            statusFilter === 'cancelled' ? 'ring-2 ring-red-500 bg-red-50 dark:bg-red-950' : ''
          }`}
          onClick={() => setStatusFilter(statusFilter === 'cancelled' ? 'all' : 'cancelled')}
          data-testid="card-filter-cancelled"
        >
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Cancelled</p>
                <p className="text-2xl sm:text-3xl font-bold mt-1">{statusStats.cancelled}</p>
              </div>
              <XOctagon className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Labels</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Showing {filteredLabels.length} of {labels.length} labels
              </p>
            </div>
            
            {/* Search and Clear Filters */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search orders, customers, tracking..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full sm:w-[300px]"
                  data-testid="input-search"
                />
              </div>
              
              {/* Clear Filters Button */}
              {(searchQuery || statusFilter !== 'all' || carrierFilter !== 'all') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setCarrierFilter('all');
                  }}
                  data-testid="button-clear-filters"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="loading-labels">
              Loading labels...
            </div>
          ) : filteredLabels.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="empty-labels">
              No shipment labels found
            </div>
          ) : (
            <DataTable
              data={filteredLabels}
              columns={columns}
              getRowKey={(label) => label.id}
              data-testid="table-shipment-labels"
            />
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
