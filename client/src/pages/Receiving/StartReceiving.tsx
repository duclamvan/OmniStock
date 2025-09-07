import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { 
  ArrowLeft, 
  Package, 
  Truck, 
  User,
  Plus,
  Minus,
  ScanLine,
  CheckCircle2,
  AlertTriangle,
  Package2,
  Hash,
  Clock,
  MapPin,
  Camera,
  Save,
  CheckSquare,
  Square,
  ArrowRight
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

interface ReceivingItem {
  id: string;
  name: string;
  sku?: string;
  expectedQty: number;
  receivedQty: number;
  status: 'pending' | 'complete' | 'partial' | 'damaged' | 'missing';
  notes?: string;
  checked: boolean;
}

export default function StartReceiving() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const barcodeRef = useRef<HTMLInputElement>(null);

  // Form state
  const [receivedBy, setReceivedBy] = useState("Employee #1");
  const [carrier, setCarrier] = useState("");
  const [parcelCount, setParcelCount] = useState(1);
  const [scannedParcels, setScannedParcels] = useState(0);
  const [notes, setNotes] = useState("");
  const [receivingItems, setReceivingItems] = useState<ReceivingItem[]>([]);

  // UI state
  const [currentStep, setCurrentStep] = useState(1);
  const [scanMode, setScanMode] = useState(false);
  const [barcodeScan, setBarcodeScan] = useState("");
  const [showAllItems, setShowAllItems] = useState(false);

  // Fetch shipment details
  const { data: shipment, isLoading } = useQuery({
    queryKey: [`/api/imports/shipments/${id}`],
    queryFn: async () => {
      const response = await fetch(`/api/imports/shipments/${id}`);
      if (!response.ok) throw new Error('Failed to fetch shipment');
      return response.json();
    },
    enabled: !!id
  });

  // Initialize data when shipment loads
  useEffect(() => {
    if (shipment) {
      setCarrier(shipment.endCarrier || shipment.carrier || "");
      setParcelCount(shipment.totalUnits || 1);

      // Initialize items from shipment
      if (shipment.items && shipment.items.length > 0) {
        const items = shipment.items.map((item: any, index: number) => ({
          id: item.id || `item-${index}`,
          name: item.name || item.productName || `Item ${index + 1}`,
          sku: item.sku,
          expectedQty: item.quantity || 1,
          receivedQty: 0,
          status: 'pending' as const,
          notes: '',
          checked: false
        }));
        setReceivingItems(items);
      }
    }
  }, [shipment]);

  // Auto-focus barcode input in scan mode
  useEffect(() => {
    if (scanMode && barcodeRef.current) {
      barcodeRef.current.focus();
    }
  }, [scanMode]);

  // Handle barcode scan
  const handleBarcodeScan = (value: string) => {
    if (currentStep === 1) {
      // Step 1: Scanning parcel barcodes
      setScannedParcels(prev => Math.min(prev + 1, parcelCount));
      toast({
        title: "Parcel Scanned",
        description: `Scanned ${scannedParcels + 1} of ${parcelCount} parcels`
      });
    } else if (currentStep === 2) {
      // Step 2: Scanning item barcodes
      const item = receivingItems.find(item => item.sku === value);
      if (item) {
        updateItemQuantity(item.id, 1);
        toast({
          title: "Item Scanned",
          description: `${item.name} - Quantity updated`
        });
      } else {
        toast({
          title: "Item Not Found",
          description: "This SKU is not in the current shipment",
          variant: "destructive"
        });
      }
    }
    setBarcodeScan("");
  };

  // Update item quantity
  const updateItemQuantity = (itemId: string, delta: number) => {
    setReceivingItems(items =>
      items.map(item => {
        if (item.id === itemId) {
          const newQty = Math.max(0, item.receivedQty + delta);
          const status = newQty === 0 ? 'pending' :
                        newQty === item.expectedQty ? 'complete' :
                        newQty < item.expectedQty ? 'partial' : 'complete';
          return {
            ...item,
            receivedQty: newQty,
            status,
            checked: newQty > 0
          };
        }
        return item;
      })
    );
  };

  // Toggle item status
  const toggleItemStatus = (itemId: string, status: ReceivingItem['status']) => {
    setReceivingItems(items =>
      items.map(item => {
        if (item.id === itemId) {
          return { ...item, status, checked: true };
        }
        return item;
      })
    );
  };

  // Update item notes
  const updateItemNotes = (itemId: string, notes: string) => {
    setReceivingItems(items =>
      items.map(item => {
        if (item.id === itemId) {
          return { ...item, notes };
        }
        return item;
      })
    );
  };

  // Create receipt mutation
  const createReceiptMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/imports/receipts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create receipt');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Receipt Created",
        description: "Successfully started the receiving process"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/receipts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/receivable'] });
      navigate(`/receiving/receipt/${data.receipt.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create receipt",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = async () => {
    if (!receivedBy || !carrier) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      // Update shipment status to 'receiving'
      await fetch(`/api/imports/shipments/${id}/start-receiving`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Create receipt with item details
      createReceiptMutation.mutate({
        shipmentId: parseInt(id!),
        consolidationId: shipment?.consolidationId || null,
        receivedBy,
        parcelCount,
        carrier,
        notes,
        items: receivingItems.map(item => ({
          itemId: item.id,
          expectedQuantity: item.expectedQty,
          receivedQuantity: item.receivedQty,
          status: item.status,
          notes: item.notes
        }))
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start receiving process",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'in transit':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getItemStatusColor = (status: ReceivingItem['status']) => {
    switch (status) {
      case 'complete':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'damaged':
        return 'bg-red-100 text-red-800';
      case 'missing':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-50 text-gray-600';
    }
  };

  const totalItems = receivingItems.length;
  const completedItems = receivingItems.filter(item => item.status === 'complete' || item.status === 'partial').length;
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="p-6 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Shipment not found</p>
            <Link href="/receiving">
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Receiving
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link href="/receiving">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Quick Receiving</h1>
            <p className="text-sm text-muted-foreground">
              {shipment.shipmentName || `Shipment #${shipment.id}`} • {shipment.trackingNumber}
            </p>
          </div>
        </div>
        <Badge className={getStatusColor(shipment.status)}>
          {shipment.status?.replace('_', ' ').toUpperCase()}
        </Badge>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Progress</span>
          <span className="text-sm text-muted-foreground">{Math.round(progress)}% Complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step Navigation */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={currentStep === 1 ? "default" : "outline"}
          onClick={() => setCurrentStep(1)}
          className="flex-1"
        >
          <Package className="h-4 w-4 mr-2" />
          Step 1: Parcel Check
        </Button>
        <Button
          variant={currentStep === 2 ? "default" : "outline"}
          onClick={() => setCurrentStep(2)}
          className="flex-1"
          disabled={scannedParcels === 0 && parcelCount > 0}
        >
          <CheckSquare className="h-4 w-4 mr-2" />
          Step 2: Item Checklist
        </Button>
      </div>

      {/* Step 1: Quick Parcel Verification */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Parcel Verification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Received By *</Label>
                  <Input
                    value={receivedBy}
                    onChange={(e) => setReceivedBy(e.target.value)}
                    placeholder="Your name"
                    required
                  />
                </div>
                <div>
                  <Label>Carrier *</Label>
                  <Input
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    placeholder="DHL, UPS, FedEx..."
                    required
                  />
                </div>
              </div>

              {/* Parcel Count */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <Label>Expected Parcels</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setParcelCount(Math.max(1, parcelCount - 1))}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      value={parcelCount}
                      onChange={(e) => setParcelCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="text-center"
                      min="1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setParcelCount(parcelCount + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Received Parcels (Manual)</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setScannedParcels(Math.max(0, scannedParcels - 1))}
                      disabled={scannedParcels === 0}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      value={scannedParcels}
                      onChange={(e) => setScannedParcels(Math.max(0, Math.min(parcelCount, parseInt(e.target.value) || 0)))}
                      className="text-center"
                      min="0"
                      max={parcelCount}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setScannedParcels(Math.min(parcelCount, scannedParcels + 1))}
                      disabled={scannedParcels >= parcelCount}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Scan Parcels</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        ref={barcodeRef}
                        value={barcodeScan}
                        onChange={(e) => setBarcodeScan(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && barcodeScan) {
                            handleBarcodeScan(barcodeScan);
                          }
                        }}
                        placeholder="Scan or type barcode"
                        className={scanMode ? 'border-blue-500 ring-2 ring-blue-200' : ''}
                      />
                      <ScanLine className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setScanMode(!scanMode);
                        if (!scanMode) {
                          setTimeout(() => barcodeRef.current?.focus(), 100);
                        }
                      }}
                      className={scanMode ? 'bg-blue-50 border-blue-300' : ''}
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Parcel Progress */}
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Parcels Scanned</span>
                  <span className="text-2xl font-bold text-green-600">
                    {scannedParcels} / {parcelCount}
                  </span>
                </div>
                <Progress 
                  value={(scannedParcels / parcelCount) * 100} 
                  className="h-3"
                />
                {scannedParcels === parcelCount && parcelCount > 0 && (
                  <div className="flex items-center gap-2 mt-2 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm">All parcels verified!</span>
                  </div>
                )}
              </div>

              {/* Quick Notes */}
              <div>
                <Label>Initial Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any initial observations..."
                  rows={2}
                />
              </div>

              <Button
                onClick={() => setCurrentStep(2)}
                disabled={!receivedBy || !carrier || scannedParcels === 0}
                className="w-full"
                size="lg"
              >
                {scannedParcels > 0 ? (
                  <>
                    Continue to Item Checklist
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                ) : (
                  <>
                    Continue to Item Checklist
                    <CheckSquare className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Item Checklist */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CheckSquare className="h-5 w-5" />
                  Item Verification ({completedItems}/{totalItems})
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAllItems(!showAllItems)}
                  >
                    {showAllItems ? 'Show Active' : 'Show All'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setScanMode(!scanMode);
                      if (!scanMode) {
                        setTimeout(() => barcodeRef.current?.focus(), 100);
                      }
                    }}
                    className={scanMode ? 'bg-blue-50 border-blue-300' : ''}
                  >
                    <ScanLine className="h-4 w-4 mr-1" />
                    Scan Items
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Scan Input */}
              {scanMode && (
                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                  <Input
                    ref={barcodeRef}
                    value={barcodeScan}
                    onChange={(e) => setBarcodeScan(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && barcodeScan) {
                        handleBarcodeScan(barcodeScan);
                      }
                    }}
                    placeholder="Scan item barcode here..."
                    className="border-blue-300"
                  />
                </div>
              )}

              {/* Items List */}
              <div className="max-h-96 overflow-y-auto space-y-2">
                {receivingItems
                  .filter(item => showAllItems || item.status === 'pending' || item.receivedQty < item.expectedQty)
                  .map((item) => (
                    <div key={item.id} className="border rounded-lg p-3 bg-white dark:bg-gray-900">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{item.name}</h4>
                            <Badge className={`text-xs ${getItemStatusColor(item.status)}`}>
                              {item.status}
                            </Badge>
                          </div>
                          {item.sku && (
                            <p className="text-xs text-muted-foreground font-mono">
                              SKU: {item.sku}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateItemQuantity(item.id, -1)}
                            disabled={item.receivedQty === 0}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm font-mono w-16 text-center">
                            {item.receivedQty}/{item.expectedQty}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateItemQuantity(item.id, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        <div className="flex gap-1">
                          <Button
                            variant={item.status === 'complete' ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                              setReceivingItems(items =>
                                items.map(i => 
                                  i.id === item.id 
                                    ? { ...i, receivedQty: i.expectedQty, status: 'complete', checked: true }
                                    : i
                                )
                              );
                            }}
                          >
                            OK
                          </Button>
                          <Button
                            variant={item.status === 'damaged' ? "destructive" : "outline"}
                            size="sm"
                            onClick={() => toggleItemStatus(item.id, 'damaged')}
                          >
                            DMG
                          </Button>
                          <Button
                            variant={item.status === 'missing' ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => toggleItemStatus(item.id, 'missing')}
                          >
                            MISS
                          </Button>
                        </div>
                      </div>

                      {(item.status === 'damaged' || item.status === 'missing' || item.notes) && (
                        <div className="mt-2">
                          <Input
                            value={item.notes || ''}
                            onChange={(e) => updateItemNotes(item.id, e.target.value)}
                            placeholder="Add notes..."
                            className="text-sm"
                          />
                        </div>
                      )}
                    </div>
                  ))}
              </div>

              {receivingItems.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Package2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No items to verify</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(1)}
              className="flex-1"
            >
              Back to Step 1
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createReceiptMutation.isPending || completedItems === 0}
              className="flex-1"
              size="lg"
            >
              {createReceiptMutation.isPending ? (
                <>Processing...</>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Complete Receiving
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}