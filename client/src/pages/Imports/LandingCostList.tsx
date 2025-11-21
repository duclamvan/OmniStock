import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  ArrowRight
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
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Fetch all shipments
  const { data: shipments = [], isLoading } = useQuery<Shipment[]>({
    queryKey: ['/api/imports/shipments']
  });

  // Fetch landing cost summary for each shipment
  const shipmentsWithCosts = shipments.map(shipment => {
    const { data: summary } = useQuery<LandingCostSummary>({
      queryKey: [`/api/imports/shipments/${shipment.id}/landing-cost-summary`],
      enabled: !!shipment.id
    });
    return { ...shipment, landingCost: summary };
  });

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
          No Costs
        </Badge>
      );
    }

    if (landingCost.status === 'calculated' || landingCost.status === 'approved') {
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Costed ✓
        </Badge>
      );
    }

    return (
      <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        Pending ⚠️
      </Badge>
    );
  };

  const getShippingCostDisplay = (shipment: Shipment) => {
    const cost = parseFloat(shipment.shippingCost);
    if (!cost || cost === 0) return '—';
    return formatCurrency(cost, shipment.shippingCostCurrency || 'USD');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-3 md:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
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
              Landing Costs
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Calculate and track landed costs for international shipments
            </p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Package className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Total Shipments</p>
              </div>
              <p className="text-2xl font-bold">{shipments.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <p className="text-xs text-muted-foreground">Costed</p>
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
                <p className="text-xs text-muted-foreground">Pending</p>
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
                <p className="text-xs text-muted-foreground">No Costs</p>
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
              placeholder="Search by shipment name, tracking, or carrier..."
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
              All
            </Button>
            <Button
              variant={filterStatus === 'costed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('costed')}
              data-testid="filter-costed"
            >
              Costed
            </Button>
            <Button
              variant={filterStatus === 'pending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('pending')}
              data-testid="filter-pending"
            >
              Pending
            </Button>
            <Button
              variant={filterStatus === 'not-costed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('not-costed')}
              data-testid="filter-not-costed"
            >
              No Costs
            </Button>
          </div>
        </div>
      </div>

      {/* Shipments List */}
      {filteredShipments.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Shipments Found</h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery || filterStatus !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'Create your first shipment to start tracking landing costs'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredShipments.map(shipment => (
            <Card key={shipment.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  {/* Left Section */}
                  <div className="flex-1 min-w-0">
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
                            {shipment.itemCount} items
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
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-muted/30 rounded-lg p-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Shipping Cost</p>
                        <p className="font-semibold">{getShippingCostDisplay(shipment)}</p>
                      </div>
                      {shipment.landingCost && (
                        <>
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Total Landed Cost</p>
                            <p className="font-semibold text-green-600">
                              {formatCurrency(shipment.landingCost.totalCost || 0, shipment.landingCost.baseCurrency || 'EUR')}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Items Allocated</p>
                            <p className="font-semibold">{shipment.landingCost.itemCount || 0}</p>
                          </div>
                          {shipment.landingCost.lastCalculated && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-0.5">Last Calculated</p>
                              <p className="text-sm">{format(new Date(shipment.landingCost.lastCalculated), 'MMM dd, HH:mm')}</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right Section - Actions */}
                  <div className="flex flex-col gap-2 shrink-0">
                    <Link href={`/imports/landing-costs/${shipment.id}`}>
                      <Button size="sm" className="w-full" data-testid={`button-view-costs-${shipment.id}`}>
                        <Calculator className="h-4 w-4 mr-2" />
                        View Costs
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
