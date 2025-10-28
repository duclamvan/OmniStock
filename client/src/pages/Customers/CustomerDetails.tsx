import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { useState, useEffect, useMemo } from "react";
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
  Plus,
  Search,
  X,
  Globe,
  Truck,
  Receipt,
  Copy,
  ExternalLink
} from "lucide-react";
import { Facebook } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/currencyUtils";
import { CustomerPrices } from "./CustomerPrices";
import { calculateSearchScore } from "@/lib/fuzzySearch";
import { getCountryFlag, getCountryCodeByName } from "@/lib/countries";

const EXPAND_ALL_KEY = 'customerOrdersExpandAll';

export default function CustomerDetails() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [expandAll, setExpandAll] = useState<boolean>(() => {
    const saved = localStorage.getItem(EXPAND_ALL_KEY);
    return saved === 'true';
  });
  const [orderSearch, setOrderSearch] = useState('');

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

  // Fetch customer shipping addresses
  const { data: shippingAddresses = [], isLoading: shippingAddressesLoading } = useQuery<any[]>({
    queryKey: [`/api/customers/${id}/shipping-addresses`],
    enabled: !!id,
  });

  // Fetch customer billing addresses
  const { data: billingAddresses = [], isLoading: billingAddressesLoading } = useQuery<any[]>({
    queryKey: [`/api/customers/${id}/billing-addresses`],
    enabled: !!id,
  });

  const isLoading = customerLoading || ordersLoading || shippingAddressesLoading || billingAddressesLoading;

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

  // Filter orders based on search term
  const filteredOrders = useMemo(() => {
    if (!orderSearch.trim()) {
      return orders;
    }

    const searchTerm = orderSearch.trim();
    const threshold = 30; // Minimum score to match (out of 100)

    return orders.filter((order: any) => {
      // Search in order properties
      const orderFields = [
        order.orderId || '',
        order.id || '',
        order.orderStatus || '',
        order.paymentStatus || '',
        order.shippingMethod || '',
        formatDate(order.createdAt) || '',
      ];

      // Check if any order field matches
      const orderMatches = orderFields.some(field => 
        calculateSearchScore(String(field), searchTerm) >= threshold
      );

      if (orderMatches) {
        return true;
      }

      // Search in order items
      if (order.items && Array.isArray(order.items)) {
        const itemMatches = order.items.some((item: any) => {
          const itemFields = [
            item.productName || '',
            item.name || '',
            item.variantName || '',
            item.sku || '',
          ];

          return itemFields.some(field => 
            calculateSearchScore(String(field), searchTerm) >= threshold
          );
        });

        if (itemMatches) {
          return true;
        }
      }

      return false;
    });
  }, [orders, orderSearch]);

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
                onClick={() => window.history.back()}
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Location & Business Info Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                    <Globe className="h-5 w-5 text-blue-600" />
                    Location & Business Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Facebook Information */}
                  {(customer.facebookUrl || customer.facebookName || customer.facebookId) && (
                    <div className="space-y-2 pb-3 border-b">
                      {customer.facebookUrl && (
                        <div className="flex items-center gap-2">
                          <Facebook className="h-4 w-4 text-blue-600 shrink-0" />
                          <a 
                            href={customer.facebookUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline truncate flex items-center gap-1"
                            data-testid="link-facebookUrl"
                          >
                            <span className="truncate">{customer.facebookUrl}</span>
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        </div>
                      )}
                      {customer.facebookId && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-slate-600 ml-6">Facebook ID:</span>
                          <span className="font-medium" data-testid="text-facebookId">{customer.facebookId}</span>
                        </div>
                      )}
                      {customer.facebookName && customer.facebookName !== customer.name && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-slate-600 ml-6">Facebook Name:</span>
                          <span className="font-medium" data-testid="text-facebookName">{customer.facebookName}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Customer Name */}
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="text-slate-600">Customer:</span>
                    <span className="font-medium" data-testid="text-customerName">{customer.name}</span>
                  </div>

                  {/* Country */}
                  {customer.country && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="text-slate-600">Country:</span>
                      <span className="font-medium flex items-center gap-1.5" data-testid="text-country">
                        <span className="text-lg">{getCountryFlag(getCountryCodeByName(customer.country))}</span>
                        {customer.country}
                      </span>
                    </div>
                  )}

                  {/* Preferred Currency */}
                  {customer.preferredCurrency && (
                    <div className="flex items-center gap-2 text-sm">
                      <Banknote className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="text-slate-600">Preferred Currency:</span>
                      <Badge variant="outline" className="bg-blue-50 border-blue-300 text-blue-700" data-testid="badge-currency">
                        {customer.preferredCurrency}
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tax & Business Information Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                    <Receipt className="h-5 w-5 text-blue-600" />
                    Tax & Business Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(customer.ico || customer.dic || customer.vatNumber) ? (
                    <>
                      {/* Czech Company Information */}
                      {customer.country === 'Czech Republic' && (customer.ico || customer.dic) && (
                        <div className="space-y-2 pb-3 border-b">
                          <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Czech Company Information</h4>
                          {customer.ico && (
                            <div className="flex items-center gap-2 text-sm">
                              <Building className="h-4 w-4 text-slate-400 shrink-0" />
                              <span className="text-slate-600">IČO:</span>
                              <span className="font-medium font-mono" data-testid="text-ico">{customer.ico}</span>
                            </div>
                          )}
                          {customer.dic && (
                            <div className="flex items-center gap-2 text-sm">
                              <Building className="h-4 w-4 text-slate-400 shrink-0" />
                              <span className="text-slate-600">DIČ:</span>
                              <span className="font-medium font-mono" data-testid="text-dic">{customer.dic}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* EU VAT Information */}
                      {customer.vatNumber && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">EU VAT Information</h4>
                          <div className="flex items-center gap-2 text-sm">
                            <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                            <span className="text-slate-600">VAT Number:</span>
                            <span className="font-medium font-mono" data-testid="text-vatNumber">{customer.vatNumber}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-slate-600 ml-6">VAT Status:</span>
                            {customer.vatValid ? (
                              <Badge variant="outline" className="bg-green-50 border-green-300 text-green-700" data-testid="badge-vatValid">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Valid
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-red-50 border-red-300 text-red-700" data-testid="badge-vatInvalid">
                                <X className="h-3 w-3 mr-1" />
                                Invalid
                              </Badge>
                            )}
                          </div>
                          {customer.vatCheckedAt && (
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <Clock className="h-3 w-3 shrink-0 ml-6" />
                              <span>Last checked: {formatDate(customer.vatCheckedAt)}</span>
                            </div>
                          )}
                          {/* VAT Company Metadata */}
                          {(customer.vatCompanyName || customer.vatCompanyAddress) && (
                            <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                              {customer.vatCompanyName && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Building className="h-4 w-4 text-slate-400 shrink-0" />
                                  <span className="text-slate-600">Company Name:</span>
                                  <span className="font-medium" data-testid="text-vatCompanyName">{customer.vatCompanyName}</span>
                                </div>
                              )}
                              {customer.vatCompanyAddress && (
                                <div className="flex items-start gap-2 text-sm">
                                  <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                                  <span className="text-slate-600 shrink-0">Company Address:</span>
                                  <span className="font-medium" data-testid="text-vatCompanyAddress">{customer.vatCompanyAddress}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-6 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                      <Receipt className="mx-auto h-10 w-10 mb-2 text-slate-300" />
                      <p className="text-sm text-slate-500">No tax information available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Contact Information Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                    <User className="h-5 w-5 text-blue-600" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(customer.email || customer.phone || customer.address || customer.notes || customer.profilePictureUrl) ? (
                    <>
                      {/* Profile Picture */}
                      {customer.profilePictureUrl && (
                        <div className="flex justify-center pb-3 border-b">
                          <img 
                            src={customer.profilePictureUrl} 
                            alt={customer.name}
                            className="w-24 h-24 rounded-full object-cover border-2 border-slate-200"
                            data-testid="img-profile"
                          />
                        </div>
                      )}

                      {/* Email */}
                      {customer.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                          <span className="text-slate-600">Email:</span>
                          <a 
                            href={`mailto:${customer.email}`}
                            className="font-medium text-blue-600 hover:underline truncate"
                            data-testid="link-email"
                          >
                            {customer.email}
                          </a>
                        </div>
                      )}

                      {/* Phone */}
                      {customer.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                          <span className="text-slate-600">Phone:</span>
                          <a 
                            href={`tel:${customer.phone}`}
                            className="font-medium text-blue-600 hover:underline"
                            data-testid="link-phone"
                          >
                            {customer.phone}
                          </a>
                        </div>
                      )}

                      {/* Address */}
                      {(customer.address || customer.city || customer.zipCode) && (
                        <div className="flex items-start gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <span className="text-slate-600">Address:</span>
                            <div className="font-medium mt-1 space-y-0.5" data-testid="text-address">
                              {customer.address && <p>{customer.address}</p>}
                              {(customer.city || customer.zipCode) && (
                                <p>
                                  {customer.zipCode && <span>{customer.zipCode} </span>}
                                  {customer.city}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {customer.notes && (
                        <div className="flex items-start gap-2 text-sm pt-3 border-t">
                          <MessageCircle className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <span className="text-slate-600 block mb-1">Notes:</span>
                            <p className="text-slate-700 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg" data-testid="text-notes">
                              {customer.notes}
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-6 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                      <User className="mx-auto h-10 w-10 mb-2 text-slate-300" />
                      <p className="text-sm text-slate-500">No contact information available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Shipping Addresses Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                  <Truck className="h-5 w-5 text-blue-600" />
                  Shipping Addresses
                  {shippingAddresses.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {shippingAddresses.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {shippingAddresses.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                    <Truck className="mx-auto h-12 w-12 mb-3 text-slate-300" />
                    <p className="text-sm font-medium text-slate-700">No shipping addresses added yet</p>
                    <p className="text-xs text-slate-500 mt-1">Shipping addresses will appear here when added</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {shippingAddresses.map((address: any, index: number) => (
                      <div 
                        key={address.id || index} 
                        className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                        data-testid={`card-shippingAddress-${index}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                            <span className="font-semibold text-sm text-slate-900">
                              {address.company || `${address.firstName} ${address.lastName}`}
                            </span>
                          </div>
                          {address.isPrimary && (
                            <Badge variant="outline" className="bg-blue-50 border-blue-300 text-blue-700" data-testid={`badge-primary-${index}`}>
                              Primary
                            </Badge>
                          )}
                        </div>
                        {address.label && (
                          <p className="text-xs text-slate-500 mb-2 ml-6">{address.label}</p>
                        )}
                        <div className="space-y-1 ml-6 text-sm text-slate-600">
                          {address.company && (
                            <p className="font-medium">{address.company}</p>
                          )}
                          <p>{address.firstName} {address.lastName}</p>
                          <p>{address.street}{address.streetNumber ? ` ${address.streetNumber}` : ''}</p>
                          <p>{address.zipCode} {address.city}</p>
                          <p className="flex items-center gap-1.5">
                            <span className="text-base">{getCountryFlag(getCountryCodeByName(address.country))}</span>
                            {address.country}
                          </p>
                          {address.tel && (
                            <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-200">
                              <Phone className="h-3.5 w-3.5 text-slate-400" />
                              <a href={`tel:${address.tel}`} className="text-blue-600 hover:underline">
                                {address.tel}
                              </a>
                            </div>
                          )}
                          {address.email && (
                            <div className="flex items-center gap-1.5">
                              <Mail className="h-3.5 w-3.5 text-slate-400" />
                              <a href={`mailto:${address.email}`} className="text-blue-600 hover:underline truncate">
                                {address.email}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Billing Addresses Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                  <Building className="h-5 w-5 text-blue-600" />
                  Billing Addresses
                  {billingAddresses.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {billingAddresses.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {billingAddresses.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                    <Building className="mx-auto h-12 w-12 mb-3 text-slate-300" />
                    <p className="text-sm font-medium text-slate-700">No billing addresses added yet</p>
                    <p className="text-xs text-slate-500 mt-1">Billing addresses will appear here when added</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {billingAddresses.map((address: any, index: number) => (
                      <div 
                        key={address.id || index} 
                        className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                        data-testid={`card-billingAddress-${index}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                            <span className="font-semibold text-sm text-slate-900">
                              {address.company || `${address.firstName || ''} ${address.lastName || ''}`.trim() || 'Billing Address'}
                            </span>
                          </div>
                          {address.isPrimary && (
                            <Badge variant="outline" className="bg-blue-50 border-blue-300 text-blue-700" data-testid={`badge-billingPrimary-${index}`}>
                              Primary
                            </Badge>
                          )}
                        </div>
                        {address.label && (
                          <p className="text-xs text-slate-500 mb-2 ml-6">{address.label}</p>
                        )}
                        <div className="space-y-1 ml-6 text-sm text-slate-600">
                          {address.company && (
                            <p className="font-medium">{address.company}</p>
                          )}
                          {(address.firstName || address.lastName) && (
                            <p>{address.firstName} {address.lastName}</p>
                          )}
                          {address.street && (
                            <p>{address.street}{address.streetNumber ? ` ${address.streetNumber}` : ''}</p>
                          )}
                          {(address.zipCode || address.city) && (
                            <p>{address.zipCode} {address.city}</p>
                          )}
                          {address.country && (
                            <p className="flex items-center gap-1.5">
                              <span className="text-base">{getCountryFlag(getCountryCodeByName(address.country))}</span>
                              {address.country}
                            </p>
                          )}
                          {(address.vatId || address.ico) && (
                            <div className="mt-2 pt-2 border-t border-slate-200 space-y-1">
                              {address.ico && (
                                <div className="flex items-center gap-1.5">
                                  <Building className="h-3.5 w-3.5 text-slate-400" />
                                  <span className="text-slate-500 text-xs">IČO: </span>
                                  <span className="font-mono text-xs">{address.ico}</span>
                                </div>
                              )}
                              {address.vatId && (
                                <div className="flex items-center gap-1.5">
                                  <FileText className="h-3.5 w-3.5 text-slate-400" />
                                  <span className="text-slate-500 text-xs">VAT: </span>
                                  <span className="font-mono text-xs">{address.vatId}</span>
                                </div>
                              )}
                            </div>
                          )}
                          {address.tel && (
                            <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-200">
                              <Phone className="h-3.5 w-3.5 text-slate-400" />
                              <a href={`tel:${address.tel}`} className="text-blue-600 hover:underline">
                                {address.tel}
                              </a>
                            </div>
                          )}
                          {address.email && (
                            <div className="flex items-center gap-1.5">
                              <Mail className="h-3.5 w-3.5 text-slate-400" />
                              <a href={`mailto:${address.email}`} className="text-blue-600 hover:underline truncate">
                                {address.email}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="space-y-4 mt-0">
            <Card className="overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between mb-4">
                  <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                    <Package className="h-5 w-5 text-blue-600" />
                    Order History ({filteredOrders.length}{orderSearch && orders.length !== filteredOrders.length ? ` of ${orders.length}` : ''})
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
                {orders.length > 0 && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Search orders, items, products..."
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      className="pl-10 pr-10"
                      data-testid="input-orderSearch"
                    />
                    {orderSearch && (
                      <button
                        onClick={() => setOrderSearch('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        data-testid="button-clearSearch"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                    <Package className="mx-auto h-12 w-12 mb-3 text-slate-300" />
                    <p className="text-sm font-medium text-slate-700">No orders found</p>
                    <p className="text-xs text-slate-500 mt-1">Orders will appear here once created</p>
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                    <Search className="mx-auto h-12 w-12 mb-3 text-slate-300" />
                    <p className="text-sm font-medium text-slate-700">No orders match your search</p>
                    <p className="text-xs text-slate-500 mt-1">Try a different search term</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3"
                      onClick={() => setOrderSearch('')}
                    >
                      Clear Search
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                    {filteredOrders.map((order: any) => (
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
                            {ticket.status !== 'resolved' && (
                              <Badge variant={
                                ticket.priority === 'urgent' ? 'destructive' :
                                ticket.priority === 'high' ? 'default' :
                                'outline'
                              }>
                                {ticket.priority}
                              </Badge>
                            )}
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
