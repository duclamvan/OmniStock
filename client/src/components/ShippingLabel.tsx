import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Package, 
  Truck, 
  ExternalLink,
  Download,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface ShippingLabelProps {
  order: {
    id: string;
    orderId: string;
    customerName: string;
    customerEmail?: string;
    shippingAddress: string;
    items: Array<{
      id: string;
      productName: string;
      sku?: string;
      quantity: number;
      price?: number;
    }>;
    total?: string;
    weight?: number;
  };
  onLabelCreated?: (labelData: any) => void;
}

interface ShippingMethod {
  id: number;
  name: string;
  carrier: string;
  price: number;
  currency: string;
  max_weight: number;
}

export function ShippingLabel({ order, onLabelCreated }: ShippingLabelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedMethodId, setSelectedMethodId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Parse shipping address
  const parseAddress = (addressString: string) => {
    const parts = addressString.split(',').map(p => p.trim());
    return {
      line1: parts[0] || '',
      line2: parts[1] || '',
      city: parts[parts.length - 2] || '',
      country: 'NL' // Default to Netherlands
    };
  };

  const address = parseAddress(order.shippingAddress);

  // Get shipping methods
  const { data: shippingMethods = [], isLoading: isLoadingMethods } = useQuery({
    queryKey: ['/api/shipping/methods'],
    enabled: isDialogOpen
  });

  // Create shipping label mutation
  const createLabelMutation = useMutation({
    mutationFn: (data: any) => 
      apiRequest('/api/shipping/create-label', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: (data) => {
      toast({
        title: "Shipping Label Created",
        description: `Label created successfully. Tracking: ${data.parcel?.tracking_number || 'N/A'}`
      });
      setIsDialogOpen(false);
      onLabelCreated?.(data);
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Label",
        description: error.message || "Unknown error occurred",
        variant: "destructive"
      });
    }
  });

  const handleCreateLabel = () => {
    if (!selectedMethodId) {
      toast({
        title: "Shipping Method Required",
        description: "Please select a shipping method",
        variant: "destructive"
      });
      return;
    }

    const orderData = {
      orderNumber: order.orderId,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      shippingAddress: {
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        postalCode: '1012AB', // Default postal code
        country: address.country
      },
      items: order.items.map(item => ({
        name: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        weight: 0.2, // Default weight
        value: parseFloat(item.price?.toString() || '10')
      })),
      shippingMethodId: selectedMethodId,
      weight: order.weight || 0.5,
      value: parseFloat(order.total || '0')
    };

    createLabelMutation.mutate(orderData);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Package className="w-4 h-4" />
          Create Shipping Label
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Shipping Label</DialogTitle>
          <DialogDescription>
            Generate a shipping label for order {order.orderId}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Customer:</span> {order.customerName}
                </div>
                <div>
                  <span className="font-medium">Order ID:</span> {order.orderId}
                </div>
                <div className="col-span-2">
                  <span className="font-medium">Address:</span> {order.shippingAddress}
                </div>
                <div>
                  <span className="font-medium">Items:</span> {order.items.length}
                </div>
                <div>
                  <span className="font-medium">Total:</span> ${order.total || '0.00'}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Methods */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Shipping Method</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingMethods ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading shipping methods...</span>
                </div>
              ) : shippingMethods.length === 0 ? (
                <Alert>
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    No shipping methods available. Please check your Sendcloud configuration.
                  </AlertDescription>
                </Alert>
              ) : (
                <Select 
                  value={selectedMethodId?.toString()} 
                  onValueChange={(value) => setSelectedMethodId(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose shipping method..." />
                  </SelectTrigger>
                  <SelectContent>
                    {shippingMethods.map((method: ShippingMethod) => (
                      <SelectItem key={method.id} value={method.id.toString()}>
                        <div className="flex items-center justify-between w-full">
                          <span>{method.name} ({method.carrier})</span>
                          <Badge variant="secondary" className="ml-2">
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: method.currency || 'EUR'
                            }).format(method.price)}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => setIsDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateLabel}
              disabled={!selectedMethodId || createLabelMutation.isPending}
              className="flex items-center gap-2"
            >
              {createLabelMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Package className="w-4 h-4" />
              )}
              Create Label
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Shipping status component
interface ShippingStatusProps {
  trackingNumber?: string;
  carrier?: string;
  trackingUrl?: string;
}

export function ShippingStatus({ trackingNumber, carrier, trackingUrl }: ShippingStatusProps) {
  if (!trackingNumber) {
    return (
      <Alert>
        <AlertCircle className="w-4 h-4" />
        <AlertDescription>
          No shipping label created yet.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          Shipping Label Created
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Tracking Number:</span>
            <p className="font-mono">{trackingNumber}</p>
          </div>
          {carrier && (
            <div>
              <span className="font-medium">Carrier:</span>
              <p>{carrier}</p>
            </div>
          )}
        </div>
        
        {trackingUrl && (
          <Button variant="outline" size="sm" asChild>
            <a href={trackingUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              Track Package
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}