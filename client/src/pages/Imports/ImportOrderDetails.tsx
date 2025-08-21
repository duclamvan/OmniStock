import { useState, useEffect } from "react";
import { Link, useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/currencyUtils";
import { format } from "date-fns";
import {
  ArrowLeft,
  Package,
  Truck,
  DollarSign,
  Calendar,
  MapPin,
  User,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Edit,
  Download,
  Printer,
  Share2,
  MoreVertical,
  Activity,
  Globe,
  Hash,
  Building2,
  ChevronRight
} from "lucide-react";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  sku?: string;
  unitPrice?: number;
  totalPrice?: number;
}

interface ImportOrderDetails {
  id: string;
  orderNumber: string;
  supplier: string;
  supplierCountry: string;
  destination: string;
  status: string;
  priority: 'high' | 'medium' | 'low';
  totalItems: number;
  totalValue: number;
  currency: string;
  estimatedArrival: string;
  createdDate: string;
  lastUpdated: string;
  assignee?: string;
  tags: string[];
  progress: number;
  documents: number;
  comments: number;
  trackingNumber?: string;
  shippingMethod?: string;
  items: OrderItem[];
  shippingCost?: number;
  customsDuty?: number;
  taxes?: number;
  totalLandedCost?: number;
}

export default function ImportOrderDetails() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");

  // Mock data - in real app, this would come from API
  const mockOrderDetails: ImportOrderDetails = {
    id: id || "imp-001",
    orderNumber: "IMP-2025-001",
    supplier: "Shenzhen Electronics Co",
    supplierCountry: "China",
    destination: "USA Warehouse",
    status: "in_transit",
    priority: "high",
    totalItems: 500,
    totalValue: 25000,
    currency: "USD",
    estimatedArrival: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    lastUpdated: new Date().toISOString(),
    assignee: "John Doe",
    tags: ["Electronics", "Urgent"],
    progress: 60,
    documents: 3,
    comments: 2,
    trackingNumber: "CN2025SHIP445",
    shippingMethod: "Sea Freight",
    shippingCost: 1500,
    customsDuty: 2500,
    taxes: 2000,
    totalLandedCost: 31000,
    items: [
      { id: "1", name: "USB-C Cables", quantity: 200, sku: "USB-C-001", unitPrice: 50, totalPrice: 10000 },
      { id: "2", name: "Wireless Chargers", quantity: 150, sku: "WC-002", unitPrice: 66.67, totalPrice: 10000 },
      { id: "3", name: "Phone Cases", quantity: 100, sku: "PC-003", unitPrice: 40, totalPrice: 4000 },
      { id: "4", name: "Screen Protectors", quantity: 50, sku: "SP-004", unitPrice: 20, totalPrice: 1000 }
    ]
  };

  const { data: order = mockOrderDetails, isLoading } = useQuery({
    queryKey: [`/api/import-orders/${id}`],
    enabled: !!id
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'in_transit': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCountryFlag = (country: string) => {
    switch (country) {
      case 'China': return '🇨🇳';
      case 'Vietnam': return '🇻🇳';
      case 'USA': return '🇺🇸';
      default: return '🌍';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading order details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b md:relative md:border-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between p-4 md:p-0 gap-4">
          <div className="flex items-center gap-2 md:gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/imports/kanban")}
              className="md:hidden"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/imports/kanban")}
              className="hidden md:flex"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Kanban
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg md:text-2xl font-semibold">{order.orderNumber}</h1>
                <Badge className={getStatusColor(order.status)} variant="secondary">
                  {order.status.replace('_', ' ')}
                </Badge>
                <Badge className={getPriorityColor(order.priority)} variant="secondary">
                  {order.priority}
                </Badge>
              </div>
              <p className="text-xs md:text-sm text-muted-foreground">
                Last updated {format(new Date(order.lastUpdated), 'MMM d, yyyy HH:mm')}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Export</span>
            </Button>
            <Button variant="outline" size="sm">
              <Printer className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Print</span>
            </Button>
            <Button size="sm">
              <Edit className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Edit Order</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <Card className="mx-4 md:mx-0">
        <CardContent className="p-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Order Progress</span>
              <span className="font-medium">{order.progress}%</span>
            </div>
            <Progress value={order.progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Created {format(new Date(order.createdDate), 'MMM d')}</span>
              <span>ETA {format(new Date(order.estimatedArrival), 'MMM d')}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mx-4 md:mx-0">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Items</span>
            </div>
            <p className="text-2xl font-bold">{order.totalItems.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Order Value</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(order.totalValue, order.currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Shipping Cost</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(order.shippingCost || 0, order.currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Landed</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(order.totalLandedCost || order.totalValue, order.currency)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mx-4 md:mx-0">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="items">Items ({order.items.length})</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Order Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Supplier:</span>
                    <span className="font-medium">
                      {getCountryFlag(order.supplierCountry)} {order.supplier}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Destination:</span>
                    <span className="font-medium">{order.destination}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Shipping:</span>
                    <span className="font-medium">{order.shippingMethod || 'Not specified'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Tracking:</span>
                    <span className="font-medium">{order.trackingNumber || 'Not available'}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Created:</span>
                    <span className="font-medium">{format(new Date(order.createdDate), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">ETA:</span>
                    <span className="font-medium">{format(new Date(order.estimatedArrival), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Assignee:</span>
                    <span className="font-medium">{order.assignee || 'Unassigned'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Documents:</span>
                    <span className="font-medium">{order.documents} files</span>
                  </div>
                </div>
              </div>
              {order.tags.length > 0 && (
                <div className="flex items-center gap-2 pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Tags:</span>
                  <div className="flex flex-wrap gap-1">
                    {order.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">SKU: {item.sku || 'N/A'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">{item.quantity} units</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(item.totalPrice || item.quantity * (item.unitPrice || 0), order.currency)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cost Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Product Value</span>
                  <span className="font-medium">{formatCurrency(order.totalValue, order.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Shipping Cost</span>
                  <span className="font-medium">{formatCurrency(order.shippingCost || 0, order.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Customs Duty</span>
                  <span className="font-medium">{formatCurrency(order.customsDuty || 0, order.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Taxes</span>
                  <span className="font-medium">{formatCurrency(order.taxes || 0, order.currency)}</span>
                </div>
                <div className="flex justify-between pt-3 border-t">
                  <span className="font-medium">Total Landed Cost</span>
                  <span className="font-bold text-lg">{formatCurrency(order.totalLandedCost || order.totalValue, order.currency)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}