import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  ChevronUp,
  TrendingUp,
  BarChart3,
  MessageCircle,
  Ticket,
  Plus,
  ChevronRight,
  Shield,
  Award,
  FileImage,
  Book,
  File,
  Upload
} from "lucide-react";
import MarginPill from "@/components/orders/MarginPill";
import { CustomerBadges } from '@/components/CustomerBadges';
import { OrderTrackingPanel } from "@/components/orders/OrderTrackingPanel";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/currencyUtils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from "recharts";
import { getCountryFlag } from "@/lib/countries";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Crown, Trophy, Sparkles, Heart, RefreshCw, AlertTriangle } from "lucide-react";
import html2canvas from "html2canvas";

export default function OrderDetails() {
  const { id } = useParams();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const invoiceCardRef = useRef<HTMLDivElement>(null);
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
  const [showBadges, setShowBadges] = useState(() => {
    const saved = localStorage.getItem('orderDetailsBadgesVisible');
    return saved === null ? true : saved === 'true';
  });

  // Collapsible sections state
  const [isProductDocsOpen, setIsProductDocsOpen] = useState(true);
  const [isUploadedFilesOpen, setIsUploadedFilesOpen] = useState(true);
  const [isShippingLabelsOpen, setIsShippingLabelsOpen] = useState(true);

  // Toggle badges visibility
  const toggleBadges = () => {
    const newValue = !showBadges;
    setShowBadges(newValue);
    localStorage.setItem('orderDetailsBadgesVisible', String(newValue));
  };

  // Mutations for updating order status
  const updateOrderStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      return apiRequest('PATCH', `/api/orders/${id}`, { orderStatus: newStatus });
    },
    onSuccess: () => {
      // Invalidate all order-related caches for real-time updates
      queryClient.invalidateQueries({ queryKey: ['/api/orders', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders/pick-pack'] }); // Real-time Pick & Pack sync
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
      // Invalidate all order-related caches for real-time updates
      queryClient.invalidateQueries({ queryKey: ['/api/orders', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders/pick-pack'] }); // Real-time Pick & Pack sync
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
      // Invalidate all order-related caches for real-time updates
      queryClient.invalidateQueries({ queryKey: ['/api/orders', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders/pick-pack'] }); // Real-time Pick & Pack sync
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

  // Fetch order data with optimized caching
  const { data: order, isLoading } = useQuery<any>({
    queryKey: ['/api/orders', id, { includeBadges: true }],
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

  // Fetch order tickets
  const { data: tickets = [] } = useQuery<any[]>({
    queryKey: [`/api/tickets?orderId=${id}`],
    enabled: !!id && !!order,
  });

  // Fetch product files for selected document IDs
  const { data: productFiles = [] } = useQuery<any[]>({
    queryKey: ['/api/product-files'],
    enabled: !!order && !!order.selectedDocumentIds && order.selectedDocumentIds.length > 0,
    select: (allFiles) => {
      if (!order?.selectedDocumentIds) return [];
      // Filter to only show files that were selected for this order
      return allFiles.filter((file: any) => 
        order.selectedDocumentIds.includes(file.id)
      );
    },
  });

  // Fetch uploaded order files from database
  const { data: orderFiles = [] } = useQuery<any[]>({
    queryKey: [`/api/orders/${id}/files`],
    enabled: !!id && !!order,
  });

  // Fetch shipment labels
  const { data: shipmentLabels = [] } = useQuery<any[]>({
    queryKey: [`/api/orders/${id}/shipment-labels`],
    enabled: !!id && !!order,
  });

  // Fetch order cartons
  const { data: orderCartons = [] } = useQuery<any[]>({
    queryKey: [`/api/orders/${id}/cartons`],
    enabled: !!id && !!order,
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

  const handleDownloadInvoice = async () => {
    if (!order) return;
    
    try {
      // Create a clean HTML invoice
      const invoiceHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              background: white;
              padding: 0;
              width: 430px;
            }
            .invoice-card {
              background: white;
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              overflow: hidden;
            }
            .invoice-header {
              padding: 10px 24px 12px 24px;
              border-bottom: 2px solid #e2e8f0;
              background: #f8fafc;
            }
            .invoice-title {
              font-size: 18px;
              font-weight: 700;
              color: #0f172a;
              display: flex;
              align-items: center;
              gap: 8px;
              line-height: 1;
            }
            .invoice-title span {
              margin-bottom: 5px;
            }
            .invoice-icon {
              width: 20px;
              height: 20px;
              color: #64748b;
              flex-shrink: 0;
            }
            .invoice-body {
              padding: 0;
            }
            .item-row {
              padding: 24px 32px;
              border-bottom: 1px solid #e2e8f0;
              display: flex;
              gap: 16px;
              align-items: center;
            }
            .item-image {
              width: 56px;
              height: 56px;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              background: #f8fafc;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
            }
            .item-details {
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: center;
            }
            .item-name {
              font-size: 16px;
              font-weight: 600;
              color: #0f172a;
              margin: 0 0 4px 0;
              line-height: 1.2;
            }
            .item-sku {
              font-size: 13px;
              color: #64748b;
              margin: 0 0 8px 0;
              line-height: 1.2;
            }
            .item-qty {
              font-size: 14px;
              color: #475569;
              margin: 0;
              line-height: 1.2;
            }
            .item-qty-value {
              font-weight: 700;
              color: #0f172a;
            }
            .item-price {
              text-align: right;
              font-size: 18px;
              font-weight: 700;
              color: #0f172a;
              flex-shrink: 0;
              display: flex;
              align-items: center;
              justify-content: flex-end;
              line-height: 1;
            }
            .pricing-section {
              padding: 32px;
              border-top: 2px solid #e2e8f0;
            }
            .price-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 16px;
            }
            .price-label {
              font-size: 15px;
              font-weight: 500;
              color: #475569;
              line-height: 1.2;
            }
            .price-value {
              font-size: 15px;
              font-weight: 600;
              color: #0f172a;
              line-height: 1.2;
            }
            .price-separator {
              height: 2px;
              background: #cbd5e1;
              margin: 20px 0;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding-top: 8px;
            }
            .total-label {
              font-size: 20px;
              font-weight: 700;
              color: #0f172a;
              line-height: 1.2;
            }
            .total-value {
              font-size: 24px;
              font-weight: 700;
              color: #0f172a;
              line-height: 1.2;
            }
          </style>
        </head>
        <body>
          <div class="invoice-card">
            <div class="invoice-header">
              <div class="invoice-title">
                <svg class="invoice-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                </svg>
                ${order.orderId || order.id}
              </div>
            </div>
            <div class="invoice-body">
              ${order.items?.map((item: any) => `
                <div class="item-row">
                  <div class="item-image">
                    ${item.image ? `<img src="${item.image}" style="width: 100%; height: 100%; object-fit: contain;" />` : `
                      <svg style="width: 32px; height: 32px; color: #cbd5e1;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                      </svg>
                    `}
                  </div>
                  <div class="item-details">
                    <div class="item-name">${item.productName}</div>
                    <div class="item-sku">SKU: ${item.sku}</div>
                    <div class="item-qty">
                      Qty: <span class="item-qty-value">${item.quantity}</span>
                      <span style="color: #64748b; margin: 0 8px;">×</span>
                      ${formatCurrency(item.unitPrice || item.price || 0, order.currency || 'EUR')}
                    </div>
                  </div>
                  <div class="item-price">
                    ${formatCurrency((item.unitPrice || item.price || 0) * item.quantity, order.currency || 'EUR')}
                  </div>
                </div>
              `).join('')}
            </div>
            <div class="pricing-section">
              <div class="price-row">
                <span class="price-label">Subtotal</span>
                <span class="price-value">${formatCurrency(order.subtotal || 0, order.currency || 'EUR')}</span>
              </div>
              ${order.discountValue > 0 ? `
                <div class="price-row">
                  <span class="price-label" style="color: #15803d;">
                    Discount ${order.discountType === 'rate' ? `(${order.discountValue}%)` : ''}
                  </span>
                  <span class="price-value" style="color: #15803d;">
                    -${formatCurrency(
                      order.discountType === 'rate' 
                        ? (order.subtotal * order.discountValue / 100) 
                        : order.discountValue || 0, 
                      order.currency || 'EUR'
                    )}
                  </span>
                </div>
              ` : ''}
              ${order.taxAmount > 0 ? `
                <div class="price-row">
                  <span class="price-label">Tax (${order.taxRate}%)</span>
                  <span class="price-value">${formatCurrency(order.taxAmount || 0, order.currency || 'EUR')}</span>
                </div>
              ` : ''}
              ${order.shippingCost > 0 ? `
                <div class="price-row">
                  <span class="price-label">Shipping (${order.shippingMethod})</span>
                  <span class="price-value">${formatCurrency(order.shippingCost || 0, order.currency || 'EUR')}</span>
                </div>
              ` : ''}
              ${order.adjustment != null && Number(order.adjustment) !== 0 ? `
                <div class="price-row">
                  <span class="price-label" style="color: ${order.adjustment > 0 ? '#1e40af' : '#c2410c'};">
                    Adjustment
                  </span>
                  <span class="price-value" style="color: ${order.adjustment > 0 ? '#1e40af' : '#c2410c'};">
                    ${order.adjustment > 0 ? '+' : ''}${formatCurrency(order.adjustment || 0, order.currency || 'EUR')}
                  </span>
                </div>
              ` : ''}
              <div class="price-separator"></div>
              <div class="total-row">
                <span class="total-label">Grand Total</span>
                <span class="total-value">${formatCurrency(order.grandTotal || 0, order.currency || 'EUR')}</span>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      // Create an invisible iframe to render the HTML (iPhone 17 Pro Max dimensions)
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px';
      iframe.style.width = '430px';
      iframe.style.height = '3000px';
      document.body.appendChild(iframe);

      // Write the HTML to the iframe
      iframe.contentDocument?.open();
      iframe.contentDocument?.write(invoiceHTML);
      iframe.contentDocument?.close();

      // Wait for images to load
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get the actual invoice card element
      const invoiceCard = iframe.contentDocument!.querySelector('.invoice-card') as HTMLElement;
      if (!invoiceCard) {
        document.body.removeChild(iframe);
        throw new Error('Invoice card not found');
      }

      // Capture only the invoice card (no extra white space)
      const canvas = await html2canvas(invoiceCard, {
        backgroundColor: '#ffffff',
        scale: 3,
        logging: false,
        useCORS: true,
        allowTaint: true,
      });

      // Remove the iframe
      document.body.removeChild(iframe);

      // Download the image
      const link = document.createElement('a');
      link.download = `order-${order?.orderId || id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      toast({
        title: "Order Captured",
        description: "Order screenshot saved successfully",
      });
    } catch (error) {
      console.error('Invoice generation error:', error);
      toast({
        title: "Download Failed",
        description: "Could not generate invoice",
        variant: "destructive",
      });
    }
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
    order.orderStatus === 'delivered' ? 'default' :
    order.orderStatus === 'shipped' ? 'default' :
    order.orderStatus === 'ready_to_ship' ? 'default' :
    order.orderStatus === 'to_fulfill' ? 'default' :
    order.orderStatus === 'awaiting_stock' ? 'default' :
    order.orderStatus === 'pending' ? 'default' :
    order.orderStatus === 'cancelled' ? 'destructive' :
    'secondary';

  const statusClassName = 
    order.orderStatus === 'delivered' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100/80' :
    order.orderStatus === 'shipped' ? 'bg-purple-100 text-purple-800 hover:bg-purple-100/80' :
    order.orderStatus === 'ready_to_ship' ? 'bg-cyan-100 text-cyan-800 hover:bg-cyan-100/80' :
    order.orderStatus === 'to_fulfill' ? 'bg-blue-100 text-blue-800 hover:bg-blue-100/80' :
    order.orderStatus === 'awaiting_stock' ? 'bg-orange-100 text-orange-800 hover:bg-orange-100/80' :
    order.orderStatus === 'pending' ? 'bg-amber-100 text-amber-800 hover:bg-amber-100/80' :
    order.orderStatus === 'cancelled' ? '' : // destructive variant
    '';

  const statusText = 
    order.orderStatus === 'delivered' ? 'Delivered' :
    order.orderStatus === 'shipped' ? 'Shipped' :
    order.orderStatus === 'ready_to_ship' ? 'Ready to Ship' :
    order.orderStatus === 'to_fulfill' ? 'To Fulfill' :
    order.orderStatus === 'awaiting_stock' ? 'Awaiting Stock' :
    order.orderStatus === 'pending' ? 'Pending' :
    order.orderStatus === 'cancelled' ? 'Cancelled' :
    order.orderStatus?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Unknown';

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
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto px-3 sm:px-0">
      {/* Clean Header */}
      <Card>
        <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
          {/* Breadcrumb Navigation */}
          <div className="mb-3 sm:mb-4">
            <nav className="flex items-center text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              <Link href="/orders">
                <span className="hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer font-medium">Orders</span>
              </Link>
              <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 mx-1 sm:mx-2 text-slate-400 dark:text-slate-600" />
              <span className="text-slate-900 dark:text-slate-100 font-semibold">Order Details</span>
            </nav>
          </div>

          <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
            <div className="flex-1 w-full sm:w-auto">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">#{order.orderId}</h1>
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

                {/* Customer Badges */}
                {order.customer?.badges && (
                  <div className="mb-2">
                    <CustomerBadges 
                      badges={order.customer.badges} 
                      currency={order.currency || 'EUR'} 
                    />
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
                        onClick={() => updateOrderStatusMutation.mutate('awaiting_stock')}
                        className={cn(
                          "text-orange-700",
                          order.orderStatus === 'awaiting_stock' ? 'bg-orange-50' : ''
                        )}
                      >
                        <AlertCircle className="mr-2 h-4 w-4" />
                        Awaiting Stock
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
                        onClick={() => updateOrderStatusMutation.mutate('ready_to_ship')}
                        className={cn(
                          "text-cyan-700",
                          order.orderStatus === 'ready_to_ship' ? 'bg-cyan-50' : ''
                        )}
                      >
                        <Package className="mr-2 h-4 w-4" />
                        Ready to Ship
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => updateOrderStatusMutation.mutate('shipped')}
                        className={cn(
                          "text-purple-700",
                          order.orderStatus === 'shipped' ? 'bg-purple-50' : ''
                        )}
                      >
                        <Truck className="mr-2 h-4 w-4" />
                        Shipped
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => updateOrderStatusMutation.mutate('delivered')}
                        className={cn(
                          "text-emerald-700",
                          order.orderStatus === 'delivered' ? 'bg-emerald-50' : ''
                        )}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Delivered
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
                    <span>{formatDate(order.createdAt)}</span>
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

            {/* Action Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="min-h-[44px] sm:min-h-[36px]">
                    <MoreVertical className="h-4 w-4" />
                    <span className="ml-2 sm:hidden">More</span>
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
              <Button size="sm" onClick={() => navigate(`/orders/${id}/edit`)} className="min-h-[44px] sm:min-h-[36px] flex-1 sm:flex-initial">
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left Column - Order Items and Pricing */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Action Buttons - Above Invoice */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadInvoice}
              data-testid="button-capture-order"
              className="min-h-[44px] sm:min-h-[36px] w-full sm:w-auto"
            >
              <Download className="mr-2 h-4 w-4" />
              Capture Order
            </Button>
            {order.orderStatus === 'to_fulfill' && (
              <Button
                variant={showPickingMode ? "default" : "outline"}
                size="sm"
                onClick={() => setShowPickingMode(!showPickingMode)}
                className="min-h-[44px] sm:min-h-[36px] w-full sm:w-auto"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {showPickingMode ? "Exit Picking Mode" : "Start Picking"}
              </Button>
            )}
          </div>

          {/* Invoice - Order Items & Pricing */}
          <Card ref={invoiceCardRef} className="overflow-hidden">
            <CardHeader className="border-b border-slate-200 dark:border-gray-700 px-3 sm:px-6 py-3 sm:py-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
                <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                Invoice
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              {/* Order Items - Professional Invoice Layout */}
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {order.items?.map((item: any, index: number) => (
                  <div key={item.id || index} className="px-3 sm:px-6 py-3 sm:py-4">
                    <div className="flex items-start gap-3">
                      {showPickingMode && (
                        <div data-hide-in-screenshot>
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
                        </div>
                      )}
                      
                      {/* Product Image */}
                      <div className="flex-shrink-0">
                        {item.image ? (
                          <img 
                            src={item.image} 
                            alt={item.productName}
                            className="w-12 h-12 object-contain rounded border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-slate-900"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-gray-700 flex items-center justify-center">
                            <Package className="h-6 w-6 text-slate-300 dark:text-slate-600" />
                          </div>
                        )}
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            {item.productId ? (
                              <Link href={`/products/${item.productId}`}>
                                <p className={cn(
                                  "font-semibold text-sm mb-0.5 cursor-pointer hover:underline",
                                  pickedItems.has(item.id) ? "line-through text-slate-400 hover:text-slate-500" : "text-blue-600 hover:text-blue-800"
                                )}>
                                  {item.productName}
                                </p>
                              </Link>
                            ) : item.serviceId ? (
                              <Link href={`/services/${item.serviceId}`}>
                                <p className={cn(
                                  "font-semibold text-sm mb-0.5 cursor-pointer hover:underline",
                                  pickedItems.has(item.id) ? "line-through text-slate-400 hover:text-slate-500" : "text-purple-600 hover:text-purple-800"
                                )}>
                                  {item.productName}
                                </p>
                              </Link>
                            ) : item.bundleId ? (
                              <Link href={`/bundles/${item.bundleId}`}>
                                <p className={cn(
                                  "font-semibold text-sm mb-0.5 cursor-pointer hover:underline",
                                  pickedItems.has(item.id) ? "line-through text-slate-400 hover:text-slate-500" : "text-green-600 hover:text-green-800"
                                )}>
                                  {item.productName}
                                </p>
                              </Link>
                            ) : (
                              <p className={cn(
                                "font-semibold text-slate-900 text-sm mb-0.5",
                                pickedItems.has(item.id) && "line-through text-slate-400"
                              )}>
                                {item.productName}
                              </p>
                            )}
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5">SKU: {item.sku}</p>
                            {item.serviceId && item.notes && (
                              <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded px-2 py-1 mb-1.5">
                                <p className="text-xs text-purple-900 dark:text-purple-300 font-medium">Note: {item.notes}</p>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Quantity - More Visible */}
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-slate-500 dark:text-slate-400">Qty:</span>
                                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                  {item.quantity}
                                </span>
                              </div>
                              
                              {/* Unit Price */}
                              <div className="text-xs text-slate-600 dark:text-slate-400">
                                <span className="text-slate-500 dark:text-slate-400">×</span> {formatCurrency(item.unitPrice || item.price || 0, order.currency || 'EUR')}
                              </div>
                            </div>
                          </div>

                          {/* Price and Actions */}
                          <div className="flex items-start gap-2">
                            <div className="text-right">
                              {item.discount > 0 ? (
                                <>
                                  {/* Original price (strikethrough) */}
                                  <p className="text-xs text-slate-400 dark:text-slate-500 line-through">
                                    {formatCurrency((item.unitPrice || item.price || 0) * item.quantity, order.currency || 'EUR')}
                                  </p>
                                  {/* Discount amount */}
                                  <p className="text-xs text-green-600 dark:text-green-500 -mt-0.5">
                                    -{formatCurrency(item.discount || 0, order.currency || 'EUR')} off
                                  </p>
                                  {/* Final price after discount */}
                                  <p className="font-bold text-base text-slate-900 dark:text-slate-100 mt-0.5">
                                    {formatCurrency(((item.unitPrice || item.price || 0) * item.quantity) - (item.discount || 0), order.currency || 'EUR')}
                                  </p>
                                </>
                              ) : (
                                <p className="font-bold text-base text-slate-900 dark:text-slate-100">
                                  {formatCurrency((item.unitPrice || item.price || 0) * item.quantity, order.currency || 'EUR')}
                                </p>
                              )}
                            </div>
                            <div data-hide-in-screenshot>
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
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Picking Progress */}
              {showPickingMode && (
                <div className="mx-6 mt-6 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-300">Picking Progress</p>
                    <span className="text-sm text-blue-700 dark:text-blue-400">
                      {pickedItems.size} of {order.items?.length || 0} items picked
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-2">
                    <div
                      className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(pickedItems.size / (order.items?.length || 1)) * 100}%`
                      }}
                    />
                  </div>
                  {pickedItems.size === order.items?.length && order.items?.length > 0 && (
                    <p className="text-sm text-green-600 dark:text-green-500 font-medium mt-2 flex items-center">
                      <CheckCircle2 className="mr-1 h-4 w-4" />
                      All items picked! Ready to ship.
                    </p>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 mt-4">
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
                      className="min-h-[44px] sm:min-h-[36px] w-full sm:w-auto"
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Mark All Picked
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPickedItems(new Set())}
                      className="min-h-[44px] sm:min-h-[36px] w-full sm:w-auto"
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
                        className="min-h-[44px] sm:min-h-[36px] w-full sm:w-auto"
                      >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Return Unpicked Items
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Pricing Breakdown - Integrated */}
              <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 px-3 sm:px-6 border-t-2 border-slate-200 dark:border-gray-700">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">Subtotal</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(order.subtotal || 0, order.currency || 'EUR')}</span>
                  </div>
                  
                  {order.discountValue > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-green-700 dark:text-green-500 font-medium">
                        Discount {order.discountType === 'rate' && `(${order.discountValue}%)`}
                      </span>
                      <span className="font-semibold text-green-700 dark:text-green-500">
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
                    <div className="flex justify-between items-center">
                      <span className="text-slate-700 dark:text-slate-300 font-medium">Tax ({order.taxRate}%)</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(order.taxAmount || 0, order.currency || 'EUR')}</span>
                    </div>
                  )}
                  
                  {order.shippingCost > 0 && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-700 dark:text-slate-300 font-medium">
                          Shipping ({(() => {
                            // Show country-specific COD labels
                            if (order.paymentMethod === 'COD') {
                              const country = order.shippingAddress?.country?.toLowerCase();
                              if (country === 'czech republic' || country === 'czechia' || country === 'česká republika') {
                                return 'PPL - Dobírka';
                              } else if (country === 'germany' || country === 'deutschland') {
                                return 'DHL - Nachnahme';
                              }
                            }
                            return order.shippingMethod;
                          })()})
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(order.shippingCost || 0, order.currency || 'EUR')}</span>
                      </div>
                    </>
                  )}
                  
                  {order.adjustment != null && Number(order.adjustment) !== 0 && (
                    <div className="flex justify-between items-center">
                      <span className={cn(
                        "font-medium",
                        order.adjustment > 0 ? "text-blue-700 dark:text-blue-500" : "text-orange-700 dark:text-orange-500"
                      )}>
                        Adjustment
                      </span>
                      <span className={cn(
                        "font-semibold",
                        order.adjustment > 0 ? "text-blue-700 dark:text-blue-500" : "text-orange-700 dark:text-orange-500"
                      )}>
                        {order.adjustment > 0 ? '+' : ''}{formatCurrency(order.adjustment || 0, order.currency || 'EUR')}
                      </span>
                    </div>
                  )}
                  
                  <div className="border-t-2 border-slate-300 dark:border-gray-700 my-3"></div>
                  
                  <div className="flex justify-between items-center pt-2 pb-1">
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-lg">Grand Total</span>
                    <span className="font-bold text-xl text-slate-900 dark:text-slate-100">
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
              <CardTitle className="flex items-center gap-2 text-base text-gray-900 dark:text-gray-100">
                <Truck className="h-4 w-4" />
                Shipping Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Shipping Address - Only show if shippingAddressId exists */}
              {order.shippingAddressId && order.shippingAddress ? (
                <div className="border-2 border-blue-500 dark:border-blue-600 rounded-lg p-4" data-testid="section-shipping-address">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Shipping Address</h3>
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    {/* Name */}
                    {(order.shippingAddress.firstName || order.shippingAddress.lastName) && (
                      <div className="font-semibold text-slate-900 dark:text-slate-100" data-testid="text-shipping-name">
                        {[order.shippingAddress.firstName, order.shippingAddress.lastName].filter(Boolean).join(' ')}
                      </div>
                    )}
                    
                    {/* Company */}
                    {order.shippingAddress.company && (
                      <div className="font-medium text-slate-800 dark:text-slate-200" data-testid="text-shipping-company">
                        {order.shippingAddress.company}
                      </div>
                    )}
                    
                    {/* Street Address */}
                    {order.shippingAddress.street && (
                      <div className="text-slate-700 dark:text-slate-300" data-testid="text-shipping-street">
                        {order.shippingAddress.street}
                        {order.shippingAddress.streetNumber && ` ${order.shippingAddress.streetNumber}`}
                      </div>
                    )}
                    
                    {/* Postal Code and City */}
                    {order.shippingAddress.city && (
                      <div className="text-slate-700 dark:text-slate-300" data-testid="text-shipping-city">
                        {[order.shippingAddress.zipCode, order.shippingAddress.city].filter(Boolean).join(' ')}
                      </div>
                    )}
                    
                    {/* Country */}
                    {order.shippingAddress.country && (
                      <div className="text-slate-700 dark:text-slate-300 font-medium" data-testid="text-shipping-country">
                        {order.shippingAddress.country}
                      </div>
                    )}
                    
                    {/* Contact Info */}
                    {(order.shippingAddress.tel || order.shippingAddress.email) && (
                      <div className="pt-2 space-y-1 border-t border-slate-200 dark:border-slate-700 mt-2">
                        {order.shippingAddress.tel && (
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400" data-testid="text-shipping-phone">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-xs">{order.shippingAddress.tel}</span>
                          </div>
                        )}
                        {order.shippingAddress.email && (
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400" data-testid="text-shipping-email">
                            <Mail className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-xs">{order.shippingAddress.email}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50 dark:bg-slate-900/20" data-testid="section-no-shipping-address">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400">Shipping Address</h3>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-500">No shipping address selected for this order</p>
                </div>
              )}

              {/* Order Notes - Right after shipping address */}
              {order.notes && (
                <>
                  <Separator />
                  <div className="space-y-2" data-testid="section-order-notes">
                    <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Order Notes
                    </h4>
                    <p className="text-sm text-black dark:text-slate-100 whitespace-pre-wrap bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700">
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

                  {/* Carton Information */}
                  {orderCartons && orderCartons.length > 0 && (
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-700" data-testid="section-cartons">
                      <div className="flex items-center gap-2 mb-3">
                        <Package className="h-4 w-4 text-slate-500" />
                        <span className="text-slate-500 dark:text-slate-400 font-medium">
                          Cartons: {orderCartons.length} {orderCartons.length === 1 ? 'box' : 'boxes'}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {orderCartons.map((carton: any, index: number) => (
                          <div 
                            key={carton.id} 
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3"
                            data-testid={`carton-${index}`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-slate-900 dark:text-slate-100">
                                Carton #{carton.cartonNumber}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {carton.cartonType === 'company' ? 'Company Box' : 'Non-Company'}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {carton.weight && (
                                <div>
                                  <span className="text-slate-500 dark:text-slate-400">Total Weight:</span>
                                  <p className="font-medium text-slate-900 dark:text-slate-100">
                                    {parseFloat(carton.weight).toFixed(2)} kg
                                  </p>
                                </div>
                              )}
                              {carton.payloadWeightKg && (
                                <div>
                                  <span className="text-slate-500 dark:text-slate-400">Items Weight:</span>
                                  <p className="font-medium text-slate-900 dark:text-slate-100">
                                    {parseFloat(carton.payloadWeightKg).toFixed(2)} kg
                                  </p>
                                </div>
                              )}
                              {(carton.innerLengthCm || carton.innerWidthCm || carton.innerHeightCm) && (
                                <div className="col-span-2">
                                  <span className="text-slate-500 dark:text-slate-400">Dimensions (L×W×H):</span>
                                  <p className="font-medium text-slate-900 dark:text-slate-100">
                                    {carton.innerLengthCm ? parseFloat(carton.innerLengthCm).toFixed(1) : '?'} × {carton.innerWidthCm ? parseFloat(carton.innerWidthCm).toFixed(1) : '?'} × {carton.innerHeightCm ? parseFloat(carton.innerHeightCm).toFixed(1) : '?'} cm
                                  </p>
                                </div>
                              )}
                              {carton.trackingNumber && (
                                <div className="col-span-2">
                                  <span className="text-slate-500 dark:text-slate-400">Tracking:</span>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <code className="text-xs bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded font-mono">
                                      {carton.trackingNumber}
                                    </code>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => copyToClipboard(carton.trackingNumber, "Tracking number")}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Total weight summary */}
                      {orderCartons.some((c: any) => c.weight) && (
                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-slate-700 dark:text-slate-300">Total Shipment Weight:</span>
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              {orderCartons.reduce((total: number, c: any) => total + (c.weight ? parseFloat(c.weight) : 0), 0).toFixed(2)} kg
                            </span>
                          </div>
                        </div>
                      )}
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

          {/* Files Sent Card */}
          {((productFiles && productFiles.length > 0) || (orderFiles && orderFiles.length > 0) || (shipmentLabels && shipmentLabels.length > 0)) && (
            <Card data-testid="card-files-sent">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-gray-900 dark:text-gray-100">
                  <FileText className="h-4 w-4" />
                  Files Sent
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Product Documents */}
                {productFiles && productFiles.length > 0 && (
                  <Collapsible open={isProductDocsOpen} onOpenChange={setIsProductDocsOpen}>
                    <CollapsibleTrigger className="w-full">
                      <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2 cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                        <Package className="h-4 w-4" />
                        Product Documents ({productFiles.length})
                        {isProductDocsOpen ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
                      </h4>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="grid grid-cols-1 gap-2 mt-2">
                      {productFiles.map((file: any) => {
                        const fileTypeIcons: Record<string, any> = {
                          sds: Shield,
                          cpnp: Award,
                          flyer: FileImage,
                          certificate: Award,
                          manual: Book,
                          other: File,
                        };
                        const Icon = fileTypeIcons[file.fileType] || FileText;
                        const languageFlags: Record<string, string> = {
                          en: '🇬🇧', de: '🇩🇪', cs: '🇨🇿', fr: '🇫🇷', it: '🇮🇹',
                          es: '🇪🇸', pl: '🇵🇱', sk: '🇸🇰', hu: '🇭🇺', ro: '🇷🇴',
                          bg: '🇧🇬', hr: '🇭🇷', sl: '🇸🇮', sr: '🇷🇸', ru: '🇷🇺',
                          uk: '🇺🇦', zh: '🇨🇳', vn: '🇻🇳',
                        };
                        const flag = file.language ? (languageFlags[file.language] || '🌐') : '🌐';

                        return (
                          <div
                            key={file.id}
                            className="flex items-center gap-3 p-3 bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-700 rounded-md"
                            data-testid={`file-sent-${file.id}`}
                          >
                            <Icon className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-teal-900 dark:text-teal-100 truncate">
                                {file.description || file.fileName}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {file.language && (
                                  <span className="text-xs text-teal-700 dark:text-teal-300">
                                    {flag} {file.language.toUpperCase()}
                                  </span>
                                )}
                                <Badge variant="outline" className="text-xs h-5 px-1.5 bg-white dark:bg-slate-800">
                                  {file.fileType}
                                </Badge>
                              </div>
                            </div>
                            {file.fileUrl && (
                              <a
                                href={file.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0"
                              >
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Download className="h-4 w-4" />
                                </Button>
                              </a>
                            )}
                          </div>
                        );
                      })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Uploaded Files */}
                {orderFiles && orderFiles.length > 0 && (
                  <Collapsible open={isUploadedFilesOpen} onOpenChange={setIsUploadedFilesOpen}>
                    {productFiles && productFiles.length > 0 && <Separator />}
                    <CollapsibleTrigger className="w-full">
                      <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2 cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                        <Upload className="h-4 w-4" />
                        Uploaded Files ({orderFiles.length})
                        {isUploadedFilesOpen ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
                      </h4>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="grid grid-cols-1 gap-2 mt-2">
                      {orderFiles.map((file: any) => (
                        <div
                          key={file.id}
                          className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-700 rounded-md"
                          data-testid={`uploaded-file-${file.id}`}
                        >
                          <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-blue-900 dark:text-blue-100 truncate">
                              {file.fileName}
                            </p>
                            {file.fileSize && (
                              <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                                {(file.fileSize / 1024).toFixed(2)} KB
                              </p>
                            )}
                          </div>
                          {file.fileUrl && (
                            <a
                              href={file.fileUrl}
                              download={file.fileName}
                              className="shrink-0"
                              data-testid={`button-download-${file.id}`}
                            >
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Download className="h-4 w-4" />
                              </Button>
                            </a>
                          )}
                        </div>
                      ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Shipping Labels */}
                {shipmentLabels && shipmentLabels.filter((label: any) => label.status !== 'cancelled').length > 0 && (
                  <Collapsible open={isShippingLabelsOpen} onOpenChange={setIsShippingLabelsOpen}>
                    {((productFiles && productFiles.length > 0) || (orderFiles && orderFiles.length > 0)) && <Separator />}
                    <CollapsibleTrigger className="w-full">
                      <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2 cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                        <Truck className="h-4 w-4" />
                        Shipping Labels ({shipmentLabels.filter((label: any) => label.status !== 'cancelled').length})
                        {isShippingLabelsOpen ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
                      </h4>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="grid grid-cols-1 gap-2 mt-2">
                      {shipmentLabels.filter((label: any) => label.status !== 'cancelled').map((label: any) => (
                        <div
                          key={label.id}
                          className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-700 rounded-md"
                          data-testid={`shipping-label-${label.id}`}
                        >
                          <Printer className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100 truncate">
                              Shipping Label - {label.carrier?.toUpperCase() || 'Unknown'}
                            </p>
                            {label.trackingNumbers && label.trackingNumbers.length > 0 && (
                              <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5 flex items-center gap-1">
                                <Hash className="h-3 w-3" />
                                {label.trackingNumbers.join(', ')}
                              </p>
                            )}
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                              {new Date(label.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          {label.labelBase64 && (
                            <a
                              href={`data:application/pdf;base64,${label.labelBase64}`}
                              download={`shipping-label-${order.orderId}-${label.id}.pdf`}
                              className="shrink-0"
                              data-testid={`button-download-label-${label.id}`}
                            >
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Download className="h-4 w-4" />
                              </Button>
                            </a>
                          )}
                        </div>
                      ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </CardContent>
            </Card>
          )}

          {/* Shipment Tracking */}
          {order.orderStatus === 'shipped' && (
            <OrderTrackingPanel orderId={order.id} />
          )}

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
                  <div className="flex items-center gap-2">
                    <Link href={`/customers/${order.customer.id}`}>
                      <p className="font-medium text-sm text-blue-600 hover:text-blue-800 cursor-pointer">
                        {order.customer.name}
                      </p>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBadges();
                      }}
                      className="h-6 w-6 p-0 text-slate-300 hover:text-slate-700 transition-all opacity-50 hover:opacity-100"
                      data-testid="button-toggle-badges"
                    >
                      <ChevronDown className={`h-4 w-4 transition-transform ${showBadges ? '' : 'rotate-180'}`} />
                    </Button>
                  </div>
                  
                  {/* Customer Badges - Database Persisted */}
                  {showBadges && order.customer?.badges ? (
                    <div className="mt-2">
                      <CustomerBadges badges={order.customer.badges} currency={order.currency || 'EUR'} />
                    </div>
                  ) : null}
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
                  {order.customer.facebookId && (
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-slate-400" />
                      <a 
                        href={`https://messenger.com/t/${order.customer.facebookId}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-blue-600 hover:underline"
                      >
                        Message
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

          {/* Tickets Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Ticket className="h-4 w-4" />
                Support Tickets
                {tickets.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {tickets.length}
                  </Badge>
                )}
              </CardTitle>
              <Link href={`/tickets/add?orderId=${id}`}>
                <Button size="sm" variant="outline" data-testid="button-create-ticket">
                  <Plus className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {tickets.length === 0 ? (
                <div className="text-center py-6 text-sm text-slate-500">
                  <p>No tickets for this order</p>
                  <Link href={`/tickets/add?orderId=${id}`}>
                    <Button variant="link" size="sm" className="mt-2">
                      Create Ticket
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {tickets.slice(0, 3).map((ticket: any) => (
                    <div key={ticket.id} className="border-b last:border-b-0 pb-3 last:pb-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <Link href={`/tickets/${ticket.id}`}>
                            <p className="text-sm font-medium text-blue-600 hover:underline cursor-pointer" data-testid={`link-ticket-${ticket.id}`}>
                              {ticket.ticketId}
                            </p>
                          </Link>
                          <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">{ticket.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={
                              ticket.status === 'open' ? 'secondary' :
                              ticket.status === 'in_progress' ? 'default' :
                              'outline'
                            } className="text-xs">
                              {ticket.status.replace(/_/g, ' ')}
                            </Badge>
                            {ticket.status !== 'resolved' && (
                              <Badge variant={
                                ticket.priority === 'urgent' ? 'destructive' :
                                ticket.priority === 'high' ? 'default' :
                                'outline'
                              } className="text-xs">
                                {ticket.priority}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {tickets.length > 3 && (
                    <Link href={`/tickets?orderId=${id}`}>
                      <Button variant="link" size="sm" className="w-full mt-2">
                        View all {tickets.length} tickets
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

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
                {/* Order Tracking via API - shown only when shipped */}
                {order.shippedAt && order.trackingNumber && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-sky-500 rounded-full mt-1.5"></div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">Tracking Information</p>
                      <p className="text-sm text-slate-500 italic">
                        Tracking updates via API (not yet implemented)
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Tracking #{order.trackingNumber}
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
                
                {/* Packing Completed */}
                {order.packEndTime && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full mt-1.5"></div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">Packing Completed</p>
                      <p className="text-sm text-slate-500">
                        {new Date(order.packEndTime).toLocaleString()}
                        {order.packStartTime && order.packEndTime && (
                          <span className="text-indigo-600 font-medium ml-2">
                            (Duration: {(() => {
                              const duration = Math.floor((new Date(order.packEndTime).getTime() - new Date(order.packStartTime).getTime()) / 1000);
                              const minutes = Math.floor(duration / 60);
                              const seconds = duration % 60;
                              return `${minutes}:${seconds.toString().padStart(2, '0')}`;
                            })()})
                          </span>
                        )}
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
                
                {/* Picking Completed */}
                {order.pickEndTime && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-1.5"></div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">Picking Completed</p>
                      <p className="text-sm text-slate-500">
                        {new Date(order.pickEndTime).toLocaleString()}
                        {order.pickStartTime && order.pickEndTime && (
                          <span className="text-purple-600 font-medium ml-2">
                            (Duration: {(() => {
                              const duration = Math.floor((new Date(order.pickEndTime).getTime() - new Date(order.pickStartTime).getTime()) / 1000);
                              const minutes = Math.floor(duration / 60);
                              const seconds = duration % 60;
                              return `${minutes}:${seconds.toString().padStart(2, '0')}`;
                            })()})
                          </span>
                        )}
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
                
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Order Created</p>
                    <p className="text-sm text-slate-500">
                      {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
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
                  {order?.createdAt && formatDate(order.createdAt)}
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
                  queryClient.invalidateQueries({ queryKey: ['/api/orders', id] });
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