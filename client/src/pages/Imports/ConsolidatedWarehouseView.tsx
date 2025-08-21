import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/currencyUtils";
import { format, differenceInDays } from "date-fns";
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
  Info,
  Plus,
  Edit,
  ChevronRight,
  TrendingDown,
  AlertTriangle,
  Timer,
  Settings,
  RefreshCw,
  Database
} from "lucide-react";

interface WarehouseData {
  id: string;
  name: string;
  location: string;
  flag: string;
  currency: string;
  timezone: string;
  totalItems: number;
  totalValue: number;
  pendingOrders: number;
  inTransit: number;
  received: number;
  avgLeadTime: number;
  topSuppliers: string[];
  recentActivity: Array<{
    date: string;
    type: string;
    description: string;
    value?: number;
  }>;
  inventory: Array<{
    id: string;
    productName: string;
    sku: string;
    quantity: number;
    unitCost: number;
    lastReceived: string;
    status: string;
  }>;
  performance: {
    onTimeDelivery: number;
    accuracyRate: number;
    utilizationRate: number;
    costEfficiency: number;
  };
}

export default function ConsolidatedWarehouseView() {
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("usa");
  const [searchQuery, setSearchQuery] = useState("");
  const [timeRange, setTimeRange] = useState("30");
  const [viewMode, setViewMode] = useState<"overview" | "inventory" | "analytics">("overview");

  // Mock warehouse data
  const warehouseData: Record<string, WarehouseData> = {
    usa: {
      id: "wh-usa-001",
      name: "USA Distribution Center",
      location: "Los Angeles, California",
      flag: "🇺🇸",
      currency: "USD",
      timezone: "PST",
      totalItems: 5420,
      totalValue: 285000,
      pendingOrders: 12,
      inTransit: 8,
      received: 45,
      avgLeadTime: 5,
      topSuppliers: ["TechCorp USA", "Global Supplies Inc", "Pacific Trading"],
      recentActivity: [
        { date: new Date().toISOString(), type: "received", description: "Container #LA2025-089 received", value: 15000 },
        { date: new Date(Date.now() - 86400000).toISOString(), type: "shipped", description: "25 orders dispatched to retail", value: 8500 },
        { date: new Date(Date.now() - 172800000).toISOString(), type: "inventory", description: "Stock audit completed" }
      ],
      inventory: [
        { id: "1", productName: "Electronic Components Kit", sku: "ECK-001", quantity: 500, unitCost: 45, lastReceived: new Date(Date.now() - 432000000).toISOString(), status: "in_stock" },
        { id: "2", productName: "Smart Home Device", sku: "SHD-102", quantity: 250, unitCost: 89, lastReceived: new Date(Date.now() - 864000000).toISOString(), status: "in_stock" },
        { id: "3", productName: "Industrial Sensors", sku: "IS-205", quantity: 150, unitCost: 125, lastReceived: new Date(Date.now() - 259200000).toISOString(), status: "low_stock" }
      ],
      performance: {
        onTimeDelivery: 94,
        accuracyRate: 98,
        utilizationRate: 82,
        costEfficiency: 87
      }
    },
    china: {
      id: "wh-cn-001",
      name: "China Manufacturing Hub",
      location: "Shenzhen, Guangdong",
      flag: "🇨🇳",
      currency: "CNY",
      timezone: "CST",
      totalItems: 12500,
      totalValue: 1850000,
      pendingOrders: 28,
      inTransit: 15,
      received: 92,
      avgLeadTime: 12,
      topSuppliers: ["Shenzhen Electronics", "Guangdong Manufacturing", "Beijing Tech Solutions"],
      recentActivity: [
        { date: new Date().toISOString(), type: "production", description: "Batch #SZ2025-445 completed", value: 45000 },
        { date: new Date(Date.now() - 86400000).toISOString(), type: "quality", description: "QC inspection passed for order #CN-8892" },
        { date: new Date(Date.now() - 172800000).toISOString(), type: "shipped", description: "Container to USA warehouse", value: 125000 }
      ],
      inventory: [
        { id: "4", productName: "LCD Display Panels", sku: "LCD-2K25", quantity: 2000, unitCost: 35, lastReceived: new Date(Date.now() - 172800000).toISOString(), status: "in_stock" },
        { id: "5", productName: "Battery Packs", sku: "BAT-LI-500", quantity: 5000, unitCost: 12, lastReceived: new Date(Date.now() - 432000000).toISOString(), status: "in_stock" },
        { id: "6", productName: "Circuit Boards", sku: "PCB-X100", quantity: 3500, unitCost: 8, lastReceived: new Date(Date.now() - 86400000).toISOString(), status: "in_stock" }
      ],
      performance: {
        onTimeDelivery: 89,
        accuracyRate: 96,
        utilizationRate: 91,
        costEfficiency: 93
      }
    },
    vietnam: {
      id: "wh-vn-001",
      name: "Vietnam Assembly Center",
      location: "Ho Chi Minh City",
      flag: "🇻🇳",
      currency: "VND",
      timezone: "ICT",
      totalItems: 8200,
      totalValue: 420000,
      pendingOrders: 18,
      inTransit: 10,
      received: 65,
      avgLeadTime: 8,
      topSuppliers: ["Saigon Tech", "Vietnam Manufacturing Co", "Mekong Industries"],
      recentActivity: [
        { date: new Date().toISOString(), type: "assembly", description: "Product line A completed 500 units", value: 25000 },
        { date: new Date(Date.now() - 86400000).toISOString(), type: "received", description: "Raw materials from China", value: 35000 },
        { date: new Date(Date.now() - 259200000).toISOString(), type: "shipped", description: "Export to European market", value: 85000 }
      ],
      inventory: [
        { id: "7", productName: "Textile Materials", sku: "TEX-VN-100", quantity: 1500, unitCost: 15, lastReceived: new Date(Date.now() - 604800000).toISOString(), status: "in_stock" },
        { id: "8", productName: "Assembled Electronics", sku: "AE-HCMC-50", quantity: 800, unitCost: 65, lastReceived: new Date(Date.now() - 345600000).toISOString(), status: "in_stock" },
        { id: "9", productName: "Packaging Materials", sku: "PKG-200", quantity: 5000, unitCost: 2, lastReceived: new Date(Date.now() - 172800000).toISOString(), status: "in_stock" }
      ],
      performance: {
        onTimeDelivery: 92,
        accuracyRate: 95,
        utilizationRate: 78,
        costEfficiency: 91
      }
    }
  };

  const currentWarehouse = warehouseData[selectedWarehouse];

  // Filter inventory based on search
  const filteredInventory = currentWarehouse.inventory.filter(item =>
    item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate trend (mock data)
  const calculateTrend = (current: number, previous: number = 0) => {
    const change = ((current - previous) / (previous || 1)) * 100;
    return {
      value: Math.abs(change).toFixed(1),
      isPositive: change >= 0
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_stock': return 'bg-green-100 text-green-800';
      case 'low_stock': return 'bg-yellow-100 text-yellow-800';
      case 'out_of_stock': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'received': return <Archive className="h-4 w-4 text-green-600" />;
      case 'shipped': return <Truck className="h-4 w-4 text-blue-600" />;
      case 'production': return <Settings className="h-4 w-4 text-purple-600" />;
      case 'assembly': return <Box className="h-4 w-4 text-orange-600" />;
      case 'quality': return <CheckCircle className="h-4 w-4 text-teal-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b md:relative md:border-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between p-4 md:p-0 gap-4">
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
              <h1 className="text-lg md:text-2xl font-semibold">Warehouse Consolidated View</h1>
              <p className="text-xs md:text-sm text-muted-foreground">
                Manage inventory across global warehouses
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Refresh</span>
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Export</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Warehouse Selector */}
      <div className="px-4 md:px-0">
        <div className="grid grid-cols-3 gap-2 md:gap-4">
          {Object.entries(warehouseData).map(([key, warehouse]) => (
            <Card 
              key={key}
              className={`cursor-pointer transition-all ${
                selectedWarehouse === key 
                  ? 'ring-2 ring-primary shadow-lg' 
                  : 'hover:shadow-md'
              }`}
              onClick={() => setSelectedWarehouse(key)}
            >
              <CardContent className="p-4 md:p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{warehouse.flag}</span>
                    <div>
                      <p className="font-semibold text-sm md:text-base">{warehouse.name.split(' ')[0]}</p>
                      <p className="text-xs text-muted-foreground">{warehouse.location}</p>
                    </div>
                  </div>
                  {selectedWarehouse === key && (
                    <Badge variant="default" className="text-xs">Active</Badge>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs md:text-sm">
                    <span className="text-muted-foreground">Total Items</span>
                    <span className="font-medium">{warehouse.totalItems.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs md:text-sm">
                    <span className="text-muted-foreground">Value</span>
                    <span className="font-medium">
                      {formatCurrency(warehouse.totalValue, warehouse.currency)}
                    </span>
                  </div>
                  <Progress 
                    value={warehouse.performance.utilizationRate} 
                    className="h-1.5"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    {warehouse.performance.utilizationRate}% Utilization
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Warehouse Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 px-4 md:px-0">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pending Orders</p>
                <p className="text-xl md:text-2xl font-bold">{currentWarehouse.pendingOrders}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600">+12%</span>
                </div>
              </div>
              <Clock className="h-8 w-8 text-orange-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">In Transit</p>
                <p className="text-xl md:text-2xl font-bold">{currentWarehouse.inTransit}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingDown className="h-3 w-3 text-red-600" />
                  <span className="text-xs text-red-600">-5%</span>
                </div>
              </div>
              <Truck className="h-8 w-8 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Received</p>
                <p className="text-xl md:text-2xl font-bold">{currentWarehouse.received}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600">+25%</span>
                </div>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Avg Lead Time</p>
                <p className="text-xl md:text-2xl font-bold">{currentWarehouse.avgLeadTime}d</p>
                <div className="flex items-center gap-1 mt-1">
                  <Activity className="h-3 w-3 text-blue-600" />
                  <span className="text-xs text-muted-foreground">days</span>
                </div>
              </div>
              <Timer className="h-8 w-8 text-purple-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="px-4 md:px-0">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Activity</CardTitle>
                <CardDescription className="text-xs">
                  Latest warehouse operations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {currentWarehouse.recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3">
                    {getActivityIcon(activity.type)}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(activity.date), 'MMM d, h:mm a')}
                        </span>
                        {activity.value && (
                          <>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs font-medium">
                              {formatCurrency(activity.value, currentWarehouse.currency)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Performance Metrics</CardTitle>
                <CardDescription className="text-xs">
                  Key warehouse indicators
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>On-Time Delivery</span>
                    <span className="font-medium">{currentWarehouse.performance.onTimeDelivery}%</span>
                  </div>
                  <Progress value={currentWarehouse.performance.onTimeDelivery} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Accuracy Rate</span>
                    <span className="font-medium">{currentWarehouse.performance.accuracyRate}%</span>
                  </div>
                  <Progress value={currentWarehouse.performance.accuracyRate} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Utilization Rate</span>
                    <span className="font-medium">{currentWarehouse.performance.utilizationRate}%</span>
                  </div>
                  <Progress value={currentWarehouse.performance.utilizationRate} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Cost Efficiency</span>
                    <span className="font-medium">{currentWarehouse.performance.costEfficiency}%</span>
                  </div>
                  <Progress value={currentWarehouse.performance.costEfficiency} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Suppliers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Suppliers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {currentWarehouse.topSuppliers.map((supplier, index) => (
                  <Badge key={index} variant="secondary">
                    <Building2 className="h-3 w-3 mr-1" />
                    {supplier}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          {/* Search Bar */}
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search inventory..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardContent>
          </Card>

          {/* Inventory Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Current Inventory</CardTitle>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Mobile View */}
              <div className="md:hidden space-y-3">
                {filteredInventory.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm">{item.productName}</p>
                            <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                          </div>
                          <Badge className={getStatusColor(item.status)}>
                            {item.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Quantity:</span>
                            <p className="font-medium">{item.quantity}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Unit Cost:</span>
                            <p className="font-medium">
                              {formatCurrency(item.unitCost, currentWarehouse.currency)}
                            </p>
                          </div>
                        </div>
                        <div className="text-xs">
                          <span className="text-muted-foreground">Last Received:</span>
                          <p>{format(new Date(item.lastReceived), 'MMM d, yyyy')}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Total Value</TableHead>
                      <TableHead>Last Received</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInventory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell>{item.sku}</TableCell>
                        <TableCell className="text-right">{item.quantity.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.unitCost, currentWarehouse.currency)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.quantity * item.unitCost, currentWarehouse.currency)}
                        </TableCell>
                        <TableCell>{format(new Date(item.lastReceived), 'MMM d, yyyy')}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(item.status)}>
                            {item.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Inventory Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Inventory Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg">
                  <div className="text-center">
                    <PieChart className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Distribution chart by category
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cost Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cost Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Monthly cost breakdown
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Trend Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Inventory Trend</CardTitle>
              <CardDescription className="text-xs">
                Stock levels over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg">
                <div className="text-center">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Inventory movement trends
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