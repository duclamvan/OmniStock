import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";
import { useEffect, useRef, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowLeft, 
  Edit, 
  Package, 
  Calendar,
  User,
  MapPin,
  Phone,
  Mail,
  Banknote,
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
  RotateCcw,
  ChevronDown,
  TrendingUp,
  BarChart3
} from "lucide-react";
import MarginPill from "@/components/orders/MarginPill";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currencyUtils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { getCountryFlag } from "@/lib/countries";

export default function OrderDetails() {
  const { id } = useParams();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const previousPath = useRef<string>("/orders");
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [returnReason, setReturnReason] = useState("");
  const [showCustomPriceDialog, setShowCustomPriceDialog] = useState(false);
  const [selectedPriceItem, setSelectedPriceItem] = useState<any>(null);
  const [customPrice, setCustomPrice] = useState("");
  const [priceValidFrom, setPriceValidFrom] = useState("");
  const [priceValidTo, setPriceValidTo] = useState("");
  const [pickedItems, setPickedItems] = useState<Set<string>>(new Set());
  const [showPickingMode, setShowPickingMode] = useState(false);

  // Mutations for updating order status
  const updateOrderStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      return apiRequest('PATCH', `/api/orders/${id}`, { orderStatus: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: "Status Updated",
        description: "Order status has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update order status",
        variant: "destructive",
      });
    },
  });

  const updatePaymentStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      return apiRequest('PATCH', `/api/orders/${id}`, { paymentStatus: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: "Payment Status Updated",
        description: "Payment status has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update payment status",
        variant: "destructive",
      });
    },
  });

  const updatePriorityMutation = useMutation({
    mutationFn: async (newPriority: string) => {
      return apiRequest('PATCH', `/api/orders/${id}`, { priority: newPriority });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: "Priority Updated",
        description: "Order priority has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update priority",
        variant: "destructive",
      });
    },
  });

  // Track where the user came from
  useEffect(() => {
    const referrer = sessionStorage.getItem('orderDetailsReferrer');
    if (referrer) {
      previousPath.current = referrer;
    }
  }, []);

  // Fetch order data with optimized caching
  const { data: order, isLoading } = useQuery<any>({
    queryKey: [`/api/orders/${id}`],
    enabled: !!id && !['add', 'to-fulfill', 'shipped', 'pay-later', 'pre-orders', 'pick-pack'].includes(id || ''),
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
    refetchOnWindowFocus: true, // Refetch when user returns to the tab
    staleTime: 3000, // Consider data stale after 3 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
  });

  // Fetch pick/pack logs for the order
  const { data: pickPackLogs } = useQuery<any[]>({
    queryKey: [`/api/orders/${id}/pick-pack-logs`],
    enabled: !!id && !!order && id !== 'pick-pack',
    refetchInterval: 5000,
    staleTime: 3000,
  });

  // Prevent OrderDetails from rendering on pick-pack page
  if (location === '/orders/pick-pack') {
    return null;
  }

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

  // Remove loading state to prevent UI refresh indicators

  if (!order) {
    return null;
  }

  // Color Psychology: Green=success, Amber=warning/pending, Blue=in-progress, Red=error/urgent
  const statusVariant = 
    order.orderStatus === 'shipped' ? 'default' : // Will use custom green class
    order.orderStatus === 'to_fulfill' ? 'default' : // Will use custom blue class
    order.orderStatus === 'pending' ? 'default' : // Will use custom amber class
    order.orderStatus === 'cancelled' ? 'destructive' :
    'secondary';

  const statusClassName = 
    order.orderStatus === 'shipped' ? 'bg-green-100 text-green-800 hover:bg-green-100/80' :
    order.orderStatus === 'to_fulfill' ? 'bg-blue-100 text-blue-800 hover:bg-blue-100/80' :
    order.orderStatus === 'pending' ? 'bg-amber-100 text-amber-800 hover:bg-amber-100/80' :
    order.orderStatus === 'cancelled' ? '' : // destructive variant
    '';

  const statusText = 
    order.orderStatus === 'to_fulfill' ? 'To Fulfill' :
    order.orderStatus === 'shipped' ? 'Shipped' :
    order.orderStatus === 'pending' ? 'Pending' :
    order.orderStatus === 'cancelled' ? 'Cancelled' :
    order.orderStatus?.charAt(0).toUpperCase() + order.orderStatus?.slice(1) || 'Unknown';

  const paymentStatusVariant = 
    order.paymentStatus === 'paid' ? 'default' : // Will use custom green class
    order.paymentStatus === 'pending' ? 'default' : // Will use custom amber class
    order.paymentStatus === 'pay_later' ? 'default' : // Will use custom blue class
    'secondary';

  const paymentStatusClassName = 
    order.paymentStatus === 'paid' ? 'bg-green-100 text-green-800 hover:bg-green-100/80' :
    order.paymentStatus === 'pending' ? 'bg-amber-100 text-amber-800 hover:bg-amber-100/80' :
    order.paymentStatus === 'pay_later' ? 'bg-blue-100 text-blue-800 hover:bg-blue-100/80' :
    '';

  const paymentStatusText = 
    order.paymentStatus === 'paid' ? 'Paid' :
    order.paymentStatus === 'pending' ? 'Payment Pending' :
    order.paymentStatus === 'pay_later' ? 'Pay Later' :
    order.paymentStatus;

  const priorityVariant = 
    order.priority === 'high' ? 'destructive' :
    order.priority === 'medium' ? 'default' : // Will use custom amber class
    'secondary';

  const priorityClassName = 
    order.priority === 'high' ? '' : // destructive variant
    order.priority === 'medium' ? 'bg-amber-100 text-amber-800 hover:bg-amber-100/80' :
    '';

  const priorityText = 
    order.priority === 'high' ? 'High Priority' :
    order.priority === 'medium' ? 'Medium Priority' :
    'Low Priority';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Clean Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(previousPath.current)}
                className="mt-1"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-xl font-bold text-slate-900">#{order.orderId}</h1>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(order.orderId, "Order ID")}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Customer Name & Badges */}
                {order.customer && (
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Link href={`/customers/${order.customer.id}`}>
                      <p className="font-semibold text-base text-blue-600 hover:text-blue-800 cursor-pointer flex items-center gap-2">
                        {order.customer.country && <span className="text-lg">{getCountryFlag(order.customer.country)}</span>}
                        <User className="h-3.5 w-3.5" />
                        {order.customer.name}
                      </p>
                    </Link>
                    {order.customer.type && (
                      <Badge 
                        variant={
                          order.customer.type === 'vip' ? 'default' : 
                          order.customer.type === 'wholesale' ? 'secondary' : 
                          order.customer.type === 'business' ? 'outline' : 
                          'secondary'
                        }
                        className="text-xs"
                      >
                        {order.customer.type === 'vip' ? 'VIP' : 
                         order.customer.type === 'wholesale' ? 'Wholesale' : 
                         order.customer.type === 'business' ? 'Business' : 
                         'Retail'}
                      </Badge>
                    )}
                    {order.customer.customerRank && (
                      <Badge variant="default" className="text-xs bg-amber-500 hover:bg-amber-600">
                        {order.customer.customerRank}
                      </Badge>
                    )}
                    {order.paymentStatus === 'pay_later' && (
                      <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">
                        Pay Later
                      </Badge>
                    )}
                  </div>
                )}
                
                {/* Status Row */}
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {/* Order Status */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button 
                        className="inline-flex items-center focus:outline-none"
                        disabled={updateOrderStatusMutation.isPending}
                      >
                        <Badge 
                          variant={order.orderStatus === 'cancelled' ? 'destructive' : 'default'} 
                          className={cn(
                            "cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1 px-2 py-0.5 text-xs",
                            statusClassName
                          )}
                        >
                          {statusText}
                          <ChevronDown className="h-3 w-3" />
                        </Badge>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem 
                        onClick={() => updateOrderStatusMutation.mutate('pending')}
                        className={cn(
                          "text-amber-700",
                          order.orderStatus === 'pending' ? 'bg-amber-50' : ''
                        )}
                      >
                        <AlertCircle className="mr-2 h-4 w-4" />
                        Pending
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => updateOrderStatusMutation.mutate('to_fulfill')}
                        className={cn(
                          "text-blue-700",
                          order.orderStatus === 'to_fulfill' ? 'bg-blue-50' : ''
                        )}
                      >
                        <Package className="mr-2 h-4 w-4" />
                        To Fulfill
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => updateOrderStatusMutation.mutate('shipped')}
                        className={cn(
                          "text-green-700",
                          order.orderStatus === 'shipped' ? 'bg-green-50' : ''
                        )}
                      >
                        <Truck className="mr-2 h-4 w-4" />
                        Shipped
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => updateOrderStatusMutation.mutate('cancelled')}
                        className={cn(
                          "text-destructive",
                          order.orderStatus === 'cancelled' ? 'bg-accent' : ''
                        )}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Cancelled
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Payment Status */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button 
                        className="inline-flex items-center focus:outline-none"
                        disabled={updatePaymentStatusMutation.isPending}
                      >
                        <Badge 
                          variant="default"
                          className={cn(
                            "cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1 px-2 py-0.5 text-xs",
                            paymentStatusClassName
                          )}
                        >
                          {paymentStatusText}
                          <ChevronDown className="h-3 w-3" />
                        </Badge>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem 
                        onClick={() => updatePaymentStatusMutation.mutate('pending')}
                        className={cn(
                          "text-amber-700",
                          order.paymentStatus === 'pending' ? 'bg-amber-50' : ''
                        )}
                      >
                        <Clock className="mr-2 h-4 w-4" />
                        Payment Pending
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => updatePaymentStatusMutation.mutate('paid')}
                        className={cn(
                          "text-green-700",
                          order.paymentStatus === 'paid' ? 'bg-green-50' : ''
                        )}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Paid
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => updatePaymentStatusMutation.mutate('pay_later')}
                        className={cn(
                          "text-blue-700",
                          order.paymentStatus === 'pay_later' ? 'bg-blue-50' : ''
                        )}
                      >
                        <AlertCircle className="mr-2 h-4 w-4" />
                        Pay Later
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Priority */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button 
                        className="inline-flex items-center focus:outline-none"
                        disabled={updatePriorityMutation.isPending}
                      >
                        <Badge 
                          variant={order.priority === 'high' ? 'destructive' : order.priority === 'low' ? 'secondary' : 'default'}
                          className={cn(
                            "cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1 px-2 py-0.5 text-xs",
                            priorityClassName
                          )}
                        >
                          {priorityText}
                          <ChevronDown className="h-3 w-3" />
                        </Badge>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem 
                        onClick={() => updatePriorityMutation.mutate('low')}
                        className={order.priority === 'low' ? 'bg-accent' : ''}
                      >
                        <AlertCircle className="mr-2 h-4 w-4" />
                        Low Priority
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => updatePriorityMutation.mutate('medium')}
                        className={cn(
                          "text-amber-700",
                          order.priority === 'medium' ? 'bg-amber-50' : ''
                        )}
                      >
                        <TrendingUp className="mr-2 h-4 w-4" />
                        Medium Priority
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => updatePriorityMutation.mutate('high')}
                        className={cn(
                          "text-destructive",
                          order.priority === 'high' ? 'bg-accent' : ''
                        )}
                      >
                        <BarChart3 className="mr-2 h-4 w-4" />
                        High Priority
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Meta Info */}
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{new Date(order.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Package className="h-3.5 w-3.5" />
                    <span>{order.items?.length || 0} items</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Banknote className="h-3.5 w-3.5" />
                    <span className="font-semibold text-slate-900">{formatCurrency(order.grandTotal || 0, order.currency || 'EUR')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleShare}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => {
                      const newSelectedItems = new Set<string>();
                      const newQuantities: Record<string, number> = {};
                      order.items?.forEach((item: any) => {
                        newSelectedItems.add(item.id);
                        newQuantities[item.id] = item.quantity;
                      });
                      setSelectedItems(newSelectedItems);
                      setReturnQuantities(newQuantities);
                      setShowReturnDialog(true);
                    }}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Create Return
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button size="sm" onClick={() => navigate(`/orders/${id}/edit`)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Order Items and Pricing */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice - Order Items & Pricing */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="h-4 w-4" />
                  Invoice
                </CardTitle>
                {order.orderStatus === 'to_fulfill' && (
                  <Button
                    variant={showPickingMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowPickingMode(!showPickingMode)}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {showPickingMode ? "Exit Picking Mode" : "Start Picking"}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Order Items - Professional Invoice Layout */}
              <div className="space-y-2">
                {order.items?.map((item: any, index: number) => (
                  <div key={item.id || index}>
                    <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                      {showPickingMode && (
                        <Checkbox
                          checked={pickedItems.has(item.id)}
                          onCheckedChange={(checked) => {
                            const newPickedItems = new Set(pickedItems);
                            if (checked) {
                              newPickedItems.add(item.id);
                            } else {
                              newPickedItems.delete(item.id);
                            }
                            setPickedItems(newPickedItems);
                          }}
                          className="mt-1"
                        />
                      )}
                      
                      {/* Product Image */}
                      <div className="flex-shrink-0">
                        {item.image ? (
                          <img 
                            src={item.image} 
                            alt={item.productName}
                            className="w-12 h-12 object-cover rounded border border-slate-200"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-slate-100 rounded border border-slate-200 flex items-center justify-center">
                            <Package className="h-6 w-6 text-slate-300" />
                          </div>
                        )}
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <p className={cn(
                              "font-semibold text-slate-900 text-sm mb-0.5",
                              pickedItems.has(item.id) && "line-through text-slate-400"
                            )}>
                              {item.productName}
                            </p>
                            <p className="text-xs text-slate-500 mb-1.5">SKU: {item.sku}</p>
                            
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Quantity - More Visible */}
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-slate-500">Qty:</span>
                                <Badge variant="secondary" className="text-sm font-bold px-2 py-0.5">
                                  {item.quantity}
                                </Badge>
                              </div>
                              
                              {/* Unit Price */}
                              <div className="text-xs text-slate-600">
                                <span className="text-slate-500">×</span> {formatCurrency(item.unitPrice || item.price || 0, order.currency || 'EUR')}
                              </div>
                            </div>

                            {item.landingCost && (
                              <div className="mt-1.5">
                                <MarginPill 
                                  sellingPrice={item.unitPrice || item.price || 0}
                                  landingCost={item.landingCost}
                                  currency={order.currency || 'EUR'}
                                  quantity={item.quantity}
                                  showProfit={false}
                                  className="text-xs"
                                />
                              </div>
                            )}
                          </div>

                          {/* Price and Actions */}
                          <div className="flex items-start gap-2">
                            <div className="text-right">
                              <p className="font-bold text-base text-slate-900">
                                {formatCurrency((item.unitPrice || item.price || 0) * item.quantity, order.currency || 'EUR')}
                              </p>
                              {item.discount > 0 && (
                                <p className="text-xs text-green-600 mt-0.5">
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
                                    // Set only this item for return
                                    const newSelectedItems = new Set<string>([item.id]);
                                    const newQuantities: Record<string, number> = {
                                      [item.id]: item.quantity
                                    };
                                    setSelectedItems(newSelectedItems);
                                    setReturnQuantities(newQuantities);
                                    setShowReturnDialog(true);
                                  }}
                                >
                                  <RotateCcw className="mr-2 h-4 w-4" />
                                  Return this item
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => {
                                    // Set the selected item for custom pricing
                                    setSelectedPriceItem(item);
                                    setShowCustomPriceDialog(true);
                                  }}
                                >
                                  <Banknote className="mr-2 h-4 w-4" />
                                  Make custom price
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    </div>
                    {index < order.items.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
              
              {/* Picking Progress */}
              {showPickingMode && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-blue-900">Picking Progress</p>
                    <span className="text-sm text-blue-700">
                      {pickedItems.size} of {order.items?.length || 0} items picked
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(pickedItems.size / (order.items?.length || 1)) * 100}%`
                      }}
                    />
                  </div>
                  {pickedItems.size === order.items?.length && order.items?.length > 0 && (
                    <p className="text-sm text-green-600 font-medium mt-2 flex items-center">
                      <CheckCircle2 className="mr-1 h-4 w-4" />
                      All items picked! Ready to ship.
                    </p>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const allItems = new Set<string>();
                        order.items?.forEach((item: any) => {
                          allItems.add(item.id);
                        });
                        setPickedItems(allItems);
                      }}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Mark All Picked
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPickedItems(new Set())}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Clear All
                    </Button>
                    {pickedItems.size > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // Create return for unpicked items (items with issues)
                          const unpickedItems = order.items?.filter((item: any) => 
                            !pickedItems.has(item.id)
                          );
                          
                          if (unpickedItems && unpickedItems.length > 0) {
                            const newSelectedItems = new Set<string>();
                            const newQuantities: Record<string, number> = {};
                            unpickedItems.forEach((item: any) => {
                              newSelectedItems.add(item.id);
                              newQuantities[item.id] = item.quantity;
                            });
                            setSelectedItems(newSelectedItems);
                            setReturnQuantities(newQuantities);
                            setReturnReason("Items not available for fulfillment");
                            setShowReturnDialog(true);
                          } else {
                            toast({
                              title: "All items picked",
                              description: "No items to return - all items have been picked successfully",
                            });
                          }
                        }}
                      >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Return Unpicked Items
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Pricing Breakdown - Integrated */}
              <div className="mt-4 pt-4 border-t">
                <div className="space-y-2">
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
                  
                  <div className="flex justify-between pt-1.5">
                    <span className="font-semibold text-slate-900 text-sm">Grand Total</span>
                    <span className="font-bold text-base text-slate-900">
                      {formatCurrency(order.grandTotal || 0, order.currency || 'EUR')}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Information Card */}
          <Card data-testid="card-shipping-info">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Truck className="h-4 w-4" />
                Shipping Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Shipping Address */}
              <div className="border-2 border-blue-500 dark:border-blue-600 rounded-lg p-4" data-testid="section-shipping-address">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Shipping Address</h3>
                </div>
                
                <div className="space-y-1.5 text-sm">
                  {/* First Name, Last Name */}
                  {(order.customer?.billingFirstName || order.customer?.billingLastName) && (
                    <p className="font-medium text-slate-900 dark:text-slate-100" data-testid="text-shipping-name">
                      {[order.customer.billingFirstName, order.customer.billingLastName].filter(Boolean).join(' ')}
                    </p>
                  )}
                  
                  {/* Company */}
                  {order.customer?.billingCompany && (
                    <p className="font-medium text-slate-900 dark:text-slate-100" data-testid="text-shipping-company">
                      {order.customer.billingCompany}
                    </p>
                  )}
                  
                  {/* Customer Name (fallback if no firstName/lastName) */}
                  {!order.customer?.billingFirstName && !order.customer?.billingLastName && order.customer?.name && (
                    <p className="font-medium text-slate-900 dark:text-slate-100" data-testid="text-shipping-name">
                      {order.customer.name}
                    </p>
                  )}
                  
                  {/* Street Address */}
                  {(order.customer?.billingStreet || order.customer?.address) && (
                    <p className="text-slate-700 dark:text-slate-300" data-testid="text-shipping-street">
                      {order.customer.billingStreet && (
                        <>
                          {order.customer.billingStreet}
                          {order.customer.billingStreetNumber && ` ${order.customer.billingStreetNumber}`}
                        </>
                      )}
                      {!order.customer.billingStreet && order.customer.address && order.customer.address}
                    </p>
                  )}
                  
                  {/* City, State, ZIP */}
                  {(order.customer?.billingCity || order.customer?.city) && (
                    <p className="text-slate-700 dark:text-slate-300" data-testid="text-shipping-city">
                      {[
                        order.customer.billingCity || order.customer.city,
                        order.customer.billingState || order.customer.state,
                        order.customer.billingZipCode || order.customer.zipCode
                      ].filter(Boolean).join(', ')}
                    </p>
                  )}
                  
                  {/* Country with Flag */}
                  {(order.customer?.billingCountry || order.customer?.country) && (
                    <p className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5" data-testid="text-shipping-country">
                      <span className="text-lg">{getCountryFlag(order.customer.billingCountry || order.customer.country)}</span>
                      <span>{order.customer.billingCountry || order.customer.country}</span>
                    </p>
                  )}
                  
                  {/* No address available */}
                  {!order.customer?.billingStreet && !order.customer?.address && !order.customer?.billingCity && !order.customer?.city && (
                    <p className="text-slate-500 italic text-xs">No shipping address available</p>
                  )}
                </div>
              </div>

              {/* Order Notes - Right after shipping address */}
              {order.notes && (
                <>
                  <Separator />
                  <div className="space-y-2" data-testid="section-order-notes">
                    <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Order Notes
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap bg-slate-50 dark:bg-slate-900/50 p-3 rounded border border-slate-200 dark:border-slate-700">
                      {order.notes}
                    </p>
                  </div>
                </>
              )}

              {/* Shipping Method & Tracking */}
              <div className="bg-slate-50 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-700 rounded-lg p-4" data-testid="section-shipping-method">
                <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-3">
                  <Truck className="h-4 w-4" />
                  Shipping Method & Tracking
                </h4>
                <div className="space-y-3 text-sm">
                  {order.shippingMethod && (
                    <div data-testid="text-shipping-method">
                      <span className="text-slate-500 dark:text-slate-400">Method:</span>
                      <div className="mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {order.shippingMethod}
                        </Badge>
                      </div>
                    </div>
                  )}
                  
                  {order.trackingNumber ? (
                    <div data-testid="text-tracking-number">
                      <span className="text-slate-500 dark:text-slate-400">Tracking Number:</span>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-sm bg-white dark:bg-slate-800 px-3 py-1.5 rounded font-mono border border-slate-200 dark:border-slate-700">
                          {order.trackingNumber}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => copyToClipboard(order.trackingNumber, "Tracking number")}
                          data-testid="button-copy-tracking"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div data-testid="text-no-tracking">
                      <span className="text-slate-500 dark:text-slate-400">Tracking Number:</span>
                      <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">No tracking number</p>
                    </div>
                  )}
                  
                  {order.shippedAt && (
                    <div data-testid="text-shipped-at">
                      <span className="text-slate-500 dark:text-slate-400">Shipped At:</span>
                      <p className="font-medium text-slate-900 dark:text-slate-100 mt-1">
                        {new Date(order.shippedAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Billing Address (if different) - Less Prominent */}
              {(order.customer?.billingStreet || order.customer?.billingCity) && (
                <div className="border-l-4 border-slate-200 dark:border-slate-700 pl-4" data-testid="text-billing-address">
                  <h4 className="font-semibold text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2 mb-2">
                    <CreditCard className="h-3.5 w-3.5" />
                    Billing Address
                  </h4>
                  <div className="text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
                    {order.customer.billingStreet && (
                      <p>
                        {order.customer.billingStreet}
                        {order.customer.billingStreetNumber && ` ${order.customer.billingStreetNumber}`}
                      </p>
                    )}
                    {(order.customer.billingCity) && (
                      <p>
                        {[
                          order.customer.billingCity,
                          order.customer.billingState,
                          order.customer.billingZipCode
                        ].filter(Boolean).join(', ')}
                      </p>
                    )}
                    {order.customer.billingCountry && (
                      <p>{order.customer.billingCountry}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Warehouse Location - Compact */}
              {order.warehouseLocation && (
                <div className="border-l-4 border-slate-200 dark:border-slate-700 pl-4" data-testid="section-warehouse-location">
                  <h4 className="font-semibold text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2 mb-2">
                    <Package className="h-3.5 w-3.5" />
                    Fulfillment Location
                  </h4>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{order.warehouseLocation}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pick & Pack Activity Logs */}
          {pickPackLogs && pickPackLogs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="h-4 w-4" />
                  Pick & Pack Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pickPackLogs.map((log: any, index: number) => (
                    <div key={log.id || index} className="flex items-start gap-3">
                      <div className={cn(
                        "w-2 h-2 rounded-full mt-1.5",
                        log.activityType === 'pick_start' ? 'bg-purple-500' : 
                        log.activityType === 'item_picked' ? 'bg-purple-400' :
                        log.activityType === 'pick_complete' ? 'bg-purple-600' :
                        log.activityType === 'pack_start' ? 'bg-indigo-500' :
                        log.activityType === 'item_packed' ? 'bg-indigo-400' :
                        log.activityType === 'pack_complete' ? 'bg-indigo-600' :
                        'bg-gray-400'
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">
                          {log.activityType === 'pick_start' && 'Picking Started'}
                          {log.activityType === 'item_picked' && `Picked: ${log.productName || 'Item'}`}
                          {log.activityType === 'pick_complete' && 'Picking Completed'}
                          {log.activityType === 'pack_start' && 'Packing Started'}
                          {log.activityType === 'item_packed' && `Packed: ${log.productName || 'Item'}`}
                          {log.activityType === 'pack_complete' && 'Packing Completed'}
                        </p>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {new Date(log.timestamp).toLocaleString()}
                          {log.userName && ` • ${log.userName}`}
                          {log.quantity && ` • Qty: ${log.quantity}`}
                          {log.location && ` • Loc: ${log.location}`}
                        </div>
                        {log.notes && (
                          <p className="text-xs text-slate-600 mt-1">{log.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Customer & Order Info */}
        <div className="space-y-6">
          {/* Customer Information */}
          {order.customer && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Link href={`/customers/${order.customer.id}`}>
                    <p className="font-medium text-sm text-blue-600 hover:text-blue-800 cursor-pointer">
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

          {/* Order Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4" />
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
                
                {/* Picking Started */}
                {order.pickStartTime && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-1.5"></div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">Picking Started</p>
                      <p className="text-sm text-slate-500">
                        {new Date(order.pickStartTime).toLocaleString()}
                        {order.pickedBy && ` by ${order.pickedBy}`}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Picking Completed */}
                {order.pickEndTime && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-1.5"></div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">Picking Completed</p>
                      <p className="text-sm text-slate-500">
                        {new Date(order.pickEndTime).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Packing Started */}
                {order.packStartTime && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full mt-1.5"></div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">Packing Started</p>
                      <p className="text-sm text-slate-500">
                        {new Date(order.packStartTime).toLocaleString()}
                        {order.packedBy && ` by ${order.packedBy}`}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Packing Completed */}
                {order.packEndTime && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full mt-1.5"></div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">Packing Completed</p>
                      <p className="text-sm text-slate-500">
                        {new Date(order.packEndTime).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Ready to Ship */}
                {order.orderStatus === 'ready_to_ship' && !order.shippedAt && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-teal-500 rounded-full mt-1.5"></div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">Ready to Ship</p>
                      <p className="text-sm text-slate-500">
                        {order.packEndTime ? new Date(order.packEndTime).toLocaleString() : 'Awaiting shipment'}
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

          {/* Attachments */}
          {order.attachmentUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" />
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

      {/* Create Return Dialog */}
      <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <DialogContent className="max-w-3xl w-[95vw] sm:w-full max-h-[90vh] sm:max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Return Ticket</DialogTitle>
            <DialogDescription>
              Select items to return from order {order?.orderId}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Order Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
              <div>
                <Label className="text-sm text-slate-600">Order ID</Label>
                <p className="font-medium">{order?.orderId}</p>
              </div>
              <div>
                <Label className="text-sm text-slate-600">Customer</Label>
                <p className="font-medium">{order?.customer?.name}</p>
              </div>
              <div>
                <Label className="text-sm text-slate-600">Order Date</Label>
                <p className="font-medium">
                  {order?.createdAt && new Date(order.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <Label className="text-sm text-slate-600">Total Amount</Label>
                <p className="font-medium">
                  {formatCurrency(order?.grandTotal || 0, order?.currency || 'EUR')}
                </p>
              </div>
            </div>

            {/* Select All Checkbox */}
            <div className="flex items-center space-x-2 pb-2">
              <Checkbox
                checked={selectedItems.size === order?.items?.length && order?.items?.length > 0}
                onCheckedChange={(checked) => {
                  if (checked) {
                    const newSelectedItems = new Set<string>();
                    const newQuantities: Record<string, number> = {};
                    order.items?.forEach((item: any) => {
                      newSelectedItems.add(item.id);
                      newQuantities[item.id] = item.quantity;
                    });
                    setSelectedItems(newSelectedItems);
                    setReturnQuantities(newQuantities);
                  } else {
                    setSelectedItems(new Set());
                    setReturnQuantities({});
                  }
                }}
              />
              <Label className="font-medium">Select All Items</Label>
            </div>

            {/* Items to Return */}
            <div className="space-y-3">
              {order?.items?.map((item: any) => (
                <div key={item.id} className="border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedItems.has(item.id)}
                      onCheckedChange={(checked) => {
                        const newSelectedItems = new Set(selectedItems);
                        if (checked) {
                          newSelectedItems.add(item.id);
                          setReturnQuantities({
                            ...returnQuantities,
                            [item.id]: item.quantity
                          });
                        } else {
                          newSelectedItems.delete(item.id);
                          const newQuantities = { ...returnQuantities };
                          delete newQuantities[item.id];
                          setReturnQuantities(newQuantities);
                        }
                        setSelectedItems(newSelectedItems);
                      }}
                    />
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <div>
                          <p className="font-medium">{item.productName}</p>
                          <p className="text-sm text-slate-500">SKU: {item.sku}</p>
                          <p className="text-sm text-slate-500">
                            Price: {formatCurrency(item.price || 0, order?.currency || 'EUR')} × {item.quantity}
                          </p>
                        </div>
                        {selectedItems.has(item.id) && (
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2 sm:mt-0">
                            <Label className="text-sm">Return Qty:</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="1"
                                max={item.quantity}
                                value={returnQuantities[item.id] || 1}
                                onChange={(e) => {
                                  const value = Math.min(
                                    Math.max(1, parseInt(e.target.value) || 1),
                                    item.quantity
                                  );
                                  setReturnQuantities({
                                    ...returnQuantities,
                                    [item.id]: value
                                  });
                                }}
                                className="w-20"
                              />
                              <span className="text-sm text-slate-500">of {item.quantity}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Return Reason */}
            <div className="space-y-2">
              <Label htmlFor="return-reason">Return Reason</Label>
              <Textarea
                id="return-reason"
                placeholder="Please provide a reason for the return..."
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            {/* Return Summary */}
            {selectedItems.size > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="font-medium text-amber-900 mb-2">Return Summary</p>
                <p className="text-sm text-amber-700">
                  Returning {selectedItems.size} item(s) with a total of{' '}
                  {Object.values(returnQuantities).reduce((sum, qty) => sum + qty, 0)} unit(s)
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  Total Return Value:{' '}
                  {formatCurrency(
                    order?.items
                      ?.filter((item: any) => selectedItems.has(item.id))
                      .reduce((sum: number, item: any) => 
                        sum + (item.price * (returnQuantities[item.id] || 0)), 0) || 0,
                    order?.currency || 'EUR'
                  )}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReturnDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (selectedItems.size === 0) {
                  toast({
                    title: "No items selected",
                    description: "Please select at least one item to return",
                    variant: "destructive",
                  });
                  return;
                }
                
                if (!returnReason.trim()) {
                  toast({
                    title: "Reason required",
                    description: "Please provide a reason for the return",
                    variant: "destructive",
                  });
                  return;
                }

                // Create return items array
                const returnItems = order?.items
                  ?.filter((item: any) => selectedItems.has(item.id))
                  .map((item: any) => ({
                    productId: item.productId,
                    productName: item.productName,
                    sku: item.sku,
                    quantity: returnQuantities[item.id] || 1,
                    price: item.price,
                    total: item.price * (returnQuantities[item.id] || 1)
                  }));

                // Navigate to add return page with pre-filled data
                const returnData = {
                  orderId: order?.id,
                  orderNumber: order?.orderId,
                  customerId: order?.customerId,
                  customerName: order?.customer?.name,
                  items: returnItems,
                  reason: returnReason,
                  totalAmount: returnItems?.reduce((sum: number, item: any) => sum + item.total, 0) || 0
                };

                // Store in sessionStorage for the return form
                sessionStorage.setItem('returnFormData', JSON.stringify(returnData));
                navigate('/returns/add');
              }}
              disabled={selectedItems.size === 0}
            >
              Create Return Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Price Dialog */}
      <Dialog open={showCustomPriceDialog} onOpenChange={setShowCustomPriceDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Custom Price</DialogTitle>
            <DialogDescription>
              Set a custom price for {selectedPriceItem?.productName} for {order?.customer?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Product Info */}
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="font-medium">{selectedPriceItem?.productName}</p>
              <p className="text-sm text-slate-600">SKU: {selectedPriceItem?.sku}</p>
              <p className="text-sm text-slate-600">
                Current Price: {formatCurrency(selectedPriceItem?.price || 0, order?.currency || 'EUR')}
              </p>
            </div>

            {/* Custom Price Input */}
            <div className="space-y-2">
              <Label htmlFor="customPrice">Custom Price ({order?.currency || 'EUR'})</Label>
              <Input
                id="customPrice"
                type="number"
                step="0.01"
                min="0"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                placeholder="Enter custom price"
              />
            </div>

            {/* Valid From Date */}
            <div className="space-y-2">
              <Label htmlFor="validFrom">Valid From</Label>
              <Input
                id="validFrom"
                type="date"
                value={priceValidFrom}
                onChange={(e) => setPriceValidFrom(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Valid To Date */}
            <div className="space-y-2">
              <Label htmlFor="validTo">Valid To (Optional)</Label>
              <Input
                id="validTo"
                type="date"
                value={priceValidTo}
                onChange={(e) => setPriceValidTo(e.target.value)}
                min={priceValidFrom || new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Price Comparison */}
            {customPrice && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-900">Price Comparison</p>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Original Price:</span>
                    <span>{formatCurrency(selectedPriceItem?.price || 0, order?.currency || 'EUR')}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium">
                    <span>Custom Price:</span>
                    <span className="text-blue-600">
                      {formatCurrency(parseFloat(customPrice) || 0, order?.currency || 'EUR')}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Savings:</span>
                    <span className={parseFloat(customPrice) < (selectedPriceItem?.price || 0) ? "text-green-600" : "text-red-600"}>
                      {formatCurrency(Math.abs((selectedPriceItem?.price || 0) - parseFloat(customPrice)), order?.currency || 'EUR')}
                      {parseFloat(customPrice) < (selectedPriceItem?.price || 0) ? " less" : " more"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCustomPriceDialog(false);
              setSelectedPriceItem(null);
              setCustomPrice("");
              setPriceValidFrom("");
              setPriceValidTo("");
            }}>
              Cancel
            </Button>
            <Button 
              onClick={async () => {
                if (!customPrice || !priceValidFrom) {
                  toast({
                    title: "Missing Information",
                    description: "Please enter a custom price and valid from date",
                    variant: "destructive",
                  });
                  return;
                }

                try {
                  // Create the custom price
                  await apiRequest('POST', `/api/customers/${order?.customerId}/prices`, {
                    productId: selectedPriceItem?.productId,
                    price: parseFloat(customPrice),
                    currency: order?.currency || 'EUR',
                    validFrom: priceValidFrom,
                    validTo: priceValidTo || null,
                    isActive: true
                  });

                  toast({
                    title: "Success",
                    description: `Custom price created for ${selectedPriceItem?.productName}`,
                  });

                  // Reset and close
                  setShowCustomPriceDialog(false);
                  setSelectedPriceItem(null);
                  setCustomPrice("");
                  setPriceValidFrom("");
                  setPriceValidTo("");

                  // Refresh the page to show updated data
                  queryClient.invalidateQueries({ queryKey: [`/api/orders/${id}`] });
                } catch (error) {
                  console.error('Error creating custom price:', error);
                  toast({
                    title: "Error",
                    description: "Failed to create custom price",
                    variant: "destructive",
                  });
                }
              }}
              disabled={!customPrice || !priceValidFrom}
            >
              Create Custom Price
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}