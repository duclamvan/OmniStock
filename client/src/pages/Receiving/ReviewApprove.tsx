import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  ArrowLeft, 
  Package, 
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
  Truck,
  User,
  Clock,
  Hash,
  CheckSquare,
  Square,
  AlertCircle,
  FileText,
  Layers,
  Package2,
  MapPin,
  Phone,
  Info,
  CheckCircle,
  XOctagon,
  AlertOctagon,
  Clipboard
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { ImagePlaceholder } from "@/components/ImagePlaceholder";

// Helper function to get status color
const getStatusColor = (status: string) => {
  switch (status) {
    case 'complete':
      return 'default';
    case 'partial':
    case 'partial_damaged':
    case 'partial_missing':
      return 'warning';
    case 'damaged':
      return 'destructive';
    case 'missing':
      return 'secondary';
    default:
      return 'default';
  }
};

// Helper function to get status icon
const getStatusIcon = (status: string, className = "h-4 w-4") => {
  switch (status) {
    case 'complete':
      return <CheckCircle className={`${className} text-green-600`} />;
    case 'partial':
    case 'partial_damaged':
    case 'partial_missing':
      return <AlertCircle className={`${className} text-amber-500`} />;
    case 'damaged':
      return <AlertOctagon className={`${className} text-red-600`} />;
    case 'missing':
      return <XOctagon className={`${className} text-gray-500`} />;
    default:
      return <Package className={`${className} text-muted-foreground`} />;
  }
};

