import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatCompactNumber, convertCurrency, type Currency } from "@/lib/currencyUtils";
import { useLocalization } from "@/contexts/LocalizationContext";
import { exportToXLSX, exportToPDF, PDFColumn } from "@/lib/exportUtils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  TrendingUp,
  TrendingDown,
  Euro,
  Coins,
  Package,
  Users,
  ShoppingCart,
  FileDown,
  FileText,
  Calendar,
  Star,
  AlertTriangle,
  Target,
  BarChart3,
  PieChart,
  Activity
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, subDays, subMonths, subYears, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";

const CURRENCY_SYMBOLS: Record<string, string> = {
  CZK: 'Kč',
  EUR: '€',
  USD: '$',
  VND: '₫',
  CNY: '¥',
};

export default function Reports() {
  const { toast } = useToast();
  const { t } = useTranslation('reports');
  const { t: tCommon } = useTranslation('common');
  const { formatCurrency, settings } = useLocalization();
  const [dateRange, setDateRange] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);
  const [isCustomPickerOpen, setIsCustomPickerOpen] = useState(false);
  const [displayCurrency, setDisplayCurrency] = useState<'CZK' | 'EUR' | 'USD'>('CZK');

  const formatCompactCurrency = (amount: number, currencyCode: string): string => {
    const compactValue = formatCompactNumber(amount);
    const symbol = CURRENCY_SYMBOLS[currencyCode] || currencyCode;
    if (currencyCode === 'CZK' || currencyCode === 'VND') {
      return `${compactValue} ${symbol}`;
    }
    return `${symbol}${compactValue}`;
  };

  // Fetch all necessary data
  const { data: products = [] } = useQuery({ queryKey: ['/api/products'] });
  const { data: orders = [] } = useQuery({ queryKey: ['/api/orders'] });
  const { data: customers = [] } = useQuery({ queryKey: ['/api/customers'] });
  const { data: orderItems = [] } = useQuery({
    queryKey: ['/api/order-items/all'],
    queryFn: async () => {
      const response = await fetch('/api/order-items/all', { credentials: 'include' });
      if (!response.ok) return [];
      return response.json();
    },
  });
  const { data: expenses = [] } = useQuery({ queryKey: ['/api/expenses'] });
  
  // Fetch live exchange rates from Frankfurter API
  const { data: exchangeRates } = useQuery({
    queryKey: ['/api/exchange-rates'],
    queryFn: async () => {
      try {
        const response = await fetch('https://api.frankfurter.app/latest?from=EUR');
        if (!response.ok) return { rates: { CZK: 25, USD: 1.1 } };
        return response.json();
      } catch {
        return { rates: { CZK: 25, USD: 1.1 } };
      }
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  // Calculate date range
  const getDateRange = () => {
    const now = new Date();
    switch (dateRange) {
      case 'today':
        return { start: new Date(now.setHours(0, 0, 0, 0)), end: new Date() };
      case 'week':
        return { start: subDays(now, 7), end: new Date() };
      case 'month':
        return { start: subMonths(now, 1), end: new Date() };
      case 'thisMonth':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'year':
        return { start: startOfYear(now), end: endOfYear(now) };
      case 'lastYear':
        const lastYearDate = subYears(now, 1);
        return { start: startOfYear(lastYearDate), end: endOfYear(lastYearDate) };
      case 'custom':
        if (customStartDate && customEndDate) {
          return { start: customStartDate, end: customEndDate };
        }
        return { start: new Date(0), end: new Date() };
      default:
        return { start: new Date(0), end: new Date() };
    }
  };

  const { start: startDate, end: endDate } = getDateRange();

  // Filter orders by date range AND shipped/paid status for accurate revenue
  const filteredOrders = useMemo(() => {
    return (orders as any[]).filter((order: any) => {
      const orderDate = new Date(order.createdAt);
      const inDateRange = orderDate >= startDate && orderDate <= endDate;
      // Only include shipped and paid orders for revenue calculation (consistent with Dashboard)
      const isCompleted = order.orderStatus === 'shipped' && order.paymentStatus === 'paid';
      return inDateRange && isCompleted;
    });
  }, [orders, startDate, endDate]);
  
  // All orders in date range (for order count metrics)
  const allOrdersInRange = useMemo(() => {
    return (orders as any[]).filter((order: any) => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= startDate && orderDate <= endDate;
    });
  }, [orders, startDate, endDate]);

  // Filter order items by date range (only items from filtered orders)
  const filteredOrderItems = useMemo(() => {
    const filteredOrderIds = new Set(filteredOrders.map((order: any) => order.id));
    return (orderItems as any[]).filter((item: any) => filteredOrderIds.has(item.orderId));
  }, [orderItems, filteredOrders]);

  // Filter expenses by date range
  const filteredExpenses = useMemo(() => {
    return (expenses as any[]).filter((expense: any) => {
      const expenseDate = new Date(expense.createdAt || expense.date);
      return expenseDate >= startDate && expenseDate <= endDate;
    });
  }, [expenses, startDate, endDate]);

  // Helper function to convert amounts to display currency
  const toDisplayCurrency = (amount: number, fromCurrency: string): number => {
    if (fromCurrency === displayCurrency) return amount;
    return convertCurrency(amount, fromCurrency as Currency, displayCurrency);
  };

  // Calculate financial metrics - all values converted to display currency
  const financialMetrics = useMemo(() => {
    let totalRevenue = 0;
    let totalCost = 0;

    // Calculate revenue from orders, converting to display currency
    filteredOrders.forEach((order: any) => {
      const revenue = parseFloat(order.grandTotal || '0');
      const orderCurrency = order.currency || 'CZK';
      totalRevenue += convertCurrency(revenue, orderCurrency as Currency, displayCurrency);
    });

    // Calculate product costs - use single authoritative cost source (prefer USD > EUR > CZK)
    filteredOrderItems.forEach((item: any) => {
      const product = (products as any[]).find((p: any) => p.id === item.productId);
      if (product) {
        const quantity = item.quantity || 0;
        const costUSD = parseFloat(product.importCostUsd || '0');
        const costEUR = parseFloat(product.importCostEur || '0');
        const costCZK = parseFloat(product.importCostCzk || '0');
        
        // Use priority: USD > EUR > CZK (choose first non-zero value)
        let itemCost = 0;
        let sourceCurrency: 'USD' | 'EUR' | 'CZK' = 'CZK';
        
        if (costUSD > 0) {
          itemCost = costUSD * quantity;
          sourceCurrency = 'USD';
        } else if (costEUR > 0) {
          itemCost = costEUR * quantity;
          sourceCurrency = 'EUR';
        } else if (costCZK > 0) {
          itemCost = costCZK * quantity;
          sourceCurrency = 'CZK';
        }
        
        totalCost += convertCurrency(itemCost, sourceCurrency, displayCurrency);
      }
    });

    // Add expenses, converting to display currency
    filteredExpenses.forEach((expense: any) => {
      const amount = parseFloat(expense.amount || '0');
      const expenseCurrency = expense.currency || 'CZK';
      totalCost += convertCurrency(amount, expenseCurrency as Currency, displayCurrency);
    });

    const profit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    // Calculate average order value in display currency
    const avgOrderValue = filteredOrders.length > 0 ? totalRevenue / filteredOrders.length : 0;

    return {
      totalRevenue,
      totalCost,
      profit,
      profitMargin,
      avgOrderValue,
      totalOrders: filteredOrders.length,
      totalOrdersInRange: allOrdersInRange.length,
    };
  }, [filteredOrders, filteredOrderItems, filteredExpenses, products, allOrdersInRange, displayCurrency]);

  // Calculate product performance - convert revenue to display currency
  const productPerformance = useMemo(() => {
    const productSales: { [key: string]: { product: any; quantity: number; revenue: number; originalCurrency: string } } = {};

    filteredOrderItems.forEach((item: any) => {
      const product = (products as any[]).find((p: any) => p.id === item.productId);
      if (product) {
        if (!productSales[product.id]) {
          productSales[product.id] = { product, quantity: 0, revenue: 0, originalCurrency: 'CZK' };
        }
        productSales[product.id].quantity += item.quantity || 0;
        
        // Get the order to find the currency
        const order = filteredOrders.find((o: any) => o.id === item.orderId);
        const itemCurrency = order?.currency || 'CZK';
        const itemRevenue = parseFloat(item.total || '0');
        
        // Convert to display currency
        productSales[product.id].revenue += convertCurrency(itemRevenue, itemCurrency as Currency, displayCurrency);
      }
    });

    const sortedProducts = Object.values(productSales).sort((a, b) => b.quantity - a.quantity);
    const topProducts = sortedProducts.slice(0, 10);
    const slowMovers = sortedProducts.slice(-10).reverse();

    const totalUnitsSold = sortedProducts.reduce((sum, p) => sum + p.quantity, 0);
    const totalRevenue = sortedProducts.reduce((sum, p) => sum + p.revenue, 0);

    return {
      topProducts,
      slowMovers,
      totalUnitsSold,
      totalRevenue,
      totalProductsSold: sortedProducts.length,
    };
  }, [filteredOrderItems, products, filteredOrders, displayCurrency]);

  // Customer analytics - convert to display currency
  const customerAnalytics = useMemo(() => {
    const customerOrders: { [key: string]: { customer: any; orderCount: number; totalSpent: number } } = {};

    filteredOrders.forEach((order: any) => {
      if (order.customerId) {
        const customer = (customers as any[]).find((c: any) => c.id === order.customerId);
        if (customer) {
          if (!customerOrders[customer.id]) {
            customerOrders[customer.id] = { customer, orderCount: 0, totalSpent: 0 };
          }
          customerOrders[customer.id].orderCount += 1;
          
          const orderAmount = parseFloat(order.grandTotal || '0');
          const orderCurrency = order.currency || 'CZK';
          // Convert to display currency
          customerOrders[customer.id].totalSpent += convertCurrency(orderAmount, orderCurrency as Currency, displayCurrency);
        }
      }
    });

    const sortedCustomers = Object.values(customerOrders).sort((a, b) => b.totalSpent - a.totalSpent);
    const topCustomers = sortedCustomers.slice(0, 10);

    return {
      topCustomers,
      totalCustomers: (customers as any[]).length,
      activeCustomers: sortedCustomers.length,
      avgOrdersPerCustomer: sortedCustomers.length > 0 ? filteredOrders.length / sortedCustomers.length : 0,
    };
  }, [filteredOrders, customers, displayCurrency]);

  // Inventory insights - convert to display currency
  const inventoryInsights = useMemo(() => {
    const totalStock = (products as any[]).reduce((sum, p) => sum + (p.quantity || 0), 0);
    const totalValue = (products as any[]).reduce((sum, p) => {
      const qty = p.quantity || 0;
      // Use price based on display currency
      let price = 0;
      if (displayCurrency === 'CZK') {
        price = parseFloat(p.priceCzk || '0');
      } else if (displayCurrency === 'EUR') {
        price = parseFloat(p.priceEur || '0');
      } else if (displayCurrency === 'USD') {
        // Convert from CZK to USD if no USD price
        price = convertCurrency(parseFloat(p.priceCzk || '0'), 'CZK', 'USD');
      }
      return sum + (qty * price);
    }, 0);

    const lowStockProducts = (products as any[]).filter((p: any) => 
      p.quantity > 0 && p.quantity <= (p.lowStockAlert || 5)
    );

    const outOfStock = (products as any[]).filter((p: any) => p.quantity === 0);

    return {
      totalStock,
      totalValue,
      lowStockCount: lowStockProducts.length,
      outOfStockCount: outOfStock.length,
      lowStockProducts: lowStockProducts.slice(0, 10),
      outOfStockProducts: outOfStock.slice(0, 10),
    };
  }, [products, displayCurrency]);

  // Export handlers - use display currency
  const handleExportXLSX = () => {
    try {
      const exportData = [
        {
          [t('metric')]: `${t('totalRevenue')} (${displayCurrency})`,
          [t('value')]: formatCurrency(financialMetrics.totalRevenue, displayCurrency),
        },
        {
          [t('metric')]: `${t('totalCost')} (${displayCurrency})`,
          [t('value')]: formatCurrency(financialMetrics.totalCost, displayCurrency),
        },
        {
          [t('metric')]: `${t('profit')} (${displayCurrency})`,
          [t('value')]: formatCurrency(financialMetrics.profit, displayCurrency),
        },
        {
          [t('metric')]: t('profitMargin'),
          [t('value')]: `${financialMetrics.profitMargin.toFixed(2)}%`,
        },
        {
          [t('metric')]: t('totalOrders'),
          [t('value')]: financialMetrics.totalOrders,
        },
        {
          [t('metric')]: t('unitsSold'),
          [t('value')]: productPerformance.totalUnitsSold,
        },
        {
          [t('metric')]: t('activeCustomers'),
          [t('value')]: customerAnalytics.activeCustomers,
        },
      ];

      exportToXLSX(exportData, `Report_${format(new Date(), 'yyyy-MM-dd')}_${displayCurrency}`, t('businessReports'));
      
      toast({
        title: t('exportSuccessful'),
        description: t('reportExportedXlsx'),
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: t('exportFailed'),
        description: t('failedToExportReport'),
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = () => {
    try {
      const exportData = [
        { metric: `${t('totalRevenue')} (${displayCurrency})`, value: formatCurrency(financialMetrics.totalRevenue, displayCurrency) },
        { metric: `${t('totalCost')} (${displayCurrency})`, value: formatCurrency(financialMetrics.totalCost, displayCurrency) },
        { metric: `${t('profit')} (${displayCurrency})`, value: formatCurrency(financialMetrics.profit, displayCurrency) },
        { metric: t('profitMargin'), value: `${financialMetrics.profitMargin.toFixed(2)}%` },
        { metric: t('totalOrders'), value: financialMetrics.totalOrders.toString() },
        { metric: t('unitsSold'), value: productPerformance.totalUnitsSold.toString() },
        { metric: t('activeCustomers'), value: customerAnalytics.activeCustomers.toString() },
      ];

      const columns: PDFColumn[] = [
        { key: 'metric', header: t('metric') },
        { key: 'value', header: t('value') },
      ];

      exportToPDF(t('businessReports'), exportData, columns, `Report_${format(new Date(), 'yyyy-MM-dd')}_${displayCurrency}`);
      
      toast({
        title: t('exportSuccessful'),
        description: t('reportExportedPdf'),
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: t('exportFailed'),
        description: t('failedToExportReport'),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 md:p-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {t('businessReports')}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1">
            {t('comprehensiveAnalytics')}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Select value={dateRange} onValueChange={(value) => {
            setDateRange(value);
            if (value === 'custom') {
              setIsCustomPickerOpen(true);
            }
          }}>
            <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-date-range">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allTime')}</SelectItem>
              <SelectItem value="today">{t('today')}</SelectItem>
              <SelectItem value="week">{t('last7Days')}</SelectItem>
              <SelectItem value="month">{t('last30Days')}</SelectItem>
              <SelectItem value="thisMonth">{t('thisMonth')}</SelectItem>
              <SelectItem value="year">{t('thisYear')}</SelectItem>
              <SelectItem value="lastYear">{t('lastYear')}</SelectItem>
              <SelectItem value="custom">{t('customPeriod')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={displayCurrency} onValueChange={(value) => setDisplayCurrency(value as 'CZK' | 'EUR' | 'USD')}>
            <SelectTrigger className="w-full sm:w-[100px]" data-testid="select-currency">
              <Coins className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CZK">CZK</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
            </SelectContent>
          </Select>
          {dateRange === 'custom' && (
            <Popover open={isCustomPickerOpen} onOpenChange={setIsCustomPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2" data-testid="button-custom-date">
                  <Calendar className="h-4 w-4" />
                  {customStartDate && customEndDate 
                    ? `${format(customStartDate, 'MMM dd')} - ${format(customEndDate, 'MMM dd')}`
                    : t('selectDate')
                  }
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-4" align="end">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('startDate')}</Label>
                      <CalendarPicker
                        mode="single"
                        selected={customStartDate}
                        onSelect={setCustomStartDate}
                        disabled={(date) => customEndDate ? date > customEndDate : false}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('endDate')}</Label>
                      <CalendarPicker
                        mode="single"
                        selected={customEndDate}
                        onSelect={setCustomEndDate}
                        disabled={(date) => customStartDate ? date < customStartDate : false}
                      />
                    </div>
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={() => setIsCustomPickerOpen(false)}
                    disabled={!customStartDate || !customEndDate}
                    data-testid="button-apply-custom-date"
                  >
                    {t('apply')}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto" data-testid="button-export">
                <FileDown className="h-4 w-4 mr-2" />
                {t('export')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t('exportOptions')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportXLSX} data-testid="button-export-xlsx">
                <FileDown className="h-4 w-4 mr-2" />
                {t('exportAsXlsx')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF} data-testid="button-export-pdf">
                <FileText className="h-4 w-4 mr-2" />
                {t('exportAsPdf')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Financial Overview */}
      <div>
        <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3 sm:mb-4 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 dark:text-emerald-400" />
          {t('financialOverview')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Total Revenue */}
          <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between gap-2 sm:gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {t('revenue')} ({displayCurrency})
                  </p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 truncate cursor-help" data-testid="stat-revenue">
                          {formatCompactCurrency(financialMetrics.totalRevenue, displayCurrency)}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-mono">{formatCurrency(financialMetrics.totalRevenue, displayCurrency)}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950">
                  <Coins className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Cost */}
          <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between gap-2 sm:gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {t('totalCost')} ({displayCurrency})
                  </p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 truncate cursor-help" data-testid="stat-cost">
                          {formatCompactCurrency(financialMetrics.totalCost, displayCurrency)}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-mono">{formatCurrency(financialMetrics.totalCost, displayCurrency)}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex-shrink-0 p-2 sm:p-3 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
                  <Euro className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profit */}
          <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between gap-2 sm:gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {t('profitEst')} ({displayCurrency})
                  </p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className={`text-xl sm:text-2xl font-bold truncate cursor-help ${financialMetrics.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`} data-testid="stat-profit">
                          {formatCompactCurrency(financialMetrics.profit, displayCurrency)}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-mono">{formatCurrency(financialMetrics.profit, displayCurrency)}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className={`flex-shrink-0 p-3 rounded-xl ${financialMetrics.profit >= 0 ? 'bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950' : 'bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950'}`}>
                  {financialMetrics.profit >= 0 ? (
                    <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profit Margin */}
          <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between gap-2 sm:gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {t('profitMargin')}
                  </p>
                  <p className={`text-xl sm:text-2xl font-bold truncate ${financialMetrics.profitMargin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`} data-testid="stat-margin">
                    {financialMetrics.profitMargin.toFixed(1)}%
                  </p>
                </div>
                <div className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
                  <Target className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sales & Orders Overview */}
      <div>
        <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3 sm:mb-4 flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-600 dark:text-cyan-400" />
          {t('salesAndOrders')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Total Orders */}
          <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between gap-2 sm:gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {t('totalOrders')}
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100" data-testid="stat-total-orders">
                    {formatCompactNumber(financialMetrics.totalOrders)}
                  </p>
                </div>
                <div className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950 dark:to-blue-950">
                  <ShoppingCart className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Units Sold */}
          <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between gap-2 sm:gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {t('unitsSold')}
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100" data-testid="stat-units-sold">
                    {formatCompactNumber(productPerformance.totalUnitsSold)}
                  </p>
                </div>
                <div className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950">
                  <Package className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Avg Order Value */}
          <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between gap-2 sm:gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {t('avgOrder')} ({displayCurrency})
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100" data-testid="stat-avg-order">
                    {formatCompactCurrency(financialMetrics.avgOrderValue, displayCurrency)}
                  </p>
                </div>
                <div className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950 dark:to-cyan-950">
                  <Activity className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Customers */}
          <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between gap-2 sm:gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {t('activeCustomers')}
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100" data-testid="stat-active-customers">
                    {formatCompactNumber(customerAnalytics.activeCustomers)}
                  </p>
                </div>
                <div className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950 dark:to-purple-950">
                  <Users className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Product Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Top Selling Products */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              {t('topSellingProducts')}
            </CardTitle>
            <CardDescription>
              {t('topSellingProductsDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {productPerformance.topProducts.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                  {t('noSalesDataAvailable')}
                </p>
              ) : (
                productPerformance.topProducts.map((item, index) => (
                  <div key={item.product.id} className="flex items-center justify-between gap-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Badge variant="secondary" className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full">
                        {index + 1}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                          {item.product.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          SKU: {item.product.sku}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-emerald-600 dark:text-emerald-400">
                        {item.quantity} {t('units')}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatCurrency(item.revenue, displayCurrency)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Inventory Alerts */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {t('inventoryAlerts')}
            </CardTitle>
            <CardDescription>
              {t('lowStockAndOutOfStock')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <p className="text-xs text-amber-700 dark:text-amber-300 mb-1">{t('lowStock')}</p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {inventoryInsights.lowStockCount}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                  <p className="text-xs text-red-700 dark:text-red-300 mb-1">{t('outOfStock')}</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {inventoryInsights.outOfStockCount}
                  </p>
                </div>
              </div>

              {/* Low Stock List */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('lowStockItems')}</p>
                {inventoryInsights.lowStockProducts.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-2">
                    {t('allProductsWellStocked')}
                  </p>
                ) : (
                  inventoryInsights.lowStockProducts.slice(0, 5).map((product: any) => (
                    <div key={product.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900">
                      <p className="text-sm text-slate-700 dark:text-slate-300 truncate flex-1">
                        {product.name}
                      </p>
                      <Badge variant="outline" className="text-amber-600 border-amber-600 shrink-0">
                        {product.quantity} {t('left')}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Customers */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-violet-500" />
            {t('topCustomers')}
          </CardTitle>
          <CardDescription>
            {t('highestValueCustomers')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {customerAnalytics.topCustomers.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                {t('noCustomerDataAvailable')}
              </p>
            ) : (
              customerAnalytics.topCustomers.map((item, index) => (
                <div key={item.customer.id} className="flex items-center justify-between gap-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Badge variant="secondary" className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full">
                      {index + 1}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                        {item.customer.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {item.orderCount} {t('ordersLowercase')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-violet-600 dark:text-violet-400">
                      {formatCurrency(item.totalSpent, displayCurrency)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Inventory Value Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950">
                <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {t('totalInventory')}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {formatCompactNumber(inventoryInsights.totalStock)} {t('units')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950">
                <Coins className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {t('stockValue')} ({displayCurrency})
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {formatCompactCurrency(inventoryInsights.totalValue, displayCurrency)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
                <PieChart className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {t('productVarieties')}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {formatCompactNumber((products as any[]).length)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
