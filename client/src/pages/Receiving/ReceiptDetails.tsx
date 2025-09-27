import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { 
  ArrowLeft, 
  Package, 
  QrCode,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  MapPin,
  FileText,
  Camera,
  Plus,
  Minus,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Calculator,
  Hash,
  Truck,
  Calendar,
  Package2,
  Check,
  X,
  Download,
  ZoomIn,
  ClipboardCheck,
  Info
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import CostsPanel from "@/components/receiving/CostsPanel";

interface ReceiptItem {
  id: number;
  itemId: number;
  itemType: 'purchase' | 'custom';
  expectedQuantity: number;
  receivedQuantity: number;
  damagedQuantity: number;
  missingQuantity: number;
  barcode?: string;
  warehouseLocation?: string;
  additionalLocation?: string;
  storageInstructions?: string;
  condition: string;
  notes?: string;
  photos?: string[];
  verifiedAt?: string;
  details: any; // Item details from purchase_items or custom_items
}

export default function ReceiptDetails() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [selectedItem, setSelectedItem] = useState<ReceiptItem | null>(null);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>("");
  
  // Verification form state
  const [verifiedBy, setVerifiedBy] = useState("");
  const [damageNotes, setDamageNotes] = useState("");
  
  // Approval form state
  const [approvedBy, setApprovedBy] = useState("");

  // Fetch receipt details
  const { data: receipt, isLoading, refetch } = useQuery({
    queryKey: [`/api/imports/receipts/${id}`],
    queryFn: async () => {
      const response = await fetch(`/api/imports/receipts/${id}`);
      if (!response.ok) throw new Error('Failed to fetch receipt');
      return response.json();
    },
    enabled: !!id
  });

  // Update item verification
  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, data }: { itemId: number; data: any }) => {
      const response = await fetch(`/api/imports/receipts/${id}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update item');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Item Updated",
        description: "Item verification details saved"
      });
      refetch();
      setSelectedItem(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update item",
        variant: "destructive"
      });
    }
  });

  // Complete verification
  const completeVerificationMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/imports/receipts/${id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to complete verification');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Verification Complete",
        description: "Receipt sent for approval"
      });
      refetch();
      setShowVerifyDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete verification",
        variant: "destructive"
      });
    }
  });

  // Approve receipt
  const approveReceiptMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/imports/receipts/approve/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to approve receipt');
      }
      return response.json();
    },
    onSuccess: (data) => {
      const itemCount = data.inventoryItems?.length || 0;
      const updatedCount = data.inventoryItems?.filter((i: any) => i.action === 'updated').length || 0;
      const createdCount = data.inventoryItems?.filter((i: any) => i.action === 'created').length || 0;
      
      toast({
        title: "Receipt Approved ✅",
        description: `Successfully processed ${itemCount} items: ${createdCount} new products created, ${updatedCount} existing products updated with weighted average cost calculations`
      });
      refetch();
      setShowApprovalDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve receipt",
        variant: "destructive"
      });
    }
  });

  const handleItemVerification = (item: ReceiptItem) => {
    setSelectedItem(item);
  };

  const saveItemVerification = () => {
    if (!selectedItem) return;

    // Calculate missing quantity automatically
    const calculatedMissingQuantity = Math.max(0, selectedItem.expectedQuantity - selectedItem.receivedQuantity - selectedItem.damagedQuantity);

    updateItemMutation.mutate({
      itemId: selectedItem.itemId, // Use the shipment item ID, not the receipt item ID
      data: {
        receivedQuantity: selectedItem.receivedQuantity,
        damagedQuantity: selectedItem.damagedQuantity,
        missingQuantity: calculatedMissingQuantity,
        barcode: selectedItem.barcode,
        warehouseLocation: selectedItem.warehouseLocation,
        additionalLocation: selectedItem.additionalLocation,
        storageInstructions: selectedItem.storageInstructions,
        condition: selectedItem.condition,
        notes: selectedItem.notes,
        verifiedAt: new Date().toISOString() // Mark as verified when saved
      }
    });
  };

  const handleCompleteVerification = () => {
    completeVerificationMutation.mutate({
      verifiedBy,
      damageNotes
    });
  };

  const handleApproval = () => {
    approveReceiptMutation.mutate({
      approvedBy
    });
  };

  // Helper function to download all photos
  const downloadAllPhotos = async () => {
    if (!receipt?.photos || receipt.photos.length === 0) return;

    receipt.photos.forEach((photo: any, index: number) => {
      const photoSrc = typeof photo === 'string' ? photo : (photo.url || photo.dataUrl || photo.compressed);
      if (photoSrc) {
        const link = document.createElement('a');
        link.href = photoSrc;
        link.download = `receipt-${receipt.id}-photo-${index + 1}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });

    toast({
      title: "Download Started",
      description: `Downloading ${receipt.photos.length} photos...`
    });
  };

  // Helper function to open image preview
  const openImagePreview = (photoSrc: string) => {
    setPreviewImage(photoSrc);
    setShowImagePreview(true);
  };

  if (isLoading || !receipt) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_verification':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'pending_approval':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'good':
        return 'text-green-600';
      case 'damaged':
        return 'text-red-600';
      case 'partial':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };

  const allItemsVerified = receipt.items?.every((item: ReceiptItem) => item.verifiedAt);
  const hasDamagedItems = receipt.items?.some((item: ReceiptItem) => item.damagedQuantity > 0);
  const hasMissingItems = receipt.items?.some((item: ReceiptItem) => item.missingQuantity > 0);

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Link href="/receiving">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Receiving
          </Button>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Receipt #{receipt.id}</h1>
            <p className="text-muted-foreground">
              Verify and process received items
            </p>
          </div>
          <Badge className={`${getStatusColor(receipt.status)} text-lg px-3 py-1`}>
            {receipt.status?.replace(/_/g, ' ').toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Receipt Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Receipt Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Received By</p>
              <p className="font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                {receipt.receivedBy}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Received At</p>
              <p className="font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {format(new Date(receipt.receivedAt), 'MMM dd, yyyy HH:mm')}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Parcels</p>
              <p className="font-medium flex items-center gap-2">
                <Package className="h-4 w-4" />
                {receipt.parcelCount} parcels
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Carrier</p>
              <p className="font-medium flex items-center gap-2">
                <Truck className="h-4 w-4" />
                {receipt.carrier}
              </p>
            </div>
            {receipt.verifiedBy && (
              <div>
                <p className="text-sm text-muted-foreground">Verified By</p>
                <p className="font-medium flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  {receipt.verifiedBy}
                </p>
              </div>
            )}
            {receipt.approvedBy && (
              <div>
                <p className="text-sm text-muted-foreground">Approved By</p>
                <p className="font-medium flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  {receipt.approvedBy}
                </p>
              </div>
            )}
          </div>

          {receipt.trackingNumbers?.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-2">Tracking Numbers</p>
              <div className="flex flex-wrap gap-2">
                {receipt.trackingNumbers.map((tn: string, index: number) => (
                  <Badge key={index} variant="secondary">
                    <Hash className="h-3 w-3 mr-1" />
                    {tn}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {receipt.notes && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded">
              <p className="text-sm text-muted-foreground mb-1">Initial Notes</p>
              <p className="text-sm">{receipt.notes}</p>
            </div>
          )}

          {receipt.damageNotes && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-950 rounded">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">Damage Report</p>
                  <p className="text-sm text-red-700 dark:text-red-300">{receipt.damageNotes}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photos Section */}
      {receipt.photos && receipt.photos.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Photos ({receipt.photos.length})
                </CardTitle>
                <CardDescription>
                  Photos uploaded during receiving process
                </CardDescription>
              </div>
              <Button 
                onClick={downloadAllPhotos}
                variant="outline" 
                size="sm"
                className="flex items-center gap-2"
                data-testid="button-download-all-photos"
              >
                <Download className="h-4 w-4" />
                Download All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 md:gap-4">
              {receipt.photos.map((photo: any, index: number) => {
                // Handle both string format (base64 data URL) and object format
                const photoSrc = typeof photo === 'string' ? photo : (photo.url || photo.dataUrl || photo.compressed);
                const photoTimestamp = typeof photo === 'object' ? photo.timestamp : null;
                
                return (
                  <div key={index} className="relative group">
                    <div 
                      className="aspect-square overflow-hidden rounded-lg border bg-muted cursor-pointer transition-all hover:shadow-lg hover:ring-2 hover:ring-primary"
                      onClick={() => openImagePreview(photoSrc)}
                      data-testid={`photo-${index}`}
                    >
                      <img
                        src={photoSrc}
                        alt={`Receipt photo ${index + 1}`}
                        className="w-full h-full object-cover transition-transform group-hover:scale-110"
                        loading="lazy"
                        onError={(e) => {
                          console.error('Photo failed to load:', photoSrc?.substring(0, 50) + '...');
                          e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjZjNmNGY2Ii8+CjxwYXRoIGQ9Ik0xMiA5VjEzTTEyIDE3SDE2TTEyIDdIOCIgc3Ryb2tlPSIjNjM2YzgzIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4K';
                        }}
                      />
                      {/* Hover overlay with zoom icon */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                        <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                      </div>
                    </div>
                    {photoTimestamp && (
                      <p className="text-xs text-muted-foreground mt-1 text-center">
                        {format(new Date(photoTimestamp), 'MMM dd, HH:mm')}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shipment Info */}
      {receipt.shipment && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Shipment Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Shipment Name</p>
                <p className="font-medium">{receipt.shipment.shipmentName || `Shipment #${receipt.shipment.id}`}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tracking</p>
                <p className="font-medium">{receipt.shipment.trackingNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Route</p>
                <p className="font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {receipt.shipment.origin} → {receipt.shipment.destination}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Contents</p>
                <p className="font-medium">
                  {receipt.shipment.totalUnits} {receipt.shipment.unitType || 'items'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs for Items and Landing Costs */}
      <Tabs defaultValue="items" className="mb-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="items" data-testid="tab-items">Items Verification</TabsTrigger>
          <TabsTrigger value="costs" data-testid="tab-landing-costs">Landing Costs</TabsTrigger>
        </TabsList>

        <TabsContent value="items">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Items Verification</CardTitle>
                  <CardDescription>
                    Verify each item's quantity, condition, and location
                  </CardDescription>
                </div>
                {hasDamagedItems && (
                  <Badge variant="destructive">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Has Damaged Items
                  </Badge>
                )}
                {hasMissingItems && (
                  <Badge variant="destructive">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Has Missing Items
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {receipt.items?.map((item: ReceiptItem) => (
              <div key={item.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium">{item.details?.name || `Item #${item.itemId}`}</h4>
                    <p className="text-sm text-muted-foreground">
                      {item.details?.sku && `SKU: ${item.details.sku}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.verifiedAt ? (
                      <Badge variant="outline" className="bg-green-50 border-green-300">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    )}
                    <Badge className={getConditionColor(item.condition)}>
                      {item.condition}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Expected</p>
                    <p className="font-medium">{item.expectedQuantity}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Received</p>
                    <p className={`font-medium ${item.receivedQuantity < item.expectedQuantity ? 'text-orange-600' : 'text-green-600'}`}>
                      {item.receivedQuantity}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Damaged</p>
                    <p className={`font-medium ${item.damagedQuantity > 0 ? 'text-red-600' : ''}`}>
                      {item.damagedQuantity}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Missing</p>
                    <p className={`font-medium ${item.missingQuantity > 0 ? 'text-red-600' : ''}`}>
                      {item.missingQuantity}
                    </p>
                  </div>
                </div>

                {item.warehouseLocation && (
                  <div className="flex items-center gap-2 text-sm mb-2">
                    <MapPin className="h-3 w-3" />
                    <span>{item.warehouseLocation}</span>
                    {item.additionalLocation && (
                      <span className="text-muted-foreground">• {item.additionalLocation}</span>
                    )}
                  </div>
                )}

                {item.barcode && (
                  <div className="flex items-center gap-2 text-sm mb-2">
                    <QrCode className="h-3 w-3" />
                    <span>{item.barcode}</span>
                  </div>
                )}

                {item.notes && (
                  <div className="text-sm text-muted-foreground bg-gray-50 dark:bg-gray-900 p-2 rounded mb-2">
                    {item.notes}
                  </div>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleItemVerification(item)}
                  data-testid={`button-verify-item-${item.id}`}
                >
                  {item.verifiedAt ? 'Edit Verification' : 'Verify Item'}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </TabsContent>

    <TabsContent value="costs">
      {receipt.shipment?.id ? (
        <CostsPanel 
          shipmentId={receipt.shipment.id} 
          receiptId={receipt.id}
          onUpdate={refetch}
        />
      ) : (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No shipment associated with this receipt</p>
              <p className="text-sm mt-2">Landing costs require a shipment to be linked</p>
            </div>
          </CardContent>
        </Card>
      )}
    </TabsContent>
  </Tabs>

      {/* Task Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Receipt Tasks
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Task List */}
          <div className="space-y-3">
            {/* Item Verification Task */}
            <div className="flex items-start gap-3 p-3 rounded-lg border">
              <div className="mt-1">
                {allItemsVerified ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium">
                  {allItemsVerified ? 'All Items Verified' : 'Verify All Items'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {allItemsVerified 
                    ? `${receipt.items?.length || 0} items have been verified with quantities and conditions`
                    : `${receipt.items?.filter((item: any) => item.verifiedAt).length || 0}/${receipt.items?.length || 0} items verified`
                  }
                </p>
              </div>
              {!allItemsVerified && (
                <Badge variant="outline" className="text-orange-600 border-orange-600">
                  Required
                </Badge>
              )}
            </div>

            {/* Complete Verification Task */}
            <div className="flex items-start gap-3 p-3 rounded-lg border">
              <div className="mt-1">
                {receipt.status !== 'pending_verification' ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <Clock className="h-5 w-5 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium">
                  {receipt.status !== 'pending_verification' ? 'Verification Completed' : 'Complete Verification'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {receipt.status !== 'pending_verification'
                    ? `Verified by ${receipt.verifiedBy || 'Unknown'}`
                    : 'Submit verification to send for approval'
                  }
                </p>
              </div>
              {receipt.status === 'pending_verification' && (
                <Badge variant="outline" className="text-blue-600 border-blue-600">
                  Next Step
                </Badge>
              )}
            </div>

            {/* Approval Task */}
            <div className="flex items-start gap-3 p-3 rounded-lg border">
              <div className="mt-1">
                {receipt.status === 'approved' ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : receipt.status === 'pending_approval' ? (
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                ) : (
                  <Clock className="h-5 w-5 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium">
                  {receipt.status === 'approved' ? 'Receipt Approved' : 
                   receipt.status === 'pending_approval' ? 'Pending Approval' : 
                   'Awaiting Approval'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {receipt.status === 'approved'
                    ? `Approved by ${receipt.approvedBy || 'Unknown'} - Items added to inventory`
                    : receipt.status === 'pending_approval'
                    ? 'Receipt is ready for founder approval'
                    : 'Complete verification first'
                  }
                </p>
              </div>
              {receipt.status === 'pending_approval' && (
                <Badge variant="outline" className="text-orange-600 border-orange-600">
                  Action Needed
                </Badge>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span>
                {receipt.status === 'approved' ? '100%' : 
                 receipt.status === 'pending_approval' ? '75%' : 
                 allItemsVerified ? '50%' : '25%'}
              </span>
            </div>
            <Progress 
              value={
                receipt.status === 'approved' ? 100 : 
                receipt.status === 'pending_approval' ? 75 : 
                allItemsVerified ? 50 : 25
              } 
              className="h-2"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 pt-4 border-t">
            {receipt.status === 'pending_verification' && (
              <>
                <Button
                  onClick={() => setShowVerifyDialog(true)}
                  disabled={!allItemsVerified}
                  data-testid="button-complete-verification"
                  className={allItemsVerified ? 'bg-green-600 hover:bg-green-700' : ''}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {allItemsVerified ? 'Complete Verification' : 'Complete Verification (Verify Items First)'}
                </Button>
                {!allItemsVerified && (
                  <p className="text-sm text-muted-foreground self-center">
                    Please verify all items before completing verification
                  </p>
                )}
              </>
            )}
            {receipt.status === 'pending_approval' && (
              <>
                <Button
                  onClick={() => setShowApprovalDialog(true)}
                  data-testid="button-approve-receipt"
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Approve & Add to Inventory
                </Button>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Info className="h-4 w-4" />
                  <span>This will add all verified items to inventory</span>
                </div>
              </>
            )}
            {receipt.status === 'approved' && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">All tasks completed - Items are now in inventory</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Item Verification Dialog */}
      {selectedItem && (
        <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Verify Item</DialogTitle>
              <DialogDescription>
                {selectedItem.details?.name || `Item #${selectedItem.itemId}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Expected Quantity</Label>
                  <Input value={selectedItem.expectedQuantity} disabled />
                </div>
                <div>
                  <Label>Received Quantity</Label>
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => setSelectedItem({
                        ...selectedItem,
                        receivedQuantity: Math.max(0, selectedItem.receivedQuantity - 1)
                      })}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      value={selectedItem.receivedQuantity}
                      onChange={(e) => setSelectedItem({
                        ...selectedItem,
                        receivedQuantity: parseInt(e.target.value) || 0
                      })}
                      className="text-center"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => setSelectedItem({
                        ...selectedItem,
                        receivedQuantity: selectedItem.receivedQuantity + 1
                      })}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Damaged Quantity</Label>
                  <Input
                    type="number"
                    value={selectedItem.damagedQuantity}
                    onChange={(e) => setSelectedItem({
                      ...selectedItem,
                      damagedQuantity: parseInt(e.target.value) || 0
                    })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Barcode</Label>
                  <div className="relative">
                    <QrCode className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={selectedItem.barcode || ""}
                      onChange={(e) => setSelectedItem({
                        ...selectedItem,
                        barcode: e.target.value
                      })}
                      placeholder="Scan or enter barcode"
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label>Condition</Label>
                  <Select
                    value={selectedItem.condition}
                    onValueChange={(value) => setSelectedItem({
                      ...selectedItem,
                      condition: value
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="damaged">Damaged</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Warehouse Location</Label>
                  <Input
                    value={selectedItem.warehouseLocation || ""}
                    onChange={(e) => setSelectedItem({
                      ...selectedItem,
                      warehouseLocation: e.target.value
                    })}
                    placeholder="e.g., A-12-3"
                  />
                </div>
                <div>
                  <Label>Additional Location</Label>
                  <Input
                    value={selectedItem.additionalLocation || ""}
                    onChange={(e) => setSelectedItem({
                      ...selectedItem,
                      additionalLocation: e.target.value
                    })}
                    placeholder="e.g., Shelf 2"
                  />
                </div>
              </div>

              <div>
                <Label>Storage Instructions</Label>
                <Textarea
                  value={selectedItem.storageInstructions || ""}
                  onChange={(e) => setSelectedItem({
                    ...selectedItem,
                    storageInstructions: e.target.value
                  })}
                  placeholder="Special storage requirements..."
                />
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={selectedItem.notes || ""}
                  onChange={(e) => setSelectedItem({
                    ...selectedItem,
                    notes: e.target.value
                  })}
                  placeholder="Additional notes about this item..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedItem(null)}>
                Cancel
              </Button>
              <Button onClick={saveItemVerification}>
                Save Verification
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Complete Verification Dialog */}
      <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Verification</DialogTitle>
            <DialogDescription>
              Send this receipt for founder approval
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Verified By</Label>
              <Input
                value={verifiedBy}
                onChange={(e) => setVerifiedBy(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div>
              <Label>Damage Report (if any)</Label>
              <Textarea
                value={damageNotes}
                onChange={(e) => setDamageNotes(e.target.value)}
                placeholder="Describe any damage or issues found..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVerifyDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCompleteVerification}>
              Complete Verification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Receipt</DialogTitle>
            <DialogDescription>
              Approve this receipt and add items to inventory
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Approved By</Label>
              <Input
                value={approvedBy}
                onChange={(e) => setApprovedBy(e.target.value)}
                placeholder="Your name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleApproval}>
              Approve & Add to Inventory
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={showImagePreview} onOpenChange={setShowImagePreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-2">
          <DialogHeader className="px-4 py-2">
            <DialogTitle>Photo Preview</DialogTitle>
          </DialogHeader>
          <div className="relative flex items-center justify-center bg-black rounded-lg overflow-hidden">
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-[70vh] object-contain"
              data-testid="preview-image"
            />
            <Button
              onClick={() => setShowImagePreview(false)}
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
              data-testid="button-close-preview"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogFooter className="px-4 py-2">
            <Button
              onClick={() => {
                const link = document.createElement('a');
                link.href = previewImage;
                link.download = `receipt-${receipt.id}-photo.jpg`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              variant="outline"
              className="flex items-center gap-2"
              data-testid="button-download-single-photo"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
            <Button onClick={() => setShowImagePreview(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}