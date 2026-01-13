import { useState, useEffect, useMemo, memo, useCallback, useRef } from "react";
import { useLongPress } from "@/hooks/useLongPress";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { usePageTitle } from "@/hooks/use-page-title";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { calculateSearchScore } from "@/lib/fuzzySearch";
import { formatCompactNumber } from "@/lib/currencyUtils";
import { useLocalization } from "@/contexts/LocalizationContext";
import { isUnauthorizedError } from "@/lib/authUtils";
import { getCountryFlag } from "@/lib/countries";
import { cn } from "@/lib/utils";
import { exportToXLSX, exportToPDF, type PDFColumn } from "@/lib/exportUtils";
import { Plus, Search, Filter, Download, FileDown, FileText, Edit, Trash2, Package, Eye, ChevronDown, ChevronUp, Settings, Check, List, AlignJustify, Star, Trophy, Award, Clock, ExternalLink, Gem, Medal, Sparkles, RefreshCw, Heart, AlertTriangle, TrendingUp, ArrowUp, ArrowDown, MoreVertical, ShoppingCart, DollarSign, Users, User, Zap, Truck, Upload, Undo2, X, Calendar, CalendarDays } from "lucide-react";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { format, startOfDay, endOfDay, subDays, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TrackingStatusBadge } from "@/components/orders/TrackingStatusBadge";
import { OrderItemsLoader } from "@/components/orders/OrderItemsLoader";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AllOrdersProps {
  filter?: string;
}

// Hook to manage daily high scores using Prague timezone
function useDailyHighScores(statistics: {
  totalOrders: number;
  totalRevenue: number;
  totalProfit: number;
  newCustomers: number;
  returningCustomers: number;
} | null) {
  const [highScores, setHighScores] = useState<Record<string, number>>({});

  // Get today's date in Prague timezone
  const getTodayDateKey = () => {
    const pragueDate = new Date().toLocaleString('en-US', { timeZone: 'Europe/Prague' });
    const date = new Date(pragueDate);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const dateKey = getTodayDateKey();

  // Fetch today's high scores
  const { data: settingsData } = useQuery({
    queryKey: ['/api/settings', 'daily_high_scores', dateKey],
    queryFn: async () => {
      const response = await fetch('/api/settings?category=daily_high_scores');
      if (!response.ok) throw new Error('Failed to fetch settings');
      return response.json();
    },
  });

  // Update high scores mutation
  const updateHighScoreMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: number }) => {
      return apiRequest('POST', '/api/settings', {
        key,
        value: String(value),
        category: 'daily_high_scores',
        description: `Daily high score for ${dateKey}`,
      });
    },
  });

  // Parse high scores from settings
  useEffect(() => {
    if (settingsData && Array.isArray(settingsData)) {
      const scores: Record<string, number> = {};
      settingsData.forEach((setting: any) => {
        if (setting.key.startsWith(`high_score_${dateKey}_`)) {
          const metric = setting.key.replace(`high_score_${dateKey}_`, '');
          scores[metric] = parseFloat(setting.value) || 0;
        }
      });
      setHighScores(scores);
    }
  }, [settingsData, dateKey]);

  // Update high scores when statistics change
  useEffect(() => {
    if (!statistics) return;

    const metrics = {
      totalOrders: statistics.totalOrders,
      totalRevenue: statistics.totalRevenue,
      totalProfit: statistics.totalProfit,
      totalCustomers: statistics.newCustomers + statistics.returningCustomers,
    };

    Object.entries(metrics).forEach(([metric, value]) => {
      const currentHigh = highScores[metric] || 0;
      if (value > currentHigh) {
        updateHighScoreMutation.mutate({
          key: `high_score_${dateKey}_${metric}`,
          value,
        });
        setHighScores(prev => ({ ...prev, [metric]: value }));
      }
    });
  }, [statistics, dateKey]);

  return highScores;
}

// Mobile Order Card with long-press selection support
interface MobileOrderCardProps {
  order: any;
  isSelectionMode: boolean;
  isSelected: boolean;
  onLongPress: () => void;
  onClick: () => void;
  onToggleSelection: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  formatCurrency: (amount: number, currency: string) => string;
  formatDate: (date: string | Date) => string;
  getStatusBadge: (status: string) => React.ReactNode;
  getPaymentStatusBadge: (status: string) => React.ReactNode;
  calculateOrderProfit: (order: any) => number;
  canAccessFinancialData: boolean;
  visibleColumns: Record<string, boolean>;
  t: (key: string) => string;
}

