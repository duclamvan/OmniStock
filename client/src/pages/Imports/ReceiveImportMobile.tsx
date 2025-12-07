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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/currencyUtils";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
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
  X,
  Plus,
  Minus,
  Box,
  ScanLine,
  Info,
  Check,
  ChevronRight,
  Clock,
  Building2
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
  unitCost?: number;
  totalCost?: number;
}

export default function ReceiveImportMobile() {
  const { t } = useTranslation('imports');
  const { id } = useParams();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [receivingItems, setReceivingItems] = useState<ReceivingItem[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");
  const [scanMode, setScanMode] = useState(false);
  const [scannedSku, setScannedSku] = useState("");

  // Fetch order details
  const { data: order, isLoading } = useQuery({
    queryKey: ['/api/import-orders', id],
    queryFn: async () => {
      const response = await fetch(`/api/import-orders/${id}`);
      if (!response.ok) throw new Error(t('failedToFetchImportOrder'));
      const data = await response.json();
      
      // Initialize receiving items
      const items = (data.items || []).map((item: any) => ({
        id: item.id,
        productName: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        receivedQuantity: item.receivedQuantity || 0,
        checked: false,
        notes: '',
        locationId: '',
        unitCost: item.unitCost,
        totalCost: item.totalCost
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
      
      return apiRequest('POST', `/api/import-orders/${id}/receive`, {
        itemIds,
        receivedQuantities
      });
    },
    onSuccess: () => {
      toast({
        title: t('itemsReceivedSuccess'),
        description: t('itemsMarkedReceived')
      });
      
      // Check if all items are received
      const allReceived = receivingItems.every(item => 
        item.receivedQuantity >= item.quantity
      );
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
      const itemIds = receivingItems
        .filter(item => item.receivedQuantity > 0)
        .map(item => item.id);
      
      return apiRequest('POST', `/api/import-orders/${id}/add-to-inventory`, {
        itemIds
      });
    },
    onSuccess: () => {
      // Build notification with item names
      const itemsReceived = receivingItems.filter(item => item.receivedQuantity > 0);
      const itemNames = itemsReceived.slice(0, 3).map(item => `${item.receivedQuantity}x ${item.productName}`).join(', ');
      const moreCount = itemsReceived.length > 3 ? ` +${itemsReceived.length - 3} more` : '';
      
      toast({
        title: t('addedToWarehouse') || 'Added to Warehouse Inventory',
        description: `${itemNames}${moreCount}`,
        duration: 5000
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

  // Update received quantity
  const updateReceivedQuantity = (itemId: string, delta: number) => {
    setReceivingItems(items =>
      items.map(item => {
        if (item.id === itemId) {
          const newQuantity = Math.max(0, Math.min(item.quantity, item.receivedQuantity + delta));
          return { ...item, receivedQuantity: newQuantity, checked: newQuantity > 0 };
        }
        return item;
      })
    );
  };

  // Toggle all items
  const toggleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    setReceivingItems(items =>
      items.map(item => ({ 
        ...item, 
        checked: newSelectAll,
        receivedQuantity: newSelectAll ? item.quantity : item.receivedQuantity
      }))
    );
  };

  // Handle barcode scan
  const handleScan = () => {
    if (!scannedSku) return;
    
    const item = receivingItems.find(i => i.sku === scannedSku);
    if (item) {
      updateReceivedQuantity(item.id, 1);
      toast({
        title: t('itemScanned'),
        description: `${item.productName} - ${t('quantityUpdated')}`
      });
      setScannedSku("");
    } else {
      toast({
        title: t('itemNotFound'),
        description: t('skuNotInOrder'),
        variant: "destructive"
      });
    }
  };

  // Calculate progress
  const pendingItems = receivingItems.filter(item => item.receivedQuantity === 0);
  const receivedItems = receivingItems.filter(item => item.receivedQuantity > 0 && item.receivedQuantity < item.quantity);
  const completedItems = receivingItems.filter(item => item.receivedQuantity >= item.quantity);
  
  const totalQuantity = receivingItems.reduce((sum, item) => sum + item.quantity, 0);
  const receivedQuantity = receivingItems.reduce((sum, item) => sum + item.receivedQuantity, 0);
  const progressPercentage = totalQuantity > 0 ? (receivedQuantity / totalQuantity) * 100 : 0;

  // Filter items by tab
  const getItemsByTab = () => {
    switch (activeTab) {
      case "pending":
        return pendingItems;
      case "partial":
        return receivedItems;
      case "completed":
        return completedItems;
      default:
        return receivingItems;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 px-4 pb-20">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <Alert variant="destructive" className="mx-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('error')}</AlertTitle>
        <AlertDescription>{t('notFound')}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 overflow-x-hidden">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white dark:bg-slate-800 border-b dark:border-slate-700">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Link href={`/imports/orders/${id}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold">{t('receiveImport')}</h1>
              <p className="text-xs text-muted-foreground">#{order.orderNumber}</p>
            </div>
          </div>
          <Badge variant={order.status === 'delivered' ? 'default' : 'secondary'}>
            {order.status}
          </Badge>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="bg-white dark:bg-slate-800 p-4 border-b dark:border-slate-700">
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('receivingProgress')}</span>
            <span className="font-medium">{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{pendingItems.length}</p>
              <p className="text-xs text-muted-foreground">{t('pending')}</p>
            </div>
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{receivedItems.length}</p>
              <p className="text-xs text-muted-foreground">{t('partial')}</p>
            </div>
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{completedItems.length}</p>
              <p className="text-xs text-muted-foreground">{t('complete')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Order Info */}
      <div className="bg-white dark:bg-slate-800 p-4 mb-2">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">{t('supplier')}</p>
              <p className="font-medium">{order.supplier?.name || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">{t('warehouse')}</p>
              <p className="font-medium">{order.warehouse?.name || 'N/A'}</p>
            </div>
          </div>
          {order.trackingNumber && (
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">{t('tracking')}</p>
                <p className="font-medium text-xs">{order.trackingNumber}</p>
              </div>
            </div>
          )}
          {order.estimatedArrival && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">{t('eta')}</p>
                <p className="font-medium">
                  {format(new Date(order.estimatedArrival), 'MMM d')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-slate-800 p-4 border-y dark:border-slate-700 mb-2">
        <div className="flex gap-2">
          <Button
            onClick={() => setScanMode(!scanMode)}
            variant={scanMode ? "default" : "outline"}
            size="sm"
            className="flex-1"
          >
            <ScanLine className="h-4 w-4 mr-2" />
            {scanMode ? t('scanning') : t('scanItems')}
          </Button>
          <Button
            onClick={toggleSelectAll}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {selectAll ? t('deselectAll') : t('selectAll')}
          </Button>
        </div>
      </div>

      {/* Scan Mode */}
      {scanMode && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 mb-2">
          <div className="space-y-3">
            <Label className="text-sm">{t('scanOrEnterSku')}</Label>
            <div className="flex gap-2">
              <Input
                value={scannedSku}
                onChange={(e) => setScannedSku(e.target.value)}
                placeholder={t('enterSkuOrScan')}
                className="flex-1"
                onKeyPress={(e) => e.key === 'Enter' && handleScan()}
              />
              <Button onClick={handleScan} size="icon">
                <Check className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Items Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <TabsList className="w-full grid grid-cols-4 h-12 bg-white dark:bg-slate-800 rounded-none border-b dark:border-slate-700">
          <TabsTrigger value="all" className="data-[state=active]:border-b-2">
            {t('all')} ({receivingItems.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="data-[state=active]:border-b-2">
            {t('pending')} ({pendingItems.length})
          </TabsTrigger>
          <TabsTrigger value="partial" className="data-[state=active]:border-b-2">
            {t('partial')} ({receivedItems.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="data-[state=active]:border-b-2">
            {t('done')} ({completedItems.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-0 p-4 space-y-3">
          {getItemsByTab().length === 0 ? (
            <Card className="p-8">
              <div className="text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">{t('noItemsInCategory')}</p>
              </div>
            </Card>
          ) : (
            getItemsByTab().map((item) => (
              <Card key={item.id} className={item.checked ? 'ring-2 ring-primary' : ''}>
                <CardContent className="p-4">
                  {/* Item Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <Checkbox
                        checked={item.checked}
                        onCheckedChange={() => toggleItem(item.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm line-clamp-2">{item.productName}</p>
                        {item.sku && (
                          <p className="text-xs text-muted-foreground mt-1">
                            SKU: {item.sku}
                          </p>
                        )}
                      </div>
                    </div>
                    {item.receivedQuantity >= item.quantity && (
                      <Badge variant="default" className="ml-2">
                        <Check className="h-3 w-3 mr-1" />
                        {t('complete')}
                      </Badge>
                    )}
                  </div>

                  {/* Quantity Controls */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                      <div className="text-sm">
                        <p className="text-muted-foreground">{t('receivedExpected')}</p>
                        <p className="font-semibold text-lg">
                          {item.receivedQuantity} / {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => updateReceivedQuantity(item.id, -1)}
                          disabled={item.receivedQuantity === 0}
                          className="h-8 w-8"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-12 text-center font-medium">
                          {item.receivedQuantity}
                        </span>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => updateReceivedQuantity(item.id, 1)}
                          disabled={item.receivedQuantity >= item.quantity}
                          className="h-8 w-8"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <Progress 
                      value={(item.receivedQuantity / item.quantity) * 100} 
                      className="h-2"
                    />

                    {/* Cost Info */}
                    {item.unitCost && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Unit Cost: {formatCurrency(item.unitCost, order.currency)}</span>
                        <span>Total: {formatCurrency(item.totalCost || 0, order.currency)}</span>
                      </div>
                    )}

                    {/* Notes Field */}
                    <div>
                      <Label className="text-xs">{t('notesOptional')}</Label>
                      <Input
                        placeholder={t('addNotesAboutItem')}
                        value={item.notes}
                        onChange={(e) => {
                          const value = e.target.value;
                          setReceivingItems(items =>
                            items.map(i =>
                              i.id === item.id ? { ...i, notes: value } : i
                            )
                          );
                        }}
                        className="mt-1 text-sm"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 space-y-3">
        {/* Summary */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">
            {receivingItems.filter(i => i.checked).length} {t('itemsSelected')}
          </span>
          <span className="font-semibold">
            {receivedQuantity} / {totalQuantity} {t('units')}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate(`/imports/orders/${id}`)}
          >
            {t('cancel')}
          </Button>
          <Button
            className="flex-1"
            disabled={receivingItems.filter(i => i.checked).length === 0 || receiveItemsMutation.isPending}
            onClick={() => receiveItemsMutation.mutate()}
          >
            {receiveItemsMutation.isPending ? (
              <>{t('savingChanges')}</>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {t('receiveItems')}
              </>
            )}
          </Button>
        </div>

        {/* Complete Button */}
        {receivedQuantity === totalQuantity && (
          <Button
            variant="default"
            className="w-full bg-green-600 hover:bg-green-700"
            onClick={() => addToInventoryMutation.mutate()}
            disabled={addToInventoryMutation.isPending}
          >
            {addToInventoryMutation.isPending ? (
              <>{t('addingToInventory')}</>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                {t('completeAddToInventory')}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}