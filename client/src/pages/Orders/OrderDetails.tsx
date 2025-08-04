import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { 
  ArrowLeft, 
  Edit, 
  Package, 
  Calendar,
  User,
  MapPin,
  Phone,
  Mail,
  DollarSign,
  Truck
} from "lucide-react";
import { formatCurrency } from "@/lib/currencyUtils";

export default function OrderDetails() {
  const { id } = useParams();
  const [, navigate] = useLocation();

  // Fetch order data
  const { data: order, isLoading } = useQuery<any>({
    queryKey: [`/api/orders/${id}`],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-600">Order not found</p>
        <Button
          variant="outline"
          onClick={() => navigate("/orders")}
          className="mt-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Orders
        </Button>
      </div>
    );
  }

  const statusVariant = 
    order.orderStatus === 'shipped' ? 'outline' :
    order.orderStatus === 'to_fulfill' ? 'secondary' :
    order.orderStatus === 'pending' ? 'secondary' :
    'secondary';

  const statusText = 
    order.orderStatus === 'to_fulfill' ? 'To Fulfill' :
    order.orderStatus === 'shipped' ? 'Shipped' :
    order.orderStatus === 'pending' ? 'Pending' :
    order.orderStatus;

  const paymentStatusVariant = 
    order.paymentStatus === 'paid' ? 'default' :
    order.paymentStatus === 'pending' ? 'secondary' :
    order.paymentStatus === 'failed' ? 'destructive' :
    'secondary';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/orders")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Order #{order.id.slice(0, 8)}</h1>
            <div className="flex items-center gap-4 mt-2">
              <Badge variant={statusVariant}>{statusText}</Badge>
              <Badge variant={paymentStatusVariant}>
                {order.paymentStatus === 'paid' ? 'Paid' : 
                 order.paymentStatus === 'pending' ? 'Payment Pending' :
                 'Payment Failed'}
              </Badge>
              {order.priority && (
                <Badge variant="destructive">Priority</Badge>
              )}
            </div>
          </div>
        </div>
        <Button onClick={() => navigate(`/orders/${id}/edit`)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit Order
        </Button>
      </div>

      {/* Order Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Order Date</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              <p className="font-medium">{new Date(order.createdAt).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(order.grandTotal || 0, order.currency || 'EUR')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Items</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">{order.items?.length || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Shipping Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-slate-400" />
              <p className="font-medium">
                {order.shippedAt ? `Shipped ${new Date(order.shippedAt).toLocaleDateString()}` : 'Not Shipped'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Information */}
      {order.customer && (
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-slate-400" />
              <div>
                <Link href={`/customers/${order.customer.id}`}>
                  <p className="font-medium text-blue-600 hover:text-blue-800 cursor-pointer">
                    {order.customer.name}
                  </p>
                </Link>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {order.customer.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <span>{order.customer.email}</span>
                </div>
              )}
              {order.customer.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <span>{order.customer.phone}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle>Order Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {order.items?.map((item: any, index: number) => (
              <div key={item.id || index} className="border-b last:border-0 pb-4 last:pb-0">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-sm text-slate-500">SKU: {item.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {formatCurrency(item.total || 0, order.currency || 'EUR')}
                    </p>
                    <p className="text-sm text-slate-500">
                      {item.quantity} × {formatCurrency(item.price || 0, order.currency || 'EUR')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pricing Details */}
      <Card>
        <CardHeader>
          <CardTitle>Pricing Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatCurrency(order.subtotal || 0, order.currency || 'EUR')}</span>
            </div>
            {order.discountValue > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount</span>
                <span>-{formatCurrency(order.discountValue || 0, order.currency || 'EUR')}</span>
              </div>
            )}
            {order.taxAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span>Tax ({order.taxRate}%)</span>
                <span>{formatCurrency(order.taxAmount || 0, order.currency || 'EUR')}</span>
              </div>
            )}
            {order.shippingCost > 0 && (
              <div className="flex justify-between text-sm">
                <span>Shipping</span>
                <span>{formatCurrency(order.shippingCost || 0, order.currency || 'EUR')}</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between font-medium">
              <span>Total</span>
              <span>{formatCurrency(order.grandTotal || 0, order.currency || 'EUR')}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {order.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{order.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}