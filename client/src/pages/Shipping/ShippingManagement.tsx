import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Truck, 
  Package, 
  Search,
  FileText,
  Calendar,
  MapPin,
  CheckCircle2,
  XCircle,
  Printer,
  Download
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
  createdAt: string;
  cancelledAt: string | null;
  cancelledBy: string | null;
}

export default function ShippingManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCarrier, setSelectedCarrier] = useState('ppl');

  // Fetch PPL shipment history
  const { data: pplHistory = [], isLoading: isLoadingPPL } = useQuery<PPLShipmentRecord[]>({
    queryKey: ['/api/shipping/ppl/history'],
    enabled: selectedCarrier === 'ppl'
  });

  // Filter shipments based on search term
  const filteredPPLHistory = pplHistory.filter(record => 
    record.shipmentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                  {isLoadingPPL ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-sm text-gray-500">Loading shipment history...</p>
                      </div>
                    </div>
                  ) : filteredPPLHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Package className="h-12 w-12 text-gray-300 mb-3" />
                      <p className="text-sm font-medium text-gray-900">No shipments found</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {searchTerm ? 'Try a different search term' : 'Start creating labels from the Pick & Pack workflow'}
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[140px]">Tracking #</TableHead>
                          <TableHead>Order</TableHead>
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
                        {filteredPPLHistory.map((record) => (
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
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  title="View Label"
                                  data-testid={`button-view-${record.id}`}
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                                {record.status === 'active' && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0"
                                    title="Print Label"
                                    data-testid={`button-print-${record.id}`}
                                  >
                                    <Printer className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
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
                  GLS carrier integration coming soon
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12">
                  <Truck className="h-16 w-16 text-gray-300 mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">GLS Integration</p>
                  <p className="text-sm text-gray-500 text-center max-w-md">
                    GLS shipping integration is planned for a future release. Contact support for more information.
                  </p>
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
                  DHL carrier integration coming soon
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12">
                  <Truck className="h-16 w-16 text-gray-300 mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">DHL Integration</p>
                  <p className="text-sm text-gray-500 text-center max-w-md">
                    DHL shipping integration is planned for a future release. Contact support for more information.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
