import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from 'react-i18next';
import { usePageTitle } from "@/hooks/use-page-title";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Link } from "wouter";
import { useEffect, useRef, useMemo, useState, lazy, Suspense } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  Upload,
  Box,
  Wrench,
  Trash2
} from "lucide-react";
import MarginPill from "@/components/orders/MarginPill";
import { CustomerBadges } from '@/components/CustomerBadges';
import { cn } from "@/lib/utils";
import { useLocalization } from "@/contexts/LocalizationContext";
import { exportToPDF, PDFColumn } from "@/lib/exportUtils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from "recharts";
import { getCountryFlag, getLocalizedCountryName, normalizeCountryForStorage, type SupportedLanguage } from '@shared/utils/countryNormalizer';
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
import { Crown, Trophy, Sparkles, Heart, RefreshCw, AlertTriangle, ExternalLink, Gift, Percent, Tag, TrendingDown } from "lucide-react";
import { getCarrierTrackingUrl } from "@/lib/carrierTracking";
import { toPng } from "html-to-image";
import logoPath from '@assets/logo_1754349267160.png';
import { useSettings } from "@/contexts/SettingsContext";
import { ThermalReceipt, useOrderReceiptData, type CompanyInfo } from "@/components/orders/ThermalReceipt";
import { Receipt } from "lucide-react";
import { useRealTimeOrder } from "@/hooks/useSocket";
import { RealTimeViewers } from "@/components/RealTimeViewers";

const OrderTrackingPanel = lazy(() => import("@/components/orders/OrderTrackingPanel").then(m => ({ default: m.OrderTrackingPanel })));

function TrackingPanelSkeleton() {
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 space-y-4 animate-pulse">
      <div className="flex items-center gap-2">
        <div className="h-5 w-5 rounded bg-muted" />
        <div className="h-5 w-32 rounded bg-muted" />
      </div>
      <div className="h-4 w-48 rounded bg-muted" />
      <div className="space-y-3">
        <div className="h-20 rounded bg-muted" />
        <div className="h-20 rounded bg-muted" />
      </div>
    </div>
  );
}

function OrderReceiptContent({ order, onClose, companyInfo }: { order: any; onClose: () => void; companyInfo: CompanyInfo }) {
  const { t } = useTranslation(['common', 'orders']);
  const receiptData = useOrderReceiptData(order, order?.currency || 'EUR');
  
  if (!receiptData || !receiptData.items || receiptData.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
        <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-3 mb-4">
          <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{t('orders:noItemsToDisplay', 'No Items to Display')}</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {t('orders:cannotGenerateReceiptNoItems', 'Cannot generate receipt because this order has no items.')}
        </p>
        <Button variant="outline" onClick={onClose}>
          {t('common:close')}
        </Button>
      </div>
    );
  }
  
  return <ThermalReceipt data={receiptData} onClose={onClose} companyInfo={companyInfo} fullOrderId={order?.id} />;
}

