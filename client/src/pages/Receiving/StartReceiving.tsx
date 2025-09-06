import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { 
  ArrowLeft, 
  Package, 
  Truck, 
  Calendar,
  MapPin,
  User,
  Hash,
  Plus,
  X,
  FileText,
  Package2,
  ScanLine,
  CheckCircle2,
  AlertTriangle,
  Info,
  Camera,
  Upload,
  CheckSquare,
  Square,
  Clock,
  Weight
} from "lucide-react";
import { Link } from "wouter";
import { format, differenceInDays } from "date-fns";

export default function StartReceiving() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [receivedBy, setReceivedBy] = useState("");
  const [parcelCount, setParcelCount] = useState("1");
  const [carrier, setCarrier] = useState("");
  const [trackingNumbers, setTrackingNumbers] = useState<string[]>([""]);
  const [notes, setNotes] = useState("");
  const [scanMode, setScanMode] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState("");
  const [parcelChecklist, setParcelChecklist] = useState<boolean[]>([]);
  const [completionProgress, setCompletionProgress] = useState(0);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

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

  // Auto-populate carrier from shipment data
  useEffect(() => {
    if (shipment && !carrier) {
      setCarrier(shipment.endCarrier || shipment.carrier || "");
    }
  }, [shipment]);

  // Initialize parcel checklist based on parcel count
  useEffect(() => {
    const count = parseInt(parcelCount) || 0;
    setParcelChecklist(new Array(count).fill(false));
  }, [parcelCount]);

  // Calculate completion progress
  useEffect(() => {
    const fields = [
      receivedBy.length > 0,
      parcelCount.length > 0 && parseInt(parcelCount) > 0,
      carrier.length > 0,
      trackingNumbers.some(tn => tn.length > 0) || true // Optional
    ];
    const completed = fields.filter(Boolean).length;
    setCompletionProgress((completed / 4) * 100);
  }, [receivedBy, parcelCount, carrier, trackingNumbers]);

  // Real-time validation
  useEffect(() => {
    const errors: Record<string, string> = {};
    
    if (receivedBy && receivedBy.length < 2) {
      errors.receivedBy = "Name must be at least 2 characters";
    }
    
    if (parcelCount && (parseInt(parcelCount) < 1 || parseInt(parcelCount) > 100)) {
      errors.parcelCount = "Parcel count must be between 1 and 100";
    }
    
    if (carrier && carrier.length < 2) {
      errors.carrier = "Carrier name must be at least 2 characters";
    }
    
    setValidationErrors(errors);
  }, [receivedBy, parcelCount, carrier]);

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

  const handleAddTrackingNumber = () => {
    setTrackingNumbers([...trackingNumbers, ""]);
  };

  const handleRemoveTrackingNumber = (index: number) => {
    setTrackingNumbers(trackingNumbers.filter((_, i) => i !== index));
  };

  const handleTrackingNumberChange = (index: number, value: string) => {
    const updated = [...trackingNumbers];
    updated[index] = value;
    setTrackingNumbers(updated);
  };

  const handleScanBarcode = () => {
    // Simulate barcode scanning
    setScanMode(true);
    setTimeout(() => {
      const mockBarcode = `TN${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      setScannedBarcode(mockBarcode);
      if (trackingNumbers[0] === "") {
        setTrackingNumbers([mockBarcode]);
      } else {
        setTrackingNumbers([...trackingNumbers, mockBarcode]);
      }
      setScanMode(false);
      toast({
        title: "Barcode Scanned",
        description: `Added tracking number: ${mockBarcode}`
      });
    }, 1500);
  };

  const toggleParcelCheck = (index: number) => {
    const updated = [...parcelChecklist];
    updated[index] = !updated[index];
    setParcelChecklist(updated);
  };

  const getDeliveryStatus = () => {
    if (!shipment?.estimatedDelivery) return null;
    const daysLate = differenceInDays(new Date(), new Date(shipment.estimatedDelivery));
    if (daysLate > 3) return { type: 'urgent', message: `${daysLate} days late - Urgent!` };
    if (daysLate > 0) return { type: 'warning', message: `${daysLate} days late` };
    return { type: 'ontime', message: 'On time' };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!receivedBy || !parcelCount || !carrier) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const filteredTrackingNumbers = trackingNumbers.filter(tn => tn.trim() !== "");

    createReceiptMutation.mutate({
      shipmentId: parseInt(id!),
      consolidationId: shipment?.consolidationId || null,
      receivedBy,
      parcelCount: parseInt(parcelCount),
      carrier: carrier || shipment?.endCarrier || shipment?.carrier,
      trackingNumbers: filteredTrackingNumbers,
      notes
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="container mx-auto p-6">
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

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Link href="/receiving">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Receiving
          </Button>
        </Link>
        <h1 className="text-3xl font-bold mb-2">Start Receiving Process</h1>
        <p className="text-muted-foreground">
          Begin the receipt and verification process for this shipment
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Form Completion</span>
          <span className="text-sm text-muted-foreground">{Math.round(completionProgress)}%</span>
        </div>
        <Progress value={completionProgress} className="h-2" />
      </div>

      {/* Delivery Status Alert */}
      {(() => {
        const status = getDeliveryStatus();
        if (!status) return null;
        return (
          <Alert className={`mb-6 ${
            status.type === 'urgent' ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : 
            status.type === 'warning' ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20' : ''
          }`}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="font-medium">
              {status.message}
            </AlertDescription>
          </Alert>
        );
      })()}

      {/* Shipment Summary */}
      <Card className="mb-6 border-2 hover:shadow-lg transition-shadow">
        <CardHeader className="bg-gradient-to-r from-sky-50 to-blue-50 dark:from-sky-950/20 dark:to-blue-950/20">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">{shipment.shipmentName || `Shipment #${shipment.id}`}</CardTitle>
              <CardDescription className="mt-1">
                <span className="font-mono">{shipment.trackingNumber}</span> • 
                <span className="font-semibold ml-1">{shipment.endCarrier || shipment.carrier}</span>
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge className={getStatusColor(shipment.status)}>
                {shipment.status?.replace('_', ' ').toUpperCase()}
              </Badge>
              {getDeliveryStatus()?.type === 'urgent' && (
                <Badge variant="destructive" className="animate-pulse">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Urgent
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
              <MapPin className="h-5 w-5 text-sky-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Route</p>
                <p className="font-semibold mt-1">{shipment.origin?.split(',')[0]}</p>
                <p className="text-sm text-muted-foreground">to</p>
                <p className="font-semibold">{shipment.destination?.split(',')[0]}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
              <Calendar className="h-5 w-5 text-sky-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Est. Delivery</p>
                <p className="font-semibold mt-1">
                  {shipment.estimatedDelivery 
                    ? format(new Date(shipment.estimatedDelivery), 'MMM dd, yyyy')
                    : 'Not specified'}
                </p>
                {shipment.deliveredAt && (
                  <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                    Delivered {format(new Date(shipment.deliveredAt), 'MMM dd')}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
              <Package className="h-5 w-5 text-sky-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contents</p>
                <p className="font-semibold mt-1 text-lg">
                  {shipment.totalUnits} {shipment.unitType || 'items'}
                </p>
                {shipment.items?.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {shipment.items.length} SKUs
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
              <Weight className="h-5 w-5 text-sky-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Weight</p>
                <p className="font-semibold mt-1 text-lg">
                  {shipment.totalWeight || shipment.actualWeight || 'N/A'}
                  {(shipment.totalWeight || shipment.actualWeight) && ' kg'}
                </p>
              </div>
            </div>
          </div>

          {shipment.consolidation && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded">
              <div className="flex items-center gap-2 mb-2">
                <Package2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Consolidation Details</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Name:</span>
                  <span className="ml-2">{shipment.consolidation.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Method:</span>
                  <span className="ml-2">
                    {shipment.consolidation.shippingMethod?.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>
                {shipment.consolidation.totalWeight && (
                  <div>
                    <span className="text-muted-foreground">Total Weight:</span>
                    <span className="ml-2">{shipment.consolidation.totalWeight} kg</span>
                  </div>
                )}
                {shipment.consolidation.totalVolume && (
                  <div>
                    <span className="text-muted-foreground">Total Volume:</span>
                    <span className="ml-2">{shipment.consolidation.totalVolume} m³</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Items Preview */}
      {shipment.items && shipment.items.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package2 className="h-5 w-5" />
              Expected Items ({shipment.items.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {shipment.items.slice(0, 5).map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-900">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-sky-100 dark:bg-sky-900 flex items-center justify-center">
                      <Package className="h-4 w-4 text-sky-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        SKU: {item.sku || 'N/A'} • Qty: {item.quantity}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">{item.category || 'General'}</Badge>
                </div>
              ))}
              {shipment.items.length > 5 && (
                <p className="text-sm text-muted-foreground text-center pt-2">
                  +{shipment.items.length - 5} more items
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Receipt Form */}
      <Card className="border-2">
        <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-amber-600" />
            Receipt Information
          </CardTitle>
          <CardDescription>
            Complete the verification process by entering receipt details
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Basic Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-sky-600 text-white flex items-center justify-center text-sm font-bold">1</div>
                <h3 className="font-semibold">Basic Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="receivedBy">
                    Received By <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="receivedBy"
                      value={receivedBy}
                      onChange={(e) => setReceivedBy(e.target.value)}
                      placeholder="Employee name"
                      className={`pl-10 ${validationErrors.receivedBy ? 'border-red-500' : ''}`}
                      required
                      data-testid="input-received-by"
                    />
                  </div>
                  {validationErrors.receivedBy && (
                    <p className="text-xs text-red-500">{validationErrors.receivedBy}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="carrier">
                    Final Carrier <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Truck className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="carrier"
                      value={carrier}
                      onChange={(e) => setCarrier(e.target.value)}
                      placeholder={shipment.endCarrier || shipment.carrier || "e.g., DHL, UPS, FedEx"}
                      className={`pl-10 ${validationErrors.carrier ? 'border-red-500' : ''} bg-amber-50/50 dark:bg-amber-950/10`}
                      required
                      data-testid="input-carrier"
                    />
                  </div>
                  {validationErrors.carrier && (
                    <p className="text-xs text-red-500">{validationErrors.carrier}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Auto-filled from shipment data
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Step 2: Parcel Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-sky-600 text-white flex items-center justify-center text-sm font-bold">2</div>
                <h3 className="font-semibold">Parcel Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="parcelCount">
                    Number of Parcels <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="parcelCount"
                      type="number"
                      value={parcelCount}
                      onChange={(e) => setParcelCount(e.target.value)}
                      min="1"
                      max="100"
                      placeholder="1"
                      className={`pl-10 ${validationErrors.parcelCount ? 'border-red-500' : ''}`}
                      required
                      data-testid="input-parcel-count"
                    />
                  </div>
                  {validationErrors.parcelCount && (
                    <p className="text-xs text-red-500">{validationErrors.parcelCount}</p>
                  )}
                </div>

                {/* Parcel Checklist */}
                {parseInt(parcelCount) > 0 && parseInt(parcelCount) <= 10 && (
                  <div className="space-y-2">
                    <Label>Parcel Checklist</Label>
                    <div className="p-3 border rounded-lg bg-gray-50 dark:bg-gray-900">
                      <div className="grid grid-cols-2 gap-2">
                        {parcelChecklist.map((checked, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => toggleParcelCheck(index)}
                            className={`flex items-center gap-2 p-2 rounded transition-colors ${
                              checked 
                                ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' 
                                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                          >
                            {checked ? (
                              <CheckSquare className="h-4 w-4" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                            <span className="text-sm">Parcel {index + 1}</span>
                          </button>
                        ))}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground text-center">
                        {parcelChecklist.filter(Boolean).length} of {parcelChecklist.length} checked
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Step 3: Tracking Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-sky-600 text-white flex items-center justify-center text-sm font-bold">3</div>
                <h3 className="font-semibold">Tracking Information</h3>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Tracking Numbers</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleScanBarcode}
                      disabled={scanMode}
                      className="hover:bg-sky-50 dark:hover:bg-sky-950"
                    >
                      {scanMode ? (
                        <>
                          <div className="animate-spin h-4 w-4 mr-1 border-2 border-sky-600 border-t-transparent rounded-full" />
                          Scanning...
                        </>
                      ) : (
                        <>
                          <ScanLine className="h-4 w-4 mr-1" />
                          Scan
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddTrackingNumber}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>
                
                {scannedBarcode && (
                  <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription>
                      Scanned: <span className="font-mono font-semibold">{scannedBarcode}</span>
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  {trackingNumbers.map((trackingNumber, index) => (
                    <div key={index} className="flex gap-2">
                      <div className="relative flex-1">
                        <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={trackingNumber}
                          onChange={(e) => handleTrackingNumberChange(index, e.target.value)}
                          placeholder="Tracking number (optional)"
                          className={`pl-10 ${trackingNumber === scannedBarcode ? 'bg-green-50 dark:bg-green-950/20 border-green-300' : ''}`}
                          data-testid={`input-tracking-${index}`}
                        />
                      </div>
                      {trackingNumbers.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveTrackingNumber(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="notes">Initial Notes</Label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any initial observations or notes about the shipment condition..."
                  className="pl-10 min-h-[100px]"
                  data-testid="textarea-notes"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button 
                type="submit" 
                disabled={createReceiptMutation.isPending || Object.keys(validationErrors).length > 0}
                className="flex-1 bg-sky-600 hover:bg-sky-700 text-white shadow-lg hover:shadow-xl transition-all"
                size="lg"
              >
                {createReceiptMutation.isPending ? (
                  <>
                    <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                    Creating Receipt...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Start Receiving Process
                  </>
                )}
              </Button>
              <Link href="/receiving">
                <Button type="button" variant="outline" size="lg">
                  Cancel
                </Button>
              </Link>
            </div>
            
            {Object.keys(validationErrors).length > 0 && (
              <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Please fix the validation errors before submitting
                </AlertDescription>
              </Alert>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}