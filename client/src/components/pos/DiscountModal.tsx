import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Percent, 
  DollarSign, 
  Gift, 
  Search, 
  Tag, 
  Calculator,
  AlertTriangle,
  CheckCircle2,
  X,
  Key,
  UserCheck,
  Shield,
  Euro
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import type { Discount, Coupon, Employee } from '@shared/schema';
import { cn } from '@/lib/utils';

interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  type: 'product' | 'variant' | 'bundle';
}

interface DiscountApplication {
  type: 'percentage' | 'fixed_amount' | 'coupon' | 'manager_override';
  value: number;
  reason?: string;
  couponCode?: string;
  discountId?: string;
  maxAmount?: number;
  appliedAmount: number;
  employeeId?: number;
  managerId?: number;
}

interface DiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  subtotal: number;
  currency: 'EUR' | 'CZK';
  customerId?: string;
  onApplyDiscount: (discount: DiscountApplication) => void;
  currentEmployee?: Employee;
}

export function DiscountModal({ 
  isOpen, 
  onClose, 
  cartItems, 
  subtotal, 
  currency, 
  customerId,
  onApplyDiscount,
  currentEmployee
}: DiscountModalProps) {
  const { toast } = useToast();
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed_amount' | 'coupon' | 'manager_override'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [managerOverrideReason, setManagerOverrideReason] = useState('');
  const [managerPin, setManagerPin] = useState('');
  const [calculatedDiscount, setCalculatedDiscount] = useState(0);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [validatedCoupon, setValidatedCoupon] = useState<Coupon | null>(null);

  // Get available coupons
  const { data: availableDiscounts = [] } = useQuery<any[]>({
    queryKey: ['/api/pos/coupons'],
    enabled: isOpen,
  });

  // Validate manager PIN mutation
  const validateManagerMutation = useMutation({
    mutationFn: (pin: string) => apiRequest('POST', '/api/pos/validate-manager', { pin }),
    onSuccess: (manager) => {
      const discount: DiscountApplication = {
        type: 'manager_override',
        value: parseFloat(discountValue),
        reason: managerOverrideReason,
        appliedAmount: calculatedDiscount,
        employeeId: currentEmployee?.id,
        managerId: manager.id
      };
      onApplyDiscount(discount);
      onClose();
      resetForm();
      toast({
        title: "Success",
        description: "Manager override discount applied",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Invalid manager PIN",
        variant: "destructive",
      });
    },
  });

  // Validate coupon mutation
  const validateCouponMutation = useMutation({
    mutationFn: (code: string) => apiRequest('POST', '/api/pos/validate-coupon', { 
      code, 
      customerId, 
      cartItems,
      subtotal 
    }),
    onSuccess: (coupon) => {
      setValidatedCoupon(coupon);
      setCalculatedDiscount(coupon.calculatedDiscount);
      toast({
        title: "Success",
        description: "Coupon is valid and ready to apply",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Invalid Coupon",
        description: error.message || "Coupon code is not valid",
        variant: "destructive",
      });
      setValidatedCoupon(null);
      setCalculatedDiscount(0);
    },
  });

  const formatCurrency = (amount: number) => {
    return `${currency} ${amount.toFixed(2)}`;
  };

  const calculateDiscount = (type: string, value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) return 0;

    switch (type) {
      case 'percentage':
        return Math.min((subtotal * numValue) / 100, subtotal);
      case 'fixed_amount':
        return Math.min(numValue, subtotal);
      default:
        return 0;
    }
  };

  const resetForm = () => {
    setDiscountType('percentage');
    setDiscountValue('');
    setCouponCode('');
    setManagerOverrideReason('');
    setManagerPin('');
    setCalculatedDiscount(0);
    setValidatedCoupon(null);
  };

  const handleApplyDiscount = () => {
    if (discountType === 'coupon') {
      if (!validatedCoupon) {
        toast({
          title: "Error",
          description: "Please validate the coupon first",
          variant: "destructive",
        });
        return;
      }
      
      const discount: DiscountApplication = {
        type: 'coupon',
        value: validatedCoupon.discountValue,
        couponCode: validatedCoupon.code,
        appliedAmount: calculatedDiscount,
        employeeId: currentEmployee?.id
      };
      onApplyDiscount(discount);
      onClose();
      resetForm();
      toast({
        title: "Success",
        description: "Coupon discount applied",
      });
    } else if (discountType === 'manager_override') {
      if (!managerOverrideReason.trim()) {
        toast({
          title: "Error",
          description: "Please provide a reason for the manager override",
          variant: "destructive",
        });
        return;
      }
      if (!managerPin.trim()) {
        toast({
          title: "Error",
          description: "Manager PIN is required",
          variant: "destructive",
        });
        return;
      }
      validateManagerMutation.mutate(managerPin);
    } else {
      const numValue = parseFloat(discountValue);
      if (isNaN(numValue) || numValue <= 0) {
        toast({
          title: "Error",
          description: "Please enter a valid discount value",
          variant: "destructive",
        });
        return;
      }

      const discount: DiscountApplication = {
        type: discountType,
        value: numValue,
        appliedAmount: calculatedDiscount,
        employeeId: currentEmployee?.id
      };
      onApplyDiscount(discount);
      onClose();
      resetForm();
      toast({
        title: "Success",
        description: "Discount applied successfully",
      });
    }
  };

  const handleValidateCoupon = () => {
    if (!couponCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a coupon code",
        variant: "destructive",
      });
      return;
    }
    validateCouponMutation.mutate(couponCode);
  };

  useEffect(() => {
    if (discountType === 'percentage' || discountType === 'fixed_amount') {
      setCalculatedDiscount(calculateDiscount(discountType, discountValue));
    }
  }, [discountType, discountValue, subtotal]);

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const activeDiscounts = availableDiscounts.filter(d => 
    d.status === 'active' && 
    new Date(d.startDate) <= new Date() && 
    new Date(d.endDate) >= new Date()
  );

  const canApplyManagerOverride = currentEmployee?.role === 'manager' || currentEmployee?.role === 'admin';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Apply Discount
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              {calculatedDiscount > 0 && (
                <>
                  <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                    <span>Discount:</span>
                    <span className="font-medium">-{formatCurrency(calculatedDiscount)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-base font-semibold">
                    <span>New Total:</span>
                    <span>{formatCurrency(subtotal - calculatedDiscount)}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Tabs value={discountType} onValueChange={(value) => setDiscountType(value as any)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="percentage" className="flex items-center gap-1">
                <Percent className="h-4 w-4" />
                Percentage
              </TabsTrigger>
              <TabsTrigger value="fixed_amount" className="flex items-center gap-1">
                <Euro className="h-4 w-4" />
                Fixed
              </TabsTrigger>
              <TabsTrigger value="coupon" className="flex items-center gap-1">
                <Gift className="h-4 w-4" />
                Coupon
              </TabsTrigger>
              {canApplyManagerOverride && (
                <TabsTrigger value="manager_override" className="flex items-center gap-1">
                  <Shield className="h-4 w-4" />
                  Override
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="percentage" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="percentage-value">Percentage Discount</Label>
                <div className="relative">
                  <Input
                    id="percentage-value"
                    type="number"
                    placeholder="Enter percentage (e.g., 10 for 10%)"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    min="0"
                    max="100"
                    step="0.01"
                    data-testid="input-percentage-discount"
                  />
                  <Percent className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                </div>
                {discountValue && (
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Discount amount: {formatCurrency(calculatedDiscount)}
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="fixed_amount" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fixed-amount">Fixed Amount Discount</Label>
                <div className="relative">
                  <Input
                    id="fixed-amount"
                    type="number"
                    placeholder={`Enter amount in ${currency}`}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    min="0"
                    max={subtotal}
                    step="0.01"
                    data-testid="input-fixed-discount"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-slate-400">
                    {currency}
                  </span>
                </div>
                {discountValue && (
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Discount amount: {formatCurrency(calculatedDiscount)}
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="coupon" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="coupon-code">Coupon Code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="coupon-code"
                      type="text"
                      placeholder="Enter coupon code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      data-testid="input-coupon-code"
                    />
                    <Button
                      variant="outline"
                      onClick={handleValidateCoupon}
                      disabled={!couponCode.trim() || validateCouponMutation.isPending}
                      data-testid="button-validate-coupon"
                    >
                      {validateCouponMutation.isPending ? 'Validating...' : 'Validate'}
                    </Button>
                  </div>
                </div>

                {validatedCoupon && (
                  <Card className="border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                        <div className="space-y-2">
                          <div>
                            <h4 className="font-medium text-green-800 dark:text-green-200">
                              {validatedCoupon.name}
                            </h4>
                            <p className="text-sm text-green-600 dark:text-green-300">
                              {validatedCoupon.description}
                            </p>
                          </div>
                          <div className="text-sm">
                            <p className="font-medium text-green-800 dark:text-green-200">
                              Discount: {formatCurrency(calculatedDiscount)}
                            </p>
                            {validatedCoupon.discountType === 'percentage' && (
                              <p className="text-green-600 dark:text-green-300">
                                {validatedCoupon.discountValue}% off
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {canApplyManagerOverride && (
              <TabsContent value="manager_override" className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="override-value">Override Amount</Label>
                    <RadioGroup value={discountType === 'manager_override' ? 'fixed_amount' : 'percentage'} className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="percentage" id="override-percentage" />
                        <label htmlFor="override-percentage" className="text-sm">Percentage</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="fixed_amount" id="override-fixed" />
                        <label htmlFor="override-fixed" className="text-sm">Fixed Amount</label>
                      </div>
                    </RadioGroup>
                    <Input
                      id="override-value"
                      type="number"
                      placeholder="Enter override value"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      min="0"
                      step="0.01"
                      data-testid="input-manager-override"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="override-reason">Reason for Override</Label>
                    <Input
                      id="override-reason"
                      type="text"
                      placeholder="Enter reason for manager override"
                      value={managerOverrideReason}
                      onChange={(e) => setManagerOverrideReason(e.target.value)}
                      data-testid="input-override-reason"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="manager-pin">Manager PIN</Label>
                    <div className="relative">
                      <Input
                        id="manager-pin"
                        type="password"
                        placeholder="Enter manager PIN"
                        value={managerPin}
                        onChange={(e) => setManagerPin(e.target.value)}
                        data-testid="input-manager-pin"
                      />
                      <Key className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    </div>
                  </div>

                  <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                    <div className="text-sm text-amber-800 dark:text-amber-200">
                      <p className="font-medium">Manager Override Required</p>
                      <p>This action requires manager authorization and will be logged.</p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>

          {/* Available Promotions */}
          {activeDiscounts.length > 0 && discountType !== 'manager_override' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Available Promotions</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-24">
                  <div className="space-y-2">
                    {activeDiscounts.map((discount) => (
                      <div 
                        key={discount.id}
                        className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded text-sm"
                      >
                        <div>
                          <span className="font-medium">{discount.name}</span>
                          {discount.type === 'percentage' && (
                            <Badge variant="secondary" className="ml-2">
                              {discount.percentage}% off
                            </Badge>
                          )}
                          {discount.type === 'fixed' && (
                            <Badge variant="secondary" className="ml-2">
                              {formatCurrency(parseFloat(discount.value || '0'))} off
                            </Badge>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (discount.type === 'percentage') {
                              setDiscountType('percentage');
                              setDiscountValue(discount.percentage?.toString() || '');
                            } else if (discount.type === 'fixed') {
                              setDiscountType('fixed_amount');
                              setDiscountValue(discount.value?.toString() || '');
                            }
                          }}
                        >
                          Apply
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            data-testid="button-cancel-discount"
          >
            Cancel
          </Button>
          <Button
            onClick={handleApplyDiscount}
            disabled={
              (discountType === 'coupon' && !validatedCoupon) ||
              (discountType !== 'coupon' && (!discountValue || parseFloat(discountValue) <= 0)) ||
              (discountType === 'manager_override' && (!managerOverrideReason.trim() || !managerPin.trim())) ||
              validateManagerMutation.isPending
            }
            className="flex items-center gap-2"
            data-testid="button-apply-discount"
          >
            <Tag className="h-4 w-4" />
            {validateManagerMutation.isPending ? 'Applying...' : 'Apply Discount'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DiscountModal;