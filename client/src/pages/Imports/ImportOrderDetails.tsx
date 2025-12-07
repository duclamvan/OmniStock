import { useState, useEffect } from "react";
import { Link, useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, formatDate } from "@/lib/currencyUtils";
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
  const { t } = useTranslation('imports');
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
          <p className="text-sm text-muted-foreground">{t('loadingOrderDetails')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 md:pb-6 overflow-x-hidden p-2 sm:p-4 md:p-6">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b md:relative md:border-0 -mx-2 sm:-mx-4 md:-mx-6 px-2 sm:px-4 md:px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between py-3 md:py-0 gap-3 sm:gap-4">
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
              {t('backToKanban')}
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
                {t('lastUpdated')} {formatDate(order.lastUpdated)}
              </p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <Button variant="outline" size="sm" className="flex-1 sm:flex-initial">
              <Download className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{t('export')}</span>
            </Button>
            <Button variant="outline" size="sm" className="flex-1 sm:flex-initial">
              <Printer className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{t('print')}</span>
            </Button>
            <Button size="sm" className="flex-1 sm:flex-initial">
              <Edit className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{t('editOrder')}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <Card className="w-full">
        <CardContent className="p-3 sm:p-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('orderProgress')}</span>
              <span className="font-medium">{order.progress}%</span>
            </div>
            <Progress value={order.progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t('created')} {formatDate(order.createdDate)}</span>
              <span>{t('eta')} {formatDate(order.estimatedArrival)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <Card className="w-full">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-1 sm:mb-2">
              <Package className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              <span className="text-xs sm:text-sm text-muted-foreground">{t('totalItems')}</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold">{order.totalItems.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="w-full">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-1 sm:mb-2">
              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              <span className="text-xs sm:text-sm text-muted-foreground">{t('orderValue')}</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold">{formatCurrency(order.totalValue, order.currency)}</p>
          </CardContent>
        </Card>
        <Card className="w-full">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-1 sm:mb-2">
              <Truck className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              <span className="text-xs sm:text-sm text-muted-foreground">{t('shippingCost')}</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold">{formatCurrency(order.shippingCost || 0, order.currency)}</p>
          </CardContent>
        </Card>
        <Card className="w-full">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-1 sm:mb-2">
              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              <span className="text-xs sm:text-sm text-muted-foreground">{t('totalLanded')}</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold">{formatCurrency(order.totalLandedCost || order.totalValue, order.currency)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 text-xs sm:text-sm">
          <TabsTrigger value="overview">{t('overview')}</TabsTrigger>
          <TabsTrigger value="items">{t('items')} ({order.items.length})</TabsTrigger>
          <TabsTrigger value="costs">{t('costs')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-3 sm:space-y-4">
          <Card className="w-full">
            <CardHeader className="pb-2 sm:pb-4">
              <CardTitle className="text-sm sm:text-base">{t('orderInformation')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{t('supplier')}:</span>
                    <span className="font-medium">
                      {getCountryFlag(order.supplierCountry)} {order.supplier}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{t('destination')}:</span>
                    <span className="font-medium">{order.destination}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{t('shipping')}:</span>
                    <span className="font-medium">{order.shippingMethod || t('notSpecified')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{t('tracking')}:</span>
                    <span className="font-medium">{order.trackingNumber || t('notAvailable')}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{t('created')}:</span>
                    <span className="font-medium">{formatDate(order.createdDate)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{t('eta')}:</span>
                    <span className="font-medium">{formatDate(order.estimatedArrival)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{t('assignee')}:</span>
                    <span className="font-medium">{order.assignee || t('unassigned')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{t('documents')}:</span>
                    <span className="font-medium">{order.documents} {t('files')}</span>
                  </div>
                </div>
              </div>
              {order.tags.length > 0 && (
                <div className="flex items-center gap-2 pt-2 border-t">
                  <span className="text-sm text-muted-foreground">{t('tags')}:</span>
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

        <TabsContent value="items" className="space-y-3 sm:space-y-4">
          <Card className="w-full">
            <CardHeader className="pb-2 sm:pb-4">
              <CardTitle className="text-sm sm:text-base">{t('orderItems')}</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <div className="space-y-2 overflow-x-auto">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">SKU: {item.sku || t('notAvailable')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">{item.quantity} {t('units')}</p>
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

        <TabsContent value="costs" className="space-y-3 sm:space-y-4">
          <Card className="w-full">
            <CardHeader className="pb-2 sm:pb-4">
              <CardTitle className="text-sm sm:text-base">{t('costBreakdown')}</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <div className="space-y-2 sm:space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t('productValue')}</span>
                  <span className="font-medium">{formatCurrency(order.totalValue, order.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t('shippingCost')}</span>
                  <span className="font-medium">{formatCurrency(order.shippingCost || 0, order.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t('customsDuty')}</span>
                  <span className="font-medium">{formatCurrency(order.customsDuty || 0, order.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t('taxes')}</span>
                  <span className="font-medium">{formatCurrency(order.taxes || 0, order.currency)}</span>
                </div>
                <div className="flex justify-between pt-3 border-t">
                  <span className="font-medium">{t('totalLandedCost')}</span>
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