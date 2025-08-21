import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { 
  ArrowLeft, 
  Edit, 
  MapPin, 
  Mail, 
  Phone, 
  Calendar, 
  Package, 
  Banknote,
  User,
  MessageCircle,
  Star,
  Tag,
  Trophy,
  Clock,
  TrendingUp,
  AlertCircle,
  Award,
  CreditCard,
  Building
} from "lucide-react";
import { formatCurrency } from "@/lib/currencyUtils";
import { CustomerPrices } from "./CustomerPrices";

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
    return null;
  }

  // Calculate total spent
  const totalSpent = orders.reduce((sum, order) => sum + (order.total || 0), 0);
  const customerCurrency = orders[0]?.currency || 'EUR';
  
  // Calculate customer relationship duration
  const getCustomerDuration = () => {
    if (!customer.createdAt) return null;
    const created = new Date(customer.createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    const days = diffDays % 30;
    
    if (years > 0) {
      return `${years} year${years > 1 ? 's' : ''} ${months} month${months !== 1 ? 's' : ''}`;
    } else if (months > 0) {
      return `${months} month${months > 1 ? 's' : ''} ${days} day${days !== 1 ? 's' : ''}`;
    } else {
      return `${days} day${days !== 1 ? 's' : ''}`;
    }
  };
  
  // Determine customer badges
  const getCustomerBadges = () => {
    const badges = [];
    
    // Ranking badges
    if (customer.customerRank === 'TOP10') {
      badges.push({ label: 'TOP 10', variant: 'default', icon: Trophy, color: 'text-yellow-600 bg-yellow-50 border-yellow-300' });
    } else if (customer.customerRank === 'TOP50') {
      badges.push({ label: 'TOP 50', variant: 'secondary', icon: Award, color: 'text-blue-600 bg-blue-50 border-blue-300' });
    } else if (customer.customerRank === 'TOP100') {
      badges.push({ label: 'TOP 100', variant: 'outline', icon: Star, color: 'text-gray-600 bg-gray-50 border-gray-300' });
    }
    
    // Activity badges
    const lastOrderDate = orders[0]?.createdAt ? new Date(orders[0].createdAt) : null;
    if (lastOrderDate) {
      const daysSinceLastOrder = Math.floor((Date.now() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceLastOrder > 180) {
        badges.push({ label: 'Long Lost', variant: 'destructive', icon: AlertCircle, color: 'text-red-600 bg-red-50 border-red-300' });
      } else if (daysSinceLastOrder < 30) {
        badges.push({ label: 'Active', variant: 'default', icon: TrendingUp, color: 'text-green-600 bg-green-50 border-green-300' });
      } else if (daysSinceLastOrder < 90) {
        badges.push({ label: 'Regular', variant: 'secondary', icon: Clock, color: 'text-indigo-600 bg-indigo-50 border-indigo-300' });
      }
    }
    
    // Order volume badges
    if (orders.length >= 50) {
      badges.push({ label: 'Loyal', variant: 'default', icon: Star, color: 'text-purple-600 bg-purple-50 border-purple-300' });
    } else if (orders.length >= 20) {
      badges.push({ label: 'Frequent', variant: 'secondary', icon: Package, color: 'text-cyan-600 bg-cyan-50 border-cyan-300' });
    } else if (orders.length === 1) {
      badges.push({ label: 'New', variant: 'outline', icon: User, color: 'text-gray-600 bg-gray-50 border-gray-300' });
    }
    
    // Type badges
    if (customer.type === 'vip') {
      badges.push({ label: 'VIP', variant: 'default', icon: Star, color: 'text-amber-600 bg-amber-50 border-amber-300' });
    } else if (customer.type === 'wholesale') {
      badges.push({ label: 'Wholesale', variant: 'secondary', icon: Building, color: 'text-slate-600 bg-slate-50 border-slate-300' });
    }
    
    return badges;
  };
  
  const customerBadges = getCustomerBadges();
  const customerDuration = getCustomerDuration();

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
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-2xl font-bold text-slate-900">{customer.name}</h1>
              {customer.hasPayLaterBadge && (
                <Badge variant="outline" className="bg-yellow-50 border-yellow-300 text-yellow-700">
                  <CreditCard className="mr-1 h-3 w-3" />
                  Pay Later
                </Badge>
              )}
            </div>
            {/* Customer badges */}
            {customerBadges.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {customerBadges.map((badge, index) => {
                  const Icon = badge.icon;
                  return (
                    <Badge
                      key={index}
                      variant="outline"
                      className={badge.color}
                    >
                      <Icon className="mr-1 h-3 w-3" />
                      {badge.label}
                    </Badge>
                  );
                })}
              </div>
            )}
            {/* Customer duration and metadata */}
            <div className="flex items-center gap-4 text-sm text-slate-500">
              {customerDuration && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>Customer for {customerDuration}</span>
                </div>
              )}
              {customer.facebookName && (
                <span>Facebook: {customer.facebookName}</span>
              )}
            </div>
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

      {/* Tabs */}
      <Tabs defaultValue="details" className="space-y-6">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="prices">
            <Tag className="mr-2 h-4 w-4" />
            Custom Prices
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
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

          {/* Contact & Business Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact & Business Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Tax IDs based on country */}
              {(customer.country || customer.vatId || customer.taxId) && (
                <div className="pb-4 border-b">
                  <h4 className="text-sm font-medium text-slate-700 mb-2">Tax Identification</h4>
                  <div className="space-y-2">
                    {customer.country === 'Czech Republic' && customer.taxId && (
                      <div className="flex items-center gap-2 text-sm">
                        <Building className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-600">IČO:</span>
                        <span className="font-medium">{customer.taxId}</span>
                      </div>
                    )}
                    {(customer.country === 'Germany' || customer.country === 'Austria' || 
                      customer.country === 'France' || customer.country === 'Italy') && customer.vatId && (
                      <div className="flex items-center gap-2 text-sm">
                        <Building className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-600">VAT ID:</span>
                        <span className="font-medium">{customer.vatId}</span>
                      </div>
                    )}
                    {customer.country && !customer.taxId && !customer.vatId && (
                      <div className="text-sm text-slate-500 italic">
                        No tax ID registered
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Contact Information */}
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
              
              {/* Address */}
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
        </TabsContent>

        <TabsContent value="prices">
          <CustomerPrices customerId={id || ''} />
        </TabsContent>
      </Tabs>
    </div>
  );
}