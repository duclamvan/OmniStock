import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { usePageTitle } from '@/hooks/use-page-title';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Search,
  Trash2,
  Edit,
  Eye,
  Banknote,
  CreditCard,
  Building2,
  DollarSign,
  Calendar,
  Receipt,
  ArrowDownToLine,
  User,
  Package,
  RefreshCw,
  Loader2,
  Wallet,
  Clock,
  AlertTriangle,
  ShoppingBag
} from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/currencyUtils';
import { useTranslation } from 'react-i18next';
import { DataTable } from '@/components/ui/data-table';
import { format, parseISO, startOfDay, endOfDay, subDays } from 'date-fns';
import type { Order, Customer, Expense } from '@shared/schema';

type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'bank_transfer_private' | 'bank_transfer_invoice' | 'pay_later' | 'qr_czk';

interface POSSale extends Order {
  customer?: Customer | null;
  itemCount?: number;
}

const PAYMENT_METHODS: { value: PaymentMethod; labelKey: string; icon: any }[] = [
  { value: 'cash', labelKey: 'cash', icon: Banknote },
  { value: 'card', labelKey: 'card', icon: CreditCard },
  { value: 'bank_transfer', labelKey: 'bankTransfer', icon: Building2 },
  { value: 'qr_czk', labelKey: 'qrPayment', icon: DollarSign },
];