export default function OrderDetails() {
  usePageTitle('orders:orderDetails', 'Order Details');
  const { id } = useParams();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { canViewProfit, canViewMargin, canViewImportCost, user } = useAuth();
  const canAccessFinancialData = canViewProfit || canViewMargin;
  const { t, i18n } = useTranslation();
  
  // Real-time collaboration - track viewers and locks
  const { viewers, lockInfo, isLocked, isCurrentUserLockOwner, requestLock, releaseLock } = useRealTimeOrder(id);

  // Request view lock when viewing order, release on unmount
  useEffect(() => {
    if (id && requestLock) {
      requestLock('view');
    }
    return () => {
      if (id && releaseLock) {
        releaseLock();
      }
    };
  }, [id, requestLock, releaseLock]);
  const { formatCurrency, formatDate } = useLocalization();
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
  const [showCapturePreview, setShowCapturePreview] = useState(false);
  const [compactCaptureMode, setCompactCaptureMode] = useState(false);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const capturePreviewRef = useRef<HTMLDivElement>(null);
  const [showBadges, setShowBadges] = useState(() => {
    const saved = localStorage.getItem('orderDetailsBadgesVisible');
    return saved === null ? true : saved === 'true';
  });

  // Collapsible sections state
  const [isProductDocsOpen, setIsProductDocsOpen] = useState(true);
  const [isUploadedFilesOpen, setIsUploadedFilesOpen] = useState(true);
  const [isShippingLabelsOpen, setIsShippingLabelsOpen] = useState(true);
  
  // Expanded variant groups state - tracks which parent products are expanded
  const [expandedVariantGroups, setExpandedVariantGroups] = useState<Set<string>>(new Set());

  // Get shipping settings for tracking
  const { shippingSettings, generalSettings } = useSettings();
  const enableTracking = shippingSettings?.enableTracking ?? true;

  // Company info for receipt
  const companyInfo: CompanyInfo = useMemo(() => ({
    name: generalSettings?.companyName,
    address: generalSettings?.companyAddress,
    city: generalSettings?.companyCity,
    zip: generalSettings?.companyZip,
    country: generalSettings?.companyCountry,
    phone: generalSettings?.companyPhone,
    ico: generalSettings?.companyIco,
    vatId: generalSettings?.companyVatId,
    website: generalSettings?.companyWebsite,
  }), [generalSettings]);

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
        title: t('orders:statusUpdated'),
        description: t('orders:statusUpdatedDesc'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('orders:updateFailed'),
        description: error.message || t('orders:failedToUpdateStatus'),
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
        title: t('orders:paymentStatusUpdated'),
        description: t('orders:paymentStatusUpdatedDesc'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('orders:updateFailed'),
        description: error.message || t('orders:failedToUpdatePayment'),
        variant: "destructive",
      });
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('DELETE', `/api/orders/${id}`);
    },
    onSuccess: () => {
      setShowDeleteDialog(false);
      queryClient.removeQueries({ queryKey: ['/api/orders', id, { includeBadges: true }] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders/pick-pack'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/warehouse'] });
      toast({
        title: t('orders:orderDeleted', 'Order deleted'),
        description: t('orders:orderMovedToTrash', 'Order has been moved to trash'),
      });
      navigate('/orders');
    },
    onError: (error: Error) => {
      setShowDeleteDialog(false);
      toast({
        title: t('orders:deleteFailed', 'Delete failed'),
        description: error.message || t('orders:failedToDeleteOrder', 'Failed to delete order'),
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
        title: t('orders:priorityUpdated'),
        description: t('orders:priorityUpdatedDesc'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('orders:updateFailed'),
        description: error.message || t('orders:failedToUpdatePriority'),
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

  // Auto-enable compact mode for large orders (10+ items)
  useEffect(() => {
    if (order?.items && order.items.length >= 10) {
      setCompactCaptureMode(true);
    }
  }, [order?.items?.length]);

  // LAZY LOADING: Secondary queries only run when section is visible and order is loaded
  // This reduces initial load from 8 parallel queries to just 1 (order data)
  
  // Fetch pick/pack logs - lazy load with longer stale time
  const { data: pickPackLogs } = useQuery<any[]>({
    queryKey: [`/api/orders/${id}/pick-pack-logs`],
    enabled: !!id && !!order && id !== 'pick-pack',
    refetchInterval: 30000, // Reduced from 5s to 30s for better performance
    staleTime: 15000, // Keep data fresh for 15 seconds
  });

  // Fetch order tickets - lazy load
  const { data: tickets = [] } = useQuery<any[]>({
    queryKey: [`/api/tickets?orderId=${id}`],
    enabled: !!id && !!order,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Fetch product files - LAZY: only when Product Documents section is open
  const { data: productFiles = [] } = useQuery<any[]>({
    queryKey: ['/api/product-files'],
    enabled: !!order && !!order.selectedDocumentIds && order.selectedDocumentIds.length > 0 && isProductDocsOpen,
    staleTime: 60000, // Product files rarely change, cache for 1 minute
    select: (allFiles) => {
      if (!order?.selectedDocumentIds) return [];
      return allFiles.filter((file: any) => 
        order.selectedDocumentIds.includes(file.id)
      );
    },
  });

  // Fetch uploaded order files - LAZY: only when Uploaded Files section is open
  const { data: orderFiles = [] } = useQuery<any[]>({
    queryKey: [`/api/orders/${id}/files`],
    enabled: !!id && !!order && isUploadedFilesOpen,
    staleTime: 30000,
  });

  // Fetch shipment labels - LAZY: only when Shipping Labels section is open
  const { data: shipmentLabels = [] } = useQuery<any[]>({
    queryKey: [`/api/orders/${id}/shipment-labels`],
    enabled: !!id && !!order && isShippingLabelsOpen,
    staleTime: 30000,
  });

  // Fetch order cartons - lazy load with caching
  const { data: orderCartons = [] } = useQuery<any[]>({
    queryKey: [`/api/orders/${id}/cartons`],
    enabled: !!id && !!order,
    staleTime: 30000, // Cartons don't change frequently
  });

  // Fetch tracking data - LAZY: only when order is shipped and tracking is enabled
  const { data: trackingData = [], isLoading: isTrackingLoading } = useQuery<any[]>({
    queryKey: [`/api/orders/${id}/tracking`],
    enabled: !!id && !!order && enableTracking && !!order.shippedAt,
    staleTime: 60000, // Tracking updates are expensive, cache for 1 minute
    refetchInterval: shippingSettings?.autoUpdateTrackingStatus 
      ? (shippingSettings?.trackingUpdateFrequencyHours ?? 1) * 60 * 60 * 1000 
      : false,
  });

  // Refresh tracking mutation - uses apiRequest for consistency
  const refreshTrackingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('GET', `/api/orders/${id}/tracking?force=true`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${id}/tracking`] });
      toast({
        title: t('orders:trackingRefreshed'),
        description: t('orders:trackingInfoUpdated'),
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: t('orders:refreshFailed'),
        description: error.message || t('orders:failedToRefreshTracking'),
      });
    },
  });

  // Status config for tracking - same as OrderTrackingPanel
  const trackingStatusConfig = {
    delivered: { variant: 'default' as const, icon: CheckCircle2, color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-500' },
    out_for_delivery: { variant: 'secondary' as const, icon: Truck, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-500' },
    in_transit: { variant: 'outline' as const, icon: Package, color: 'text-yellow-600 dark:text-yellow-400', bgColor: 'bg-yellow-500' },
    exception: { variant: 'destructive' as const, icon: AlertCircle, color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-500' },
    created: { variant: 'outline' as const, icon: Clock, color: 'text-gray-600 dark:text-gray-400', bgColor: 'bg-gray-500' },
    unknown: { variant: 'outline' as const, icon: Package, color: 'text-gray-600 dark:text-gray-400', bgColor: 'bg-gray-500' },
  };

  // Generate external tracking URL based on carrier
  const getTrackingUrl = (carrier: string, trackingNumber: string) => {
    const carrierUrls: Record<string, string> = {
      ppl: `https://www.ppl.cz/vyhledat-zasilku?shipmentId=${trackingNumber}`,
      gls: `https://gls-group.com/EU/en/parcel-tracking?match=${trackingNumber}`,
      dhl: `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`,
    };
    return carrierUrls[carrier?.toLowerCase()] || null;
  };

  // Group order items by parent product when there are more than 5 variants
  const VARIANT_GROUP_THRESHOLD = 1; // Group variants when 2+ of same parent (threshold is > 1)
  
  interface VariantGroup {
    parentProductId: string;
    parentProductName: string;
    parentImage: string | null;
    variants: any[];
    totalQuantity: number;
    totalPrice: number;
  }
  
  const { groupedItems, variantGroups } = useMemo(() => {
    const items = order?.items || [];
    const variantsByParent = new Map<string, any[]>();
    const singleItems: any[] = [];
    
    items.forEach((item: any) => {
      if (item.variantId && item.productId) {
        // Items with explicit variant relationship - only group these
        const existing = variantsByParent.get(item.productId) || [];
        variantsByParent.set(item.productId, [...existing, item]);
      } else {
        // Items without explicit variantId are treated as single items
        // Don't use name-based grouping as it incorrectly groups unrelated products
        singleItems.push(item);
      }
    });
    
    const result: (any | { isGroupHeader: true; group: VariantGroup })[] = [];
    const groups: VariantGroup[] = [];
    
    // Add single items (not grouped)
    singleItems.forEach(item => result.push(item));
    
    // Group by explicit productId/variantId
    variantsByParent.forEach((variants, parentProductId) => {
      if (variants.length > VARIANT_GROUP_THRESHOLD) {
        const totalQuantity = variants.reduce((sum: number, v: any) => sum + (parseInt(v.quantity) || 0), 0);
        const totalPrice = variants.reduce((sum: number, v: any) => {
          const unitPrice = parseFloat(v.unitPrice) || parseFloat(v.price) || 0;
          const qty = parseInt(v.quantity) || 0;
          const discount = parseFloat(v.discount) || 0;
          return sum + (unitPrice * qty) - discount;
        }, 0);
        
        const firstVariant = variants[0];
        const baseProductName = firstVariant.productName?.replace(/\s*-\s*[^-]+$/, '') || firstVariant.productName;
        
        const group: VariantGroup = {
          parentProductId,
          parentProductName: baseProductName,
          parentImage: firstVariant.image || null,
          variants,
          totalQuantity,
          totalPrice,
        };
        
        groups.push(group);
        result.push({ isGroupHeader: true, group });
      } else {
        variants.forEach(item => result.push(item));
      }
    });
    
    return { groupedItems: result, variantGroups: groups };
  }, [order?.items]);
  
  const toggleVariantGroup = (parentProductId: string) => {
    setExpandedVariantGroups(prev => {
      const next = new Set(prev);
      if (next.has(parentProductId)) {
        next.delete(parentProductId);
      } else {
        next.add(parentProductId);
      }
      return next;
    });
  };

  // Prevent OrderDetails from rendering on pick-pack page
  if (location === '/pick-pack') {
    return null;
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: t('orders:copied'),
      description: t('orders:copiedToClipboard', { label }),
    });
  };

  const handleDownloadInvoice = () => {
    if (!order) return;
    // Auto-enable compact mode for large orders (10+ items)
    const itemCount = order.items?.length || 0;
    setCompactCaptureMode(itemCount >= 10);
    setShowCapturePreview(true);
  };

  const handleCaptureDownload = async () => {
    if (!capturePreviewRef.current) return;
    
    try {
      const dataUrl = await toPng(capturePreviewRef.current, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });
      
      const link = document.createElement('a');
      link.download = `order-${order.orderId || order.id}_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      
      setShowCapturePreview(false);
      toast({
        title: t('orders:orderCaptured'),
        description: t('orders:orderCapturedDesc'),
      });
    } catch (error) {
      console.error('Error capturing order:', error);
      toast({
        title: t('orders:captureError'),
        description: t('orders:captureErrorDesc'),
        variant: 'destructive',
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
    try {
      if (!order) {
        toast({
          title: t('common:warning'),
          description: t('orders:noDataToExport'),
          variant: "destructive",
        });
        return;
      }

      // Get customer name
      const customerName = order.customer?.name || order.customer?.firstName 
        ? `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim()
        : t('orders:walkInCustomer');

      // Prepare order items for export
      const itemsData = order.items?.map((item: any, index: number) => ({
        index: index + 1,
        productName: item.productName || item.name || 'N/A',
        sku: item.sku || 'N/A',
        quantity: item.quantity || 0,
        unitPrice: formatCurrency(parseFloat(item.price || '0'), order.currency || 'EUR'),
        total: formatCurrency(parseFloat(item.price || '0') * (item.quantity || 0), order.currency || 'EUR'),
      })) || [];

      // Create summary rows
      const summaryData = [
        ...itemsData,
        { index: '', productName: '---', sku: '', quantity: '', unitPrice: t('orders:subtotal'), total: formatCurrency(parseFloat(order.subtotal || '0'), order.currency || 'EUR') },
        { index: '', productName: '', sku: '', quantity: '', unitPrice: t('orders:shipping'), total: formatCurrency(parseFloat(order.shippingCost || '0'), order.currency || 'EUR') },
        { index: '', productName: '', sku: '', quantity: '', unitPrice: t('orders:tax'), total: formatCurrency(parseFloat(order.tax || '0'), order.currency || 'EUR') },
        ...(parseFloat(order.discount || '0') > 0 ? [{ index: '', productName: '', sku: '', quantity: '', unitPrice: t('orders:discount'), total: `-${formatCurrency(parseFloat(order.discount || '0'), order.currency || 'EUR')}` }] : []),
        { index: '', productName: '', sku: '', quantity: '', unitPrice: t('orders:grandTotal'), total: formatCurrency(parseFloat(order.grandTotal || '0'), order.currency || 'EUR') },
      ];

      // Define columns for the PDF
      const columns: PDFColumn[] = [
        { key: 'index', header: '#' },
        { key: 'productName', header: t('orders:product') },
        { key: 'sku', header: t('orders:sku') },
        { key: 'quantity', header: t('orders:qty') },
        { key: 'unitPrice', header: t('orders:unitPrice') },
        { key: 'total', header: t('orders:total') },
      ];

      // Create document title with order info
      const orderStatusText = order.orderStatus?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || '';
      const paymentStatusText = order.paymentStatus?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || '';
      const title = `${t('orders:order')} #${order.orderId} - ${customerName}
${t('orders:date')}: ${formatDate(order.orderDate || order.createdAt)}
${t('orders:status')}: ${orderStatusText} | ${t('orders:payment')}: ${paymentStatusText}`;

      // Generate filename
      const filename = `order-${order.orderId}-${new Date().toISOString().slice(0, 10)}`;

      // Export to PDF
      exportToPDF(title, summaryData, columns, filename);

      toast({
        title: t('common:success'),
        description: t('orders:exportSuccessPDF'),
      });
    } catch (error) {
      console.error('Error exporting order to PDF:', error);
      toast({
        title: t('common:error'),
        description: t('orders:exportFailed'),
        variant: "destructive",
      });
    }
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
    order.orderStatus === 'delivered' ? t('orders:delivered') :
    order.orderStatus === 'shipped' ? t('orders:shipped') :
    order.orderStatus === 'ready_to_ship' ? t('orders:readyToShip') :
    order.orderStatus === 'to_fulfill' ? t('orders:toFulfill') :
    order.orderStatus === 'awaiting_stock' ? t('orders:awaitingStock') :
    order.orderStatus === 'pending' ? t('orders:pending') :
    order.orderStatus === 'cancelled' ? t('orders:cancelled') :
    order.orderStatus?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || t('orders:unknown');

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
    order.paymentStatus === 'paid' ? t('orders:paid') :
    order.paymentStatus === 'pending' ? t('orders:paymentPending') :
    order.paymentStatus === 'pay_later' ? t('orders:payLater') :
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
    order.priority === 'high' ? t('orders:highPriority') :
    order.priority === 'medium' ? t('orders:mediumPriority') :
    t('orders:lowPriority');

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto px-3 sm:px-0 overflow-x-hidden relative">
      
      {/* Clean Header */}
      <Card>
        <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
          {/* Breadcrumb Navigation */}
          <div className="mb-3 sm:mb-4">
            <nav className="flex items-center text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              <Link href="/orders">
                <span className="hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer font-medium">{t('orders:orders')}</span>
              </Link>
              <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 mx-1 sm:mx-2 text-slate-400 dark:text-slate-600" />
              <span className="text-slate-900 dark:text-slate-100 font-semibold">{t('orders:orderDetails')}</span>
            </nav>
          </div>

          <div className="flex flex-col gap-3">
            {/* Top Row: Order ID + Action Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">#{order.orderId}</h1>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => copyToClipboard(order.orderId, t('orders:orderIdLabel'))}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              
              {/* Action Buttons - Moved to top right */}
              <div className="flex items-center gap-2">
                {/* Real-time viewers indicator */}
                <RealTimeViewers 
                  viewers={viewers} 
                  lockInfo={lockInfo} 
                  currentUserId={user?.id}
                  size="sm"
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9">
                      <MoreVertical className="h-4 w-4" />
                      <span className="ml-1.5 hidden sm:inline">{t('common:more', 'More')}</span>
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
                      {t('orders:export')}
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
                      {t('orders:createReturn')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t('orders:deleteOrder', 'Delete Order')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button size="sm" onClick={() => navigate(`/orders/${id}/edit`)} className="h-9">
                  <Edit className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">{t('orders:edit')}</span>
                </Button>
              </div>
            </div>

            {/* Customer Row */}
            {order.customer && (
              <div className="flex items-center gap-2 flex-wrap">
                <Link href={`/customers/${order.customer.id}`}>
                  <span className="font-semibold text-sm text-blue-600 hover:text-blue-800 cursor-pointer flex items-center gap-1.5">
                    {order.customer.shippingCountry && <span className="text-base">{getCountryFlag(order.customer.shippingCountry)}</span>}
                    {order.customer.profilePictureUrl ? (
                      <img 
                        src={order.customer.profilePictureUrl} 
                        alt={order.customer.name || ''} 
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                        <User className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                      </div>
                    )}
                    {order.customer.name}
                  </span>
                </Link>
                {order.customer.type && (
                  <Badge 
                    variant="secondary"
                    className="text-xs h-5"
                  >
                    {order.customer.type === 'vip' ? t('orders:vip') : 
                     order.customer.type === 'wholesale' ? t('orders:wholesale') : 
                     order.customer.type === 'business' ? t('orders:business') : 
                     t('orders:retail')}
                  </Badge>
                )}
                {order.customer.customerRank && (
                  <Badge variant="default" className="text-xs h-5 bg-amber-500 hover:bg-amber-600">
                    {order.customer.customerRank}
                  </Badge>
                )}
              </div>
            )}

            {/* Customer Badges */}
            {order.customer?.badges && (
              <CustomerBadges 
                badges={order.customer.badges} 
                currency={order.currency || 'EUR'} 
              />
            )}
                
            {/* Status Row - Compact */}
            <div className="flex flex-wrap items-center gap-1.5">
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
                        {t('orders:pending')}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => updateOrderStatusMutation.mutate('awaiting_stock')}
                        className={cn(
                          "text-orange-700",
                          order.orderStatus === 'awaiting_stock' ? 'bg-orange-50' : ''
                        )}
                      >
                        <AlertCircle className="mr-2 h-4 w-4" />
                        {t('orders:awaitingStock')}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => updateOrderStatusMutation.mutate('to_fulfill')}
                        className={cn(
                          "text-blue-700",
                          order.orderStatus === 'to_fulfill' ? 'bg-blue-50' : ''
                        )}
                      >
                        <Package className="mr-2 h-4 w-4" />
                        {t('orders:toFulfill')}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => updateOrderStatusMutation.mutate('ready_to_ship')}
                        className={cn(
                          "text-cyan-700",
                          order.orderStatus === 'ready_to_ship' ? 'bg-cyan-50' : ''
                        )}
                      >
                        <Package className="mr-2 h-4 w-4" />
                        {t('orders:readyToShip')}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => updateOrderStatusMutation.mutate('shipped')}
                        className={cn(
                          "text-purple-700",
                          order.orderStatus === 'shipped' ? 'bg-purple-50' : ''
                        )}
                      >
                        <Truck className="mr-2 h-4 w-4" />
                        {t('orders:shipped')}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => updateOrderStatusMutation.mutate('delivered')}
                        className={cn(
                          "text-emerald-700",
                          order.orderStatus === 'delivered' ? 'bg-emerald-50' : ''
                        )}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        {t('orders:delivered')}
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
                        {t('orders:cancelled')}
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
                        {t('orders:paymentPending')}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => updatePaymentStatusMutation.mutate('paid')}
                        className={cn(
                          "text-green-700",
                          order.paymentStatus === 'paid' ? 'bg-green-50' : ''
                        )}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        {t('orders:paid')}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => updatePaymentStatusMutation.mutate('pay_later')}
                        className={cn(
                          "text-blue-700",
                          order.paymentStatus === 'pay_later' ? 'bg-blue-50' : ''
                        )}
                      >
                        <AlertCircle className="mr-2 h-4 w-4" />
                        {t('orders:payLater')}
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
                        {t('orders:lowPriority')}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => updatePriorityMutation.mutate('medium')}
                        className={cn(
                          "text-amber-700",
                          order.priority === 'medium' ? 'bg-amber-50' : ''
                        )}
                      >
                        <TrendingUp className="mr-2 h-4 w-4" />
                        {t('orders:mediumPriority')}
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
                        {t('orders:highPriority')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

            {/* Meta Info */}
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1">
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
                <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(order.grandTotal || 0, order.currency || 'EUR')}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left Column - Order Items and Pricing */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Invoice - Order Items & Pricing */}
          <Card ref={invoiceCardRef} className="overflow-hidden">
            <CardHeader className="border-b border-slate-200 dark:border-gray-700 px-3 sm:px-6 py-3 sm:py-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                  {t('orders:invoice')}
                </CardTitle>
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap" data-hide-in-screenshot>
                  {order.orderStatus === 'to_fulfill' && (
                    <Button
                      variant={showPickingMode ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShowPickingMode(!showPickingMode)}
                      className="h-7 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-3"
                    >
                      <CheckCircle2 className="h-3 w-3 sm:mr-1.5" />
                      <span className="hidden sm:inline">{showPickingMode ? t('orders:exitPickingMode') : t('orders:startPickingMode')}</span>
                      <span className="sm:hidden">{showPickingMode ? 'Exit' : 'Pick'}</span>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadInvoice}
                    data-testid="button-capture-order"
                    className="h-7 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-3"
                  >
                    <Download className="h-3 w-3 sm:mr-1.5" />
                    <span className="hidden sm:inline">{t('orders:captureOrder')}</span>
                    <span className="sm:hidden">Capture</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowReceiptDialog(true)}
                    data-testid="button-print-receipt"
                    className="h-7 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-3"
                  >
                    <Receipt className="h-3 w-3 sm:mr-1.5" />
                    <span className="hidden sm:inline">{t('financial:printReceipt', 'Print Receipt')}</span>
                    <span className="sm:hidden">Receipt</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-0">
              {/* Order Items - Professional Invoice Layout */}
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {groupedItems.map((entry: any, index: number) => {
                  // Handle variant group headers
                  if (entry.isGroupHeader) {
                    const group = entry.group as VariantGroup;
                    const isExpanded = expandedVariantGroups.has(group.parentProductId);
                    
                    return (
                      <div key={`group-${group.parentProductId}`}>
                        {/* Group Header */}
                        <div 
                          className="px-3 sm:px-6 py-3 sm:py-4 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 cursor-pointer"
                          onClick={() => toggleVariantGroup(group.parentProductId)}
                          data-testid={`variant-group-${group.parentProductId}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 relative">
                              {group.parentImage ? (
                                <img 
                                  src={group.parentImage} 
                                  alt={group.parentProductName}
                                  className="w-12 h-12 object-contain rounded border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900"
                                />
                              ) : (
                                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded border border-blue-200 dark:border-blue-700 flex items-center justify-center">
                                  <Package className="h-6 w-6 text-blue-500 dark:text-blue-400" />
                                </div>
                              )}
                              <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white text-[10px] font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center">
                                {group.variants.length}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                )}
                                <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">
                                  {group.parentProductName}
                                </p>
                              </div>
                              <div className="text-xs text-black dark:text-slate-400 mt-1 leading-relaxed font-medium">
                                {[...group.variants]
                                  .sort((a: any, b: any) => {
                                    const nameA = a.variantName || a.extractedVariantName || a.productName?.split(' - ').pop() || '';
                                    const nameB = b.variantName || b.extractedVariantName || b.productName?.split(' - ').pop() || '';
                                    // Extract number from name (handles "S 4", "S 22", "5", "Color 1", etc.)
                                    const matchA = nameA.match(/(\d+)/);
                                    const matchB = nameB.match(/(\d+)/);
                                    const numA = matchA ? parseInt(matchA[1], 10) : 999999;
                                    const numB = matchB ? parseInt(matchB[1], 10) : 999999;
                                    return numA - numB;
                                  })
                                  .map((v: any) => {
                                    const variantName = v.variantName || v.extractedVariantName || v.productName?.split(' - ').pop();
                                    const qty = parseInt(v.quantity) || 1;
                                    return qty > 1 ? `${qty}×${variantName}` : variantName;
                                  }).join(', ')}
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                <span className="text-[10px] text-blue-500 dark:text-blue-400">
                                  {isExpanded ? t('orders:clickToCollapse', 'Click to collapse') : t('orders:clickToExpand', 'Click to expand')}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-slate-500 dark:text-slate-400">{t('orders:qtyColon')} <span className="font-bold text-blue-700 dark:text-blue-300">{group.totalQuantity}</span></p>
                              <p className="font-bold text-base text-blue-600 dark:text-blue-400">
                                {formatCurrency(group.totalPrice, order.currency || 'EUR')}
                              </p>
                            </div>
                          </div>
                        </div>
                        {/* Expanded Variants */}
                        {isExpanded && [...group.variants].sort((a: any, b: any) => {
                          // Extract number from variant name for sorting
                          const getVariantNum = (item: any) => {
                            const name = item.variantName || item.extractedVariantName || item.productName?.split(' - ').pop() || '';
                            // Try to extract number from variant name (handles "5", "Color 1", "Màu 200", etc.)
                            const match = name.match(/(\d+)/);
                            return match ? parseInt(match[1], 10) : 999999;
                          };
                          return getVariantNum(a) - getVariantNum(b);
                        }).map((variantItem: any, variantIndex: number) => {
                          const variantUnitPrice = parseFloat(variantItem.unitPrice) || parseFloat(variantItem.price) || 0;
                          const variantTotal = variantUnitPrice * (variantItem.quantity || 1) - (parseFloat(variantItem.discount) || 0);
                          const isLastVariant = variantIndex === group.variants.length - 1;
                          return (
                            <div 
                              key={variantItem.id || variantIndex} 
                              className={`px-3 sm:px-6 py-2 sm:py-3 bg-slate-50/50 dark:bg-slate-900/30 border-l-4 border-l-blue-400 dark:border-l-blue-600 ${isLastVariant ? 'border-b-2 border-b-blue-300 dark:border-b-blue-700' : ''}`}
                            >
                              <div className="flex items-center justify-between gap-3 pl-4">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <Badge className="text-xs px-1.5 py-0 bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700">
                                    {variantItem.variantName || variantItem.productName}
                                  </Badge>
                                  {variantItem.sku && (
                                    <span className="text-xs text-slate-500 dark:text-slate-400">{variantItem.sku}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                  <span className="text-slate-600 dark:text-slate-400">
                                    {variantItem.quantity}× {formatCurrency(variantUnitPrice, order.currency || 'EUR')}
                                  </span>
                                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                                    {formatCurrency(variantTotal, order.currency || 'EUR')}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }
                  
                  // Regular item rendering
                  const item = entry;
                  const unitPrice = parseFloat(item.unitPrice) || parseFloat(item.price) || 0;
                  // Detect promotional free items (price = 0)
                  const isPromotionalFreeItem = unitPrice === 0 && item.quantity > 0;
                  
                  return (
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
                      <div className="flex-shrink-0 relative">
                        {/* Offer Badge - positioned above image */}
                        {item.appliedDiscountLabel && (
                          <div className="absolute -top-2 -left-1 z-10">
                            {item.appliedDiscountType === 'buy_x_get_y' ? (
                              <div className="flex items-center gap-0.5 bg-green-600 text-white rounded px-1 py-0.5 text-[9px] font-bold shadow-sm">
                                <Gift className="h-2.5 w-2.5" />
                                <span>OFFER</span>
                              </div>
                            ) : item.appliedDiscountType === 'percentage' ? (
                              <div className="flex items-center gap-0.5 bg-orange-500 text-white rounded px-1 py-0.5 text-[9px] font-bold shadow-sm">
                                <Percent className="h-2.5 w-2.5" />
                                <span>SALE</span>
                              </div>
                            ) : item.appliedDiscountType === 'fixed' ? (
                              <div className="flex items-center gap-0.5 bg-blue-500 text-white rounded px-1 py-0.5 text-[9px] font-bold shadow-sm">
                                <Tag className="h-2.5 w-2.5" />
                                <span>DEAL</span>
                              </div>
                            ) : isPromotionalFreeItem ? (
                              <div className="flex items-center gap-0.5 bg-green-600 text-white rounded px-1 py-0.5 text-[9px] font-bold shadow-sm">
                                <Gift className="h-2.5 w-2.5" />
                                <span>FREE</span>
                              </div>
                            ) : null}
                          </div>
                        )}
                        {item.image ? (
                          <img 
                            src={item.image} 
                            alt={item.productName}
                            className="w-12 h-12 object-contain rounded border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-gray-700"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded border flex items-center justify-center bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-gray-700">
                            {item.serviceId ? (
                              <Wrench className="h-6 w-6 text-orange-500 dark:text-orange-400" />
                            ) : (
                              <Package className="h-6 w-6 text-slate-300 dark:text-slate-600" />
                            )}
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
                                  {item.productName || t('orders:product')}
                                </p>
                              </Link>
                            ) : item.serviceId ? (
                              <Link href={`/services/${item.serviceId}`}>
                                <p className={cn(
                                  "font-semibold text-sm mb-0.5 cursor-pointer hover:underline",
                                  pickedItems.has(item.id) ? "line-through text-slate-400 hover:text-slate-500" : "text-purple-600 hover:text-purple-800"
                                )}>
                                  {item.productName || t('orders:service')}
                                </p>
                              </Link>
                            ) : item.bundleId ? (
                              <Link href={`/bundles/${item.bundleId}`}>
                                <p className={cn(
                                  "font-semibold text-sm mb-0.5 cursor-pointer hover:underline",
                                  pickedItems.has(item.id) ? "line-through text-slate-400 hover:text-slate-500" : "text-green-600 hover:text-green-800"
                                )}>
                                  {item.productName || t('orders:bundle')}
                                </p>
                              </Link>
                            ) : (
                              <p className={cn(
                                "font-semibold text-slate-900 dark:text-slate-100 text-sm mb-0.5",
                                pickedItems.has(item.id) && "line-through text-slate-400 dark:text-slate-500"
                              )}>
                                {item.productName || t('orders:item')}
                              </p>
                            )}
                            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                              {item.sku && <p className="text-xs text-slate-500 dark:text-slate-400">{t('orders:skuColon')} {item.sku}</p>}
                              {/* Carton Badge - shown when quantity >= bulkUnitQty */}
                              {item.bulkUnitQty && item.quantity >= item.bulkUnitQty && (
                                <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-600 font-medium">
                                  <Box className="h-2.5 w-2.5 mr-0.5" />
                                  {Math.floor(item.quantity / item.bulkUnitQty)} {item.bulkUnitName || 'carton'}
                                </Badge>
                              )}
                              {/* Promotional Free Item Badge - inline with SKU */}
                              {isPromotionalFreeItem && item.appliedDiscountLabel && (
                                <>
                                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">{item.appliedDiscountLabel}</span>
                                  <Badge className="text-[10px] px-1.5 py-0 bg-green-600 text-white border-green-600 dark:bg-green-500 dark:border-green-500 font-bold">
                                    {t('orders:freeItem')}
                                  </Badge>
                                </>
                              )}
                            </div>
                            {/* Discount Badge - Enhanced display for different discount types */}
                            {item.appliedDiscountLabel && !isPromotionalFreeItem && (
                              <div className="flex flex-wrap gap-1.5 mb-1.5">
                                {/* Discount Type Badge */}
                                {item.appliedDiscountType === 'percentage' && (
                                  <div className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border border-orange-300 dark:border-orange-700 rounded px-1.5 py-0.5 text-xs">
                                    <Percent className="h-3 w-3" />
                                    <span className="font-medium">{item.appliedDiscountLabel}</span>
                                  </div>
                                )}
                                {item.appliedDiscountType === 'fixed' && (
                                  <div className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-300 dark:border-blue-700 rounded px-1.5 py-0.5 text-xs">
                                    <Tag className="h-3 w-3" />
                                    <span className="font-medium">{item.appliedDiscountLabel}</span>
                                  </div>
                                )}
                                {item.appliedDiscountType === 'buy_x_get_y' && (
                                  <div className="inline-flex items-center gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-300 dark:border-green-700 rounded px-1.5 py-0.5 text-xs">
                                    <Gift className="h-3 w-3" />
                                    <span className="font-medium">{item.appliedDiscountLabel}</span>
                                  </div>
                                )}
                                {/* Fallback for other/unknown types */}
                                {!['percentage', 'fixed', 'buy_x_get_y'].includes(item.appliedDiscountType || '') && (
                                  <div className="inline-flex items-center gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-300 dark:border-green-700 rounded px-1.5 py-0.5 text-xs">
                                    <span className="font-medium">{t('orders:offer')}:</span>
                                    <span>{item.appliedDiscountLabel}</span>
                                  </div>
                                )}
                                {/* Savings indicator */}
                                {item.discount > 0 && (
                                  <div className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded px-1.5 py-0.5 text-xs">
                                    <TrendingDown className="h-3 w-3" />
                                    <span className="font-medium">{t('orders:save')} {formatCurrency(item.discount, order.currency || 'EUR')}</span>
                                  </div>
                                )}
                              </div>
                            )}
                            {item.serviceId && item.notes && (
                              <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded px-2 py-1 mb-1.5">
                                <p className="text-xs text-purple-900 dark:text-purple-300 font-medium">{t('orders:noteColon')} {item.notes}</p>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Quantity - More Visible */}
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-slate-500 dark:text-slate-400">{t('orders:qtyColon')}</span>
                                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                  {/* For Buy X Get Y, show paid quantity (total - free) */}
                                  {item.appliedDiscountType === 'buy_x_get_y' && (item.freeItemsCount ?? 0) > 0
                                    ? item.quantity - (item.freeItemsCount ?? 0)
                                    : item.quantity}
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
                                item.appliedDiscountType === 'buy_x_get_y' ? (
                                  <>
                                    {/* Buy X Get Y: Show paid quantity × unit price (no percentage display) */}
                                    <p className="font-bold text-base text-green-600 dark:text-green-400">
                                      {formatCurrency((item.unitPrice || item.price || 0) * (item.quantity - (item.freeItemsCount ?? 0)), order.currency || 'EUR')}
                                    </p>
                                  </>
                                ) : (
                                  <>
                                    {/* Original price (strikethrough) */}
                                    <p className="text-xs text-slate-400 dark:text-slate-500 line-through">
                                      {formatCurrency((item.unitPrice || item.price || 0) * item.quantity, order.currency || 'EUR')}
                                    </p>
                                    {/* Discount amount - show as percentage (not for Buy X Get Y) */}
                                    <p className="text-xs text-green-600 dark:text-green-500 -mt-0.5">
                                      {(() => {
                                        const originalTotal = (item.unitPrice || item.price || 0) * item.quantity;
                                        const discountPct = originalTotal > 0 ? ((item.discount || 0) / originalTotal) * 100 : 0;
                                        if (discountPct >= 1) {
                                          return `-${Math.round(discountPct)}% OFF`;
                                        } else if (discountPct > 0) {
                                          return `-${discountPct.toFixed(1)}% OFF`;
                                        }
                                        return '';
                                      })()}
                                    </p>
                                    {/* Final price after discount */}
                                    <p className="font-bold text-base text-green-600 dark:text-green-400 mt-0.5">
                                      {formatCurrency(((item.unitPrice || item.price || 0) * item.quantity) - (item.discount || 0), order.currency || 'EUR')}
                                    </p>
                                  </>
                                )
                              ) : isPromotionalFreeItem ? (
                                <p className="font-bold text-base text-green-600 dark:text-green-400">
                                  {formatCurrency(0, order.currency || 'EUR')}
                                </p>
                              ) : (
                                <p className="font-bold text-base text-green-600 dark:text-green-400">
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
                                    {t('orders:returnThisItem')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      // Set the selected item for custom pricing
                                      setSelectedPriceItem(item);
                                      setShowCustomPriceDialog(true);
                                    }}
                                  >
                                    <Banknote className="mr-2 h-4 w-4" />
                                    {t('orders:setExclusivePrice')}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Free Items Row for Buy X Get Y Offers - Minimal */}
                    {item.appliedDiscountType === 'buy_x_get_y' && (item.freeItemsCount ?? 0) > 0 && (
                      <div className="mt-2 ml-15 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs text-slate-500 dark:text-slate-400">+{item.freeItemsCount}×</span>
                          <span className="text-xs text-slate-700 dark:text-slate-300">{item.productName}</span>
                          <span className="text-xs text-green-600 dark:text-green-400 font-medium">{item.appliedDiscountLabel}</span>
                          <Badge className="text-[10px] px-1.5 py-0 bg-green-600 text-white border-green-600 dark:bg-green-500 dark:border-green-500 font-bold">
                            {t('orders:freeItem')}
                          </Badge>
                        </div>
                        <span className="font-bold text-sm text-green-600 dark:text-green-400">
                          {formatCurrency(0, order.currency || 'EUR')}
                        </span>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
              
              {/* Picking Progress */}
              {showPickingMode && (
                <div className="mx-6 mt-6 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-300">{t('orders:pickingProgress')}</p>
                    <span className="text-sm text-blue-700 dark:text-blue-400">
                      {t('orders:itemsPicked', { picked: pickedItems.size, total: order.items?.length || 0 })}
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
                      {t('orders:allItemsPickedReady')}
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
                      {t('orders:markAllPicked')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPickedItems(new Set())}
                      className="min-h-[44px] sm:min-h-[36px] w-full sm:w-auto"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      {t('orders:clearAll')}
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
                              title: t('orders:allItemsPicked'),
                              description: t('orders:allItemsPickedDesc'),
                            });
                          }
                        }}
                        className="min-h-[44px] sm:min-h-[36px] w-full sm:w-auto"
                      >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        {t('orders:returnUnpickedItems')}
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Pricing Breakdown - Integrated */}
              <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 px-3 sm:px-6 border-t-2 border-slate-200 dark:border-gray-700">
                <div className="space-y-3">
                  {/* Merchandise Total & Promotional Savings */}
                  {(() => {
                    const totalItemDiscounts = order.items?.reduce((sum: number, item: any) => sum + (parseFloat(item.discount) || 0), 0) || 0;
                    const merchandiseTotal = order.items?.reduce((sum: number, item: any) => {
                      return sum + ((parseFloat(item.unitPrice) || parseFloat(item.price) || 0) * (item.quantity || 0));
                    }, 0) || 0;
                    
                    if (totalItemDiscounts > 0) {
                      return (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-700 dark:text-slate-300 font-medium">{t('orders:merchandiseTotal')}</span>
                            <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(merchandiseTotal, order.currency || 'EUR')}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-green-700 dark:text-green-500 font-medium flex items-center gap-1.5">
                              <Tag className="h-3.5 w-3.5" />
                              {t('orders:promotionalSavings')}
                            </span>
                            <span className="font-semibold text-green-700 dark:text-green-500">
                              -{formatCurrency(totalItemDiscounts, order.currency || 'EUR')}
                            </span>
                          </div>
                        </>
                      );
                    }
                    return null;
                  })()}
                  
                  <div className="flex justify-between items-center">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">{t('orders:subtotal')}</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(order.subtotal || 0, order.currency || 'EUR')}</span>
                  </div>
                  
                  {order.discountValue > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-green-700 dark:text-green-500 font-medium">
                        {t('orders:discount')} {order.discountType === 'rate' && `(${order.discountValue}%)`}
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
                      <span className="text-slate-700 dark:text-slate-300 font-medium">{t('orders:tax')} ({order.taxRate}%)</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(order.taxAmount || 0, order.currency || 'EUR')}</span>
                    </div>
                  )}
                  
                  {order.shippingCost > 0 && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-700 dark:text-slate-300 font-medium">
                          {t('orders:shipping')} ({(() => {
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
                        {t('orders:adjustment')}
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
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-lg">{t('orders:grandTotal')}</span>
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
                {t('orders:shippingInformation')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Shipping Address - Only show if shippingAddressId exists */}
              {order.shippingAddressId && order.shippingAddress ? (
                <div className="border-2 border-blue-500 dark:border-blue-600 rounded-lg p-4" data-testid="section-shipping-address">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('orders:shippingAddress')}</h3>
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
                        {getLocalizedCountryName(order.shippingAddress.country, i18n.language as SupportedLanguage)}
                      </div>
                    )}
                    
                    {/* Contact Info */}
                    {(order.shippingAddress.tel || order.shippingAddress.email) && (
                      <div className="pt-2 space-y-1 border-t border-slate-200 dark:border-slate-700 mt-2">
                        {order.shippingAddress.tel && (
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400" data-testid="text-shipping-phone">
                            <Phone className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                            <span className="text-xs">{order.shippingAddress.tel}</span>
                          </div>
                        )}
                        {order.shippingAddress.email && (
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400" data-testid="text-shipping-email">
                            <Mail className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
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
                    <MapPin className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400">{t('orders:shippingAddress')}</h3>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-500">{t('orders:noShippingAddress')}</p>
                </div>
              )}

              {/* Order Notes - Right after shipping address */}
              {order.notes && (
                <>
                  <Separator />
                  <div className="space-y-2" data-testid="section-order-notes">
                    <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {t('orders:orderNotes')}
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
                  {t('orders:shippingMethodTracking')}
                </h4>
                <div className="space-y-3 text-sm">
                  {order.shippingMethod && (
                    <div data-testid="text-shipping-method">
                      <span className="text-slate-500 dark:text-slate-400">{t('orders:method')}</span>
                      <div className="mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {order.shippingMethod}
                        </Badge>
                      </div>
                    </div>
                  )}
                  
                  {order.shippedAt && (
                    <div data-testid="text-shipped-at">
                      <span className="text-slate-500 dark:text-slate-400">{t('orders:shippedAt')}</span>
                      <p className="font-medium text-slate-900 dark:text-slate-100 mt-1">
                        {new Date(order.shippedAt).toLocaleString()}
                      </p>
                    </div>
                  )}

                  {/* Carton Information */}
                  {orderCartons && orderCartons.length > 0 && (
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-700" data-testid="section-cartons">
                      <div className="flex items-center gap-2 mb-3">
                        <Package className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                        <span className="text-slate-500 dark:text-slate-400 font-medium">
                          {t('orders:cartons')}: {orderCartons.length} {orderCartons.length === 1 ? t('orders:box') : t('orders:boxes')}
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
                                {t('orders:cartonNumber', { number: carton.cartonNumber })}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {carton.cartonType === 'company' ? t('orders:companyBox') : t('orders:nonCompany')}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {carton.weight && (
                                <div>
                                  <span className="text-slate-500 dark:text-slate-400">{t('orders:totalWeight')}</span>
                                  <p className="font-medium text-slate-900 dark:text-slate-100">
                                    {parseFloat(carton.weight).toFixed(2)} kg
                                  </p>
                                </div>
                              )}
                              {carton.payloadWeightKg && (
                                <div>
                                  <span className="text-slate-500 dark:text-slate-400">{t('orders:itemsWeight')}</span>
                                  <p className="font-medium text-slate-900 dark:text-slate-100">
                                    {parseFloat(carton.payloadWeightKg).toFixed(2)} kg
                                  </p>
                                </div>
                              )}
                              {(carton.innerLengthCm || carton.innerWidthCm || carton.innerHeightCm) && (
                                <div className="col-span-2">
                                  <span className="text-slate-500 dark:text-slate-400">{t('orders:dimensions')}</span>
                                  <p className="font-medium text-slate-900 dark:text-slate-100">
                                    {carton.innerLengthCm ? parseFloat(carton.innerLengthCm).toFixed(1) : '?'} × {carton.innerWidthCm ? parseFloat(carton.innerWidthCm).toFixed(1) : '?'} × {carton.innerHeightCm ? parseFloat(carton.innerHeightCm).toFixed(1) : '?'} cm
                                  </p>
                                </div>
                              )}
                              {carton.trackingNumber && (
                                <div className="col-span-2">
                                  <span className="text-slate-500 dark:text-slate-400">{t('orders:tracking')}</span>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <code className="text-xs bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded font-mono">
                                      {carton.trackingNumber}
                                    </code>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6"
                                          onClick={() => {
                                            const carrier = order.shippingMethod || 'ppl';
                                            const trackingUrl = getCarrierTrackingUrl(carrier, carton.trackingNumber);
                                            if (trackingUrl) {
                                              navigator.clipboard.writeText(trackingUrl);
                                              toast({ title: t('orders:trackingUrlCopied'), description: t('orders:trackingUrlCopiedDesc') });
                                            } else {
                                              copyToClipboard(carton.trackingNumber, "Tracking number");
                                            }
                                          }}
                                        >
                                          <Copy className="h-3 w-3" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>{t('orders:copyTrackingUrl')}</TooltipContent>
                                    </Tooltip>
                                    {getCarrierTrackingUrl(order.shippingMethod || 'ppl', carton.trackingNumber) && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={() => {
                                              const trackingUrl = getCarrierTrackingUrl(order.shippingMethod || 'ppl', carton.trackingNumber);
                                              if (trackingUrl) window.open(trackingUrl, '_blank', 'noopener,noreferrer');
                                            }}
                                          >
                                            <ExternalLink className="h-3 w-3" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>{t('orders:openTrackingPage')}</TooltipContent>
                                      </Tooltip>
                                    )}
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
                            <span className="font-medium text-slate-700 dark:text-slate-300">{t('orders:totalShipmentWeight')}</span>
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
                    {t('orders:billingAddress')}
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
                      <p>{getLocalizedCountryName(order.customer.billingCountry, i18n.language as SupportedLanguage)}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Warehouse Location - Compact */}
              {order.warehouseLocation && (
                <div className="border-l-4 border-slate-200 dark:border-slate-700 pl-4" data-testid="section-warehouse-location">
                  <h4 className="font-semibold text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2 mb-2">
                    <Package className="h-3.5 w-3.5" />
                    {t('orders:fulfillmentLocation')}
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
                  {t('orders:filesSent')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Product Documents */}
                {productFiles && productFiles.length > 0 && (
                  <Collapsible open={isProductDocsOpen} onOpenChange={setIsProductDocsOpen}>
                    <CollapsibleTrigger className="w-full">
                      <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2 cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                        <Package className="h-4 w-4" />
                        {t('orders:productDocuments')} ({productFiles.length})
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
                        {t('orders:uploadedFiles')} ({orderFiles.length})
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
                        {t('orders:shippingLabels')} ({shipmentLabels.filter((label: any) => label.status !== 'cancelled').length})
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
                              {t('orders:shippingLabelCarrier', { carrier: label.carrier?.toUpperCase() || t('orders:carrierUnknown') })}
                            </p>
                            {label.trackingNumbers && label.trackingNumbers.length > 0 && (
                              <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                <Hash className="h-3 w-3 text-emerald-700 dark:text-emerald-300" />
                                {label.trackingNumbers.some((tn: string) => tn.startsWith('PENDING-')) ? (
                                  <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                                    {t('orders:pendingTrackingNumber')}
                                  </span>
                                ) : (
                                  <>
                                    <span className="text-xs text-emerald-700 dark:text-emerald-300">
                                      {label.trackingNumbers.join(', ')}
                                    </span>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-5 w-5"
                                          onClick={() => {
                                            const trackingUrl = getCarrierTrackingUrl(label.carrier, label.trackingNumbers[0]);
                                            if (trackingUrl) {
                                              navigator.clipboard.writeText(trackingUrl);
                                              toast({ title: t('orders:trackingUrlCopied'), description: t('orders:trackingUrlCopiedDesc') });
                                            } else {
                                              copyToClipboard(label.trackingNumbers[0], "Tracking number");
                                            }
                                          }}
                                        >
                                          <Copy className="h-3 w-3" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>{t('orders:copyTrackingUrl')}</TooltipContent>
                                    </Tooltip>
                                    {getCarrierTrackingUrl(label.carrier, label.trackingNumbers[0]) && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-5 w-5"
                                            onClick={() => {
                                              const trackingUrl = getCarrierTrackingUrl(label.carrier, label.trackingNumbers[0]);
                                              if (trackingUrl) window.open(trackingUrl, '_blank', 'noopener,noreferrer');
                                            }}
                                          >
                                            <ExternalLink className="h-3 w-3" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>{t('orders:openTrackingPage')}</TooltipContent>
                                      </Tooltip>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                              {new Date(label.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          {label.carrier === 'PPL' && label.trackingNumbers?.some((tn: string) => tn.startsWith('PENDING-')) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                              onClick={async () => {
                                try {
                                  const response = await apiRequest('POST', `/api/orders/${order.id}/ppl/refresh-tracking`);
                                  const result = await response.json();
                                  if (result.updated > 0) {
                                    toast({
                                      title: t('orders:trackingUpdated'),
                                      description: t('orders:trackingNumbersReceived'),
                                    });
                                    queryClient.invalidateQueries({ queryKey: [`/api/orders/${order.id}/shipment-labels`] });
                                    queryClient.invalidateQueries({ queryKey: [`/api/orders/${order.id}/tracking`] });
                                  } else {
                                    toast({
                                      title: t('orders:trackingPending'),
                                      description: t('orders:trackingNotYetAvailable'),
                                    });
                                  }
                                } catch (error: any) {
                                  toast({
                                    variant: 'destructive',
                                    title: t('orders:refreshFailed'),
                                    description: error.message || t('orders:failedToRefreshTracking'),
                                  });
                                }
                              }}
                              data-testid={`button-refresh-ppl-tracking-${label.id}`}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}
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
            <Suspense fallback={<TrackingPanelSkeleton />}>
              <OrderTrackingPanel orderId={order.id} />
            </Suspense>
          )}

          {/* Pick & Pack Activity Logs */}
          {pickPackLogs && pickPackLogs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="h-4 w-4" />
                  {t('orders:pickPackLogs')}
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
                          {log.activityType === 'pick_start' && t('orders:pickingStarted')}
                          {log.activityType === 'item_picked' && t('orders:pickedItem', { product: log.productName || 'Item' })}
                          {log.activityType === 'pick_complete' && t('orders:pickingCompleted')}
                          {log.activityType === 'pack_start' && t('orders:packingStarted')}
                          {log.activityType === 'item_packed' && t('orders:packedItem', { product: log.productName || 'Item' })}
                          {log.activityType === 'pack_complete' && t('orders:packingCompleted')}
                        </p>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {new Date(log.timestamp).toLocaleString()}
                          {log.userName && ` • ${log.userName}`}
                          {log.quantity && ` • ${t('orders:qtyColon')} ${log.quantity}`}
                          {log.location && ` • ${t('orders:loc')} ${log.location}`}
                        </div>
                        {log.notes && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{log.notes}</p>
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
                  {t('orders:customerInformation')}
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
                      className="h-6 w-6 p-0 text-slate-300 dark:text-slate-600 hover:text-slate-700 dark:hover:text-slate-300 transition-all opacity-50 hover:opacity-100"
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
                      <Mail className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                      <a href={`mailto:${order.customer.email}`} className="text-blue-600 hover:underline">
                        {order.customer.email}
                      </a>
                    </div>
                  )}
                  {order.customer.shippingTel && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                      <a href={`tel:${order.customer.shippingTel}`} className="text-blue-600 hover:underline">
                        {order.customer.shippingTel}
                      </a>
                    </div>
                  )}
                  {order.customer.facebookId && (
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                      <a 
                        href={`https://messenger.com/t/${order.customer.facebookId}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-blue-600 hover:underline"
                      >
                        {t('orders:message')}
                      </a>
                    </div>
                  )}
                  {(order.customer.shippingStreet || order.customer.shippingCity) && (
                    <div className="flex items-start gap-2 mt-3">
                      <MapPin className="h-4 w-4 text-slate-400 dark:text-slate-500 mt-0.5" />
                      <div className="text-slate-600 dark:text-slate-400">
                        {order.customer.shippingStreet && <p>{order.customer.shippingStreet}</p>}
                        {(order.customer.shippingCity || order.customer.state || order.customer.shippingZipCode) && (
                          <p>
                            {[order.customer.shippingCity, order.customer.state, order.customer.shippingZipCode].filter(Boolean).join(', ')}
                          </p>
                        )}
                        {order.customer.shippingCountry && <p>{getLocalizedCountryName(order.customer.shippingCountry, i18n.language as SupportedLanguage)}</p>}
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
                {t('orders:supportTickets')}
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
                <div className="text-center py-6 text-sm text-slate-500 dark:text-slate-400">
                  <p>{t('orders:noTicketsForThisOrder')}</p>
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
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">{ticket.description || ticket.title}</p>
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
                {t('orders:orderProgress')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Compact Order Tracking - shown only when shipped and tracking enabled */}
                {order.shippedAt && enableTracking && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-sky-500 rounded-full mt-1.5"></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-sm">{t('orders:trackingInformation')}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2"
                          onClick={() => refreshTrackingMutation.mutate()}
                          disabled={refreshTrackingMutation.isPending}
                          data-testid="button-refresh-tracking-compact"
                        >
                          <RefreshCw className={`h-3 w-3 ${refreshTrackingMutation.isPending ? 'animate-spin' : ''}`} />
                        </Button>
                      </div>
                      
                      {isTrackingLoading ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">{t('orders:loadingTrackingInfo')}</p>
                      ) : !trackingData || trackingData.length === 0 ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">{t('orders:noTrackingInfo')}</p>
                      ) : (
                        <div className="space-y-2">
                          {trackingData.map((shipment: any) => {
                            const config = trackingStatusConfig[shipment.statusCode as keyof typeof trackingStatusConfig] || trackingStatusConfig.unknown;
                            const StatusIcon = config.icon;
                            const trackingUrl = getTrackingUrl(shipment.carrier, shipment.trackingNumber);
                            
                            return (
                              <div key={shipment.id} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-md space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="secondary" className="text-xs font-mono">
                                    {shipment.carrier?.toUpperCase()}
                                  </Badge>
                                  <span className="text-xs font-mono text-slate-600 dark:text-slate-300">
                                    {shipment.trackingNumber}
                                  </span>
                                  {trackingUrl && (
                                    <a
                                      href={trackingUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                      data-testid={`link-tracking-${shipment.id}`}
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <StatusIcon className={`h-3.5 w-3.5 ${config.color}`} />
                                  <span className={`font-medium ${config.color}`}>
                                    {shipment.statusLabel}
                                  </span>
                                </div>
                                {shipment.lastEventAt && (
                                  <p className="text-xs text-slate-400">
                                    {new Date(shipment.lastEventAt).toLocaleString()}
                                  </p>
                                )}
                                {shipment.errorState && (
                                  <p className="text-xs text-red-500 flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    {shipment.errorState}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {order.shippedAt && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-1.5"></div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{t('orders:orderShippedTimeline')}</p>
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
                      <p className="font-medium text-sm">{t('orders:readyToShipTimeline')}</p>
                      <p className="text-sm text-slate-500">
                        {order.packEndTime ? new Date(order.packEndTime).toLocaleString() : t('orders:awaitingShipment')}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Packing Completed */}
                {order.packEndTime && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full mt-1.5"></div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{t('orders:packingCompletedTimeline')}</p>
                      <p className="text-sm text-slate-500">
                        {new Date(order.packEndTime).toLocaleString()}
                        {order.packStartTime && order.packEndTime && (
                          <span className="text-indigo-600 font-medium ml-2">
                            ({t('orders:duration')}: {(() => {
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
                      <p className="font-medium text-sm">{t('orders:packingStartedTimeline')}</p>
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
                      <p className="font-medium text-sm">{t('orders:pickingCompletedTimeline')}</p>
                      <p className="text-sm text-slate-500">
                        {new Date(order.pickEndTime).toLocaleString()}
                        {order.pickStartTime && order.pickEndTime && (
                          <span className="text-purple-600 font-medium ml-2">
                            ({t('orders:duration')}: {(() => {
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
                      <p className="font-medium text-sm">{t('orders:pickingStartedTimeline')}</p>
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
                      <p className="font-medium text-sm">{t('orders:paymentReceived')}</p>
                      <p className="text-sm text-slate-500">
                        {new Date(order.updatedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{t('orders:orderCreatedTimeline')}</p>
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
                  {t('orders:attachments')}
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
                  {t('orders:viewAttachment')}
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
            <DialogTitle>{t('orders:createReturnTicket')}</DialogTitle>
            <DialogDescription>
              {t('orders:selectItemsToReturn', { orderId: order?.orderId })}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Order Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div>
                <Label className="text-sm text-slate-600 dark:text-slate-400">{t('orders:orderIdLabel')}</Label>
                <p className="font-medium">{order?.orderId}</p>
              </div>
              <div>
                <Label className="text-sm text-slate-600 dark:text-slate-400">{t('orders:customerLabel')}</Label>
                <p className="font-medium">{order?.customer?.name}</p>
              </div>
              <div>
                <Label className="text-sm text-slate-600 dark:text-slate-400">{t('orders:orderDateLabel')}</Label>
                <p className="font-medium">
                  {order?.createdAt && formatDate(order.createdAt)}
                </p>
              </div>
              <div>
                <Label className="text-sm text-slate-600 dark:text-slate-400">{t('orders:totalAmountLabel')}</Label>
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
              <Label className="font-medium">{t('orders:selectAllItems')}</Label>
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
                          <p className="text-sm text-slate-500 dark:text-slate-400">{t('orders:skuColon')} {item.sku}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {t('orders:priceColon')} {formatCurrency(item.price || 0, order?.currency || 'EUR')} × {item.quantity}
                          </p>
                        </div>
                        {selectedItems.has(item.id) && (
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2 sm:mt-0">
                            <Label className="text-sm">{t('orders:returnQty')}</Label>
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
                              <span className="text-sm text-slate-500">{t('orders:of')} {item.quantity}</span>
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
              <Label htmlFor="return-reason">{t('orders:returnReason')}</Label>
              <Textarea
                id="return-reason"
                placeholder={t('orders:pleaseProvideReturnReason')}
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            {/* Return Summary */}
            {selectedItems.size > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="font-medium text-amber-900 mb-2">{t('orders:returnSummary')}</p>
                <p className="text-sm text-amber-700">
                  {t('orders:returning')} {selectedItems.size} {t('orders:itemsWithTotal')}{' '}
                  {Object.values(returnQuantities).reduce((sum, qty) => sum + qty, 0)} {t('orders:units')}
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  {t('orders:totalReturnValue')}{' '}
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
              {t('orders:cancel')}
            </Button>
            <Button 
              onClick={() => {
                if (selectedItems.size === 0) {
                  toast({
                    title: t('orders:noItemsSelected'),
                    description: t('orders:noItemsSelectedDesc'),
                    variant: "destructive",
                  });
                  return;
                }
                
                if (!returnReason.trim()) {
                  toast({
                    title: t('orders:reasonRequired'),
                    description: t('orders:reasonRequiredDesc'),
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
              {t('orders:createReturnTicket')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Price Dialog */}
      <Dialog open={showCustomPriceDialog} onOpenChange={setShowCustomPriceDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('orders:createCustomPrice')}</DialogTitle>
            <DialogDescription>
              {t('orders:setForCustomer', { product: selectedPriceItem?.productName, customer: order?.customer?.name })}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Product Info */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <p className="font-medium">{selectedPriceItem?.productName}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">{t('orders:skuColon')} {selectedPriceItem?.sku}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t('orders:currentPrice')} {formatCurrency(selectedPriceItem?.price || 0, order?.currency || 'EUR')}
              </p>
            </div>

            {/* Custom Price Input */}
            <div className="space-y-2">
              <Label htmlFor="customPrice">{t('orders:customPrice')} ({order?.currency || 'EUR'})</Label>
              <Input
                id="customPrice"
                type="number"
                step="0.01"
                min="0"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                placeholder={t('orders:enterCustomPrice')}
              />
            </div>

            {/* Valid From Date */}
            <div className="space-y-2">
              <Label htmlFor="validFrom">{t('orders:validFrom')}</Label>
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
              <Label htmlFor="validTo">{t('orders:validToOptional')}</Label>
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
              <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-300">{t('orders:priceComparison')}</p>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{t('orders:originalPrice')}</span>
                    <span>{formatCurrency(selectedPriceItem?.price || 0, order?.currency || 'EUR')}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium">
                    <span>{t('orders:customPriceLabel')}</span>
                    <span className="text-blue-600">
                      {formatCurrency(parseFloat(customPrice) || 0, order?.currency || 'EUR')}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t('orders:difference')}</span>
                    <span className={parseFloat(customPrice) < (selectedPriceItem?.price || 0) ? "text-green-600" : "text-red-600"}>
                      {formatCurrency(Math.abs((selectedPriceItem?.price || 0) - parseFloat(customPrice)), order?.currency || 'EUR')}
                      {parseFloat(customPrice) < (selectedPriceItem?.price || 0) ? ` ${t('orders:less')}` : ` ${t('orders:more')}`}
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
              {t('orders:cancel')}
            </Button>
            <Button 
              onClick={async () => {
                if (!customPrice || !priceValidFrom) {
                  toast({
                    title: t('orders:missingInformation'),
                    description: t('orders:missingInformationDesc'),
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
                    title: t('common:success'),
                    description: t('orders:customPriceCreated', { product: selectedPriceItem?.productName }),
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
                    title: t('common:error'),
                    description: t('orders:customPriceError'),
                    variant: "destructive",
                  });
                }
              }}
              disabled={!customPrice || !priceValidFrom}
            >
              {t('orders:createCustomPrice')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Capture Preview Modal */}
      <Dialog open={showCapturePreview} onOpenChange={setShowCapturePreview}>
        <DialogContent className="max-w-[520px] max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="text-center">{t('orders:capturePreview')}</DialogTitle>
            <DialogDescription className="text-center text-sm">
              {t('orders:capturePreviewDesc')}
            </DialogDescription>
          </DialogHeader>
          
          {/* Quick Controls - Toggle and Download */}
          <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-y border-slate-200" data-hide-in-screenshot>
            <div className="flex items-center gap-2">
              <Switch 
                id="compact-mode" 
                checked={compactCaptureMode} 
                onCheckedChange={setCompactCaptureMode}
              />
              <Label htmlFor="compact-mode" className="text-sm font-medium cursor-pointer">
                Compact {(order?.items?.length || 0) >= 10 && <span className="text-xs text-slate-500">(auto for {order?.items?.length}+ items)</span>}
              </Label>
            </div>
            <Button onClick={handleCaptureDownload} size="sm" className="gap-1.5">
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>
          
          {/* Invoice Preview - This is what gets captured */}
          <div className="flex justify-center pb-4 px-2 sm:px-4">
            <div 
              ref={capturePreviewRef}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-lg w-full max-w-[460px]"
            >
              {/* Header */}
              <div className="p-3 sm:p-5 bg-gradient-to-br from-slate-50 to-slate-100 border-b-2 border-slate-200">
                <div className="flex justify-center mb-2 sm:mb-4">
                  <img src={logoPath} alt="Logo" className="h-8 sm:h-12 object-contain" />
                </div>
                <div className="text-center">
                  <div className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                    {order?.orderId || order?.id}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1">
                    {order?.createdAt 
                      ? new Date(order.createdAt).toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric' })
                      : ''}
                  </div>
                </div>
              </div>
              
              {/* Table Header */}
              <div className={`grid px-3 sm:px-4 py-2 bg-slate-50 border-b border-slate-200 ${compactCaptureMode ? 'grid-cols-[48px_1fr_auto]' : 'grid-cols-[1fr_auto]'}`}>
                {compactCaptureMode && <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide text-center">SL</span>}
                <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wide">SẢN PHẨM</span>
                <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">THÀNH TIỀN</span>
              </div>
              
              {/* Items - Compact or Normal mode */}
              {compactCaptureMode ? (
                /* Compact Mode - No images, clean table layout */
                <div>
                  {(() => {
                    // Extract variant name from full product name (e.g., "Product - Variant" -> "Variant")
                    const extractVariant = (name: string): string | null => {
                      const match = name.match(/[-–—]\s*([^-–—]+)$/);
                      return match ? match[1].trim() : null;
                    };
                    
                    // Extract parent name (e.g., "Product - Variant" -> "Product")
                    const extractParent = (name: string): string => {
                      const match = name.match(/^(.+?)\s*[-–—]/);
                      return match ? match[1].trim() : name;
                    };
                    
                    const allItems = order?.items || [];
                    const paidItems = allItems.filter((item: any) => {
                      const unitPrice = parseFloat(item.unitPrice) || parseFloat(item.price) || 0;
                      return unitPrice > 0;
                    });
                    const freeItems = allItems.filter((item: any) => {
                      const unitPrice = parseFloat(item.unitPrice) || parseFloat(item.price) || 0;
                      return unitPrice === 0 && item.quantity > 0;
                    });
                    
                    // Group paid items by productId (parent product)
                    const grouped = paidItems.reduce((acc: any, item: any) => {
                      const groupKey = item.productId || item.productName || 'unknown';
                      const parentName = extractParent(item.productName || '');
                      const variantName = extractVariant(item.productName || '');
                      
                      if (!acc[groupKey]) {
                        acc[groupKey] = { 
                          name: parentName, 
                          totalQty: 0, 
                          totalPrice: 0, 
                          totalDiscount: 0, 
                          variantDetails: [] as { name: string; qty: number }[] 
                        };
                      }
                      acc[groupKey].totalQty += item.quantity || 0;
                      acc[groupKey].totalPrice += ((item.unitPrice || item.price || 0) * (item.quantity || 0));
                      acc[groupKey].totalDiscount += (item.discount || 0);
                      if (variantName) {
                        acc[groupKey].variantDetails.push({ name: variantName, qty: item.quantity || 1 });
                      }
                      return acc;
                    }, {});
                    
                    // Group free items by productId
                    const freeGrouped = freeItems.reduce((acc: any, item: any) => {
                      const groupKey = item.productId || item.productName || 'unknown';
                      const parentName = extractParent(item.productName || '');
                      const variantName = extractVariant(item.productName || '');
                      
                      if (!acc[groupKey]) {
                        acc[groupKey] = { name: parentName, totalQty: 0, variantDetails: [] as { name: string; qty: number }[] };
                      }
                      acc[groupKey].totalQty += item.quantity || 0;
                      if (variantName) {
                        acc[groupKey].variantDetails.push({ name: variantName, qty: item.quantity || 1 });
                      }
                      return acc;
                    }, {});
                    
                    const paidRows = Object.values(grouped).map((group: any, idx: number) => {
                      const finalPrice = group.totalPrice - group.totalDiscount;
                      return (
                        <div key={`paid-${idx}`} className="grid grid-cols-[48px_1fr_auto] px-3 py-2 items-start border-b border-slate-100 last:border-b-0">
                          <span className="text-base font-bold text-slate-900 text-center">{group.totalQty}</span>
                          <div className="min-w-0 pl-1">
                            <span className="text-sm font-medium text-slate-900 leading-snug">{group.name}</span>
                            {group.variantDetails.length > 0 && (
                              <div className="text-[10px] text-slate-500 leading-snug mt-0.5">
                                {[...group.variantDetails]
                                  .sort((a, b) => (parseInt(a.name) || 999999) - (parseInt(b.name) || 999999))
                                  .map((v: { name: string; qty: number }) => v.qty > 1 ? `${v.qty}×${v.name}` : v.name)
                                  .join(', ')}
                              </div>
                            )}
                          </div>
                          <div className="text-right whitespace-nowrap pl-2">
                            {group.totalDiscount > 0 ? (
                              <span className="text-sm font-bold text-green-700">{formatCurrency(finalPrice, order?.currency || 'EUR')}</span>
                            ) : (
                              <span className="text-sm font-bold text-slate-900">{formatCurrency(group.totalPrice, order?.currency || 'EUR')}</span>
                            )}
                          </div>
                        </div>
                      );
                    });
                    
                    const freeRows = Object.values(freeGrouped).map((group: any, idx: number) => (
                      <div key={`free-${idx}`} className="grid grid-cols-[48px_1fr_auto] px-3 py-2 items-center bg-green-50 border-b border-green-100 last:border-b-0">
                        <span className="text-base font-bold text-green-700 text-center">{group.totalQty}</span>
                        <span className="text-sm font-medium text-green-800 leading-snug pl-1">{group.name}</span>
                        <span className="text-xs font-bold text-green-700 bg-green-200 px-1.5 py-0.5 rounded ml-2">FREE</span>
                      </div>
                    ));
                    
                    return [...paidRows, ...freeRows];
                  })()}
                </div>
              ) : (
              /* Normal Mode - With images */
              <div className="divide-y divide-slate-100">
                {(() => {
                  const getParentAndVariant = (name: string): { parent: string; variant: string | null } => {
                    const match = name.match(/^(.+?)\s*[-–—]\s*(.+)$/);
                    if (match) {
                      return { parent: match[1].trim(), variant: match[2].trim() };
                    }
                    return { parent: name, variant: null };
                  };
                  
                  // Separate paid items and free items
                  const allItems = order?.items || [];
                  const paidItems = allItems.filter((item: any) => {
                    const unitPrice = parseFloat(item.unitPrice) || parseFloat(item.price) || 0;
                    return unitPrice > 0;
                  });
                  const freeItems = allItems.filter((item: any) => {
                    const unitPrice = parseFloat(item.unitPrice) || parseFloat(item.price) || 0;
                    return unitPrice === 0 && item.quantity > 0;
                  });
                  
                  // Group paid items by parent name
                  const grouped = paidItems.reduce((acc: any, item: any) => {
                    const { parent: parentName, variant } = getParentAndVariant(item.productName || '');
                    if (!acc[parentName]) {
                      acc[parentName] = { 
                        name: parentName, 
                        totalQty: 0, 
                        totalPrice: 0, 
                        totalDiscount: 0,
                        image: item.image,
                        isService: !!item.serviceId,
                        variantCount: 0,
                        variantDetails: [] as { name: string; qty: number }[],
                        discountLabel: null
                      };
                    }
                    acc[parentName].totalQty += item.quantity || 0;
                    acc[parentName].totalPrice += ((item.unitPrice || item.price || 0) * (item.quantity || 0));
                    acc[parentName].totalDiscount += (item.discount || 0);
                    acc[parentName].variantCount += 1;
                    if (variant) {
                      acc[parentName].variantDetails.push({ name: variant, qty: item.quantity || 1 });
                    }
                    if (!acc[parentName].image && item.image) acc[parentName].image = item.image;
                    // Capture discount label (e.g., "BỘT MUA 5 TẶNG 1")
                    if (item.appliedDiscountLabel && !acc[parentName].discountLabel) {
                      acc[parentName].discountLabel = item.appliedDiscountLabel;
                    }
                    return acc;
                  }, {});
                  
                  // Group free items by parent name
                  const freeGrouped = freeItems.reduce((acc: any, item: any) => {
                    const { parent: parentName, variant } = getParentAndVariant(item.productName || '');
                    if (!acc[parentName]) {
                      acc[parentName] = { 
                        name: parentName, 
                        totalQty: 0, 
                        image: item.image,
                        isService: !!item.serviceId,
                        variantCount: 0,
                        variantDetails: [] as { name: string; qty: number }[],
                        discountLabel: item.appliedDiscountLabel || null
                      };
                    }
                    acc[parentName].totalQty += item.quantity || 0;
                    acc[parentName].variantCount += 1;
                    if (variant) {
                      acc[parentName].variantDetails.push({ name: variant, qty: item.quantity || 1 });
                    }
                    if (!acc[parentName].image && item.image) acc[parentName].image = item.image;
                    return acc;
                  }, {});
                  
                  const paidRows = Object.values(grouped).map((group: any, idx: number) => {
                    const finalPrice = group.totalPrice - group.totalDiscount;
                    const rawDiscountPercent = group.totalPrice > 0 ? (group.totalDiscount / group.totalPrice * 100) : 0;
                    const discountPercent = rawDiscountPercent % 1 === 0 ? rawDiscountPercent.toFixed(0) : rawDiscountPercent.toFixed(2).replace(/\.?0+$/, '');
                    
                    return (
                      <div key={`paid-${idx}`} className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-2 sm:py-3">
                        <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {group.image ? (
                            <img src={group.image} alt={group.name} className="w-full h-full object-contain" />
                          ) : group.isService ? (
                            <Wrench className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
                          ) : (
                            <Package className="h-4 w-4 sm:h-5 sm:w-5 text-slate-300" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-900 text-sm leading-tight line-clamp-2">{group.name}</div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            <span className="font-extrabold text-slate-900">{group.totalQty}</span>
                            {group.totalQty > 0 && group.totalPrice > 0 && (
                              <span className="text-slate-500"> × {formatCurrency(group.totalPrice / group.totalQty, order?.currency || 'EUR')}</span>
                            )}
                          </div>
                          {group.variantDetails && group.variantDetails.length > 0 && (
                            <div className="text-[10px] text-black mt-0.5 leading-tight font-medium">
                              {[...group.variantDetails]
                                .sort((a, b) => (parseInt(a.name) || 999999) - (parseInt(b.name) || 999999))
                                .map((v: { name: string; qty: number }) => 
                                  v.qty > 1 ? `${v.qty}×${v.name}` : v.name
                                ).join(', ')}
                            </div>
                          )}
                          {group.discountLabel && (
                            <div className="mt-1">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700 border border-green-200">
                                <Gift className="h-3 w-3" />
                                {group.discountLabel}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <div className="text-right flex flex-col items-end flex-shrink-0">
                          {group.totalDiscount > 0 ? (
                            <>
                              <span className="text-xs text-slate-400 relative inline-block whitespace-nowrap">
                                {formatCurrency(group.totalPrice, order?.currency || 'EUR')}
                                <span className="absolute left-0 right-0 top-1/2 bg-slate-400" style={{ height: '1px', transform: 'translateY(-50%)' }} />
                              </span>
                              <span className="text-xs text-green-600 font-semibold whitespace-nowrap">-{discountPercent}%</span>
                              <span className="text-base font-bold text-slate-900 whitespace-nowrap">{formatCurrency(finalPrice, order?.currency || 'EUR')}</span>
                            </>
                          ) : (
                            <span className="text-base font-bold text-slate-900 whitespace-nowrap">{formatCurrency(group.totalPrice, order?.currency || 'EUR')}</span>
                          )}
                        </div>
                      </div>
                    );
                  });
                  
                  // Render free items with special styling
                  const freeRows = Object.values(freeGrouped).map((group: any, idx: number) => (
                    <div key={`free-${idx}`} className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-2 sm:py-3 bg-green-50">
                      <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg border-2 border-green-300 bg-green-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {group.image ? (
                          <img src={group.image} alt={group.name} className="w-full h-full object-contain" />
                        ) : (
                          <Gift className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-green-800 text-sm leading-tight line-clamp-2">{group.name}</div>
                        <div className="text-xs text-green-600 mt-0.5">
                          <span className="font-extrabold">{group.totalQty}</span>
                        </div>
                        {group.variantDetails && group.variantDetails.length > 0 && (
                          <div className="text-[10px] text-black mt-0.5 leading-tight font-medium">
                            {[...group.variantDetails]
                              .sort((a, b) => (parseInt(a.name) || 999999) - (parseInt(b.name) || 999999))
                              .map((v: { name: string; qty: number }) => 
                                v.qty > 1 ? `${v.qty}×${v.name}` : v.name
                              ).join(', ')}
                          </div>
                        )}
                        {group.discountLabel && (
                          <div className="text-[10px] text-green-600 mt-0.5">{group.discountLabel}</div>
                        )}
                      </div>
                      
                      <div className="text-right flex flex-col items-end flex-shrink-0">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-green-200 text-green-800 border border-green-300">
                          <Gift className="h-3 w-3" />
                          FREE
                        </span>
                      </div>
                    </div>
                  ));
                  
                  return [...paidRows, ...freeRows];
                })()}
              </div>
              )}
              
              {/* Pricing Summary */}
              <div className="bg-slate-50 border-t-2 border-slate-200 px-3 sm:px-5 py-3 sm:py-4">
                {(() => {
                  const totalItemDiscounts = order?.items?.reduce((sum: number, item: any) => sum + (parseFloat(item.discount) || 0), 0) || 0;
                  const merchandiseTotal = order?.items?.reduce((sum: number, item: any) => {
                    return sum + ((parseFloat(item.unitPrice) || parseFloat(item.price) || 0) * (item.quantity || 0));
                  }, 0) || 0;
                  
                  return (
                    <>
                      {totalItemDiscounts > 0 && (
                        <>
                          <div className="flex justify-between py-1.5">
                            <span className="text-sm text-slate-500 font-medium">Tổng hàng hóa</span>
                            <span className="text-sm font-semibold text-slate-900">{formatCurrency(merchandiseTotal, order?.currency || 'EUR')}</span>
                          </div>
                          <div className="flex justify-between py-1.5">
                            <span className="text-sm text-green-600 font-medium">Tiết kiệm khuyến mãi</span>
                            <span className="text-sm font-semibold text-green-600">-{formatCurrency(totalItemDiscounts, order?.currency || 'EUR')}</span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between py-1.5">
                        <span className="text-sm text-slate-500 font-medium">Tạm tính</span>
                        <span className="text-sm font-semibold text-slate-900">{formatCurrency(order?.subtotal || 0, order?.currency || 'EUR')}</span>
                      </div>
                      {order?.discountValue > 0 && (
                        <div className="flex justify-between py-1.5">
                          <span className="text-sm text-green-600 font-medium">
                            Giảm giá {order.discountType === 'rate' ? `(${order.discountValue}%)` : ''}
                          </span>
                          <span className="text-sm font-semibold text-green-600">
                            -{formatCurrency(
                              order.discountType === 'rate' 
                                ? (order.subtotal * order.discountValue / 100) 
                                : order.discountValue || 0, 
                              order?.currency || 'EUR'
                            )}
                          </span>
                        </div>
                      )}
                      {order?.taxAmount > 0 && (
                        <div className="flex justify-between py-1.5">
                          <span className="text-sm text-slate-500 font-medium">Thuế ({order.taxRate}%)</span>
                          <span className="text-sm font-semibold text-slate-900">{formatCurrency(order.taxAmount, order?.currency || 'EUR')}</span>
                        </div>
                      )}
                      {order?.shippingCost > 0 && (
                        <div className="flex justify-between py-1.5">
                          <span className="text-sm text-slate-500 font-medium">Phí vận chuyển</span>
                          <span className="text-sm font-semibold text-slate-900">{formatCurrency(order.shippingCost, order?.currency || 'EUR')}</span>
                        </div>
                      )}
                      {order?.adjustment != null && Number(order.adjustment) !== 0 && (
                        <div className="flex justify-between py-1.5">
                          <span className={cn("text-sm font-medium", order.adjustment > 0 ? "text-blue-600" : "text-orange-600")}>
                            Điều chỉnh
                          </span>
                          <span className={cn("text-sm font-semibold", order.adjustment > 0 ? "text-blue-600" : "text-orange-600")}>
                            {order.adjustment > 0 ? '+' : ''}{formatCurrency(order.adjustment, order?.currency || 'EUR')}
                          </span>
                        </div>
                      )}
                      <div className="border-t-2 border-slate-300 my-2" />
                      <div className="flex justify-between py-2">
                        <span className="text-lg font-bold text-slate-900">Tổng cộng</span>
                        <span className="text-xl font-extrabold text-slate-900">{formatCurrency(order?.grandTotal || 0, order?.currency || 'EUR')}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
          
          <DialogFooter className="p-4 pt-2 border-t">
            <Button variant="outline" onClick={() => setShowCapturePreview(false)}>
              {t('orders:cancel')}
            </Button>
            <Button onClick={handleCaptureDownload} className="gap-2">
              <Download className="h-4 w-4" />
              {t('orders:downloadImage')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Receipt Dialog - Mobile optimized */}
      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
        <DialogContent className="w-[95vw] max-w-lg p-3 sm:p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Receipt className="h-5 w-5 text-primary" />
              {t('financial:printReceipt', 'Print Receipt')}
            </DialogTitle>
          </DialogHeader>
          <OrderReceiptContent 
            order={order} 
            onClose={() => setShowReceiptDialog(false)} 
            companyInfo={companyInfo}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Order Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              {t('orders:deleteOrder', 'Delete Order')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('orders:deleteOrderConfirmation', 'Are you sure you want to delete order')} <strong>#{order?.orderId}</strong>?
              <br /><br />
              {(order?.pickStatus === 'completed' || order?.pickStatus === 'in_progress') && (
                <span className="text-amber-600 dark:text-amber-400">
                  {t('orders:inventoryWillBeRestored', 'Inventory will be restored to the original locations.')}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteOrderMutation.mutate()}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteOrderMutation.isPending}
            >
              {deleteOrderMutation.isPending ? t('common:deleting', 'Deleting...') : t('orders:deleteOrder', 'Delete Order')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}