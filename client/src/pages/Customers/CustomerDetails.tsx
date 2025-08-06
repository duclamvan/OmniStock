import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { 
  ArrowLeft, 
  Edit, 
  MapPin, 
  Mail, 
  Phone, 
  Calendar, 
  Package, 
  DollarSign,
  User,
  MessageCircle,
  Star
} from "lucide-react";
import { formatCurrency } from "@/lib/currencyUtils";

export default function CustomerDetails() {
  const { id } = useParams();
  const [, navigate] = useLocation();

  // Fetch customer data
  const { data: customer, isLoading: customerLoading } = useQuery<any>({
    queryKey: [`/api/customers/${id}`],
    enabled: !!id,
  });

  // Fetch customer orders
  const { data: orders = [], isLoading: ordersLoading } = useQuery<any[]>({
    queryKey: [`/api/orders?customerId=${id}`],
    enabled: !!id,
  });

  const isLoading = customerLoading || ordersLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600">Loading customer details...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-600">Customer not found</p>
        <Button
          variant="outline"
          onClick={() => navigate("/customers")}
          className="mt-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Customers
        </Button>
      </div>
    );
  }

  // Calculate total spent
  const totalSpent = orders.reduce((sum, order) => sum + (order.total || 0), 0);
  const customerCurrency = orders[0]?.currency || 'EUR';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/customers")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{customer.name}</h1>
              {customer.hasPayLaterBadge && (
                <Badge variant="outline" className="bg-yellow-50 border-yellow-300 text-yellow-700">
                  Pay Later
                </Badge>
              )}
            </div>
            {customer.facebookName && (
              <p className="text-sm text-slate-500">Facebook: {customer.facebookName}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {customer.facebookId && (
            <a
              href={`https://m.me/${customer.facebookId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm">
                <MessageCircle className="mr-2 h-4 w-4" />
                Message
              </Button>
            </a>
          )}
          <Button onClick={() => navigate(`/customers/${id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Customer
          </Button>
        </div>
      </div>

      {/* Customer Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Customer Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {customer.type === 'vip' ? (
                <Star className="h-5 w-5 text-yellow-500" />
              ) : (
                <User className="h-5 w-5 text-slate-400" />
              )}
              <Badge variant={customer.type === 'vip' ? 'default' : 'secondary'}>
                {customer.type?.toUpperCase() || 'REGULAR'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">{orders.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(totalSpent, customerCurrency)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Contact & Address Information */}
      <Card>
        <CardHeader>
          <CardTitle>Contact & Address Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customer.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-slate-400" />
                <span>{customer.email}</span>
              </div>
            )}
            {customer.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-slate-400" />
                <span>{customer.phone}</span>
              </div>
            )}
          </div>
          
          {(customer.address || customer.city || customer.country) && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
              <div>
                {customer.address && <p>{customer.address}</p>}
                <p>
                  {[customer.city, customer.state, customer.zipCode].filter(Boolean).join(', ')}
                  {customer.country && <>, {customer.country}</>}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {customer.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{customer.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Order History */}
      <Card>
        <CardHeader>
          <CardTitle>Order History</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-sm text-slate-500">No orders found for this customer.</p>
          ) : (
            <div className="space-y-4">
              {orders.map((order: any) => (
                <Link key={order.id} href={`/orders/${order.id}`}>
                  <div className="border rounded-lg p-4 hover:bg-slate-50 cursor-pointer transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Package className="h-5 w-5 text-slate-400" />
                      <div>
                        <p className="font-medium text-sm">Order #{order.id.slice(0, 8)}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">{formatCurrency(order.total || 0, order.currency || 'EUR')}</p>
                      <Badge 
                        variant={
                          order.status === 'delivered' ? 'default' :
                          order.status === 'shipped' ? 'outline' :
                          order.status === 'to_fulfill' ? 'secondary' :
                          order.status === 'pending' ? 'secondary' :
                          order.status === 'cancelled' ? 'destructive' :
                          'secondary'
                        }
                        className="mt-1"
                      >
                        {order.status === 'to_fulfill' ? 'To Fulfill' :
                         order.status === 'delivered' ? 'Delivered' :
                         order.status === 'shipped' ? 'Shipped' :
                         order.status === 'pending' ? 'Pending' :
                         order.status === 'cancelled' ? 'Cancelled' :
                         order.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>{order.items?.length || 0} items</span>
                    <span>Payment: {order.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}</span>
                  </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}