import { useState, useMemo, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Package2, Truck, MapPin, Clock, CreditCard, Edit, Trash2, ChevronDown, ChevronUp, Filter, Search, ListPlus, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getCurrencySymbol, Currency } from "@/lib/currencyUtils";

interface Purchase {
  id: number;
  supplier: string;
  trackingNumber: string | null;
  estimatedArrival: string | null;
  notes: string | null;
  shippingCost: string;
  totalCost: string;
  purchaseCurrency?: string;
  paymentCurrency?: string;
  totalPaid?: string;
  purchaseTotal?: string;
  exchangeRate?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  items: PurchaseItem[];
  itemCount: number;
  location?: string;
  consolidation?: string;
}

interface PurchaseItem {
  id: number;
  purchaseId: number;
  name: string;
  sku: string | null;
  category: string;
  barcode: string;
  quantity: number;
  unitPrice: string;
  weight: string;
  dimensions: string | null;
  notes: string | null;
  createdAt: string;
  isVariant?: boolean;
  variantName?: string;
}

type PurchaseStatus = 'pending' | 'processing' | 'at_warehouse' | 'shipped' | 'delivered';

const statusColors: Record<PurchaseStatus, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  at_warehouse: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  shipped: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800",
  delivered: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-200 dark:border-green-800"
};

const statusIcons: Record<PurchaseStatus, typeof Clock> = {
  pending: Clock,
  processing: Package2,
  at_warehouse: MapPin,
  shipped: Truck,
  delivered: CheckCircle2
};

const statusLabelKeys: Record<PurchaseStatus, string> = {
  pending: 'pending',
  processing: 'supplierProcessing',
  at_warehouse: 'consolidation',
  shipped: 'inTransit',
  delivered: 'received'
};

const getNextStatuses = (currentStatus: PurchaseStatus): PurchaseStatus[] => {
  switch (currentStatus) {
    case 'pending':
      return ['processing'];
    case 'processing':
      return ['at_warehouse', 'shipped'];
    case 'at_warehouse':
      return ['shipped'];
    case 'shipped':
      return ['delivered'];
    case 'delivered':
      return [];
    default:
      return [];
  }
};

const locations = ["Europe", "USA", "China", "Vietnam"];

const normalizeVietnamese = (str: string): string => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
};