function MobileOrderCard({
  order,
  isSelectionMode,
  isSelected,
  onLongPress,
  onClick,
  onToggleSelection,
  isExpanded,
  onToggleExpand,
  formatCurrency,
  formatDate,
  getStatusBadge,
  getPaymentStatusBadge,
  calculateOrderProfit,
  canAccessFinancialData,
  visibleColumns,
  t
}: MobileOrderCardProps) {
  const longPressHandlers = useLongPress({
    onLongPress: () => {
      if (!isSelectionMode) {
        onLongPress();
      }
    },
    onClick: () => {
      onClick();
    },
    delay: 500,
    shouldPreventDefault: true
  });

  return (
    <div 
      className={cn(
        "bg-white dark:bg-slate-900 rounded-lg border p-2.5 transition-all",
        isSelectionMode && isSelected 
          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" 
          : "border-gray-100 dark:border-slate-800"
      )}
      {...longPressHandlers}
      data-testid={`card-order-${order.id}`}
    >
      {/* Row 1: Checkbox (if selection mode) + Order ID + Status + Total */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {isSelectionMode && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelection()}
              onClick={(e) => e.stopPropagation()}
              className="h-5 w-5 flex-shrink-0"
              data-testid={`checkbox-order-${order.id}`}
            />
          )}
          <span className="font-bold text-sm text-black dark:text-white">{order.orderId}</span>
          {getStatusBadge(order.orderStatus)}
          {getPaymentStatusBadge(order.paymentStatus)}
        </div>
        <span className="font-bold text-sm text-black dark:text-white flex-shrink-0">
          {formatCurrency(parseFloat(order.grandTotal || '0'), order.currency || 'EUR')}
        </span>
      </div>
      
      {/* Row 2: Customer + Date */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {order.customer?.country && (
            <span className="text-sm flex-shrink-0">{getCountryFlag(order.customer.country)}</span>
          )}
          {order.customer?.profilePictureUrl ? (
            <img 
              src={order.customer.profilePictureUrl} 
              alt={order.customer.name || ''} 
              className="w-5 h-5 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
          )}
          <span className="font-medium text-xs text-black dark:text-white truncate">
            {order.customer?.name || t('orders:walkInCustomer')}
          </span>
        </div>
        <span className="text-[10px] text-gray-500 dark:text-gray-400 flex-shrink-0">
          {formatDate(order.createdAt)}
        </span>
      </div>
      
      {/* Row 3: Tracking + Profit + Biller (additional details) */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100 dark:border-slate-800">
        {/* Tracking Info */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {(order.orderStatus === 'shipped' || order.orderStatus === 'delivered') ? (
            <div className="flex items-center gap-1.5">
              <TrackingStatusBadge 
                orderId={order.id} 
                orderStatus={order.orderStatus}
              />
              {order.trackingNumber && (
                <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[80px]" title={order.trackingNumber}>
                  {order.trackingNumber}
                </span>
              )}
            </div>
          ) : (
            <span className="text-[10px] text-muted-foreground">—</span>
          )}
        </div>
        
        {/* Profit (if user has access) */}
        {canAccessFinancialData && visibleColumns.profit && (
          <span className={cn(
            "text-[10px] font-medium",
            calculateOrderProfit(order) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          )}>
            {formatCurrency(calculateOrderProfit(order), order.currency)}
          </span>
        )}
        
        {/* Biller */}
        {visibleColumns.biller && (
          <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[60px]">
            {order.biller?.firstName || order.biller?.email || 'N/A'}
          </span>
        )}
        
        {/* Expand/Collapse arrow for items */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          className="p-0.5 text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors flex-shrink-0"
          data-testid={`button-expand-items-${order.id}`}
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
      </div>
        
      {/* Order Items Summary - Only show when expanded */}
      {isExpanded && (
        <OrderItemsLoader 
          orderId={order.id} 
          currency={order.currency}
          variant="mobile"
          maxItems={3}
          expanded={true}
          onToggleExpand={onToggleExpand}
        />
      )}
    </div>
  );
}

export default function AllOrders({ filter }: AllOrdersProps) {
  usePageTitle('nav.orders', 'Orders');
  const { toast } = useToast();
  const { canViewProfit, canViewMargin, canViewImportCost } = useAuth();
  const canAccessFinancialData = canViewProfit || canViewMargin;
  const { t } = useTranslation(['orders', 'common']);
  const { formatCurrency, formatDate } = useLocalization();
  const [location, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [dateRangePreset, setDateRangePreset] = useState("all");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [ordersToDelete, setOrdersToDelete] = useState<any[]>([]);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  
  // Import results state
  const [importPhase, setImportPhase] = useState<'upload' | 'processing' | 'results'>('upload');
  const [importResults, setImportResults] = useState<{
    totalRows: number;
    imported: number;
    failed: number;
    customersCreated: number;
    customersExisting: number;
    successfulOrders: Array<{ orderId: string; orderDbId: string; customerName: string }>;
    errors: Array<{ row: number; orderId?: string; reason: string; data: any }>;
    message?: string;
  } | null>(null);
  const [isReverting, setIsReverting] = useState(false);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [showSuccessfulOrders, setShowSuccessfulOrders] = useState(false);
  
  // Ref to store clearSelection function from DataTable
  const clearSelectionRef = useRef<(() => void) | null>(null);
  
  // State for highlighted order during navigation
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(null);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Prevent initial scroll to top and restore position
  useEffect(() => {
    // Check if we have a saved position first
    const savedScrollPosition = sessionStorage.getItem('ordersScrollPosition');
    
    // Prevent default scroll restoration
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    // Save scroll position before navigating away
    const saveScrollPosition = () => {
      sessionStorage.setItem('ordersScrollPosition', window.scrollY.toString());
    };

    // Cleanup: save position and restore default behavior
    return () => {
      saveScrollPosition();
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'auto';
      }
    };
  }, []);

  // View mode state with localStorage persistence
  const [viewMode, setViewMode] = useState<'normal' | 'compact'>(() => {
    const saved = localStorage.getItem('ordersViewMode');
    return (saved === 'compact' ? 'compact' : 'normal') as 'normal' | 'compact';
  });

  // Expand/collapse all state with localStorage persistence
  const [expandAll, setExpandAll] = useState<boolean>(() => {
    const saved = localStorage.getItem('ordersExpandAll');
    return saved === 'true';
  });

  // Default column visibility settings
  const defaultColumnVisibility: Record<string, boolean> = {
    order: true,
    customer: true,
    date: true,
    status: true,
    payment: true,
    tracking: true,
    total: true,
    profit: false,
    biller: false,
  };

  // Column visibility state with localStorage persistence
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('ordersVisibleColumns');
    if (saved) {
      try {
        // Merge saved values with defaults to ensure all columns have explicit values
        const parsed = JSON.parse(saved);
        return { ...defaultColumnVisibility, ...parsed };
      } catch {
        return defaultColumnVisibility;
      }
    }
    return defaultColumnVisibility;
  });

  // Toggle view mode and save to localStorage
  const handleViewModeChange = (mode: 'normal' | 'compact') => {
    setViewMode(mode);
    localStorage.setItem('ordersViewMode', mode);
  };

  // Toggle expand/collapse all and save to localStorage
  const handleExpandAllChange = (expand: boolean) => {
    setExpandAll(expand);
    localStorage.setItem('ordersExpandAll', String(expand));
    
    // Also update mobile expanded items
    if (expand && filteredOrders) {
      // Expand all - add all order IDs to the set
      setExpandedItemsOrders(new Set(filteredOrders.map((order: any) => order.id)));
    } else {
      // Collapse all - clear the set
      setExpandedItemsOrders(new Set());
    }
  };

  // Toggle column visibility and save to localStorage
  const toggleColumnVisibility = (columnKey: string) => {
    // Strict boolean toggle - true becomes false, false becomes true
    const currentValue = visibleColumns[columnKey] === true;
    const newVisibility = { ...visibleColumns, [columnKey]: !currentValue };
    setVisibleColumns(newVisibility);
    localStorage.setItem('ordersVisibleColumns', JSON.stringify(newVisibility));
  };

  // Badges visibility state with localStorage persistence
  const [showBadges, setShowBadges] = useState(() => {
    const saved = localStorage.getItem('orderDetailsBadgesVisible');
    return saved === null ? true : saved === 'true';
  });

  // Toggle badges visibility and save to localStorage
  const toggleBadges = () => {
    const newValue = !showBadges;
    setShowBadges(newValue);
    localStorage.setItem('orderDetailsBadgesVisible', String(newValue));
  };

  // Expanded items state for mobile view (track which orders have expanded item lists)
  const [expandedItemsOrders, setExpandedItemsOrders] = useState<Set<string>>(new Set());

  // Mobile selection mode state
  const [mobileSelectionMode, setMobileSelectionMode] = useState(false);
  const [mobileSelectedOrders, setMobileSelectedOrders] = useState<Set<string>>(new Set());

  // Exit mobile selection mode
  const exitMobileSelectionMode = useCallback(() => {
    setMobileSelectionMode(false);
    setMobileSelectedOrders(new Set());
  }, []);

  // Toggle mobile selection for an order
  const toggleMobileSelection = useCallback((orderId: string) => {
    setMobileSelectedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  }, []);

  // Toggle expanded items for an order
  const toggleExpandedItems = (orderId: string) => {
    setExpandedItemsOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  // Scroll navigation for order rows
  const scrollToExpandedOrder = useCallback((direction: 'next' | 'prev') => {
    // Get all order rows by data-row-id attribute (added by DataTable)
    const orderRows = Array.from(document.querySelectorAll('[data-row-id]')) as HTMLElement[];
    if (orderRows.length === 0) return;

    const offset = 150; // Offset for header
    const currentScrollTop = window.scrollY + offset;
    const threshold = 20; // Pixels threshold to consider "at" a position

    let targetIndex = -1;

    if (direction === 'next') {
      // Find the first row that is below current scroll position
      for (let i = 0; i < orderRows.length; i++) {
        const rowTop = orderRows[i].offsetTop;
        if (rowTop > currentScrollTop + threshold) {
          targetIndex = i;
          break;
        }
      }
      // If none found, wrap to first
      if (targetIndex === -1) {
        targetIndex = 0;
      }
    } else {
      // Find the last row that is above current scroll position
      for (let i = orderRows.length - 1; i >= 0; i--) {
        const rowTop = orderRows[i].offsetTop;
        if (rowTop < currentScrollTop - threshold) {
          targetIndex = i;
          break;
        }
      }
      // If none found, wrap to last
      if (targetIndex === -1) {
        targetIndex = orderRows.length - 1;
      }
    }

    // Get the order ID from the target element and highlight it
    const targetElement = orderRows[targetIndex];
    const orderId = targetElement.getAttribute('data-row-id');
    if (orderId) {
      // Clear any existing timeout before setting new one
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
      setHighlightedOrderId(orderId);
      // Clear highlight after 3 seconds
      highlightTimeoutRef.current = setTimeout(() => setHighlightedOrderId(null), 3000);
    }

    window.scrollTo({
      top: targetElement.offsetTop - offset,
      behavior: 'smooth'
    });
  }, []);

  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: filter ? ['/api/orders', 'status', filter] : ['/api/orders'],
    queryFn: async () => {
      const url = filter ? `/api/orders?status=${filter}` : '/api/orders';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch orders');
      return response.json();
    },
    retry: false,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    staleTime: 15000,
    gcTime: 300000,
  });

  // Error handling
  useEffect(() => {
    if (error) {
      toast({
        title: t('common:error'),
        description: t('orders:loadError'),
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Scroll position restoration - wait for data to load
  useEffect(() => {
    if (!isLoading && orders.length > 0) {
      const savedScrollPosition = sessionStorage.getItem('ordersScrollPosition');
      if (savedScrollPosition) {
        const scrollPos = parseInt(savedScrollPosition, 10);
        
        // Use setTimeout to ensure DOM is fully rendered
        const timeoutId = setTimeout(() => {
          window.scrollTo({
            top: scrollPos,
            behavior: 'auto' // Instant scroll without animation
          });
          // Clean up after successful restoration
          sessionStorage.removeItem('ordersScrollPosition');
        }, 50);

        return () => clearTimeout(timeoutId);
      }
    }
  }, [isLoading, orders]);

  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      await apiRequest('PATCH', `/api/orders/${id}`, updates);
    },
    onSuccess: () => {
      // Invalidate all order-related caches for real-time updates
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders/pick-pack'] }); // Real-time Pick & Pack sync
      toast({
        title: t('common:success'),
        description: t('orders:updateSuccess'),
      });
    },
    onError: (error) => {
      console.error("Order update error:", error);
      toast({
        title: t('common:error'),
        description: t('orders:updateError'),
        variant: "destructive",
      });
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => apiRequest('DELETE', `/api/orders/${id}`)));
    },
    onMutate: async (ids) => {
      // Predicate to match only list queries (not detail queries)
      const isListQuery = (query: any) => {
        return query.queryKey[0] === '/api/orders' && 
               query.queryKey.length <= 3 && // Matches ['/api/orders'] or ['/api/orders', 'status', filter]
               Array.isArray(query.state.data); // Only process array data
      };
      
      // Cancel ALL list query refetches
      await queryClient.cancelQueries({ predicate: isListQuery });
      
      // Snapshot ALL list queries for rollback
      const previousQueries = queryClient.getQueriesData({ predicate: isListQuery });
      
      // Optimistically update ALL list queries by removing deleted orders
      queryClient.setQueriesData(
        { predicate: isListQuery },
        (old: any[] | undefined) => {
          if (!old || !Array.isArray(old)) return old;
          return old.filter(order => !ids.includes(order.id));
        }
      );
      
      // Return context with previous data for rollback
      return { previousQueries };
    },
    onSuccess: (_, ids) => {
      // Clear selection after successful delete
      clearSelectionRef.current?.();
      toast({
        title: t('common:success'),
        description: t('orders:deleteSuccess', { count: ids.length }),
      });
    },
    onError: (error: any, _, context) => {
      // Rollback ALL queries to previous data on error
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      console.error("Order delete error:", error);
      toast({
        title: t('common:error'),
        description: error.message || t('orders:deleteError'),
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch to ensure data consistency after all deletions complete
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      // Also invalidate trash cache since deleted orders go there
      queryClient.invalidateQueries({ queryKey: ['/api/orders/trash'] });
      // Also invalidate pick-pack so deleted orders disappear from that view
      queryClient.invalidateQueries({ queryKey: ['/api/orders/pick-pack'] });
    },
  });

  const bulkUpdateStatusMutation = useMutation({
    mutationFn: async ({ orderIds, status }: { orderIds: string[], status: string }) => {
      await Promise.all(orderIds.map(id => 
        apiRequest('PATCH', `/api/orders/${id}`, { orderStatus: status })
      ));
    },
    onMutate: async ({ orderIds, status }) => {
      // Predicate to match only list queries
      const isListQuery = (query: any) => {
        return query.queryKey[0] === '/api/orders' && 
               query.queryKey.length <= 3 &&
               Array.isArray(query.state.data);
      };
      
      // Cancel list query refetches
      await queryClient.cancelQueries({ predicate: isListQuery });
      
      // Snapshot list queries for rollback
      const previousQueries = queryClient.getQueriesData({ predicate: isListQuery });
      
      // Optimistically update ALL list queries
      queryClient.setQueriesData(
        { predicate: isListQuery },
        (old: any[] | undefined) => {
          if (!old || !Array.isArray(old)) return old;
          return old.map(order => 
            orderIds.includes(order.id) 
              ? { ...order, orderStatus: status }
              : order
          );
        }
      );
      
      return { previousQueries };
    },
    onSuccess: (_, { orderIds }) => {
      // Clear selection after successful status update
      clearSelectionRef.current?.();
      toast({
        title: t('common:success'),
        description: t('orders:bulkUpdateSuccess', { count: orderIds.length }),
      });
    },
    onError: (error: any, _, context) => {
      // Rollback on error
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast({
        title: t('common:error'),
        description: error.message || t('orders:bulkUpdateError'),
        variant: "destructive",
      });
    },
  });

  const bulkUpdatePaymentMutation = useMutation({
    mutationFn: async ({ orderIds, paymentStatus }: { orderIds: string[], paymentStatus: string }) => {
      await Promise.all(orderIds.map(id => 
        apiRequest('PATCH', `/api/orders/${id}`, { paymentStatus })
      ));
    },
    onMutate: async ({ orderIds, paymentStatus }) => {
      // Predicate to match only list queries
      const isListQuery = (query: any) => {
        return query.queryKey[0] === '/api/orders' && 
               query.queryKey.length <= 3 &&
               Array.isArray(query.state.data);
      };
      
      // Cancel list query refetches
      await queryClient.cancelQueries({ predicate: isListQuery });
      
      // Snapshot list queries for rollback
      const previousQueries = queryClient.getQueriesData({ predicate: isListQuery });
      
      // Optimistically update ALL list queries
      queryClient.setQueriesData(
        { predicate: isListQuery },
        (old: any[] | undefined) => {
          if (!old || !Array.isArray(old)) return old;
          return old.map(order => 
            orderIds.includes(order.id) 
              ? { ...order, paymentStatus: paymentStatus }
              : order
          );
        }
      );
      
      return { previousQueries };
    },
    onSuccess: (_, { orderIds }) => {
      // Clear selection after successful payment update
      clearSelectionRef.current?.();
      toast({
        title: t('common:success'),
        description: t('orders:paymentUpdateSuccess', { count: orderIds.length }),
      });
    },
    onError: (error: any, _, context) => {
      // Rollback on error
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast({
        title: t('common:error'),
        description: error.message || t('orders:paymentUpdateError'),
        variant: "destructive",
      });
    },
  });

  // Get computed date range from preset
  const getDateRangeFromPreset = useCallback((preset: string): { start: Date | undefined, end: Date | undefined } => {
    const now = new Date();
    switch (preset) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'yesterday':
        const yesterday = subDays(now, 1);
        return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
      case 'last7days':
        return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
      case 'last30days':
        return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) };
      case 'thisWeek':
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'thisMonth':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case 'custom':
        return { start: startDate, end: endDate };
      default:
        return { start: undefined, end: undefined };
    }
  }, [startDate, endDate]);

  // Filter orders based on search query and status (memoized for performance)
  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    
    let filtered = orders;
    
    // Apply status filter
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter((order: any) => order.orderStatus === statusFilter);
    }
    
    // Apply payment filter
    if (paymentFilter && paymentFilter !== 'all') {
      filtered = filtered.filter((order: any) => order.paymentStatus === paymentFilter);
    }
    
    // Apply date range filter
    const { start: dateStart, end: dateEnd } = getDateRangeFromPreset(dateRangePreset);
    if (dateStart && dateEnd) {
      filtered = filtered.filter((order: any) => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= dateStart && orderDate <= dateEnd;
      });
    }
    
    // Apply search filter using fuzzy search with scoring
    if (searchQuery) {
      const query = searchQuery.trim();
      
      // Check if searching for order ID number (digits only or with common prefixes)
      const isOrderIdSearch = /^[\d-]+$/.test(query) || query.toLowerCase().startsWith('ord');
      
      if (isOrderIdSearch) {
        // Direct substring match on orderId for number searches (exact matching is better here)
        const lowerQuery = query.toLowerCase();
        filtered = filtered.filter((order: any) => 
          order.orderId?.toLowerCase().includes(lowerQuery)
        );
      } else {
        // Fuzzy search across all fields with scoring
        const FUZZY_THRESHOLD = 25; // 0.25 * 100 = 25 points minimum
        
        const scoredOrders = filtered.map((order: any) => {
          // Calculate score across all searchable fields
          const scores: number[] = [];
          
          // Order ID
          if (order.orderId) scores.push(calculateSearchScore(order.orderId, query));
          
          // Customer fields
          if (order.customer?.name) scores.push(calculateSearchScore(order.customer.name, query));
          if (order.customer?.email) scores.push(calculateSearchScore(order.customer.email, query));
          if (order.customer?.phone) scores.push(calculateSearchScore(order.customer.phone, query));
          if (order.customer?.facebookName) scores.push(calculateSearchScore(order.customer.facebookName, query));
          
          // Address fields
          if (order.customer?.street) scores.push(calculateSearchScore(order.customer.street, query));
          if (order.customer?.city) scores.push(calculateSearchScore(order.customer.city, query));
          if (order.customer?.postalCode) scores.push(calculateSearchScore(order.customer.postalCode, query));
          if (order.customer?.country) scores.push(calculateSearchScore(order.customer.country, query));
          
          // Tracking number
          if (order.trackingNumber) scores.push(calculateSearchScore(order.trackingNumber, query));
          
          // Notes
          if (order.notes) scores.push(calculateSearchScore(order.notes, query));
          if (order.shippingNotes) scores.push(calculateSearchScore(order.shippingNotes, query));
          
          // Biller name
          if (order.biller?.firstName) scores.push(calculateSearchScore(order.biller.firstName, query));
          if (order.biller?.email) scores.push(calculateSearchScore(order.biller.email, query));
          
          // Shipping method
          if (order.shippingMethod) scores.push(calculateSearchScore(order.shippingMethod, query));
          
          // Get maximum score across all fields
          const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
          
          return { order, score: maxScore };
        });
        
        // Filter by threshold and sort by score (best matches first)
        filtered = scoredOrders
          .filter(({ score }: { score: number }) => score >= FUZZY_THRESHOLD)
          .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
          .map(({ order }: { order: any }) => order);
      }
    }
    
    return filtered;
  }, [orders, searchQuery, statusFilter, paymentFilter, dateRangePreset, getDateRangeFromPreset]);

  // Select all/deselect all for mobile (must be after filteredOrders is defined)
  const toggleMobileSelectAll = useCallback(() => {
    if (!filteredOrders) return;
    if (mobileSelectedOrders.size === filteredOrders.length) {
      setMobileSelectedOrders(new Set());
    } else {
      setMobileSelectedOrders(new Set(filteredOrders.map((o: any) => o.id)));
    }
  }, [filteredOrders, mobileSelectedOrders.size]);
  
  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== 'all') count++;
    if (paymentFilter !== 'all') count++;
    if (dateRangePreset !== 'all') count++;
    return count;
  }, [statusFilter, paymentFilter, dateRangePreset]);
  
  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setStatusFilter('all');
    setPaymentFilter('all');
    setDateRangePreset('all');
    setStartDate(undefined);
    setEndDate(undefined);
    setSearchQuery('');
  }, []);

  // Sync expanded items with expandAll state when orders load
  useEffect(() => {
    if (expandAll && filteredOrders && filteredOrders.length > 0) {
      setExpandedItemsOrders(new Set(filteredOrders.map((order: any) => order.id)));
    }
  }, [expandAll, filteredOrders]);

  // Color Psychology: Green=success, Amber=warning/pending, Blue=in-progress, Red=error/urgent
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-700">{t('orders:pending')}</Badge>;
      case 'to_fulfill':
        return <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700">{t('orders:toFulfill')}</Badge>;
      case 'ready_to_ship':
        return <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700">{t('orders:readyToShip')}</Badge>;
      case 'shipped':
        return <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700">{t('orders:shipped')}</Badge>;
      case 'completed':
        return <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-700">{t('orders:completed')}</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">{t('orders:cancelled')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-700">{t('orders:pending')}</Badge>;
      case 'paid':
        return <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700">{t('orders:paid')}</Badge>;
      case 'pay_later':
        return <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700">{t('orders:payLater')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPageTitle = () => {
    switch (filter) {
      case 'to_fulfill':
        return t('orders:ordersToFulfill');
      case 'shipped':
        return t('orders:shippedOrders');
      case 'pay_later':
        return t('orders:payLaterOrders');
      case 'pre_orders':
        return t('orders:preOrdersPage');
      default:
        return t('orders:allOrders');
    }
  };

  // Calculate profit for each order (matching server-side formula)
  // Profit = grandTotal - totalCost - tax - discount - (shippingPaid - actualShippingCost)
  const calculateOrderProfit = (order: any) => {
    const grandTotal = parseFloat(order.grandTotal || '0');
    const totalCost = parseFloat(order.totalCost || '0');
    const tax = parseFloat(order.tax || '0');
    const discount = parseFloat(order.discount || '0');
    const shippingPaid = parseFloat(order.shippingCost || '0');
    const actualShippingCost = parseFloat(order.actualShippingCost || shippingPaid);
    // Exclude tax, discount, and shipping differential from profit
    const profit = grandTotal - totalCost - tax - discount - (shippingPaid - actualShippingCost);
    return profit;
  };

  // Calculate statistics for the filtered orders (only show for to_fulfill filter)
  const statistics = useMemo(() => {
    if (filter !== 'to_fulfill' || !filteredOrders.length) return null;

    const totalOrders = filteredOrders.length;
    const totalRevenue = filteredOrders.reduce((sum: number, order: any) => sum + parseFloat(order.grandTotal || '0'), 0);
    const totalProfit = filteredOrders.reduce((sum: number, order: any) => sum + calculateOrderProfit(order), 0);

    // Calculate new vs returning customers
    const customerIds = new Set<string>();
    const customerOrderCounts = new Map<string, number>();
    
    // Count all orders for each customer (not just filtered ones)
    orders.forEach((order: any) => {
      if (order.customerId) {
        customerOrderCounts.set(
          order.customerId, 
          (customerOrderCounts.get(order.customerId) || 0) + 1
        );
      }
    });

    // Count new vs returning in filtered orders
    let newCustomers = 0;
    let returningCustomers = 0;
    
    filteredOrders.forEach((order: any) => {
      if (order.customerId && !customerIds.has(order.customerId)) {
        customerIds.add(order.customerId);
        const orderCount = customerOrderCounts.get(order.customerId) || 0;
        if (orderCount <= 1) {
          newCustomers++;
        } else {
          returningCustomers++;
        }
      }
    });

    // Determine the primary currency (most common in filtered orders)
    const currencyCounts = new Map<string, number>();
    filteredOrders.forEach((order: any) => {
      const currency = order.currency || 'EUR';
      currencyCounts.set(currency, (currencyCounts.get(currency) || 0) + 1);
    });
    const primaryCurrency = Array.from(currencyCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'EUR';

    return {
      totalOrders,
      totalRevenue,
      totalProfit,
      newCustomers,
      returningCustomers,
      primaryCurrency,
    };
  }, [filter, filteredOrders, orders]);

  // Track daily high scores
  const highScores = useDailyHighScores(statistics);

  // Define table columns - Clean professional design
  // Column order: Order ID → Customer → Date → Status → Payment → Tracking → Total → Profit → Biller
  const columns: DataTableColumn<any>[] = [
    {
      key: "order",
      header: t('orders:order'),
      sortable: true,
      sortKey: "orderId",
      cell: (order) => (
        <div className="flex items-center gap-3">
          <div className="font-semibold text-slate-900 dark:text-slate-100">{order.orderId}</div>
        </div>
      ),
    },
    {
      key: "customer",
      header: t('orders:customer'),
      sortable: false,
      cell: (order) => {
        const customerName = order.customer?.name || 'N/A';
        const country = order.customer?.country;
        const countryFlagMap: Record<string, string> = {
          'CZ': '🇨🇿',
          'DE': '🇩🇪',
          'AT': '🇦🇹',
          'SK': '🇸🇰',
          'PL': '🇵🇱',
          'HU': '🇭🇺',
          'US': '🇺🇸',
          'GB': '🇬🇧',
          'FR': '🇫🇷',
          'IT': '🇮🇹',
          'ES': '🇪🇸',
          'NL': '🇳🇱',
          'BE': '🇧🇪',
          'CH': '🇨🇭',
        };
        const flag = country ? countryFlagMap[country] : null;

        return (
          <div className="flex items-center gap-2">
            {flag && <span className="text-lg">{flag}</span>}
            <div className="text-sm text-slate-700 dark:text-slate-300">{customerName}</div>
          </div>
        );
      },
    },
    {
      key: "date",
      header: t('orders:date'),
      sortable: true,
      sortKey: "createdAt",
      cell: (order) => (
        <div className="text-sm text-slate-600 dark:text-slate-400">
          {formatDate(order.createdAt)}
        </div>
      ),
    },
    {
      key: "status",
      header: t('orders:status'),
      sortable: true,
      sortKey: "orderStatus",
      cell: (order) => (
        <Badge
          className={cn(
            "text-xs font-medium",
            order.orderStatus === 'pending' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-200 border-amber-200 dark:border-amber-700' :
            order.orderStatus === 'awaiting_stock' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-200 border-orange-200 dark:border-orange-700' :
            order.orderStatus === 'to_fulfill' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 border-blue-200 dark:border-blue-700' :
            order.orderStatus === 'ready_to_ship' ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-200 border-cyan-200 dark:border-cyan-700' :
            order.orderStatus === 'shipped' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-200 border-purple-200 dark:border-purple-700' :
            order.orderStatus === 'delivered' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-200 border-emerald-200 dark:border-emerald-700' :
            order.orderStatus === 'cancelled' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-200 border-red-200 dark:border-red-700' :
            'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
          )}
        >
          {order.orderStatus?.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key: "payment",
      header: t('orders:payment'),
      sortable: true,
      sortKey: "paymentStatus",
      cell: (order) => (
        <Badge
          className={cn(
            "text-xs font-medium",
            order.paymentStatus === 'paid' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-200 border-green-200 dark:border-green-700' :
            order.paymentStatus === 'pending' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-200 border-amber-200 dark:border-amber-700' :
            order.paymentStatus === 'pay_later' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 border-blue-200 dark:border-blue-700' :
            'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
          )}
        >
          {order.paymentStatus?.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: "tracking",
      header: t('orders:tracking'),
      sortable: true,
      sortKey: "trackingNumber",
      cell: (order) => {
        // Only show tracking info for shipped/delivered orders
        if (order.orderStatus !== 'shipped' && order.orderStatus !== 'delivered') {
          return <span className="text-muted-foreground text-xs">—</span>;
        }
        return (
          <div className="flex flex-col gap-1">
            <TrackingStatusBadge 
              orderId={order.id} 
              orderStatus={order.orderStatus}
            />
            {order.trackingNumber && (
              <span className="font-mono text-xs text-slate-600 dark:text-slate-400 truncate max-w-[120px]" title={order.trackingNumber}>
                {order.trackingNumber}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "total",
      header: t('orders:total'),
      sortable: true,
      sortKey: "grandTotal",
      cell: (order) => (
        <div className="font-semibold text-slate-900 dark:text-slate-100">
          {formatCurrency(parseFloat(order.grandTotal || '0'), order.currency)}
        </div>
      ),
      className: "text-right",
    },
    {
      key: "profit",
      header: t('orders:profit'),
      sortable: false,
      cell: (order) => {
        const profit = calculateOrderProfit(order);
        return (
          <span className={cn(
            "font-medium",
            profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          )}>
            {formatCurrency(profit, order.currency)}
          </span>
        );
      },
      className: "text-right",
    },
    {
      key: "biller",
      header: t('orders:biller'),
      sortable: false,
      cell: (order) => (
        <div className="text-sm text-slate-700 dark:text-slate-300">
          {order.biller?.firstName || order.biller?.email || 'N/A'}
        </div>
      ),
    },
  ];

  // Filter columns based on visibility and financial data access
  const visibleColumnsFiltered = columns.filter(col => {
    // Hide profit column for users without financial data access
    if (!canAccessFinancialData && col.key === 'profit') {
      return false;
    }
    // Strictly check if column is visible (true) - not just "not false"
    return visibleColumns[col.key] === true;
  });

  // Bulk actions for DataTable
  const bulkActions = [
    {
      type: "select" as const,
      label: t('orders:orderStatus'),
      placeholder: t('orders:changeStatus'),
      options: [
        { label: t('orders:pending'), value: "pending" },
        { label: t('orders:awaitingStock'), value: "awaiting_stock" },
        { label: t('orders:toFulfill'), value: "to_fulfill" },
        { label: t('orders:readyToShip'), value: "ready_to_ship" },
        { label: t('orders:shipped'), value: "shipped" },
        { label: t('orders:delivered'), value: "delivered" },
        { label: t('orders:cancelled'), value: "cancelled" },
      ],
      action: (orders: any[], value: string) => {
        bulkUpdateStatusMutation.mutate({
          orderIds: orders.map(o => o.id),
          status: value
        });
      },
    },
    {
      type: "select" as const,
      label: t('orders:paymentStatus'),
      placeholder: t('orders:changePayment'),
      options: [
        { label: t('orders:pending'), value: "pending" },
        { label: t('orders:paid'), value: "paid" },
        { label: t('orders:payLater'), value: "pay_later" },
      ],
      action: (orders: any[], value: string) => {
        bulkUpdatePaymentMutation.mutate({
          orderIds: orders.map(o => o.id),
          paymentStatus: value
        });
      },
    },
    {
      type: "button" as const,
      label: t('orders:delete'),
      variant: "destructive" as const,
      action: (orders: any[]) => {
        setOrdersToDelete(orders);
        setShowDeleteDialog(true);
      },
    },
  ];

  const handleDeleteConfirm = () => {
    deleteOrderMutation.mutate(ordersToDelete.map(order => order.id));
    setShowDeleteDialog(false);
    setOrdersToDelete([]);
  };

  // Export to XLSX handler - comprehensive with order items
  const handleExportXLSX = async () => {
    try {
      // Handle empty state
      if (!filteredOrders || filteredOrders.length === 0) {
        toast({
          title: t('common:warning'),
          description: t('orders:noDataToExport'),
          variant: "destructive",
        });
        return;
      }

      toast({
        title: t('common:processing'),
        description: t('orders:preparingExport'),
      });

      // Fetch order items for all orders
      const exportData: any[] = [];
      
      for (const order of filteredOrders) {
        // Fetch items for this order
        let orderItems: any[] = [];
        try {
          const response = await fetch(`/api/orders/${order.id}/items`, { credentials: 'include' });
          if (response.ok) {
            orderItems = await response.json();
          }
        } catch (e) {
          console.error('Failed to fetch order items:', e);
        }

        // Format items as string (product name x quantity)
        const itemsText = orderItems.map((item: any) => 
          `${item.productName || item.product?.name || 'Unknown'} x${item.quantity}`
        ).join('; ');

        // Create comprehensive row with all order data
        exportData.push({
          'Order ID': order.orderId || '',
          'Order Date': order.orderDate ? new Date(order.orderDate).toLocaleDateString() : '',
          'Created At': order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '',
          'Order Status': order.orderStatus || '',
          'Payment Status': order.paymentStatus || '',
          'Priority': order.priority || '',
          'Customer Name': order.customer?.name || '',
          'Customer Email': order.customer?.email || '',
          'Customer Phone': order.customer?.phone || '',
          'Customer Type': order.customer?.type || '',
          'Shipping Address': order.shippingAddress?.fullAddress || '',
          'Shipping City': order.shippingAddress?.city || '',
          'Shipping State': order.shippingAddress?.state || '',
          'Shipping Country': order.shippingAddress?.country || '',
          'Shipping Postal Code': order.shippingAddress?.postalCode || '',
          'Currency': order.currency || 'CZK',
          'Subtotal': order.subtotal || '0',
          'Discount Type': order.discountType || '',
          'Discount Value': order.discountValue || '0',
          'Discount Amount': order.discount || '0',
          'Tax Rate (%)': order.taxRate || '0',
          'Tax Amount': order.taxAmount || '0',
          'Shipping Cost': order.shippingCost || '0',
          'Actual Shipping Cost': order.actualShippingCost || '0',
          'Adjustment': order.adjustment || '0',
          'Grand Total': order.grandTotal || '0',
          'Shipping Method': order.shippingMethod || '',
          'Payment Method': order.paymentMethod || '',
          'Tracking Number': order.trackingNumber || '',
          'Tracking Status': order.trackingStatus || '',
          'Notes': order.notes || '',
          'Items Count': orderItems.length,
          'Items': itemsText,
        });
      }

      // Call export function
      exportToXLSX(exportData, 'orders_comprehensive', t('orders:ordersReport'));

      toast({
        title: t('common:success'),
        description: t('orders:exportSuccessExcel', { count: filteredOrders.length }),
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: t('common:error'),
        description: t('orders:exportError'),
        variant: "destructive",
      });
    }
  };

  // Export to PDF handler
  const handleExportPDF = () => {
    try {
      // Handle empty state
      if (!filteredOrders || filteredOrders.length === 0) {
        toast({
          title: t('common:warning'),
          description: t('orders:noDataToExport'),
          variant: "destructive",
        });
        return;
      }

      // Prepare export data
      const exportData = filteredOrders.map((order: any) => ({
        orderId: order.orderId || 'N/A',
        customer: order.customer?.name || 'N/A',
        total: formatCurrency(parseFloat(order.grandTotal || '0'), order.currency || 'EUR'),
        status: order.orderStatus || 'N/A',
        date: formatDate(order.orderDate),
        shippingMethod: order.shippingMethod || 'N/A',
        paymentMethod: order.paymentMethod || 'N/A',
      }));

      // Define columns
      const columns: PDFColumn[] = [
        { key: 'orderId', header: t('orders:orderIdHeader') },
        { key: 'customer', header: t('orders:customerNameHeader') },
        { key: 'total', header: t('orders:totalHeader') },
        { key: 'status', header: t('orders:statusHeader') },
        { key: 'date', header: t('orders:dateHeader') },
        { key: 'shippingMethod', header: t('orders:shippingMethodHeader') },
        { key: 'paymentMethod', header: t('orders:paymentMethodHeader') },
      ];

      // Call export function
      exportToPDF('Orders Report', exportData, columns, 'orders');

      toast({
        title: t('common:success'),
        description: t('orders:exportSuccessPDF', { count: filteredOrders.length }),
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: t('common:error'),
        description: t('orders:exportError'),
        variant: "destructive",
      });
    }
  };

  // Centralized order import column definitions - single source of truth
  // This ensures template, UI documentation, and backend parsing stay in sync
  const ORDER_IMPORT_COLUMNS = {
    required: [
      { key: 'Order ID', example: 'ORD-2025-001', example2: 'ORD-2025-002' },
      { key: 'Customer Name', example: 'John Doe', example2: 'Jane Smith' },
      { key: 'Grand Total', example: '1239', example2: '279.25' },
    ],
    optional: [
      // Order Details
      { key: 'Order Date', example: '2024-12-18', example2: '2024-12-19' },
      { key: 'Order Status', example: 'pending', example2: 'to_fulfill', hint: 'pending, awaiting_stock, to_fulfill, ready_to_ship, shipped, delivered, cancelled' },
      { key: 'Payment Status', example: 'pending', example2: 'paid', hint: 'pending, paid, pay_later' },
      { key: 'Priority', example: 'medium', example2: 'high', hint: 'low, medium, high' },
      { key: 'Order Type', example: 'ord', example2: 'web', hint: 'pos, ord, web, tel' },
      { key: 'Sale Type', example: 'retail', example2: 'wholesale', hint: 'retail, wholesale' },
      { key: 'Channel', example: 'online', example2: 'online', hint: 'pos, online' },
      // Customer Details
      { key: 'Customer Email', example: 'john@example.com', example2: 'jane@example.com' },
      { key: 'Customer Phone', example: '+420123456789', example2: '+420987654321' },
      // Shipping Address
      { key: 'Shipping Address', example: '123 Main St', example2: '456 Oak Avenue' },
      { key: 'Shipping City', example: 'Prague', example2: 'Brno' },
      { key: 'Shipping State', example: '', example2: '' },
      { key: 'Shipping Country', example: 'Czech Republic', example2: 'Czech Republic' },
      { key: 'Shipping Postal Code', example: '10000', example2: '60200' },
      // Financial
      { key: 'Currency', example: 'CZK', example2: 'EUR', hint: 'CZK, EUR, USD, VND, CNY' },
      { key: 'Subtotal', example: '1000', example2: '250' },
      { key: 'Discount Type', example: 'percentage', example2: 'fixed', hint: 'percentage, fixed' },
      { key: 'Discount Value', example: '10', example2: '25' },
      { key: 'Discount Amount', example: '100', example2: '25' },
      { key: 'Tax Rate (%)', example: '21', example2: '21' },
      { key: 'Tax Amount', example: '189', example2: '47.25' },
      { key: 'Shipping Cost', example: '150', example2: '12' },
      { key: 'Actual Shipping Cost', example: '145', example2: '10' },
      { key: 'Adjustment', example: '0', example2: '-5' },
      // Shipping & Payment
      { key: 'Shipping Method', example: 'GLS', example2: 'PPL' },
      { key: 'Payment Method', example: 'Bank Transfer', example2: 'COD' },
      { key: 'Tracking Number', example: '', example2: 'PPL123456789' },
      // COD
      { key: 'COD Amount', example: '', example2: '279.25' },
      { key: 'COD Currency', example: '', example2: 'EUR' },
      // Items & Notes
      { key: 'Items', example: 'SKU-ABC123 x2; SKU-XYZ789 x1', example2: 'NAIL-001 x3 @15.50; GEL-002 x1', hint: 'SKU x Qty; SKU x Qty @Price' },
      { key: 'Notes', example: 'Sample order notes', example2: 'Express delivery requested' },
    ],
  };

  // Download import template - dynamically generated from column config
  const handleDownloadTemplate = () => {
    // Build template rows from column definitions
    const row1: Record<string, string> = {};
    const row2: Record<string, string> = {};
    
    [...ORDER_IMPORT_COLUMNS.required, ...ORDER_IMPORT_COLUMNS.optional].forEach(col => {
      row1[col.key] = col.example;
      row2[col.key] = col.example2;
    });
    
    exportToXLSX([row1, row2], 'orders_import_template', t('orders:importTemplate'));
    toast({
      title: t('common:success'),
      description: t('orders:templateDownloaded'),
    });
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        toast({
          title: t('common:error'),
          description: t('orders:invalidFileType'),
          variant: "destructive",
        });
        return;
      }
      setImportFile(file);
    }
  };

  // Handle import
  const handleImport = async () => {
    if (!importFile) {
      toast({
        title: t('common:error'),
        description: t('orders:noFileSelected'),
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    setImportPhase('processing');
    
    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const response = await fetch('/api/orders/import', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || t('orders:importFailed'));
      }
      
      setImportResults(result);
      setImportPhase('results');
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      
      // Show success toast
      if (result.imported > 0) {
        toast({
          title: t('common:success'),
          description: t('orders:importSuccess', { count: result.imported }),
        });
      }
      
    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: t('common:error'),
        description: error.message || t('orders:importFailed'),
        variant: "destructive",
      });
      setImportPhase('upload');
    } finally {
      setIsImporting(false);
    }
  };

  // Handle revert import
  const handleRevertImport = async () => {
    if (!importResults?.successfulOrders.length) return;
    
    setIsReverting(true);
    try {
      const orderIds = importResults.successfulOrders.map(o => o.orderDbId);
      await apiRequest('DELETE', '/api/orders/import/revert', { orderIds });
      
      toast({ 
        title: t('common:success'), 
        description: t('orders:importReverted', { count: orderIds.length }) 
      });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      resetImportDialog();
    } catch (error: any) {
      toast({ 
        title: t('common:error'), 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsReverting(false);
    }
  };

  // Reset import dialog state
  const resetImportDialog = () => {
    setShowImportDialog(false);
    setImportFile(null);
    setImportPhase('upload');
    setImportResults(null);
    setShowErrorDetails(false);
    setShowSuccessfulOrders(false);
  };

  // Download error log as CSV
  const downloadErrorLog = () => {
    if (!importResults?.errors.length) return;
    
    const csvContent = [
      ['Row', 'Order ID', 'Reason', 'Data'].join(','),
      ...importResults.errors.map(err => 
        [
          err.row,
          err.orderId || '',
          `"${err.reason.replace(/"/g, '""')}"`,
          `"${JSON.stringify(err.data).replace(/"/g, '""')}"`
        ].join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `order_import_errors_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6 overflow-x-hidden">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="h-8 w-32 bg-muted rounded-md animate-pulse" />
            <div className="h-4 w-48 bg-muted rounded-md animate-pulse mt-2 hidden sm:block" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 bg-muted rounded-md animate-pulse" />
            <div className="h-9 w-9 bg-muted rounded-md animate-pulse" />
            <div className="h-9 w-28 bg-muted rounded-md animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-lg p-3 border">
              <div className="h-3 w-16 bg-muted rounded-md animate-pulse mb-2" />
              <div className="h-6 w-20 bg-muted rounded-md animate-pulse" />
            </div>
          ))}
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg border">
          <div className="p-4 border-b flex items-center gap-4">
            <div className="h-10 flex-1 max-w-sm bg-muted rounded-md animate-pulse" />
            <div className="h-10 w-28 bg-muted rounded-md animate-pulse" />
          </div>
          <div className="divide-y">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4" style={{ opacity: 1 - i * 0.08 }}>
                <div className="h-5 w-5 bg-muted rounded-md animate-pulse" />
                <div className="h-5 w-24 bg-muted rounded-md animate-pulse" />
                <div className="h-5 flex-1 bg-muted rounded-md animate-pulse" />
                <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
                <div className="h-5 w-24 bg-muted rounded-md animate-pulse" />
                <div className="h-5 w-20 bg-muted rounded-md animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 overflow-x-hidden">
      {/* Header Section - Compact on mobile */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate">
            {getPageTitle()}
          </h1>
          <p className="text-xs sm:text-base text-slate-600 dark:text-slate-400 hidden sm:block">
            {t('orders:trackAndManageOrders')}
          </p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Trash Button */}
          <Link href="/orders/trash">
            <Button 
              variant="outline" 
              size="icon"
              className="h-9 w-9 sm:h-10 sm:w-10"
              data-testid="button-order-trash"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </Link>
          
          {/* Import/Export Menu - Three Dot Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="icon"
                className="h-9 w-9 sm:h-10 sm:w-10"
                data-testid="button-import-export-menu"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t('orders:importExport')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowImportDialog(true)} data-testid="menu-import-xlsx">
                <Download className="h-4 w-4 mr-2" />
                {t('orders:importFromExcel')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportXLSX} data-testid="menu-export-xlsx">
                <FileDown className="h-4 w-4 mr-2" />
                {t('orders:exportToExcel')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF} data-testid="menu-export-pdf">
                <FileText className="h-4 w-4 mr-2" />
                {t('orders:exportToPDF')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Bank Import Button - Show for Pay Later filter or pay_later route */}
          {(paymentFilter === 'pay_later' || filter === 'pay_later') && (
            <Link href="/orders/bank-import">
              <Button variant="outline" className="h-9 sm:h-10 px-3 sm:px-4">
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">{t('orders:bankImport')}</span>
              </Button>
            </Link>
          )}
          
          {/* Add Order Button */}
          <Link href="/orders/add">
            <Button data-testid="button-add-order" className="h-9 sm:h-10 px-3 sm:px-4">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">{t('orders:addOrder')}</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Overview (only show for to_fulfill) - Compact on mobile */}
      {statistics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 sm:gap-3 md:gap-4">
          {/* Total Orders */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardContent className="p-2 sm:p-4 md:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-sm font-medium text-slate-600 dark:text-slate-400">
                    {t('orders:totalOrders')}
                  </p>
                  <p className="text-lg sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {formatCompactNumber(statistics.totalOrders)}
                  </p>
                </div>
                <div className="flex-shrink-0 p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950 dark:to-blue-950">
                  <ShoppingCart className="h-4 w-4 sm:h-6 sm:w-6 text-cyan-600 dark:text-cyan-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Revenue */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardContent className="p-2 sm:p-4 md:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-sm font-medium text-slate-600 dark:text-slate-400">
                    Revenue
                  </p>
                  <p className="text-lg sm:text-2xl md:text-3xl font-bold text-purple-600 dark:text-purple-400 truncate">
                    {formatCompactNumber(statistics.totalRevenue)}
                  </p>
                </div>
                <div className="flex-shrink-0 p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950">
                  <DollarSign className="h-4 w-4 sm:h-6 sm:w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Profit */}
          {canAccessFinancialData && (
            <Card className="border-slate-200 dark:border-slate-800">
              <CardContent className="p-2 sm:p-4 md:p-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-sm font-medium text-slate-600 dark:text-slate-400">
                      Profit
                    </p>
                    <p className={`text-lg sm:text-2xl md:text-3xl font-bold truncate ${statistics.totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatCompactNumber(statistics.totalProfit)}
                    </p>
                  </div>
                  <div className={`flex-shrink-0 p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl bg-gradient-to-br ${statistics.totalProfit >= 0 ? 'from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950' : 'from-red-50 to-rose-50 dark:from-red-950 dark:to-rose-950'}`}>
                    <TrendingUp className={`h-4 w-4 sm:h-6 sm:w-6 ${statistics.totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Customers */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardContent className="p-2 sm:p-4 md:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-sm font-medium text-slate-600 dark:text-slate-400">
                    Customers
                  </p>
                  <p className="text-lg sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {formatCompactNumber(statistics.newCustomers + statistics.returningCustomers)}
                  </p>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                    <span className="text-blue-600 dark:text-blue-400">{statistics.newCustomers} new</span>
                    {' • '}
                    <span>{statistics.returningCustomers} ret</span>
                  </p>
                </div>
                <div className="flex-shrink-0 p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
                  <Users className="h-4 w-4 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters Section - Compact on mobile */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="p-2.5 sm:p-6">
          {/* Main filter row */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            {/* Search input */}
            <div className="relative flex-1">
              <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder={t('orders:searchPlaceholderExtended')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 sm:pl-10 h-9 sm:h-10 text-sm focus:border-cyan-500 border-slate-200 dark:border-slate-800"
                data-testid="input-search"
              />
            </div>
            
            {/* Filter toggle button */}
            <Button
              variant={showFilters ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="h-9 sm:h-10 px-3 gap-2"
              data-testid="button-toggle-filters"
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">{t('orders:filters')}</span>
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
            
            {/* Clear filters button - only show if filters are active */}
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-9 sm:h-10 px-3 text-muted-foreground hover:text-foreground"
                data-testid="button-clear-filters"
              >
                <X className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">{t('orders:clearFilters')}</span>
              </Button>
            )}
          </div>
          
          {/* Expandable filter options */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Order Status Filter */}
                {!filter && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">{t('orders:orderStatus')}</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-9 text-sm focus:border-cyan-500 border-slate-200 dark:border-slate-800" data-testid="select-status-filter">
                        <SelectValue placeholder={t('orders:allStatuses')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('orders:allStatuses')}</SelectItem>
                        <SelectItem value="pending">{t('orders:pending')}</SelectItem>
                        <SelectItem value="awaiting_stock">{t('orders:awaitingStock')}</SelectItem>
                        <SelectItem value="to_fulfill">{t('orders:toFulfill')}</SelectItem>
                        <SelectItem value="ready_to_ship">{t('orders:readyToShip')}</SelectItem>
                        <SelectItem value="shipped">{t('orders:shipped')}</SelectItem>
                        <SelectItem value="delivered">{t('orders:delivered')}</SelectItem>
                        <SelectItem value="cancelled">{t('orders:cancelled')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {/* Payment Status Filter */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">{t('orders:paymentStatus')}</Label>
                  <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                    <SelectTrigger className="h-9 text-sm focus:border-cyan-500 border-slate-200 dark:border-slate-800" data-testid="select-payment-filter">
                      <SelectValue placeholder={t('orders:allPayments')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('orders:allPayments')}</SelectItem>
                      <SelectItem value="pending">{t('orders:pending')}</SelectItem>
                      <SelectItem value="paid">{t('orders:paid')}</SelectItem>
                      <SelectItem value="pay_later">{t('orders:payLater')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Date Range Filter */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">{t('orders:dateRange')}</Label>
                  <Select value={dateRangePreset} onValueChange={setDateRangePreset}>
                    <SelectTrigger className="h-9 text-sm focus:border-cyan-500 border-slate-200 dark:border-slate-800" data-testid="select-date-range">
                      <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder={t('orders:allTime')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('orders:allTime')}</SelectItem>
                      <SelectItem value="today">{t('orders:today')}</SelectItem>
                      <SelectItem value="yesterday">{t('orders:yesterday')}</SelectItem>
                      <SelectItem value="last7days">{t('orders:last7Days')}</SelectItem>
                      <SelectItem value="last30days">{t('orders:last30Days')}</SelectItem>
                      <SelectItem value="thisWeek">{t('orders:thisWeek')}</SelectItem>
                      <SelectItem value="thisMonth">{t('orders:thisMonth')}</SelectItem>
                      <SelectItem value="lastMonth">{t('orders:lastMonth')}</SelectItem>
                      <SelectItem value="custom">{t('orders:customRange')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Custom Date Range Picker */}
                {dateRangePreset === 'custom' && (
                  <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                    <Label className="text-xs font-medium text-muted-foreground">{t('orders:selectDates')}</Label>
                    <div className="flex gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 flex-1 justify-start text-left font-normal text-sm"
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {startDate ? format(startDate, 'MMM dd') : t('orders:startDate')}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarPicker
                            mode="single"
                            selected={startDate}
                            onSelect={setStartDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 flex-1 justify-start text-left font-normal text-sm"
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {endDate ? format(endDate, 'MMM dd') : t('orders:endDate')}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarPicker
                            mode="single"
                            selected={endDate}
                            onSelect={setEndDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="p-0 sm:p-6">
          {/* Header with view toggle - Always Visible */}
          <div className="px-2.5 sm:px-0 pb-2 pt-2.5 sm:pt-0 sm:pb-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm sm:text-lg font-semibold">{t('orders:orders')} ({filteredOrders?.length || 0})</h2>
              <div className="flex items-center gap-1 sm:gap-2">
                {/* View Mode Toggle - Desktop only */}
                <div className="hidden sm:flex items-center gap-0.5 sm:gap-1 border rounded-md">
                  <Button
                    variant={viewMode === 'normal' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleViewModeChange('normal')}
                    className="h-8 sm:h-7 px-2 text-xs rounded-r-none"
                    data-testid="button-viewNormal"
                  >
                    <List className="h-3.5 w-3.5 sm:h-3 sm:w-3 sm:mr-1" />
                    <span className="hidden sm:inline">{t('orders:normalView')}</span>
                  </Button>
                  <Button
                    variant={viewMode === 'compact' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleViewModeChange('compact')}
                    className="h-8 sm:h-7 px-2 text-xs rounded-l-none"
                    data-testid="button-viewCompact"
                  >
                    <AlignJustify className="h-3.5 w-3.5 sm:h-3 sm:w-3 sm:mr-1" />
                    <span className="hidden sm:inline">{t('orders:compactView')}</span>
                  </Button>
                </div>

                {/* Expand/Collapse All Toggle */}
                <div className="flex items-center gap-0.5 sm:gap-1 border rounded-md">
                  <Button
                    variant={!expandAll ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleExpandAllChange(false)}
                    className="h-8 sm:h-7 px-2 text-xs rounded-r-none"
                    data-testid="button-collapseAll"
                  >
                    <ChevronUp className="h-3.5 w-3.5 sm:h-3 sm:w-3 sm:mr-1" />
                    <span className="hidden sm:inline">{t('orders:collapsed')}</span>
                  </Button>
                  <Button
                    variant={expandAll ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleExpandAllChange(true)}
                    className="h-8 sm:h-7 px-2 text-xs rounded-l-none"
                    data-testid="button-expandAll"
                  >
                    <ChevronDown className="h-3.5 w-3.5 sm:h-3 sm:w-3 sm:mr-1" />
                    <span className="hidden sm:inline">{t('orders:expanded')}</span>
                  </Button>
                </div>
                {viewMode === 'normal' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="button-column-visibility">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>{t('orders:showColumns')}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {columns.map((column) => (
                        <DropdownMenuCheckboxItem
                          key={column.key}
                          checked={visibleColumns[column.key] === true}
                          onCheckedChange={() => toggleColumnVisibility(column.key)}
                          onSelect={(e) => e.preventDefault()}
                          className="cursor-pointer"
                        >
                          {column.header}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Card View - Compact with all column details */}
          <div className="sm:hidden space-y-1.5 px-2 py-2">
            {/* Mobile Selection Mode Header */}
            {mobileSelectionMode && (
              <div className="sticky top-0 z-10 bg-blue-50 dark:bg-blue-900/30 rounded-lg p-2 mb-2 flex items-center justify-between gap-2 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={exitMobileSelectionMode}
                    data-testid="button-exit-selection"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    {mobileSelectedOrders.size} {t('orders:selected')}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={toggleMobileSelectAll}
                    data-testid="button-select-all-mobile"
                  >
                    {mobileSelectedOrders.size === filteredOrders?.length ? t('common:deselectAll') : t('common:selectAll')}
                  </Button>
                </div>
              </div>
            )}
            
            {/* Mobile Bulk Actions Bar */}
            {mobileSelectionMode && mobileSelectedOrders.size > 0 && (
              <div className="sticky top-12 z-10 bg-white dark:bg-slate-900 rounded-lg p-2 mb-2 flex items-center gap-2 border border-gray-200 dark:border-slate-700 shadow-sm overflow-x-auto">
                <Select
                  onValueChange={(value) => {
                    const selectedItems = filteredOrders?.filter((o: any) => mobileSelectedOrders.has(o.id)) || [];
                    updateOrderMutation.mutate({ 
                      id: selectedItems[0]?.id, 
                      updates: { orderStatus: value } 
                    });
                    selectedItems.slice(1).forEach((item: any) => {
                      updateOrderMutation.mutate({ id: item.id, updates: { orderStatus: value } });
                    });
                    exitMobileSelectionMode();
                  }}
                >
                  <SelectTrigger className="h-8 w-auto min-w-[100px] text-xs">
                    <SelectValue placeholder={t('orders:changeStatus')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">{t('orders:pending')}</SelectItem>
                    <SelectItem value="processing">{t('orders:processing')}</SelectItem>
                    <SelectItem value="shipped">{t('orders:shipped')}</SelectItem>
                    <SelectItem value="delivered">{t('orders:delivered')}</SelectItem>
                    <SelectItem value="cancelled">{t('orders:cancelled')}</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-8 text-xs flex-shrink-0"
                  onClick={() => {
                    const ids = Array.from(mobileSelectedOrders);
                    deleteOrderMutation.mutate(ids);
                    exitMobileSelectionMode();
                  }}
                  data-testid="button-bulk-delete-mobile"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  {t('common:delete')}
                </Button>
              </div>
            )}
            
            {filteredOrders?.map((order: any) => (
              <MobileOrderCard
                key={order.id}
                order={order}
                isSelectionMode={mobileSelectionMode}
                isSelected={mobileSelectedOrders.has(order.id)}
                onLongPress={() => {
                  setMobileSelectionMode(true);
                  setMobileSelectedOrders(new Set([order.id]));
                }}
                onClick={() => {
                  if (mobileSelectionMode) {
                    toggleMobileSelection(order.id);
                  } else {
                    sessionStorage.setItem('orderDetailsReferrer', location);
                    navigate(`/orders/${order.id}`);
                  }
                }}
                onToggleSelection={() => toggleMobileSelection(order.id)}
                isExpanded={expandedItemsOrders.has(order.id)}
                onToggleExpand={() => toggleExpandedItems(order.id)}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
                getStatusBadge={getStatusBadge}
                getPaymentStatusBadge={getPaymentStatusBadge}
                calculateOrderProfit={calculateOrderProfit}
                canAccessFinancialData={canAccessFinancialData}
                visibleColumns={visibleColumns}
                t={t}
              />
            ))}
          </div>

          {/* Desktop Table View - Hidden on mobile */}
          <div className="hidden sm:block">
            {viewMode === 'normal' ? (
            <DataTable
              data={filteredOrders}
              columns={visibleColumnsFiltered}
              bulkActions={bulkActions}
              tableId="orders-v2"
              getRowKey={(order) => order.id}
              itemsPerPageOptions={[10, 20, 50, 100]}
              defaultItemsPerPage={20}
              defaultExpandAll={expandAll}
              highlightedRowId={highlightedOrderId}
              expandable={{
                render: (order) => (
                  <div 
                    className="space-y-4 max-w-4xl p-2 rounded-lg"
                    data-expanded-order={order.id}
                  >
                    {/* Customer Info Header */}
                    <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {order.customer?.country && (
                            <span className="text-base flex-shrink-0">{getCountryFlag(order.customer.country)}</span>
                          )}
                          {order.customer?.profilePictureUrl ? (
                            <img 
                              src={order.customer.profilePictureUrl} 
                              alt={order.customer.name || ''} 
                              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                            </div>
                          )}
                          {order.customerId ? (
                            <Link 
                              href={`/customers/${order.customerId}`}
                              onClick={(e) => e.stopPropagation()}
                              className="group text-base font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-flex items-center gap-1"
                            >
                              {order.customer?.name || t('orders:unknownCustomer')}
                              <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Link>
                          ) : (
                            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                              {order.customer?.name || t('orders:unknownCustomer')}
                            </h3>
                          )}
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
                        {/* TODO: Migrate to persisted badges from database instead of calculating on-the-fly */}
                        {/* Use CustomerBadges component with order.customer.badges from ?includeBadges=true API param */}
                        {showBadges && (
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {/* VIP Badge */}
                            {order.customer?.type === 'vip' && (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Badge className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700 text-xs cursor-pointer">
                                    <Star className="h-3 w-3 mr-1" />
                                    VIP
                                  </Badge>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-2" side="top">
                                  <p className="text-xs">{t('orders:vipCustomerManual')}</p>
                                </PopoverContent>
                              </Popover>
                            )}
                          
                            {/* Spending Tier Badges */}
                            {(() => {
                              const totalSpent = parseFloat(order.customer?.totalSpent || '0');
                              if (totalSpent >= 100000) {
                                return (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Badge className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 text-purple-900 dark:text-purple-200 border-purple-300 dark:border-purple-700 text-xs cursor-pointer">
                                        <Gem className="h-3 w-3 mr-1" />
                                        Diamond
                                      </Badge>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-2" side="top">
                                      <p className="text-xs">{t('orders:lifetimeSpendingAmount', { amount: formatCurrency(100000, order.currency || 'EUR') })}</p>
                                    </PopoverContent>
                                  </Popover>
                                );
                              } else if (totalSpent >= 50000) {
                                return (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Badge className="bg-gradient-to-r from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600 text-xs cursor-pointer">
                                        <Award className="h-3 w-3 mr-1" />
                                        Platinum
                                      </Badge>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-2" side="top">
                                      <p className="text-xs">{t('orders:lifetimeSpendingAmount', { amount: formatCurrency(50000, order.currency || 'EUR') })}</p>
                                    </PopoverContent>
                                  </Popover>
                                );
                              } else if (totalSpent >= 25000) {
                                return (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Badge className="bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700 text-xs cursor-pointer">
                                        <Medal className="h-3 w-3 mr-1" />
                                        Gold
                                      </Badge>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-2" side="top">
                                      <p className="text-xs">{t('orders:lifetimeSpendingAmount', { amount: formatCurrency(25000, order.currency || 'EUR') })}</p>
                                    </PopoverContent>
                                  </Popover>
                                );
                              }
                              return null;
                            })()}
                          
                            {/* Country-Specific TOP Badges */}
                            {order.customer?.customerRank === 'TOP10' && (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Badge className="bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700 text-xs cursor-pointer">
                                    <Trophy className="h-3 w-3 mr-1" />
                                    TOP 10{order.customer?.country ? ` in ${order.customer.country}` : ''}
                                  </Badge>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-2" side="top">
                                  <p className="text-xs">{order.customer?.country ? t('orders:top10CustomerInCountry', { country: order.customer.country }) : t('orders:top10CustomerByRevenue')}</p>
                                </PopoverContent>
                              </Popover>
                            )}
                            {order.customer?.customerRank === 'TOP50' && (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Badge className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 border-blue-300 dark:border-blue-700 text-xs cursor-pointer">
                                    <Award className="h-3 w-3 mr-1" />
                                    TOP 50{order.customer?.country ? ` in ${order.customer.country}` : ''}
                                  </Badge>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-2" side="top">
                                  <p className="text-xs">{order.customer?.country ? t('orders:top50CustomerInCountry', { country: order.customer.country }) : t('orders:top50CustomerByRevenue')}</p>
                                </PopoverContent>
                              </Popover>
                            )}
                            {order.customer?.customerRank === 'TOP100' && (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Badge className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 text-xs cursor-pointer">
                                    <Star className="h-3 w-3 mr-1" />
                                    TOP 100{order.customer?.country ? ` in ${order.customer.country}` : ''}
                                  </Badge>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-2" side="top">
                                  <p className="text-xs">{order.customer?.country ? t('orders:top100CustomerInCountry', { country: order.customer.country }) : t('orders:top100CustomerByRevenue')}</p>
                                </PopoverContent>
                              </Popover>
                            )}
                            
                            {/* Pay Later Badge */}
                            {order.paymentStatus === 'pay_later' && (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Badge className="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-200 border-purple-300 dark:border-purple-700 text-xs cursor-pointer">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Pay Later
                                  </Badge>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-2" side="top">
                                  <p className="text-xs">{t('orders:paymentScheduledLater')}</p>
                                </PopoverContent>
                              </Popover>
                            )}
                          
                          {/* Customer Behavior Badges */}
                          {(() => {
                            const totalOrders = order.customer?.totalOrders || 0;
                            const firstOrderDate = order.customer?.firstOrderDate ? new Date(order.customer.firstOrderDate) : null;
                            const lastOrderDate = order.customer?.lastOrderDate ? new Date(order.customer.lastOrderDate) : null;
                            const avgOrderValue = parseFloat(order.customer?.averageOrderValue || '0');
                            const now = new Date();
                            const daysSinceFirstOrder = firstOrderDate ? Math.floor((now.getTime() - firstOrderDate.getTime()) / (1000 * 60 * 60 * 24)) : null;
                            const daysSinceLastOrder = lastOrderDate ? Math.floor((now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24)) : null;
                            
                            const badges = [];
                            
                            // New Customer (first order within 30 days)
                            if (daysSinceFirstOrder !== null && daysSinceFirstOrder <= 30) {
                              badges.push(
                                <Popover key="new">
                                  <PopoverTrigger asChild>
                                    <Badge className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-200 border-green-300 dark:border-green-700 text-xs cursor-pointer">
                                      <Sparkles className="h-3 w-3 mr-1" />
                                      {t('orders:newCustomer')}
                                    </Badge>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-2" side="top">
                                    <p className="text-xs">{t('orders:firstOrderWithin30Days')}</p>
                                  </PopoverContent>
                                </Popover>
                              );
                            }
                            
                            // First Timer (only 1 order)
                            if (totalOrders === 1) {
                              badges.push(
                                <Popover key="first">
                                  <PopoverTrigger asChild>
                                    <Badge className="bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-200 border-cyan-300 dark:border-cyan-700 text-xs cursor-pointer">
                                      <Sparkles className="h-3 w-3 mr-1" />
                                      First Timer
                                    </Badge>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-2" side="top">
                                    <p className="text-xs">{t('orders:hasPlacedOnly1Order')}</p>
                                  </PopoverContent>
                                </Popover>
                              );
                            }
                            
                            // Super Loyal (10+ orders)
                            if (totalOrders >= 10) {
                              badges.push(
                                <Popover key="superloyal">
                                  <PopoverTrigger asChild>
                                    <Badge className="bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-200 border-rose-300 dark:border-rose-700 text-xs cursor-pointer">
                                      <Heart className="h-3 w-3 mr-1" />
                                      Super Loyal
                                    </Badge>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-2" side="top">
                                    <p className="text-xs">{t('orders:hasPlaced10PlusOrders', { totalOrders })}</p>
                                  </PopoverContent>
                                </Popover>
                              );
                            } 
                            // Loyal Customer (2-9 orders)
                            else if (totalOrders > 1) {
                              badges.push(
                                <Popover key="loyal">
                                  <PopoverTrigger asChild>
                                    <Badge className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-200 border-indigo-300 dark:border-indigo-700 text-xs cursor-pointer">
                                      <RefreshCw className="h-3 w-3 mr-1" />
                                      {t('orders:loyalCustomer')}
                                    </Badge>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-2" side="top">
                                    <p className="text-xs">{t('orders:hasPlacedXOrders', { totalOrders })}</p>
                                  </PopoverContent>
                                </Popover>
                              );
                            }
                            
                            // At Risk (no order in 90+ days, but has ordered before)
                            if (daysSinceLastOrder !== null && daysSinceLastOrder > 90 && totalOrders > 0) {
                              badges.push(
                                <Popover key="risk">
                                  <PopoverTrigger asChild>
                                    <Badge className="bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-200 border-orange-300 dark:border-orange-700 text-xs cursor-pointer">
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      At Risk
                                    </Badge>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-2" side="top">
                                    <p className="text-xs">{t('orders:noOrdersInXDays', { daysSinceLastOrder })}</p>
                                  </PopoverContent>
                                </Popover>
                              );
                            }
                            
                            // High Value (avg order > 500)
                            if (avgOrderValue > 500) {
                              badges.push(
                                <Popover key="highvalue">
                                  <PopoverTrigger asChild>
                                    <Badge className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700 text-xs cursor-pointer">
                                      <TrendingUp className="h-3 w-3 mr-1" />
                                      High Value
                                    </Badge>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-2" side="top">
                                    <p className="text-xs">{t('orders:avgOrderValueBadge', { value: formatCurrency(avgOrderValue, order.currency || 'EUR') })}</p>
                                  </PopoverContent>
                                </Popover>
                              );
                            }
                            
                            return badges;
                          })()}
                        </div>
                        )}
                      </div>
                    </div>

                    {/* Order Items - Lazy Loaded */}
                    <OrderItemsLoader 
                      orderId={order.id} 
                      currency={order.currency}
                      variant="full"
                    />

                    {/* Order Summary */}
                    <div className="bg-gradient-to-br from-blue-50 to-slate-50 dark:from-blue-950/30 dark:to-slate-800/30 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">{t('orders:orderSummaryHeader')}</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-400">{t('orders:subtotal')}</span>
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {formatCurrency(order.subtotal || 0, order.currency || 'EUR')}
                          </span>
                        </div>
                        {order.discountValue > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600 dark:text-slate-400">{t('orders:discount')}</span>
                            <span className="font-medium text-green-600 dark:text-green-400">
                              -{formatCurrency(
                                order.discountType === 'rate' 
                                  ? (order.subtotal * order.discountValue / 100) 
                                  : order.discountValue || 0, 
                                order.currency || 'EUR'
                              )}
                            </span>
                          </div>
                        )}
                        {order.shippingCost > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600 dark:text-slate-400">{t('orders:shipping')}</span>
                            <span className="font-medium text-slate-900 dark:text-slate-100">
                              {formatCurrency(order.shippingCost || 0, order.currency || 'EUR')}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between text-base font-bold border-t border-slate-300 dark:border-slate-600 pt-2 mt-2">
                          <span className="text-slate-900 dark:text-slate-100">{t('orders:total')}</span>
                          <span className="text-blue-600 dark:text-blue-400">
                            {formatCurrency(order.grandTotal || 0, order.currency || 'EUR')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ),
              }}
              onRowClick={(order) => {
                sessionStorage.setItem('orderDetailsReferrer', location);
                navigate(`/orders/${order.id}`);
              }}
              renderBulkActions={({ selectedRows, selectedItems, bulkActions: actions, clearSelection }) => {
                // Store clearSelection in ref for use by mutations
                clearSelectionRef.current = clearSelection;
                return selectedRows.size > 0 ? (
                <div className="px-4 sm:px-0 pb-6">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs h-6 px-2">
                      {t('orders:selectedCount', { count: selectedRows.size })}
                    </Badge>
                    {actions.map((action, index) => {
                      if (action.type === "select") {
                        return (
                          <Select
                            key={index}
                            onValueChange={(value) => action.action(selectedItems, value)}
                          >
                            <SelectTrigger className="h-6 w-auto min-w-[100px] text-xs">
                              <SelectValue placeholder={action.placeholder || action.label} />
                            </SelectTrigger>
                            <SelectContent align="start">
                              {action.options.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        );
                      } else {
                        return (
                          <Button
                            key={index}
                            size="sm"
                            variant={action.variant || "ghost"}
                            onClick={() => action.action(selectedItems)}
                            className="h-6 px-2 text-xs"
                          >
                            {action.label}
                          </Button>
                        );
                      }
                    })}
                    
                    {/* Export Options */}
                    <div className="flex items-center gap-1 ml-2 pl-2 border-l border-slate-300 dark:border-slate-600">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleExportXLSX}
                        className="h-6 px-2 text-xs"
                        data-testid="button-bulk-export-xlsx"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        {t('orders:exportToExcel')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleExportPDF}
                        className="h-6 px-2 text-xs"
                        data-testid="button-bulk-export-pdf"
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        {t('orders:exportToPDF')}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null;
            }}
            />
          ) : (
            <div className="space-y-1">
                {filteredOrders.map((order: any) => (
                  <div
                    key={order.id}
                    className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                    onClick={() => {
                      sessionStorage.setItem('orderDetailsReferrer', location);
                      navigate(`/orders/${order.id}`);
                    }}
                    data-testid={`compact-order-${order.id}`}
                  >
                    <div className="px-3 py-2">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {(() => {
                              // Color based on order status (matching Add/Edit Order colors)
                              const statusColors: Record<string, string> = {
                                'pending': 'bg-amber-500 dark:bg-amber-400',        // Amber - Waiting
                                'to_fulfill': 'bg-blue-500 dark:bg-blue-400',      // Blue - Action needed
                                'ready_to_ship': 'bg-blue-500 dark:bg-blue-400',   // Blue - Ready (same as to_fulfill)
                                'shipped': 'bg-green-500 dark:bg-green-400',        // Green - Completed
                                'cancelled': 'bg-red-500 dark:bg-red-400',        // Red - Cancelled
                              };
                              const bulletColor = statusColors[order.orderStatus] || 'bg-slate-500';
                              
                              return (
                                <div className="flex items-center gap-1.5">
                                  <div className={`w-2 h-2 rounded-full ${bulletColor}`} />
                                  <span className="font-semibold text-sm">{order.orderId}</span>
                                </div>
                              );
                            })()}
                            <Badge
                              className={cn(
                                "text-xs h-5 px-1.5 border",
                                order.orderStatus === 'pending' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-700' :
                                order.orderStatus === 'to_fulfill' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700' :
                                order.orderStatus === 'ready_to_ship' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700' :
                                order.orderStatus === 'shipped' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700' :
                                order.orderStatus === 'cancelled' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700' :
                                'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                              )}
                            >
                              {order.orderStatus?.replace('_', ' ')}
                            </Badge>
                            <Badge
                              className={cn(
                                "text-xs h-5 px-1.5 border",
                                order.paymentStatus === 'paid' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700' :
                                order.paymentStatus === 'pending' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-700' :
                                order.paymentStatus === 'pay_later' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700' :
                                'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                              )}
                            >
                              {order.paymentStatus?.replace('_', ' ')}
                            </Badge>
                          </div>
                          <div className="text-xs mt-0.5 flex items-center gap-1.5">
                            {order.customer?.country && (
                              <span className="text-sm flex-shrink-0">{getCountryFlag(order.customer.country)}</span>
                            )}
                            {order.customer?.profilePictureUrl ? (
                              <img 
                                src={order.customer.profilePictureUrl} 
                                alt={order.customer?.name || ''} 
                                className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            )}
                            {(() => {
                              const customerName = order.customer?.name || 'N/A';
                              const hash = customerName.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
                              const colors = [
                                'text-blue-600 dark:text-blue-400',
                                'text-emerald-600 dark:text-emerald-400', 
                                'text-violet-600 dark:text-violet-400',
                                'text-rose-600 dark:text-rose-400',
                                'text-amber-600 dark:text-amber-400',
                                'text-cyan-600 dark:text-cyan-400',
                                'text-pink-600 dark:text-pink-400',
                                'text-indigo-600 dark:text-indigo-400',
                              ];
                              const colorClass = colors[hash % colors.length];
                              
                              return (
                                <>
                                  <span className={`font-medium ${colorClass}`}>{customerName}</span>
                                  <span className="text-slate-600 dark:text-slate-400"> • {formatDate(order.createdAt)}</span>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-sm">{formatCurrency(order.grandTotal || 0, order.currency || 'EUR')}</div>
                        </div>
                      </div>
                      {expandAll && (
                        <div className="mt-1">
                          <OrderItemsLoader 
                            orderId={order.id} 
                            currency={order.currency}
                            variant="full"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
          )}
          </div>
          
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('orders:deleteOrdersTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('orders:deleteOrdersConfirm', { count: ordersToDelete.length })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              {t('orders:delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Orders Dialog - 3 Phase Design */}
      <Dialog open={showImportDialog} onOpenChange={(open) => {
        if (!open && importPhase !== 'processing') {
          resetImportDialog();
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('orders:importOrders')}</DialogTitle>
            <DialogDescription>
              {importPhase === 'upload' && t('orders:importOrdersDescription')}
              {importPhase === 'processing' && t('common:processing')}
              {importPhase === 'results' && t('orders:importComplete')}
            </DialogDescription>
          </DialogHeader>
          
          {/* Phase 1: Upload */}
          {importPhase === 'upload' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <h4 className="font-semibold text-sm mb-2">{t('orders:importantNotes')}</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• {t('orders:customersWillBeCreatedOrMatched')}</li>
                  <li>• {t('orders:orderIdRequired')}</li>
                  <li>• {t('orders:itemsFormatNote')}</li>
                </ul>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <h4 className="font-semibold text-sm mb-3">{t('orders:requiredExcelFormat')}</h4>
                
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-1">{t('orders:requiredColumns')}</p>
                    <div className="flex flex-wrap gap-2">
                      {ORDER_IMPORT_COLUMNS.required.map(col => (
                        <code key={col.key} className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">{col.key}</code>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-1">{t('orders:optionalColumns')} ({ORDER_IMPORT_COLUMNS.optional.length})</p>
                    <div className="flex flex-wrap gap-1.5 text-[10px]">
                      {ORDER_IMPORT_COLUMNS.optional.map(col => (
                        <code key={col.key} className="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded">{col.key}</code>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded">
                    <p className="font-semibold text-amber-800 dark:text-amber-200 text-sm mb-2">{t('orders:itemsFormat')}</p>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-start gap-2">
                        <span className="font-medium text-amber-700 dark:text-amber-300 whitespace-nowrap">{t('orders:format')}:</span>
                        <code className="bg-white dark:bg-slate-800 px-2 py-1 rounded font-mono">SKU x Qty; SKU x Qty</code>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-medium text-amber-700 dark:text-amber-300 whitespace-nowrap">{t('orders:withPrice')}:</span>
                        <code className="bg-white dark:bg-slate-800 px-2 py-1 rounded font-mono">SKU x Qty @Price</code>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-medium text-amber-700 dark:text-amber-300 whitespace-nowrap">{t('orders:example')}:</span>
                        <code className="bg-white dark:bg-slate-800 px-2 py-1 rounded font-mono">NAIL-001 x2; GEL-002 x3 @15.50</code>
                      </div>
                      <p className="text-muted-foreground italic">{t('orders:skuOrProductNameSupported')}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h4 className="font-semibold text-sm mb-2">{t('orders:exampleRow')}</h4>
                <div className="overflow-x-auto">
                  <table className="text-xs w-full border-collapse">
                    <thead>
                      <tr className="border-b dark:border-slate-700">
                        <th className="text-left p-2 font-semibold">Order ID</th>
                        <th className="text-left p-2 font-semibold">Customer Name</th>
                        <th className="text-left p-2 font-semibold">Grand Total</th>
                        <th className="text-left p-2 font-semibold">Sale Type</th>
                        <th className="text-left p-2 font-semibold">Items (SKU x Qty)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b dark:border-slate-700">
                        <td className="p-2">ORD-2025-001</td>
                        <td className="p-2">John Doe</td>
                        <td className="p-2">1239.00</td>
                        <td className="p-2">retail</td>
                        <td className="p-2 font-mono text-[10px]">SKU-ABC123 x2; SKU-XYZ789 x1</td>
                      </tr>
                      <tr>
                        <td className="p-2">ORD-2025-002</td>
                        <td className="p-2">Jane Smith</td>
                        <td className="p-2">279.25</td>
                        <td className="p-2">wholesale</td>
                        <td className="p-2 font-mono text-[10px]">NAIL-001 x3 @15.50; GEL-002 x1</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={handleDownloadTemplate}
                    data-testid="button-download-template"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {t('orders:downloadTemplate')}
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={() => document.getElementById('order-import-file')?.click()}
                    data-testid="button-select-import-file"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {t('orders:selectExcelFile')}
                  </Button>
                </div>
                <input
                  id="order-import-file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                  data-testid="input-import-file"
                />
                {importFile && (
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                      <Check className="h-4 w-4" />
                      <span className="text-sm font-medium">{importFile.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setImportFile(null)}
                      data-testid="button-remove-file"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={resetImportDialog} data-testid="button-cancel-import">
                  {t('common:cancel')}
                </Button>
                <Button 
                  onClick={handleImport} 
                  disabled={!importFile || isImporting}
                  data-testid="button-confirm-import"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {t('orders:importOrders')}
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* Phase 2: Processing */}
          {importPhase === 'processing' && (
            <div className="py-8 space-y-6">
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 border-4 border-blue-200 dark:border-blue-800 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-blue-600 dark:border-blue-400 rounded-full border-t-transparent animate-spin"></div>
                </div>
                <div className="text-center">
                  <p className="font-medium text-lg">{t('orders:importingOrders')}</p>
                  <p className="text-sm text-muted-foreground">{t('orders:pleaseWait')}</p>
                </div>
              </div>
              <Progress value={undefined} className="w-full" />
            </div>
          )}

          {/* Phase 3: Results */}
          {importPhase === 'results' && importResults && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800">
                  <div className="text-2xl font-bold">{importResults.totalRows}</div>
                  <div className="text-xs text-muted-foreground">{t('orders:totalRows')}</div>
                </div>
                <div className="p-4 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <div className="text-2xl font-bold text-green-700 dark:text-green-400">{importResults.imported}</div>
                  <div className="text-xs text-muted-foreground">{t('orders:imported')}</div>
                </div>
                <div className="p-4 rounded-lg bg-red-100 dark:bg-red-900/30">
                  <div className="text-2xl font-bold text-red-700 dark:text-red-400">{importResults.failed}</div>
                  <div className="text-xs text-muted-foreground">{t('orders:failed')}</div>
                </div>
                <div className="p-4 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{importResults.customersCreated}</div>
                  <div className="text-xs text-muted-foreground">{t('orders:customersCreated')}</div>
                </div>
                <div className="p-4 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">{importResults.customersExisting}</div>
                  <div className="text-xs text-muted-foreground">{t('orders:customersExisting')}</div>
                </div>
              </div>

              {/* Error Log (Collapsible) */}
              {importResults.errors.length > 0 && (
                <Collapsible open={showErrorDetails} onOpenChange={setShowErrorDetails}>
                  <CollapsibleTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full justify-between text-red-600 dark:text-red-400 border-red-200 dark:border-red-800"
                      data-testid="button-toggle-errors"
                    >
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        {t('orders:errorLog')} ({importResults.errors.length})
                      </span>
                      {showErrorDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <ScrollArea className="h-48 mt-2 rounded-lg border">
                      <div className="p-3 space-y-2">
                        {importResults.errors.map((err, idx) => (
                          <div key={idx} className="p-2 bg-red-50 dark:bg-red-950/20 rounded text-sm">
                            <div className="font-medium text-red-700 dark:text-red-400">
                              {t('orders:row')} {err.row}{err.orderId && ` - ${err.orderId}`}
                            </div>
                            <div className="text-red-600 dark:text-red-300">{err.reason}</div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Successful Orders (Collapsible) */}
              {importResults.successfulOrders.length > 0 && (
                <Collapsible open={showSuccessfulOrders} onOpenChange={setShowSuccessfulOrders}>
                  <CollapsibleTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full justify-between text-green-600 dark:text-green-400 border-green-200 dark:border-green-800"
                      data-testid="button-toggle-successful"
                    >
                      <span className="flex items-center gap-2">
                        <Check className="h-4 w-4" />
                        {t('orders:successfulOrders')} ({importResults.successfulOrders.length})
                      </span>
                      {showSuccessfulOrders ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <ScrollArea className="h-48 mt-2 rounded-lg border">
                      <div className="p-3 space-y-2">
                        {importResults.successfulOrders.map((order, idx) => (
                          <div key={idx} className="p-2 bg-green-50 dark:bg-green-950/20 rounded text-sm flex justify-between items-center">
                            <span className="font-medium">{order.orderId}</span>
                            <span className="text-muted-foreground">{order.customerName}</span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Action Buttons */}
              <DialogFooter className="gap-2 flex-col sm:flex-row">
                {importResults.errors.length > 0 && (
                  <Button 
                    variant="outline" 
                    onClick={downloadErrorLog}
                    data-testid="button-download-errors"
                  >
                    <FileDown className="mr-2 h-4 w-4" />
                    {t('orders:downloadErrorLog')}
                  </Button>
                )}
                {importResults.successfulOrders.length > 0 && (
                  <Button 
                    variant="destructive" 
                    onClick={handleRevertImport}
                    disabled={isReverting}
                    data-testid="button-revert-import"
                  >
                    {isReverting ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Undo2 className="mr-2 h-4 w-4" />
                    )}
                    {t('orders:revertAll')}
                  </Button>
                )}
                <Button 
                  onClick={resetImportDialog}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="button-keep-all"
                >
                  <Check className="mr-2 h-4 w-4" />
                  {t('orders:keepAll')}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Scroll Navigation Buttons - Desktop only, shown when orders are expanded */}
      {expandAll && viewMode === 'normal' && filteredOrders && filteredOrders.length > 0 && (
        <div className="hidden lg:block fixed right-8 bottom-24 z-50">
          <div className="flex flex-col gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="default"
                    size="icon"
                    onClick={() => scrollToExpandedOrder('prev')}
                    className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all bg-green-600 hover:bg-green-700"
                    data-testid="button-scroll-up"
                  >
                    <ArrowUp className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>{t('orders:previousOrder')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="default"
                    size="icon"
                    onClick={() => scrollToExpandedOrder('next')}
                    className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all bg-green-600 hover:bg-green-700"
                    data-testid="button-scroll-down"
                  >
                    <ArrowDown className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>{t('orders:nextOrder')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      )}
    </div>
  );
}
