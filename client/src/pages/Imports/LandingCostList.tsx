import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Calculator, 
  Package, 
  Search, 
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Calendar,
  Truck,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Box
} from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/currencyUtils";

interface Shipment {
  id: number;
  consolidationId: number | null;
  carrier: string;
  trackingNumber: string;
  shipmentName?: string;
  shipmentType?: string;
  origin: string;
  destination: string;
  status: string;
  shippingCost: string;
  shippingCostCurrency?: string;
  estimatedDelivery: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: any[];
  itemCount: number;
  totalWeight?: number;
  totalUnits?: number;
}

interface LandingCostSummary {
  status: 'pending' | 'calculated' | 'approved';
  totalCost: number;
  baseCurrency: string;
  lastCalculated?: string;
  itemCount?: number;
}

export default function LandingCostList() {
  const { t } = useTranslation('imports');
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [expandedShipments, setExpandedShipments] = useState<number[]>([]);
  
  // Helper to ensure ID is always a number (defensive type coercion)
  const ensureNumber = (id: number | string): number => {
    return typeof id === 'string' ? parseInt(id, 10) : id;
  };

  // Fetch all shipments
  const { data: shipments = [], isLoading } = useQuery<Shipment[]>({
    queryKey: ['/api/imports/shipments']
  });

  // Initialize expandedShipments with all shipment IDs by default
  useEffect(() => {
    if (shipments.length > 0 && expandedShipments.length === 0) {
      const allShipmentIds = shipments.map(s => ensureNumber(s.id));
      setExpandedShipments(allShipmentIds);
    }
  }, [shipments]);

  // Fetch landing cost summary for each shipment using useQueries (hook-safe)
  const landingCostQueries = useQueries({
    queries: shipments.map(shipment => ({
      queryKey: [`/api/imports/shipments/${shipment.id}/landing-cost-summary`],
      enabled: !!shipment.id
    }))
  });

  // Check if any landing cost queries are still loading
  const isLoadingCosts = landingCostQueries.some(q => q.isLoading);

  // Combine shipments with their landing cost data
  const shipmentsWithCosts = useMemo(() => {
    return shipments.map((shipment, index) => ({
      ...shipment,
      landingCost: landingCostQueries[index]?.data
    }));
  }, [shipments, landingCostQueries]);

  // Filter and search shipments
  const filteredShipments = shipmentsWithCosts.filter(shipment => {
    const matchesSearch = !searchQuery || 
      shipment.shipmentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.trackingNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.carrier?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'costed' && shipment.landingCost?.status === 'calculated') ||
      (filterStatus === 'pending' && shipment.landingCost?.status === 'pending') ||
      (filterStatus === 'not-costed' && !shipment.landingCost);

    return matchesSearch && matchesStatus;
  });

  const getCostStatusBadge = (landingCost?: LandingCostSummary) => {
    if (!landingCost) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {t('noCosts')}
        </Badge>
      );
    }

    if (landingCost.status === 'calculated' || landingCost.status === 'approved') {
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          {t('costed')}
        </Badge>
      );
    }

    return (
      <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        {t('pending')}
      </Badge>
    );
  };

  const getShippingCostDisplay = (shipment: Shipment) => {
    const cost = parseFloat(shipment.shippingCost);
    if (!cost || cost === 0) return '—';
    return formatCurrency(cost, shipment.shippingCostCurrency || 'USD');
  };

  if (isLoading || isLoadingCosts) {
    return (
      <div className="container mx-auto p-3 md:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="h-20 bg-gray-100 rounded"></div>
            <div className="h-20 bg-gray-100 rounded"></div>
            <div className="h-20 bg-gray-100 rounded"></div>
            <div className="h-20 bg-gray-100 rounded"></div>
          </div>
          <div className="h-64 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-3 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Calculator className="h-7 w-7 text-cyan-600" />
              {t('landingCosts')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t('landingCostsDescription')}
            </p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Package className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{t('totalShipments')}</p>
              </div>
              <p className="text-2xl font-bold">{shipments.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <p className="text-xs text-muted-foreground">{t('costed')}</p>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {shipmentsWithCosts.filter(s => s.landingCost?.status === 'calculated').length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <p className="text-xs text-muted-foreground">{t('pending')}</p>
              </div>
              <p className="text-2xl font-bold text-yellow-600">
                {shipmentsWithCosts.filter(s => s.landingCost?.status === 'pending').length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="h-4 w-4 text-gray-600" />
                <p className="text-xs text-muted-foreground">{t('noCosts')}</p>
              </div>
              <p className="text-2xl font-bold text-gray-600">
                {shipmentsWithCosts.filter(s => !s.landingCost).length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('searchShipmentPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-shipments"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filterStatus === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('all')}
              data-testid="filter-all"
            >
              {t('all')}
            </Button>
            <Button
              variant={filterStatus === 'costed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('costed')}
              data-testid="filter-costed"
            >
              {t('costed')}
            </Button>
            <Button
              variant={filterStatus === 'pending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('pending')}
              data-testid="filter-pending"
            >
              {t('pending')}
            </Button>
            <Button
              variant={filterStatus === 'not-costed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('not-costed')}
              data-testid="filter-not-costed"
            >
              {t('noCosts')}
            </Button>
          </div>
        </div>
      </div>

      {/* Shipments List */}
      {filteredShipments.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('noShipmentsFound')}</h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery || filterStatus !== 'all' 
                ? t('tryAdjustingFilters') 
                : t('createFirstShipment')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredShipments.map(shipment => (
            <Card key={shipment.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row items-start gap-4">
                  {/* Left Section */}
                  <div className="flex-1 min-w-0 w-full">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="bg-cyan-100 dark:bg-cyan-900 p-2 rounded-lg shrink-0">
                        <Package className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg truncate">
                            {shipment.shipmentName || `Shipment #${shipment.id}`}
                          </h3>
                          {getCostStatusBadge(shipment.landingCost)}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Truck className="h-3 w-3" />
                            {shipment.carrier}
                          </span>
                          <span className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {shipment.itemCount} {t('items')}
                          </span>
                          {shipment.createdAt && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(shipment.createdAt), 'MMM dd, yyyy')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Cost Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-muted/30 dark:bg-muted/20 rounded-lg p-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">{t('shippingCost')}</p>
                        <p className="font-semibold">{getShippingCostDisplay(shipment)}</p>
                      </div>
                      {shipment.landingCost && (
                        <>
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">{t('totalLandedCost')}</p>
                            <p className="font-semibold text-green-600 dark:text-green-400">
                              {formatCurrency(shipment.landingCost.totalCost || 0, shipment.landingCost.baseCurrency || 'EUR')}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">{t('itemsAllocated')}</p>
                            <p className="font-semibold">{shipment.landingCost.itemCount || 0}</p>
                          </div>
                          {shipment.landingCost.lastCalculated && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-0.5">{t('lastCalculated')}</p>
                              <p className="text-sm">{format(new Date(shipment.landingCost.lastCalculated), 'MMM dd, HH:mm')}</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Items List - Collapsible */}
                    {shipment.items && shipment.items.length > 0 && (
                      <Collapsible
                        open={expandedShipments.includes(ensureNumber(shipment.id))}
                        onOpenChange={(isOpen) => {
                          const shipmentIdNum = ensureNumber(shipment.id);
                          setExpandedShipments(prev => {
                            if (isOpen) {
                              // Expand: add the ID only if not already present
                              return prev.includes(shipmentIdNum) ? prev : [...prev, shipmentIdNum];
                            } else {
                              // Collapse: remove the ID
                              return prev.filter(id => id !== shipmentIdNum);
                            }
                          });
                        }}
                        className="mt-3"
                      >
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-between hover:bg-muted/50"
                            data-testid={`button-toggle-items-${shipment.id}`}
                          >
                            <span className="flex items-center gap-2">
                              <Box className="h-4 w-4" />
                              <span className="font-medium">
                                {expandedShipments.includes(shipment.id) ? t('hide') : t('show')} {t('items')} ({shipment.items.length})
                              </span>
                            </span>
                            {expandedShipments.includes(shipment.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2">
                          <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-950">
                            {shipment.items.map((item: any, idx: number) => (
                              <div
                                key={idx}
                                className="flex flex-col gap-1 text-sm p-2 bg-muted/30 rounded hover:bg-muted/50 transition-colors"
                                data-testid={`item-${shipment.id}-${idx}`}
                              >
                                <div className="flex justify-between items-start gap-2">
                                  <span className="font-medium flex-1">
                                    {item.productName || item.name || `Item ${idx + 1}`}
                                  </span>
                                  <span className="font-semibold shrink-0">
                                    ×{item.quantity || 1}
                                  </span>
                                </div>
                                {(item.sku || item.category) && (
                                  <div className="flex gap-3 text-xs text-muted-foreground">
                                    {item.sku && (
                                      <span>SKU: {item.sku}</span>
                                    )}
                                    {item.category && (
                                      <span>• {item.category}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>

                  {/* Right Section - Actions */}
                  <div className="flex flex-col gap-2 w-full md:w-auto md:shrink-0">
                    <Link href={`/imports/landing-costs/${shipment.id}`}>
                      <Button size="sm" className="w-full" data-testid={`button-view-costs-${shipment.id}`}>
                        <Calculator className="h-4 w-4 mr-2" />
                        {t('viewCosts')}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