export default function POSSales() {
  const { t } = useTranslation(['common', 'orders', 'financial']);
  usePageTitle('common:posSales', 'POS Sales');

  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [paymentFilter, setPaymentFilter] = useState<PaymentMethod | 'all'>('all');
  const [selectedSale, setSelectedSale] = useState<POSSale | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCashOutDialogOpen, setIsCashOutDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<{
    notes: string;
    paymentMethod: PaymentMethod;
  }>({ notes: '', paymentMethod: 'cash' });
  const [cashOutAmount, setCashOutAmount] = useState('');
  const [cashOutNotes, setCashOutNotes] = useState('');
  const [isCustomCostDialogOpen, setIsCustomCostDialogOpen] = useState(false);
  const [customCostAmount, setCustomCostAmount] = useState('');
  const [customCostDescription, setCustomCostDescription] = useState('');
  const [customCostCategory, setCustomCostCategory] = useState<'parts' | 'food' | 'water' | 'supplies' | 'other'>('other');
  
  const { toast } = useToast();

  const { data: orders = [], isLoading, refetch } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
    staleTime: 30000,
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
    staleTime: 60000,
  });

  const { data: expenses = [] } = useQuery<Expense[]>({
    queryKey: ['/api/expenses'],
    staleTime: 30000,
  });

  const { data: orderItems = [], isLoading: isLoadingItems } = useQuery<any[]>({
    queryKey: ['/api/orders', selectedSale?.id, 'items'],
    queryFn: async () => {
      if (!selectedSale?.id) return [];
      const response = await fetch(`/api/orders/${selectedSale.id}/items`);
      if (!response.ok) throw new Error('Failed to fetch items');
      return response.json();
    },
    enabled: !!selectedSale?.id && isViewDialogOpen,
  });

  const posSales = useMemo(() => {
    return orders
      .filter(order => order.orderType === 'pos')
      .map(order => ({
        ...order,
        customer: customers.find(c => c.id === order.customerId),
      }));
  }, [orders, customers]);

  const filteredSales = useMemo(() => {
    let filtered = [...posSales];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(sale => 
        sale.orderId?.toLowerCase().includes(query) ||
        sale.customer?.name?.toLowerCase().includes(query) ||
        sale.notes?.toLowerCase().includes(query)
      );
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      let startDate: Date;
      
      switch (dateFilter) {
        case 'today':
          startDate = startOfDay(now);
          break;
        case 'week':
          startDate = subDays(startOfDay(now), 7);
          break;
        case 'month':
          startDate = subDays(startOfDay(now), 30);
          break;
        default:
          startDate = new Date(0);
      }
      
      filtered = filtered.filter(sale => {
        if (!sale.createdAt) return false;
        const saleDate = new Date(sale.createdAt);
        return saleDate >= startDate && saleDate <= endOfDay(now);
      });
    }

    if (paymentFilter !== 'all') {
      filtered = filtered.filter(sale => sale.paymentMethod === paymentFilter);
    }

    return filtered.sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }, [posSales, searchQuery, dateFilter, paymentFilter]);

  const cashBalance = useMemo(() => {
    const todayCash = filteredSales
      .filter(sale => sale.paymentMethod === 'cash' && sale.orderStatus !== 'cancelled')
      .reduce((sum, sale) => sum + parseFloat(String(sale.grandTotal || 0)), 0);
    
    const now = new Date();
    let startDate: Date;
    switch (dateFilter) {
      case 'today':
        startDate = startOfDay(now);
        break;
      case 'week':
        startDate = subDays(startOfDay(now), 7);
        break;
      case 'month':
        startDate = subDays(startOfDay(now), 30);
        break;
      default:
        startDate = new Date(0);
    }
    
    const cashExpenseCategories = ['cash_out', 'parts', 'food', 'water', 'supplies', 'other'];
    const totalExpenses = expenses
      .filter(exp => {
        if (!exp.date) return false;
        const expDate = new Date(exp.date);
        const inDateRange = expDate >= startDate && expDate <= endOfDay(now);
        const isCashExpense = cashExpenseCategories.includes(exp.category || '');
        return inDateRange && isCashExpense && exp.status === 'completed';
      })
      .reduce((sum, exp) => sum + parseFloat(String(exp.amount || 0)), 0);
    
    return todayCash - totalExpenses;
  }, [filteredSales, expenses, dateFilter]);

  const totalSales = useMemo(() => {
    return filteredSales
      .filter(sale => sale.orderStatus !== 'cancelled')
      .reduce((sum, sale) => sum + parseFloat(String(sale.grandTotal || 0)), 0);
  }, [filteredSales]);

  const deleteMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return apiRequest('DELETE', `/api/orders/${orderId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: t('common:success'),
        description: t('common:saleDeleted'),
      });
      setIsDeleteDialogOpen(false);
      setSelectedSale(null);
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message || t('common:deleteFailed'),
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ orderId, data }: { orderId: string; data: { notes?: string; paymentMethod?: string } }) => {
      return apiRequest('PATCH', `/api/orders/${orderId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: t('common:success'),
        description: t('common:saleUpdated'),
      });
      setIsEditDialogOpen(false);
      setSelectedSale(null);
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message || t('common:updateFailed'),
        variant: 'destructive',
      });
    },
  });

  const cashOutMutation = useMutation({
    mutationFn: async (data: { amount: string; notes: string }) => {
      const timestamp = Date.now();
      return apiRequest('POST', '/api/expenses', {
        expenseId: `CASHOUT-${timestamp}`,
        name: 'POS Cash Out',
        description: data.notes || 'POS register cash withdrawal',
        amount: data.amount,
        currency: 'CZK',
        category: 'cash_out',
        paymentMethod: 'cash',
        status: 'completed',
        date: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      toast({
        title: t('common:success'),
        description: t('common:cashOutRecorded', { amount: formatCurrency(parseFloat(cashOutAmount), 'CZK') }),
      });
      setIsCashOutDialogOpen(false);
      setCashOutAmount('');
      setCashOutNotes('');
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message || t('common:updateFailed'),
        variant: 'destructive',
      });
    },
  });

  const customCostMutation = useMutation({
    mutationFn: async (data: { amount: string; description: string; category: string }) => {
      const timestamp = Date.now();
      const categoryLabels: Record<string, string> = {
        parts: 'Parts/Materials',
        food: 'Food',
        water: 'Water/Beverages',
        supplies: 'Office Supplies',
        other: 'Other Expense',
      };
      return apiRequest('POST', '/api/expenses', {
        expenseId: `COST-${timestamp}`,
        name: categoryLabels[data.category] || 'Custom Cost',
        description: data.description || `${categoryLabels[data.category]} purchase`,
        amount: data.amount,
        currency: 'CZK',
        category: data.category,
        paymentMethod: 'cash',
        status: 'completed',
        date: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      toast({
        title: t('common:success'),
        description: t('common:customCostRecorded', { amount: formatCurrency(parseFloat(customCostAmount), 'CZK') }),
      });
      setIsCustomCostDialogOpen(false);
      setCustomCostAmount('');
      setCustomCostDescription('');
      setCustomCostCategory('other');
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message || t('common:updateFailed'),
        variant: 'destructive',
      });
    },
  });

  const handleViewSale = (sale: POSSale) => {
    setSelectedSale(sale);
    setIsViewDialogOpen(true);
  };

  const handleEditSale = (sale: POSSale) => {
    setSelectedSale(sale);
    setEditForm({
      notes: sale.notes || '',
      paymentMethod: (sale.paymentMethod as PaymentMethod) || 'cash',
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteSale = (sale: POSSale) => {
    setSelectedSale(sale);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!selectedSale) return;
    updateMutation.mutate({
      orderId: selectedSale.id,
      data: editForm,
    });
  };

  const handleConfirmDelete = () => {
    if (!selectedSale) return;
    deleteMutation.mutate(selectedSale.id);
  };

  const handleCashOut = () => {
    const amount = parseFloat(cashOutAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: t('common:error'),
        description: t('common:invalidAmount'),
        variant: 'destructive',
      });
      return;
    }
    
    if (amount > cashBalance) {
      toast({
        title: t('common:error'),
        description: t('common:insufficientCash'),
        variant: 'destructive',
      });
      return;
    }

    cashOutMutation.mutate({
      amount: cashOutAmount,
      notes: cashOutNotes,
    });
  };

  const handleCustomCost = () => {
    const amount = parseFloat(customCostAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: t('common:error'),
        description: t('common:invalidAmount'),
        variant: 'destructive',
      });
      return;
    }

    customCostMutation.mutate({
      amount: customCostAmount,
      description: customCostDescription,
      category: customCostCategory,
    });
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash': return <Banknote className="h-4 w-4" />;
      case 'card': return <CreditCard className="h-4 w-4" />;
      case 'bank_transfer':
      case 'bank_transfer_private':
      case 'bank_transfer_invoice': return <Building2 className="h-4 w-4" />;
      case 'qr_czk': return <DollarSign className="h-4 w-4" />;
      default: return <Receipt className="h-4 w-4" />;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': return t('financial:cash');
      case 'card': return t('financial:card');
      case 'bank_transfer': return t('financial:bankTransfer');
      case 'bank_transfer_private': return t('financial:bankTransfer');
      case 'bank_transfer_invoice': return t('financial:invoice');
      case 'qr_czk': return t('common:qrPayment');
      case 'pay_later': return t('orders:payLater');
      default: return method;
    }
  };

  const columns = [
    {
      key: 'orderId',
      header: t('common:orderId'),
      sortable: true,
      cell: (sale: POSSale) => (
        <span className="font-mono text-sm">{sale.orderId || sale.id.slice(0, 8)}</span>
      ),
    },
    {
      key: 'createdAt',
      header: t('common:date'),
      sortable: true,
      cell: (sale: POSSale) => (
        <div className="flex items-center gap-1 text-sm">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{sale.createdAt ? format(new Date(sale.createdAt), 'MMM d, HH:mm') : '-'}</span>
        </div>
      ),
    },
    {
      key: 'customer',
      header: t('common:customer'),
      cell: (sale: POSSale) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span>{sale.customer?.name || t('common:walkInCustomer')}</span>
        </div>
      ),
    },
    {
      key: 'paymentMethod',
      header: t('financial:paymentMethod'),
      cell: (sale: POSSale) => (
        <div className="flex items-center gap-1.5">
          {getPaymentMethodIcon(sale.paymentMethod || 'cash')}
          <span className="text-sm">{getPaymentMethodLabel(sale.paymentMethod || 'cash')}</span>
        </div>
      ),
    },
    {
      key: 'grandTotal',
      header: t('orders:total'),
      sortable: true,
      className: 'text-right',
      cell: (sale: POSSale) => (
        <span className="font-semibold">
          {formatCurrency(parseFloat(String(sale.grandTotal || 0)), sale.currency || 'CZK')}
        </span>
      ),
    },
    {
      key: 'orderStatus',
      header: t('common:status'),
      cell: (sale: POSSale) => (
        <Badge variant={sale.orderStatus === 'cancelled' ? 'destructive' : 'default'}>
          {sale.orderStatus === 'cancelled' ? t('common:cancelled') : t('common:completed')}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: t('common:actions'),
      className: 'text-right',
      cell: (sale: POSSale) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => { e.stopPropagation(); handleViewSale(sale); }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => { e.stopPropagation(); handleEditSale(sale); }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => { e.stopPropagation(); handleDeleteSale(sale); }}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('common:posSales')}</h1>
          <p className="text-muted-foreground">{t('common:posSalesDescription')}</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('common:refresh')}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('common:cashBalance')}</p>
                <p className="text-2xl font-bold">{formatCurrency(cashBalance, 'CZK')}</p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                <Wallet className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button 
                onClick={() => setIsCashOutDialogOpen(true)}
                className="flex-1"
                variant="outline"
                disabled={cashBalance <= 0}
              >
                <ArrowDownToLine className="h-4 w-4 mr-2" />
                {t('common:cashOut')}
              </Button>
              <Button 
                onClick={() => setIsCustomCostDialogOpen(true)}
                className="flex-1"
                variant="outline"
              >
                <ShoppingBag className="h-4 w-4 mr-2" />
                {t('common:customCost', 'Cost')}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('common:totalSales')}</p>
                <p className="text-2xl font-bold">{formatCurrency(totalSales, 'CZK')}</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <Receipt className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              {filteredSales.length} {t('common:transactions')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('common:averageSale')}</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    filteredSales.length > 0 ? totalSales / filteredSales.length : 0,
                    'CZK'
                  )}
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                <DollarSign className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              {t('common:perTransaction')}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            {t('common:salesHistory')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('common:searchSales')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as any)}>
              <SelectTrigger className="w-[150px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">{t('common:today')}</SelectItem>
                <SelectItem value="week">{t('common:thisWeek')}</SelectItem>
                <SelectItem value="month">{t('common:thisMonth')}</SelectItem>
                <SelectItem value="all">{t('common:allTime')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentFilter} onValueChange={(v) => setPaymentFilter(v as any)}>
              <SelectTrigger className="w-[180px]">
                <CreditCard className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common:allPayments')}</SelectItem>
                <SelectItem value="cash">{t('financial:cash')}</SelectItem>
                <SelectItem value="card">{t('financial:card')}</SelectItem>
                <SelectItem value="bank_transfer">{t('financial:bankTransfer')}</SelectItem>
                <SelectItem value="qr_czk">{t('common:qrPayment')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DataTable
            data={filteredSales}
            columns={columns}
            getRowKey={(sale) => sale.id}
            defaultItemsPerPage={15}
            compact
          />
        </CardContent>
      </Card>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              {t('common:saleDetails')}
            </DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">{t('orders:orderId')}</Label>
                  <p className="font-mono">{selectedSale.orderId || selectedSale.id.slice(0, 8)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t('common:date')}</Label>
                  <p>{selectedSale.createdAt ? format(new Date(selectedSale.createdAt), 'PPpp') : '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t('common:customer')}</Label>
                  <p>{selectedSale.customer?.name || t('common:walkInCustomer')}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t('financial:paymentMethod')}</Label>
                  <div className="flex items-center gap-1.5">
                    {getPaymentMethodIcon(selectedSale.paymentMethod || 'cash')}
                    <span>{getPaymentMethodLabel(selectedSale.paymentMethod || 'cash')}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t('orders:subtotal')}</Label>
                  <p>{formatCurrency(parseFloat(String(selectedSale.subtotal || 0)), selectedSale.currency || 'CZK')}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t('orders:total')}</Label>
                  <p className="text-lg font-bold">{formatCurrency(parseFloat(String(selectedSale.grandTotal || 0)), selectedSale.currency || 'CZK')}</p>
                </div>
              </div>
              {selectedSale.notes && (
                <div>
                  <Label className="text-muted-foreground">{t('common:notes')}</Label>
                  <p className="text-sm bg-muted p-2 rounded">{selectedSale.notes}</p>
                </div>
              )}

              {/* Items Purchased */}
              <div className="border-t pt-4">
                <Label className="text-muted-foreground flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4" />
                  {t('common:itemsPurchased', 'Items Purchased')} ({orderItems.length})
                </Label>
                {isLoadingItems ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : orderItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-3">
                    {t('common:noItems', 'No items found')}
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {orderItems.map((item: any, index: number) => (
                      <div 
                        key={item.id || index} 
                        className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {item.productName || item.variantName || item.bundleName || t('common:unknownItem', 'Unknown Item')}
                          </p>
                          {item.sku && (
                            <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <span className="text-muted-foreground">×{item.quantity}</span>
                          <span className="font-medium tabular-nums">
                            {formatCurrency(parseFloat(String(item.unitPrice || 0)) * (item.quantity || 1), selectedSale.currency || 'CZK')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('common:editSale')}</DialogTitle>
            <DialogDescription>
              {t('common:editSaleDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('financial:paymentMethod')}</Label>
              <Select 
                value={editForm.paymentMethod} 
                onValueChange={(v) => setEditForm(prev => ({ ...prev, paymentMethod: v as PaymentMethod }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(method => (
                    <SelectItem key={method.value} value={method.value}>
                      <div className="flex items-center gap-2">
                        <method.icon className="h-4 w-4" />
                        {t(`financial:${method.labelKey}`)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('common:notes')}</Label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              {t('common:cancel')}
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('common:save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {t('common:deleteSale')}
            </DialogTitle>
            <DialogDescription>
              {t('common:deleteSaleConfirmation')}
            </DialogDescription>
          </DialogHeader>
          {selectedSale && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-mono">{selectedSale.orderId || selectedSale.id.slice(0, 8)}</p>
              <p className="text-lg font-bold">
                {formatCurrency(parseFloat(String(selectedSale.grandTotal || 0)), selectedSale.currency || 'CZK')}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              {t('common:cancel')}
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('common:delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCashOutDialogOpen} onOpenChange={setIsCashOutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowDownToLine className="h-5 w-5" />
              {t('common:cashOut')}
            </DialogTitle>
            <DialogDescription>
              {t('common:cashOutDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">{t('common:availableBalance')}</p>
              <p className="text-2xl font-bold">{formatCurrency(cashBalance, 'CZK')}</p>
            </div>
            <div className="space-y-2">
              <Label>{t('common:amount')}</Label>
              <Input
                type="number"
                value={cashOutAmount}
                onChange={(e) => setCashOutAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('common:notes')}</Label>
              <Textarea
                value={cashOutNotes}
                onChange={(e) => setCashOutNotes(e.target.value)}
                placeholder={t('common:cashOutNotesPlaceholder')}
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setCashOutAmount(cashBalance.toString())}
              >
                {t('common:cashOutAll')}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCashOutDialogOpen(false)}>
              {t('common:cancel')}
            </Button>
            <Button onClick={handleCashOut} disabled={cashOutMutation.isPending}>
              {cashOutMutation.isPending ? t('common:processing') : t('common:confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCustomCostDialogOpen} onOpenChange={setIsCustomCostDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              {t('common:customCost', 'Custom Cost')}
            </DialogTitle>
            <DialogDescription>
              {t('common:customCostDescription', 'Record employee purchases (parts, food, water, supplies)')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('common:category', 'Category')}</Label>
              <Select value={customCostCategory} onValueChange={(v) => setCustomCostCategory(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="parts">{t('common:costCategoryParts', 'Parts/Materials')}</SelectItem>
                  <SelectItem value="food">{t('common:costCategoryFood', 'Food')}</SelectItem>
                  <SelectItem value="water">{t('common:costCategoryWater', 'Water/Beverages')}</SelectItem>
                  <SelectItem value="supplies">{t('common:costCategorySupplies', 'Office Supplies')}</SelectItem>
                  <SelectItem value="other">{t('common:costCategoryOther', 'Other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('common:amount')}</Label>
              <Input
                type="number"
                value={customCostAmount}
                onChange={(e) => setCustomCostAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('common:description', 'Description')}</Label>
              <Textarea
                value={customCostDescription}
                onChange={(e) => setCustomCostDescription(e.target.value)}
                placeholder={t('common:customCostPlaceholder', 'What was purchased...')}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCustomCostDialogOpen(false)}>
              {t('common:cancel')}
            </Button>
            <Button onClick={handleCustomCost} disabled={customCostMutation.isPending}>
              {customCostMutation.isPending ? t('common:processing') : t('common:confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
