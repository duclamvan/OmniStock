import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from 'react-i18next';
import { useLocation, useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatCompactNumber } from "@/lib/currencyUtils";
import { useLocalization } from "@/contexts/LocalizationContext";
import { exportToXLSX, exportToPDF, PDFColumn } from "@/lib/exportUtils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Activity,
  Eye,
  Clock,
  FileBarChart,
  Download
} from "lucide-react";
import { ReportViewer } from "@/components/reports/ReportViewer";
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

interface BusinessReportData {
  financial: {
    totalRevenue: number;
    totalCost: number;
    profit: number;
    profitMargin: number;
    avgOrderValue: number;
    totalOrders: number;
  };
  sales: {
    totalUnitsSold: number;
    topProducts: Array<{
      product: { id: number; name: string; sku: string };
      quantity: number;
      revenue: number;
    }>;
  };
  customers: {
    activeCustomers: number;
    topCustomers: Array<{
      customer: { id: number; name: string };
      orderCount: number;
      totalSpent: number;
    }>;
  };
  inventory: {
    totalStock: number;
    totalValue: number;
    lowStockCount: number;
    outOfStockCount: number;
    lowStockProducts: Array<{ id: number; name: string; quantity: number }>;
    productCount: number;
  };
}

interface GeneratedReport {
  fileName: string;
  period: string;
  generatedAt: string;
  size: number;
}