export default function SupplierProcessing() {
  const { t } = useTranslation('imports');
  const [, setLocation] = useLocation();
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [expandedPurchases, setExpandedPurchases] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showVariants, setShowVariants] = useState(false);
  const [variants, setVariants] = useState<Array<{
    id: string;
    name: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    weight: number;
    dimensions: string;
  }>>([]);
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [seriesDialogOpen, setSeriesDialogOpen] = useState(false);
  const [newVariant, setNewVariant] = useState({
    name: "",
    sku: "",
    quantity: 1,
    unitPrice: 0,
    weight: 0,
    dimensions: ""
  });
  const [seriesInput, setSeriesInput] = useState("");
  const [seriesQuantity, setSeriesQuantity] = useState(1);
  const [seriesUnitPrice, setSeriesUnitPrice] = useState(0);
  const [seriesWeight, setSeriesWeight] = useState(0);
  const [selectedVariants, setSelectedVariants] = useState<string[]>([]);
  
  const [currentItem, setCurrentItem] = useState({
    name: "",
    sku: "",
    category: "",
    barcode: "",
    quantity: 1,
    unitPrice: 0,
    weight: 0,
    dimensions: "",
    notes: ""
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [purchaseToDelete, setPurchaseToDelete] = useState<Purchase | null>(null);

  const { data: purchasesData, isLoading } = useQuery<Purchase[]>({
    queryKey: ['/api/imports/purchases']
  });
  
  const purchases = purchasesData || [];

  const addItemMutation = useMutation({
    mutationFn: async ({ purchaseId, item }: { purchaseId: number; item: any }) => {
      const response = await apiRequest('POST', `/api/imports/purchases/${purchaseId}/items`, item);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/purchases'] });
      setIsAddItemModalOpen(false);
      setSelectedPurchase(null);
      toast({ title: t('success'), description: t('itemAddedSuccess') });
    },
    onError: () => {
      toast({ 
        title: t('error'), 
        description: t('itemAddFailed'), 
        variant: "destructive" 
      });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ purchaseId, status }: { purchaseId: number; status: string }) => {
      let finalStatus = status;
      const purchase = purchases.find(p => p.id === purchaseId);
      
      if (status === 'delivered' && purchase) {
        if (purchase.consolidation === 'Yes') {
          finalStatus = 'at_warehouse';
        }
      }
      
      const response = await apiRequest('PATCH', `/api/imports/purchases/${purchaseId}`, { status: finalStatus });
      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/purchases'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/purchases/at-warehouse'] });
      
      if (variables.status === 'delivered') {
        queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/receivable'] });
        queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments'] });
      }
      
      const purchase = purchases.find(p => p.id === variables.purchaseId);
      if (variables.status === 'delivered' && purchase) {
        if (purchase.consolidation === 'Yes') {
          toast({ title: t('success'), description: t('itemsMovedToConsolidation') });
          setLocation('/consolidation');
        } else {
          toast({ title: t('success'), description: t('shipmentAutoCreated') });
          setLocation('/receiving');
        }
      } else if (variables.status === 'at_warehouse') {
        toast({ title: t('success'), description: t('statusUpdatedMovedToConsolidation') });
      } else {
        toast({ title: t('success'), description: t('statusUpdatedSuccessfully') });
      }
    },
    onError: () => {
      toast({ 
        title: t('error'), 
        description: t('statusUpdateFailed'), 
        variant: "destructive" 
      });
    }
  });

  const deletePurchaseMutation = useMutation({
    mutationFn: async (purchaseId: number) => {
      const response = await apiRequest('DELETE', `/api/imports/purchases/${purchaseId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/purchases'] });
      toast({ title: t('success'), description: t('purchaseDeleted') });
      setDeleteDialogOpen(false);
      setPurchaseToDelete(null);
    },
    onError: () => {
      toast({ 
        title: t('error'), 
        description: t('purchaseDeleteFailed'), 
        variant: "destructive" 
      });
      setDeleteDialogOpen(false);
      setPurchaseToDelete(null);
    }
  });

  const handleDeleteClick = (purchase: Purchase) => {
    setPurchaseToDelete(purchase);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (purchaseToDelete) {
      deletePurchaseMutation.mutate(purchaseToDelete.id);
    }
  };

  const addVariant = () => {
    if (!newVariant.name.trim()) {
      toast({ title: t('error'), description: t('variantNameRequired'), variant: "destructive" });
      return;
    }
    
    const variant = {
      id: Date.now().toString(),
      name: newVariant.name,
      sku: newVariant.sku,
      quantity: newVariant.quantity,
      unitPrice: newVariant.unitPrice,
      weight: newVariant.weight,
      dimensions: newVariant.dimensions
    };
    
    setVariants([...variants, variant]);
    setNewVariant({ name: "", sku: "", quantity: 1, unitPrice: 0, weight: 0, dimensions: "" });
    setVariantDialogOpen(false);
  };

  const removeVariant = (id: string) => {
    setVariants(variants.filter(v => v.id !== id));
    setSelectedVariants(selectedVariants.filter(v => v !== id));
  };

  const addVariantSeries = () => {
    if (!seriesInput.trim()) {
      toast({ title: t('error'), description: t('seriesInputRequired'), variant: "destructive" });
      return;
    }

    const lines = seriesInput.split('\n').filter(line => line.trim());
    const newVariants = lines.map((line, index) => ({
      id: (Date.now() + index).toString(),
      name: line.trim(),
      sku: "",
      quantity: seriesQuantity,
      unitPrice: seriesUnitPrice,
      weight: seriesWeight,
      dimensions: ""
    }));

    setVariants([...variants, ...newVariants]);
    setSeriesInput("");
    setSeriesQuantity(1);
    setSeriesUnitPrice(0);
    setSeriesWeight(0);
    setSeriesDialogOpen(false);
  };

  const bulkUpdateVariants = (field: string, value: number) => {
    if (selectedVariants.length === 0) {
      toast({ title: t('error'), description: t('selectVariantsToUpdate'), variant: "destructive" });
      return;
    }

    setVariants(variants.map(variant => 
      selectedVariants.includes(variant.id) 
        ? { ...variant, [field]: value }
        : variant
    ));
  };

  const removeSelectedVariants = () => {
    if (selectedVariants.length === 0) {
      toast({ title: t('error'), description: t('selectVariantsToRemove'), variant: "destructive" });
      return;
    }

    setVariants(variants.filter(v => !selectedVariants.includes(v.id)));
    setSelectedVariants([]);
  };

  const resetVariants = () => {
    setShowVariants(false);
    setVariants([]);
    setSelectedVariants([]);
  };

  const handleAddItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPurchase) return;
    
    if (showVariants && variants.length > 0) {
      const items = variants.map(variant => ({
        name: `${currentItem.name} - ${variant.name}`,
        sku: variant.sku || currentItem.sku,
        category: currentItem.category,
        barcode: currentItem.barcode,
        quantity: variant.quantity,
        unitPrice: variant.unitPrice,
        weight: variant.weight,
        dimensions: variant.dimensions || currentItem.dimensions,
        notes: currentItem.notes,
        isVariant: true,
        variantName: variant.name
      }));

      for (const item of items) {
        await new Promise((resolve) => {
          addItemMutation.mutate({ purchaseId: selectedPurchase.id, item }, {
            onSettled: resolve
          });
        });
      }
      
      setCurrentItem({
        name: "",
        sku: "",
        category: "",
        barcode: "",
        quantity: 1,
        unitPrice: 0,
        weight: 0,
        dimensions: "",
        notes: ""
      });
      resetVariants();
    } else {
      const formData = new FormData(e.currentTarget);
      
      const item = {
        name: formData.get('name') as string,
        sku: formData.get('sku') as string || null,
        category: formData.get('category') as string,
        barcode: formData.get('barcode') as string,
        quantity: parseInt(formData.get('quantity') as string) || 1,
        unitPrice: parseFloat(formData.get('unitPrice') as string) || 0,
        weight: parseFloat(formData.get('weight') as string) || 0,
        dimensions: formData.get('dimensions') as string || null,
        notes: formData.get('notes') as string || null,
      };
      
      addItemMutation.mutate({ purchaseId: selectedPurchase.id, item });
    }
  };

  const filteredPurchases = useMemo(() => {
    let filtered = [...purchases];
    
    filtered = filtered.map(p => ({
      ...p,
      location: p.location || locations[p.id % locations.length]
    }));

    if (searchTerm) {
      const normalizedSearch = normalizeVietnamese(searchTerm);
      filtered = filtered.filter(p => 
        normalizeVietnamese(p.supplier).includes(normalizedSearch) ||
        (p.trackingNumber && normalizeVietnamese(p.trackingNumber).includes(normalizedSearch)) ||
        p.items.some(item => 
          normalizeVietnamese(item.name).includes(normalizedSearch) ||
          (item.sku && normalizeVietnamese(item.sku).includes(normalizedSearch))
        )
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    if (locationFilter !== "all") {
      filtered = filtered.filter(p => p.location === locationFilter);
    }

    return filtered;
  }, [purchases, searchTerm, statusFilter, locationFilter]);

  const getItemColumns = (itemCount: number, currency: string = 'USD'): DataTableColumn<PurchaseItem>[] => {
    const currencySymbol = getCurrencySymbol(currency as Currency);
    const baseColumns: DataTableColumn<PurchaseItem>[] = [
      {
        key: "name",
        header: t('item'),
        sortable: true,
        cell: (item) => (
          <div>
            <div className="font-medium text-sm leading-tight">{item.name}</div>
            {item.sku && <div className="text-xs text-muted-foreground leading-tight">SKU: {item.sku}</div>}
          </div>
        ),
        className: itemCount > 6 ? "min-w-[200px]" : "min-w-[150px]"
      },
      {
        key: "quantity",
        header: t('qty'),
        sortable: true,
        cell: (item) => (
          <span className="font-medium text-sm">{item.quantity}</span>
        ),
        className: "w-[60px] text-center"
      },
      {
        key: "unitPrice",
        header: t('price'),
        sortable: true,
        cell: (item) => (
          <span className="text-sm">{currencySymbol}{item.unitPrice}</span>
        ),
        className: "w-[80px] text-right"
      }
    ];

    if (itemCount <= 6) {
      baseColumns.push(
        {
          key: "weight",
          header: t('weight'),
          sortable: true,
          cell: (item) => (
            <span className="text-sm">{item.weight}kg</span>
          ),
          className: "w-[80px] text-right"
        },
        {
          key: "dimensions",
          header: t('dimensions'),
          cell: (item) => {
            const formatDimensions = (dim: any) => {
              if (!dim) return '-';
              if (typeof dim === 'string') return dim;
              if (typeof dim === 'object' && dim !== null) {
                const { length, width, height } = dim;
                if (length || width || height) {
                  return `${length || 0}×${width || 0}×${height || 0}`;
                }
              }
              return '-';
            };
            
            return (
              <span className="text-xs text-muted-foreground">
                {formatDimensions(item.dimensions)}
              </span>
            );
          },
          className: "w-[120px]"
        },
        {
          key: "notes",
          header: t('notes'),
          cell: (item) => (
            <span className="text-xs text-muted-foreground truncate max-w-[150px] block">
              {item.notes || '-'}
            </span>
          ),
          className: "w-[150px]"
        }
      );
    } else if (itemCount <= 12) {
      baseColumns.push(
        {
          key: "weight",
          header: "Weight",
          sortable: true,
          cell: (item) => (
            <span className="text-sm">{item.weight}kg</span>
          ),
          className: "w-[80px] text-right"
        },
        {
          key: "total",
          header: t('total'),
          sortable: true,
          cell: (item) => (
            <span className="text-sm font-medium">
              ${(item.quantity * parseFloat(item.unitPrice)).toFixed(2)}
            </span>
          ),
          className: "w-[90px] text-right"
        }
      );
    } else {
      baseColumns.push(
        {
          key: "total",
          header: t('total'),
          sortable: true,
          cell: (item) => (
            <span className="text-sm font-medium">
              ${(item.quantity * parseFloat(item.unitPrice)).toFixed(2)}
            </span>
          ),
          className: "w-[90px] text-right"
        }
      );
    }

    return baseColumns;
  };

  const toggleAllExpanded = () => {
    if (expandedPurchases.size === filteredPurchases.length) {
      setExpandedPurchases(new Set());
    } else {
      setExpandedPurchases(new Set(filteredPurchases.map(p => p.id)));
    }
  };

  useEffect(() => {
    if (purchases.length > 0 && expandedPurchases.size === 0) {
      setExpandedPurchases(new Set(purchases.map(p => p.id)));
    }
  }, [purchases.length]);

  const getLocationFlag = (location: string) => {
    switch (location) {
      case 'Europe': return '🇪🇺';
      case 'USA': return '🇺🇸';
      case 'China': return '🇨🇳';
      case 'Vietnam': return '🇻🇳';
      default: return '';
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const statusKey = status as PurchaseStatus;
    const color = statusColors[statusKey] || statusColors.pending;
    const Icon = statusIcons[statusKey] || Clock;
    const labelKey = statusLabelKeys[statusKey] || 'pending';
    return (
      <Badge className={cn("text-[10px] h-5 px-2 font-medium border", color)}>
        <Icon className="h-3 w-3 mr-1" />
        {t(labelKey)}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="p-2 sm:p-3 lg:p-4">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="p-2 sm:p-3 lg:p-4 space-y-3 lg:space-y-4 overflow-x-hidden w-full max-w-none">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{t('purchaseOrders')}</h1>
            <p className="text-sm md:text-base text-muted-foreground">{t('manageImportPurchases')}</p>
          </div>
          <Link href="/purchase-orders/create" className="w-full sm:w-auto">
            <Button data-testid="button-create-purchase" className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              {t('createPurchase')}
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 lg:gap-3">
          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">{t('totalPurchases')}</CardTitle>
              <Package2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold" data-testid="text-total-purchases">{purchases.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">{t('pending')}</CardTitle>
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-amber-700 dark:text-amber-300">
                {purchases.filter(p => p.status === 'pending').length}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Processing</CardTitle>
              <Package2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-300">
                {purchases.filter(p => p.status === 'processing').length}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">{t('consolidation')}</CardTitle>
              <MapPin className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-purple-700 dark:text-purple-300">
                {purchases.filter(p => p.status === 'at_warehouse').length}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">{t('totalItems')}</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-green-700 dark:text-green-300">
                {purchases.reduce((sum, p) => sum + p.itemCount, 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <CardTitle className="text-lg md:text-xl">{t('purchaseOrders')}</CardTitle>
                <CardDescription className="text-sm">
                  {t('manageSupplierPurchases')}
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('searchOrders')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-full sm:w-[220px]"
                    data-testid="input-search"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[160px]" data-testid="select-status-filter">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder={t('filterByStatus')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allStatus')}</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Supplier Processing</SelectItem>
                    <SelectItem value="at_warehouse">At Consolidation</SelectItem>
                    <SelectItem value="shipped">In Transit</SelectItem>
                    <SelectItem value="delivered">Received</SelectItem>
                  </SelectContent>
                </Select>
                {/* Location Toggle Buttons - prominent for frequent switching */}
                <div className="flex items-center gap-1 p-1 bg-muted/50 dark:bg-muted/30 rounded-lg border" data-testid="location-filter-group">
                  <Button
                    variant={locationFilter === 'all' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setLocationFilter('all')}
                    className={cn(
                      "h-9 px-3 text-xs font-medium transition-all",
                      locationFilter === 'all' 
                        ? "bg-primary text-primary-foreground shadow-sm" 
                        : "hover:bg-background"
                    )}
                    data-testid="button-location-all"
                  >
                    <MapPin className="h-3.5 w-3.5 mr-1" />
                    {t('all')}
                  </Button>
                  <Button
                    variant={locationFilter === 'Europe' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setLocationFilter('Europe')}
                    className={cn(
                      "h-9 px-3 text-sm transition-all",
                      locationFilter === 'Europe' 
                        ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700" 
                        : "hover:bg-blue-50 dark:hover:bg-blue-950"
                    )}
                    data-testid="button-location-europe"
                  >
                    🇪🇺
                  </Button>
                  <Button
                    variant={locationFilter === 'USA' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setLocationFilter('USA')}
                    className={cn(
                      "h-9 px-3 text-sm transition-all",
                      locationFilter === 'USA' 
                        ? "bg-red-600 text-white shadow-sm hover:bg-red-700" 
                        : "hover:bg-red-50 dark:hover:bg-red-950"
                    )}
                    data-testid="button-location-usa"
                  >
                    🇺🇸
                  </Button>
                  <Button
                    variant={locationFilter === 'China' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setLocationFilter('China')}
                    className={cn(
                      "h-9 px-3 text-sm transition-all",
                      locationFilter === 'China' 
                        ? "bg-amber-600 text-white shadow-sm hover:bg-amber-700" 
                        : "hover:bg-amber-50 dark:hover:bg-amber-950"
                    )}
                    data-testid="button-location-china"
                  >
                    🇨🇳
                  </Button>
                  <Button
                    variant={locationFilter === 'Vietnam' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setLocationFilter('Vietnam')}
                    className={cn(
                      "h-9 px-3 text-sm transition-all",
                      locationFilter === 'Vietnam' 
                        ? "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700" 
                        : "hover:bg-emerald-50 dark:hover:bg-emerald-950"
                    )}
                    data-testid="button-location-vietnam"
                  >
                    🇻🇳
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleAllExpanded}
                  data-testid="button-toggle-all"
                  className="w-full sm:w-auto"
                >
                  {expandedPurchases.size === filteredPurchases.length ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-2" />
                      {t('collapseAll')}
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-2" />
                      {t('expandAll')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredPurchases.length === 0 ? (
              <div className="text-center py-12">
                <Package2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {purchases.length === 0 ? t('noPurchasesFound') : t('noMatchingPurchases')}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {purchases.length === 0 
                    ? t('createFirstPurchaseOrder')
                    : t('tryAdjustingFilters')
                  }
                </p>
                {purchases.length === 0 && (
                  <Link href="/purchase-orders/create">
                    <Button data-testid="button-create-first-purchase">
                      <Plus className="h-4 w-4 mr-2" />
                      {t('createPurchase')}
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <>
                {/* Mobile Card View */}
                <div className="sm:hidden space-y-3">
                  {filteredPurchases.map((purchase) => (
                    <div key={purchase.id} className="bg-card rounded-lg shadow-sm border p-4">
                      <div className="space-y-3">
                        {/* Top Row */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold truncate">
                                {getLocationFlag(purchase.location || '')} {purchase.supplier}
                              </p>
                            </div>
                            {purchase.trackingNumber && (
                              <p className="text-xs text-muted-foreground font-mono">
                                {purchase.trackingNumber}
                              </p>
                            )}
                          </div>
                          <StatusBadge status={purchase.status} />
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs">{t('items')}</p>
                            <p className="font-medium flex items-center gap-1">
                              <Package2 className="h-3.5 w-3.5" />
                              {purchase.itemCount} {t('items')}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">{t('dateInitiated')}</p>
                            <p className="font-medium">
                              {format(new Date(purchase.createdAt), 'MMM dd, yyyy')}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">{t('estimatedArrival')}</p>
                            <p className="font-medium flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {purchase.estimatedArrival 
                                ? format(new Date(purchase.estimatedArrival), 'MMM dd, yyyy')
                                : t('tbd')
                              }
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">{t('totalCost')}</p>
                            <p className="text-lg font-bold">
                              {getCurrencySymbol((purchase.purchaseCurrency || 'USD') as Currency)}{purchase.totalCost}
                            </p>
                          </div>
                        </div>

                        {/* Notes */}
                        {purchase.notes && (
                          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded p-2">
                            <p className="text-xs text-amber-800 dark:text-amber-200">
                              <span className="font-medium">{t('note')}:</span> {purchase.notes}
                            </p>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-2 border-t">
                          {/* Next Status Button */}
                          {getNextStatuses(purchase.status as PurchaseStatus).length > 0 && (
                            <Select
                              value=""
                              onValueChange={(status) => updateStatusMutation.mutate({ purchaseId: purchase.id, status })}
                              disabled={updateStatusMutation.isPending}
                            >
                              <SelectTrigger className="flex-1 h-8 text-xs">
                                <ArrowRight className="h-3 w-3 mr-1" />
                                <span>{t('moveTo')}</span>
                              </SelectTrigger>
                              <SelectContent>
                                {getNextStatuses(purchase.status as PurchaseStatus).map((nextStatus) => (
                                  <SelectItem key={nextStatus} value={nextStatus}>
                                    {t(statusLabelKeys[nextStatus])}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          <Link href={`/purchase-orders/edit/${purchase.id}`}>
                            <Button size="sm" variant="outline" className="h-8">
                              <Edit className="h-3.5 w-3.5 mr-1" />
                              {t('edit')}
                            </Button>
                          </Link>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8"
                                onClick={() => {
                                  setSelectedPurchase(purchase);
                                  setIsAddItemModalOpen(true);
                                }}
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('addItem')}</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                onClick={() => handleDeleteClick(purchase)}
                                disabled={deletePurchaseMutation.isPending}
                                data-testid={`button-delete-${purchase.id}`}
                              >
                                {deletePurchaseMutation.isPending && purchaseToDelete?.id === purchase.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('deletePurchase')}</TooltipContent>
                          </Tooltip>
                        </div>

                        {/* Expandable Items */}
                        {purchase.items.length > 0 && (
                          <div className="pt-2 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full h-7 text-xs"
                              onClick={() => {
                                const newExpanded = new Set(expandedPurchases);
                                if (expandedPurchases.has(purchase.id)) {
                                  newExpanded.delete(purchase.id);
                                } else {
                                  newExpanded.add(purchase.id);
                                }
                                setExpandedPurchases(newExpanded);
                              }}
                            >
                              {expandedPurchases.has(purchase.id) ? (
                                <>
                                  <ChevronUp className="h-3.5 w-3.5 mr-1" />
                                  {t('hideItems')} ({purchase.items.length})
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-3.5 w-3.5 mr-1" />
                                  {t('viewItems')} ({purchase.items.length})
                                </>
                              )}
                            </Button>
                            {expandedPurchases.has(purchase.id) && (
                              <div className="mt-2 space-y-2">
                                {purchase.items.map((item) => (
                                  <div key={item.id} className="bg-muted/50 rounded p-2 text-xs">
                                    <p className="font-medium">{item.name}</p>
                                    {item.sku && <p className="text-muted-foreground">SKU: {item.sku}</p>}
                                    <div className="flex justify-between mt-1">
                                      <span className="text-muted-foreground">{t('qty')}: {item.quantity}</span>
                                      <span className="font-medium">{getCurrencySymbol((purchase.purchaseCurrency || 'USD') as Currency)}{item.unitPrice}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden sm:block space-y-3">
                  {filteredPurchases.map((purchase) => {
                    const isExpanded = expandedPurchases.has(purchase.id);
                    const nextStatuses = getNextStatuses(purchase.status as PurchaseStatus);
                    
                    return (
                      <Card key={purchase.id} className="border hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          {/* Header Row */}
                          <div className="flex items-start gap-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 mt-0.5 shrink-0"
                              onClick={() => {
                                const newExpanded = new Set(expandedPurchases);
                                if (isExpanded) {
                                  newExpanded.delete(purchase.id);
                                } else {
                                  newExpanded.add(purchase.id);
                                }
                                setExpandedPurchases(newExpanded);
                              }}
                              data-testid={`button-toggle-${purchase.id}`}
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                            
                            <div className="flex-1 min-w-0">
                              {/* Title Row */}
                              <div className="flex items-center gap-3">
                                <h3 className="font-semibold text-base" data-testid={`text-supplier-${purchase.id}`}>
                                  {getLocationFlag(purchase.location || '')} {purchase.supplier}
                                </h3>
                                <StatusBadge status={purchase.status} />
                                {purchase.trackingNumber && (
                                  <span className="text-xs font-mono text-muted-foreground ml-auto hidden md:inline">
                                    {purchase.trackingNumber}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 shrink-0">
                              {/* Next Status Dropdown */}
                              {nextStatuses.length > 0 ? (
                                <Select
                                  value=""
                                  onValueChange={(status) => updateStatusMutation.mutate({ purchaseId: purchase.id, status })}
                                  disabled={updateStatusMutation.isPending}
                                >
                                  <SelectTrigger className="w-[130px] h-8 text-xs">
                                    {updateStatusMutation.isPending ? (
                                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                    ) : (
                                      <ArrowRight className="h-3 w-3 mr-1" />
                                    )}
                                    <span>{t('moveTo')}</span>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {nextStatuses.map((nextStatus) => (
                                      <SelectItem key={nextStatus} value={nextStatus}>
                                        <span className="flex items-center gap-2">
                                          {t(statusLabelKeys[nextStatus])}
                                        </span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge variant="outline" className="h-8 px-3 text-xs text-green-600">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  {t('complete')}
                                </Badge>
                              )}
                              
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Link href={`/purchase-orders/edit/${purchase.id}`}>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      data-testid={`button-edit-${purchase.id}`}
                                    >
                                      <Edit className="h-3.5 w-3.5" />
                                    </Button>
                                  </Link>
                                </TooltipTrigger>
                                <TooltipContent>{t('editPurchase')}</TooltipContent>
                              </Tooltip>
                              
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => {
                                      setSelectedPurchase(purchase);
                                      setIsAddItemModalOpen(true);
                                    }}
                                    data-testid={`button-add-item-${purchase.id}`}
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{t('addItem')}</TooltipContent>
                              </Tooltip>
                              
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-destructive hover:bg-destructive hover:text-destructive-foreground border-destructive/30"
                                    onClick={() => handleDeleteClick(purchase)}
                                    disabled={deletePurchaseMutation.isPending && purchaseToDelete?.id === purchase.id}
                                    data-testid={`button-delete-${purchase.id}`}
                                  >
                                    {deletePurchaseMutation.isPending && purchaseToDelete?.id === purchase.id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-3.5 w-3.5" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{t('deletePurchase')}</TooltipContent>
                              </Tooltip>
                            </div>
                          </div>

                          {/* Info Grid - Full Width */}
                          <div className="pl-10 mt-2 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-2 text-sm">
                            <div className="flex items-center gap-1.5">
                              <Package2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="text-muted-foreground">{purchase.itemCount} items</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="text-muted-foreground">
                                ETA: {purchase.estimatedArrival 
                                  ? format(new Date(purchase.estimatedArrival), 'MMM dd')
                                  : 'TBD'
                                }
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Truck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="text-muted-foreground">
                                Ship: {getCurrencySymbol((purchase.purchaseCurrency || 'USD') as Currency)}{purchase.shippingCost}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <CreditCard className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span className="font-semibold">
                                {getCurrencySymbol((purchase.purchaseCurrency || 'USD') as Currency)}{purchase.totalCost}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted-foreground">
                                {format(new Date(purchase.createdAt), 'MMM dd, yyyy')}
                              </span>
                            </div>
                            {purchase.paymentCurrency && purchase.paymentCurrency !== purchase.purchaseCurrency && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-muted-foreground">
                                  Paid: {getCurrencySymbol(purchase.paymentCurrency as Currency)}{purchase.totalPaid || '0'}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Items Table */}
                          {isExpanded && (
                            <div className="pl-10 mt-3">
                              {purchase.items.length === 0 ? (
                                <div className="text-center py-4 bg-muted/30 rounded border border-dashed">
                                  <p className="text-muted-foreground text-sm">{t('noItemsAddedYet')}</p>
                                </div>
                              ) : (
                                <div className={cn(
                                  "rounded bg-card/50 overflow-x-auto",
                                  purchase.items.length > 12 && "max-h-[380px] overflow-y-auto"
                                )}>
                                  <DataTable
                                    data={purchase.items}
                                    columns={getItemColumns(purchase.items.length, purchase.purchaseCurrency || 'USD')}
                                    getRowKey={(item) => item.id.toString()}
                                    showPagination={false}
                                    className="text-sm"
                                    defaultExpandAll={false}
                                    compact={true}
                                  />
                                </div>
                              )}
                            </div>
                          )}

                          {/* Notes */}
                          {purchase.notes && isExpanded && (
                            <div className="mt-3 pl-10">
                              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded text-sm">
                                <span className="font-medium text-amber-900 dark:text-amber-300">{t('note')}: </span>
                                <span className="text-amber-800 dark:text-amber-400">{purchase.notes}</span>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Add Item Modal */}
        <Dialog open={isAddItemModalOpen} onOpenChange={setIsAddItemModalOpen}>
          <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('addItemToPurchase')}</DialogTitle>
              <DialogDescription>
                {t('addNewItemToPurchase', { supplier: selectedPurchase?.supplier })}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddItem} className="space-y-4">
              {/* First row: Item Name and SKU */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('itemName')} *</Label>
                  <Input 
                    id="name" 
                    name="name" 
                    required 
                    data-testid="input-item-name"
                    placeholder={t('enterItemName')}
                    value={currentItem.name}
                    onChange={(e) => setCurrentItem(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku">{t('skuProductCode')}</Label>
                  <Input 
                    id="sku" 
                    name="sku" 
                    data-testid="input-item-sku"
                    placeholder={t('optionalSku')}
                    value={currentItem.sku}
                    onChange={(e) => setCurrentItem(prev => ({ ...prev, sku: e.target.value }))}
                  />
                </div>
              </div>

              {/* Second row: Category and Barcode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">{t('itemCategory')}</Label>
                  <Input 
                    id="category" 
                    name="category" 
                    data-testid="input-item-category"
                    placeholder={t('categoryPlaceholder')}
                    value={currentItem.category}
                    onChange={(e) => setCurrentItem(prev => ({ ...prev, category: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="barcode">{t('barcodeEan13')}</Label>
                  <Input 
                    id="barcode" 
                    name="barcode" 
                    data-testid="input-item-barcode"
                    placeholder={t('barcodePlaceholder')}
                    maxLength={13}
                    value={currentItem.barcode}
                    onChange={(e) => setCurrentItem(prev => ({ ...prev, barcode: e.target.value }))}
                  />
                </div>
              </div>

              {/* Variants checkbox */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="hasVariants" 
                    checked={showVariants}
                    onCheckedChange={(checked) => {
                      setShowVariants(checked as boolean);
                      if (!checked) {
                        resetVariants();
                      }
                    }}
                    data-testid="checkbox-has-variants"
                  />
                  <Label htmlFor="hasVariants" className="text-sm font-medium">
                    {t('itemHasVariants')}
                  </Label>
                </div>

                {/* Variants section */}
                {showVariants && (
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setVariantDialogOpen(true)}
                        data-testid="button-add-variant"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {t('addVariant')}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSeriesDialogOpen(true)}
                        data-testid="button-add-series"
                      >
                        <ListPlus className="h-4 w-4 mr-1" />
                        {t('addSeries')}
                      </Button>
                    </div>

                    {/* Variants table */}
                    {variants.length > 0 && (
                      <div className="space-y-3">
                        <div className="bg-background border rounded-lg overflow-hidden">
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/50">
                                  <TableHead className="w-10 p-2">
                                    <Checkbox
                                      checked={selectedVariants.length === variants.length}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setSelectedVariants(variants.map(v => v.id));
                                        } else {
                                          setSelectedVariants([]);
                                        }
                                      }}
                                      data-testid="checkbox-select-all-variants"
                                    />
                                  </TableHead>
                                  <TableHead className="p-2 min-w-32">{t('variantName')}</TableHead>
                                  <TableHead className="p-2 min-w-24">{t('sku')}</TableHead>
                                  <TableHead className="p-2 w-16">{t('qty')}</TableHead>
                                  <TableHead className="p-2 w-20">{t('price')}</TableHead>
                                  <TableHead className="p-2 w-16">{t('weight')}</TableHead>
                                  <TableHead className="p-2 w-10"></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {variants.map((variant) => (
                                  <TableRow key={variant.id} className="h-10">
                                    <TableCell className="p-2">
                                      <Checkbox
                                        checked={selectedVariants.includes(variant.id)}
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            setSelectedVariants([...selectedVariants, variant.id]);
                                          } else {
                                            setSelectedVariants(selectedVariants.filter(id => id !== variant.id));
                                          }
                                        }}
                                        data-testid={`checkbox-variant-${variant.id}`}
                                      />
                                    </TableCell>
                                    <TableCell className="p-2 font-medium text-sm">{variant.name}</TableCell>
                                    <TableCell className="p-2">
                                      <Input
                                        type="text"
                                        value={variant.sku}
                                        onChange={(e) => {
                                          setVariants(variants.map(v => 
                                            v.id === variant.id ? {...v, sku: e.target.value} : v
                                          ));
                                        }}
                                        className="h-6 text-xs"
                                        placeholder="SKU"
                                      />
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Input
                                        type="number"
                                        value={variant.quantity}
                                        onChange={(e) => {
                                          setVariants(variants.map(v => 
                                            v.id === variant.id ? {...v, quantity: parseInt(e.target.value) || 1} : v
                                          ));
                                        }}
                                        className="h-6 w-14 text-right text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        min="1"
                                      />
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Input
                                        type="number"
                                        value={variant.unitPrice}
                                        onChange={(e) => {
                                          setVariants(variants.map(v => 
                                            v.id === variant.id ? {...v, unitPrice: parseFloat(e.target.value) || 0} : v
                                          ));
                                        }}
                                        className="h-6 w-16 text-right text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        step="0.01"
                                        min="0"
                                      />
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Input
                                        type="number"
                                        value={variant.weight}
                                        onChange={(e) => {
                                          setVariants(variants.map(v => 
                                            v.id === variant.id ? {...v, weight: parseFloat(e.target.value) || 0} : v
                                          ));
                                        }}
                                        className="h-6 w-14 text-right text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        step="0.01"
                                        min="0"
                                      />
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeVariant(variant.id)}
                                        className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                                        data-testid={`button-remove-variant-${variant.id}`}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>

                        {/* Bulk actions */}
                        {selectedVariants.length > 0 && (
                          <div className="flex flex-wrap gap-2 text-xs">
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">{t('bulkUpdate')}:</span>
                              <Input
                                type="number"
                                placeholder={t('qty')}
                                className="h-7 w-16 text-xs"
                                onChange={(e) => {
                                  const value = parseInt(e.target.value);
                                  if (value > 0) {
                                    bulkUpdateVariants('quantity', value);
                                  }
                                }}
                              />
                              <Input
                                type="number"
                                placeholder={t('price')}
                                className="h-7 w-16 text-xs"
                                step="0.01"
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value);
                                  if (value >= 0) {
                                    bulkUpdateVariants('unitPrice', value);
                                  }
                                }}
                              />
                              <Input
                                type="number"
                                placeholder={t('weight')}
                                className="h-7 w-16 text-xs"
                                step="0.01"
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value);
                                  if (value >= 0) {
                                    bulkUpdateVariants('weight', value);
                                  }
                                }}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={removeSelectedVariants}
                                className="h-7 px-2 text-xs"
                              >
                                {t('removeSelected')}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Single item fields */}
              {!showVariants && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quantity">{t('quantity')} *</Label>
                      <Input 
                        id="quantity" 
                        name="quantity" 
                        type="number" 
                        min="1" 
                        defaultValue="1"
                        required 
                        data-testid="input-item-quantity"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unitPrice">{t('unitPrice')} ($)</Label>
                      <Input 
                        id="unitPrice" 
                        name="unitPrice" 
                        type="number" 
                        step="0.01" 
                        data-testid="input-item-price"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="weight">{t('weight')} (kg)</Label>
                      <Input 
                        id="weight" 
                        name="weight" 
                        type="number" 
                        step="0.001" 
                        data-testid="input-item-weight"
                        placeholder="0.000"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dimensions">{t('dimensionsLWH')}</Label>
                    <Input 
                      id="dimensions" 
                      name="dimensions" 
                      data-testid="input-item-dimensions"
                      placeholder={t('dimensionsPlaceholder')}
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">{t('notes')}</Label>
                <Textarea 
                  id="notes" 
                  name="notes" 
                  data-testid="textarea-item-notes"
                  placeholder={t('additionalItemNotes')}
                  value={currentItem.notes}
                  onChange={(e) => setCurrentItem(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                  setIsAddItemModalOpen(false);
                  resetVariants();
                  setCurrentItem({
                    name: "",
                    sku: "",
                    category: "",
                    barcode: "",
                    quantity: 1,
                    unitPrice: 0,
                    weight: 0,
                    dimensions: "",
                    notes: ""
                  });
                }}>
                  {t('cancel')}
                </Button>
                <Button 
                  type="submit" 
                  disabled={addItemMutation.isPending || (showVariants && variants.length === 0)} 
                  data-testid="button-submit-item"
                >
                  {addItemMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('adding')}
                    </>
                  ) : (
                    t('addItem')
                  )}
                </Button>
              </DialogFooter>
            </form>

            {/* Add Variant Dialog */}
            <Dialog open={variantDialogOpen} onOpenChange={setVariantDialogOpen}>
              <DialogContent className="w-[95vw] max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>{t('addVariant')}</DialogTitle>
                  <DialogDescription>
                    {t('addNewVariantForItem')}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="variantName">{t('variantName')} *</Label>
                    <Input
                      id="variantName"
                      placeholder={t('variantNamePlaceholder')}
                      value={newVariant.name}
                      onChange={(e) => setNewVariant(prev => ({ ...prev, name: e.target.value }))}
                      data-testid="input-variant-name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="variantSku">{t('sku')}</Label>
                      <Input
                        id="variantSku"
                        placeholder={t('optional')}
                        value={newVariant.sku}
                        onChange={(e) => setNewVariant(prev => ({ ...prev, sku: e.target.value }))}
                        data-testid="input-variant-sku"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="variantQuantity">{t('quantity')}</Label>
                      <Input
                        id="variantQuantity"
                        type="number"
                        min="1"
                        value={newVariant.quantity}
                        onChange={(e) => setNewVariant(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                        data-testid="input-variant-quantity"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="variantPrice">{t('unitPrice')}</Label>
                      <Input
                        id="variantPrice"
                        type="number"
                        step="0.01"
                        min="0"
                        value={newVariant.unitPrice}
                        onChange={(e) => setNewVariant(prev => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))}
                        data-testid="input-variant-price"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="variantWeight">{t('weight')} (kg)</Label>
                      <Input
                        id="variantWeight"
                        type="number"
                        step="0.001"
                        min="0"
                        value={newVariant.weight}
                        onChange={(e) => setNewVariant(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
                        data-testid="input-variant-weight"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="variantDimensions">{t('dimensionsLWH')}</Label>
                    <Input
                      id="variantDimensions"
                      placeholder={t('dimensionsPlaceholder')}
                      value={newVariant.dimensions}
                      onChange={(e) => setNewVariant(prev => ({ ...prev, dimensions: e.target.value }))}
                      data-testid="input-variant-dimensions"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setVariantDialogOpen(false)}>
                    {t('cancel')}
                  </Button>
                  <Button onClick={addVariant} data-testid="button-confirm-variant">
                    {t('addVariant')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Add Series Dialog */}
            <Dialog open={seriesDialogOpen} onOpenChange={setSeriesDialogOpen}>
              <DialogContent className="w-[95vw] max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>{t('addVariantSeries')}</DialogTitle>
                  <DialogDescription>
                    {t('addMultipleVariantsAtOnce')}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="seriesInput">{t('variantNames')} *</Label>
                    <Textarea
                      id="seriesInput"
                      placeholder={t('variantSeriesPlaceholder')}
                      value={seriesInput}
                      onChange={(e) => setSeriesInput(e.target.value)}
                      className="min-h-24"
                      data-testid="textarea-series-input"
                    />
                    <p className="text-xs text-muted-foreground">{t('oneVariantPerLine')}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="seriesQuantity">{t('quantityEach')}</Label>
                      <Input
                        id="seriesQuantity"
                        type="number"
                        min="1"
                        value={seriesQuantity}
                        onChange={(e) => setSeriesQuantity(parseInt(e.target.value) || 1)}
                        data-testid="input-series-quantity"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="seriesPrice">{t('unitPriceEach')}</Label>
                      <Input
                        id="seriesPrice"
                        type="number"
                        step="0.01"
                        min="0"
                        value={seriesUnitPrice}
                        onChange={(e) => setSeriesUnitPrice(parseFloat(e.target.value) || 0)}
                        data-testid="input-series-price"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="seriesWeight">{t('weightEach')}</Label>
                      <Input
                        id="seriesWeight"
                        type="number"
                        step="0.001"
                        min="0"
                        value={seriesWeight}
                        onChange={(e) => setSeriesWeight(parseFloat(e.target.value) || 0)}
                        data-testid="input-series-weight"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setSeriesDialogOpen(false)}>
                    {t('cancel')}
                  </Button>
                  <Button onClick={addVariantSeries} data-testid="button-confirm-series">
                    {t('addSeries')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('deletePurchase')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('confirmDeletePurchase', { supplier: purchaseToDelete?.supplier })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setDeleteDialogOpen(false);
                setPurchaseToDelete(null);
              }}>
                {t('cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deletePurchaseMutation.isPending}
                data-testid="confirm-delete-purchase"
              >
                {deletePurchaseMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('deleting')}
                  </>
                ) : (
                  t('deletePurchase')
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
