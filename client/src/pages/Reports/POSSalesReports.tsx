import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ShoppingCart, DollarSign, TrendingUp, Calendar,
  Search, Package
} from "lucide-react";
import { formatCurrency } from "@/lib/currencyUtils";
import { useLocalization } from "@/contexts/LocalizationContext";
import { format, startOfDay, endOfDay, subDays } from "date-fns";

export default function POSSalesReports() {
  const { t } = useTranslation('reports');
  const { t: tCommon } = useTranslation('common');
  const { formatCurrency: formatLocalizedCurrency } = useLocalization();
  const [dateRange, setDateRange] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const { data: orders = [], isLoading } = useQuery<any[]>({ 
    queryKey: ['/api/orders', 'channel', 'pos'],
    queryFn: async () => {
      const response = await fetch('/api/orders?channel=pos', { credentials: 'include' });
      if (!response.ok) return [];
      return response.json();
    },
  });

  const { data: customers = [] } = useQuery<any[]>({ queryKey: ['/api/customers'] });
  const { data: orderItems = [] } = useQuery<any[]>({
    queryKey: ['/api/order-items/all'],
    queryFn: async () => {
      const response = await fetch('/api/order-items/all', { credentials: 'include' });
      if (!response.ok) return [];
      return response.json();
    },
  });

  const now = useMemo(() => new Date(), []);

  const getDateRange = () => {
    const today = new Date();
    switch (dateRange) {
      case 'today':
        return { start: startOfDay(today), end: endOfDay(today) };
      case 'week':
        return { start: startOfDay(subDays(today, 7)), end: endOfDay(today) };
      case 'month':
        return { start: startOfDay(subDays(today, 30)), end: endOfDay(today) };
      default:
        return { start: new Date(0), end: today };
    }
  };

  const { start: filterStartDate, end: filterEndDate } = getDateRange();

  const filteredOrders = useMemo(() => {
    return orders.filter((order: any) => {
      const orderDate = new Date(order.createdAt);
      const inDateRange = orderDate >= filterStartDate && orderDate <= filterEndDate;
      
      if (!inDateRange) return false;
      
      if (searchQuery) {
        const customer = customers.find((c: any) => c.id === order.customerId);
        const customerName = customer ? `${customer.firstName || ''} ${customer.lastName || ''}`.toLowerCase() : '';
        const orderId = (order.orderNumber || order.id?.toString() || '').toLowerCase();
        const query = searchQuery.toLowerCase();
        
        return orderId.includes(query) || customerName.includes(query);
      }
      
      return true;
    });
  }, [orders, filterStartDate, filterEndDate, searchQuery, customers]);

  const orderItemsMap = useMemo(() => {
    const map = new Map<number, number>();
    orderItems.forEach((item: any) => {
      const current = map.get(item.orderId) || 0;
      map.set(item.orderId, current + (item.quantity || 1));
    });
    return map;
  }, [orderItems]);

  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const metrics = useMemo(() => {
    const totalSales = orders.length;
    const totalRevenue = orders.reduce((sum, o: any) => sum + parseFloat(o.grandTotal || '0'), 0);
    const avgSaleValue = totalSales > 0 ? totalRevenue / totalSales : 0;
    
    const todaySales = orders.filter((order: any) => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= todayStart && orderDate <= todayEnd;
    });
    const todayRevenue = todaySales.reduce((sum, o: any) => sum + parseFloat(o.grandTotal || '0'), 0);

    return { totalSales, totalRevenue, avgSaleValue, todaySalesCount: todaySales.length, todayRevenue };
  }, [orders, todayStart, todayEnd]);

  const getCustomerName = (customerId: number | null) => {
    if (!customerId) return t('walkInCustomer');
    const customer = customers.find((c: any) => c.id === customerId);
    if (!customer) return t('walkInCustomer');
    return `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || t('walkInCustomer');
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">{tCommon('paid')}</Badge>;
      case 'unpaid':
        return <Badge variant="destructive">{tCommon('unpaid')}</Badge>;
      case 'pay_later':
        return <Badge variant="secondary">{tCommon('payLater')}</Badge>;
      default:
        return <Badge variant="outline">{status || tCommon('pending')}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="pos-sales-loading">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="pos-sales-reports">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{t('posSalesReport')}</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">{t('businessOverviewDesc')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card data-testid="card-total-pos-sales">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('totalPosSales')}</p>
                <p className="text-2xl font-bold">{metrics.totalSales}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-total-revenue">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('totalRevenue')}</p>
                <p className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue, 'CZK')}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-avg-sale-value">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('averageSaleValue')}</p>
                <p className="text-2xl font-bold">{formatCurrency(metrics.avgSaleValue, 'CZK')}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-today-sales">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('todaysSales')}</p>
                <p className="text-2xl font-bold">{metrics.todaySalesCount}</p>
                <p className="text-sm text-muted-foreground">{formatCurrency(metrics.todayRevenue, 'CZK')}</p>
              </div>
              <Calendar className="h-8 w-8 text-orange-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>{t('posSales')}</CardTitle>
              <CardDescription>{t('salesReportsDesc')}</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={tCommon('search')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full sm:w-64"
                  data-testid="input-search-pos"
                />
              </div>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-full sm:w-40" data-testid="select-date-range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allTime')}</SelectItem>
                  <SelectItem value="today">{t('today')}</SelectItem>
                  <SelectItem value="week">{t('last7Days')}</SelectItem>
                  <SelectItem value="month">{t('last30Days')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12" data-testid="empty-state-pos">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">{t('noPosSalesFound')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-testid="table-pos-sales">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('orderId')}</TableHead>
                    <TableHead>{t('date')}</TableHead>
                    <TableHead>{t('customer')}</TableHead>
                    <TableHead className="text-center">{t('itemsCount')}</TableHead>
                    <TableHead>{tCommon('paymentMethod')}</TableHead>
                    <TableHead>{t('paymentStatus')}</TableHead>
                    <TableHead className="text-right">{t('total')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order: any) => (
                    <TableRow key={order.id} data-testid={`row-pos-order-${order.id}`}>
                      <TableCell className="font-medium">
                        {order.orderNumber || `#${order.id}`}
                      </TableCell>
                      <TableCell>
                        {format(new Date(order.createdAt), 'MMM dd, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        {getCustomerName(order.customerId)}
                      </TableCell>
                      <TableCell className="text-center">
                        {orderItemsMap.get(order.id) || 0}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {order.paymentMethod?.replace('_', ' ') || 'Cash'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getPaymentStatusBadge(order.paymentStatus)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(parseFloat(order.grandTotal || '0'), order.currency || 'CZK')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
