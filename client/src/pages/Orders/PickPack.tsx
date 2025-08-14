import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/currencyUtils";
import { 
  Package, 
  Printer, 
  CheckCircle, 
  Clock,
  MapPin,
  User,
  Truck,
  Search,
  ScanLine,
  Box,
  ClipboardList,
  AlertCircle
} from "lucide-react";

interface OrderItem {
  id: string;
  productName: string;
  sku: string;
  quantity: number;
  warehouseLocation?: string;
  isPicked: boolean;
  isPacked: boolean;
}

interface PickPackOrder {
  id: string;
  orderId: string;
  customerName: string;
  shippingMethod: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending_pick' | 'picking' | 'packing' | 'ready_to_ship';
  items: OrderItem[];
  totalItems: number;
  pickedItems: number;
  packedItems: number;
  createdAt: string;
}

export default function PickPack() {
  const [selectedTab, setSelectedTab] = useState<'pending' | 'picking' | 'packing' | 'ready'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);

  // Mock data for demonstration
  const mockOrders: PickPackOrder[] = [
    {
      id: 'ord-001',
      orderId: 'ORD-2025-001',
      customerName: 'Tech Solutions Ltd',
      shippingMethod: 'DHL',
      priority: 'high',
      status: 'pending_pick',
      totalItems: 5,
      pickedItems: 0,
      packedItems: 0,
      createdAt: '2025-01-14T10:00:00',
      items: [
        { id: '1', productName: 'iPhone 14 Pro', sku: 'IP14P-128', quantity: 2, warehouseLocation: 'A1-B2-C3', isPicked: false, isPacked: false },
        { id: '2', productName: 'AirPods Pro', sku: 'APP-2023', quantity: 3, warehouseLocation: 'A2-B1-C5', isPicked: false, isPacked: false }
      ]
    },
    {
      id: 'ord-002',
      orderId: 'ORD-2025-002',
      customerName: 'Fashion Store',
      shippingMethod: 'GLS',
      priority: 'medium',
      status: 'picking',
      totalItems: 8,
      pickedItems: 5,
      packedItems: 0,
      createdAt: '2025-01-14T09:30:00',
      items: [
        { id: '3', productName: 'T-Shirt Blue', sku: 'TS-BLU-M', quantity: 5, warehouseLocation: 'B3-C1-D2', isPicked: true, isPacked: false },
        { id: '4', productName: 'Jeans Classic', sku: 'JN-CLS-32', quantity: 3, warehouseLocation: 'B4-C2-D1', isPicked: false, isPacked: false }
      ]
    },
    {
      id: 'ord-003',
      orderId: 'ORD-2025-003',
      customerName: 'Beauty Supplies Co',
      shippingMethod: 'PPL',
      priority: 'low',
      status: 'packing',
      totalItems: 10,
      pickedItems: 10,
      packedItems: 6,
      createdAt: '2025-01-14T08:00:00',
      items: [
        { id: '5', productName: 'Face Cream', sku: 'FC-001', quantity: 6, warehouseLocation: 'C1-D3-E2', isPicked: true, isPacked: true },
        { id: '6', productName: 'Lipstick Set', sku: 'LS-RED', quantity: 4, warehouseLocation: 'C2-D4-E1', isPicked: true, isPacked: false }
      ]
    }
  ];

  const getOrdersByStatus = (status: string) => {
    return mockOrders.filter(order => {
      if (status === 'pending') return order.status === 'pending_pick';
      if (status === 'picking') return order.status === 'picking';
      if (status === 'packing') return order.status === 'packing';
      if (status === 'ready') return order.status === 'ready_to_ship';
      return false;
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_pick':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Pending Pick</Badge>;
      case 'picking':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">Picking</Badge>;
      case 'packing':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">Packing</Badge>;
      case 'ready_to_ship':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Ready to Ship</Badge>;
      default:
        return null;
    }
  };

  const OrderCard = ({ order }: { order: PickPackOrder }) => {
    const progress = (order.pickedItems / order.totalItems) * 100;
    
    return (
      <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedOrder(order.id)}>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">{order.orderId}</CardTitle>
              <CardDescription className="mt-1">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-3 w-3" />
                  {order.customerName}
                </div>
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 items-end">
              {getStatusBadge(order.status)}
              <Badge variant={getPriorityColor(order.priority)} className="text-xs">
                {order.priority.toUpperCase()}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Truck className="h-4 w-4 text-gray-500" />
                <span>{order.shippingMethod}</span>
              </div>
              <div className="flex items-center gap-1">
                <Package className="h-4 w-4 text-gray-500" />
                <span>{order.totalItems} items</span>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Pick Progress</span>
                <span>{order.pickedItems}/{order.totalItems}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              {order.status === 'pending_pick' && (
                <Button size="sm" className="flex-1">
                  <ClipboardList className="h-4 w-4 mr-1" />
                  Start Picking
                </Button>
              )}
              {order.status === 'picking' && (
                <Button size="sm" className="flex-1" variant="outline">
                  <ScanLine className="h-4 w-4 mr-1" />
                  Continue Picking
                </Button>
              )}
              {order.status === 'packing' && (
                <Button size="sm" className="flex-1" variant="outline">
                  <Box className="h-4 w-4 mr-1" />
                  Continue Packing
                </Button>
              )}
              {order.status === 'ready_to_ship' && (
                <Button size="sm" className="flex-1" variant="secondary">
                  <Printer className="h-4 w-4 mr-1" />
                  Print Label
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 lg:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm mb-6 p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Pick & Pack</h1>
              <p className="text-sm text-slate-600 mt-1">Manage warehouse fulfillment operations</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full sm:w-64"
                />
              </div>
              <Button>
                <ScanLine className="h-4 w-4 mr-2" />
                Scan Barcode
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending Pick</CardDescription>
              <CardTitle className="text-2xl">{getOrdersByStatus('pending').length}</CardTitle>
            </CardHeader>
            <CardContent>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>In Picking</CardDescription>
              <CardTitle className="text-2xl">{getOrdersByStatus('picking').length}</CardTitle>
            </CardHeader>
            <CardContent>
              <Package className="h-4 w-4 text-blue-500" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>In Packing</CardDescription>
              <CardTitle className="text-2xl">{getOrdersByStatus('packing').length}</CardTitle>
            </CardHeader>
            <CardContent>
              <Box className="h-4 w-4 text-purple-500" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Ready to Ship</CardDescription>
              <CardTitle className="text-2xl">{getOrdersByStatus('ready').length}</CardTitle>
            </CardHeader>
            <CardContent>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardContent>
          </Card>
        </div>

        {/* Orders Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Orders Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as any)}>
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="pending">Pending ({getOrdersByStatus('pending').length})</TabsTrigger>
                <TabsTrigger value="picking">Picking ({getOrdersByStatus('picking').length})</TabsTrigger>
                <TabsTrigger value="packing">Packing ({getOrdersByStatus('packing').length})</TabsTrigger>
                <TabsTrigger value="ready">Ready ({getOrdersByStatus('ready').length})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="pending" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {getOrdersByStatus('pending').map(order => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="picking" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {getOrdersByStatus('picking').map(order => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="packing" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {getOrdersByStatus('packing').map(order => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="ready" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {getOrdersByStatus('ready').map(order => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                  {getOrdersByStatus('ready').length === 0 && (
                    <div className="col-span-full text-center py-8 text-gray-500">
                      <CheckCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>No orders ready to ship</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}