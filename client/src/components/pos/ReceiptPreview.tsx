import { forwardRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import type { Customer, Employee } from '@shared/schema';

interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  type: 'product' | 'variant' | 'bundle';
  sku?: string;
}

interface PaymentMethod {
  id: string;
  type: 'cash' | 'card' | 'bank_transfer' | 'gift_card' | 'store_credit';
  amount: number;
  reference?: string;
  cardLastFour?: string;
}

interface DiscountApplication {
  type: 'percentage' | 'fixed_amount' | 'coupon' | 'manager_override';
  value: number;
  appliedAmount: number;
  couponCode?: string;
  reason?: string;
}

interface ReceiptPreviewProps {
  orderId?: string;
  customer?: Customer;
  employee?: Employee;
  cartItems: CartItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  tipAmount?: number;
  total: number;
  currency: 'EUR' | 'CZK';
  paymentMethods: PaymentMethod[];
  discount?: DiscountApplication;
  orderNotes?: string;
  changeAmount?: number;
  transactionDate?: Date;
  storeInfo?: {
    name: string;
    address: string;
    phone: string;
    email: string;
    vatNumber?: string;
  };
}

export const ReceiptPreview = forwardRef<HTMLDivElement, ReceiptPreviewProps>(({
  orderId,
  customer,
  employee,
  cartItems,
  subtotal,
  taxAmount,
  discountAmount,
  tipAmount = 0,
  total,
  currency,
  paymentMethods,
  discount,
  orderNotes,
  changeAmount = 0,
  transactionDate = new Date(),
  storeInfo = {
    name: "Davie Supply",
    address: "123 Business Street, Prague, Czech Republic",
    phone: "+420 123 456 789",
    email: "info@daviesupply.com",
    vatNumber: "CZ12345678"
  }
}, ref) => {
  const formatCurrency = (amount: number) => {
    return `${currency} ${amount.toFixed(2)}`;
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
    <div 
      ref={ref}
      className="bg-white text-black p-6 max-w-sm mx-auto font-mono text-sm"
      style={{ 
        fontFamily: 'monospace',
        lineHeight: '1.4',
        fontSize: '12px'
      }}
    >
      {/* Store Header */}
      <div className="text-center mb-6">
        <h1 className="text-lg font-bold mb-2">{storeInfo.name}</h1>
        <div className="text-xs space-y-1">
          <div>{storeInfo.address}</div>
          <div>Tel: {storeInfo.phone}</div>
          <div>Email: {storeInfo.email}</div>
          {storeInfo.vatNumber && <div>VAT: {storeInfo.vatNumber}</div>}
        </div>
      </div>

      <div className="text-center mb-4">
        <div className="border-t border-b border-black py-2">
          <div className="font-bold">SALES RECEIPT</div>
        </div>
      </div>

      {/* Transaction Info */}
      <div className="mb-4 space-y-1 text-xs">
        <div className="flex justify-between">
          <span>Date:</span>
          <span>{format(transactionDate, 'dd/MM/yyyy HH:mm')}</span>
        </div>
        {orderId && (
          <div className="flex justify-between">
            <span>Transaction:</span>
            <span>#{orderId.slice(-8).toUpperCase()}</span>
          </div>
        )}
        {employee && (
          <div className="flex justify-between">
            <span>Cashier:</span>
            <span>{employee.firstName} {employee.lastName}</span>
          </div>
        )}
        {customer && (
          <div className="flex justify-between">
            <span>Customer:</span>
            <span>{customer.name}</span>
          </div>
        )}
      </div>

      <div className="border-t border-black my-3"></div>

      {/* Items */}
      <div className="mb-4">
        {cartItems.map((item, index) => (
          <div key={item.id || index} className="mb-2">
            <div className="flex justify-between">
              <span className="flex-1 truncate">{item.name}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>{item.quantity} × {formatCurrency(item.price)}</span>
              <span>{formatCurrency(item.price * item.quantity)}</span>
            </div>
            {item.sku && (
              <div className="text-xs text-gray-600">SKU: {item.sku}</div>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-black my-3"></div>

      {/* Totals */}
      <div className="space-y-1">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        
        {discountAmount > 0 && (
          <div className="flex justify-between">
            <span>
              Discount
              {discount?.type === 'coupon' && discount.couponCode && (
                <span className="text-xs"> ({discount.couponCode})</span>
              )}
              {discount?.type === 'percentage' && (
                <span className="text-xs"> ({discount.value}%)</span>
              )}:
            </span>
            <span>-{formatCurrency(discountAmount)}</span>
          </div>
        )}
        
        {tipAmount > 0 && (
          <div className="flex justify-between">
            <span>Tip:</span>
            <span>{formatCurrency(tipAmount)}</span>
          </div>
        )}
        
        {taxAmount > 0 && (
          <div className="flex justify-between">
            <span>Tax:</span>
            <span>{formatCurrency(taxAmount)}</span>
          </div>
        )}
        
        <div className="border-t border-black my-2"></div>
        
        <div className="flex justify-between font-bold text-base">
          <span>TOTAL:</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>

      <div className="border-t border-black my-3"></div>

      {/* Payment Methods */}
      <div className="mb-4">
        <div className="font-bold mb-2">PAYMENT:</div>
        {paymentMethods.map((payment, index) => (
          <div key={payment.id || index} className="flex justify-between text-xs mb-1">
            <span>
              {getPaymentMethodLabel(payment.type)}
              {payment.cardLastFour && ` (••••${payment.cardLastFour})`}
              {payment.reference && ` (${payment.reference})`}
            </span>
            <span>{formatCurrency(payment.amount)}</span>
          </div>
        ))}
        
        {changeAmount > 0 && (
          <div className="flex justify-between font-bold mt-2">
            <span>CHANGE:</span>
            <span>{formatCurrency(changeAmount)}</span>
          </div>
        )}
      </div>

      {/* Order Notes */}
      {orderNotes && (
        <>
          <div className="border-t border-black my-3"></div>
          <div className="mb-4">
            <div className="font-bold mb-1">NOTES:</div>
            <div className="text-xs whitespace-pre-wrap">{orderNotes}</div>
          </div>
        </>
      )}

      {/* Customer Info */}
      {customer && (
        <>
          <div className="border-t border-black my-3"></div>
          <div className="mb-4 text-xs">
            <div className="font-bold mb-1">CUSTOMER:</div>
            <div>{customer.name}</div>
            {customer.phone && <div>Phone: {customer.phone}</div>}
            {customer.email && <div>Email: {customer.email}</div>}
          </div>
        </>
      )}

      <div className="border-t border-black my-3"></div>

      {/* Footer */}
      <div className="text-center text-xs space-y-2">
        <div>Thank you for your business!</div>
        <div>Please keep this receipt for your records</div>
        
        {/* Return Policy */}
        <div className="mt-4 text-xs">
          <div className="font-bold">RETURN POLICY:</div>
          <div>Returns within 30 days with receipt</div>
          <div>Original packaging required</div>
        </div>
        
        {/* Contact Info */}
        <div className="mt-4">
          <div>Visit us: {storeInfo.name}</div>
          <div>Call: {storeInfo.phone}</div>
          <div>Email: {storeInfo.email}</div>
        </div>
        
        <div className="mt-4 border-t border-b border-black py-2">
          <div className="font-bold">THANK YOU!</div>
        </div>
      </div>
    </div>
  );
});

ReceiptPreview.displayName = 'ReceiptPreview';

export default ReceiptPreview;