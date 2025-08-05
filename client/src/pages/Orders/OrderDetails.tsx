import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Truck,
  Clock,
  CreditCard,
  FileText,
  ShoppingCart,
  Hash,
  Copy,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Printer,
  Download,
  Share2,
  MoreVertical,
  RotateCcw
} from "lucide-react";
import { formatCurrency } from "@/lib/currencyUtils";
import { useToast } from "@/hooks/use-toast";

export default function OrderDetails() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Fetch order data
  const { data: order, isLoading, isFetching } = useQuery<any>({
    queryKey: [`/api/orders/${id}`],
    enabled: !!id && !['add', 'to-fulfill', 'shipped', 'pay-later', 'pre-orders'].includes(id || ''),
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
    refetchOnWindowFocus: true, // Refetch when user returns to the tab
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    const url = window.location.href;
    copyToClipboard(url, "Order link");
  };

  const handleExport = () => {
    // Export order as PDF/CSV logic would go here
    toast({
      title: "Export Order",
      description: "Export functionality coming soon",
    });
  };

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
    order.orderStatus === 'shipped' ? 'default' :
    order.orderStatus === 'to_fulfill' ? 'secondary' :
    order.orderStatus === 'pending' ? 'outline' :
    order.orderStatus === 'cancelled' ? 'destructive' :
    'secondary';

  const statusText = 
    order.orderStatus === 'to_fulfill' ? 'To Fulfill' :
    order.orderStatus === 'shipped' ? 'Shipped' :
    order.orderStatus === 'pending' ? 'Pending' :
    order.orderStatus === 'cancelled' ? 'Cancelled' :
    order.orderStatus?.charAt(0).toUpperCase() + order.orderStatus?.slice(1) || 'Unknown';

  const paymentStatusVariant = 
    order.paymentStatus === 'paid' ? 'default' :
    order.paymentStatus === 'pending' ? 'secondary' :
    order.paymentStatus === 'pay_later' ? 'outline' :
    'secondary';

  const paymentStatusText = 
    order.paymentStatus === 'paid' ? 'Paid' :
    order.paymentStatus === 'pending' ? 'Payment Pending' :
    order.paymentStatus === 'pay_later' ? 'Pay Later' :
    order.paymentStatus;

  const priorityVariant = 
    order.priority === 'high' ? 'destructive' :
    order.priority === 'medium' ? 'secondary' :
    'outline';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/orders")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-2xl font-bold text-slate-900">Order #{order.orderId}</h1>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => copyToClipboard(order.orderId, "Order ID")}
              >
                <Copy className="h-3 w-3" />
              </Button>
              {isFetching && !isLoading && (
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-slate-500"></div>
                  <span>Syncing...</span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusVariant}>{statusText}</Badge>
              <Badge variant={paymentStatusVariant}>{paymentStatusText}</Badge>
              {order.priority && order.priority !== 'low' && (
                <Badge variant={priorityVariant}>
                  {order.priority === 'high' ? 'High Priority' : 'Medium Priority'}
                </Badge>
              )}
              <span className="text-sm text-slate-500">
                <Clock className="inline h-3 w-3 mr-1" />
                {new Date(order.createdAt).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => navigate(`/orders/${id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Order
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">Total Amount</p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(order.grandTotal || 0, order.currency || 'EUR')}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">Total Items</p>
                <p className="text-2xl font-bold text-slate-900">{order.items?.length || 0}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-purple-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">Payment Status</p>
                <div className="flex items-center gap-2">
                  {order.paymentStatus === 'paid' ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : order.paymentStatus === 'pay_later' ? (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <p className="text-lg font-semibold">{paymentStatusText}</p>
                </div>
              </div>
              <CreditCard className="h-8 w-8 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">Shipping Status</p>
                <div className="flex items-center gap-2">
                  {order.orderStatus === 'shipped' || order.shippedAt ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <p className="text-lg font-semibold text-green-700">Shipped</p>
                    </>
                  ) : (
                    <>
                      <Truck className="h-5 w-5 text-orange-500" />
                      <p className="text-lg font-semibold">Not Shipped</p>
                    </>
                  )}
                </div>
                {order.shippedAt && (
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(order.shippedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              <Package className="h-8 w-8 text-orange-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Order Items and Pricing */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items?.map((item: any, index: number) => (
                  <div key={item.id || index}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{item.productName}</p>
                        <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                          <span>SKU: {item.sku}</span>
                          <span>•</span>
                          <span>Qty: {item.quantity}</span>
                          <span>•</span>
                          <span>{formatCurrency(item.price || 0, order.currency || 'EUR')} each</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="font-semibold text-slate-900">
                            {formatCurrency(item.total || 0, order.currency || 'EUR')}
                          </p>
                          {item.discount > 0 && (
                            <p className="text-sm text-green-600">
                              -{formatCurrency(item.discount || 0, order.currency || 'EUR')} discount
                            </p>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => {
                                toast({
                                  title: "Coming Soon",
                                  description: "Return ticket functionality will be available soon",
                                });
                              }}
                            >
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Create Return ticket
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    {index < order.items.length - 1 && <Separator className="mt-4" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Pricing Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Pricing Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-medium">{formatCurrency(order.subtotal || 0, order.currency || 'EUR')}</span>
                </div>
                
                {order.discountValue > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">
                      Discount {order.discountType === 'rate' && `(${order.discountValue}%)`}
                    </span>
                    <span className="font-medium text-green-600">
                      -{formatCurrency(
                        order.discountType === 'rate' 
                          ? (order.subtotal * order.discountValue / 100) 
                          : order.discountValue || 0, 
                        order.currency || 'EUR'
                      )}
                    </span>
                  </div>
                )}
                
                {order.taxAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Tax ({order.taxRate}%)</span>
                    <span className="font-medium">{formatCurrency(order.taxAmount || 0, order.currency || 'EUR')}</span>
                  </div>
                )}
                
                {order.shippingCost > 0 && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Shipping ({order.shippingMethod})</span>
                      <span className="font-medium">{formatCurrency(order.shippingCost || 0, order.currency || 'EUR')}</span>
                    </div>
                    {order.actualShippingCost > 0 && order.actualShippingCost !== order.shippingCost && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500 text-xs">Actual Shipping Cost</span>
                        <span className="text-slate-500 text-xs">
                          {formatCurrency(order.actualShippingCost || 0, order.currency || 'EUR')}
                        </span>
                      </div>
                    )}
                  </>
                )}
                
                <Separator />
                
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-900">Grand Total</span>
                  <span className="font-bold text-xl text-slate-900">
                    {formatCurrency(order.grandTotal || 0, order.currency || 'EUR')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Order Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Order Created</p>
                    <p className="text-sm text-slate-500">
                      {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                
                {order.paymentStatus === 'paid' && order.updatedAt && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5"></div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">Payment Received</p>
                      <p className="text-sm text-slate-500">
                        {new Date(order.updatedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
                
                {order.shippedAt && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-1.5"></div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">Order Shipped</p>
                      <p className="text-sm text-slate-500">
                        {new Date(order.shippedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Customer & Order Info */}
        <div className="space-y-6">
          {/* Customer Information */}
          {order.customer && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Link href={`/customers/${order.customer.id}`}>
                    <p className="font-medium text-blue-600 hover:text-blue-800 cursor-pointer">
                      {order.customer.name}
                    </p>
                  </Link>
                  {order.customer.type && (
                    <Badge variant={order.customer.type === 'vip' ? 'default' : 'secondary'} className="mt-1">
                      {order.customer.type === 'vip' ? 'VIP Customer' : 'Regular Customer'}
                    </Badge>
                  )}
                </div>
                
                <div className="space-y-2 text-sm">
                  {order.customer.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-slate-400" />
                      <a href={`mailto:${order.customer.email}`} className="text-blue-600 hover:underline">
                        {order.customer.email}
                      </a>
                    </div>
                  )}
                  {order.customer.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-slate-400" />
                      <a href={`tel:${order.customer.phone}`} className="text-blue-600 hover:underline">
                        {order.customer.phone}
                      </a>
                    </div>
                  )}
                  {(order.customer.address || order.customer.city) && (
                    <div className="flex items-start gap-2 mt-3">
                      <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                      <div className="text-slate-600">
                        {order.customer.address && <p>{order.customer.address}</p>}
                        {(order.customer.city || order.customer.state || order.customer.zipCode) && (
                          <p>
                            {[order.customer.city, order.customer.state, order.customer.zipCode].filter(Boolean).join(', ')}
                          </p>
                        )}
                        {order.customer.country && <p>{order.customer.country}</p>}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Order Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Order Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-slate-600 mb-1">Order ID</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-sm">{order.orderId}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(order.orderId, "Order ID")}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-600 mb-1">Payment Method</p>
                <p className="font-medium">{order.paymentMethod || 'Not specified'}</p>
              </div>

              <div>
                <p className="text-sm text-slate-600 mb-1">Shipping Method</p>
                <p className="font-medium">{order.shippingMethod || 'Not specified'}</p>
              </div>

              {order.priority && order.priority !== 'low' && (
                <div>
                  <p className="text-sm text-slate-600 mb-1">Priority Level</p>
                  <Badge variant={order.priority === 'high' ? 'destructive' : 'secondary'}>
                    {order.priority === 'high' ? 'High Priority' : 'Medium Priority'}
                  </Badge>
                </div>
              )}

              {order.billerId && (
                <div>
                  <p className="text-sm text-slate-600 mb-1">Processed By</p>
                  <p className="font-medium">{order.billerId}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Order Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{order.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Attachments */}
          {order.attachmentUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Attachments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <a 
                  href={order.attachmentUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  View Attachment
                </a>
              </CardContent>
            </Card>
          )}
        </div>
      </div>


    </div>
  );
}