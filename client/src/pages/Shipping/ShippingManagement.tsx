import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Truck, 
  Package, 
  Search,
  FileText,
  Calendar,
  MapPin,
  CheckCircle2,
  XCircle,
  Eye,
  Download,
  AlertTriangle
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface PPLShipmentRecord {
  id: number;
  orderId: string;
  shipmentNumber: string;
  batchId: string;
  cartonNumber: number;
  status: string;
  customerName: string;
  recipientCountry: string;
  hasCOD: boolean;
  codAmount: string;
  codCurrency: string;
  labelBase64: string;
  createdAt: string;
  cancelledAt: string | null;
  cancelledBy: string | null;
}

export default function ShippingManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCarrier, setSelectedCarrier] = useState('ppl');
  const [viewingLabel, setViewingLabel] = useState<PPLShipmentRecord | null>(null);
  const [cancellingShipment, setCancellingShipment] = useState<PPLShipmentRecord | null>(null);

  // Fetch PPL shipment history
  const { data: pplHistory = [], isLoading: isLoadingPPL } = useQuery<PPLShipmentRecord[]>({
    queryKey: ['/api/shipping/ppl/history'],
    enabled: selectedCarrier === 'ppl'
  });

  // Cancel shipment mutation
  const cancelShipmentMutation = useMutation({
    mutationFn: async (shipment: PPLShipmentRecord) => {
      return apiRequest('POST', `/api/orders/${shipment.orderId}/ppl/cancel-shipment/${shipment.shipmentNumber}`, {});
    },
    onSuccess: () => {
      toast({
        title: "Shipment Cancelled",
        description: "The shipment has been successfully cancelled.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/shipping/ppl/history'] });
      setCancellingShipment(null);
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Failed",
        description: error.message || "Failed to cancel shipment",
        variant: "destructive",
      });
    }
  });

  // Filter shipments based on search term
  const filteredPPLHistory = pplHistory.filter(record => 
    record.shipmentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewLabel = (record: PPLShipmentRecord) => {
    setViewingLabel(record);
  };

  const handleDownloadLabel = (record: PPLShipmentRecord) => {
    if (!record.labelBase64) {
      toast({
        title: "No Label Data",
        description: "This shipment has no label data available",
        variant: "destructive",
      });
      return;
    }

    // Create a blob from base64 and download
    const byteCharacters = atob(record.labelBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `PPL_${record.shipmentNumber}_${record.orderId}.pdf`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Label Downloaded",
      description: `Downloaded label for shipment ${record.shipmentNumber}`,
    });
  };

  const handleCancelShipment = (record: PPLShipmentRecord) => {
    setCancellingShipment(record);
  };

  const confirmCancelShipment = () => {
    if (cancellingShipment) {
      cancelShipmentMutation.mutate(cancellingShipment);
    }
  };

  // Render shipment table (shared component for all carriers)
  const renderShipmentTable = (
    shipments: PPLShipmentRecord[],
    isLoading: boolean,
    carrier: string
  ) => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">Loading shipment history...</p>
          </div>
        </div>
      );
    }

    if (shipments.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Package className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-900">No shipments found</p>
          <p className="text-sm text-gray-500 mt-1">
            {searchTerm ? 'Try a different search term' : `Start creating ${carrier} labels from the Pick & Pack workflow`}
          </p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[140px]">Tracking #</TableHead>
            <TableHead>Order ID</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead className="text-center">Carton</TableHead>
            <TableHead className="text-center">Country</TableHead>
            <TableHead className="text-center">COD</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shipments.map((record) => (
            <TableRow key={record.id} data-testid={`shipment-row-${record.id}`}>
              <TableCell className="font-mono text-xs">
                {record.shipmentNumber}
              </TableCell>
              <TableCell className="font-medium">
                {record.orderId}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-sm">{record.customerName || 'N/A'}</span>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="outline" className="font-mono">
                  #{record.cartonNumber}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="secondary">
                  {record.recipientCountry}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                {record.hasCOD ? (
                  <div className="flex flex-col items-center">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mb-1" />
                    <span className="text-xs font-medium">
                      {record.codAmount} {record.codCurrency}
                    </span>
                  </div>
                ) : (
                  <span className="text-gray-400 text-xs">—</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <Calendar className="h-3.5 w-3.5" />
                  {format(new Date(record.createdAt), 'MMM d, yyyy')}
                </div>
              </TableCell>
              <TableCell className="text-center">
                {record.status === 'active' ? (
                  <Badge className="bg-green-500 hover:bg-green-600">
                    Active
                  </Badge>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <Badge variant="destructive">
                      Cancelled
                    </Badge>
                    {record.cancelledAt && (
                      <span className="text-xs text-gray-500">
                        {format(new Date(record.cancelledAt), 'MMM d')}
                      </span>
                    )}
                  </div>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2"
                    title="View Label"
                    onClick={() => handleViewLabel(record)}
                    data-testid={`button-view-${record.id}`}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2"
                    title="Download Label"
                    onClick={() => handleDownloadLabel(record)}
                    data-testid={`button-download-${record.id}`}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                  {record.status === 'active' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Cancel Shipment"
                      onClick={() => handleCancelShipment(record)}
                      data-testid={`button-cancel-${record.id}`}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900" data-testid="title-shipping">
                Shipping Management
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage shipping labels and track parcels across all carriers
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="px-3 py-1.5">
                <Package className="h-3.5 w-3.5 mr-1.5" />
                {pplHistory.length} Total Labels
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={selectedCarrier} onValueChange={setSelectedCarrier} className="space-y-6">
          {/* Carrier Tabs */}
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="ppl" className="gap-2" data-testid="tab-ppl">
              <Truck className="h-4 w-4" />
              PPL
            </TabsTrigger>
            <TabsTrigger value="gls" className="gap-2" data-testid="tab-gls">
              <Truck className="h-4 w-4" />
              GLS
            </TabsTrigger>
            <TabsTrigger value="dhl" className="gap-2" data-testid="tab-dhl">
              <Truck className="h-4 w-4" />
              DHL
            </TabsTrigger>
          </TabsList>

          {/* PPL Tab Content */}
          <TabsContent value="ppl" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-orange-600" />
                      PPL Shipping Labels
                    </CardTitle>
                    <CardDescription className="mt-1.5">
                      Complete history of all PPL shipments including active and cancelled labels
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="px-3 py-1">
                      {pplHistory.filter(r => r.status === 'active').length} Active
                    </Badge>
                    <Badge variant="outline" className="px-3 py-1">
                      {pplHistory.filter(r => r.status === 'cancelled').length} Cancelled
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by tracking number, order ID, or customer name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-shipments"
                  />
                </div>

                {/* Shipments Table */}
                <div className="rounded-lg border bg-white">
                  {renderShipmentTable(filteredPPLHistory, isLoadingPPL, 'PPL')}
                </div>

                {/* Summary Stats */}
                {filteredPPLHistory.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900">
                            {filteredPPLHistory.length}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">Total Shipments</div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {filteredPPLHistory.filter(r => r.status === 'active').length}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">Active Labels</div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">
                            {filteredPPLHistory.filter(r => r.hasCOD).length}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">COD Shipments</div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-600">
                            {filteredPPLHistory.filter(r => r.status === 'cancelled').length}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">Cancelled</div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* GLS Tab Content */}
          <TabsContent value="gls" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-blue-600" />
                  GLS Shipping Labels
                </CardTitle>
                <CardDescription>
                  GLS carrier integration - showing table structure (integration coming soon)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search GLS shipments..."
                    className="pl-10"
                    disabled
                  />
                </div>
                <div className="rounded-lg border bg-white">
                  {renderShipmentTable([], false, 'GLS')}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* DHL Tab Content */}
          <TabsContent value="dhl" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-red-600" />
                  DHL Shipping Labels
                </CardTitle>
                <CardDescription>
                  DHL carrier integration - showing table structure (integration coming soon)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search DHL shipments..."
                    className="pl-10"
                    disabled
                  />
                </div>
                <div className="rounded-lg border bg-white">
                  {renderShipmentTable([], false, 'DHL')}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* View Label Dialog */}
      <Dialog open={!!viewingLabel} onOpenChange={(open) => !open && setViewingLabel(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Shipping Label - {viewingLabel?.shipmentNumber}</DialogTitle>
            <DialogDescription>
              Order {viewingLabel?.orderId} • Carton #{viewingLabel?.cartonNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {viewingLabel?.labelBase64 ? (
              <iframe
                src={`data:application/pdf;base64,${viewingLabel.labelBase64}`}
                className="w-full h-[600px] border rounded"
                title={`Label ${viewingLabel.shipmentNumber}`}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <FileText className="h-12 w-12 mb-3" />
                <p>No label data available</p>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setViewingLabel(null)}>
              Close
            </Button>
            {viewingLabel && (
              <Button onClick={() => handleDownloadLabel(viewingLabel)}>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Shipment Confirmation Dialog */}
      <AlertDialog open={!!cancellingShipment} onOpenChange={(open) => !open && setCancellingShipment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Cancel Shipment?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel shipment <strong>{cancellingShipment?.shipmentNumber}</strong>?
              This action will attempt to cancel the shipment with PPL and mark it as cancelled in the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Shipment</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancelShipment}
              className="bg-red-600 hover:bg-red-700"
              disabled={cancelShipmentMutation.isPending}
            >
              {cancelShipmentMutation.isPending ? 'Cancelling...' : 'Cancel Shipment'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
