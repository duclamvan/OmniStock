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
  Building,
  ShoppingCart,
  DollarSign,
  Activity,
  FileText,
  CheckCircle,
  File
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
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
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

  // Calculate statistics
  const totalSpent = customer.totalSpent || orders.reduce((sum, order) => sum + (Number(order.grandTotal) || 0), 0);
  const customerCurrency = orders[0]?.currency || 'EUR';
  const averageOrderValue = orders.length > 0 ? totalSpent / orders.length : 0;
  const unpaidOrders = orders.filter(order => order.paymentStatus !== 'paid').length;
  const lastOrderDate = orders[0]?.createdAt ? new Date(orders[0].createdAt) : null;
  
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
      return `${years}y ${months}m`;
    } else if (months > 0) {
      return `${months}m ${days}d`;
    } else {
      return `${days}d`;
    }
  };
  
  // Determine customer badges
  const getCustomerBadges = () => {
    const badges = [];
    
    // Ranking badges
    if (customer.customerRank === 'TOP10') {
      badges.push({ label: 'TOP 10', icon: Trophy, color: 'bg-yellow-50 border-yellow-300 text-yellow-700' });
    } else if (customer.customerRank === 'TOP50') {
      badges.push({ label: 'TOP 50', icon: Award, color: 'bg-blue-50 border-blue-300 text-blue-700' });
    } else if (customer.customerRank === 'TOP100') {
      badges.push({ label: 'TOP 100', icon: Star, color: 'bg-gray-50 border-gray-300 text-gray-700' });
    }
    
    // Activity badges
    if (lastOrderDate) {
      const daysSinceLastOrder = Math.floor((Date.now() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceLastOrder < 30) {
        badges.push({ label: 'Active', icon: Activity, color: 'bg-green-50 border-green-300 text-green-700' });
      } else if (daysSinceLastOrder > 180) {
        badges.push({ label: 'Inactive', icon: AlertCircle, color: 'bg-red-50 border-red-300 text-red-700' });
      }
    }
    
    // Type badges
    if (customer.type === 'wholesale') {
      badges.push({ label: 'Wholesale', icon: Building, color: 'bg-slate-50 border-slate-300 text-slate-700' });
    } else if (customer.type === 'vip') {
      badges.push({ label: 'VIP', icon: Star, color: 'bg-purple-50 border-purple-300 text-purple-700' });
    }
    
    return badges;
  };
  
  const customerBadges = getCustomerBadges();
  const customerDuration = getCustomerDuration();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="sticky top-0 z-10 bg-white border-b lg:hidden">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/customers")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">{customer.name}</h1>
                <p className="text-xs text-slate-500">ID: {customer.id}</p>
              </div>
            </div>
            <Link href={`/customers/${id}/edit`}>
              <Button size="sm" variant="outline">
                <Edit className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:block bg-white border-b">
        <div className="container mx-auto px-6 py-4">
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
                <h1 className="text-2xl font-bold text-slate-900">{customer.name}</h1>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-sm text-slate-500">Customer ID: {customer.id}</span>
                  {customerDuration && (
                    <span className="text-sm text-slate-500">• Customer for {customerDuration}</span>
                  )}
                </div>
              </div>
            </div>
            <Link href={`/customers/${id}/edit`}>
              <Button>
                <Edit className="h-4 w-4 mr-2" />
                Edit Customer
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Customer Badges - Mobile */}
      {customerBadges.length > 0 && (
        <div className="px-4 py-3 bg-white border-b lg:hidden">
          <div className="flex flex-wrap gap-2">
            {customerBadges.map((badge, index) => {
              const Icon = badge.icon;
              return (
                <Badge key={index} variant="outline" className={badge.color}>
                  <Icon className="mr-1 h-3 w-3" />
                  {badge.label}
                </Badge>
              );
            })}
            {customer.hasPayLaterBadge && (
              <Badge variant="outline" className="bg-yellow-50 border-yellow-300 text-yellow-700">
                <CreditCard className="mr-1 h-3 w-3" />
                Pay Later
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Customer Badges - Desktop */}
      {customerBadges.length > 0 && (
        <div className="hidden lg:block bg-gray-50 border-b">
          <div className="container mx-auto px-6 py-3">
            <div className="flex flex-wrap gap-2">
              {customerBadges.map((badge, index) => {
                const Icon = badge.icon;
                return (
                  <Badge key={index} variant="outline" className={badge.color}>
                    <Icon className="mr-1 h-3 w-3" />
                    {badge.label}
                  </Badge>
                );
              })}
              {customer.hasPayLaterBadge && (
                <Badge variant="outline" className="bg-yellow-50 border-yellow-300 text-yellow-700">
                  <CreditCard className="mr-1 h-3 w-3" />
                  Pay Later
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 lg:px-6 py-4 lg:py-6">
        {/* Quick Stats - Mobile */}
        <div className="grid grid-cols-2 gap-3 mb-4 lg:hidden">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Package className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{orders.length}</p>
                  <p className="text-xs text-slate-500">Total Orders</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-lg font-bold">{formatCurrency(totalSpent, customerCurrency)}</p>
                  <p className="text-xs text-slate-500">Total Spent</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats - Desktop */}
        <div className="hidden lg:grid lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-500" />
                <p className="text-2xl font-bold">{orders.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Spent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                <p className="text-xl font-bold">{formatCurrency(totalSpent, customerCurrency)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Average Order</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-purple-500" />
                <p className="text-xl font-bold">{formatCurrency(averageOrderValue, customerCurrency)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Unpaid Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                <p className="text-2xl font-bold">{unpaidOrders}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="details" className="space-y-4">
          <TabsList className="w-full lg:w-auto">
            <TabsTrigger value="details" className="flex-1 lg:flex-none">Details</TabsTrigger>
            <TabsTrigger value="orders" className="flex-1 lg:flex-none">Orders</TabsTrigger>
            <TabsTrigger value="prices" className="flex-1 lg:flex-none">Prices</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base lg:text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Tax Information */}
                {(customer.vatId || customer.taxId) && (
                  <div className="pb-4 border-b">
                    <h4 className="text-sm font-medium text-slate-700 mb-2">Business Information</h4>
                    <div className="space-y-2">
                      {customer.country === 'Czech Republic' && customer.taxId && (
                        <div className="flex items-center gap-2 text-sm">
                          <Building className="h-4 w-4 text-slate-400" />
                          <span className="text-slate-600">IČO:</span>
                          <span className="font-medium">{customer.taxId}</span>
                        </div>
                      )}
                      {customer.vatId && (
                        <div className="flex items-center gap-2 text-sm">
                          <Building className="h-4 w-4 text-slate-400" />
                          <span className="text-slate-600">VAT ID:</span>
                          <span className="font-medium">{customer.vatId}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Contact Details */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {customer.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-slate-400" />
                      <span className="truncate">{customer.email}</span>
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

                {/* Facebook */}
                {customer.facebookName && (
                  <div className="flex items-center gap-2 text-sm">
                    <MessageCircle className="h-4 w-4 text-slate-400" />
                    <span>Facebook: {customer.facebookName}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            {customer.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base lg:text-lg">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{customer.notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Files & Documents History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Files & Documents Sent
                </CardTitle>
                <p className="text-xs text-slate-500 mt-1">
                  History of all documents sent with orders
                </p>
              </CardHeader>
              <CardContent>
                {(() => {
                  const ordersWithDocs = orders.filter((order: any) => 
                    order.includedDocuments && (
                      order.includedDocuments.invoicePrint || 
                      order.includedDocuments.custom || 
                      (order.includedDocuments.uploadedFiles && order.includedDocuments.uploadedFiles.length > 0)
                    )
                  );

                  if (ordersWithDocs.length === 0) {
                    return (
                      <div className="text-center py-6 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                        <File className="mx-auto h-10 w-10 mb-2 text-slate-400" />
                        <p className="text-sm font-medium text-slate-700">No documents sent yet</p>
                        <p className="text-xs text-slate-500 mt-1">Documents will appear here when sent with orders</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {ordersWithDocs.map((order: any) => (
                        <div key={order.id} className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <Link href={`/orders/${order.id}`}>
                                <p className="text-sm font-medium text-blue-600 hover:underline cursor-pointer">
                                  Order #{order.orderId || order.id}
                                </p>
                              </Link>
                              <p className="text-xs text-slate-500">
                                {new Date(order.createdAt).toLocaleDateString('en-GB', { 
                                  day: '2-digit', 
                                  month: 'short', 
                                  year: 'numeric' 
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-1">
                            {order.includedDocuments?.invoicePrint && (
                              <div className="flex items-center gap-2 text-xs">
                                <CheckCircle className="h-3 w-3 text-green-600" />
                                <span className="text-slate-700">Invoice (Print Copy)</span>
                              </div>
                            )}
                            {order.includedDocuments?.custom && (
                              <div className="flex items-center gap-2 text-xs">
                                <CheckCircle className="h-3 w-3 text-green-600" />
                                <span className="text-slate-700">Custom Documents</span>
                              </div>
                            )}
                            {order.includedDocuments?.uploadedFiles?.map((file: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-2 text-xs">
                                <FileText className="h-3 w-3 text-blue-600" />
                                <span className="text-slate-700 truncate">{file.name}</span>
                                {file.size && (
                                  <span className="text-slate-400">
                                    ({(file.size / 1024).toFixed(1)} KB)
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            <Card className="overflow-hidden">
              <CardHeader className="px-4 lg:px-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base lg:text-lg">Order History</CardTitle>
                  <span className="text-xs text-slate-500">{orders.length} orders</span>
                </div>
              </CardHeader>
              <CardContent className="px-3 lg:px-6">
                {orders.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">No orders found</p>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {orders.map((order: any) => (
                      <Link key={order.id} href={`/orders/${order.id}`}>
                        <div className="border border-slate-200 rounded-md p-3 hover:bg-slate-50 cursor-pointer transition-colors">
                          {/* Mobile Layout */}
                          <div className="lg:hidden">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">
                                  #{order.orderId || order.id}
                                </p>
                                <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                                  <Calendar className="h-3 w-3 flex-shrink-0" />
                                  <span>{new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                                </div>
                              </div>
                              <div className="text-right ml-2">
                                <p className="font-semibold text-sm whitespace-nowrap">
                                  {formatCurrency(order.grandTotal || 0, order.currency || 'EUR')}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant={
                                    order.orderStatus === 'ready_to_ship' ? 'outline' :
                                    order.orderStatus === 'delivered' ? 'default' :
                                    order.orderStatus === 'shipped' ? 'secondary' :
                                    order.orderStatus === 'cancelled' ? 'destructive' :
                                    'secondary'
                                  }
                                  className="text-xs px-2 py-0 h-5"
                                >
                                  {order.orderStatus === 'to_fulfill' ? 'To Fulfill' :
                                   order.orderStatus === 'ready_to_ship' ? 'Ready' :
                                   order.orderStatus === 'delivered' ? 'Delivered' :
                                   order.orderStatus === 'shipped' ? 'Shipped' :
                                   order.orderStatus === 'cancelled' ? 'Cancelled' :
                                   'Pending'}
                                </Badge>
                                <span className="text-xs text-slate-500">
                                  {order.items?.length || 0} items
                                </span>
                              </div>
                              <Badge 
                                variant={order.paymentStatus === 'paid' ? 'outline' : 'secondary'}
                                className="text-xs px-2 py-0 h-5"
                              >
                                {order.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                              </Badge>
                            </div>
                          </div>

                          {/* Desktop Layout */}
                          <div className="hidden lg:block">
                            <div className="flex items-start justify-between mb-2">
                              <div className="space-y-1">
                                <p className="font-medium text-sm">
                                  Order #{order.orderId || order.id}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                  <Calendar className="h-3 w-3" />
                                  <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-sm">
                                  {formatCurrency(order.grandTotal || 0, order.currency || 'EUR')}
                                </p>
                                <Badge 
                                  variant={
                                    order.orderStatus === 'ready_to_ship' ? 'outline' :
                                    order.orderStatus === 'delivered' ? 'default' :
                                    order.orderStatus === 'shipped' ? 'secondary' :
                                    order.orderStatus === 'cancelled' ? 'destructive' :
                                    'secondary'
                                  }
                                  className="text-xs mt-1"
                                >
                                  {order.orderStatus?.replace(/_/g, ' ').toUpperCase() || 'PENDING'}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t">
                              <span className="text-xs text-slate-500">
                                {order.items?.length || 0} items
                              </span>
                              <Badge 
                                variant={order.paymentStatus === 'paid' ? 'outline' : 'secondary'}
                                className="text-xs"
                              >
                                {order.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prices" className="space-y-4">
            <CustomerPrices customerId={id || ''} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}