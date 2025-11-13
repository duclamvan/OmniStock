import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatCompactNumber } from "@/lib/currencyUtils";
import { exportToXLSX, exportToPDF, PDFColumn } from "@/lib/exportUtils";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
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
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";

export default function Reports() {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<string>("all");

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
      default:
        return { start: new Date(0), end: new Date() };
    }
  };

  const { start: startDate, end: endDate } = getDateRange();

  // Filter orders by date range
  const filteredOrders = useMemo(() => {
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

  // Calculate financial metrics
  const financialMetrics = useMemo(() => {
    let totalRevenueCZK = 0;
    let totalRevenueEUR = 0;
    let totalCostCZK = 0;
    let totalCostEUR = 0;
    let totalCostUSD = 0;

    filteredOrders.forEach((order: any) => {
      const revenue = parseFloat(order.totalPrice || '0');
      if (order.currency === 'CZK') {
        totalRevenueCZK += revenue;
      } else if (order.currency === 'EUR') {
        totalRevenueEUR += revenue;
      }
    });

    // Calculate product costs
    filteredOrderItems.forEach((item: any) => {
      const product = (products as any[]).find((p: any) => p.id === item.productId);
      if (product) {
        const quantity = item.quantity || 0;
        totalCostUSD += parseFloat(product.importCostUsd || '0') * quantity;
        totalCostCZK += parseFloat(product.importCostCzk || '0') * quantity;
        totalCostEUR += parseFloat(product.importCostEur || '0') * quantity;
      }
    });

    // Add expenses
    filteredExpenses.forEach((expense: any) => {
      const amount = parseFloat(expense.amount || '0');
      if (expense.currency === 'CZK') {
        totalCostCZK += amount;
      } else if (expense.currency === 'EUR') {
        totalCostEUR += amount;
      } else if (expense.currency === 'USD') {
        totalCostUSD += amount;
      }
    });

    // Simple conversion for profit calculation (approximate)
    const usdToCzk = 23;
    const eurToCzk = 25;
    const totalRevenueCZKEquiv = totalRevenueCZK + (totalRevenueEUR * eurToCzk);
    const totalCostCZKEquiv = totalCostCZK + (totalCostEUR * eurToCzk) + (totalCostUSD * usdToCzk);
    const profitCZK = totalRevenueCZKEquiv - totalCostCZKEquiv;
    const profitMargin = totalRevenueCZKEquiv > 0 ? (profitCZK / totalRevenueCZKEquiv) * 100 : 0;

    return {
      totalRevenueCZK,
      totalRevenueEUR,
      totalCostCZK,
      totalCostEUR,
      totalCostUSD,
      profitCZK,
      profitMargin,
      totalOrders: filteredOrders.length,
      avgOrderValueCZK: filteredOrders.length > 0 ? totalRevenueCZK / filteredOrders.length : 0,
      avgOrderValueEUR: filteredOrders.length > 0 ? totalRevenueEUR / filteredOrders.length : 0,
    };
  }, [filteredOrders, filteredOrderItems, filteredExpenses, products]);

  // Calculate product performance
  const productPerformance = useMemo(() => {
    const productSales: { [key: string]: { product: any; quantity: number; revenue: number } } = {};

    filteredOrderItems.forEach((item: any) => {
      const product = (products as any[]).find((p: any) => p.id === item.productId);
      if (product) {
        if (!productSales[product.id]) {
          productSales[product.id] = { product, quantity: 0, revenue: 0 };
        }
        productSales[product.id].quantity += item.quantity || 0;
        productSales[product.id].revenue += parseFloat(item.totalPrice || '0');
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
  }, [filteredOrderItems, products]);

  // Customer analytics
  const customerAnalytics = useMemo(() => {
    const customerOrders: { [key: string]: { customer: any; orderCount: number; totalSpent: number } } = {};
    const eurToCzk = 25;

    filteredOrders.forEach((order: any) => {
      if (order.customerId) {
        const customer = (customers as any[]).find((c: any) => c.id === order.customerId);
        if (customer) {
          if (!customerOrders[customer.id]) {
            customerOrders[customer.id] = { customer, orderCount: 0, totalSpent: 0 };
          }
          customerOrders[customer.id].orderCount += 1;
          
          const orderAmount = parseFloat(order.totalPrice || '0');
          const amountInCZK = order.currency === 'EUR' ? orderAmount * eurToCzk : orderAmount;
          customerOrders[customer.id].totalSpent += amountInCZK;
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
  }, [filteredOrders, customers]);

  // Inventory insights
  const inventoryInsights = useMemo(() => {
    const totalStock = (products as any[]).reduce((sum, p) => sum + (p.quantity || 0), 0);
    const totalValue = (products as any[]).reduce((sum, p) => {
      const qty = p.quantity || 0;
      const price = parseFloat(p.priceCzk || '0');
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
  }, [products]);

  // Export handlers
  const handleExportXLSX = () => {
    try {
      const exportData = [
        {
          'Metric': 'Total Revenue (CZK)',
          'Value': formatCurrency(financialMetrics.totalRevenueCZK, 'CZK'),
        },
        {
          'Metric': 'Total Revenue (EUR)',
          'Value': formatCurrency(financialMetrics.totalRevenueEUR, 'EUR'),
        },
        {
          'Metric': 'Total Cost (CZK)',
          'Value': formatCurrency(financialMetrics.totalCostCZK, 'CZK'),
        },
        {
          'Metric': 'Profit (CZK Equivalent)',
          'Value': formatCurrency(financialMetrics.profitCZK, 'CZK'),
        },
        {
          'Metric': 'Profit Margin',
          'Value': `${financialMetrics.profitMargin.toFixed(2)}%`,
        },
        {
          'Metric': 'Total Orders',
          'Value': financialMetrics.totalOrders,
        },
        {
          'Metric': 'Total Units Sold',
          'Value': productPerformance.totalUnitsSold,
        },
        {
          'Metric': 'Active Customers',
          'Value': customerAnalytics.activeCustomers,
        },
      ];

      exportToXLSX(exportData, `Report_${format(new Date(), 'yyyy-MM-dd')}`, 'Business Report');
      
      toast({
        title: "Export Successful",
        description: "Report exported to XLSX",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export report",
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = () => {
    try {
      const exportData = [
        { metric: 'Total Revenue (CZK)', value: formatCurrency(financialMetrics.totalRevenueCZK, 'CZK') },
        { metric: 'Total Revenue (EUR)', value: formatCurrency(financialMetrics.totalRevenueEUR, 'EUR') },
        { metric: 'Total Cost (CZK)', value: formatCurrency(financialMetrics.totalCostCZK, 'CZK') },
        { metric: 'Profit (CZK Equivalent)', value: formatCurrency(financialMetrics.profitCZK, 'CZK') },
        { metric: 'Profit Margin', value: `${financialMetrics.profitMargin.toFixed(2)}%` },
        { metric: 'Total Orders', value: financialMetrics.totalOrders.toString() },
        { metric: 'Total Units Sold', value: productPerformance.totalUnitsSold.toString() },
        { metric: 'Active Customers', value: customerAnalytics.activeCustomers.toString() },
      ];

      const columns: PDFColumn[] = [
        { key: 'metric', header: 'Metric' },
        { key: 'value', header: 'Value' },
      ];

      exportToPDF('Business Report', exportData, columns, `Report_${format(new Date(), 'yyyy-MM-dd')}`);
      
      toast({
        title: "Export Successful",
        description: "Report exported to PDF",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export report",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Business Reports
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1">
            Comprehensive analytics for growth and financial insights
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-date-range">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
              <SelectItem value="thisMonth">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto" data-testid="button-export">
                <FileDown className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Export Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportXLSX} data-testid="button-export-xlsx">
                <FileDown className="h-4 w-4 mr-2" />
                Export as XLSX
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF} data-testid="button-export-pdf">
                <FileText className="h-4 w-4 mr-2" />
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Financial Overview */}
      <div>
        <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3 sm:mb-4 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
          Financial Overview
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Total Revenue CZK */}
          <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between gap-2 sm:gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Revenue (CZK)
                  </p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 truncate cursor-help" data-testid="stat-revenue-czk">
                          {formatCompactNumber(financialMetrics.totalRevenueCZK)} Kč
                        </p>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-mono">{formatCurrency(financialMetrics.totalRevenueCZK, 'CZK')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950">
                  <DollarSign className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Revenue EUR */}
          <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between gap-2 sm:gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Revenue (EUR)
                  </p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 truncate cursor-help" data-testid="stat-revenue-eur">
                          €{formatCompactNumber(financialMetrics.totalRevenueEUR)}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-mono">{formatCurrency(financialMetrics.totalRevenueEUR, 'EUR')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex-shrink-0 p-2 sm:p-3 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
                  <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
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
                    Profit (Est.)
                  </p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className={`text-xl sm:text-2xl font-bold truncate cursor-help ${financialMetrics.profitCZK >= 0 ? 'text-emerald-600' : 'text-red-600'}`} data-testid="stat-profit">
                          {formatCompactNumber(financialMetrics.profitCZK)} Kč
                        </p>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-mono">{formatCurrency(financialMetrics.profitCZK, 'CZK')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className={`flex-shrink-0 p-3 rounded-xl ${financialMetrics.profitCZK >= 0 ? 'bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950' : 'bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950'}`}>
                  {financialMetrics.profitCZK >= 0 ? (
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
                    Profit Margin
                  </p>
                  <p className={`text-xl sm:text-2xl font-bold truncate ${financialMetrics.profitMargin >= 0 ? 'text-emerald-600' : 'text-red-600'}`} data-testid="stat-margin">
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
          <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-600" />
          Sales & Orders
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Total Orders */}
          <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between gap-2 sm:gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Total Orders
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
                    Units Sold
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

          {/* Avg Order Value CZK */}
          <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between gap-2 sm:gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Avg Order (CZK)
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100" data-testid="stat-avg-order-czk">
                    {formatCompactNumber(financialMetrics.avgOrderValueCZK)} Kč
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
                    Active Customers
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
              Top Selling Products
            </CardTitle>
            <CardDescription>
              Best performers by units sold
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {productPerformance.topProducts.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                  No sales data available
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
                        {item.quantity} units
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatCurrency(item.revenue, 'CZK')}
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
              Inventory Alerts
            </CardTitle>
            <CardDescription>
              Low stock and out of stock items
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <p className="text-xs text-amber-700 dark:text-amber-300 mb-1">Low Stock</p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {inventoryInsights.lowStockCount}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                  <p className="text-xs text-red-700 dark:text-red-300 mb-1">Out of Stock</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {inventoryInsights.outOfStockCount}
                  </p>
                </div>
              </div>

              {/* Low Stock List */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Low Stock Items:</p>
                {inventoryInsights.lowStockProducts.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-2">
                    All products are well stocked
                  </p>
                ) : (
                  inventoryInsights.lowStockProducts.slice(0, 5).map((product: any) => (
                    <div key={product.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900">
                      <p className="text-sm text-slate-700 dark:text-slate-300 truncate flex-1">
                        {product.name}
                      </p>
                      <Badge variant="outline" className="text-amber-600 border-amber-600 shrink-0">
                        {product.quantity} left
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
            Top Customers
          </CardTitle>
          <CardDescription>
            Highest value customers by total spending
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {customerAnalytics.topCustomers.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                No customer data available
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
                        {item.orderCount} orders
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-violet-600 dark:text-violet-400">
                      {formatCurrency(item.totalSpent, 'CZK')}
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
                  Total Inventory
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {formatCompactNumber(inventoryInsights.totalStock)} units
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950">
                <DollarSign className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Stock Value
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {formatCompactNumber(inventoryInsights.totalValue)} Kč
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
                  Product Varieties
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
