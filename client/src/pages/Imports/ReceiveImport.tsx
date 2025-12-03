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
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation('imports');
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
      if (!response.ok) throw new Error(t('failedToFetchImportOrder'));
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
      
      return apiRequest('POST', `/api/import-orders/${id}/receive`, {
        itemIds,
        receivedQuantities
      });
    },
    onSuccess: () => {
      toast({
        title: t('itemsReceived'),
        description: t('itemsMarkedReceived')
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
      
      return apiRequest('POST', `/api/import-orders/${id}/add-to-inventory`, {
        itemIds
      });
    },
    onSuccess: () => {
      // Build notification with item names
      const checkedItems = receivingItems.filter(item => item.checked);
      const itemNames = checkedItems.slice(0, 3).map(item => `${item.receivedQuantity}x ${item.productName}`).join(', ');
      const moreCount = checkedItems.length > 3 ? ` +${checkedItems.length - 3} more` : '';
      
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
          <p className="mt-4 text-gray-500">{t('loadingOrderDetails')}</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('error')}</AlertTitle>
        <AlertDescription>{t('notFound')}</AlertDescription>
      </Alert>
    );
  }

  const checkedCount = receivingItems.filter(item => item.checked).length;
  const totalItems = receivingItems.length;
  const progressPercentage = totalItems > 0 ? (checkedCount / totalItems) * 100 : 0;

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b md:relative md:border-0">
        <div className="p-4 md:p-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-4">
              <Link href={`/imports/orders/${id}`}>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="sm" className="hidden md:flex">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t('backToOrder')}
                </Button>
              </Link>
              <div>
                <h1 className="text-lg md:text-2xl font-semibold">{t('receiveImportOrderTitle')}</h1>
                <p className="text-xs md:text-sm text-muted-foreground">{t('orderNo')} {order.orderNumber}</p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => receiveItemsMutation.mutate()}
              disabled={checkedCount === 0}
              className="md:hidden"
            >
              <CheckCircle className="h-4 w-4" />
            </Button>
          </div>
          <div className="hidden md:flex items-center gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => navigate(`/imports/orders/${id}`)}
            >
              <X className="h-4 w-4 mr-2" />
              {t('cancel')}
            </Button>
            <Button
              onClick={() => receiveItemsMutation.mutate()}
              disabled={checkedCount === 0}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {t('receiveCount', { count: checkedCount })}
            </Button>
          </div>
        </div>
      </div>

      {/* Progress Card */}
      <Card className="mx-4 md:mx-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-base md:text-lg">{t('receivingProgress')}</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            {t('selectItemsPhysicallyReceived')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-xs md:text-sm">
              <span>{checkedCount} {t('of')} {totalItems} {t('itemsSelected')}</span>
              <span className="font-medium">{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="mx-4 md:mx-0">
        <CardContent className="p-4 md:pt-6">
          <div className="space-y-3 md:space-y-0 md:flex md:items-center md:justify-between">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4">
              <Button
                variant="outline"
                onClick={toggleAll}
                className="w-full md:w-auto"
                size="sm"
              >
                <ClipboardCheck className="h-4 w-4 mr-2" />
                {selectAll ? t('deselectAll') : t('selectAll')}
              </Button>
              <span className="text-xs md:text-sm text-muted-foreground">
                {t('markAllItemsFullQuantity')}
              </span>
            </div>
            {order.calculation && (
              <div className="text-left md:text-right p-2 md:p-0 bg-green-50 dark:bg-green-950 md:bg-transparent rounded-md">
                <p className="text-xs md:text-sm text-muted-foreground">{t('landedCostReady')}</p>
                <p className="text-xs md:text-sm font-medium text-green-600">
                  {t('unitCostsAutoUpdate')}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Receiving Checklist */}
      <Card className="mx-4 md:mx-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-base md:text-lg">{t('receivingChecklist')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0 md:p-6">
          {/* Mobile Card Layout */}
          <div className="md:hidden space-y-3 p-4">
            {receivingItems.map((item) => (
              <Card key={item.id} className="border-2">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Header with checkbox and status */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <Checkbox
                          checked={item.checked}
                          onCheckedChange={() => toggleItem(item.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{item.productName}</h4>
                          {item.sku && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <Hash className="h-3 w-3" />
                              {item.sku}
                            </div>
                          )}
                        </div>
                      </div>
                      {item.receivedQuantity === item.quantity ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">{t('full')}</Badge>
                      ) : item.receivedQuantity > 0 ? (
                        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-xs">{t('partial')}</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">{t('pending')}</Badge>
                      )}
                    </div>

                    {/* Quantities */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">{t('orderedQty')}</Label>
                        <div className="text-sm font-medium mt-1">{item.quantity}</div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">{t('receivedQty')}</Label>
                        <Input
                          type="number"
                          value={item.receivedQuantity}
                          onChange={(e) => updateReceivedQuantity(item.id, parseInt(e.target.value) || 0)}
                          className="h-9 text-sm mt-1"
                          min="0"
                          max={item.quantity}
                        />
                      </div>
                    </div>

                    {/* Location */}
                    <div>
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {t('storageLocation')}
                      </Label>
                      <Input
                        placeholder={t('locationPlaceholder')}
                        value={item.locationId}
                        onChange={(e) => {
                          setReceivingItems(items =>
                            items.map(i =>
                              i.id === item.id ? { ...i, locationId: e.target.value } : i
                            )
                          );
                        }}
                        className="h-9 text-sm mt-1"
                      />
                    </div>

                    {/* Notes */}
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('qualityNotes')}</Label>
                      <Input
                        placeholder={t('optionalNotes')}
                        value={item.notes}
                        onChange={(e) => updateNotes(item.id, e.target.value)}
                        className="h-9 text-sm mt-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectAll}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead>{t('product')}</TableHead>
                  <TableHead>{t('sku')}</TableHead>
                  <TableHead className="text-center">{t('ordered')}</TableHead>
                  <TableHead className="text-center">{t('received')}</TableHead>
                  <TableHead>{t('location')}</TableHead>
                  <TableHead>{t('notes')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
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
                          placeholder={t('locationPlaceholder')}
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
                        placeholder={t('qualityNotesPlaceholder')}
                        value={item.notes}
                        onChange={(e) => updateNotes(item.id, e.target.value)}
                        className="w-32"
                      />
                    </TableCell>
                    <TableCell>
                      {item.receivedQuantity === item.quantity ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">{t('full')}</Badge>
                      ) : item.receivedQuantity > 0 ? (
                        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">{t('partial')}</Badge>
                      ) : (
                        <Badge variant="outline">{t('pending')}</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Impact Preview */}
      {checkedCount > 0 && (
        <Card className="mx-4 md:mx-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg">{t('inventoryImpactPreview')}</CardTitle>
            <CardDescription className="text-xs md:text-sm">
              {t('inventoryChangesDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert>
                <BarChart3 className="h-4 w-4" />
                <AlertTitle className="text-sm">{t('automaticUpdates')}</AlertTitle>
                <AlertDescription className="text-xs">
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>{t('quantitiesWillIncrease')}</li>
                    <li>{t('unitCostsWillUpdate')}</li>
                    <li>{t('locationsWillRecord')}</li>
                    <li>{t('receivingDateNotesSaved')}</li>
                  </ul>
                </AlertDescription>
              </Alert>
              
              <div className="grid grid-cols-3 gap-3 md:gap-4 text-center">
                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <p className="text-xl md:text-2xl font-bold text-blue-600">{checkedCount}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">{t('itemsToAdd')}</p>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <p className="text-xl md:text-2xl font-bold text-green-600">
                    {receivingItems
                      .filter(item => item.checked)
                      .reduce((sum, item) => sum + item.receivedQuantity, 0)}
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground">{t('totalUnits')}</p>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                  <p className="text-xl md:text-2xl font-bold text-purple-600">
                    {order.calculation ? '✓' : '○'}
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    {order.calculation ? t('costsUpdated') : t('originalCosts')}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mobile Fixed Bottom Action Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t p-4 shadow-lg">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/imports/orders/${id}`)}
            className="flex-1"
          >
            {t('cancel')}
          </Button>
          <Button
            onClick={() => receiveItemsMutation.mutate()}
            disabled={checkedCount === 0}
            className="flex-1"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {t('receiveCount', { count: checkedCount })}
          </Button>
        </div>
      </div>
    </div>
  );
}