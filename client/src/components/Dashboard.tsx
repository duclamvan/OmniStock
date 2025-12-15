import { lazy, Suspense, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { 
  Package, 
  AlertCircle, 
  CheckCircle2, 
  Truck, 
  ClipboardCheck,
  Euro,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  Target,
  Users,
  Headphones,
  CreditCard,
  Bell,
  Info,
  ArrowRight,
  Activity,
  ShoppingCart,
  ClipboardList,
  Tag,
  Ship,
  Calendar,
  Percent,
  Phone,
  Ticket
} from "lucide-react";
import { Link } from "wouter";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";

// Lazy load chart components
const RevenueChart = lazy(() => import("./charts/RevenueChart").then(m => ({ default: m.RevenueChart })));
const ExpensesChart = lazy(() => import("./charts/ExpensesChart").then(m => ({ default: m.ExpensesChart })));
const YearlyChart = lazy(() => import("./charts/YearlyChart").then(m => ({ default: m.YearlyChart })));

// TypeScript interfaces for API responses
interface OperationsPulseData {
  ordersAwaitingFulfillment: number;
  ordersAtRiskOfSLA: number;
  pickPackThroughputToday: number;
  carrierExceptions: number;
  pendingStockAdjustments: number;
  timestamp: string;
}

interface FinancialControlData {
  totalRevenueEur: number;
  netProfit: number;
  profitMarginPercent: number;
  averageOrderValue: number;
  agedReceivables: {
    '30-60days': number;
    '60-90days': number;
    '90plus': number;
  };
  cashConversionByCurrency: {
    EUR: { current: number; previous: number; trend: number };
    CZK: { current: number; previous: number; trend: number };
    USD: { current: number; previous: number; trend: number };
  };
  timestamp: string;
}

interface InventoryRiskData {
  lowStockCount: number;
  overAllocatedSKUs: number;
  agingInventoryCount: number;
  inboundBacklog: number;
  supplierDelayAlerts: number;
  timestamp: string;
}

interface FulfillmentEfficiencyData {
  pickErrorsCount: number;
  aiCartonRecommendationsUsed: number;
  aiAdoptionRatePercent: number;
  ordersByStage: {
    to_fulfill: number;
    picking: number;
    packing: number;
    shipped: number;
    fulfilled: number;
  };
  carrierOnTimeRatePercent: number;
  timestamp: string;
}

interface CustomerSupportData {
  top10CustomersByRevenue: Array<{
    customerId: string;
    name: string;
    revenue: number;
  }>;
  activeSupportTickets: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
  totalActiveTickets: number;
  codPaymentStatus: {
    pending: number;
    paid: number;
    failed: number;
  };
  retentionRatePercent: number;
  timestamp: string;
}

interface SystemAlertsData {
  returnsSpike: {
    thisWeek: number;
    lastWeek: number;
    averageWeekly: number;
    spikePercent: number;
    isAlert: boolean;
  };
  recentCriticalNotifications: Array<{
    id: string;
    title: string;
    description: string;
    type: string;
    createdAt: string;
  }>;
  integrationHealth: {
    orderProcessing: string;
    lastOrderAt: string | null;
    recentOrderCount: number;
  };
  recentAuditHighlights: Array<{
    id: string;
    description: string;
    createdAt: string;
  }>;
  timestamp: string;
}

interface ActionItemsData {
  preordersAwaitingNotice: Array<{
    id: string;
    customerId: string;
    customerName: string;
    customerPhone: string | null;
    status: string;
    expectedDate: string | null;
    reminderEnabled: boolean;
    priority: string;
    notes: string | null;
    createdAt: string;
  }>;
  preordersCount: number;
  openTickets: Array<{
    id: number;
    ticketId: string;
    subject: string;
    severity: string;
    status: string;
    customerId: string | null;
    customerName: string | null;
    orderId: string | null;
    createdAt: string;
  }>;
  openTicketsCount: number;
  ticketsBySeverity: {
    urgent: number;
    high: number;
    medium: number;
    low: number;
  };
  activeDiscounts: Array<{
    id: number;
    discountId: string;
    name: string;
    type: string;
    percentage: string | null;
    value: string | null;
    minOrderAmount: string | null;
    startDate: string | null;
    endDate: string | null;
    applicationScope: string;
  }>;
  activeDiscountsCount: number;
  incomingShipments: Array<{
    id: number;
    shipmentName: string | null;
    carrier: string;
    trackingNumber: string;
    status: string;
    origin: string;
    destination: string;
    estimatedDelivery: string | null;
    totalUnits: number | null;
    createdAt: string;
  }>;
  incomingShipmentsCount: number;
  timestamp: string;
}

// Skeleton components
const MetricCardSkeleton = memo(() => (
  <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
    <CardContent className="p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24 bg-slate-200 dark:bg-slate-700" />
          <Skeleton className="h-8 w-32 bg-slate-200 dark:bg-slate-700" />
          <Skeleton className="h-3 w-20 bg-slate-200 dark:bg-slate-700" />
        </div>
        <Skeleton className="h-12 w-12 rounded-lg ml-4 bg-slate-200 dark:bg-slate-700" />
      </div>
    </CardContent>
  </Card>
));
MetricCardSkeleton.displayName = 'MetricCardSkeleton';

const ChartSkeleton = memo(() => (
  <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
    <CardHeader className="flex flex-row items-center justify-between">
      <Skeleton className="h-6 w-32 bg-slate-200 dark:bg-slate-700" />
      <Skeleton className="h-8 w-24 bg-slate-200 dark:bg-slate-700" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-64 w-full bg-slate-200 dark:bg-slate-700" />
    </CardContent>
  </Card>
));
ChartSkeleton.displayName = 'ChartSkeleton';

export function Dashboard() {
  const { t } = useTranslation('common');
  const { formatCurrency } = useLocalization();
  
  // Query all dashboard endpoints
  // Operations pulse - faster polling (15s) for critical fulfillment metrics
  const { data: operationsPulse, isLoading: operationsLoading, dataUpdatedAt: operationsUpdatedAt } = useQuery<OperationsPulseData>({
    queryKey: ['/api/dashboard/operations-pulse'],
    staleTime: 10 * 1000, // Data stale after 10 seconds
    refetchInterval: 15 * 1000, // Refetch every 15 seconds for near real-time order updates
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: false,
  });

  const { data: financialControl, isLoading: financialLoading } = useQuery<FinancialControlData>({
    queryKey: ['/api/dashboard/financial-control'],
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  const { data: inventoryRisk, isLoading: inventoryLoading } = useQuery<InventoryRiskData>({
    queryKey: ['/api/dashboard/inventory-risk'],
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  // Fulfillment efficiency - faster polling (20s) for pick/pack metrics
  const { data: fulfillmentEfficiency, isLoading: fulfillmentLoading } = useQuery<FulfillmentEfficiencyData>({
    queryKey: ['/api/dashboard/fulfillment-efficiency'],
    staleTime: 15 * 1000,
    refetchInterval: 20 * 1000, // Faster refresh for fulfillment metrics
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: false,
  });

  const { data: customerSupport, isLoading: customerLoading } = useQuery<CustomerSupportData>({
    queryKey: ['/api/dashboard/customer-support'],
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  // System alerts - faster polling (15s) for real-time alert detection
  const { data: systemAlerts, isLoading: alertsLoading } = useQuery<SystemAlertsData>({
    queryKey: ['/api/dashboard/system-alerts'],
    staleTime: 10 * 1000,
    refetchInterval: 15 * 1000,
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: false,
  });

  // Action items - preorders, tickets, discounts, incoming shipments
  const { data: actionItems, isLoading: actionItemsLoading } = useQuery<ActionItemsData>({
    queryKey: ['/api/dashboard/action-items'],
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000, // Refresh every minute
    refetchOnWindowFocus: true,
  });

  const { user } = useAuth();
  const isAdmin = user?.role === 'administrator';
  
  const { data: majorNotifications, isLoading: notificationsLoading } = useQuery<any[]>({
    queryKey: ['/api/notifications?majorOnly=true&limit=10'],
    enabled: isAdmin,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100" data-testid="heading-dashboard">
            {t('common:adminCommandCenter')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1" data-testid="text-dashboard-subtitle">
            {t('common:realTimeOperationalIntelligence')}
          </p>
        </div>
        <Badge variant="outline" className="text-sm flex items-center gap-2 w-fit">
          <Activity className="h-4 w-4 text-green-500" />
          <span className="text-gray-900 dark:text-gray-100">{t('common:liveUpdates')}</span>
        </Badge>
      </div>

      {/* Action Items Section - Quick access to pending work */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2" data-testid="heading-action-items">
            <ClipboardList className="h-5 w-5 text-orange-500" />
            {t('common:actionItems')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('common:actionItemsDescription')}</p>
        </div>

        {actionItemsLoading && !actionItems ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <MetricCardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Pre-orders Awaiting Notice */}
            <Link href="/pre-orders">
              <Card className={`cursor-pointer hover:shadow-lg transition-shadow h-full ${(actionItems?.preordersCount || 0) > 0 ? 'bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`} data-testid="card-preorders-action">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {t('common:preordersAwaitingNotice')}
                    </CardTitle>
                    <Badge variant={actionItems?.preordersCount ? 'default' : 'outline'} className={actionItems?.preordersCount ? 'bg-purple-600' : ''}>
                      {actionItems?.preordersCount || 0}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {actionItems?.preordersAwaitingNotice?.length ? (
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {actionItems.preordersAwaitingNotice.slice(0, 3).map((po) => (
                        <div key={po.id} className="text-sm border-l-2 border-purple-400 pl-2">
                          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{po.customerName}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                              {po.status === 'pending' ? t('common:pending') : t('common:partiallyArrived')}
                            </Badge>
                            {po.expectedDate && (
                              <span>{new Date(po.expectedDate).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      ))}
                      {(actionItems?.preordersCount || 0) > 3 && (
                        <p className="text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1">
                          +{(actionItems?.preordersCount || 0) - 3} {t('common:more')} <ArrowRight className="h-3 w-3" />
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('common:noPreordersWaiting')}</p>
                  )}
                </CardContent>
              </Card>
            </Link>

            {/* Open Tickets */}
            <Link href="/tickets">
              <Card className={`cursor-pointer hover:shadow-lg transition-shadow h-full ${(actionItems?.openTicketsCount || 0) > 0 ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`} data-testid="card-tickets-action">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <Ticket className="h-4 w-4" />
                      {t('common:openTickets')}
                    </CardTitle>
                    <Badge variant={actionItems?.openTicketsCount ? 'destructive' : 'outline'}>
                      {actionItems?.openTicketsCount || 0}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {actionItems?.ticketsBySeverity && (actionItems.ticketsBySeverity.urgent > 0 || actionItems.ticketsBySeverity.high > 0) ? (
                    <div className="space-y-1">
                      {actionItems.ticketsBySeverity.urgent > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{t('common:urgent')}</Badge>
                          <span className="font-bold text-red-600 dark:text-red-400">{actionItems.ticketsBySeverity.urgent}</span>
                        </div>
                      )}
                      {actionItems.ticketsBySeverity.high > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-orange-500 text-orange-500">{t('common:high')}</Badge>
                          <span className="font-medium text-orange-600 dark:text-orange-400">{actionItems.ticketsBySeverity.high}</span>
                        </div>
                      )}
                      {actionItems?.openTickets?.slice(0, 2).map((ticket) => (
                        <div key={ticket.id} className="text-xs text-gray-600 dark:text-gray-400 truncate border-l-2 border-red-400 pl-2">
                          {ticket.subject}
                        </div>
                      ))}
                    </div>
                  ) : actionItems?.openTicketsCount ? (
                    <div className="space-y-1">
                      {actionItems?.openTickets?.slice(0, 3).map((ticket) => (
                        <div key={ticket.id} className="text-xs text-gray-600 dark:text-gray-400 truncate border-l-2 border-gray-300 dark:border-gray-600 pl-2">
                          {ticket.subject}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('common:noOpenTickets')}</p>
                  )}
                </CardContent>
              </Card>
            </Link>

            {/* Active Discounts */}
            <Link href="/discounts">
              <Card className={`cursor-pointer hover:shadow-lg transition-shadow h-full ${(actionItems?.activeDiscountsCount || 0) > 0 ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`} data-testid="card-discounts-action">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      {t('common:activeDiscounts')}
                    </CardTitle>
                    <Badge variant={actionItems?.activeDiscountsCount ? 'default' : 'outline'} className={actionItems?.activeDiscountsCount ? 'bg-green-600' : ''}>
                      {actionItems?.activeDiscountsCount || 0}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {actionItems?.activeDiscounts?.length ? (
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {actionItems.activeDiscounts.slice(0, 3).map((discount) => (
                        <div key={discount.id} className="text-sm border-l-2 border-green-400 pl-2">
                          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{discount.name}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            {discount.percentage ? (
                              <>
                                <Percent className="h-3 w-3" />
                                <span>{discount.percentage}%</span>
                              </>
                            ) : discount.value ? (
                              <span>{formatCurrency(parseFloat(discount.value), 'EUR')}</span>
                            ) : discount.type ? (
                              <Badge variant="outline" className="text-[10px] px-1 py-0">{discount.type}</Badge>
                            ) : null}
                            {discount.endDate && (
                              <span className="text-orange-500">→ {new Date(discount.endDate).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      ))}
                      {(actionItems?.activeDiscountsCount || 0) > 3 && (
                        <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                          +{(actionItems?.activeDiscountsCount || 0) - 3} {t('common:more')} <ArrowRight className="h-3 w-3" />
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('common:noActiveDiscounts')}</p>
                  )}
                </CardContent>
              </Card>
            </Link>

            {/* Incoming Shipments */}
            <Link href="/receiving">
              <Card className={`cursor-pointer hover:shadow-lg transition-shadow h-full ${(actionItems?.incomingShipmentsCount || 0) > 0 ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`} data-testid="card-shipments-action">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <Ship className="h-4 w-4" />
                      {t('common:incomingShipments')}
                    </CardTitle>
                    <Badge variant={actionItems?.incomingShipmentsCount ? 'default' : 'outline'} className={actionItems?.incomingShipmentsCount ? 'bg-blue-600' : ''}>
                      {actionItems?.incomingShipmentsCount || 0}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {actionItems?.incomingShipments?.length ? (
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {actionItems.incomingShipments.slice(0, 3).map((shipment) => (
                        <div key={shipment.id} className="text-sm border-l-2 border-blue-400 pl-2">
                          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {shipment.shipmentName || shipment.trackingNumber}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                              {shipment.status === 'pending' ? t('common:pending') : t('common:inTransit')}
                            </Badge>
                            {shipment.estimatedDelivery && (
                              <span>ETA: {new Date(shipment.estimatedDelivery).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      ))}
                      {(actionItems?.incomingShipmentsCount || 0) > 3 && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          +{(actionItems?.incomingShipmentsCount || 0) - 3} {t('common:more')} <ArrowRight className="h-3 w-3" />
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('common:noIncomingShipments')}</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          </div>
        )}
      </section>

      <Separator className="bg-slate-200 dark:bg-slate-700" />

      {/* Section 1: Operations Pulse */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2" data-testid="heading-operations-pulse">
            <Package className="h-5 w-5" />
            {t('common:operationsPulse')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('common:criticalFulfillmentMetrics')}</p>
        </div>
        
        {operationsLoading && !operationsPulse ? (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            {[...Array(5)].map((_, i) => <MetricCardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            {/* Orders to Fulfill */}
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400" data-testid="label-orders-to-fulfill">{t('common:ordersToFulfill')}</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1" data-testid="value-orders-to-fulfill">
                      {operationsPulse?.ordersAwaitingFulfillment || 0}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('common:awaitingPickup')}</p>
                  </div>
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                    <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* SLA Breach Risk */}
            <Card className={`${(operationsPulse?.ordersAtRiskOfSLA || 0) > 0 ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400" data-testid="label-sla-breach-risk">{t('common:slaBreachRisk')}</p>
                    <p className={`text-3xl font-bold mt-1 ${(operationsPulse?.ordersAtRiskOfSLA || 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`} data-testid="value-sla-breach-risk">
                      {operationsPulse?.ordersAtRiskOfSLA || 0}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('common:olderthan24h')}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${(operationsPulse?.ordersAtRiskOfSLA || 0) > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-slate-700'}`}>
                    <AlertCircle className={`h-6 w-6 ${(operationsPulse?.ordersAtRiskOfSLA || 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Today's Throughput */}
            <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400" data-testid="label-today-throughput">{t('common:todaysThroughput')}</p>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1" data-testid="value-today-throughput">
                      {operationsPulse?.pickPackThroughputToday || 0}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">{t('common:ordersFulfilled')}</p>
                  </div>
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Carrier Exceptions */}
            <Card className={`${(operationsPulse?.carrierExceptions || 0) > 0 ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400" data-testid="label-carrier-exceptions">{t('common:carrierExceptions')}</p>
                    <p className={`text-3xl font-bold mt-1 ${(operationsPulse?.carrierExceptions || 0) > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-gray-100'}`} data-testid="value-carrier-exceptions">
                      {operationsPulse?.carrierExceptions || 0}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('common:activeIssues')}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${(operationsPulse?.carrierExceptions || 0) > 0 ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-gray-100 dark:bg-slate-700'}`}>
                    <Truck className={`h-6 w-6 ${(operationsPulse?.carrierExceptions || 0) > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400'}`} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stock Approvals Needed */}
            <Link href="/stock/approvals">
              <Card className={`cursor-pointer hover:shadow-lg transition-shadow ${(operationsPulse?.pendingStockAdjustments || 0) > 0 ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`} data-testid="card-stock-approvals">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400" data-testid="label-stock-approvals">{t('common:stockApprovals')}</p>
                      <p className={`text-3xl font-bold mt-1 ${(operationsPulse?.pendingStockAdjustments || 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`} data-testid="value-stock-approvals">
                        {operationsPulse?.pendingStockAdjustments || 0}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                        {t('common:reviewNeeded')} <ArrowRight className="h-3 w-3" />
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg ${(operationsPulse?.pendingStockAdjustments || 0) > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-slate-700'}`}>
                      <ClipboardCheck className={`h-6 w-6 ${(operationsPulse?.pendingStockAdjustments || 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        )}
      </section>

      <Separator className="bg-slate-200 dark:bg-slate-700" />

      {/* Section 2: Financial Control */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2" data-testid="heading-financial-control">
            <Euro className="h-5 w-5" />
            {t('common:financialControl')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('common:revenueProfitCashFlowMetrics')}</p>
        </div>

        {financialLoading && !financialControl ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[...Array(4)].map((_, i) => <MetricCardSkeleton key={i} />)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
              {/* Total Revenue */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400" data-testid="label-total-revenue">{t('common:totalRevenue')}</p>
                    <Euro className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="value-total-revenue">
                    {formatCurrency(financialControl?.totalRevenueEur || 0, 'EUR')}
                  </p>
                  {financialControl?.cashConversionByCurrency.EUR && (
                    <div className="flex items-center gap-1 mt-2">
                      {financialControl.cashConversionByCurrency.EUR.trend >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                      )}
                      <span className={`text-xs ${financialControl.cashConversionByCurrency.EUR.trend >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {Math.abs(financialControl.cashConversionByCurrency.EUR.trend).toFixed(1)}{t('common:vsLastMonth')}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Net Profit */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400" data-testid="label-net-profit">{t('common:netProfit')}</p>
                    <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="value-net-profit">
                    {formatCurrency(financialControl?.netProfit || 0, 'EUR')}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    {t('common:margin')}: <span className="font-semibold text-green-600 dark:text-green-400" data-testid="value-profit-margin">{financialControl?.profitMarginPercent.toFixed(1)}%</span>
                  </p>
                </CardContent>
              </Card>

              {/* Average Order Value */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400" data-testid="label-average-order-value">{t('common:avgOrderValue')}</p>
                    <DollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="value-average-order-value">
                    {formatCurrency(financialControl?.averageOrderValue || 0, 'EUR')}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">{t('perTransaction')}</p>
                </CardContent>
              </Card>

              {/* Aged Receivables */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400" data-testid="label-aged-receivables">{t('agedReceivables')}</p>
                    <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">30-60d:</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100" data-testid="value-receivables-30-60">
                        {formatCurrency(financialControl?.agedReceivables['30-60days'] || 0, 'EUR')}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">60-90d:</span>
                      <span className="font-semibold text-orange-600 dark:text-orange-400" data-testid="value-receivables-60-90">
                        {formatCurrency(financialControl?.agedReceivables['60-90days'] || 0, 'EUR')}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">90+ days:</span>
                      <span className="font-semibold text-red-600 dark:text-red-400" data-testid="value-receivables-90-plus">
                        {formatCurrency(financialControl?.agedReceivables['90plus'] || 0, 'EUR')}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Currency Breakdown */}
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-lg text-gray-900 dark:text-gray-100" data-testid="heading-currency-breakdown">{t('currencyDistribution')}</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">{t('thisMonthVsLastMonth')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(financialControl?.cashConversionByCurrency || {}).map(([currency, data]) => (
                    <div key={currency} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-900 dark:text-gray-100" data-testid={`label-currency-${currency.toLowerCase()}`}>{currency}</span>
                        <Badge variant={data.trend >= 0 ? 'default' : 'destructive'} className="text-xs">
                          {data.trend >= 0 ? '+' : ''}{data.trend.toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {t('current')}: <span className="font-semibold text-gray-900 dark:text-gray-100" data-testid={`value-currency-current-${currency.toLowerCase()}`}>{data.current.toFixed(0)}</span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {t('previous')}: <span className="font-semibold text-gray-900 dark:text-gray-100" data-testid={`value-currency-previous-${currency.toLowerCase()}`}>{data.previous.toFixed(0)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </section>

      <Separator className="bg-slate-200 dark:bg-slate-700" />

      {/* Section 3: Inventory Risk */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2" data-testid="heading-inventory-risk">
            <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            {t('inventoryRiskAlerts')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('stockIssuesRequiringAttention')}</p>
        </div>

        {inventoryLoading && !inventoryRisk ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <MetricCardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Low Stock Products */}
            <Link href="/inventory?lowStock=true">
              <Card className={`cursor-pointer hover:shadow-lg transition-shadow ${(inventoryRisk?.lowStockCount || 0) > 0 ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`} data-testid="card-low-stock">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={`h-5 w-5 ${(inventoryRisk?.lowStockCount || 0) > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400'}`} />
                        <p className="font-semibold text-gray-900 dark:text-gray-100" data-testid="label-low-stock">{t('lowStockProducts')}</p>
                      </div>
                      <p className="text-3xl font-bold mt-2 text-gray-900 dark:text-gray-100" data-testid="value-low-stock">{inventoryRisk?.lowStockCount || 0}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-1">
                        {t('viewAll')} <ArrowRight className="h-3 w-3" />
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Over-Allocated SKUs */}
            <Link href="/inventory">
              <Card className={`cursor-pointer hover:shadow-lg transition-shadow ${(inventoryRisk?.overAllocatedSKUs || 0) > 0 ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`} data-testid="card-over-allocated">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <AlertCircle className={`h-5 w-5 ${(inventoryRisk?.overAllocatedSKUs || 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`} />
                        <p className="font-semibold text-gray-900 dark:text-gray-100" data-testid="label-over-allocated">{t('overAllocatedSkus')}</p>
                      </div>
                      <p className="text-3xl font-bold mt-2 text-gray-900 dark:text-gray-100" data-testid="value-over-allocated">{inventoryRisk?.overAllocatedSKUs || 0}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-1">
                        {t('reconcile')} <ArrowRight className="h-3 w-3" />
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Aging Inventory */}
            <Link href="/products">
              <Card className={`cursor-pointer hover:shadow-lg transition-shadow ${(inventoryRisk?.agingInventoryCount || 0) > 0 ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`} data-testid="card-aging-inventory">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={`h-5 w-5 ${(inventoryRisk?.agingInventoryCount || 0) > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-600 dark:text-gray-400'}`} />
                        <p className="font-semibold text-gray-900 dark:text-gray-100" data-testid="label-aging-inventory">{t('agingInventory')}</p>
                      </div>
                      <p className="text-3xl font-bold mt-2 text-gray-900 dark:text-gray-100" data-testid="value-aging-inventory">{inventoryRisk?.agingInventoryCount || 0}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{t('ninetyDaysNoMovement')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Inbound Backlog */}
            <Link href="/receiving">
              <Card className={`cursor-pointer hover:shadow-lg transition-shadow ${(inventoryRisk?.inboundBacklog || 0) > 0 ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`} data-testid="card-inbound-backlog">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Package className={`h-5 w-5 ${(inventoryRisk?.inboundBacklog || 0) > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`} />
                        <p className="font-semibold text-gray-900 dark:text-gray-100" data-testid="label-inbound-backlog">{t('inboundBacklog')}</p>
                      </div>
                      <p className="text-3xl font-bold mt-2 text-gray-900 dark:text-gray-100" data-testid="value-inbound-backlog">{inventoryRisk?.inboundBacklog || 0}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-1">
                        {t('processReceipts')} <ArrowRight className="h-3 w-3" />
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Supplier Delays */}
            <Link href="/imports">
              <Card className={`cursor-pointer hover:shadow-lg transition-shadow ${(inventoryRisk?.supplierDelayAlerts || 0) > 0 ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`} data-testid="card-supplier-delays">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Truck className={`h-5 w-5 ${(inventoryRisk?.supplierDelayAlerts || 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`} />
                        <p className="font-semibold text-gray-900 dark:text-gray-100" data-testid="label-supplier-delays">{t('supplierDelays')}</p>
                      </div>
                      <p className="text-3xl font-bold mt-2 text-gray-900 dark:text-gray-100" data-testid="value-supplier-delays">{inventoryRisk?.supplierDelayAlerts || 0}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-1">
                        {t('reviewShipments')} <ArrowRight className="h-3 w-3" />
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        )}
      </section>

      <Separator className="bg-slate-200 dark:bg-slate-700" />

      {/* Section 4: Fulfillment Efficiency & Section 5: Customer & Support */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 4: Fulfillment Efficiency */}
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2" data-testid="heading-fulfillment-efficiency">
              <Target className="h-5 w-5" />
              {t('fulfillmentEfficiency')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('pickPackPerformanceMetrics')}</p>
          </div>

          {fulfillmentLoading && !fulfillmentEfficiency ? (
            <div className="space-y-4">
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pick Errors */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400" data-testid="label-pick-errors">{t('pickErrorsThisMonth')}</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1" data-testid="value-pick-errors">
                        {fulfillmentEfficiency?.pickErrorsCount || 0}
                      </p>
                    </div>
                    <AlertCircle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                  </div>
                </CardContent>
              </Card>

              {/* AI Adoption Rate */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400" data-testid="label-ai-adoption">{t('aiCartonRecommendations')}</p>
                      <Badge variant="default" className="text-xs">{fulfillmentEfficiency?.aiAdoptionRatePercent.toFixed(1)}%</Badge>
                    </div>
                    <Progress value={fulfillmentEfficiency?.aiAdoptionRatePercent || 0} className="h-2" data-testid="progress-ai-adoption" />
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {fulfillmentEfficiency?.aiCartonRecommendationsUsed || 0} {t('ordersUsedAiSuggestions')}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Carrier OTD */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400" data-testid="label-carrier-otd">{t('carrierOnTimeDelivery')}</p>
                      <Badge variant={fulfillmentEfficiency && fulfillmentEfficiency.carrierOnTimeRatePercent >= 90 ? 'default' : 'destructive'} className="text-xs">
                        {fulfillmentEfficiency?.carrierOnTimeRatePercent.toFixed(1)}%
                      </Badge>
                    </div>
                    <Progress value={fulfillmentEfficiency?.carrierOnTimeRatePercent || 0} className="h-2" data-testid="progress-carrier-otd" />
                    <p className="text-xs text-gray-600 dark:text-gray-400">{t('targetDeliveryRate')}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Order Stage Distribution */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="text-sm text-gray-900 dark:text-gray-100" data-testid="heading-order-stages">{t('orderStageDistribution')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {fulfillmentEfficiency && Object.entries(fulfillmentEfficiency.ordersByStage).map(([stage, count]) => (
                    <div key={stage} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400 capitalize" data-testid={`label-stage-${stage}`}>{stage.replace('_', ' ')}</span>
                      <Badge variant="outline" data-testid={`value-stage-${stage}`}>{count}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </section>

        {/* Section 5: Customer & Support */}
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2" data-testid="heading-customer-support">
              <Users className="h-5 w-5" />
              {t('customerAndSupport')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('customerMetricsAndTickets')}</p>
          </div>

          {customerLoading && !customerSupport ? (
            <div className="space-y-4">
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Top Customers */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="text-sm text-gray-900 dark:text-gray-100" data-testid="heading-top-customers">{t('topCustomersThisMonth')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {customerSupport?.top10CustomersByRevenue.slice(0, 5).map((customer, index) => (
                    <div key={customer.customerId} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">#{index + 1}</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100" data-testid={`customer-name-${index}`}>{customer.name}</span>
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-gray-100" data-testid={`customer-revenue-${index}`}>
                        {formatCurrency(customer.revenue, 'EUR')}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Support Tickets */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-gray-900 dark:text-gray-100" data-testid="heading-support-tickets">{t('activeSupportTickets')}</CardTitle>
                    <Badge variant="outline" data-testid="value-total-tickets">{customerSupport?.totalActiveTickets || 0}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('low')}</span>
                    <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/20" data-testid="value-tickets-low">
                      {customerSupport?.activeSupportTickets.low || 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('medium')}</span>
                    <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-950/20" data-testid="value-tickets-medium">
                      {customerSupport?.activeSupportTickets.medium || 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('high')}</span>
                    <Badge variant="warning" data-testid="value-tickets-high">
                      {customerSupport?.activeSupportTickets.high || 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('urgent')}</span>
                    <Badge variant="destructive" data-testid="value-tickets-urgent">
                      {customerSupport?.activeSupportTickets.urgent || 0}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* COD Status */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2" data-testid="heading-cod-status">
                      <CreditCard className="h-4 w-4" />
                      {t('codCollectionStatus')}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{t('pending')}</span>
                    <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-950/20" data-testid="value-cod-pending">
                      {customerSupport?.codPaymentStatus.pending || 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{t('paid')}</span>
                    <Badge variant="default" className="bg-green-600 dark:bg-green-700" data-testid="value-cod-paid">
                      {customerSupport?.codPaymentStatus.paid || 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{t('failed')}</span>
                    <Badge variant="destructive" data-testid="value-cod-failed">
                      {customerSupport?.codPaymentStatus.failed || 0}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Retention Rate */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400" data-testid="label-retention-rate">{t('customerRetentionRate')}</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1" data-testid="value-retention-rate">
                        {customerSupport?.retentionRatePercent.toFixed(1)}%
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{t('ninetyDayCohort')}</p>
                    </div>
                    <Users className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </section>
      </div>

      <Separator className="bg-slate-200 dark:bg-slate-700" />

      {/* Section 6: System & Alerts */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2" data-testid="heading-system-alerts">
            <Bell className="h-5 w-5 text-red-600 dark:text-red-400" />
            {t('systemAlertsAndActivity')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('criticalAlertsAndActivities')}</p>
        </div>

        {alertsLoading && !systemAlerts ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Recent Major Activities - Admin Only */}
            {isAdmin && majorNotifications && majorNotifications.length > 0 && (
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 lg:col-span-3">
                <CardHeader>
                  <CardTitle className="text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    {t('recentMajorActivities')}
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-600 dark:text-gray-400">
                    {t('majorActivitiesFromAllUsers')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {majorNotifications.map((notif: any) => {
                      const getNotificationIcon = (type: string) => {
                        switch (type) {
                          case 'order_created':
                          case 'order_shipped':
                            return <ShoppingCart className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
                          case 'shipment_arrived':
                            return <Package className="h-5 w-5 text-green-600 dark:text-green-400" />;
                          case 'inventory_alert':
                            return <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />;
                          case 'receipt_approved':
                            return <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />;
                          default:
                            return <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />;
                        }
                      };

                      return (
                        <div 
                          key={notif.id} 
                          className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            {getNotificationIcon(notif.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {notif.title}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {notif.description}
                            </p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                              {notif.userName && (
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {notif.userName}
                                </span>
                              )}
                              <span>
                                {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Returns Spike Alert */}
            <Card className={`${systemAlerts?.returnsSpike.isAlert ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
              <CardHeader>
                <CardTitle className="text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2" data-testid="heading-returns-spike">
                  <AlertCircle className={`h-4 w-4 ${systemAlerts?.returnsSpike.isAlert ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`} />
                  {t('returnsSpikeDetection')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{t('thisWeek')}</span>
                  <Badge variant={systemAlerts?.returnsSpike.isAlert ? 'destructive' : 'outline'} data-testid="value-returns-this-week">
                    {systemAlerts?.returnsSpike.thisWeek || 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{t('lastWeek')}</span>
                  <Badge variant="outline" data-testid="value-returns-last-week">{systemAlerts?.returnsSpike.lastWeek || 0}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{t('trend')}</span>
                  <span className={`font-semibold ${systemAlerts?.returnsSpike.spikePercent && systemAlerts.returnsSpike.spikePercent > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`} data-testid="value-returns-trend">
                    {(systemAlerts?.returnsSpike.spikePercent ?? 0) >= 0 ? '+' : ''}{(systemAlerts?.returnsSpike.spikePercent ?? 0).toFixed(1)}%
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Integration Health */}
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2" data-testid="heading-integration-health">
                  <Activity className="h-4 w-4" />
                  {t('integrationHealth')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{t('orderProcessing')}</span>
                  <Badge variant={systemAlerts?.integrationHealth.orderProcessing === 'healthy' ? 'default' : 'warning'} data-testid="value-order-processing-status">
                    {systemAlerts?.integrationHealth.orderProcessing === 'healthy' ? t('healthy') : t('unknown')}
                  </Badge>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {t('recentOrders')}: <span className="font-semibold text-gray-900 dark:text-gray-100" data-testid="value-recent-order-count">{systemAlerts?.integrationHealth.recentOrderCount || 0}</span>
                </div>
              </CardContent>
            </Card>

            {/* Recent Audit Log */}
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2" data-testid="heading-recent-audit">
                  <Info className="h-4 w-4" />
                  {t('recentActivityFeed')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {systemAlerts?.recentAuditHighlights.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="text-xs text-gray-600 dark:text-gray-400 pb-2 border-b border-slate-200 dark:border-slate-700 last:border-0" data-testid={`audit-item-${activity.id}`}>
                      {activity.description}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </section>

      <Separator className="bg-slate-200 dark:bg-slate-700" />

      {/* Financial Analytics Section (Existing Charts) */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100" data-testid="heading-financial-analytics">
            {t('financialAnalytics')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('historicalPerformanceTrends')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-gray-900 dark:text-gray-100">{t('revenueAndProfit')}</CardTitle>
              <select className="text-sm border border-slate-300 dark:border-gray-600 rounded px-3 py-1 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100">
                <option>{t('year')}</option>
                <option>{t('month')}</option>
                <option>{t('week')}</option>
              </select>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<ChartSkeleton />}>
                <RevenueChart />
              </Suspense>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-gray-900 dark:text-gray-100">{t('totalExpenses')}</CardTitle>
              <select className="text-sm border border-slate-300 dark:border-gray-600 rounded px-3 py-1 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100">
                <option>{t('thisYear')}</option>
                <option>{t('lastYear')}</option>
              </select>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<ChartSkeleton />}>
                <ExpensesChart />
              </Suspense>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-gray-900 dark:text-gray-100">{t('yearlyReport')}</CardTitle>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-800 dark:bg-blue-600 rounded"></div>
                <span className="text-sm text-slate-600 dark:text-gray-400">{t('purchased')}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-400 dark:bg-blue-300 rounded"></div>
                <span className="text-sm text-slate-600 dark:text-gray-400">{t('soldAmount')}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<ChartSkeleton />}>
              <YearlyChart />
            </Suspense>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
