import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  Package2
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

export default function StartReceiving() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [receivedBy, setReceivedBy] = useState("");
  const [parcelCount, setParcelCount] = useState("1");
  const [carrier, setCarrier] = useState("");
  const [trackingNumbers, setTrackingNumbers] = useState<string[]>([""]);
  const [notes, setNotes] = useState("");

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

      {/* Shipment Summary */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{shipment.shipmentName || `Shipment #${shipment.id}`}</CardTitle>
              <CardDescription>
                {shipment.trackingNumber} • {shipment.carrier || shipment.endCarrier}
              </CardDescription>
            </div>
            <Badge className={getStatusColor(shipment.status)}>
              {shipment.status?.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Route</p>
                <p className="font-medium">{shipment.origin} → {shipment.destination}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Est. Delivery</p>
                <p className="font-medium">
                  {shipment.estimatedDelivery 
                    ? format(new Date(shipment.estimatedDelivery), 'MMM dd, yyyy')
                    : 'Not specified'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Contents</p>
                <p className="font-medium">
                  {shipment.totalUnits} {shipment.unitType || 'items'}
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

      {/* Receipt Form */}
      <Card>
        <CardHeader>
          <CardTitle>Receipt Information</CardTitle>
          <CardDescription>
            Enter the details of the received parcels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
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
                    className="pl-10"
                    required
                    data-testid="input-received-by"
                  />
                </div>
              </div>

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
                    placeholder="1"
                    className="pl-10"
                    required
                    data-testid="input-parcel-count"
                  />
                </div>
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
                    className="pl-10"
                    required
                    data-testid="input-carrier"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Tracking Numbers</Label>
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
              <div className="space-y-2">
                {trackingNumbers.map((trackingNumber, index) => (
                  <div key={index} className="flex gap-2">
                    <div className="relative flex-1">
                      <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={trackingNumber}
                        onChange={(e) => handleTrackingNumberChange(index, e.target.value)}
                        placeholder="Tracking number (optional)"
                        className="pl-10"
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

            <div className="flex gap-4">
              <Button 
                type="submit" 
                disabled={createReceiptMutation.isPending}
                className="flex-1"
              >
                {createReceiptMutation.isPending ? "Creating..." : "Start Receiving Process"}
              </Button>
              <Link href="/receiving">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}