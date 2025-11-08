import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, DataTableColumn } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
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
import { Package, XCircle, ExternalLink, Search, Eye } from 'lucide-react';
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
}

export default function ShipmentLabels() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLabel, setSelectedLabel] = useState<ShipmentLabel | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

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

  const filteredLabels = labels.filter((label) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      label.orderId.toLowerCase().includes(query) ||
      label.carrier.toLowerCase().includes(query) ||
      label.trackingNumbers.some((tn) => tn.toLowerCase().includes(query)) ||
      (label.batchId && label.batchId.toLowerCase().includes(query))
    );
  });

  const columns: DataTableColumn<ShipmentLabel>[] = [
    {
      key: 'orderId',
      header: 'Order ID',
      cell: (label: ShipmentLabel) => (
        <Link href={`/orders/${label.orderId}`}>
          <a className="text-blue-600 hover:underline font-medium flex items-center gap-1" data-testid={`link-order-${label.id}`}>
            {label.orderId}
            <ExternalLink className="w-3 h-3" />
          </a>
        </Link>
      ),
    },
    {
      key: 'carrier',
      header: 'Carrier',
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
    <div className="p-6 space-y-6" data-testid="page-shipment-labels">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="title-shipment-labels">
            <Package className="w-8 h-8" />
            Shipment Labels
          </h1>
          <p className="text-muted-foreground">
            Manage all shipping labels (PPL, GLS, DHL) created for orders
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Shipment Labels</CardTitle>
          <div className="flex items-center gap-2 mt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by Order ID, Carrier, Tracking Number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
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
