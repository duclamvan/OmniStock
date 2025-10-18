import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { useState, useEffect } from "react";
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
  File,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Ticket,
  Plus
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/currencyUtils";
import { CustomerPrices } from "./CustomerPrices";

const EXPAND_ALL_KEY = 'customerOrdersExpandAll';

export default function CustomerDetails() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [expandAll, setExpandAll] = useState<boolean>(() => {
    const saved = localStorage.getItem(EXPAND_ALL_KEY);
    return saved === 'true';
  });

  // Fetch customer data
  const { data: customer, isLoading: customerLoading } = useQuery<any>({
    queryKey: [`/api/customers/${id}`],
    enabled: !!id,
  });

  // Fetch customer orders with items
  const { data: orders = [], isLoading: ordersLoading } = useQuery<any[]>({
    queryKey: [`/api/orders?customerId=${id}&includeItems=true`],
    enabled: !!id,
  });

  // Fetch customer tickets
  const { data: tickets = [] } = useQuery<any[]>({
    queryKey: [`/api/tickets?customerId=${id}`],
    enabled: !!id,
  });

  const isLoading = customerLoading || ordersLoading;

  // Update expanded orders when orders change or expandAll changes
  useEffect(() => {
    if (orders.length > 0) {
      if (expandAll) {
        // Expand all orders
        const allExpanded: Record<string, boolean> = {};
        orders.forEach(order => {
          allExpanded[order.id] = true;
        });
        setExpandedOrders(allExpanded);
      } else {
        // Collapse all orders
        setExpandedOrders({});
      }
    }
  }, [orders, expandAll]);

  // Save expandAll preference to localStorage
  const handleToggleExpandAll = () => {
    const newValue = !expandAll;
    setExpandAll(newValue);
    localStorage.setItem(EXPAND_ALL_KEY, String(newValue));
  };

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
      {/* Header Section */}
      <div className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 lg:gap-4 flex-1 min-w-0">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate("/customers")}
                className="shrink-0"
                data-testid="button-back"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg lg:text-2xl font-bold text-slate-900 truncate">{customer.name}</h1>
                <div className="flex items-center gap-2 lg:gap-3 mt-1 text-xs lg:text-sm text-slate-500 flex-wrap">
                  <span className="shrink-0">ID: {customer.id?.slice(0, 8)}...</span>
                  {customerDuration && (
                    <>
                      <span className="hidden lg:inline">•</span>
                      <span className="shrink-0">Customer for {customerDuration}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <Link href={`/customers/${id}/edit`}>
              <Button data-testid="button-editCustomer" className="shrink-0">
                <Edit className="h-4 w-4 lg:mr-2" />
                <span className="hidden lg:inline">Edit</span>
              </Button>
            </Link>
          </div>

          {/* Badges */}
          {customerBadges.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
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
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <Card>
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 lg:p-3 bg-blue-50 rounded-lg">
                  <Package className="h-5 w-5 lg:h-6 lg:w-6 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl lg:text-2xl font-bold text-slate-900">{orders.length}</p>
                  <p className="text-xs lg:text-sm text-slate-500">Total Orders</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 lg:p-3 bg-green-50 rounded-lg">
                  <DollarSign className="h-5 w-5 lg:h-6 lg:w-6 text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-base lg:text-xl font-bold text-slate-900 truncate">{formatCurrency(totalSpent, customerCurrency)}</p>
                  <p className="text-xs lg:text-sm text-slate-500">Total Spent</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 lg:p-3 bg-purple-50 rounded-lg">
                  <ShoppingCart className="h-5 w-5 lg:h-6 lg:w-6 text-purple-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-base lg:text-xl font-bold text-slate-900 truncate">{formatCurrency(averageOrderValue, customerCurrency)}</p>
                  <p className="text-xs lg:text-sm text-slate-500">Avg Order</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 lg:p-3 bg-orange-50 rounded-lg">
                  <AlertCircle className="h-5 w-5 lg:h-6 lg:w-6 text-orange-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl lg:text-2xl font-bold text-slate-900">{unpaidOrders}</p>
                  <p className="text-xs lg:text-sm text-slate-500">Unpaid</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="max-w-7xl mx-auto px-4 lg:px-6 pb-6">
        <Tabs defaultValue="details" className="space-y-6">
          {/* Sticky Tab Navigation */}
          <div className="sticky top-[113px] lg:top-[105px] z-10 bg-gray-50 -mx-4 lg:-mx-6 px-4 lg:px-6 py-3 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
            <TabsList className="w-full lg:w-auto h-auto p-1 bg-slate-100">
              <TabsTrigger 
                value="details" 
                className="flex-1 lg:flex-none lg:px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm font-medium"
                data-testid="tab-details"
              >
                <FileText className="h-4 w-4 lg:mr-2" />
                <span className="hidden lg:inline">Details</span>
              </TabsTrigger>
              <TabsTrigger 
                value="orders" 
                className="flex-1 lg:flex-none lg:px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm font-medium"
                data-testid="tab-orders"
              >
                <Package className="h-4 w-4 lg:mr-2" />
                <span className="hidden sm:inline">Orders</span>
                <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                  {orders.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger 
                value="prices" 
                className="flex-1 lg:flex-none lg:px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm font-medium"
                data-testid="tab-prices"
              >
                <Tag className="h-4 w-4 lg:mr-2" />
                <span className="hidden lg:inline">Prices</span>
              </TabsTrigger>
              <TabsTrigger 
                value="tickets" 
                className="flex-1 lg:flex-none lg:px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm font-medium"
                data-testid="tab-tickets"
              >
                <Ticket className="h-4 w-4 lg:mr-2" />
                <span className="hidden lg:inline">Tickets</span>
                {tickets.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                    {tickets.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="details" className="space-y-4 mt-0">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                  <User className="h-5 w-5 text-blue-600" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Tax Information */}
                {(customer.vatId || customer.taxId) && (
                  <div className="pb-4 border-b">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">Business Information</h4>
                    <div className="space-y-2">
                      {customer.country === 'Czech Republic' && customer.taxId && (
                        <div className="flex items-center gap-2 text-sm">
                          <Building className="h-4 w-4 text-slate-400 shrink-0" />
                          <span className="text-slate-600">IČO:</span>
                          <span className="font-medium">{customer.taxId}</span>
                        </div>
                      )}
                      {customer.vatId && (
                        <div className="flex items-center gap-2 text-sm">
                          <Building className="h-4 w-4 text-slate-400 shrink-0" />
                          <span className="text-slate-600">VAT ID:</span>
                          <span className="font-medium">{customer.vatId}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Contact Details */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {customer.email && (
                    <div className="flex items-center gap-2 text-sm p-3 bg-slate-50 rounded-lg">
                      <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="truncate">{customer.email}</span>
                    </div>
                  )}
                  {customer.phone && (
                    <div className="flex items-center gap-2 text-sm p-3 bg-slate-50 rounded-lg">
                      <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                      <span>{customer.phone}</span>
                    </div>
                  )}
                </div>
                
                {/* Address */}
                {(customer.address || customer.city || customer.country) && (
                  <div className="flex items-start gap-3 text-sm p-3 bg-slate-50 rounded-lg">
                    <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
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
                  <div className="flex items-center gap-2 text-sm p-3 bg-slate-50 rounded-lg">
                    <MessageCircle className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>Facebook: {customer.facebookName}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            {customer.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                    <FileText className="h-5 w-5 text-blue-600" />
                    Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap p-3 bg-slate-50 rounded-lg">{customer.notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Files & Documents History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                  <File className="h-5 w-5 text-blue-600" />
                  Documents Sent
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
                      <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                        <File className="mx-auto h-12 w-12 mb-3 text-slate-300" />
                        <p className="text-sm font-medium text-slate-700">No documents sent yet</p>
                        <p className="text-xs text-slate-500 mt-1">Documents will appear here when sent with orders</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {ordersWithDocs.map((order: any) => (
                        <div key={order.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <Link href={`/orders/${order.id}`}>
                                <p className="text-sm font-semibold text-blue-600 hover:underline cursor-pointer">
                                  Order #{order.orderId || order.id}
                                </p>
                              </Link>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {formatDate(order.createdAt)}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {order.includedDocuments?.invoicePrint && (
                              <div className="flex items-center gap-2 text-xs bg-green-50 p-2 rounded border border-green-200">
                                <CheckCircle className="h-3.5 w-3.5 text-green-600 shrink-0" />
                                <span className="text-slate-700 font-medium">Invoice (Print Copy)</span>
                              </div>
                            )}
                            {order.includedDocuments?.custom && (
                              <div className="flex items-center gap-2 text-xs bg-green-50 p-2 rounded border border-green-200">
                                <CheckCircle className="h-3.5 w-3.5 text-green-600 shrink-0" />
                                <span className="text-slate-700 font-medium">Custom Documents</span>
                              </div>
                            )}
                            {order.includedDocuments?.uploadedFiles?.map((file: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-2 text-xs bg-blue-50 p-2 rounded border border-blue-200">
                                <FileText className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                <span className="text-slate-700 font-medium truncate flex-1">{file.name}</span>
                                {file.size && (
                                  <span className="text-slate-500 text-xs shrink-0">
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

          <TabsContent value="orders" className="space-y-4 mt-0">
            <Card className="overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                    <Package className="h-5 w-5 text-blue-600" />
                    Order History ({orders.length})
                  </CardTitle>
                  {orders.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleToggleExpandAll}
                      className="gap-2"
                      data-testid="button-toggleExpandAll"
                    >
                      {expandAll ? (
                        <>
                          <Minimize2 className="h-4 w-4" />
                          <span className="hidden sm:inline">Collapse All</span>
                        </>
                      ) : (
                        <>
                          <Maximize2 className="h-4 w-4" />
                          <span className="hidden sm:inline">Expand All</span>
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                    <Package className="mx-auto h-12 w-12 mb-3 text-slate-300" />
                    <p className="text-sm font-medium text-slate-700">No orders found</p>
                    <p className="text-xs text-slate-500 mt-1">Orders will appear here once created</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                    {orders.map((order: any) => (
                      <div key={order.id} className="bg-white border border-slate-200 rounded-lg hover:shadow-md hover:border-blue-300 transition-all overflow-hidden">
                        {/* Header Section - Clickable */}
                        <Link href={`/orders/${order.id}`}>
                          <div className="p-3 cursor-pointer group">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors mb-0.5">
                                  #{order.orderId || order.id}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3 shrink-0" />
                                    <span>{formatDate(order.createdAt)}</span>
                                  </div>
                                  <span className="text-slate-300">•</span>
                                  <div className="flex items-center gap-1">
                                    <Package className="h-3 w-3 shrink-0" />
                                    <span>{order.items?.length || 0} {order.items?.length === 1 ? 'item' : 'items'}</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="text-right shrink-0">
                                <p className="font-bold text-base text-slate-900 group-hover:text-blue-600 transition-colors">
                                  {formatCurrency(order.grandTotal || 0, order.currency || 'EUR')}
                                </p>
                              </div>
                            </div>
                            
                            {/* Status Badges */}
                            <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-100">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Badge 
                                  variant={
                                    order.orderStatus === 'ready_to_ship' ? 'outline' :
                                    order.orderStatus === 'delivered' ? 'default' :
                                    order.orderStatus === 'shipped' ? 'secondary' :
                                    order.orderStatus === 'cancelled' ? 'destructive' :
                                    'secondary'
                                  }
                                  className="text-xs font-medium h-5 px-2"
                                >
                                  {order.orderStatus === 'to_fulfill' ? 'To Fulfill' :
                                   order.orderStatus === 'ready_to_ship' ? 'Ready to Ship' :
                                   order.orderStatus === 'delivered' ? 'Delivered' :
                                   order.orderStatus === 'shipped' ? 'Shipped' :
                                   order.orderStatus === 'cancelled' ? 'Cancelled' :
                                   'Pending'}
                                </Badge>
                                <Badge 
                                  variant={order.paymentStatus === 'paid' ? 'outline' : 'secondary'}
                                  className={order.paymentStatus === 'paid' ? 
                                    'text-xs font-medium h-5 px-2 bg-green-50 border-green-300 text-green-700' : 
                                    'text-xs font-medium h-5 px-2 bg-orange-50 border-orange-300 text-orange-700'}
                                >
                                  {order.paymentStatus === 'paid' ? '✓ Paid' : '⏳ Unpaid'}
                                </Badge>
                              </div>
                              {order.shippingMethod && (
                                <span className="text-xs text-slate-500 truncate">
                                  {order.shippingMethod}
                                </span>
                              )}
                            </div>
                          </div>
                        </Link>
                        
                        {/* Items Section - Expandable */}
                        {order.items && order.items.length > 0 && (
                          <>
                            <div 
                              className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setExpandedOrders(prev => ({
                                  ...prev,
                                  [order.id]: !prev[order.id]
                                }));
                              }}
                            >
                              <span className="text-xs font-medium text-slate-600">
                                Order Items ({order.items.length})
                              </span>
                              {expandedOrders[order.id] ? (
                                <ChevronUp className="h-3.5 w-3.5 text-slate-500" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                              )}
                            </div>
                            
                            {expandedOrders[order.id] && (
                              <div className="px-3 py-2 bg-slate-50/50 border-t border-slate-100">
                                <div className="space-y-1.5">
                                  {order.items.map((item: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between gap-2 text-sm p-1.5 bg-white rounded border border-slate-100">
                                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                        <div className="w-1 h-1 rounded-full bg-blue-400 shrink-0"></div>
                                        <span className="text-slate-700 truncate text-xs">
                                          {item.productName || item.name || 'Product'}
                                          {item.variantName && <span className="text-slate-500 font-normal"> - {item.variantName}</span>}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">×{item.quantity}</span>
                                        <span className="font-semibold text-slate-900 text-xs min-w-[60px] text-right">
                                          {formatCurrency(item.price * item.quantity, order.currency || 'EUR')}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prices" className="space-y-4 mt-0">
            <CustomerPrices customerId={id || ''} />
          </TabsContent>

          <TabsContent value="tickets" className="space-y-4 mt-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Customer Tickets</h3>
              <Link href={`/tickets/add?customerId=${id}`}>
                <Button size="sm" data-testid="button-create-ticket">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Ticket
                </Button>
              </Link>
            </div>

            {tickets.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Ticket className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 mb-4">No tickets yet</p>
                  <Link href={`/tickets/add?customerId=${id}`}>
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Ticket
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {tickets.map((ticket: any) => (
                  <Card key={ticket.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Link href={`/tickets/${ticket.id}`}>
                              <span className="font-semibold text-blue-600 hover:underline cursor-pointer" data-testid={`link-ticket-${ticket.id}`}>
                                {ticket.ticketId}
                              </span>
                            </Link>
                            <Badge variant={
                              ticket.status === 'open' ? 'secondary' :
                              ticket.status === 'in_progress' ? 'default' :
                              'outline'
                            }>
                              {ticket.status.replace(/_/g, ' ')}
                            </Badge>
                            <Badge variant={
                              ticket.priority === 'urgent' ? 'destructive' :
                              ticket.priority === 'high' ? 'default' :
                              'outline'
                            }>
                              {ticket.priority}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium text-slate-700 mb-1">{ticket.title}</p>
                          {ticket.description && (
                            <p className="text-sm text-slate-500 line-clamp-2">{ticket.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                            <span>Category: {ticket.category?.replace(/_/g, ' ')}</span>
                            {ticket.createdAt && (
                              <span>Created: {new Date(ticket.createdAt).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                        <Link href={`/tickets/${ticket.id}`}>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
