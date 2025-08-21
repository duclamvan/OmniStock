import { useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/currencyUtils";
import { 
  ArrowLeft,
  Package,
  CheckCircle,
  AlertCircle,
  MapPin,
  Hash,
  Calendar,
  Truck,
  BarChart3,
  ClipboardCheck,
  Save,
  X
} from "lucide-react";

interface ReceivingItem {
  id: string;
  productName: string;
  sku?: string;
  quantity: number;
  receivedQuantity: number;
  checked: boolean;
  notes?: string;
  locationId?: string;
}

export default function ReceiveImport() {
  const { id } = useParams();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [receivingItems, setReceivingItems] = useState<ReceivingItem[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // Fetch order details
  const { data: order, isLoading } = useQuery({
    queryKey: ['/api/import-orders', id],
    queryFn: async () => {
      const response = await fetch(`/api/import-orders/${id}`);
      if (!response.ok) throw new Error('Failed to fetch import order');
      const data = await response.json();
      
      // Initialize receiving items
      const items = (data.items || []).map((item: any) => ({
        id: item.id,
        productName: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        receivedQuantity: item.receivedQuantity || item.quantity,
        checked: false,
        notes: '',
        locationId: ''
      }));
      setReceivingItems(items);
      
      return data;
    }
  });

  // Mark items as received
  const receiveItemsMutation = useMutation({
    mutationFn: async () => {
      const checkedItems = receivingItems.filter(item => item.checked);
      const itemIds = checkedItems.map(item => item.id);
      const receivedQuantities = checkedItems.map(item => item.receivedQuantity);
      
      return apiRequest(`/api/import-orders/${id}/receive`, 'POST', {
        itemIds,
        receivedQuantities
      });
    },
    onSuccess: () => {
      toast({
        title: "Items Received",
        description: "Selected items have been marked as received."
      });
      
      // Check if all items are received
      const allReceived = receivingItems.every(item => item.checked);
      if (allReceived) {
        // Automatically add to inventory
        addToInventoryMutation.mutate();
      } else {
        queryClient.invalidateQueries({ queryKey: ['/api/import-orders', id] });
      }
    }
  });

  // Add to inventory
  const addToInventoryMutation = useMutation({
    mutationFn: async () => {
      const checkedItems = receivingItems.filter(item => item.checked);
      const itemIds = checkedItems.map(item => item.id);
      
      return apiRequest(`/api/import-orders/${id}/add-to-inventory`, 'POST', {
        itemIds
      });
    },
    onSuccess: () => {
      toast({
        title: "Added to Inventory",
        description: "✓ Items successfully added to inventory with updated costs."
      });
      navigate(`/imports/orders/${id}`);
    }
  });

  // Toggle item selection
  const toggleItem = (itemId: string) => {
    setReceivingItems(items =>
      items.map(item =>
        item.id === itemId ? { ...item, checked: !item.checked } : item
      )
    );
  };

  // Toggle all items
  const toggleAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    setReceivingItems(items =>
      items.map(item => ({ ...item, checked: newSelectAll }))
    );
  };

  // Update received quantity
  const updateReceivedQuantity = (itemId: string, quantity: number) => {
    setReceivingItems(items =>
      items.map(item =>
        item.id === itemId ? { ...item, receivedQuantity: quantity } : item
      )
    );
  };

  // Update notes
  const updateNotes = (itemId: string, notes: string) => {
    setReceivingItems(items =>
      items.map(item =>
        item.id === itemId ? { ...item, notes } : item
      )
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Import order not found.</AlertDescription>
      </Alert>
    );
  }

  const checkedCount = receivingItems.filter(item => item.checked).length;
  const totalItems = receivingItems.length;
  const progressPercentage = totalItems > 0 ? (checkedCount / totalItems) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/imports/orders/${id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Order
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">Receive Import Order</h1>
            <p className="text-gray-500">Order #{order.orderNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/imports/orders/${id}`)}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={() => receiveItemsMutation.mutate()}
            disabled={checkedCount === 0}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark {checkedCount} Items Received
          </Button>
        </div>
      </div>

      {/* Progress Card */}
      <Card>
        <CardHeader>
          <CardTitle>Receiving Progress</CardTitle>
          <CardDescription>
            Select items that have been physically received
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{checkedCount} of {totalItems} items selected</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={toggleAll}
              >
                <ClipboardCheck className="h-4 w-4 mr-2" />
                {selectAll ? 'Unselect All' : 'Select All'}
              </Button>
              <span className="text-sm text-gray-500">
                Mark all items as received with full quantities
              </span>
            </div>
            {order.calculation && (
              <div className="text-right">
                <p className="text-sm text-gray-500">Landed Cost Ready</p>
                <p className="text-sm font-medium text-green-600">
                  ✓ Unit costs will be updated automatically
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Receiving Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Receiving Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectAll}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-center">Ordered</TableHead>
                <TableHead className="text-center">Received</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receivingItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Checkbox
                      checked={item.checked}
                      onCheckedChange={() => toggleItem(item.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {item.productName}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Hash className="h-3 w-3 text-gray-400" />
                      {item.sku || '-'}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {item.quantity}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={item.receivedQuantity}
                      onChange={(e) => updateReceivedQuantity(item.id, parseInt(e.target.value) || 0)}
                      className="w-20 mx-auto"
                      min="0"
                      max={item.quantity}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-gray-400" />
                      <Input
                        placeholder="A1-R1-S1"
                        value={item.locationId}
                        onChange={(e) => {
                          setReceivingItems(items =>
                            items.map(i =>
                              i.id === item.id ? { ...i, locationId: e.target.value } : i
                            )
                          );
                        }}
                        className="w-24"
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      placeholder="Quality notes..."
                      value={item.notes}
                      onChange={(e) => updateNotes(item.id, e.target.value)}
                      className="w-32"
                    />
                  </TableCell>
                  <TableCell>
                    {item.receivedQuantity === item.quantity ? (
                      <Badge className="bg-green-100 text-green-800">Full</Badge>
                    ) : item.receivedQuantity > 0 ? (
                      <Badge className="bg-yellow-100 text-yellow-800">Partial</Badge>
                    ) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Inventory Impact Preview */}
      {checkedCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Inventory Impact Preview</CardTitle>
            <CardDescription>
              The following changes will be applied when items are added to inventory
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert>
                <BarChart3 className="h-4 w-4" />
                <AlertTitle>Automatic Updates</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Product quantities will increase by received amounts</li>
                    <li>Unit costs will be updated with landed costs</li>
                    <li>Inventory locations will be recorded</li>
                    <li>Receiving date and notes will be saved</li>
                  </ul>
                </AlertDescription>
              </Alert>
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-blue-600">{checkedCount}</p>
                  <p className="text-sm text-gray-500">Items to Add</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {receivingItems
                      .filter(item => item.checked)
                      .reduce((sum, item) => sum + item.receivedQuantity, 0)}
                  </p>
                  <p className="text-sm text-gray-500">Total Units</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">
                    {order.calculation ? '✓' : '○'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {order.calculation ? 'Costs Updated' : 'Original Costs'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}