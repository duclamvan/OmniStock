import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CreditCard, 
  Banknote, 
  Building,
  Plus,
  Minus,
  Calculator,
  CheckCircle2,
  AlertTriangle,
  X,
  Receipt,
  DollarSign,
  Euro,
  Smartphone,
  Gift
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { Employee } from '@shared/schema';
import { cn } from '@/lib/utils';

interface PaymentMethod {
  id: string;
  type: 'cash' | 'card' | 'bank_transfer' | 'gift_card' | 'store_credit';
  amount: number;
  reference?: string;
  cardLastFour?: string;
  approvalCode?: string;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  currency: 'EUR' | 'CZK';
  onPaymentComplete: (payments: PaymentMethod[], change?: number) => void;
  currentEmployee?: Employee;
  allowPartialPayment?: boolean;
}

export function PaymentModal({ 
  isOpen, 
  onClose, 
  total, 
  currency, 
  onPaymentComplete,
  currentEmployee,
  allowPartialPayment = false
}: PaymentModalProps) {
  const { toast } = useToast();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [activePaymentType, setActivePaymentType] = useState<'cash' | 'card' | 'bank_transfer' | 'gift_card' | 'store_credit'>('cash');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [cashReceived, setCashReceived] = useState('');
  const [cardReference, setCardReference] = useState('');
  const [giftCardNumber, setGiftCardNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const totalPaid = paymentMethods.reduce((sum, payment) => sum + payment.amount, 0);
  const remainingAmount = total - totalPaid;
  const changeAmount = Math.max(0, totalPaid - total);
  const isFullyPaid = totalPaid >= total;

  const formatCurrency = (amount: number) => {
    return `${currency} ${amount.toFixed(2)}`;
  };

  const processCardPayment = useMutation({
    mutationFn: (data: { amount: number; reference: string }) => 
      apiRequest('POST', '/api/payments/process-card', data),
    onSuccess: (result) => {
      const payment: PaymentMethod = {
        id: `card_${Date.now()}`,
        type: 'card',
        amount: parseFloat(paymentAmount),
        reference: cardReference,
        cardLastFour: result.cardLastFour,
        approvalCode: result.approvalCode
      };
      setPaymentMethods(prev => [...prev, payment]);
      resetPaymentForm();
      toast({
        title: "Success",
        description: "Card payment processed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Payment Failed",
        description: error.message || "Card payment could not be processed",
        variant: "destructive",
      });
    },
  });

  const validateGiftCard = useMutation({
    mutationFn: (cardNumber: string) => 
      apiRequest('POST', '/api/pos/validate-gift-card', { cardNumber }),
    onSuccess: (result) => {
      const maxAmount = Math.min(result.balance, remainingAmount);
      const payment: PaymentMethod = {
        id: `gift_${Date.now()}`,
        type: 'gift_card',
        amount: maxAmount,
        reference: giftCardNumber
      };
      setPaymentMethods(prev => [...prev, payment]);
      resetPaymentForm();
      toast({
        title: "Success",
        description: `Gift card applied: ${formatCurrency(maxAmount)}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Invalid Gift Card",
        description: error.message || "Gift card number is not valid",
        variant: "destructive",
      });
    },
  });

  const resetPaymentForm = () => {
    setPaymentAmount('');
    setCashReceived('');
    setCardReference('');
    setGiftCardNumber('');
  };

  const addPayment = () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid payment amount",
        variant: "destructive",
      });
      return;
    }

    if (amount > remainingAmount && !allowPartialPayment) {
      toast({
        title: "Amount Too Large",
        description: "Payment amount cannot exceed the remaining balance",
        variant: "destructive",
      });
      return;
    }

    switch (activePaymentType) {
      case 'cash':
        const payment: PaymentMethod = {
          id: `cash_${Date.now()}`,
          type: 'cash',
          amount
        };
        setPaymentMethods(prev => [...prev, payment]);
        resetPaymentForm();
        break;

      case 'card':
        if (!cardReference.trim()) {
          toast({
            title: "Missing Reference",
            description: "Please enter a card reference number",
            variant: "destructive",
          });
          return;
        }
        processCardPayment.mutate({ amount, reference: cardReference });
        break;

      case 'bank_transfer':
        const bankPayment: PaymentMethod = {
          id: `bank_${Date.now()}`,
          type: 'bank_transfer',
          amount,
          reference: cardReference
        };
        setPaymentMethods(prev => [...prev, bankPayment]);
        resetPaymentForm();
        break;

      case 'gift_card':
        if (!giftCardNumber.trim()) {
          toast({
            title: "Missing Gift Card",
            description: "Please enter a gift card number",
            variant: "destructive",
          });
          return;
        }
        validateGiftCard.mutate(giftCardNumber);
        break;

      case 'store_credit':
        const creditPayment: PaymentMethod = {
          id: `credit_${Date.now()}`,
          type: 'store_credit',
          amount,
          reference: cardReference
        };
        setPaymentMethods(prev => [...prev, creditPayment]);
        resetPaymentForm();
        break;
    }
  };

  const removePayment = (paymentId: string) => {
    setPaymentMethods(prev => prev.filter(p => p.id !== paymentId));
  };

  const handleCashPayment = () => {
    const received = parseFloat(cashReceived);
    if (isNaN(received) || received < remainingAmount) {
      toast({
        title: "Insufficient Cash",
        description: "Cash received must be at least the remaining amount",
        variant: "destructive",
      });
      return;
    }

    const payment: PaymentMethod = {
      id: `cash_${Date.now()}`,
      type: 'cash',
      amount: remainingAmount
    };
    
    const allPayments = [...paymentMethods, payment];
    const change = received - remainingAmount;
    onPaymentComplete(allPayments, change);
  };

  const handleCompletePayment = () => {
    if (!isFullyPaid && !allowPartialPayment) {
      toast({
        title: "Incomplete Payment",
        description: "Please complete the full payment amount",
        variant: "destructive",
      });
      return;
    }

    onPaymentComplete(paymentMethods, changeAmount);
  };

  const quickCashAmounts = [
    Math.ceil(remainingAmount),
    Math.ceil(remainingAmount / 5) * 5,
    Math.ceil(remainingAmount / 10) * 10,
    Math.ceil(remainingAmount / 20) * 20
  ].filter((amount, index, arr) => arr.indexOf(amount) === index && amount > remainingAmount);

  useEffect(() => {
    if (!isOpen) {
      setPaymentMethods([]);
      resetPaymentForm();
    }
  }, [isOpen]);

  useEffect(() => {
    if (remainingAmount > 0) {
      setPaymentAmount(remainingAmount.toFixed(2));
    }
  }, [remainingAmount]);

  const getPaymentMethodIcon = (type: string) => {
    switch (type) {
      case 'cash': return <Banknote className="h-4 w-4" />;
      case 'card': return <CreditCard className="h-4 w-4" />;
      case 'bank_transfer': return <Building className="h-4 w-4" />;
      case 'gift_card': return <Gift className="h-4 w-4" />;
      case 'store_credit': return <DollarSign className="h-4 w-4" />;
      default: return <CreditCard className="h-4 w-4" />;
    }
  };

  const getPaymentMethodLabel = (type: string) => {
    switch (type) {
      case 'cash': return 'Cash';
      case 'card': return 'Card';
      case 'bank_transfer': return 'Bank Transfer';
      case 'gift_card': return 'Gift Card';
      case 'store_credit': return 'Store Credit';
      default: return type;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Payment Processing
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
          {/* Payment Input Section */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>Payment Summary</span>
                  <Badge variant={isFullyPaid ? "success" : "secondary"}>
                    {isFullyPaid ? "Fully Paid" : `${formatCurrency(remainingAmount)} Remaining`}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Amount:</span>
                  <span className="font-medium">{formatCurrency(total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Amount Paid:</span>
                  <span className="font-medium text-green-600">{formatCurrency(totalPaid)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Remaining:</span>
                  <span className="font-medium">{formatCurrency(remainingAmount)}</span>
                </div>
                {changeAmount > 0 && (
                  <div className="flex justify-between text-sm text-blue-600">
                    <span>Change Due:</span>
                    <span className="font-medium">{formatCurrency(changeAmount)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Tabs value={activePaymentType} onValueChange={(value) => setActivePaymentType(value as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="cash" className="flex items-center gap-1">
                  <Banknote className="h-4 w-4" />
                  Cash
                </TabsTrigger>
                <TabsTrigger value="card" className="flex items-center gap-1">
                  <CreditCard className="h-4 w-4" />
                  Card
                </TabsTrigger>
                <TabsTrigger value="bank_transfer" className="flex items-center gap-1">
                  <Building className="h-4 w-4" />
                  Transfer
                </TabsTrigger>
              </TabsList>

              <TabsContent value="cash" className="space-y-4">
                {remainingAmount === total ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="cash-received">Cash Received</Label>
                      <Input
                        id="cash-received"
                        type="number"
                        placeholder={`Amount in ${currency}`}
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        min={remainingAmount}
                        step="0.01"
                        data-testid="input-cash-received"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      {quickCashAmounts.slice(0, 4).map(amount => (
                        <Button
                          key={amount}
                          variant="outline"
                          size="sm"
                          onClick={() => setCashReceived(amount.toString())}
                          data-testid={`button-quick-cash-${amount}`}
                        >
                          {formatCurrency(amount)}
                        </Button>
                      ))}
                    </div>

                    {parseFloat(cashReceived) >= remainingAmount && (
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-800 dark:text-green-200">
                            Change: {formatCurrency(parseFloat(cashReceived) - remainingAmount)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="cash-amount">Cash Amount</Label>
                      <Input
                        id="cash-amount"
                        type="number"
                        placeholder={`Amount in ${currency}`}
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        min="0"
                        max={remainingAmount}
                        step="0.01"
                        data-testid="input-cash-amount"
                      />
                    </div>
                    <Button
                      onClick={addPayment}
                      disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                      className="w-full"
                      data-testid="button-add-cash-payment"
                    >
                      Add Cash Payment
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="card" className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="card-amount">Card Amount</Label>
                    <Input
                      id="card-amount"
                      type="number"
                      placeholder={`Amount in ${currency}`}
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      min="0"
                      max={remainingAmount}
                      step="0.01"
                      data-testid="input-card-amount"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="card-reference">Reference Number</Label>
                    <Input
                      id="card-reference"
                      type="text"
                      placeholder="Transaction reference"
                      value={cardReference}
                      onChange={(e) => setCardReference(e.target.value)}
                      data-testid="input-card-reference"
                    />
                  </div>
                  <Button
                    onClick={addPayment}
                    disabled={!paymentAmount || !cardReference.trim() || processCardPayment.isPending}
                    className="w-full"
                    data-testid="button-add-card-payment"
                  >
                    {processCardPayment.isPending ? 'Processing...' : 'Process Card Payment'}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="bank_transfer" className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="transfer-amount">Transfer Amount</Label>
                    <Input
                      id="transfer-amount"
                      type="number"
                      placeholder={`Amount in ${currency}`}
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      min="0"
                      max={remainingAmount}
                      step="0.01"
                      data-testid="input-transfer-amount"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="transfer-reference">Reference Number</Label>
                    <Input
                      id="transfer-reference"
                      type="text"
                      placeholder="Transfer reference"
                      value={cardReference}
                      onChange={(e) => setCardReference(e.target.value)}
                      data-testid="input-transfer-reference"
                    />
                  </div>
                  <Button
                    onClick={addPayment}
                    disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                    className="w-full"
                    data-testid="button-add-transfer-payment"
                  >
                    Add Bank Transfer
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Payment Methods Summary */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Payment Methods</CardTitle>
              </CardHeader>
              <CardContent>
                {paymentMethods.length === 0 ? (
                  <div className="text-center py-4 text-slate-500">
                    No payments added yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paymentMethods.map((payment) => (
                      <div 
                        key={payment.id}
                        className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {getPaymentMethodIcon(payment.type)}
                          <div>
                            <div className="font-medium text-sm">
                              {getPaymentMethodLabel(payment.type)}
                            </div>
                            {payment.reference && (
                              <div className="text-xs text-slate-500">
                                Ref: {payment.reference}
                              </div>
                            )}
                            {payment.cardLastFour && (
                              <div className="text-xs text-slate-500">
                                •••• {payment.cardLastFour}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {formatCurrency(payment.amount)}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removePayment(payment.id)}
                            className="h-6 w-6 p-0 text-slate-400 hover:text-red-500"
                            data-testid={`button-remove-payment-${payment.id}`}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {changeAmount > 0 && (
              <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Calculator className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="font-medium text-blue-800 dark:text-blue-200">
                        Change Due
                      </div>
                      <div className="text-xl font-bold text-blue-600">
                        {formatCurrency(changeAmount)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            data-testid="button-cancel-payment"
          >
            Cancel
          </Button>
          
          {remainingAmount === total && activePaymentType === 'cash' ? (
            <Button
              onClick={handleCashPayment}
              disabled={!cashReceived || parseFloat(cashReceived) < remainingAmount}
              className="flex items-center gap-2"
              data-testid="button-complete-cash-payment"
            >
              <CheckCircle2 className="h-4 w-4" />
              Complete Cash Payment
            </Button>
          ) : (
            <Button
              onClick={handleCompletePayment}
              disabled={!isFullyPaid && !allowPartialPayment}
              className="flex items-center gap-2"
              data-testid="button-complete-payment"
            >
              <CheckCircle2 className="h-4 w-4" />
              Complete Payment
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PaymentModal;