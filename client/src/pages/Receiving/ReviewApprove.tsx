import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
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
      if (!response.ok) throw new Error('Failed to fetch receipt data');
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
        title: "Shipment Approved",
        description: "The shipment has been successfully approved and completed.",
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
        title: "Approval Failed",
        description: error.message || "Failed to approve the shipment. Please try again.",
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
        title: "Shipment Rejected",
        description: "The shipment has been rejected and returned to receiving status.",
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
        title: "Rejection Failed",
        description: error.message || "Failed to reject the shipment. Please try again.",
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
            <p className="text-muted-foreground">Loading shipment details...</p>
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
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load shipment details. Please try again.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Link href="/receiving">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Receiving
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
            <h1 className="text-3xl font-bold tracking-tight">Review & Approve</h1>
            <p className="text-muted-foreground">
              Review the received shipment and approve or reject
            </p>
          </div>
        </div>
        <Badge variant={hasDiscrepancies ? "warning" : "default"} className="text-sm px-3 py-1">
          {hasDiscrepancies ? "Has Discrepancies" : "No Issues"}
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
                Shipment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Shipment Name</p>
                  <p className="font-medium">{shipment?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Tracking Number</p>
                  <p className="font-medium font-mono">{shipment?.trackingNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Carrier</p>
                  <p className="font-medium">{shipment?.carrier || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Parcel Count</p>
                  <p className="font-medium">{shipment?.parcelCount || 1} parcels</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Delivered Date</p>
                  <p className="font-medium">
                    {shipment?.deliveredAt 
                      ? format(new Date(shipment.deliveredAt), 'MMM dd, yyyy HH:mm')
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Received By</p>
                  <p className="font-medium">{receipt?.receivedBy || 'N/A'}</p>
                </div>
              </div>

              {receipt?.notes && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-1">Receiving Notes:</p>
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
                  Received Items
                </span>
                <Badge variant="outline">
                  {statistics.totalItems} items
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[35%]">Item Name</TableHead>
                      <TableHead className="w-[15%]">SKU</TableHead>
                      <TableHead className="text-center w-[10%]">Expected</TableHead>
                      <TableHead className="text-center w-[10%]">Received</TableHead>
                      <TableHead className="w-[15%]">Status</TableHead>
                      <TableHead className="w-[15%]">Location</TableHead>
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
                          : item.itemName || 'Unknown Item';
                        
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
                        
                        return (
                          <TableRow key={item.id || index}>
                            <TableCell>
                              <div className="space-y-1">
                                <p className="font-medium">{itemName}</p>
                                {item.notes && (
                                  <p className="text-xs text-muted-foreground">{item.notes}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-mono text-sm">{itemSku}</span>
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {expectedQty}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="space-y-1">
                                <span className={
                                  receivedQty < expectedQty 
                                    ? "text-amber-600 font-bold" 
                                    : receivedQty > expectedQty
                                    ? "text-blue-600 font-bold"
                                    : "text-green-600 font-bold"
                                }>
                                  {receivedQty}
                                </span>
                                {(damagedQty > 0 || missingQty > 0) && (
                                  <div className="text-xs space-y-0.5">
                                    {damagedQty > 0 && (
                                      <p className="text-red-600">-{damagedQty} damaged</p>
                                    )}
                                    {missingQty > 0 && (
                                      <p className="text-gray-600">-{missingQty} missing</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                {getStatusIcon(status, "h-3.5 w-3.5")}
                                <Badge 
                                  variant={getStatusColor(status)} 
                                  className="text-xs"
                                >
                                  {status.replace(/_/g, ' ')}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {item.warehouseLocation && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3 text-muted-foreground" />
                                    <span className="font-mono">{item.warehouseLocation}</span>
                                  </div>
                                )}
                                {item.additionalLocation && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {item.additionalLocation}
                                  </p>
                                )}
                                {!item.warehouseLocation && !item.additionalLocation && (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2">
                            <Package className="h-8 w-8 text-muted-foreground" />
                            <p className="text-muted-foreground">No items found for this shipment</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
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
                Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Completion Progress */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Completion Rate</span>
                  <span className="font-medium">{completionRate}%</span>
                </div>
                <Progress value={completionRate} className="h-2" />
              </div>

              <Separator />

              {/* Statistics */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Expected</span>
                  <span className="font-medium">{statistics.totalExpected}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Received</span>
                  <span className="font-medium">{statistics.totalReceived}</span>
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Complete</span>
                  </span>
                  <Badge variant="default">{statistics.completeItems}</Badge>
                </div>
                
                {statistics.partialItems > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      <span className="text-sm">Partial</span>
                    </span>
                    <Badge variant="warning">{statistics.partialItems}</Badge>
                  </div>
                )}
                
                {statistics.damagedItems > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <AlertOctagon className="h-4 w-4 text-red-600" />
                      <span className="text-sm">Damaged</span>
                    </span>
                    <Badge variant="destructive">{statistics.damagedItems}</Badge>
                  </div>
                )}
                
                {statistics.missingItems > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <XOctagon className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">Missing</span>
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
                Approval Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Add any notes about this shipment (optional)..."
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
              <AlertTitle>Discrepancies Found</AlertTitle>
              <AlertDescription>
                This shipment has {statistics.damagedItems > 0 && `${statistics.damagedItems} damaged`}
                {statistics.damagedItems > 0 && statistics.missingItems > 0 && ', '}
                {statistics.missingItems > 0 && `${statistics.missingItems} missing`}
                {(statistics.damagedItems > 0 || statistics.missingItems > 0) && statistics.partialItems > 0 && ', and '}
                {statistics.partialItems > 0 && !statistics.damagedItems && !statistics.missingItems && ''}
                {statistics.partialItems > 0 && `${statistics.partialItems} partial`} items.
                Please review carefully before approval.
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
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                      Approve Shipment
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
                      Rejecting...
                    </>
                  ) : (
                    <>
                      <XCircle className="mr-2 h-5 w-5" />
                      Reject Shipment
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
                  Cancel
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
            <AlertDialogTitle>Approve Shipment?</AlertDialogTitle>
            <AlertDialogDescription>
              {hasDiscrepancies ? (
                <div className="space-y-2">
                  <p>This shipment has discrepancies:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {statistics.damagedItems > 0 && (
                      <li>{statistics.damagedItems} damaged items</li>
                    )}
                    {statistics.missingItems > 0 && (
                      <li>{statistics.missingItems} missing items</li>
                    )}
                    {statistics.partialItems > 0 && (
                      <li>{statistics.partialItems} partially received items</li>
                    )}
                  </ul>
                  <p className="mt-2">Are you sure you want to approve this shipment?</p>
                </div>
              ) : (
                "This will mark the shipment as completed. Are you sure you want to approve?"
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowApproveDialog(false);
                approveMutation.mutate();
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              {approveMutation.isPending ? "Approving..." : "Confirm Approval"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Confirmation Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Shipment?</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4">
                <p>This will return the shipment to receiving status for re-processing.</p>
                <div>
                  <Label htmlFor="rejection-reason" className="mb-2">
                    Rejection Reason (Required)
                  </Label>
                  <Textarea
                    id="rejection-reason"
                    placeholder="Please provide a reason for rejection..."
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
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!rejectionReason.trim()) {
                  toast({
                    title: "Reason Required",
                    description: "Please provide a reason for rejection.",
                    variant: "destructive",
                  });
                  return;
                }
                setShowRejectDialog(false);
                rejectMutation.mutate();
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              {rejectMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}