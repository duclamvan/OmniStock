import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Package, 
  ExternalLink,
  Download,
  AlertCircle,
  CheckCircle,
  Loader2,
  Banknote
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
    dobirkaAmount?: string | null;
    dobirkaCurrency?: string | null;
  };
  onLabelCreated?: (labelData: any) => void;
}

export function ShippingLabel({ order, onLabelCreated }: ShippingLabelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dobirkaAmount, setDobirkaAmount] = useState(order.dobirkaAmount || '');
  const [dobirkaCurrency, setDobirkaCurrency] = useState(order.dobirkaCurrency || 'CZK');

  // Create shipping label mutation for PPL
  const createLabelMutation = useMutation({
    mutationFn: (data: any) => 
      apiRequest('POST', '/api/shipping/create-label', data),
    onSuccess: (data) => {
      toast({
        title: "PPL Label Created",
        description: `Label created successfully. Tracking: ${data.trackingNumber || 'N/A'}`
      });
      setIsDialogOpen(false);
      onLabelCreated?.(data);
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create PPL Label",
        description: error.message || "Unknown error occurred",
        variant: "destructive"
      });
    }
  });

  const handleCreateLabel = () => {
    const labelData = {
      orderId: order.id,
      dobirkaAmount: dobirkaAmount && parseFloat(dobirkaAmount) > 0 ? dobirkaAmount : null,
      dobirkaCurrency: dobirkaAmount && parseFloat(dobirkaAmount) > 0 ? dobirkaCurrency : null
    };

    createLabelMutation.mutate(labelData);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2" data-testid="button-create-label">
          <Package className="w-4 h-4" />
          Create PPL Label
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create PPL Shipping Label</DialogTitle>
          <DialogDescription>
            Generate a PPL shipping label for order {order.orderId}
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
                  <span className="font-medium">Weight:</span> {order.weight ? `${order.weight} kg` : 'Not set'}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dobírka (Cash on Delivery) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Banknote className="w-5 h-5" />
                Dobírka (Cash on Delivery)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dobirka-amount" data-testid="label-dobirka-amount">
                    COD Amount (optional)
                  </Label>
                  <Input
                    id="dobirka-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={dobirkaAmount}
                    onChange={(e) => setDobirkaAmount(e.target.value)}
                    data-testid="input-dobirka-amount"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dobirka-currency" data-testid="label-dobirka-currency">
                    Currency
                  </Label>
                  <Select value={dobirkaCurrency} onValueChange={setDobirkaCurrency}>
                    <SelectTrigger id="dobirka-currency" data-testid="select-dobirka-currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CZK">CZK</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  If you specify a COD amount, the carrier will collect this amount from the recipient upon delivery.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => setIsDialogOpen(false)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateLabel}
              disabled={createLabelMutation.isPending}
              className="flex items-center gap-2"
              data-testid="button-create-ppl-label"
            >
              {createLabelMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Package className="w-4 h-4" />
                  Create PPL Label
                </>
              )}
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