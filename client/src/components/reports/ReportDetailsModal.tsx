import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/currencyUtils";
import { Package, TrendingUp, Users, Boxes, CheckCircle, Clock, XCircle } from "lucide-react";

interface WeeklyReportData {
  period: string;
  startDate: string;
  endDate: string;
  generatedAt: string;
  summary: {
    totalOrders: number;
    completedOrders: number;
    pendingOrders: number;
    cancelledOrders: number;
    totalRevenue: number;
    totalItemsSold: number;
    averageOrderValue: number;
    newCustomers: number;
  };
  inventory: {
    totalProducts: number;
    lowStockProducts: number;
    outOfStockProducts: number;
    stockAdjustments: number;
    itemsReceived: number;
  };
  topProducts: Array<{ id: string; name: string; quantitySold: number; revenue: number }>;
  topCustomers: Array<{ id: string; name: string; orderCount: number; totalSpent: number }>;
  financials?: {
    totalExpenses: number;
    grossProfit: number;
    expensesByCategory: Record<string, number>;
  };
}

interface ReportDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: WeeklyReportData | null | undefined;
  currency: string;
}

export function ReportDetailsModal({ open, onOpenChange, report, currency }: ReportDetailsModalProps) {
  const { t } = useTranslation(['dashboard', 'common']);

  if (!report) return null;

  const completionRate = report.summary.totalOrders > 0 
    ? (report.summary.completedOrders / report.summary.totalOrders) * 100 
    : 0;

  const profitMargin = report.summary.totalRevenue > 0 && report.financials
    ? (report.financials.grossProfit / report.summary.totalRevenue) * 100
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-gray-50 dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {t('dashboard:reportDetails', 'Report Details')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-blue-500 hover:bg-blue-600 text-white">
              {report.period || 'weekly'}
            </Badge>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {new Date(report.startDate).toLocaleDateString()} - {new Date(report.endDate).toLocaleDateString()}
            </span>
            <Badge variant="outline" className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
              {t('dashboard:generated', 'Generated')}: {new Date(report.generatedAt).toLocaleString()}
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('dashboard:totalOrders', 'Total Orders')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{report.summary.totalOrders}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('dashboard:totalRevenue', 'Total Revenue')}</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{formatCurrency(report.summary.totalRevenue, currency)}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('dashboard:itemsSold', 'Items Sold')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{report.summary.totalItemsSold}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('dashboard:avgOrderValue', 'Avg Order Value')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{formatCurrency(report.summary.averageOrderValue, currency)}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4">
              <Package className="h-4 w-4 text-blue-500" />
              {t('dashboard:orderFulfillment', 'Order Fulfillment')}
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard:completionRate', 'Completion Rate')}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{completionRate.toFixed(1)}%</span>
                </div>
                <Progress value={completionRate} className="h-2" />
              </div>
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('dashboard:completed', 'Completed')}</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{report.summary.completedOrders}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('dashboard:pending', 'Pending')}</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{report.summary.pendingOrders}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('dashboard:cancelled', 'Cancelled')}</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{report.summary.cancelledOrders}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {report.financials && (
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                {t('dashboard:financialOverview', 'Financial Overview')}
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3">
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{t('dashboard:profitMargin', 'Profit Margin')}</p>
                  <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{profitMargin.toFixed(1)}%</p>
                </div>
                <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3">
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium">{t('dashboard:grossProfit', 'Gross Profit')}</p>
                  <p className="text-xl font-bold text-green-700 dark:text-green-300">{formatCurrency(report.financials.grossProfit, currency)}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3">
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">{t('dashboard:expenses', 'Expenses')}</p>
                  <p className="text-xl font-bold text-red-700 dark:text-red-300">{formatCurrency(report.financials.totalExpenses, currency)}</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4">
              <Boxes className="h-4 w-4 text-purple-500" />
              {t('dashboard:inventoryHealth', 'Inventory Health')}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="text-center p-2 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{report.inventory.totalProducts}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('dashboard:totalProducts', 'Total Products')}</p>
              </div>
              <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
                <p className="text-lg font-bold text-yellow-700 dark:text-yellow-400">{report.inventory.lowStockProducts}</p>
                <p className="text-xs text-yellow-600 dark:text-yellow-500">{t('dashboard:lowStock', 'Low Stock')}</p>
              </div>
              <div className="text-center p-2 bg-red-50 dark:bg-red-950/30 rounded-lg">
                <p className="text-lg font-bold text-red-700 dark:text-red-400">{report.inventory.outOfStockProducts}</p>
                <p className="text-xs text-red-600 dark:text-red-500">{t('dashboard:outOfStock', 'Out of Stock')}</p>
              </div>
              <div className="text-center p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <p className="text-lg font-bold text-blue-700 dark:text-blue-400">{report.inventory.itemsReceived}</p>
                <p className="text-xs text-blue-600 dark:text-blue-500">{t('dashboard:itemsReceived', 'Items Received')}</p>
              </div>
              <div className="text-center p-2 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                <p className="text-lg font-bold text-purple-700 dark:text-purple-400">{report.inventory.stockAdjustments}</p>
                <p className="text-xs text-purple-600 dark:text-purple-500">{t('dashboard:adjustments', 'Adjustments')}</p>
              </div>
            </div>
          </div>

          {report.topCustomers && report.topCustomers.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4">
                <Users className="h-4 w-4 text-indigo-500" />
                {t('dashboard:topCustomers', 'Top Customers')}
              </h3>
              <div className="space-y-2">
                {report.topCustomers.slice(0, 5).map((customer, index) => (
                  <div key={customer.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-sm font-semibold">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{customer.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {customer.orderCount} {t('dashboard:orders', 'orders')}
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {formatCurrency(customer.totalSpent, currency)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
