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
  ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currencyUtils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

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

  // Prevent OrderDetails from rendering on pick-pack page
  if (location === '/orders/pick-pack') {
    return null;
  }

  // Mutations for updating order status
  const updateOrderStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      return apiRequest(`/api/orders/${id}`, 'PATCH', { orderStatus: newStatus });
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
      return apiRequest(`/api/orders/${id}`, 'PATCH', { paymentStatus: newStatus });
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
    enabled: !!id && !['add', 'to-fulfill', 'shipped', 'pay-later', 'pre-orders'].includes(id || ''),
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
    refetchOnWindowFocus: true, // Refetch when user returns to the tab
    staleTime: 3000, // Consider data stale after 3 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
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

  // Remove loading state to prevent UI refresh indicators

  if (!order) {
    return null;
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
            onClick={() => navigate(previousPath.current)}
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

            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Order Status Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button 
                    className="inline-flex items-center focus:outline-none"
                    disabled={updateOrderStatusMutation.isPending}
                  >
                    <Badge 
                      variant={statusVariant} 
                      className="cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1"
                    >
                      {statusText}
                      <ChevronDown className="h-3 w-3" />
                    </Badge>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem 
                    onClick={() => updateOrderStatusMutation.mutate('pending')}
                    className={order.orderStatus === 'pending' ? 'bg-accent' : ''}
                  >
                    <AlertCircle className="mr-2 h-4 w-4" />
                    Pending
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => updateOrderStatusMutation.mutate('to_fulfill')}
                    className={order.orderStatus === 'to_fulfill' ? 'bg-accent' : ''}
                  >
                    <Package className="mr-2 h-4 w-4" />
                    To Fulfill
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => updateOrderStatusMutation.mutate('shipped')}
                    className={order.orderStatus === 'shipped' ? 'bg-accent' : ''}
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

              {/* Payment Status Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button 
                    className="inline-flex items-center focus:outline-none"
                    disabled={updatePaymentStatusMutation.isPending}
                  >
                    <Badge 
                      variant={paymentStatusVariant} 
                      className="cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1"
                    >
                      {paymentStatusText}
                      <ChevronDown className="h-3 w-3" />
                    </Badge>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem 
                    onClick={() => updatePaymentStatusMutation.mutate('pending')}
                    className={order.paymentStatus === 'pending' ? 'bg-accent' : ''}
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    Payment Pending
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => updatePaymentStatusMutation.mutate('paid')}
                    className={order.paymentStatus === 'paid' ? 'bg-accent' : ''}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Paid
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => updatePaymentStatusMutation.mutate('pay_later')}
                    className={order.paymentStatus === 'pay_later' ? 'bg-accent' : ''}
                  >
                    <AlertCircle className="mr-2 h-4 w-4" />
                    Pay Later
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

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
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} className="hidden sm:flex">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare} className="hidden sm:flex">
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="hidden sm:flex">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button 
            variant="outline"
            size="sm" 
            onClick={() => {
              // Pre-select all items and set quantities
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
            <span className="hidden sm:inline">Create Return</span>
            <span className="sm:hidden">Return</span>
          </Button>
          <Button size="sm" onClick={() => navigate(`/orders/${id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Edit Order</span>
            <span className="sm:hidden">Edit</span>
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
              <Banknote className="h-8 w-8 text-blue-500 opacity-20" />
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
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Order Items
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
              <div className="space-y-4">
                {order.items?.map((item: any, index: number) => (
                  <div key={item.id || index}>
                    <div className="flex items-start gap-3">
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
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className={cn(
                              "font-medium text-slate-900",
                              pickedItems.has(item.id) && "line-through text-slate-400"
                            )}>
                              {item.productName}
                            </p>
                            <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                              <span>SKU: {item.sku}</span>
                              <span>•</span>
                              <span>Qty: {item.quantity}</span>
                              <span>•</span>
                              <span>{formatCurrency(item.unitPrice || item.price || 0, order.currency || 'EUR')} each</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <p className="font-semibold text-slate-900">
                                {formatCurrency((item.unitPrice || item.price || 0) * item.quantity, order.currency || 'EUR')}
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
                    {index < order.items.length - 1 && <Separator className="mt-4" />}
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
            </CardContent>
          </Card>

          {/* Pricing Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5" />
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
                  await apiRequest(`/api/customers/${order?.customerId}/prices`, 'POST', {
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