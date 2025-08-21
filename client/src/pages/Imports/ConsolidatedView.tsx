import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatCurrency } from "@/lib/currencyUtils";
import { format } from "date-fns";
import { 
  Package,
  ArrowLeft,
  Search,
  TrendingUp,
  DollarSign,
  Layers,
  Eye,
  Download,
  BarChart3,
  PieChart,
  Activity,
  Calculator,
  Hash,
  Building2,
  MapPin,
  Truck,
  Clock,
  CheckCircle,
  AlertCircle,
  Globe,
  Ship,
  Plane,
  Filter,
  Calendar,
  Box,
  Archive,
  Users,
  FileText,
  Info
} from "lucide-react";

interface ConsolidatedItem {
  productName: string;
  sku?: string;
  totalQuantity: number;
  totalOrders: number;
  totalValue: number;
  avgUnitCost: number;
  minUnitCost: number;
  maxUnitCost: number;
  suppliers: string[];
  pendingQuantity: number;
  receivedQuantity: number;
  inTransitQuantity: number;
}

export default function ConsolidatedView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewType, setViewType] = useState<"grid" | "list">("grid");

  // Fetch consolidated data
  const { data: consolidatedData, isLoading } = useQuery({
    queryKey: ['/api/import-items/consolidated'],
    queryFn: async () => {
      // This would fetch consolidated import data
      const response = await fetch('/api/import-items/consolidated');
      if (!response.ok) throw new Error('Failed to fetch consolidated data');
      return response.json();
    }
  });

  const items: ConsolidatedItem[] = consolidatedData?.items || [];
  const stats = consolidatedData?.stats || {
    totalProducts: 0,
    totalQuantity: 0,
    totalValue: 0,
    avgLeadTime: 0,
    topSupplier: '',
    topCategory: ''
  };

  // Filter items
  const filteredItems = items.filter((item: ConsolidatedItem) => {
    return item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  // Group by category for analysis
  const byCategory = items.reduce((acc: any, item: ConsolidatedItem) => {
    // Would group by actual category
    const category = 'General'; // Placeholder
    if (!acc[category]) {
      acc[category] = {
        items: 0,
        quantity: 0,
        value: 0
      };
    }
    acc[category].items++;
    acc[category].quantity += item.totalQuantity;
    acc[category].value += item.totalValue;
    return acc;
  }, {});

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b md:relative md:border-0">
        <div className="flex items-center justify-between p-4 md:p-0">
          <div className="flex items-center gap-2 md:gap-4">
            <Link href="/imports">
              <Button variant="ghost" size="icon" className="md:hidden">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm" className="hidden md:flex">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Imports
              </Button>
            </Link>
            <div>
              <h1 className="text-lg md:text-2xl font-semibold">Consolidated View</h1>
              <p className="text-xs md:text-sm text-muted-foreground">
                Aggregated import data across all orders
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Export</span>
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 md:gap-4 px-4 md:px-0">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Products</p>
                <p className="text-lg md:text-xl font-bold">{stats.totalProducts}</p>
              </div>
              <Package className="h-6 w-6 text-muted-foreground opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Quantity</p>
                <p className="text-lg md:text-xl font-bold">{stats.totalQuantity}</p>
              </div>
              <Layers className="h-6 w-6 text-muted-foreground opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Value</p>
                <p className="text-lg md:text-xl font-bold">
                  {formatCurrency(stats.totalValue, 'USD')}
                </p>
              </div>
              <DollarSign className="h-6 w-6 text-muted-foreground opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Avg Lead Time</p>
                <p className="text-lg md:text-xl font-bold">{stats.avgLeadTime}d</p>
              </div>
              <Activity className="h-6 w-6 text-muted-foreground opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Top Supplier</p>
                <p className="text-sm font-medium truncate">{stats.topSupplier || 'N/A'}</p>
              </div>
              <Building2 className="h-6 w-6 text-muted-foreground opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Top Category</p>
                <p className="text-sm font-medium truncate">{stats.topCategory || 'N/A'}</p>
              </div>
              <PieChart className="h-6 w-6 text-muted-foreground opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analysis Tabs */}
      <Tabs defaultValue="products" className="px-4 md:px-0">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          {/* Search and View Toggle */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={viewType === "grid" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewType("grid")}
                  >
                    Grid
                  </Button>
                  <Button
                    variant={viewType === "list" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewType("list")}
                  >
                    List
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Products Grid/List */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No consolidated data available</p>
              </CardContent>
            </Card>
          ) : viewType === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item: ConsolidatedItem, index: number) => (
                <Card key={index}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base line-clamp-1">{item.productName}</CardTitle>
                    {item.sku && (
                      <CardDescription className="text-xs">SKU: {item.sku}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Orders</span>
                        <span className="font-medium">{item.totalOrders}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Quantity</span>
                        <span className="font-medium">{item.totalQuantity}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Value</span>
                        <span className="font-medium">
                          {formatCurrency(item.totalValue, 'USD')}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground">Quantity Status</div>
                      <Progress 
                        value={(item.receivedQuantity / item.totalQuantity) * 100} 
                        className="h-2"
                      />
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Pending</span>
                          <p className="font-medium">{item.pendingQuantity}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Transit</span>
                          <p className="font-medium">{item.inTransitQuantity}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Received</span>
                          <p className="font-medium">{item.receivedQuantity}</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t">
                      <div className="text-xs text-muted-foreground mb-2">Price Analysis</div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Min</span>
                          <p className="font-medium">
                            {formatCurrency(item.minUnitCost, 'USD')}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Avg</span>
                          <p className="font-medium">
                            {formatCurrency(item.avgUnitCost, 'USD')}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Max</span>
                          <p className="font-medium">
                            {formatCurrency(item.maxUnitCost, 'USD')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t">
                      <div className="text-xs text-muted-foreground mb-1">Suppliers</div>
                      <div className="flex flex-wrap gap-1">
                        {item.suppliers.slice(0, 3).map((supplier, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {supplier}
                          </Badge>
                        ))}
                        {item.suppliers.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{item.suppliers.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4">Product</th>
                      <th className="text-right p-4">Orders</th>
                      <th className="text-right p-4">Total Qty</th>
                      <th className="text-right p-4">Received</th>
                      <th className="text-right p-4">Avg Cost</th>
                      <th className="text-right p-4">Total Value</th>
                      <th className="text-left p-4">Suppliers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item: ConsolidatedItem, index: number) => (
                      <tr key={index} className="border-b">
                        <td className="p-4">
                          <div>
                            <p className="font-medium">{item.productName}</p>
                            {item.sku && (
                              <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                            )}
                          </div>
                        </td>
                        <td className="text-right p-4">{item.totalOrders}</td>
                        <td className="text-right p-4">{item.totalQuantity}</td>
                        <td className="text-right p-4">
                          <Badge variant="outline">
                            {item.receivedQuantity}/{item.totalQuantity}
                          </Badge>
                        </td>
                        <td className="text-right p-4">
                          {formatCurrency(item.avgUnitCost, 'USD')}
                        </td>
                        <td className="text-right p-4 font-medium">
                          {formatCurrency(item.totalValue, 'USD')}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-1">
                            {item.suppliers.slice(0, 2).map((supplier, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {supplier}
                              </Badge>
                            ))}
                            {item.suppliers.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{item.suppliers.length - 2}
                              </Badge>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Supplier Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Supplier Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {['Supplier A', 'Supplier B', 'Supplier C'].map((supplier) => (
                  <div key={supplier} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{supplier}</span>
                      <span className="text-muted-foreground">45 orders</span>
                    </div>
                    <Progress value={Math.random() * 100} className="h-2" />
                    <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                      <span>Lead: 7d</span>
                      <span>Quality: 98%</span>
                      <span>Value: $45K</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Category Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Category Distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(byCategory).map(([category, data]: [string, any]) => (
                  <div key={category} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{category}</span>
                      <span className="font-medium">
                        {formatCurrency(data.value, 'USD')}
                      </span>
                    </div>
                    <Progress value={(data.value / stats.totalValue) * 100} className="h-2" />
                    <div className="text-xs text-muted-foreground">
                      {data.items} items • {data.quantity} units
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Import Trends</CardTitle>
              <CardDescription className="text-xs">
                Volume and cost trends over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Trend charts would be displayed here
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}