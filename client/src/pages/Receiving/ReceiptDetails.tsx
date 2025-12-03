import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useTranslation } from 'react-i18next';
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useSettings } from "@/contexts/SettingsContext";
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
  DollarSign,
  Hash,
  Truck,
  Calendar,
  Package2,
  Check,
  X,
  Download,
  ZoomIn,
  ClipboardCheck,
  Info,
  Undo2,
  MoreVertical,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import CostsPanel from "@/components/receiving/CostsPanel";
import PriceSettingModal from "@/components/receiving/PriceSettingModal";
import { apiRequest } from "@/lib/queryClient";

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
  const { t } = useTranslation(['imports']);
  const { inventorySettings } = useSettings();
  const scanningEnabled = inventorySettings.enableBarcodeScanning ?? true;
  
  const [selectedItem, setSelectedItem] = useState<ReceiptItem | null>(null);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showPriceSettingModal, setShowPriceSettingModal] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>("");
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState<number>(0);
  
  // Verification form state
  const [verifiedBy, setVerifiedBy] = useState("");
  const [damageNotes, setDamageNotes] = useState("");
  
  // Approval form state
  const [approvedBy, setApprovedBy] = useState("");

  // Fetch receipt details - try receipt first, then shipment for archived items
  const { data: receipt, isLoading, refetch } = useQuery({
    queryKey: [`/api/imports/receipts/${id}`],
    queryFn: async () => {
      // First try to fetch as a receipt
      const receiptResponse = await fetch(`/api/imports/receipts/${id}`);
      if (receiptResponse.ok) {
        return receiptResponse.json();
      }
      
      // If receipt not found (404), try to fetch as shipment (for archived items)
      if (receiptResponse.status === 404) {
        const shipmentResponse = await fetch(`/api/imports/shipments/${id}`);
        if (shipmentResponse.ok) {
          const shipment = await shipmentResponse.json();
          
          // Create a pseudo-receipt object from shipment data for archived items
          if (shipment.receivingStatus === 'archived') {
            return {
              id: shipment.id,
              shipmentId: shipment.id,
              consolidationId: shipment.consolidationId,
              status: 'archived',
              receivedBy: 'System', // Could be retrieved from actual receipt data if needed
              receivedAt: shipment.deliveredAt || shipment.updatedAt,
              parcelCount: shipment.totalUnits || 0,
              warehouseLocation: shipment.warehouseLocation,
              notes: shipment.notes,
              items: shipment.items?.map((item: any, index: number) => ({
                id: index + 1,
                itemId: item.id,
                itemType: 'purchase',
                expectedQuantity: item.quantity || 0,
                receivedQuantity: item.quantity || 0,
                damagedQuantity: 0,
                missingQuantity: 0,
                condition: 'good',
                notes: '',
                photos: [],
                details: item,
                warehouseLocation: 'Stored',
                verifiedAt: shipment.deliveredAt
              })) || [],
              shipment: shipment,
              isArchivedView: true // Flag to indicate this is an archived view
            };
          }
        }
      }
      
      throw new Error('Failed to fetch receipt or shipment');
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
        title: t('itemUpdated'),
        description: t('itemVerificationSaved')
      });
      refetch();
      setSelectedItem(null);
    },
    onError: (error: any) => {
      toast({
        title: t('error', { ns: 'common' }),
        description: error.message || t('failedToUpdateItem'),
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
      if (!response.ok) throw new Error(t('failedToCompleteVerification'));
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t('verificationComplete'),
        description: t('receiptSentForApproval')
      });
      refetch();
      setShowVerifyDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: t('error', { ns: 'common' }),
        description: error.message || t('failedToCompleteVerification'),
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
        throw new Error(error.message || t('failedToApproveReceipt'));
      }
      return response.json();
    },
    onSuccess: (data) => {
      const itemCount = data.inventoryItems?.length || 0;
      const updatedCount = data.inventoryItems?.filter((i: any) => i.action === 'updated').length || 0;
      const createdCount = data.inventoryItems?.filter((i: any) => i.action === 'created').length || 0;
      
      toast({
        title: t('receiptApproved'),
        description: `${t('successfullyProcessed')} ${itemCount} ${t('items')}: ${createdCount} ${t('newProductsCreated')}, ${updatedCount} ${t('productsUpdated')}`
      });
      refetch();
      setShowApprovalDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: t('error', { ns: 'common' }),
        description: error.message || t('failedToApproveReceipt'),
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

  const handleApproval = (approverName?: string | null) => {
    // If approverName is null, it means the approval was already done by the PriceSettingModal
    // In that case, just refetch the data without calling the approval API again
    if (approverName === null) {
      refetch();
      return;
    }
    
    approveReceiptMutation.mutate({
      approvedBy: approverName || approvedBy
    });
  };

  const handleOpenPriceModal = () => {
    setShowPriceSettingModal(true);
  };

  // Bulk verify all unverified items with default values
  const handleBulkVerifyItems = () => {
    if (!receipt?.items) return;

    const unverifiedItems = receipt.items.filter((item: ReceiptItem) => !item.verifiedAt);
    
    if (unverifiedItems.length === 0) {
      toast({
        title: t('allItemsVerified'),
        description: t('allItemsAlreadyVerified')
      });
      return;
    }

    // Verify each unverified item with sensible defaults
    unverifiedItems.forEach((item: ReceiptItem) => {
      const verificationData = {
        receivedQuantity: item.expectedQuantity, // Assume all expected items were received
        damagedQuantity: 0, // Assume no damage
        missingQuantity: 0, // Calculated as 0 since received = expected
        barcode: item.barcode || "",
        warehouseLocation: item.warehouseLocation || "",
        additionalLocation: item.additionalLocation || "",
        storageInstructions: item.storageInstructions || "",
        condition: "good", // Default to good condition
        notes: item.notes || "",
        verifiedAt: new Date().toISOString()
      };

      updateItemMutation.mutate({
        itemId: item.itemId,
        data: verificationData
      });
    });

    toast({
      title: t('bulkVerificationStarted'),
      description: `${t('verifying')} ${unverifiedItems.length} ${t('items')}...`
    });
  };

  // Undo verification for a single item
  const handleUndoVerification = (item: ReceiptItem) => {
    updateItemMutation.mutate({
      itemId: item.itemId,
      data: {
        receivedQuantity: item.receivedQuantity,
        damagedQuantity: item.damagedQuantity,
        missingQuantity: item.missingQuantity,
        barcode: item.barcode,
        warehouseLocation: item.warehouseLocation,
        additionalLocation: item.additionalLocation,
        storageInstructions: item.storageInstructions,
        condition: item.condition,
        notes: item.notes,
        verifiedAt: null // Clear verification status
      }
    });

    toast({
      title: t('verificationUndone'),
      description: t('verificationRemoved')
    });
  };

  // Undo approval mutation
  const undoApprovalMutation = useMutation({
    mutationFn: async (data: { reason?: string }) => {
      const response = await fetch(`/api/imports/receipts/undo-approve/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to undo approval');
      }
      return response.json();
    },
    onSuccess: (data) => {
      const itemCount = data.revertedItems?.length || 0;
      const deletedCount = data.revertedItems?.filter((i: any) => i.action === 'deleted').length || 0;
      const updatedCount = data.revertedItems?.filter((i: any) => i.action === 'updated').length || 0;
      
      toast({
        title: t('approvalUndone'),
        description: `${t('successfullyReverted')} ${itemCount} ${t('items')}: ${deletedCount} ${t('productsDeleted')}, ${updatedCount} ${t('productsUpdated')}`
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: t('error', { ns: 'common' }),
        description: error.message || t('failedToUndoApproval'),
        variant: "destructive"
      });
    }
  });

  const handleUndoApproval = () => {
    undoApprovalMutation.mutate({
      reason: t('manualUndoByUser')
    });
  };

  // Bulk undo verification for all verified items
  const handleBulkUndoVerification = () => {
    if (!receipt?.items) return;

    const verifiedItems = receipt.items.filter((item: ReceiptItem) => item.verifiedAt);
    
    if (verifiedItems.length === 0) {
      toast({
        title: t('noVerifiedItems'),
        description: t('noItemsVerifiedYet')
      });
      return;
    }

    // Undo verification for each verified item
    verifiedItems.forEach((item: ReceiptItem) => {
      updateItemMutation.mutate({
        itemId: item.itemId,
        data: {
          receivedQuantity: item.receivedQuantity,
          damagedQuantity: item.damagedQuantity,
          missingQuantity: item.missingQuantity,
          barcode: item.barcode,
          warehouseLocation: item.warehouseLocation,
          additionalLocation: item.additionalLocation,
          storageInstructions: item.storageInstructions,
          condition: item.condition,
          notes: item.notes,
          verifiedAt: null // Clear verification status
        }
      });
    });

    toast({
      title: t('bulkUndoStarted'),
      description: `${t('removingVerification')} ${verifiedItems.length} ${t('items')}...`
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
      title: t('downloadStarted'),
      description: `${t('downloading')} ${receipt.photos.length} ${t('photos')}...`
    });
  };

  // Helper function to open image preview
  const openImagePreview = (photoSrc: string, index: number = 0) => {
    setPreviewImage(photoSrc);
    setCurrentPhotoIndex(index);
    setShowImagePreview(true);
  };

  // Navigation functions for photo gallery
  const goToPreviousPhoto = () => {
    if (!receipt?.photos || receipt.photos.length === 0) return;
    const newIndex = currentPhotoIndex > 0 ? currentPhotoIndex - 1 : receipt.photos.length - 1;
    setCurrentPhotoIndex(newIndex);
    const photoSrc = typeof receipt.photos[newIndex] === 'string' 
      ? receipt.photos[newIndex] 
      : (receipt.photos[newIndex].url || receipt.photos[newIndex].dataUrl || receipt.photos[newIndex].compressed);
    setPreviewImage(photoSrc);
  };

  const goToNextPhoto = () => {
    if (!receipt?.photos || receipt.photos.length === 0) return;
    const newIndex = currentPhotoIndex < receipt.photos.length - 1 ? currentPhotoIndex + 1 : 0;
    setCurrentPhotoIndex(newIndex);
    const photoSrc = typeof receipt.photos[newIndex] === 'string' 
      ? receipt.photos[newIndex] 
      : (receipt.photos[newIndex].url || receipt.photos[newIndex].dataUrl || receipt.photos[newIndex].compressed);
    setPreviewImage(photoSrc);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      goToPreviousPhoto();
    } else if (e.key === 'ArrowRight') {
      goToNextPhoto();
    } else if (e.key === 'Escape') {
      setShowImagePreview(false);
    }
  };

  if (isLoading || !receipt) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-100 dark:bg-slate-800 rounded"></div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_verification':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
      case 'pending_approval':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'archived':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'good':
        return 'text-green-600 dark:text-green-400';
      case 'damaged':
        return 'text-red-600 dark:text-red-400';
      case 'partial':
        return 'text-orange-600 dark:text-orange-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const allItemsVerified = receipt.items?.every((item: ReceiptItem) => item.verifiedAt);
  const hasDamagedItems = receipt.items?.some((item: ReceiptItem) => item.damagedQuantity > 0);
  const hasMissingItems = receipt.items?.some((item: ReceiptItem) => item.missingQuantity > 0);

  return (
    <div className="container mx-auto p-3 md:p-4">
      {/* Compact Header */}
      <div className="mb-3">
        <Link href="/receiving">
          <Button variant="ghost" size="sm" className="mb-2 h-8">
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
            {t('backToReceiving')}
          </Button>
        </Link>
        
        {/* Title Row */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">
              {receipt.isArchivedView ? `${t('archivedShipment')} #${receipt.id}` : `${t('receipt')} #${receipt.id}`}
            </h1>
            <p className="text-xs text-muted-foreground">
              {receipt.isArchivedView ? t('viewArchivedShipmentDetails') : t('verifyProcessReceivedItems')}
            </p>
          </div>
          <Badge className={`${getStatusColor(receipt.status)} px-2.5 py-0.5 text-sm`}>
            {receipt.status?.replace(/_/g, ' ').toUpperCase()}
          </Badge>
        </div>

        {/* Compact Info Bar */}
        <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 border rounded-lg p-3">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
            <div>
              <p className="text-muted-foreground mb-0.5">{t('receivedBy')}</p>
              <p className="font-medium flex items-center gap-1">
                <User className="h-3 w-3" />
                {receipt.receivedBy}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">{t('receivedAt')}</p>
              <p className="font-medium flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(receipt.receivedAt), 'MMM dd, yyyy HH:mm')}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">{t('parcels')}</p>
              <p className="font-medium flex items-center gap-1">
                <Package className="h-3 w-3" />
                {receipt.parcelCount} {t('parcels')}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">{t('carrier')}</p>
              <p className="font-medium flex items-center gap-1">
                <Truck className="h-3 w-3" />
                {receipt.carrier}
              </p>
            </div>
            {receipt.verifiedBy && (
              <div>
                <p className="text-muted-foreground mb-0.5">{t('verifiedBy')}</p>
                <p className="font-medium flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  {receipt.verifiedBy}
                </p>
              </div>
            )}
            {receipt.approvedBy && (
              <div>
                <p className="text-muted-foreground mb-0.5">{t('approvedBy')}</p>
                <p className="font-medium flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  {receipt.approvedBy}
                </p>
              </div>
            )}
          </div>

          {(() => {
            // Handle both new format { numbers: string[] } and legacy format string[]
            const trackingNums = Array.isArray(receipt.trackingNumbers) 
              ? receipt.trackingNumbers 
              : (receipt.trackingNumbers as any)?.numbers || [];
            return trackingNums.length > 0 && (
              <div className="mt-2 pt-2 border-t">
                <div className="flex flex-wrap gap-1.5">
                  {trackingNums.map((tn: string, index: number) => (
                    <Badge key={index} variant="secondary" className="text-xs px-1.5 py-0">
                      <Hash className="h-2.5 w-2.5 mr-0.5" />
                      {tn}
                    </Badge>
                  ))}
                </div>
              </div>
            );
          })()}

          {receipt.notes && (
            <div className="mt-2 pt-2 border-t">
              <p className="text-[10px] text-muted-foreground mb-0.5">{t('notes')}</p>
              <p className="text-xs">{receipt.notes}</p>
            </div>
          )}

          {receipt.damageNotes && (
            <div className="mt-2 pt-2 border-t border-red-200 dark:border-red-900">
              <div className="flex items-start gap-1.5">
                <AlertTriangle className="h-3 w-3 text-red-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-medium text-red-800 dark:text-red-200 mb-0.5">Damage Report</p>
                  <p className="text-xs text-red-700 dark:text-red-300">{receipt.damageNotes}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Photos Section - Compact */}
      {receipt.photos && receipt.photos.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border rounded-lg p-3 mb-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <Camera className="h-4 w-4" />
              Photos ({receipt.photos.length})
            </h3>
            <Button 
              onClick={downloadAllPhotos}
              variant="ghost" 
              size="sm"
              className="h-7 text-xs"
              data-testid="button-download-all-photos"
            >
              <Download className="h-3 w-3 mr-1" />
              Download
            </Button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-2">
            {receipt.photos.map((photo: any, index: number) => {
              const photoSrc = typeof photo === 'string' ? photo : (photo.url || photo.dataUrl || photo.compressed);
              
              return (
                <div key={index} className="relative group">
                  <div 
                    className="aspect-square overflow-hidden rounded border bg-muted cursor-pointer transition-all hover:shadow-md hover:ring-1 hover:ring-primary"
                    onClick={() => openImagePreview(photoSrc, index)}
                    data-testid={`photo-${index}`}
                  >
                    <img
                      src={photoSrc}
                      alt={`Receipt photo ${index + 1}`}
                      className="w-full h-full object-cover transition-transform group-hover:scale-110"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjZjNmNGY2Ii8+CjxwYXRoIGQ9Ik0xMiA5VjEzTTEyIDE3SDE2TTEyIDdIOCIgc3Ryb2tlPSIjNjM2YzgzIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4K';
                      }}
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                      <ZoomIn className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Shipment Info - Compact */}
      {receipt.shipment && (
        <div className="bg-white dark:bg-gray-900 border rounded-lg p-3 mb-3">
          <h3 className="text-sm font-semibold mb-2">Shipment Details</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <p className="text-muted-foreground mb-0.5">Shipment Name</p>
              <p className="font-medium">{receipt.shipment.shipmentName || `Shipment #${receipt.shipment.id}`}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Tracking</p>
              <p className="font-medium">{receipt.shipment.trackingNumber}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Route</p>
              <p className="font-medium flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {receipt.shipment.origin} → {receipt.shipment.destination}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Contents</p>
              <p className="font-medium">
                {receipt.shipment.totalUnits} {receipt.shipment.unitType || 'items'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Navigation Tabs for Items and Landing Costs */}
      <Tabs defaultValue="items" className="mb-3">
        <TabsList className="grid w-full grid-cols-2 h-10 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <TabsTrigger 
            value="items" 
            data-testid="tab-items"
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold transition-all duration-200 rounded data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-blue-200 dark:data-[state=active]:bg-gray-900 dark:data-[state=active]:text-blue-300 dark:data-[state=active]:border-blue-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          >
            <Package className="h-4 w-4" />
            Items Verification
          </TabsTrigger>
          <TabsTrigger 
            value="costs" 
            data-testid="tab-landing-costs"
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold transition-all duration-200 rounded data-[state=active]:bg-white data-[state=active]:text-orange-700 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-orange-200 dark:data-[state=active]:bg-gray-900 dark:data-[state=active]:text-orange-300 dark:data-[state=active]:border-orange-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          >
            <DollarSign className="h-4 w-4" />
            Landing Costs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="mt-3">
          <div className="bg-white dark:bg-gray-900 border rounded-lg">
            {/* Compact Header */}
            <div className="flex items-center justify-between p-3 border-b">
              <div>
                <h3 className="text-sm font-semibold">Items Verification</h3>
                <p className="text-xs text-muted-foreground">Verify quantity, condition, and location</p>
              </div>
              <div className="flex items-center gap-1.5">
                {receipt?.items && receipt.items.some((item: ReceiptItem) => !item.verifiedAt) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkVerifyItems}
                    disabled={updateItemMutation.isPending}
                    data-testid="button-bulk-verify-items"
                    className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300 h-7 text-xs"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verify All
                  </Button>
                )}
                
                {receipt?.items && receipt.items.some((item: ReceiptItem) => item.verifiedAt) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        data-testid="button-verification-menu"
                        className="h-7 w-7 p-0"
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={handleBulkUndoVerification}
                        disabled={updateItemMutation.isPending}
                        data-testid="menu-item-undo-all-verification"
                        className="text-xs"
                      >
                        <Undo2 className="h-3 w-3 mr-1.5" />
                        Undo All Verification
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                
                {hasDamagedItems && (
                  <Badge variant="destructive" className="text-xs px-1.5 py-0">
                    <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                    Damaged
                  </Badge>
                )}
                {hasMissingItems && (
                  <Badge variant="destructive" className="text-xs px-1.5 py-0">
                    <AlertCircle className="h-2.5 w-2.5 mr-0.5" />
                    Missing
                  </Badge>
                )}
              </div>
            </div>

            {/* Compact Item Cards */}
            <div className="divide-y">
              {receipt.items?.map((item: ReceiptItem) => (
                <div key={item.id} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="flex gap-3">
                    {/* Product Image */}
                    <div className="shrink-0">
                      <div className="w-16 h-16 rounded border bg-muted overflow-hidden">
                        {item.details?.mainImage || item.details?.images?.[0] ? (
                          <img
                            src={item.details.mainImage || item.details.images[0]}
                            alt={item.details?.name || 'Product'}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjZjNmNGY2Ii8+CjxwYXRoIGQ9Ik0yNCAyOEgyOFYzNkgyNFYyOFpNMzYgMjhINDBWMzZIMzZWMjhaIiBmaWxsPSIjOWNhM2FmIi8+CjxwYXRoIGQ9Ik0yOCA0MEgzNlY0NEgyOFY0MFoiIGZpbGw9IiM5Y2EzYWYiLz4KPC9zdmc+';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package2 className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Item Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{item.details?.name || `Item #${item.itemId}`}</h4>
                          {item.details?.sku && (
                            <p className="text-xs text-muted-foreground">SKU: {item.details.sku}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {item.verifiedAt ? (
                            <Badge variant="outline" className="bg-green-50 border-green-300 dark:bg-green-900/20 text-xs px-1.5 py-0">
                              <CheckCircle className="h-2.5 w-2.5 mr-0.5" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs px-1.5 py-0">
                              <Clock className="h-2.5 w-2.5 mr-0.5" />
                              Pending
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Quantities Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                        <div>
                          <p className="text-[10px] text-muted-foreground">Expected</p>
                          <p className="text-xs font-medium">{item.expectedQuantity}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Received</p>
                          <p className={`text-xs font-medium ${item.receivedQuantity < item.expectedQuantity ? 'text-orange-600' : 'text-green-600'}`}>
                            {item.receivedQuantity}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Damaged</p>
                          <p className={`text-xs font-medium ${item.damagedQuantity > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                            {item.damagedQuantity}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Missing</p>
                          <p className={`text-xs font-medium ${item.missingQuantity > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                            {item.missingQuantity}
                          </p>
                        </div>
                      </div>

                      {/* Additional Info */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-2">
                        {item.condition && (
                          <Badge className={`${getConditionColor(item.condition)} text-xs px-1.5 py-0`}>
                            {item.condition}
                          </Badge>
                        )}
                        {item.warehouseLocation && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {item.warehouseLocation}
                            {item.additionalLocation && <span>• {item.additionalLocation}</span>}
                          </span>
                        )}
                        {item.barcode && (
                          <span className="flex items-center gap-1">
                            <QrCode className="h-3 w-3" />
                            {item.barcode}
                          </span>
                        )}
                      </div>

                      {item.notes && (
                        <div className="text-xs text-muted-foreground bg-gray-50 dark:bg-gray-900 p-1.5 rounded mb-2">
                          {item.notes}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleItemVerification(item)}
                          data-testid={`button-verify-item-${item.id}`}
                          className="h-7 text-xs"
                        >
                          {item.verifiedAt ? 'Edit' : 'Verify'}
                        </Button>
                        {item.verifiedAt && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleUndoVerification(item)}
                            data-testid={`button-undo-verify-${item.id}`}
                            className="text-muted-foreground hover:text-foreground h-7 text-xs px-2"
                          >
                            <Undo2 className="h-3 w-3 mr-0.5" />
                            Undo
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
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

      {/* Compact Task Checklist */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="h-4 w-4" />
            {t('receiptTasks')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Compact Task List */}
          <div className="space-y-2">
            {/* Item Verification Task */}
            <div className="flex items-start gap-2.5 p-2.5 rounded-lg border">
              <div className="mt-0.5">
                {allItemsVerified ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">
                  {allItemsVerified ? t('allItemsVerified') : t('verifyAllItems')}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {allItemsVerified 
                    ? `${receipt.items?.length || 0} ${t('itemsVerified')}`
                    : `${receipt.items?.filter((item: any) => item.verifiedAt).length || 0}/${receipt.items?.length || 0} ${t('itemsVerified')}`
                  }
                </p>
              </div>
              {!allItemsVerified && (
                <Badge variant="outline" className="text-orange-600 border-orange-600 text-xs h-5 px-1.5">
                  {t('required')}
                </Badge>
              )}
            </div>

            {/* Complete Verification Task */}
            <div className="flex items-start gap-2.5 p-2.5 rounded-lg border">
              <div className="mt-0.5">
                {receipt.status !== 'pending_verification' ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <Clock className="h-4 w-4 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">
                  {receipt.status !== 'pending_verification' ? t('verificationCompleted') : t('completeVerification')}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {receipt.status !== 'pending_verification'
                    ? `${t('verifiedBy')} ${receipt.verifiedBy || t('verifiedByUnknown')}`
                    : t('submitVerificationToSendForApproval')
                  }
                </p>
              </div>
              {receipt.status === 'pending_verification' && (
                <Badge variant="outline" className="text-blue-600 border-blue-600 text-xs h-5 px-1.5">
                  {t('nextStep')}
                </Badge>
              )}
            </div>

            {/* Approval Task */}
            <div className="flex items-start gap-2.5 p-2.5 rounded-lg border">
              <div className="mt-0.5">
                {receipt.status === 'approved' ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (receipt.status === 'pending_approval' || receipt.status === 'verified') ? (
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                ) : (
                  <Clock className="h-4 w-4 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">
                  {receipt.status === 'approved' ? t('receiptApproved') : 
                   (receipt.status === 'pending_approval' || receipt.status === 'verified') ? t('readyForApproval') : 
                   t('awaitingApproval')}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {receipt.status === 'approved'
                    ? `${t('approvedBy')} ${receipt.approvedBy || t('approvedByUnknown')} - ${t('itemsInInventory')}`
                    : (receipt.status === 'pending_approval' || receipt.status === 'verified')
                    ? `${t('common:click', { ns: 'common' })} "${t('approveAndAddToInventory')}" ${t('common:button', { ns: 'common' })} ${t('common:below', { ns: 'common' })}`
                    : t('completeVerificationFirst')
                  }
                </p>
              </div>
              {(receipt.status === 'pending_approval' || receipt.status === 'verified') && (
                <Badge variant="outline" className="text-orange-600 border-orange-600 text-xs h-5 px-1.5">
                  {t('actionNeeded')}
                </Badge>
              )}
            </div>
          </div>

          {/* Compact Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{t('overallProgress')}</span>
              <span className="font-medium">
                {receipt.status === 'approved' ? '100%' : 
                 (receipt.status === 'pending_approval' || receipt.status === 'verified') ? '75%' : 
                 allItemsVerified ? '50%' : '25%'}
              </span>
            </div>
            <Progress 
              value={
                receipt.status === 'approved' ? 100 : 
                (receipt.status === 'pending_approval' || receipt.status === 'verified') ? 75 : 
                allItemsVerified ? 50 : 25
              } 
              className="h-1.5"
            />
          </div>

          {/* Compact Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-3 border-t">
            {receipt.status === 'pending_verification' && !receipt.isArchivedView && (
              <>
                <Button
                  onClick={() => setShowVerifyDialog(true)}
                  disabled={!allItemsVerified}
                  data-testid="button-complete-verification"
                  className={allItemsVerified ? 'bg-green-600 hover:bg-green-700 h-8 text-sm' : 'h-8 text-sm'}
                >
                  <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                  {t('completeVerification')}
                </Button>
                {!allItemsVerified && (
                  <p className="text-xs text-muted-foreground self-center">
                    {t('pleaseVerifyAllItemsFirst')}
                  </p>
                )}
              </>
            )}
            {(receipt.status === 'pending_approval' || receipt.status === 'verified') && !receipt.isArchivedView && (
              <>
                <Button
                  onClick={handleOpenPriceModal}
                  data-testid="button-approve-receipt"
                  className="bg-orange-600 hover:bg-orange-700 h-8 text-sm"
                >
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  {t('approveAndAddToInventory')}
                </Button>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Info className="h-3.5 w-3.5" />
                  <span>{t('setPricesAndAddVerifiedItemsToInventory')}</span>
                </div>
              </>
            )}
            {receipt.status === 'approved' && !receipt.isArchivedView && (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-1.5 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="font-medium text-sm">{t('allTasksCompleted')} - {t('itemsInInventory')}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleUndoApproval}
                  disabled={undoApprovalMutation.isPending}
                  data-testid="button-undo-approve"
                  className="text-muted-foreground hover:text-destructive text-xs px-2 h-7"
                >
                  <Undo2 className="h-3 w-3 mr-1" />
                  {t('undoApproval')}
                </Button>
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
              <DialogTitle>{t('verifyItem')}</DialogTitle>
              <DialogDescription>
                {selectedItem.details?.name || `${t('item')} #${selectedItem.itemId}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>{t('expectedQuantity')}</Label>
                  <Input value={selectedItem.expectedQuantity} disabled className="h-11" />
                </div>
                <div>
                  <Label>{t('receivedQuantity')}</Label>
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => setSelectedItem({
                        ...selectedItem,
                        receivedQuantity: Math.max(0, selectedItem.receivedQuantity - 1)
                      })}
                      className="h-11 w-11"
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
                      className="text-center h-11"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => setSelectedItem({
                        ...selectedItem,
                        receivedQuantity: selectedItem.receivedQuantity + 1
                      })}
                      className="h-11 w-11"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>{t('damagedQuantity')}</Label>
                  <Input
                    type="number"
                    value={selectedItem.damagedQuantity}
                    className="h-11"
                    onChange={(e) => setSelectedItem({
                      ...selectedItem,
                      damagedQuantity: parseInt(e.target.value) || 0
                    })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {scanningEnabled && (
                  <div>
                    <Label>{t('barcode')}</Label>
                    <div className="relative">
                      <QrCode className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={selectedItem.barcode || ""}
                        onChange={(e) => setSelectedItem({
                          ...selectedItem,
                          barcode: e.target.value
                        })}
                        placeholder={t('scanOrEnterBarcode')}
                        className="pl-10"
                      />
                    </div>
                  </div>
                )}
                <div className={scanningEnabled ? "" : "col-span-2"}>
                  <Label>{t('condition')}</Label>
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
                      <SelectItem value="pending">{t('pending')}</SelectItem>
                      <SelectItem value="good">{t('good')}</SelectItem>
                      <SelectItem value="damaged">{t('damaged')}</SelectItem>
                      <SelectItem value="partial">{t('partial')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('warehouseLocation')}</Label>
                  <Input
                    value={selectedItem.warehouseLocation || ""}
                    onChange={(e) => setSelectedItem({
                      ...selectedItem,
                      warehouseLocation: e.target.value
                    })}
                    placeholder={t('egA123')}
                  />
                </div>
                <div>
                  <Label>{t('additionalLocation')}</Label>
                  <Input
                    value={selectedItem.additionalLocation || ""}
                    onChange={(e) => setSelectedItem({
                      ...selectedItem,
                      additionalLocation: e.target.value
                    })}
                    placeholder={t('egShelf2')}
                  />
                </div>
              </div>

              <div>
                <Label>{t('storageInstructions')}</Label>
                <Textarea
                  value={selectedItem.storageInstructions || ""}
                  onChange={(e) => setSelectedItem({
                    ...selectedItem,
                    storageInstructions: e.target.value
                  })}
                  placeholder={t('specialStorageRequirements')}
                />
              </div>

              <div>
                <Label>{t('notes')}</Label>
                <Textarea
                  value={selectedItem.notes || ""}
                  onChange={(e) => setSelectedItem({
                    ...selectedItem,
                    notes: e.target.value
                  })}
                  placeholder={t('additionalNotesItem')}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedItem(null)}>
                {t('cancel')}
              </Button>
              <Button onClick={saveItemVerification}>
                {t('saveVerification')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Complete Verification Dialog */}
      <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('completeVerification')}</DialogTitle>
            <DialogDescription>
              {t('sendThisReceiptForFounderApproval')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('verifiedBy')}</Label>
              <Input
                value={verifiedBy}
                onChange={(e) => setVerifiedBy(e.target.value)}
                placeholder={t('yourName')}
              />
            </div>
            <div>
              <Label>{t('damageReport')}</Label>
              <Textarea
                value={damageNotes}
                onChange={(e) => setDamageNotes(e.target.value)}
                placeholder={t('damageReportPlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVerifyDialog(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleCompleteVerification}>
              {t('completeVerification')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('approveReceipt')}</DialogTitle>
            <DialogDescription>
              {t('approveThisReceiptAndAddToInventory')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('approvedBy')}</Label>
              <Input
                value={approvedBy}
                onChange={(e) => setApprovedBy(e.target.value)}
                placeholder={t('yourName')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={() => handleApproval()}>
              {t('approveAndAddToInventory')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={showImagePreview} onOpenChange={setShowImagePreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-2" onKeyDown={handleKeyDown}>
          <DialogHeader className="px-4 py-2">
            <div className="flex items-center justify-between">
              <DialogTitle>{t('photoPreview')}</DialogTitle>
              {receipt?.photos && receipt.photos.length > 1 && (
                <Badge variant="secondary" className="text-xs">
                  {currentPhotoIndex + 1} {t('of')} {receipt.photos.length}
                </Badge>
              )}
            </div>
          </DialogHeader>
          <div className="relative flex items-center justify-center bg-black rounded-lg overflow-hidden">
            {/* Previous Button */}
            {receipt?.photos && receipt.photos.length > 1 && (
              <Button
                onClick={goToPreviousPhoto}
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white z-10"
                data-testid="button-previous-photo"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
            )}
            
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-[70vh] object-contain"
              data-testid="preview-image"
            />
            
            {/* Next Button */}
            {receipt?.photos && receipt.photos.length > 1 && (
              <Button
                onClick={goToNextPhoto}
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white z-10"
                data-testid="button-next-photo"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            )}
            
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
            <div className="flex items-center justify-between w-full">
              <div className="text-xs text-muted-foreground">
                {t('useArrowKeysToNavigate')}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = previewImage;
                    link.download = `receipt-${receipt.id}-photo-${currentPhotoIndex + 1}.jpg`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                  data-testid="button-download-single-photo"
                >
                  <Download className="h-4 w-4" />
                  {t('download')}
                </Button>
                <Button size="sm" onClick={() => setShowImagePreview(false)}>
                  {t('close')}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Price Setting Modal */}
      {receipt && (
        <PriceSettingModal
          open={showPriceSettingModal}
          onClose={() => setShowPriceSettingModal(false)}
          receiptId={id || ''}
          items={receipt.items || []}
          onApprove={handleApproval}
        />
      )}
    </div>
  );
}