export default function ReviewApprove() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation(['imports']);
  
  // Form state
  const [approvalNotes, setApprovalNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  
  // Dialog state
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  // Fetch shipment and receipt details
  const { data: receiptData, isLoading, error } = useQuery({
    queryKey: [`/api/imports/receipts/by-shipment/${id}`],
    queryFn: async () => {
      const response = await fetch(`/api/imports/receipts/by-shipment/${id}`);
      if (!response.ok) throw new Error(t('failedToFetchReceipt'));
      return response.json();
    }
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!receiptData?.receipt?.id) throw new Error('No receipt found');
      
      return apiRequest(
        `/api/imports/receipts/approve/${receiptData.receipt.id}`,
        'POST',
        { notes: approvalNotes }
      );
    },
    onSuccess: () => {
      toast({
        title: t('shipmentApproved'),
        description: t('shipmentApprovedSuccess'),
      });
      // Comprehensive cache invalidation
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/by-status/pending_approval'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/by-status/completed'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/by-status/receiving'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/receipts'] });
      if (id) {
        queryClient.invalidateQueries({ queryKey: [`/api/imports/receipts/by-shipment/${id}`] });
      }
      navigate('/receiving');
    },
    onError: (error: any) => {
      toast({
        title: t('approvalFailed'),
        description: error.message || t('approvalFailedDesc'),
        variant: "destructive",
      });
    }
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!receiptData?.receipt?.id) throw new Error('No receipt found');
      
      return apiRequest(
        `/api/imports/receipts/reject/${receiptData.receipt.id}`,
        'POST',
        { reason: rejectionReason }
      );
    },
    onSuccess: () => {
      toast({
        title: t('shipmentRejected'),
        description: t('shipmentRejectedDesc'),
        variant: "destructive",
      });
      // Comprehensive cache invalidation
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/by-status/pending_approval'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/by-status/completed'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/by-status/receiving'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/receipts'] });
      if (id) {
        queryClient.invalidateQueries({ queryKey: [`/api/imports/receipts/by-shipment/${id}`] });
      }
      navigate('/receiving');
    },
    onError: (error: any) => {
      toast({
        title: t('rejectionFailed'),
        description: error.message || t('rejectionFailedDesc'),
        variant: "destructive",
      });
    }
  });

  // Calculate statistics
  const statistics = {
    totalItems: 0,
    completeItems: 0,
    partialItems: 0,
    damagedItems: 0,
    missingItems: 0,
    totalExpected: 0,
    totalReceived: 0
  };

  if (receiptData?.items) {
    receiptData.items.forEach((item: any) => {
      statistics.totalItems++;
      const expectedQty = item.expectedQuantity || 0;
      const receivedQty = item.receivedQuantity || 0;
      const damagedQty = item.damagedQuantity || 0;
      const missingQty = item.missingQuantity || 0;
      
      statistics.totalExpected += expectedQty;
      statistics.totalReceived += receivedQty;
      
      // Determine status based on quantities
      if (receivedQty === 0 && missingQty > 0) {
        statistics.missingItems++;
      } else if (damagedQty > 0 && receivedQty === 0) {
        statistics.damagedItems++;
      } else if (receivedQty < expectedQty) {
        statistics.partialItems++;
      } else if (receivedQty === expectedQty && damagedQty === 0 && missingQty === 0) {
        statistics.completeItems++;
      }
    });
  }

  const hasDiscrepancies = statistics.damagedItems > 0 || 
                          statistics.missingItems > 0 || 
                          statistics.partialItems > 0;

  const completionRate = statistics.totalExpected > 0 
    ? Math.round((statistics.totalReceived / statistics.totalExpected) * 100)
    : 0;

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Package className="h-12 w-12 text-muted-foreground animate-pulse mx-auto mb-4" />
            <p className="text-muted-foreground">{t('loadingShipmentDetails')}...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !receiptData) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('error', { ns: 'common' })}</AlertTitle>
          <AlertDescription>
            {t('failedToLoadShipmentDetails')}
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Link href="/receiving">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('backToReceiving')}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { shipment, receipt, items } = receiptData;

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/receiving">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('reviewApprove')}</h1>
            <p className="text-muted-foreground">
              {t('reviewApproveDesc')}
            </p>
          </div>
        </div>
        <Badge variant={hasDiscrepancies ? "warning" : "default"} className="text-sm px-3 py-1">
          {hasDiscrepancies ? t('hasDiscrepancies') : t('noIssues')}
        </Badge>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Shipment Details & Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Shipment Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {t('shipmentInformation')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('shipmentName')}</p>
                  <p className="font-medium">{shipment?.name || t('na', { ns: 'common' })}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('trackingNumber')}</p>
                  <p className="font-medium font-mono">{shipment?.trackingNumber || t('na', { ns: 'common' })}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('carrier')}</p>
                  <p className="font-medium">{shipment?.carrier || t('na', { ns: 'common' })}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('parcelCount')}</p>
                  <p className="font-medium">{shipment?.parcelCount || 1} {t('parcels')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('deliveredDate')}</p>
                  <p className="font-medium">
                    {shipment?.deliveredAt 
                      ? format(new Date(shipment.deliveredAt), 'MMM dd, yyyy HH:mm')
                      : t('na', { ns: 'common' })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('receivedBy')}</p>
                  <p className="font-medium">{receipt?.receivedBy || t('na', { ns: 'common' })}</p>
                </div>
              </div>

              {receipt?.notes && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-1">{t('receivingNotes')}:</p>
                  <p className="text-sm text-muted-foreground">{receipt.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Items List Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Package2 className="h-5 w-5" />
                  {t('receivedItems')}
                </span>
                <Badge variant="outline">
                  {statistics.totalItems} {t('items')}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Desktop Table - Hidden on Mobile */}
              <div className="hidden md:block rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead className="min-w-[250px]">{t('itemDetails')}</TableHead>
                      <TableHead className="text-center w-[100px]">{t('expected')}</TableHead>
                      <TableHead className="text-center w-[120px]">{t('received')}</TableHead>
                      <TableHead className="w-[150px]">{t('status', { ns: 'common' })}</TableHead>
                      <TableHead className="w-[120px]">{t('location', { ns: 'common' })}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items && items.length > 0 ? (
                      items.map((item: any, index: number) => {
                        // Determine item name and SKU based on item type
                        const itemName = item.itemType === 'purchase' && item.purchaseItem
                          ? item.purchaseItem.name
                          : item.itemType === 'consolidation' && item.consolidationItem
                          ? item.consolidationItem.name
                          : item.itemName || t('unknownItem');
                        
                        const itemSku = item.itemType === 'purchase' && item.purchaseItem
                          ? item.purchaseItem.sku
                          : item.itemType === 'consolidation' && item.consolidationItem
                          ? item.consolidationItem.sku
                          : item.barcode || '-';
                        
                        const expectedQty = item.expectedQuantity || 0;
                        const receivedQty = item.receivedQuantity || 0;
                        const damagedQty = item.damagedQuantity || 0;
                        const missingQty = item.missingQuantity || 0;
                        
                        // Determine status based on quantities
                        let status = 'complete';
                        if (receivedQty === 0 && missingQty > 0) {
                          status = 'missing';
                        } else if (damagedQty > 0 && receivedQty === 0) {
                          status = 'damaged';
                        } else if (receivedQty < expectedQty) {
                          if (damagedQty > 0) status = 'partial_damaged';
                          else if (missingQty > 0) status = 'partial_missing';
                          else status = 'partial';
                        } else if (damagedQty > 0) {
                          status = 'damaged';
                        }
                        
                        // Get product image or use placeholder based on item type
                        const itemImage = item.purchaseItem?.imageUrl || null;
                        
                        return (
                          <TableRow key={item.id || index} className="hover:bg-muted/30">
                            {/* Image Column */}
                            <TableCell className="p-2">
                              {itemImage ? (
                                <div className="w-10 h-10 rounded-lg overflow-hidden">
                                  <img 
                                    src={itemImage} 
                                    alt={itemName}
                                    className="w-full h-full object-contain bg-slate-50 dark:bg-slate-900"
                                    data-testid={`img-item-${index}`}
                                  />
                                </div>
                              ) : (
                                <ImagePlaceholder size="xs" variant="subtle" data-testid={`placeholder-item-${index}`} />
                              )}
                            </TableCell>
                            
                            {/* Item Details Column */}
                            <TableCell>
                              <div className="space-y-1">
                                <p className="font-semibold text-sm">{itemName}</p>
                                <p className="text-xs text-muted-foreground font-mono">{itemSku}</p>
                                {item.notes && (
                                  <p className="text-xs text-muted-foreground italic">{item.notes}</p>
                                )}
                              </div>
                            </TableCell>
                            
                            {/* Expected Column */}
                            <TableCell className="text-center">
                              <div className="font-semibold text-lg">
                                {expectedQty}
                              </div>
                            </TableCell>
                            
                            {/* Received Column */}
                            <TableCell className="text-center">
                              <div className="space-y-1">
                                <div className={
                                  receivedQty < expectedQty 
                                    ? "text-amber-600 font-bold text-lg" 
                                    : receivedQty > expectedQty
                                    ? "text-blue-600 font-bold text-lg"
                                    : "text-green-600 font-bold text-lg"
                                }>
                                  {receivedQty}
                                </div>
                                {(damagedQty > 0 || missingQty > 0) && (
                                  <div className="space-y-0.5">
                                    {damagedQty > 0 && (
                                      <div className="text-xs text-red-600 font-medium">
                                        -{damagedQty} {t('damaged')}
                                      </div>
                                    )}
                                    {missingQty > 0 && (
                                      <div className="text-xs text-gray-600 font-medium">
                                        -{missingQty} {t('missing')}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            
                            {/* Status Column */}
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(status, "h-4 w-4")}
                                <Badge 
                                  variant={getStatusColor(status)} 
                                  className="text-xs font-medium"
                                >
                                  {status.replace(/_/g, ' ')}
                                </Badge>
                              </div>
                            </TableCell>
                            
                            {/* Location Column */}
                            <TableCell>
                              <div className="text-sm">
                                {item.warehouseLocation ? (
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3 text-muted-foreground" />
                                      <span className="font-mono text-xs">{item.warehouseLocation}</span>
                                    </div>
                                    {item.additionalLocation && (
                                      <p className="text-xs text-muted-foreground ml-4">
                                        {item.additionalLocation}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2">
                            <Package className="h-8 w-8 text-muted-foreground" />
                            <p className="text-muted-foreground">{t('noItemsFound')}</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards - Shown on Mobile Only */}
              <div className="block md:hidden space-y-3">
                {items && items.length > 0 ? (
                  items.map((item: any, index: number) => {
                    // Determine item name and SKU based on item type
                    const itemName = item.itemType === 'purchase' && item.purchaseItem
                      ? item.purchaseItem.name
                      : item.itemType === 'consolidation' && item.consolidationItem
                      ? item.consolidationItem.name
                      : item.itemName || t('unknownItem');
                    
                    const itemSku = item.itemType === 'purchase' && item.purchaseItem
                      ? item.purchaseItem.sku
                      : item.itemType === 'consolidation' && item.consolidationItem
                      ? item.consolidationItem.sku
                      : item.barcode || '-';
                    
                    const expectedQty = item.expectedQuantity || 0;
                    const receivedQty = item.receivedQuantity || 0;
                    const damagedQty = item.damagedQuantity || 0;
                    const missingQty = item.missingQuantity || 0;
                    
                    // Determine status based on quantities
                    let status = 'complete';
                    if (receivedQty === 0 && missingQty > 0) {
                      status = 'missing';
                    } else if (damagedQty > 0 && receivedQty === 0) {
                      status = 'damaged';
                    } else if (receivedQty < expectedQty) {
                      if (damagedQty > 0) status = 'partial_damaged';
                      else if (missingQty > 0) status = 'partial_missing';
                      else status = 'partial';
                    } else if (damagedQty > 0) {
                      status = 'damaged';
                    }
                    
                    // Get product image or use placeholder based on item type
                    const itemImage = item.purchaseItem?.imageUrl || null;
                    
                    return (
                      <Card key={item.id || index} className="overflow-hidden">
                        <CardContent className="p-4">
                          {/* Header with image and name */}
                          <div className="flex items-start gap-3 mb-3">
                            {itemImage ? (
                              <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0">
                                <img 
                                  src={itemImage} 
                                  alt={itemName}
                                  className="w-full h-full object-contain bg-slate-50 dark:bg-slate-900"
                                  data-testid={`img-item-mobile-${index}`}
                                />
                              </div>
                            ) : (
                              <div className="shrink-0">
                                <ImagePlaceholder size="sm" variant="subtle" data-testid={`placeholder-item-mobile-${index}`} />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm mb-1">{itemName}</p>
                              <p className="text-xs text-muted-foreground font-mono mb-2">{itemSku}</p>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(status, "h-4 w-4")}
                                <Badge 
                                  variant={getStatusColor(status)} 
                                  className="text-xs font-medium"
                                >
                                  {status.replace(/_/g, ' ')}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          {/* Quantities Grid */}
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div className="text-center p-3 bg-muted/30 rounded-lg">
                              <p className="text-xs text-muted-foreground mb-1">{t('expected')}</p>
                              <p className="font-bold text-lg">{expectedQty}</p>
                            </div>
                            <div className="text-center p-3 bg-muted/30 rounded-lg">
                              <p className="text-xs text-muted-foreground mb-1">{t('received')}</p>
                              <p className={
                                receivedQty < expectedQty 
                                  ? "font-bold text-lg text-amber-600" 
                                  : receivedQty > expectedQty
                                  ? "font-bold text-lg text-blue-600"
                                  : "font-bold text-lg text-green-600"
                              }>
                                {receivedQty}
                              </p>
                            </div>
                          </div>

                          {/* Damaged/Missing Details */}
                          {(damagedQty > 0 || missingQty > 0) && (
                            <div className="flex gap-2 mb-3">
                              {damagedQty > 0 && (
                                <div className="flex-1 text-center p-2 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
                                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                                    -{damagedQty} {t('damaged')}
                                  </p>
                                </div>
                              )}
                              {missingQty > 0 && (
                                <div className="flex-1 text-center p-2 bg-gray-50 dark:bg-gray-950/20 rounded-lg border border-gray-200 dark:border-gray-800">
                                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                                    -{missingQty} {t('missing')}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Location */}
                          {item.warehouseLocation && (
                            <div className="pt-3 border-t">
                              <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-xs text-muted-foreground mb-0.5">{t('location', { ns: 'common' })}</p>
                                  <p className="font-mono text-sm font-medium">{item.warehouseLocation}</p>
                                  {item.additionalLocation && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {item.additionalLocation}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Notes */}
                          {item.notes && (
                            <div className="pt-3 border-t mt-3">
                              <p className="text-xs text-muted-foreground italic">{item.notes}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center gap-2 py-8">
                    <Package className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground text-sm">{t('noItemsFound')}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Summary & Actions */}
        <div className="space-y-6">
          {/* Summary Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clipboard className="h-5 w-5" />
                {t('summary', { ns: 'common' })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Completion Progress */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>{t('completionRate')}</span>
                  <span className="font-medium">{completionRate}%</span>
                </div>
                <Progress value={completionRate} className="h-2" />
              </div>

              <Separator />

              {/* Statistics */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('totalExpected')}</span>
                  <span className="font-medium">{statistics.totalExpected}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('totalReceived')}</span>
                  <span className="font-medium">{statistics.totalReceived}</span>
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">{t('complete')}</span>
                  </span>
                  <Badge variant="default">{statistics.completeItems}</Badge>
                </div>
                
                {statistics.partialItems > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      <span className="text-sm">{t('partial')}</span>
                    </span>
                    <Badge variant="warning">{statistics.partialItems}</Badge>
                  </div>
                )}
                
                {statistics.damagedItems > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <AlertOctagon className="h-4 w-4 text-red-600" />
                      <span className="text-sm">{t('damaged')}</span>
                    </span>
                    <Badge variant="destructive">{statistics.damagedItems}</Badge>
                  </div>
                )}
                
                {statistics.missingItems > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <XOctagon className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{t('missing')}</span>
                    </span>
                    <Badge variant="secondary">{statistics.missingItems}</Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Approval Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t('approvalNotes')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder={t('approvalNotesPlaceholder')}
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                className="min-h-[100px]"
                data-testid="textarea-approval-notes"
              />
            </CardContent>
          </Card>

          {/* Alert for Discrepancies */}
          {hasDiscrepancies && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{t('discrepanciesFound')}</AlertTitle>
              <AlertDescription>
                {t('shipmentHasDiscrepancies')} {statistics.damagedItems > 0 && `${statistics.damagedItems} ${t('damaged')}`}
                {statistics.damagedItems > 0 && statistics.missingItems > 0 && ', '}
                {statistics.missingItems > 0 && `${statistics.missingItems} ${t('missing')}`}
                {(statistics.damagedItems > 0 || statistics.missingItems > 0) && statistics.partialItems > 0 && ', and '}
                {statistics.partialItems > 0 && !statistics.damagedItems && !statistics.missingItems && ''}
                {statistics.partialItems > 0 && `${statistics.partialItems} ${t('partial')}`} {t('items')}.
                {t('reviewCarefullyBeforeApproval')}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={() => setShowApproveDialog(true)}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                  data-testid="button-approve-shipment"
                >
                  {approveMutation.isPending ? (
                    <>
                      <Package className="mr-2 h-5 w-5 animate-pulse" />
                      {t('approving')}...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                      {t('approveShipment')}
                    </>
                  )}
                </Button>
                <Button 
                  variant="destructive" 
                  className="w-full" 
                  size="lg"
                  onClick={() => setShowRejectDialog(true)}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                  data-testid="button-reject-shipment"
                >
                  {rejectMutation.isPending ? (
                    <>
                      <Package className="mr-2 h-5 w-5 animate-pulse" />
                      {t('rejecting')}...
                    </>
                  ) : (
                    <>
                      <XCircle className="mr-2 h-5 w-5" />
                      {t('rejectShipment')}
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate('/receiving')}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                  data-testid="button-cancel"
                >
                  {t('cancel', { ns: 'common' })}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Approve Confirmation Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('approveShipmentQuestion')}</AlertDialogTitle>
            <AlertDialogDescription>
              {hasDiscrepancies ? (
                <div className="space-y-2">
                  <p>{t('shipmentHasDiscrepancies')}:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {statistics.damagedItems > 0 && (
                      <li>{statistics.damagedItems} {t('damagedItems')}</li>
                    )}
                    {statistics.missingItems > 0 && (
                      <li>{statistics.missingItems} {t('missingItems')}</li>
                    )}
                    {statistics.partialItems > 0 && (
                      <li>{statistics.partialItems} {t('partiallyReceivedItems')}</li>
                    )}
                  </ul>
                  <p className="mt-2">{t('confirmApproveShipmentQuestion')}</p>
                </div>
              ) : (
                t('approveShipmentConfirmation')
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel', { ns: 'common' })}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowApproveDialog(false);
                approveMutation.mutate();
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              {approveMutation.isPending ? `${t('approving')}...` : t('confirmApproval')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Confirmation Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('rejectShipmentQuestion')}</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4">
                <p>{t('rejectShipmentDescription')}</p>
                <div>
                  <Label htmlFor="rejection-reason" className="mb-2">
                    {t('rejectionReasonRequired')}
                  </Label>
                  <Textarea
                    id="rejection-reason"
                    placeholder={t('rejectionReasonPlaceholder')}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="min-h-[80px]"
                    data-testid="textarea-rejection-reason"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel', { ns: 'common' })}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!rejectionReason.trim()) {
                  toast({
                    title: t('reasonRequired'),
                    description: t('reasonRequiredDesc'),
                    variant: "destructive",
                  });
                  return;
                }
                setShowRejectDialog(false);
                rejectMutation.mutate();
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              {rejectMutation.isPending ? `${t('rejecting')}...` : t('confirmRejection')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}