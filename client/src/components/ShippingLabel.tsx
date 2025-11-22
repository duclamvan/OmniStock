import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
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
    codAmount?: string | null;
    codCurrency?: string | null;
  };
  onLabelCreated?: (labelData: any) => void;
}

export function ShippingLabel({ order, onLabelCreated }: ShippingLabelProps) {
  const { t } = useTranslation('shipping');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [codAmount, setDobirkaAmount] = useState(order.codAmount || '');
  const [codCurrency, setDobirkaCurrency] = useState(order.codCurrency || 'CZK');

  // Create shipping label mutation for PPL
  const createLabelMutation = useMutation({
    mutationFn: (data: any) => 
      apiRequest('POST', '/api/shipping/create-label', data),
    onSuccess: (data) => {
      toast({
        title: t('shipping:pplLabelCreated'),
        description: t('shipping:labelCreatedSuccessfully', { trackingNumber: data.trackingNumber || 'N/A' })
      });
      setIsDialogOpen(false);
      onLabelCreated?.(data);
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    },
    onError: (error: any) => {
      toast({
        title: t('shipping:failedToCreatePplLabel'),
        description: error.message || t('shipping:unknownErrorOccurred'),
        variant: "destructive"
      });
    }
  });

  const handleCreateLabel = () => {
    const labelData = {
      orderId: order.id,
      codAmount: codAmount && parseFloat(codAmount) > 0 ? codAmount : null,
      codCurrency: codAmount && parseFloat(codAmount) > 0 ? codCurrency : null
    };

    createLabelMutation.mutate(labelData);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2" data-testid="button-create-label">
          <Package className="w-4 h-4" />
          {t('shipping:createPplLabel')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('shipping:createPplShippingLabel')}</DialogTitle>
          <DialogDescription>
            {t('shipping:generatePplShippingLabel', { orderId: order.orderId })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('shipping:orderSummary')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">{t('shipping:customer')}:</span> {order.customerName}
                </div>
                <div>
                  <span className="font-medium">{t('shipping:orderId')}:</span> {order.orderId}
                </div>
                <div className="col-span-2">
                  <span className="font-medium">{t('shipping:address')}:</span> {order.shippingAddress}
                </div>
                <div>
                  <span className="font-medium">{t('shipping:items')}:</span> {order.items.length}
                </div>
                <div>
                  <span className="font-medium">{t('shipping:weight')}:</span> {order.weight ? `${order.weight} kg` : t('shipping:notSet')}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dobírka (Cash on Delivery) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Banknote className="w-5 h-5" />
                {t('shipping:dobirka')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dobirka-amount" data-testid="label-dobirka-amount">
                    {t('shipping:codAmountOptional')}
                  </Label>
                  <Input
                    id="dobirka-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={codAmount}
                    onChange={(e) => setDobirkaAmount(e.target.value)}
                    data-testid="input-dobirka-amount"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dobirka-currency" data-testid="label-dobirka-currency">
                    {t('shipping:currency')}
                  </Label>
                  <Select value={codCurrency} onValueChange={setDobirkaCurrency}>
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
                  {t('shipping:codCollectionNote')}
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
              {t('common:cancel')}
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
                  {t('shipping:creating')}
                </>
              ) : (
                <>
                  <Package className="w-4 h-4" />
                  {t('shipping:createPplLabel')}
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
  const { t } = useTranslation('shipping');

  if (!trackingNumber) {
    return (
      <Alert>
        <AlertCircle className="w-4 h-4" />
        <AlertDescription>
          {t('shipping:noShippingLabelCreated')}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          {t('shipping:shippingLabelCreated')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">{t('orders:trackingNumber')}:</span>
            <p className="font-mono">{trackingNumber}</p>
          </div>
          {carrier && (
            <div>
              <span className="font-medium">{t('orders:carrier')}:</span>
              <p>{carrier}</p>
            </div>
          )}
        </div>
        
        {trackingUrl && (
          <Button variant="outline" size="sm" asChild>
            <a href={trackingUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              {t('shipping:trackPackage')}
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}