function MetricCardSkeleton() {
  return (
    <Card className="border-slate-200 dark:border-slate-800">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex-1 min-w-0">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-32" />
          </div>
          <Skeleton className="h-12 w-12 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  );
}

function ListCardSkeleton() {
  return (
    <Card className="border-slate-200 dark:border-slate-800">
      <CardHeader>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-60 mt-2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between gap-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-900">
              <div className="flex items-center gap-3 flex-1">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <div className="text-right">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-3 w-12 mt-1" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Reports() {
  const { toast } = useToast();
  const { t } = useTranslation('reports');
  const { formatCurrency } = useLocalization();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const [dateRange, setDateRange] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);
  const [isCustomPickerOpen, setIsCustomPickerOpen] = useState(false);
  const [displayCurrency, setDisplayCurrency] = useState<'CZK' | 'EUR' | 'USD'>('CZK');
  const [selectedReport, setSelectedReport] = useState<GeneratedReport | null>(null);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);

  const searchParams = new URLSearchParams(searchString);
  const initialTab = searchParams.get('tab') === 'generated' ? 'generated' : 'analytics';
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    if (params.get('tab') === 'generated') {
      setActiveTab('generated');
    }
  }, [searchString]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'generated') {
      setLocation('/reports?tab=generated');
    } else {
      setLocation('/reports');
    }
  };

  const { data: generatedReports = [], isLoading: isLoadingReports } = useQuery<GeneratedReport[]>({
    queryKey: ['/api/reports'],
  });

  const { data: reportDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['/api/reports', selectedReport?.fileName],
    enabled: !!selectedReport?.fileName && isReportDialogOpen,
  });

  const handleViewReport = (report: GeneratedReport) => {
    setSelectedReport(report);
    setIsReportDialogOpen(true);
  };

  const getPeriodBadgeVariant = (period: string) => {
    if (period.toLowerCase().includes('daily')) return 'default';
    if (period.toLowerCase().includes('weekly')) return 'secondary';
    if (period.toLowerCase().includes('monthly')) return 'outline';
    return 'default';
  };

  const getPeriodLabel = (period: string) => {
    if (period.toLowerCase().includes('daily')) return t('daily');
    if (period.toLowerCase().includes('weekly')) return t('weekly');
    if (period.toLowerCase().includes('monthly')) return t('monthly');
    return period;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatCompactCurrency = (amount: number, currencyCode: string): string => {
    const compactValue = formatCompactNumber(amount);
    const symbol = CURRENCY_SYMBOLS[currencyCode] || currencyCode;
    if (currencyCode === 'CZK' || currencyCode === 'VND') {
      return `${compactValue} ${symbol}`;
    }
    return `${symbol}${compactValue}`;
  };

  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    switch (dateRange) {
      case 'today':
        return { startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate()), endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999) };
      case 'week':
        return { startDate: subDays(now, 7), endDate: now };
      case 'month':
        return { startDate: subMonths(now, 1), endDate: now };
      case 'thisMonth':
        return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
      case 'year':
        return { startDate: startOfYear(now), endDate: endOfYear(now) };
      case 'lastYear':
        const lastYearDate = subYears(now, 1);
        return { startDate: startOfYear(lastYearDate), endDate: endOfYear(lastYearDate) };
      case 'custom':
        if (customStartDate && customEndDate) {
          return { startDate: customStartDate, endDate: customEndDate };
        }
        return { startDate: new Date(0), endDate: now };
      default:
        return { startDate: new Date(0), endDate: now };
    }
  }, [dateRange, customStartDate, customEndDate]);

  const { data: reportData, isLoading } = useQuery<BusinessReportData>({
    queryKey: ['/api/reports/business', startDate.toISOString(), endDate.toISOString(), displayCurrency],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        currency: displayCurrency,
      });
      const response = await fetch(`/api/reports/business?${params}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch report data');
      return response.json();
    },
  });

  const financial = reportData?.financial ?? {
    totalRevenue: 0,
    totalCost: 0,
    profit: 0,
    profitMargin: 0,
    avgOrderValue: 0,
    totalOrders: 0,
  };

  const sales = reportData?.sales ?? {
    totalUnitsSold: 0,
    topProducts: [],
  };

  const customers = reportData?.customers ?? {
    activeCustomers: 0,
    topCustomers: [],
  };

  const inventory = reportData?.inventory ?? {
    totalStock: 0,
    totalValue: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    lowStockProducts: [],
    productCount: 0,
  };

  const handleExportXLSX = () => {
    try {
      const exportData = [
        {
          [t('metric')]: `${t('totalRevenue')} (${displayCurrency})`,
          [t('value')]: formatCurrency(financial.totalRevenue, displayCurrency),
        },
        {
          [t('metric')]: `${t('totalCost')} (${displayCurrency})`,
          [t('value')]: formatCurrency(financial.totalCost, displayCurrency),
        },
        {
          [t('metric')]: `${t('profit')} (${displayCurrency})`,
          [t('value')]: formatCurrency(financial.profit, displayCurrency),
        },
        {
          [t('metric')]: t('profitMargin'),
          [t('value')]: `${financial.profitMargin.toFixed(2)}%`,
        },
        {
          [t('metric')]: t('totalOrders'),
          [t('value')]: financial.totalOrders,
        },
        {
          [t('metric')]: t('unitsSold'),
          [t('value')]: sales.totalUnitsSold,
        },
        {
          [t('metric')]: t('activeCustomers'),
          [t('value')]: customers.activeCustomers,
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
        { metric: `${t('totalRevenue')} (${displayCurrency})`, value: formatCurrency(financial.totalRevenue, displayCurrency) },
        { metric: `${t('totalCost')} (${displayCurrency})`, value: formatCurrency(financial.totalCost, displayCurrency) },
        { metric: `${t('profit')} (${displayCurrency})`, value: formatCurrency(financial.profit, displayCurrency) },
        { metric: t('profitMargin'), value: `${financial.profitMargin.toFixed(2)}%` },
        { metric: t('totalOrders'), value: financial.totalOrders.toString() },
        { metric: t('unitsSold'), value: sales.totalUnitsSold.toString() },
        { metric: t('activeCustomers'), value: customers.activeCustomers.toString() },
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
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight" data-testid="heading-reports">
            {t('businessReports')}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1" data-testid="text-reports-description">
            {t('comprehensiveAnalytics')}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="analytics" data-testid="tab-analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            {t('analyticsTab')}
          </TabsTrigger>
          <TabsTrigger value="generated" data-testid="tab-generated">
            <FileBarChart className="h-4 w-4 mr-2" />
            {t('generatedReportsTab')}
          </TabsTrigger>
        </TabsList>

        {/* Analytics Tab Content */}
        <TabsContent value="analytics" className="space-y-4 sm:space-y-6 mt-4">
          {/* Analytics Controls */}
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
              <SelectItem value="all" data-testid="option-all-time">{t('allTime')}</SelectItem>
              <SelectItem value="today" data-testid="option-today">{t('today')}</SelectItem>
              <SelectItem value="week" data-testid="option-week">{t('last7Days')}</SelectItem>
              <SelectItem value="month" data-testid="option-month">{t('last30Days')}</SelectItem>
              <SelectItem value="thisMonth" data-testid="option-this-month">{t('thisMonth')}</SelectItem>
              <SelectItem value="year" data-testid="option-year">{t('thisYear')}</SelectItem>
              <SelectItem value="lastYear" data-testid="option-last-year">{t('lastYear')}</SelectItem>
              <SelectItem value="custom" data-testid="option-custom">{t('customPeriod')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={displayCurrency} onValueChange={(value) => setDisplayCurrency(value as 'CZK' | 'EUR' | 'USD')}>
            <SelectTrigger className="w-full sm:w-[100px]" data-testid="select-currency">
              <Coins className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CZK" data-testid="option-czk">CZK</SelectItem>
              <SelectItem value="EUR" data-testid="option-eur">EUR</SelectItem>
              <SelectItem value="USD" data-testid="option-usd">USD</SelectItem>
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
                        data-testid="calendar-start-date"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('endDate')}</Label>
                      <CalendarPicker
                        mode="single"
                        selected={customEndDate}
                        onSelect={setCustomEndDate}
                        disabled={(date) => customStartDate ? date < customStartDate : false}
                        data-testid="calendar-end-date"
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

          {/* Financial Overview */}
      <div>
        <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3 sm:mb-4 flex items-center gap-2" data-testid="section-financial-overview">
          <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 dark:text-emerald-400" />
          {t('financialOverview')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {isLoading ? (
            <>
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </>
          ) : (
            <>
              {/* Total Revenue */}
              <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow" data-testid="card-revenue">
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
                              {formatCompactCurrency(financial.totalRevenue, displayCurrency)}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-mono">{formatCurrency(financial.totalRevenue, displayCurrency)}</p>
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
              <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow" data-testid="card-cost">
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
                              {formatCompactCurrency(financial.totalCost, displayCurrency)}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-mono">{formatCurrency(financial.totalCost, displayCurrency)}</p>
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
              <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow" data-testid="card-profit">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between gap-2 sm:gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                        {t('profitEst')} ({displayCurrency})
                      </p>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className={`text-xl sm:text-2xl font-bold truncate cursor-help ${financial.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`} data-testid="stat-profit">
                              {formatCompactCurrency(financial.profit, displayCurrency)}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-mono">{formatCurrency(financial.profit, displayCurrency)}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className={`flex-shrink-0 p-3 rounded-xl ${financial.profit >= 0 ? 'bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950' : 'bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950'}`}>
                      {financial.profit >= 0 ? (
                        <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Profit Margin */}
              <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow" data-testid="card-margin">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between gap-2 sm:gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                        {t('profitMargin')}
                      </p>
                      <p className={`text-xl sm:text-2xl font-bold truncate ${financial.profitMargin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`} data-testid="stat-margin">
                        {financial.profitMargin.toFixed(1)}%
                      </p>
                    </div>
                    <div className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
                      <Target className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Sales & Orders Overview */}
      <div>
        <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3 sm:mb-4 flex items-center gap-2" data-testid="section-sales-orders">
          <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-600 dark:text-cyan-400" />
          {t('salesAndOrders')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {isLoading ? (
            <>
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </>
          ) : (
            <>
              {/* Total Orders */}
              <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow" data-testid="card-total-orders">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between gap-2 sm:gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                        {t('totalOrders')}
                      </p>
                      <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100" data-testid="stat-total-orders">
                        {formatCompactNumber(financial.totalOrders)}
                      </p>
                    </div>
                    <div className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950 dark:to-blue-950">
                      <ShoppingCart className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Units Sold */}
              <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow" data-testid="card-units-sold">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between gap-2 sm:gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                        {t('unitsSold')}
                      </p>
                      <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100" data-testid="stat-units-sold">
                        {formatCompactNumber(sales.totalUnitsSold)}
                      </p>
                    </div>
                    <div className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950">
                      <Package className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Avg Order Value */}
              <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow" data-testid="card-avg-order">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between gap-2 sm:gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                        {t('avgOrder')} ({displayCurrency})
                      </p>
                      <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100" data-testid="stat-avg-order">
                        {formatCompactCurrency(financial.avgOrderValue, displayCurrency)}
                      </p>
                    </div>
                    <div className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950 dark:to-cyan-950">
                      <Activity className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Active Customers */}
              <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow" data-testid="card-active-customers">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between gap-2 sm:gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                        {t('activeCustomers')}
                      </p>
                      <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100" data-testid="stat-active-customers">
                        {formatCompactNumber(customers.activeCustomers)}
                      </p>
                    </div>
                    <div className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950 dark:to-purple-950">
                      <Users className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Product Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {isLoading ? (
          <>
            <ListCardSkeleton />
            <ListCardSkeleton />
          </>
        ) : (
          <>
            {/* Top Selling Products */}
            <Card className="border-slate-200 dark:border-slate-800" data-testid="card-top-products">
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
                  {sales.topProducts.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4" data-testid="text-no-sales">
                      {t('noSalesDataAvailable')}
                    </p>
                  ) : (
                    sales.topProducts.map((item, index) => (
                      <div key={item.product.id} className="flex items-center justify-between gap-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" data-testid={`row-top-product-${item.product.id}`}>
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Badge variant="secondary" className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full">
                            {index + 1}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 dark:text-slate-100 truncate" data-testid={`text-product-name-${item.product.id}`}>
                              {item.product.name}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400" data-testid={`text-product-sku-${item.product.id}`}>
                              SKU: {item.product.sku}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-emerald-600 dark:text-emerald-400" data-testid={`text-product-quantity-${item.product.id}`}>
                            {item.quantity} {t('units')}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400" data-testid={`text-product-revenue-${item.product.id}`}>
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
            <Card className="border-slate-200 dark:border-slate-800" data-testid="card-inventory-alerts">
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
                    <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800" data-testid="card-low-stock-count">
                      <p className="text-xs text-amber-700 dark:text-amber-300 mb-1">{t('lowStock')}</p>
                      <p className="text-2xl font-bold text-amber-600 dark:text-amber-400" data-testid="stat-low-stock">
                        {inventory.lowStockCount}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800" data-testid="card-out-of-stock-count">
                      <p className="text-xs text-red-700 dark:text-red-300 mb-1">{t('outOfStock')}</p>
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="stat-out-of-stock">
                        {inventory.outOfStockCount}
                      </p>
                    </div>
                  </div>

                  {/* Low Stock List */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('lowStockItems')}</p>
                    {inventory.lowStockProducts.length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-2" data-testid="text-well-stocked">
                        {t('allProductsWellStocked')}
                      </p>
                    ) : (
                      inventory.lowStockProducts.slice(0, 5).map((product) => (
                        <div key={product.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900" data-testid={`row-low-stock-${product.id}`}>
                          <p className="text-sm text-slate-700 dark:text-slate-300 truncate flex-1" data-testid={`text-low-stock-name-${product.id}`}>
                            {product.name}
                          </p>
                          <Badge variant="outline" className="text-amber-600 border-amber-600 shrink-0" data-testid={`badge-low-stock-qty-${product.id}`}>
                            {product.quantity} {t('left')}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Top Customers */}
      {isLoading ? (
        <ListCardSkeleton />
      ) : (
        <Card className="border-slate-200 dark:border-slate-800" data-testid="card-top-customers">
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
              {customers.topCustomers.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4" data-testid="text-no-customers">
                  {t('noCustomerDataAvailable')}
                </p>
              ) : (
                customers.topCustomers.map((item, index) => (
                  <div key={item.customer.id} className="flex items-center justify-between gap-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" data-testid={`row-top-customer-${item.customer.id}`}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Badge variant="secondary" className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full">
                        {index + 1}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 dark:text-slate-100 truncate" data-testid={`text-customer-name-${item.customer.id}`}>
                          {item.customer.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400" data-testid={`text-customer-orders-${item.customer.id}`}>
                          {item.orderCount} {t('ordersLowercase')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-violet-600 dark:text-violet-400" data-testid={`text-customer-spent-${item.customer.id}`}>
                        {formatCurrency(item.totalSpent, displayCurrency)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inventory Value Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {isLoading ? (
          <>
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </>
        ) : (
          <>
            <Card className="border-slate-200 dark:border-slate-800" data-testid="card-total-inventory">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950">
                    <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      {t('totalInventory')}
                    </p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100" data-testid="stat-total-inventory">
                      {formatCompactNumber(inventory.totalStock)} {t('units')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-slate-800" data-testid="card-stock-value">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950">
                    <Coins className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      {t('stockValue')} ({displayCurrency})
                    </p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100" data-testid="stat-stock-value">
                      {formatCompactCurrency(inventory.totalValue, displayCurrency)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-slate-800" data-testid="card-product-varieties">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
                    <PieChart className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      {t('productVarieties')}
                    </p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100" data-testid="stat-product-varieties">
                      {formatCompactNumber(inventory.productCount)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
        </TabsContent>

        {/* Generated Reports Tab Content */}
        <TabsContent value="generated" className="space-y-4 sm:space-y-6 mt-4">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3 sm:mb-4 flex items-center gap-2" data-testid="section-generated-reports">
              <FileBarChart className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
              {t('generatedReportsTitle')}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              {t('generatedReportsDesc')}
            </p>
          </div>

          {isLoadingReports ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="border-slate-200 dark:border-slate-800">
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-9 w-full mt-4" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : generatedReports.length === 0 ? (
            <Card className="border-slate-200 dark:border-slate-800">
              <CardContent className="p-12 text-center">
                <FileBarChart className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                  {t('noGeneratedReports')}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('noGeneratedReportsDesc')}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {generatedReports.map((report) => (
                <Card key={report.fileName} className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow" data-testid={`card-report-${report.fileName}`}>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant={getPeriodBadgeVariant(report.period)} data-testid={`badge-period-${report.fileName}`}>
                          {getPeriodLabel(report.period)}
                        </Badge>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {formatFileSize(report.size)}
                        </span>
                      </div>
                      
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100" data-testid={`text-period-${report.fileName}`}>
                          {report.period}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
                          <Clock className="h-3 w-3" />
                          <span data-testid={`text-generated-at-${report.fileName}`}>
                            {t('generatedAt')}: {format(new Date(report.generatedAt), 'MMM dd, yyyy HH:mm')}
                          </span>
                        </div>
                      </div>

                      <Button 
                        className="w-full mt-2" 
                        variant="outline"
                        onClick={() => handleViewReport(report)}
                        data-testid={`button-view-${report.fileName}`}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        {t('viewReportDetails')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Report Details Dialog */}
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileBarChart className="h-5 w-5" />
              {t('reportDetails')}
            </DialogTitle>
            <DialogDescription asChild>
              <div>
                {selectedReport && (
                  <span className="flex items-center gap-2 mt-1">
                    <Badge variant={getPeriodBadgeVariant(selectedReport.period)}>
                      {getPeriodLabel(selectedReport.period)}
                    </Badge>
                    <span className="text-muted-foreground">{format(new Date(selectedReport.generatedAt), 'MMM dd, yyyy HH:mm')}</span>
                  </span>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[75vh]">
            {isLoadingDetails ? (
              <div className="space-y-4 p-4">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : reportDetails && typeof reportDetails === 'object' && 'summary' in reportDetails ? (
              <div className="p-2">
                <ReportViewer reportData={reportDetails as any} />
              </div>
            ) : reportDetails ? (
              <div className="space-y-4 p-4">
                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
                  <pre className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap overflow-auto">
                    {typeof reportDetails === 'string' 
                      ? reportDetails 
                      : JSON.stringify(reportDetails, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                {t('noDataAvailable')}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
