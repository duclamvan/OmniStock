import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Package2, Clock, ArrowLeft, Search, ChevronDown, ChevronUp, Loader2, ArchiveRestore, CreditCard, Truck } from "lucide-react";
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
  status: string;
  createdAt: string;
  updatedAt: string;
  items: PurchaseItem[];
  itemCount: number;
  location?: string;
}

interface PurchaseItem {
  id: number;
  purchaseId: number;
  name: string;
  sku: string | null;
  quantity: number;
  unitPrice: string;
  weight: string;
  notes: string | null;
}

const getLocationFlag = (location: string) => {
  switch (location) {
    case 'China': return '🇨🇳';
    case 'Vietnam': return '🇻🇳';
    case 'Europe': return '🇪🇺';
    case 'USA': return '🇺🇸';
    default: return '📦';
  }
};

export default function ArchivedPurchaseOrders() {
  const { t } = useTranslation('imports');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedPurchases, setExpandedPurchases] = useState<Set<number>>(new Set());

  const { data: purchases = [], isLoading } = useQuery<Purchase[]>({
    queryKey: ['/api/imports/purchases/archived'],
  });

  const unarchiveMutation = useMutation({
    mutationFn: async (purchaseId: number) => {
      const response = await apiRequest('PATCH', `/api/imports/purchases/${purchaseId}/unarchive`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/purchases/archived'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/purchases'] });
      toast({ title: t('purchaseUnarchived'), description: t('purchaseUnarchivedSuccess') });
    },
    onError: () => {
      toast({ 
        title: t('error'), 
        description: t('unarchiveFailed'), 
        variant: "destructive" 
      });
    }
  });

  const filteredPurchases = purchases.filter(purchase => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      purchase.supplier.toLowerCase().includes(term) ||
      purchase.trackingNumber?.toLowerCase().includes(term) ||
      purchase.notes?.toLowerCase().includes(term)
    );
  });

  const toggleExpanded = (purchaseId: number) => {
    const newExpanded = new Set(expandedPurchases);
    if (newExpanded.has(purchaseId)) {
      newExpanded.delete(purchaseId);
    } else {
      newExpanded.add(purchaseId);
    }
    setExpandedPurchases(newExpanded);
  };

  const toggleAllExpanded = () => {
    if (expandedPurchases.size === filteredPurchases.length) {
      setExpandedPurchases(new Set());
    } else {
      setExpandedPurchases(new Set(filteredPurchases.map(p => p.id)));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{t('archivedPurchaseOrders')}</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              {purchases.length} {t('items')}
            </p>
          </div>
          <Link href="/purchase-orders">
            <Button variant="outline" data-testid="button-back-to-purchases">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('backToPurchaseOrders')}
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <CardTitle className="text-lg md:text-xl">{t('archivedPurchaseOrders')}</CardTitle>
                <CardDescription className="text-sm">
                  {t('noArchivedPurchasesDesc')}
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('searchOrders')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-full sm:w-[220px]"
                    data-testid="input-search-archived"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleAllExpanded}
                  data-testid="button-toggle-all-archived"
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
                <h3 className="text-lg font-semibold mb-2">{t('noArchivedPurchases')}</h3>
                <p className="text-muted-foreground mb-4">{t('noArchivedPurchasesDesc')}</p>
                <Link href="/purchase-orders">
                  <Button variant="outline" data-testid="button-go-to-purchases">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t('backToPurchaseOrders')}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPurchases.map((purchase) => {
                  const isExpanded = expandedPurchases.has(purchase.id);
                  
                  return (
                    <Card key={purchase.id} className="border hover:shadow-md transition-shadow bg-muted/20">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 mt-0.5 shrink-0"
                            onClick={() => toggleExpanded(purchase.id)}
                            data-testid={`button-toggle-archived-${purchase.id}`}
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold text-base" data-testid={`text-supplier-archived-${purchase.id}`}>
                                {getLocationFlag(purchase.location || '')} {purchase.supplier}
                              </h3>
                              <Badge variant="outline" className="text-muted-foreground">
                                {t('archived')}
                              </Badge>
                              {purchase.trackingNumber && (
                                <span className="text-xs font-mono text-muted-foreground ml-auto hidden md:inline">
                                  {purchase.trackingNumber}
                                </span>
                              )}
                            </div>
                          </div>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-3"
                                onClick={() => unarchiveMutation.mutate(purchase.id)}
                                disabled={unarchiveMutation.isPending}
                                data-testid={`button-unarchive-${purchase.id}`}
                              >
                                {unarchiveMutation.isPending ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                                ) : (
                                  <ArchiveRestore className="h-3.5 w-3.5 mr-1" />
                                )}
                                {t('unarchive')}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('unarchive')}</TooltipContent>
                          </Tooltip>
                        </div>

                        <div className="pl-10 mt-2 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm">
                          <div className="flex items-center gap-1.5">
                            <Package2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-muted-foreground">{purchase.itemCount} items</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-muted-foreground">
                              {format(new Date(purchase.createdAt), 'MMM dd, yyyy')}
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
                        </div>

                        {isExpanded && purchase.items.length > 0 && (
                          <div className="pl-10 mt-3">
                            <div className="rounded bg-card/50 overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b">
                                    <th className="text-left p-2 font-medium">{t('item')}</th>
                                    <th className="text-left p-2 font-medium">{t('sku')}</th>
                                    <th className="text-right p-2 font-medium">{t('qty')}</th>
                                    <th className="text-right p-2 font-medium">{t('unitCost')}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {purchase.items.map((item) => (
                                    <tr key={item.id} className="border-b last:border-0">
                                      <td className="p-2">{item.name}</td>
                                      <td className="p-2 text-muted-foreground">{item.sku || '-'}</td>
                                      <td className="p-2 text-right">{item.quantity}</td>
                                      <td className="p-2 text-right">
                                        {getCurrencySymbol((purchase.purchaseCurrency || 'USD') as Currency)}{item.unitPrice}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {purchase.notes && (
                          <div className="pl-10 mt-2">
                            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded p-2">
                              <p className="text-xs text-amber-800 dark:text-amber-200">
                                <span className="font-medium">{t('note')}:</span> {purchase.notes}
                              </p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
