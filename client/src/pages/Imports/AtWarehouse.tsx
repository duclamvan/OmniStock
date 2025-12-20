import { useState, useEffect, useMemo, memo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FixedSizeList as List } from "react-window";
import { Plus, Package, Plane, Ship, Zap, Truck, MapPin, Clock, Weight, Users, ShoppingCart, Star, Trash2, Package2, PackageOpen, AlertCircle, CheckCircle, Edit, MoreHorizontal, ArrowUp, ArrowDown, Archive, Send, RefreshCw, Flag, Shield, Grip, AlertTriangle, ChevronDown, ChevronRight, Box, Sparkles, X, Search, SortAsc, CheckSquare, Square, ChevronsDown, ChevronsUp, Filter, Calendar, Hash, Camera, ArrowRightToLine, MoreVertical, Edit2, Train, Check, ChevronsUpDown, Barcode } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

interface PurchaseItem {
  id: number;
  purchaseId: number;
  name: string;
  sku: string | null;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  weight: string | null;
  dimensions: any;
  notes: string | null;
  trackingNumber: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface ImportPurchase {
  id: number;
  supplier: string;
  location?: string;
  trackingNumber: string | null;
  estimatedArrival: string | null;
  notes: string | null;
  shippingCost: string;
  totalCost: string;
  paymentCurrency: string;
  totalPaid: string;
  purchaseCurrency: string;
  purchaseTotal: string;
  exchangeRate: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  items: PurchaseItem[];
  itemCount: number;
}

interface CustomItem {
  id: number;
  name: string;
  source: string;
  orderNumber: string | null;
  quantity: number;
  unitPrice: string;
  weight: string;
  dimensions: string | null;
  trackingNumber: string | null;
  notes: string | null;
  customerName: string | null;
  customerEmail: string | null;
  status: string;
  classification?: string;
  purchaseOrderId?: number;
  orderItems?: any[];
  imageUrl?: string | null;
  createdAt: string;
}

interface Consolidation {
  id: number;
  name: string;
  location?: string;
  shippingMethod: string;
  warehouse: string;
  notes: string | null;
  targetWeight: string | null;
  maxItems: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  items: any[];
  itemCount: number;
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  ordered: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  in_transit: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  at_warehouse: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  unpacked: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  available: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  assigned: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  consolidated: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  shipped: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200"
};

const shippingMethodColors: Record<string, string> = {
  general_air_ddp: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200",
  sensitive_air_ddp: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900 dark:text-orange-200",
  general_express: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200",
  sensitive_express: "bg-red-100 text-red-900 border-red-300 dark:bg-red-900 dark:text-red-100",
  general_railway: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200",
  sensitive_railway: "bg-green-100 text-green-900 border-green-300 dark:bg-green-900 dark:text-green-100",
  general_sea: "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900 dark:text-cyan-200",
  sensitive_sea: "bg-cyan-100 text-cyan-900 border-cyan-300 dark:bg-cyan-900 dark:text-cyan-100",
  // Legacy support
  air_express: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200",
  air_standard: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200",
  sea_freight: "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900 dark:text-cyan-200",
  rail_freight: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200",
  priority: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900 dark:text-purple-200"
};

const shippingMethodIcons: Record<string, any> = {
  general_air_ddp: Plane,
  sensitive_air_ddp: Plane,
  general_express: Zap,
  sensitive_express: Zap,
  general_railway: Truck,
  sensitive_railway: Truck,
  general_sea: Ship,
  sensitive_sea: Ship,
  // Legacy support
  air_express: Zap,
  air_standard: Plane,
  sea_freight: Ship,
  rail_freight: Truck,
  priority: Star
};

const sourceColors: Record<string, string> = {
  taobao: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  pinduoduo: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  "1688": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  alibaba: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  other: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
};

// Memoized skeleton components for loading states
const OrderCardSkeleton = memo(() => (
  <Card className="shadow-sm">
    <CardContent className="pt-6">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-6" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-36" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 rounded" />
            <Skeleton className="h-6 w-16 rounded" />
            <Skeleton className="h-6 w-16 rounded" />
          </div>
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
    </CardContent>
  </Card>
));
OrderCardSkeleton.displayName = 'OrderCardSkeleton';

const ItemCardSkeleton = memo(() => (
  <Card className="hover:shadow-md transition-shadow">
    <CardContent className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-9" />
        </div>
      </div>
    </CardContent>
  </Card>
));
ItemCardSkeleton.displayName = 'ItemCardSkeleton';

const StatsCardSkeleton = memo(() => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-4" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-8 w-12" />
    </CardContent>
  </Card>
));
StatsCardSkeleton.displayName = 'StatsCardSkeleton';

// Memoized item card component for virtualized list
const ItemCard = memo(({
  item,
  index,
  selectedItemsForAI,
  setSelectedItemsForAI,
  expandedItems,
  toggleItemExpanded,
  updateItemClassificationMutation,
  handleEditItem,
  setDeleteTarget,
  setMoveToConsolidationItem,
  unpackItemMutation,
  getClassificationIcon,
  getSourceBadge,
  itemSortBy,
  t
}: any) => {
  const handleClick = useCallback((e: any) => {
    const target = e.target as HTMLElement;
    if (!target.closest('button') && !target.closest('[data-drag-handle]')) {
      e.preventDefault();
      e.stopPropagation();
      const newSelected = new Set(selectedItemsForAI);
      if (newSelected.has(item.id)) {
        newSelected.delete(item.id);
      } else {
        newSelected.add(item.id);
      }
      setSelectedItemsForAI(newSelected);
    }
  }, [item.id, selectedItemsForAI, setSelectedItemsForAI]);

  return (
    <Draggable key={item.uniqueId} draggableId={item.uniqueId} index={index}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`border rounded-lg p-3 bg-background hover:shadow-md cursor-grab active:cursor-grabbing transition-all ${
            selectedItemsForAI.has(item.id) 
              ? 'ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-900/20 border-purple-300' 
              : 'hover:border-purple-200'
          }`}
          onClick={handleClick}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-start gap-3">
                <div className="flex items-center mt-0.5">
                  <div 
                    data-drag-handle
                    className="hover:bg-muted/50 rounded p-0.5 transition-colors"
                    title={itemSortBy === 'custom' ? t('dragToReorder') : t('dragToConsolidation')}
                  >
                    <Grip className="h-4 w-4 text-muted-foreground flex-shrink-0 hover:text-primary transition-colors" />
                  </div>
                </div>
                {item.imageUrl ? (
                  <img 
                    src={item.imageUrl} 
                    alt={item.name}
                    className="w-12 h-12 object-cover rounded-md border"
                  />
                ) : (
                  <Package className="w-12 h-12 text-muted-foreground p-2" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-base">{item.name}</span>
                    {getClassificationIcon(item.classification)}
                  </div>
                  
                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-700 dark:text-gray-300 flex-wrap">
                    <span>{t('qty')}: {item.quantity}</span>
                    {item.weight && <span>• {item.weight} {t('kg')}</span>}
                    {item.source && (
                      <>
                        <span>•</span>
                        {getSourceBadge(item.source)}
                      </>
                    )}
                    {item.orderNumber && (
                      <span>• {item.orderNumber}</span>
                    )}
                    {item.customerName && (
                      <span>• {item.customerName}</span>
                    )}
                    {item.purchaseOrderId && item.orderItems && item.orderItems.length > 0 && (
                      <>
                        <span>•</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 px-1.5 -ml-1 text-xs hover:bg-muted"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleItemExpanded(item.id);
                          }}
                          title={expandedItems.has(item.id) ? t('hideItems') : t('showItems')}
                        >
                          <ChevronDown className={`h-3 w-3 transition-transform ${expandedItems.has(item.id) ? '' : '-rotate-90'}`} />
                          <span className="ml-1">{item.orderItems.length} {t('items')}</span>
                        </Button>
                      </>
                    )}
                  </div>
                  
                  {item.purchaseOrderId && item.orderItems && item.orderItems.length > 0 && expandedItems.has(item.id) && (
                    <div className="mt-2 ml-4 border-l-2 border-muted pl-3 space-y-1">
                      {item.orderItems.map((orderItem: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-900 dark:text-gray-100">{orderItem.name}</span>
                            {orderItem.sku && (
                              <span className="text-gray-600 dark:text-gray-400">({orderItem.sku})</span>
                            )}
                          </div>
                          <span className="text-gray-700 dark:text-gray-300">{t('qty')}: {orderItem.quantity}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* Mobile: Single action button (56px touch target for older employees) */}
            <div className="lg:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-14 w-14 p-0 rounded-xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-6 w-6" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>{t('setClassification')}</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      updateItemClassificationMutation.mutate({ id: item.id, classification: 'general' });
                    }}
                  >
                    <Flag className="h-4 w-4 text-green-500 fill-green-500 mr-2" />
                    {t('generalGoods')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      updateItemClassificationMutation.mutate({ id: item.id, classification: 'sensitive' });
                    }}
                  >
                    <Flag className="h-4 w-4 text-red-500 fill-red-500 mr-2" />
                    {t('sensitiveGoods')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      updateItemClassificationMutation.mutate({ id: item.id, classification: null });
                    }}
                  >
                    <div className="h-4 w-4 border-2 border-dashed border-gray-400 rounded mr-2" />
                    {t('none')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditItem(item); }}>
                    <Edit className="h-4 w-4 mr-2" />
                    {t('edit')}
                  </DropdownMenuItem>
                  {item.purchaseOrderId && item.orderItems && item.orderItems.length > 0 && (
                    <DropdownMenuItem
                      onClick={(e) => { e.stopPropagation(); unpackItemMutation.mutate(item.id); }}
                      className="text-primary"
                    >
                      <Package2 className="h-4 w-4 mr-2" />
                      {t('unpackAllItems')}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'item', id: item.id, name: item.name }); }}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('delete')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* Desktop: Multiple action buttons */}
            <div className="hidden lg:flex gap-1 items-start">
              {item.purchaseOrderId && item.orderItems && item.orderItems.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        unpackItemMutation.mutate(item.id);
                      }}
                      className="text-primary"
                    >
                      <Package2 className="h-4 w-4 mr-2" />
                      {t('unpackAllItems')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditItem(item);
                      }}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      {t('editPackage')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget({ type: 'item', id: item.id, name: item.name });
                      }}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('deletePackage')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {item.classification === 'sensitive' ? (
                      <Flag className="h-4 w-4 text-red-500 fill-red-500" />
                    ) : item.classification === 'general' ? (
                      <Flag className="h-4 w-4 text-green-500 fill-green-500" />
                    ) : (
                      <div className="h-4 w-4 border-2 border-dashed border-gray-400 rounded" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{t('setClassification')}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      updateItemClassificationMutation.mutate({
                        id: item.id,
                        classification: null
                      });
                    }}
                  >
                    <div className="h-4 w-4 border-2 border-dashed border-gray-400 rounded mr-2" />
                    {t('none')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      updateItemClassificationMutation.mutate({
                        id: item.id,
                        classification: 'general'
                      });
                    }}
                  >
                    <Flag className="h-4 w-4 text-green-500 fill-green-500 mr-2" />
                    {t('generalGoods')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      updateItemClassificationMutation.mutate({
                        id: item.id,
                        classification: 'sensitive'
                      });
                    }}
                  >
                    <Flag className="h-4 w-4 text-red-500 fill-red-500 mr-2" />
                    {t('sensitiveGoods')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button 
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditItem(item);
                }}
                className="h-8 px-2"
              >
                <Edit className="h-4 w-4" />
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={(e) => e.stopPropagation()}
                    className="h-8 px-2"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    className="text-red-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget({ type: 'item', id: item.id, name: item.name });
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('delete')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
});
ItemCard.displayName = 'ItemCard';

export default function AtWarehouse() {
  const { t } = useTranslation('imports');
  const [isAddCustomItemOpen, setIsAddCustomItemOpen] = useState(false);
  const [isEditCustomItemOpen, setIsEditCustomItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CustomItem | null>(null);
  const [isCreateConsolidationOpen, setIsCreateConsolidationOpen] = useState(false);
  const [isConsolidationDrawerOpen, setIsConsolidationDrawerOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ImportPurchase | null>(null);
  const [showUnpackDialog, setShowUnpackDialog] = useState(false);
  const [showReceiveDialog, setShowReceiveDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [statusTarget, setStatusTarget] = useState<{ type: 'order' | 'item', id: number, currentStatus: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'item' | 'consolidation', id: number, name: string } | null>(null);
  const [moveToConsolidationItem, setMoveToConsolidationItem] = useState<{ id: number, name: string } | null>(null);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [selectedConsolidationTracking, setSelectedConsolidationTracking] = useState<{id: number, name: string, trackingNumbers: string[]} | null>(null);
  const [bulkMoveItems, setBulkMoveItems] = useState<Set<number>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<number>>(() => {
    const saved = localStorage.getItem('atWarehouse_expandedItems');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(() => {
    const saved = localStorage.getItem('atWarehouse_expandedOrders');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [selectedItemsForAI, setSelectedItemsForAI] = useState<Set<number>>(new Set());
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [itemSortBy, setItemSortBy] = useState<string>("newest");
  const [itemSearchTerm, setItemSearchTerm] = useState<string>("");
  const [bulkSelectedItems, setBulkSelectedItems] = useState<Set<number>>(new Set());
  const [itemSourceFilter, setItemSourceFilter] = useState<string>("all");
  const [itemClassificationFilter, setItemClassificationFilter] = useState<string>("all");
  const [manualItemOrder, setManualItemOrder] = useState<string[]>([]);
  const [extractedItems, setExtractedItems] = useState<Array<{
    name: string;
    source: string;
    orderNumber: string;
    quantity: number;
    unitPrice: number;
    classification: string;
  }>>([]);
  const [isProcessingScreenshot, setIsProcessingScreenshot] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch purchase orders at warehouse
  const { data: atWarehouseOrders = [], isLoading: isLoadingOrders } = useQuery<ImportPurchase[]>({
    queryKey: ['/api/imports/purchases/at-warehouse'],
    refetchOnWindowFocus: false, // Prevent glitches on refocus
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch ALL purchase orders for tracking number lookup
  const { data: allPurchaseOrders = [] } = useQuery<ImportPurchase[]>({
    queryKey: ['/api/imports/purchases'],
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch all items (unpacked + custom)
  const { data: customItems = [], isLoading: isLoadingItems } = useQuery<CustomItem[]>({
    queryKey: ['/api/imports/custom-items'],
    refetchOnWindowFocus: false, // Prevent glitches on refocus
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: unpackedItems = [] } = useQuery<CustomItem[]>({
    queryKey: ['/api/imports/unpacked-items'],
    refetchOnWindowFocus: false, // Prevent glitches on refocus
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Use customItems as single source of truth (unpacked items are already included in customItems)
  const allItems = customItems.map(item => ({ 
    ...item, 
    uniqueId: `item-${item.id}`, 
    isCustom: item.orderNumber ? !item.orderNumber.startsWith('PO-') : true 
  }));

  // Sort and filter items
  const getFilteredAndSortedItems = () => {
    let filtered = allItems.filter(item => item.status !== 'consolidated');
    
    // Apply search filter
    if (itemSearchTerm) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(itemSearchTerm.toLowerCase()) ||
        item.orderNumber?.toLowerCase().includes(itemSearchTerm.toLowerCase()) ||
        item.source?.toLowerCase().includes(itemSearchTerm.toLowerCase()) ||
        item.customerName?.toLowerCase().includes(itemSearchTerm.toLowerCase())
      );
    }
    
    // Apply source filter
    if (itemSourceFilter !== "all") {
      filtered = filtered.filter(item => item.source?.toLowerCase() === itemSourceFilter);
    }
    
    // Apply classification filter
    if (itemClassificationFilter === "general") {
      filtered = filtered.filter(item => item.classification === "general");
    } else if (itemClassificationFilter === "sensitive") {
      filtered = filtered.filter(item => item.classification === "sensitive");
    } else if (itemClassificationFilter === "unclassified") {
      filtered = filtered.filter(item => !item.classification);
    }
    
    
    // Apply sorting
    if (itemSortBy === 'custom' && manualItemOrder.length > 0) {
      // Use manual order
      const orderMap = new Map(manualItemOrder.map((id, index) => [id, index]));
      filtered.sort((a, b) => {
        const aIndex = orderMap.get(a.uniqueId) ?? Number.MAX_VALUE;
        const bIndex = orderMap.get(b.uniqueId) ?? Number.MAX_VALUE;
        return aIndex - bIndex;
      });
    } else {
      // Apply regular sorting
      switch (itemSortBy) {
        case 'newest':
          filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          break;
        case 'oldest':
          filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          break;
        case 'sensitive-first':
          filtered.sort((a, b) => {
            if (a.classification === 'sensitive' && b.classification !== 'sensitive') return -1;
            if (a.classification !== 'sensitive' && b.classification === 'sensitive') return 1;
            return 0;
          });
          break;
        case 'general-first':
          filtered.sort((a, b) => {
            if (a.classification === 'general' && b.classification !== 'general') return -1;
            if (a.classification !== 'general' && b.classification === 'general') return 1;
            return 0;
          });
          break;
        case 'quantity-high':
          filtered.sort((a, b) => b.quantity - a.quantity);
          break;
        case 'quantity-low':
          filtered.sort((a, b) => a.quantity - b.quantity);
          break;
        case 'weight-high':
          filtered.sort((a, b) => parseFloat(b.weight || '0') - parseFloat(a.weight || '0'));
          break;
        case 'weight-low':
          filtered.sort((a, b) => parseFloat(a.weight || '0') - parseFloat(b.weight || '0'));
          break;
        case 'name-asc':
          filtered.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case 'name-desc':
          filtered.sort((a, b) => b.name.localeCompare(a.name));
          break;
        default:
          break;
      }
    }
    
    return filtered;
  };
  
  const sortedAndFilteredItems = useMemo(() => getFilteredAndSortedItems(), [
    allItems, 
    itemSearchTerm, 
    itemSortBy, 
    manualItemOrder,
    itemSourceFilter,
    itemClassificationFilter
  ]);

  // Filter orders by location
  const filteredOrders = locationFilter === "all" 
    ? atWarehouseOrders 
    : atWarehouseOrders.filter(order => order.location === locationFilter);

  // Fetch consolidations
  const { data: consolidations = [], isLoading: isLoadingConsolidations } = useQuery<Consolidation[]>({
    queryKey: ['/api/imports/consolidations'],
  });
  
  // Fetch warehouses
  const { data: warehouses = [] } = useQuery<Array<{ id: string; name: string; code: string; address?: string }>>({
    queryKey: ['/api/warehouses'],
  });
  
  // Fetch consolidation items for expanded consolidations - expanded by default
  const [expandedConsolidations, setExpandedConsolidations] = useState<Set<string>>(new Set());
  const [consolidationItems, setConsolidationItems] = useState<Record<string, any[]>>({});
  const [editingConsolidation, setEditingConsolidation] = useState<any>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("");
  const [warehouseComboOpen, setWarehouseComboOpen] = useState(false);
  const [isAdditionalDetailsOpen, setIsAdditionalDetailsOpen] = useState(false);
  const [consolidationShippingMethod, setConsolidationShippingMethod] = useState<string>("");

  // Unpack purchase order mutation
  const unpackMutation = useMutation({
    mutationFn: async (purchaseId: number) => {
      return apiRequest('POST', '/api/imports/purchases/unpack', { purchaseId });
    },
    onSuccess: () => {
      toast({
        title: t('success'),
        description: t('orderUnpackedSuccessfully'),
      });
      setShowUnpackDialog(false);
      setSelectedOrder(null);
      queryClient.invalidateQueries({ queryKey: ['/api/imports/purchases/at-warehouse'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/unpacked-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/custom-items'] });
    },
    onError: (error: any) => {
      toast({
        title: t('error'),
        description: error.message || t('failedToUnpackOrder'),
        variant: "destructive",
      });
    },
  });

  // Receive without unpacking mutation
  const receiveMutation = useMutation({
    mutationFn: async (purchaseId: number) => {
      return apiRequest('POST', '/api/imports/purchases/receive', { purchaseId });
    },
    onSuccess: () => {
      toast({
        title: t('success'),
        description: t('receivedAsPackageSuccess'),
      });
      setShowReceiveDialog(false);
      setSelectedOrder(null);
      queryClient.invalidateQueries({ queryKey: ['/api/imports/purchases/at-warehouse'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/custom-items'] });
    },
    onError: (error: any) => {
      toast({
        title: t('error'),
        description: error.message || t('failedToReceiveOrder'),
        variant: "destructive",
      });
    },
  });

  // Update purchase order status mutation
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      return apiRequest('PATCH', `/api/imports/purchases/${id}`, { status });
    },
    onSuccess: () => {
      toast({
        title: t('success'),
        description: t('orderStatusUpdatedSuccess'),
      });
      setShowStatusDialog(false);
      setStatusTarget(null);
      queryClient.invalidateQueries({ queryKey: ['/api/imports/purchases/at-warehouse'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/purchases'] });
    },
    onError: (error: any) => {
      toast({
        title: t('error'),
        description: error.message || t('failedToUpdateOrderStatus'),
        variant: "destructive",
      });
    },
  });

  // Update custom item status mutation
  const updateItemStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      return apiRequest('PATCH', `/api/imports/custom-items/${id}`, { status });
    },
    onSuccess: () => {
      toast({
        title: t('success'),
        description: t('itemStatusUpdatedSuccess'),
      });
      setShowStatusDialog(false);
      setStatusTarget(null);
      queryClient.invalidateQueries({ queryKey: ['/api/imports/custom-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/unpacked-items'] });
    },
    onError: (error: any) => {
      toast({
        title: t('error'),
        description: error.message || t('failedToUpdateItemStatus'),
        variant: "destructive",
      });
    },
  });

  // Update item classification mutation
  const updateItemClassificationMutation = useMutation({
    mutationFn: async ({ id, classification }: { id: number, classification: string | null }) => {
      return apiRequest('PATCH', `/api/imports/custom-items/${id}`, { classification });
    },
    onSuccess: () => {
      toast({
        title: t('success'),
        description: t('itemClassificationUpdatedSuccess'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/custom-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/unpacked-items'] });
    },
    onError: (error: any) => {
      toast({
        title: t('error'),
        description: error.message || t('failedToUpdateItemClassification'),
        variant: "destructive",
      });
    },
  });

  // Quick Ship mutation - Create shipment from consolidation
  const quickShipMutation = useMutation({
    mutationFn: async (consolidationId: number) => {
      // Get the consolidation details
      const consolidation = consolidations.find(c => c.id === consolidationId);
      if (!consolidation) throw new Error('Consolidation not found');
      
      // Create shipment with basic details
      return apiRequest('/api/imports/shipments', 'POST', {
        consolidationId,
        carrier: 'To be determined',
        trackingNumber: `PENDING-${consolidationId}`,
        origin: consolidation.warehouse || 'China',
        destination: consolidation.location || 'Czech Republic',
        status: 'pending',
        shippingCost: '0',
        insuranceValue: '0',
        shipmentName: consolidation.name,
        shipmentType: consolidation.shippingMethod || 'standard',
        notes: 'Quick Ship - Created from Consolidation'
      });
    },
    onSuccess: () => {
      toast({
        title: t('success'),
        description: t('shipmentCreatedMovedToTransit'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/consolidations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments'] });
    },
    onError: (error: any) => {
      toast({
        title: t('error'),
        description: error.message || t('failedToCreateShipmentError'),
        variant: "destructive",
      });
    },
  });

  // AI auto-classification mutation using DeepSeek AI
  const aiClassifyMutation = useMutation({
    mutationFn: async (itemIds: number[]) => {
      return apiRequest('POST', '/api/imports/items/auto-classify', { itemIds });
    },
    onSuccess: (data: any) => {
      toast({
        title: t('aiClassificationComplete'),
        description: data?.message || t('itemsAutoClassified'),
      });
      setSelectedItemsForAI(new Set());
      setIsAIProcessing(false);
      queryClient.invalidateQueries({ queryKey: ['/api/imports/custom-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/unpacked-items'] });
    },
    onError: (error: any) => {
      toast({
        title: t('error'),
        description: error.message || t('autoClassifyFailed'),
        variant: "destructive",
      });
      setIsAIProcessing(false);
    },
  });

  // Create custom item mutation
  const createCustomItemMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/imports/custom-items', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/custom-items'] });
      setIsAddCustomItemOpen(false);
      toast({ title: t('success'), description: t('customItemAdded') });
    },
    onError: () => {
      toast({ title: t('error'), description: t('customItemAddFailed'), variant: "destructive" });
    }
  });

  // Update custom item mutation
  const updateCustomItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      return apiRequest('PATCH', `/api/imports/custom-items/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/custom-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/unpacked-items'] });
      setIsEditCustomItemOpen(false);
      setEditingItem(null);
      toast({ title: t('success'), description: t('itemUpdated') });
    },
    onError: () => {
      toast({ title: t('error'), description: t('itemUpdateFailed'), variant: "destructive" });
    }
  });

  // Delete custom item mutation
  const deleteCustomItemMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/imports/custom-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/custom-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/unpacked-items'] });
      toast({ title: t('success'), description: t('itemDeleted') });
      setDeleteTarget(null);
    },
    onError: () => {
      toast({ title: t('error'), description: t('itemDeleteFailed'), variant: "destructive" });
    }
  });

  // Unpack custom item mutation
  const unpackItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const response = await apiRequest('POST', `/api/imports/custom-items/${itemId}/unpack`);
      return response;
    },
    onSuccess: (data: any) => {
      toast({
        title: t('success'),
        description: t('itemsUnpacked', { count: data.unpackedItems?.length || 0 }),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/custom-items'] });
      
      // Animate the unpacked items
      const container = document.querySelector('[data-testid="available-items-container"]');
      if (container) {
        container.classList.add('unpack-animation');
        setTimeout(() => {
          container.classList.remove('unpack-animation');
        }, 1000);
      }
    },
    onError: (error: any) => {
      toast({
        title: t('error'),
        description: error.message || t('unpackFailed'),
        variant: "destructive",
      });
    }
  });

  // Fetch items for a consolidation
  const fetchConsolidationItems = async (consolidationId: string) => {
    try {
      const response = await fetch(`/api/imports/consolidations/${consolidationId}/items`);
      if (response.ok) {
        const items = await response.json();
        // Items are already sorted by the backend (by when they were added)
        setConsolidationItems(prev => ({ ...prev, [consolidationId]: items }));
        return items; // Return the items for immediate use
      }
    } catch (error) {
      console.error('Failed to fetch consolidation items:', error);
    }
    return [];
  };
  
  // Auto-expand and fetch items for active consolidations on mount
  useEffect(() => {
    const activeConsolidations = consolidations.filter(c => 
      c.status !== 'shipped' && c.status !== 'delivered'
    );
    
    // Only update if there are active consolidations and they're not already expanded
    if (activeConsolidations.length > 0) {
      const newExpandedIds = activeConsolidations.map(c => c.id);
      setExpandedConsolidations(prev => {
        const currentIds = Array.from(prev);
        const needsUpdate = newExpandedIds.some(id => !currentIds.includes(id));
        if (needsUpdate) {
          // Fetch items for newly expanded consolidations
          newExpandedIds.forEach(id => {
            const consolidation = consolidations.find(c => c.id === id);
            if (consolidation && consolidation.itemCount > 0 && !consolidationItems[id]) {
              fetchConsolidationItems(id);
            }
          });
          return new Set(newExpandedIds);
        }
        return prev;
      });
    }
  }, [consolidations.length]); // Only depend on length to avoid infinite loops
  
  // Auto-select the first warehouse (main warehouse) when warehouses load
  useEffect(() => {
    if (warehouses.length > 0 && !selectedWarehouse) {
      setSelectedWarehouse(warehouses[0].id);
    }
  }, [warehouses.length]); // Only depend on length to avoid re-running on every warehouse change
  
  // Toggle consolidation expansion
  const toggleConsolidationExpanded = (consolidationId: string) => {
    const newExpanded = new Set(expandedConsolidations);
    if (newExpanded.has(consolidationId)) {
      newExpanded.delete(consolidationId);
    } else {
      newExpanded.add(consolidationId);
      // Fetch items when expanding
      if (!consolidationItems[consolidationId]) {
        fetchConsolidationItems(consolidationId);
      }
    }
    setExpandedConsolidations(newExpanded);
  };

  // Generate smart consolidation name based on shipping method and warehouse
  const generateConsolidationName = () => {
    const selectedWh = warehouses.find(w => w.id === selectedWarehouse);
    if (!consolidationShippingMethod || !selectedWh) {
      return t('newConsolidation');
    }

    // Get shipping method prefix
    const methodPrefixes: Record<string, string> = {
      general_air_ddp: "GA-DDP",
      sensitive_air_ddp: "SA-DDP",
      general_express: "GEN-EXP",
      sensitive_express: "SEN-EXP",
      general_railway: "GEN-RAIL",
      sensitive_railway: "SEN-RAIL",
      general_sea: "GEN-SEA",
      sensitive_sea: "SEN-SEA"
    };

    // Get warehouse code (from selected warehouse)
    const warehouseCode = selectedWh.code || selectedWh.name?.substring(0, 3).toUpperCase() || "WH";
    
    // Get date code (MMDD)
    const now = new Date();
    const dateCode = `${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    
    const methodPrefix = methodPrefixes[consolidationShippingMethod] || "CONSOL";
    
    return `${methodPrefix}-${warehouseCode}-${dateCode}`;
  };

  // Simple add items mutation with optimized cache updates
  const addItemsToConsolidationMutation = useMutation({
    mutationFn: async ({ consolidationId, itemIds }: { consolidationId: string, itemIds: string[] }) => {
      return apiRequest('POST', `/api/imports/consolidations/${consolidationId}/items`, { itemIds });
    },
    onMutate: async ({ consolidationId, itemIds }) => {
      // Cancel outgoing refetches to prevent overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['/api/imports/custom-items'] });
      await queryClient.cancelQueries({ queryKey: ['/api/imports/consolidations'] });
      
      // Save current state for rollback
      const previousItems = queryClient.getQueryData(['/api/imports/custom-items']);
      const previousConsolidations = queryClient.getQueryData(['/api/imports/consolidations']);
      
      // Optimistically remove the item from available items
      queryClient.setQueryData(['/api/imports/custom-items'], (old: any) => 
        old ? old.filter((item: any) => !itemIds.includes(item.id)) : []
      );
      
      // Optimistically update consolidation count
      queryClient.setQueryData(['/api/imports/consolidations'], (old: any) => 
        old ? old.map((c: any) => 
          c.id === consolidationId 
            ? { ...c, itemCount: (c.itemCount || 0) + itemIds.length }
            : c
        ) : []
      );
      
      return { previousItems, previousConsolidations };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousItems) {
        queryClient.setQueryData(['/api/imports/custom-items'], context.previousItems);
      }
      if (context?.previousConsolidations) {
        queryClient.setQueryData(['/api/imports/consolidations'], context.previousConsolidations);
      }
      toast({ title: t('error'), description: t('itemAddFailed'), variant: "destructive" });
    },
    onSettled: (_, __, { consolidationId }) => {
      // Refetch to ensure consistency but with a small delay to prevent flicker
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/imports/custom-items'] });
        queryClient.invalidateQueries({ queryKey: ['/api/imports/consolidations'] });
        queryClient.invalidateQueries({ queryKey: ['/api/imports/unpacked-items'] });
        
        if (expandedConsolidations.has(consolidationId)) {
          fetchConsolidationItems(consolidationId);
        }
      }, 500);
    },
    onSuccess: () => {
      toast({ title: t('success'), description: t('itemAddedToConsolidation') });
    }
  });

  // Create consolidation mutation
  const createConsolidationMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/imports/consolidations', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/consolidations'] });
      setIsCreateConsolidationOpen(false);
      toast({ title: t('success'), description: t('consolidationCreated') });
    },
    onError: () => {
      toast({ title: t('error'), description: t('consolidationCreateFailed'), variant: "destructive" });
    }
  });

  // Delete consolidation mutation
  const deleteConsolidationMutation = useMutation({
    mutationFn: async (consolidationId: string) => {
      return apiRequest('DELETE', `/api/imports/consolidations/${consolidationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/consolidations'] });
      toast({ title: t('success'), description: t('consolidationDeleted') });
      setDeleteTarget(null);
    },
    onError: () => {
      toast({ title: t('error'), description: t('consolidationDeleteFailed'), variant: "destructive" });
    }
  });
  
  // Remove item from consolidation mutation with optimistic updates
  const removeItemFromConsolidationMutation = useMutation({
    mutationFn: async ({ consolidationId, itemId }: { consolidationId: string, itemId: string }) => {
      return apiRequest('DELETE', `/api/imports/consolidations/${consolidationId}/items/${itemId}`);
    },
    onMutate: async ({ consolidationId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/imports/consolidations'] });
      
      // Snapshot the previous values
      const previousConsolidations = queryClient.getQueryData(['/api/imports/consolidations']);
      
      // Optimistically update consolidations to show decreased item count
      queryClient.setQueryData(['/api/imports/consolidations'], (old: any) => {
        if (!old) return old;
        return old.map((consol: any) => {
          if (consol.id === consolidationId) {
            return {
              ...consol,
              itemCount: Math.max(0, (consol.itemCount || 0) - 1)
            };
          }
          return consol;
        });
      });
      
      // Return a context object with the snapshotted values
      return { previousConsolidations };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousConsolidations) {
        queryClient.setQueryData(['/api/imports/consolidations'], context.previousConsolidations);
      }
      toast({ title: t('error'), description: t('itemRemoveFailed'), variant: "destructive" });
    },
    onSettled: (_, __, { consolidationId, itemId }) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['/api/imports/consolidations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/custom-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/unpacked-items'] });
      // Refresh consolidation items
      fetchConsolidationItems(consolidationId);
      
      // Add the removed item to the bottom of manual order list
      setTimeout(() => {
        const itemUniqueId = `item-${itemId}`;
        
        // Switch to custom sorting and add item to bottom
        setItemSortBy('custom');
        setManualItemOrder(prev => {
          // Get current items in order, or create order from current sorted items if none exists
          let currentOrder = prev.length > 0 ? prev : sortedAndFilteredItems.map(item => item.uniqueId);
          
          // Remove the item if it already exists (shouldn't happen but safety)
          currentOrder = currentOrder.filter(id => id !== itemUniqueId);
          
          // Add to bottom
          const newOrder = [...currentOrder, itemUniqueId];
          localStorage.setItem('atWarehouse_manualItemOrder', JSON.stringify(newOrder));
          return newOrder;
        });
      }, 100);
    },
    onSuccess: () => {
      toast({ title: t('success'), description: t('itemRemovedFromConsolidation') });
    }
  });
  
  // Ship consolidation mutation
  const shipConsolidationMutation = useMutation({
    mutationFn: async ({ id, trackingNumber, carrier }: { id: number, trackingNumber?: string, carrier?: string }) => {
      return apiRequest('POST', `/api/imports/consolidations/${id}/ship`, { trackingNumber, carrier });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/consolidations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/custom-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/pending'] });
      toast({ title: t('success'), description: t('consolidationShipped') });
    },
    onError: () => {
      toast({ title: t('error'), description: t('consolidationShipFailed'), variant: "destructive" });
    }
  });
  
  // Update consolidation mutation  
  const updateConsolidationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      return apiRequest('PATCH', `/api/imports/consolidations/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/consolidations'] });
      toast({ title: t('success'), description: t('consolidationUpdated') });
      setEditingConsolidation(null);
    },
    onError: () => {
      toast({ title: t('error'), description: t('consolidationUpdateFailed'), variant: "destructive" });
    }
  });

  const handleUnpack = (order: ImportPurchase) => {
    setSelectedOrder(order);
    setShowUnpackDialog(true);
  };
  
  // Handle ship consolidation
  const handleShipConsolidation = (consolidation: any) => {
    // For now, directly ship without dialog
    shipConsolidationMutation.mutate({ id: consolidation.id });
  };
  
  // Handle delete consolidation
  const handleDeleteConsolidation = (consolidation: any) => {
    setDeleteTarget({ 
      type: 'consolidation', 
      id: consolidation.id, 
      name: consolidation.name 
    });
  };

  const handleReceive = (order: ImportPurchase) => {
    setSelectedOrder(order);
    setShowReceiveDialog(true);
  };

  const confirmUnpack = () => {
    if (selectedOrder) {
      unpackMutation.mutate(selectedOrder.id);
    }
  };

  const confirmReceive = () => {
    if (selectedOrder) {
      receiveMutation.mutate(selectedOrder.id);
    }
  };

  const handleEditItem = (item: CustomItem) => {
    setEditingItem(item);
    setIsEditCustomItemOpen(true);
  };

  const handleStatusChange = (type: 'order' | 'item', id: number, currentStatus: string) => {
    setStatusTarget({ type, id, currentStatus });
    setShowStatusDialog(true);
  };

  const confirmStatusChange = (newStatus: string) => {
    if (statusTarget) {
      if (statusTarget.type === 'order') {
        updateOrderStatusMutation.mutate({ id: statusTarget.id, status: newStatus });
      } else {
        updateItemStatusMutation.mutate({ id: statusTarget.id, status: newStatus });
      }
    }
  };

  const handleDelete = () => {
    if (deleteTarget) {
      if (deleteTarget.type === 'item') {
        deleteCustomItemMutation.mutate(deleteTarget.id);
      } else {
        deleteConsolidationMutation.mutate(deleteTarget.id);
      }
    }
  };

  const toggleItemExpanded = (itemId: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
    // Save to localStorage
    localStorage.setItem('atWarehouse_expandedItems', JSON.stringify(Array.from(newExpanded)));
  };

  const toggleOrderExpanded = (orderId: number) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
    // Save to localStorage
    localStorage.setItem('atWarehouse_expandedOrders', JSON.stringify(Array.from(newExpanded)));
  };
  
  // Expand/Collapse all functions
  const expandAllItems = () => {
    const itemsWithSubItems = allItems.filter(item => 
      item.purchaseOrderId && item.orderItems && item.orderItems.length > 0
    );
    const allIds = new Set(itemsWithSubItems.map(item => item.id));
    setExpandedItems(allIds);
    localStorage.setItem('atWarehouse_expandedItems', JSON.stringify(Array.from(allIds)));
  };
  
  const collapseAllItems = () => {
    setExpandedItems(new Set());
    localStorage.setItem('atWarehouse_expandedItems', JSON.stringify([]));
  };

  const handleCreateCustomItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // If we have extracted items, add them all
    if (extractedItems.length > 0) {
      for (const item of extractedItems) {
        createCustomItemMutation.mutate({
          ...item,
          weight: 0,
          dimensions: null,
          trackingNumber: null,
          notes: null,
          customerName: null,
          customerEmail: null,
        });
      }
      setExtractedItems([]);
    } else {
      // Otherwise, add single item from form
      const formData = new FormData(e.currentTarget);
      const data = {
        name: formData.get('name') as string,
        source: formData.get('source') as string,
        orderNumber: formData.get('orderNumber') as string || null,
        quantity: parseInt(formData.get('quantity') as string) || 1,
        unitPrice: parseFloat(formData.get('unitPrice') as string) || 0,
        classification: formData.get('classification') as string || null,
        notes: formData.get('notes') as string || null,
        weight: 0,
        dimensions: null,
        trackingNumber: null,
        customerName: null,
        customerEmail: null,
      };
      createCustomItemMutation.mutate(data);
    }
  };

  const handleScreenshotUpload = async (file: File) => {
    setIsProcessingScreenshot(true);
    try {
      const formData = new FormData();
      formData.append('screenshot', file);
      
      const response = await fetch('/api/imports/extract-from-screenshot', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error('Failed to process screenshot');
      
      const { items } = await response.json();
      setExtractedItems(items);
      toast({
        title: t('success'),
        description: `${t('extractedFromScreenshot', { count: items.length })}`,
      });
    } catch (error) {
      toast({
        title: t('error'),
        description: t('screenshotProcessFailed'),
        variant: "destructive",
      });
    } finally {
      setIsProcessingScreenshot(false);
    }
  };

  const removeExtractedItem = (index: number) => {
    setExtractedItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateExtractedItem = (index: number, field: string, value: any) => {
    setExtractedItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const handleUpdateCustomItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingItem) return;
    
    const formData = new FormData(e.currentTarget);
    
    const data = {
      name: formData.get('name') as string,
      source: formData.get('source') as string,
      orderNumber: formData.get('orderNumber') as string || null,
      quantity: parseInt(formData.get('quantity') as string) || 1,
      unitPrice: parseFloat(formData.get('unitPrice') as string) || 0,
      weight: parseFloat(formData.get('weight') as string) || 0,
      dimensions: formData.get('dimensions') as string || null,
      trackingNumber: formData.get('trackingNumber') as string || null,
      notes: formData.get('notes') as string || null,
      customerName: formData.get('customerName') as string || null,
      customerEmail: formData.get('customerEmail') as string || null,
      status: formData.get('status') as string,
      classification: formData.get('classification') as string || null,
    };
    
    updateCustomItemMutation.mutate({ id: editingItem.id, data });
  };

  const handleCreateConsolidation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Get warehouse address to use as location
    const selectedWh = warehouses.find(w => w.id === selectedWarehouse);
    const warehouseAddress = selectedWh?.address || selectedWh?.name || '';
    
    const data = {
      name: generateConsolidationName(), // Auto-generated name
      location: warehouseAddress, // Use warehouse address as location
      shippingMethod: formData.get('shippingMethod') as string,
      warehouse: formData.get('warehouse') as string,
      notes: formData.get('notes') as string || null,
      targetWeight: formData.get('targetWeight') ? parseFloat(formData.get('targetWeight') as string) : null,
      maxItems: formData.get('maxItems') ? parseInt(formData.get('maxItems') as string) : null,
    };
    
    createConsolidationMutation.mutate(data);
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const sourceId = result.source.droppableId;
    const destinationId = result.destination.droppableId;
    
    // Handle reordering within Available Items
    if (sourceId === 'available-items' && destinationId === 'available-items') {
      if (result.source.index === result.destination.index) return;
      
      const items = Array.from(sortedAndFilteredItems);
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);
      
      // Update order based on new positions
      const newOrder = items.map(item => item.uniqueId);
      setManualItemOrder(newOrder);
      setItemSortBy('custom');
      localStorage.setItem('atWarehouse_manualItemOrder', JSON.stringify(newOrder));
    }
    // Handle drops to consolidations
    else if (destinationId.startsWith('consolidation-')) {
      // Extract UUID item ID (format: "item-{uuid}")
      const itemId = result.draggableId.replace('item-', '');
      // Extract UUID consolidation ID (format: "consolidation-{uuid}")
      const consolidationId = destinationId.replace('consolidation-', '');
      
      if (itemId && consolidationId) {
        addItemsToConsolidationMutation.mutate({ consolidationId, itemIds: [itemId] });
        
        if (manualItemOrder.length > 0) {
          setManualItemOrder(prev => prev.filter(id => id !== result.draggableId));
        }
      }
    }
  };

  const getStatusBadge = (status: string) => (
    <Badge className={statusColors[status] || "bg-gray-100 text-gray-800"}>
      {status.replace('_', ' ').toUpperCase()}
    </Badge>
  );

  const getShippingMethodBadge = (method: string) => {
    const Icon = shippingMethodIcons[method] || Package;
    return (
      <Badge className={`${shippingMethodColors[method] || "bg-gray-100 text-gray-800"} flex items-center space-x-1`}>
        <Icon className="h-3 w-3" />
        <span>{method.replace('_', ' ').toUpperCase()}</span>
      </Badge>
    );
  };

  const getSourceBadge = (source: string) => {
    // Remove "SUPPLIER:" prefix if present and clean up the display text
    const cleanSource = source.replace(/^SUPPLIER:\s*/i, '').trim();
    return (
      <Badge variant="secondary" className={`text-xs ${sourceColors[cleanSource.toLowerCase()] || sourceColors.other}`}>
        {cleanSource.toUpperCase()}
      </Badge>
    );
  };

  const getClassificationIcon = (classification?: string | null) => {
    if (classification === 'sensitive') {
      return (
        <div className="flex items-center gap-1">
          <Flag className="h-4 w-4 text-red-500 fill-red-500" />
          <span className="text-xs font-medium text-red-600">{t('sensitive')}</span>
        </div>
      );
    } else if (classification === 'general') {
      return (
        <div className="flex items-center gap-1">
          <Flag className="h-4 w-4 text-green-500 fill-green-500" />
          <span className="text-xs font-medium text-green-600">{t('general')}</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1">
        <div className="h-4 w-4 border-2 border-dashed border-gray-300 rounded" />
        <span className="text-xs font-medium text-gray-500">{t('unclassified')}</span>
      </div>
    );
  };

  const getClassificationBadge = (classification?: string) => {
    if (classification === 'sensitive') {
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          <Shield className="h-3 w-3 mr-1" />
          {t('sensitive')}
        </Badge>
      );
    }
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        <Flag className="h-3 w-3 mr-1" />
        {t('general')}
      </Badge>
    );
  };

  const isLoading = isLoadingItems || isLoadingConsolidations || isLoadingOrders;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 md:pb-6 overflow-x-hidden">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b md:relative md:border-0 mb-4 md:mb-6">
        <div className="p-4 md:p-6 space-y-3 md:space-y-0">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
            <div>
              <h1 className="text-xl md:text-3xl font-bold">{t('consolidation')}</h1>
              <p className="text-xs md:text-sm text-muted-foreground">{t('processIncomingOrders')}</p>
            </div>
            <div className="flex items-center gap-2 md:gap-4 flex-wrap">
              {/* Location Filter */}
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-[140px] md:w-[150px] h-9" data-testid="select-location-filter">
                  <SelectValue placeholder={t('allLocations')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allLocations')}</SelectItem>
                  <SelectItem value="China">🇨🇳 {t('china')}</SelectItem>
                  <SelectItem value="USA">🇺🇸 {t('usa')}</SelectItem>
                  <SelectItem value="Vietnam">🇻🇳 {t('vietnam')}</SelectItem>
                  <SelectItem value="Europe">🇪🇺 {t('europe')}</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex gap-2">
          <Dialog open={isAddCustomItemOpen} onOpenChange={setIsAddCustomItemOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-add-custom-item" className="h-9">
                <ShoppingCart className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">{t('addCustomItem')}</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('addCustomItem')}</DialogTitle>
                <DialogDescription>
                  {t('addItemsFromExternal')}
                </DialogDescription>
              </DialogHeader>
              {/* AI Screenshot Upload Section */}
              <div className="mb-4 p-4 border-2 border-dashed rounded-lg bg-muted/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Camera className="h-5 w-5 text-primary" />
                    <Label className="text-base font-semibold">{t('aiScreenshotReader')}</Label>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Pinduoduo / Taobao
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {t('uploadScreenshotTaobao')}
                </p>
                <div className="flex items-center space-x-2">
                  <Input
                    type="file"
                    accept="image/*"
                    className="flex-1"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleScreenshotUpload(file);
                    }}
                    disabled={isProcessingScreenshot}
                  />
                  {isProcessingScreenshot && (
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                      <span>{t('processing')}</span>
                    </div>
                  )}
                </div>
              </div>

              <form onSubmit={handleCreateCustomItem} className="space-y-4">
                {/* Extracted Items Table */}
                {extractedItems.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-base font-semibold">{t('extractedItems', { count: extractedItems.length })}</Label>
                    <div className="border rounded-lg overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('itemName')}</TableHead>
                            <TableHead>{t('platform')}</TableHead>
                            <TableHead>{t('orderNumber')}</TableHead>
                            <TableHead>{t('qty')}</TableHead>
                            <TableHead>{t('price')}</TableHead>
                            <TableHead>{t('classification')}</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {extractedItems.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <Input
                                  value={item.name}
                                  onChange={(e) => updateExtractedItem(index, 'name', e.target.value)}
                                  className="h-8"
                                />
                              </TableCell>
                              <TableCell>
                                <Select 
                                  value={item.source} 
                                  onValueChange={(value) => updateExtractedItem(index, 'source', value)}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="taobao">{t('taobao')}</SelectItem>
                                    <SelectItem value="pinduoduo">{t('pinduoduo')}</SelectItem>
                                    <SelectItem value="1688">1688</SelectItem>
                                    <SelectItem value="other">{t('other')}</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={item.orderNumber}
                                  onChange={(e) => updateExtractedItem(index, 'orderNumber', e.target.value)}
                                  className="h-8"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => updateExtractedItem(index, 'quantity', parseInt(e.target.value))}
                                  className="h-8 w-16"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.unitPrice}
                                  onChange={(e) => updateExtractedItem(index, 'unitPrice', parseFloat(e.target.value))}
                                  className="h-8 w-20"
                                />
                              </TableCell>
                              <TableCell>
                                <Select 
                                  value={item.classification} 
                                  onValueChange={(value) => updateExtractedItem(index, 'classification', value)}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="general">{t('general')}</SelectItem>
                                    <SelectItem value="sensitive">{t('sensitive')}</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeExtractedItem(index)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* Manual Entry Form (shown when no extracted items) */}
                {extractedItems.length === 0 && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">{t('itemName')} *</Label>
                        <Input 
                          id="name" 
                          name="name" 
                          required 
                          data-testid="input-item-name"
                          placeholder={t('enterItemNamePlaceholder')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="source">{t('sourcePlatform')} *</Label>
                        <Select name="source" required>
                          <SelectTrigger data-testid="select-source">
                            <SelectValue placeholder={t('selectPlatformPlaceholder')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="taobao">{t('taobao')}</SelectItem>
                            <SelectItem value="pinduoduo">{t('pinduoduo')}</SelectItem>
                            <SelectItem value="1688">1688</SelectItem>
                            <SelectItem value="alibaba">{t('alibaba')}</SelectItem>
                            <SelectItem value="other">{t('other')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="orderNumber">{t('orderNumber')}</Label>
                        <Input 
                          id="orderNumber" 
                          name="orderNumber" 
                          data-testid="input-order-number"
                          placeholder={t('platformOrderNumberPlaceholder')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="classification">{t('goodsClassification')} *</Label>
                        <Select name="classification" defaultValue="general">
                          <SelectTrigger data-testid="select-classification">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">
                              <div className="flex items-center">
                                <Flag className="h-4 w-4 mr-2 text-green-500" />
                                {t('generalGoods')}
                              </div>
                            </SelectItem>
                            <SelectItem value="sensitive">
                              <div className="flex items-center">
                                <Shield className="h-4 w-4 mr-2 text-red-500" />
                                {t('sensitiveGoods')}
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="quantity">{t('quantity')} *</Label>
                        <Input 
                          id="quantity" 
                          name="quantity" 
                          type="number" 
                          min="1" 
                          defaultValue="1"
                          required 
                          data-testid="input-quantity"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="unitPrice">{t('unitPrice')}</Label>
                        <Input 
                          id="unitPrice" 
                          name="unitPrice" 
                          type="number" 
                          step="0.01" 
                          data-testid="input-unit-price"
                          placeholder={t('zeroDecimalPlaceholder')}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">{t('notes')}</Label>
                      <Textarea 
                        id="notes" 
                        name="notes" 
                        data-testid="textarea-notes"
                        placeholder={t('additionalNotesEllipsis')}
                        rows={2}
                      />
                    </div>
                  </>
                )}

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddCustomItemOpen(false)}>
                    {t('cancel')}
                  </Button>
                  <Button type="submit" disabled={createCustomItemMutation.isPending} data-testid="button-submit-item">
                    {createCustomItemMutation.isPending ? t('adding') : extractedItems.length > 0 ? `${t('addItems')} (${extractedItems.length})` : t('addItems')}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateConsolidationOpen} onOpenChange={setIsCreateConsolidationOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-consolidation" size="sm" className="h-9">
                <Plus className="h-4 w-4 md:mr-2" />
                <span className="hidden sm:inline">{t('createConsolidation')}</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>{t('createNewConsolidation')}</DialogTitle>
                <DialogDescription>
                  {t('createConsolidationDesc')}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateConsolidation} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="shippingMethod">Shipping Method *</Label>
                  <Select 
                    name="shippingMethod" 
                    required 
                    value={consolidationShippingMethod}
                    onValueChange={setConsolidationShippingMethod}
                  >
                      <SelectTrigger data-testid="select-shipping-method">
                        <SelectValue placeholder={t('selectShippingMethodPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general_air_ddp">
                          <div className="flex items-center space-x-2">
                            <Plane className="h-4 w-4 text-blue-600" />
                            <span>{t('generalAirDDP')}</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="sensitive_air_ddp">
                          <div className="flex items-center space-x-2">
                            <Plane className="h-4 w-4 text-orange-600" />
                            <span>{t('sensitiveAirDDP')}</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="general_express">
                          <div className="flex items-center space-x-2">
                            <Zap className="h-4 w-4 text-red-600" />
                            <span>{t('generalExpress')}</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="sensitive_express">
                          <div className="flex items-center space-x-2">
                            <Zap className="h-4 w-4 text-red-800" />
                            <span>{t('sensitiveExpress')}</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="general_railway">
                          <div className="flex items-center space-x-2">
                            <Truck className="h-4 w-4 text-green-600" />
                            <span>{t('generalRailway')}</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="sensitive_railway">
                          <div className="flex items-center space-x-2">
                            <Truck className="h-4 w-4 text-green-800" />
                            <span>{t('sensitiveRailway')}</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="general_sea">
                          <div className="flex items-center space-x-2">
                            <Ship className="h-4 w-4 text-cyan-600" />
                            <span>{t('generalSea')}</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="sensitive_sea">
                          <div className="flex items-center space-x-2">
                            <Ship className="h-4 w-4 text-cyan-800" />
                            <span>{t('sensitiveSea')}</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="warehouse">{t('destinationWarehouse')} *</Label>
                  <input type="hidden" name="warehouse" value={selectedWarehouse} required />
                  <Popover open={warehouseComboOpen} onOpenChange={setWarehouseComboOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={warehouseComboOpen}
                          className="w-full justify-between"
                          data-testid="select-warehouse"
                        >
                          {selectedWarehouse
                            ? warehouses.find((warehouse) => warehouse.id === selectedWarehouse)?.name
                            : t('selectWarehouse')}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder={t('searchWarehouse')} />
                          <CommandEmpty>{t('noWarehouseFound')}</CommandEmpty>
                          <CommandGroup>
                            <ScrollArea className="h-72">
                              {warehouses.map((warehouse) => (
                                <CommandItem
                                  key={warehouse.id}
                                  value={warehouse.name}
                                  onSelect={() => {
                                    setSelectedWarehouse(warehouse.id);
                                    setWarehouseComboOpen(false);
                                  }}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${
                                      selectedWarehouse === warehouse.id ? "opacity-100" : "opacity-0"
                                    }`}
                                  />
                                  <div className="flex flex-col">
                                    <span className="font-medium">{warehouse.name}</span>
                                    {warehouse.address && (
                                      <span className="text-xs text-muted-foreground">{warehouse.address}</span>
                                    )}
                                  </div>
                                </CommandItem>
                              ))}
                            </ScrollArea>
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                </div>

                {/* Auto-generated name preview */}
                {consolidationShippingMethod && selectedWarehouse && (
                  <div className="space-y-2">
                    <Label>{t('autoGeneratedName')}</Label>
                    <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900 rounded-md border text-sm font-mono text-slate-700 dark:text-slate-300">
                      {generateConsolidationName()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t('thisNameAutomaticallyGenerated')}
                    </p>
                  </div>
                )}

                <Collapsible open={isAdditionalDetailsOpen} onOpenChange={setIsAdditionalDetailsOpen}>
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full justify-between p-0 hover:bg-transparent"
                    >
                      <span className="text-sm font-medium">{t('additionalDetails')}</span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${isAdditionalDetailsOpen ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="targetWeight">{t('targetWeightKg')}</Label>
                        <Input 
                          id="targetWeight" 
                          name="targetWeight" 
                          type="number" 
                          step="0.1" 
                          data-testid="input-target-weight"
                          placeholder={t('maxWeight')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maxItems">{t('maxItems')}</Label>
                        <Input 
                          id="maxItems" 
                          name="maxItems" 
                          type="number" 
                          min="1" 
                          data-testid="input-max-items"
                          placeholder={t('maxItems')}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">{t('notes')}</Label>
                      <Textarea 
                        id="notes" 
                        name="notes" 
                        data-testid="textarea-consolidation-notes"
                        placeholder={t('consolidationNotes')}
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateConsolidationOpen(false)}>
                    {t('cancel')}
                  </Button>
                  <Button type="submit" disabled={createConsolidationMutation.isPending} data-testid="button-submit-consolidation">
                    {createConsolidationMutation.isPending ? t('creating') : t('createConsolidation')}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
          </div>
        </div>
      </div>
      </div>

      {/* Stats Cards */}
      <div className="px-4 md:px-6 space-y-4 md:space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {(isLoadingOrders || isLoadingItems || isLoadingConsolidations) ? (
          <>
            {[...Array(4)].map((_, i) => (
              <StatsCardSkeleton key={i} />
            ))}
          </>
        ) : (
          <>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('incomingOrders')}</CardTitle>
            <Package2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600" data-testid="text-awaiting-count">
              {filteredOrders.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalItems')}</CardTitle>
            <PackageOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600" data-testid="text-total-items">
              {allItems.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('sensitiveGoods')}</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="text-sensitive-count">
              {allItems.filter(item => item.classification === 'sensitive').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('consolidations')}</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-consolidations-count">
              {consolidations.length}
            </div>
          </CardContent>
        </Card>
          </>
        )}
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="incoming" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="incoming">
            {t('incomingOrders')} ({filteredOrders.length})
          </TabsTrigger>
          <TabsTrigger value="items">
            {t('allItems')} ({allItems.length})
          </TabsTrigger>
        </TabsList>

        {/* Incoming Orders Tab */}
        <TabsContent value="incoming" className="space-y-4">
          {isLoadingOrders ? (
            <div className="grid gap-4 animate-in fade-in-50 duration-500">
              {[...Array(3)].map((_, i) => (
                <OrderCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t('noIncomingOrdersAtWarehouse')}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {t('ordersWithConsolidationStatusHere')}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredOrders.map((order) => (
                <Card key={order.id} className="shadow-sm">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">
                            {order.location === 'Europe' && '🇪🇺'}
                            {order.location === 'USA' && '🇺🇸'}
                            {order.location === 'China' && '🇨🇳'}
                            {order.location === 'Vietnam' && '🇻🇳'}
                            {!order.location && '🌍'}
                          </span>
                          <h3 className="text-lg font-semibold">PO #{order.id.substring(0, 8).toUpperCase()} - {order.supplier}</h3>
                          {getStatusBadge(order.status)}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">{t('items')}</div>
                            <div className="font-medium">{order.items?.length || 0}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">{t('totalValue')}</div>
                            <div className="font-medium">
                              {order.paymentCurrency} {Number(order.totalPaid || 0).toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">{t('trackingNumber')}</div>
                            <div className="font-mono text-xs">{order.trackingNumber || t('na')}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">{t('arrived')}</div>
                            <div className="text-sm">
                              {order.updatedAt ? format(new Date(order.updatedAt), 'MMM dd, yyyy') : t('na')}
                            </div>
                          </div>
                        </div>

                        {order.items && order.items.length > 0 && (
                          <div className="border rounded-lg p-3 bg-muted/30">
                            <div className="text-sm font-medium mb-2">{t('orderItems')}:</div>
                            <div className="space-y-1">
                              {(expandedOrders.has(order.id) ? order.items : order.items.slice(0, 5)).map((item: any, index: number) => (
                                <div key={index} className="text-sm flex justify-between">
                                  <span className="text-muted-foreground">
                                    {item.name} {item.sku && `(${item.sku})`}
                                  </span>
                                  <span className="font-medium">{t('qty')}: {item.quantity}</span>
                                </div>
                              ))}
                              {!expandedOrders.has(order.id) && order.items.length > 5 && (
                                <button
                                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline cursor-pointer pt-1"
                                  onClick={() => toggleOrderExpanded(order.id)}
                                >
                                  {t('andMoreItems', { count: order.items.length - 5 })}
                                </button>
                              )}
                              {expandedOrders.has(order.id) && order.items.length > 5 && (
                                <button
                                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline cursor-pointer pt-1"
                                  onClick={() => toggleOrderExpanded(order.id)}
                                >
                                  {t('showLess')}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange('order', order.id, order.status)}
                          data-testid={`button-status-order-${order.id}`}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => handleReceive(order)}
                          data-testid={`button-receive-order-${order.id}`}
                        >
                          <Box className="h-4 w-4 mr-1" />
                          {t('receive')}
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => handleUnpack(order)}
                          data-testid={`button-unpack-order-${order.id}`}
                        >
                          <PackageOpen className="h-4 w-4 mr-1" />
                          {t('unpack')}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* All Items Tab with Drag & Drop */}
        <TabsContent value="items" className="space-y-3">
          {/* AI Classification - Compact bar only shown on desktop, collapsible */}
          <Collapsible className="hidden sm:block">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-2.5 cursor-pointer hover:bg-muted/70 transition-colors border">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium">{t('aiGoodsClassification')}</span>
                  {selectedItemsForAI.size > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {t('itemsSelected', { count: selectedItemsForAI.size })}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      // When items are selected, classify those; otherwise classify ALL available items
                      const itemsToClassify = selectedItemsForAI.size > 0 
                        ? Array.from(selectedItemsForAI)
                        : allItems.map(item => item.id);
                      
                      if (itemsToClassify.length === 0) {
                        toast({
                          title: t('noItemsToClassify'),
                          description: t('noAvailableItemsToClassify'),
                          variant: "destructive",
                        });
                        return;
                      }
                      
                      setIsAIProcessing(true);
                      aiClassifyMutation.mutate(itemsToClassify);
                    }}
                    disabled={isAIProcessing || aiClassifyMutation.isPending}
                    className="bg-purple-600 hover:bg-purple-700 text-white h-8"
                  >
                    {aiClassifyMutation.isPending ? (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1.5 animate-spin" />
                        {t('processing')}
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3 mr-1.5" />
                        {selectedItemsForAI.size > 0 
                          ? t('classifySelected') 
                          : t('classifyAllItems', { count: allItems.length })}
                      </>
                    )}
                  </Button>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="text-sm text-muted-foreground mt-2 px-4">
                {t('autoClassifyDescription')}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <DragDropContext onDragEnd={handleDragEnd}>
            {/* Mobile Consolidation Drawer */}
            <Drawer open={isConsolidationDrawerOpen} onOpenChange={setIsConsolidationDrawerOpen}>
              <DrawerContent className="max-h-[85vh]">
                <DrawerHeader className="pb-2">
                  <DrawerTitle className="flex items-center justify-between text-lg">
                    <span>{t('consolidations')}</span>
                    <Button
                      size="sm"
                      onClick={() => {
                        setIsConsolidationDrawerOpen(false);
                        setIsCreateConsolidationOpen(true);
                      }}
                      className="h-10"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {t('new')}
                    </Button>
                  </DrawerTitle>
                </DrawerHeader>
                <div className="px-4 pb-6 overflow-y-auto">
                  {selectedItemsForAI.size > 0 && (
                    <div className="bg-primary/10 rounded-lg p-3 mb-4 text-center">
                      <span className="text-sm font-medium text-primary">
                        {t('clickToAddSelectedItems', { count: selectedItemsForAI.size })}
                      </span>
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-3">
                    {consolidations
                      .filter(c => c.status !== 'shipped' && c.status !== 'delivered')
                      .map((consolidation) => (
                        <div 
                          key={consolidation.id}
                          className={`border-2 rounded-xl p-4 transition-all min-h-[72px] ${
                            selectedItemsForAI.size > 0 
                              ? 'cursor-pointer bg-primary/5 hover:bg-primary/10 border-primary/40 active:scale-[0.98] shadow-sm' 
                              : 'bg-card border-border'
                          }`}
                          onClick={() => {
                            if (selectedItemsForAI.size > 0) {
                              addItemsToConsolidationMutation.mutate({
                                consolidationId: consolidation.id,
                                itemIds: Array.from(selectedItemsForAI)
                              });
                              setSelectedItemsForAI(new Set());
                              setIsConsolidationDrawerOpen(false);
                            }
                          }}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className={`p-2.5 rounded-lg ${
                                consolidation.shippingMethod?.includes('sensitive') 
                                  ? 'bg-orange-100 dark:bg-orange-900/30' 
                                  : 'bg-primary/10'
                              }`}>
                                {(() => {
                                  const method = consolidation.shippingMethod;
                                  const iconClass = `h-5 w-5 ${method?.includes('sensitive') ? 'text-orange-600' : 'text-primary'}`;
                                  if (method?.includes('air')) return <Plane className={iconClass} />;
                                  if (method?.includes('express')) return <Zap className={iconClass} />;
                                  if (method?.includes('railway')) return <Train className={iconClass} />;
                                  if (method?.includes('sea')) return <Ship className={iconClass} />;
                                  return <Package className="h-5 w-5 text-muted-foreground" />;
                                })()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="font-semibold text-base block truncate">{consolidation.name}</span>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                                  <span>{consolidation.itemCount || 0} {t('items')}</span>
                                  {consolidation.location && (
                                    <>
                                      <span>•</span>
                                      <span className="truncate">{consolidation.location}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            {selectedItemsForAI.size > 0 && (
                              <div className="bg-primary text-primary-foreground rounded-full p-2">
                                <Plus className="h-5 w-5" />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    {consolidations.filter(c => c.status !== 'shipped' && c.status !== 'delivered').length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        {t('noActiveConsolidations')}
                      </div>
                    )}
                  </div>
                </div>
              </DrawerContent>
            </Drawer>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Available Items Column */}
              <div className="lg:col-span-2 order-2 lg:order-1">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">{t('availableItems')}</CardTitle>
                          <CardDescription className="hidden sm:block">{t('selectItemsThenChooseConsolidation')}</CardDescription>
                        </div>
                        <Badge variant="secondary" className="font-medium text-base px-3 py-1">
                          {sortedAndFilteredItems.length}
                        </Badge>
                      </div>
                      
                      {/* Mobile Sticky Search/Scan Bar (56px height for older employees) */}
                      <div className="lg:hidden sticky top-0 z-10 bg-background pb-3 -mx-4 px-4 pt-3 border-b border-border/50">
                        <div className="flex gap-2 items-center">
                          <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                              placeholder={t('searchOrScan')}
                              value={itemSearchTerm}
                              onChange={(e) => setItemSearchTerm(e.target.value)}
                              className="pl-12 pr-4 h-14 text-base rounded-xl border-2"
                              data-testid="mobile-search-input"
                            />
                            {itemSearchTerm && (
                              <Button
                                variant="ghost"
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-12 w-12 p-0 rounded-lg active:scale-95"
                                onClick={() => setItemSearchTerm('')}
                                data-testid="clear-search-button"
                              >
                                <X className="h-5 w-5" />
                              </Button>
                            )}
                          </div>
                          {/* Barcode scanner button - 56px touch target */}
                          <Button
                            variant="outline"
                            className="h-14 w-14 p-0 rounded-xl border-2 shrink-0"
                            data-testid="scan-barcode-button"
                          >
                            <Barcode className="h-6 w-6" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Desktop Search and Sort Controls */}
                      <div className="hidden lg:flex gap-2 flex-wrap">
                        <div className="relative flex-1 min-w-[150px]">
                          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder={t('search')}
                            value={itemSearchTerm}
                            onChange={(e) => setItemSearchTerm(e.target.value)}
                            className="pl-10 h-11"
                          />
                        </div>
                        
                        <Select value={itemSortBy} onValueChange={setItemSortBy}>
                          <SelectTrigger className="w-[140px] sm:w-[180px] h-11">
                            <SortAsc className="h-4 w-4 mr-2" />
                            <SelectValue placeholder={t('sortBy')} />
                          </SelectTrigger>
                          <SelectContent>
                            {itemSortBy === 'custom' && (
                              <>
                                <SelectItem value="custom">
                                  <div className="flex items-center">
                                    <Grip className="h-4 w-4 mr-2" />
                                    {t('customOrder')}
                                  </div>
                                </SelectItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            <SelectItem value="newest">
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2" />
                                {t('newestFirst')}
                              </div>
                            </SelectItem>
                            <SelectItem value="oldest">
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2" />
                                {t('oldestFirst')}
                              </div>
                            </SelectItem>
                            <DropdownMenuSeparator />
                            <SelectItem value="sensitive-first">
                              <div className="flex items-center">
                                <Flag className="h-4 w-4 text-red-500 fill-red-500 mr-2" />
                                {t('sensitiveFirst')}
                              </div>
                            </SelectItem>
                            <SelectItem value="general-first">
                              <div className="flex items-center">
                                <Flag className="h-4 w-4 text-green-500 fill-green-500 mr-2" />
                                {t('generalFirst')}
                              </div>
                            </SelectItem>
                            <DropdownMenuSeparator />
                            <SelectItem value="name-asc">
                              <div className="flex items-center">
                                <ArrowUp className="h-4 w-4 mr-2" />
                                {t('nameAZ')}
                              </div>
                            </SelectItem>
                            <SelectItem value="name-desc">
                              <div className="flex items-center">
                                <ArrowDown className="h-4 w-4 mr-2" />
                                {t('nameZA')}
                              </div>
                            </SelectItem>
                            <DropdownMenuSeparator />
                            <SelectItem value="quantity-high">
                              <div className="flex items-center">
                                <Hash className="h-4 w-4 mr-2" />
                                {t('quantityHighLow')}
                              </div>
                            </SelectItem>
                            <SelectItem value="quantity-low">
                              <div className="flex items-center">
                                <Hash className="h-4 w-4 mr-2" />
                                {t('quantityLowHigh')}
                              </div>
                            </SelectItem>
                            <DropdownMenuSeparator />
                            <SelectItem value="weight-high">
                              <div className="flex items-center">
                                <Weight className="h-4 w-4 mr-2" />
                                {t('weightHeavyLight')}
                              </div>
                            </SelectItem>
                            <SelectItem value="weight-low">
                              <div className="flex items-center">
                                <Weight className="h-4 w-4 mr-2" />
                                {t('weightLightHeavy')}
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Quick Filter Chips - Mobile optimized horizontal scroll (56px touch targets for older employees) */}
                      <div className="lg:hidden -mx-4 px-4 overflow-x-auto pb-2">
                        <div className="flex gap-3 min-w-max">
                          <Button
                            variant={itemClassificationFilter === 'all' ? 'default' : 'outline'}
                            className="h-14 px-5 text-base rounded-full whitespace-nowrap font-medium"
                            onClick={() => setItemClassificationFilter('all')}
                            data-testid="filter-chip-all"
                          >
                            {t('allClassificationsMobile')}
                            <Badge variant="secondary" className="ml-2 h-6 min-w-6 px-2 rounded-full text-sm">
                              {sortedAndFilteredItems.length}
                            </Badge>
                          </Button>
                          <Button
                            variant={itemClassificationFilter === 'sensitive' ? 'default' : 'outline'}
                            className={`h-14 px-5 text-base rounded-full whitespace-nowrap font-medium ${itemClassificationFilter === 'sensitive' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                            onClick={() => setItemClassificationFilter('sensitive')}
                            data-testid="filter-chip-sensitive"
                          >
                            <Flag className="h-4 w-4 mr-2 fill-current" />
                            {t('filterSensitive')}
                            <Badge variant="secondary" className="ml-2 h-6 min-w-6 px-2 rounded-full text-sm">
                              {allItems.filter(i => i.classification === 'sensitive').length}
                            </Badge>
                          </Button>
                          <Button
                            variant={itemClassificationFilter === 'general' ? 'default' : 'outline'}
                            className={`h-14 px-5 text-base rounded-full whitespace-nowrap font-medium ${itemClassificationFilter === 'general' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                            onClick={() => setItemClassificationFilter('general')}
                            data-testid="filter-chip-general"
                          >
                            <Flag className="h-4 w-4 mr-2 fill-current" />
                            {t('filterGeneral')}
                            <Badge variant="secondary" className="ml-2 h-6 min-w-6 px-2 rounded-full text-sm">
                              {allItems.filter(i => i.classification === 'general').length}
                            </Badge>
                          </Button>
                          <Button
                            variant={itemClassificationFilter === 'unclassified' ? 'default' : 'outline'}
                            className="h-14 px-5 text-base rounded-full whitespace-nowrap font-medium"
                            onClick={() => setItemClassificationFilter('unclassified')}
                            data-testid="filter-chip-unclassified"
                          >
                            <div className="h-4 w-4 mr-2 border-2 border-dashed border-current rounded" />
                            {t('filterUnclassified')}
                            <Badge variant="secondary" className="ml-2 h-6 min-w-6 px-2 rounded-full text-sm">
                              {allItems.filter(i => !i.classification).length}
                            </Badge>
                          </Button>
                        </div>
                      </div>
                      
                      {/* Desktop Filter Controls */}
                      <div className="hidden lg:flex gap-2 flex-wrap">
                        <Select value={itemSourceFilter} onValueChange={setItemSourceFilter}>
                          <SelectTrigger className="w-[140px]">
                            <Filter className="h-3 w-3 mr-2" />
                            <SelectValue placeholder={t('source')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t('allSources')}</SelectItem>
                            <SelectItem value="taobao">{t('taobao')}</SelectItem>
                            <SelectItem value="pinduoduo">{t('pinduoduo')}</SelectItem>
                            <SelectItem value="1688">1688</SelectItem>
                            <SelectItem value="alibaba">{t('alibaba')}</SelectItem>
                            <SelectItem value="jd.com">JD.com</SelectItem>
                            <SelectItem value="other">{t('other')}</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <Select value={itemClassificationFilter} onValueChange={setItemClassificationFilter}>
                          <SelectTrigger className="w-[150px]">
                            <Flag className="h-3 w-3 mr-2" />
                            <SelectValue placeholder={t('classification')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t('allItems')}</SelectItem>
                            <SelectItem value="general">{t('general')}</SelectItem>
                            <SelectItem value="sensitive">{t('sensitive')}</SelectItem>
                            <SelectItem value="unclassified">{t('unclassified')}</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        {(itemSourceFilter !== "all" || itemClassificationFilter !== "all") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setItemSourceFilter("all");
                              setItemClassificationFilter("all");
                            }}
                            className="h-9"
                          >
                            <X className="h-3 w-3 mr-1" />
                            {t('clearFilters')}
                          </Button>
                        )}
                      </div>
                      
                      {/* Quick Stats and Bulk Actions */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Flag className="h-4 w-4 text-red-500 fill-red-500" />
                            <span className="text-muted-foreground">
                              {sortedAndFilteredItems.filter(i => i.classification === 'sensitive').length} {t('sensitive')}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Flag className="h-4 w-4 text-green-500 fill-green-500" />
                            <span className="text-muted-foreground">
                              {sortedAndFilteredItems.filter(i => i.classification === 'general').length} {t('general')}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="h-4 w-4 border-2 border-dashed border-gray-400 rounded" />
                            <span className="text-muted-foreground">
                              {sortedAndFilteredItems.filter(i => !i.classification).length} {t('unclassified')}
                            </span>
                          </div>
                        </div>
                        
                        {/* Bulk Selection Actions */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const allFilteredIds = sortedAndFilteredItems.map(i => i.id);
                              const allSelected = allFilteredIds.length > 0 && 
                                                 allFilteredIds.every(id => selectedItemsForAI.has(id));
                              
                              if (allSelected) {
                                setSelectedItemsForAI(new Set());
                              } else {
                                setSelectedItemsForAI(new Set(allFilteredIds));
                              }
                            }}
                          >
                            {(() => {
                              const allFilteredIds = sortedAndFilteredItems.map(i => i.id);
                              const allSelected = allFilteredIds.length > 0 && 
                                                 allFilteredIds.every(id => selectedItemsForAI.has(id));
                              
                              if (allSelected) {
                                return (
                                  <>
                                    <Square className="h-3 w-3 mr-1" />
                                    {t('deselectAll', { count: selectedItemsForAI.size })}
                                  </>
                                );
                              } else {
                                return (
                                  <>
                                    <CheckSquare className="h-3 w-3 mr-1" />
                                    {t('selectAll', { count: sortedAndFilteredItems.length })}
                                  </>
                                );
                              }
                            })()}
                          </Button>
                          {allItems.some(item => item.purchaseOrderId && item.orderItems && item.orderItems.length > 0) && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={expandAllItems}
                                title={t('expandAllItemsWithSubItems')}
                              >
                                <ChevronsDown className={selectedItemsForAI.size > 0 ? "h-3 w-3" : "h-3 w-3 mr-1"} />
                                {selectedItemsForAI.size === 0 && t('expandAll')}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={collapseAllItems}
                                title={t('collapseAllItems')}
                              >
                                <ChevronsUp className={selectedItemsForAI.size > 0 ? "h-3 w-3" : "h-3 w-3 mr-1"} />
                                {selectedItemsForAI.size === 0 && t('collapseAll')}
                              </Button>
                            </>
                          )}
                          {selectedItemsForAI.size > 0 && (
                            <>
                              {/* Quick Add to Consolidation - Prominent Select */}
                              <Select
                                value=""
                                onValueChange={(consolidationId) => {
                                  if (consolidationId) {
                                    addItemsToConsolidationMutation.mutate({
                                      consolidationId,
                                      itemIds: Array.from(selectedItemsForAI) as string[]
                                    });
                                    setSelectedItemsForAI(new Set());
                                  }
                                }}
                              >
                                <SelectTrigger className="w-[200px] border-primary text-primary hover:bg-primary/10">
                                  <Plus className="h-4 w-4 mr-2" />
                                  <SelectValue placeholder={t('addToConsolidation')} />
                                </SelectTrigger>
                                <SelectContent>
                                  {consolidations
                                    .filter(c => c.status !== 'shipped' && c.status !== 'delivered')
                                    .map((consolidation) => (
                                      <SelectItem key={consolidation.id} value={consolidation.id.toString()}>
                                        <div className="flex items-center gap-2">
                                          {(() => {
                                            const method = consolidation.shippingMethod;
                                            if (method?.includes('air')) {
                                              return <Plane className={`h-4 w-4 ${method.includes('sensitive') ? 'text-orange-500' : ''}`} />;
                                            } else if (method?.includes('express')) {
                                              return <Zap className={`h-4 w-4 ${method.includes('sensitive') ? 'text-orange-500' : ''}`} />;
                                            } else if (method?.includes('railway')) {
                                              return <Train className={`h-4 w-4 ${method.includes('sensitive') ? 'text-orange-500' : ''}`} />;
                                            } else if (method?.includes('sea')) {
                                              return <Ship className={`h-4 w-4 ${method.includes('sensitive') ? 'text-orange-500' : ''}`} />;
                                            } else {
                                              return <Package className="h-4 w-4 text-muted-foreground" />;
                                            }
                                          })()}
                                          <span>{consolidation.name}</span>
                                          <Badge variant="secondary" className="text-xs ml-auto">
                                            {consolidation.itemCount || 0}
                                          </Badge>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  {consolidations.filter(c => c.status !== 'shipped' && c.status !== 'delivered').length === 0 && (
                                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                                      {t('noActiveConsolidations')}
                                    </div>
                                  )}
                                </SelectContent>
                              </Select>
                              
                              {/* Other Bulk Actions */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <MoreHorizontal className="h-4 w-4 mr-1" />
                                    {t('more')}
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>{t('classification')}</DropdownMenuLabel>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      selectedItemsForAI.forEach(id => {
                                        updateItemClassificationMutation.mutate({ id, classification: 'general' });
                                      });
                                      setSelectedItemsForAI(new Set());
                                    }}
                                  >
                                    <Flag className="h-4 w-4 text-green-500 fill-green-500 mr-2" />
                                    {t('markAsGeneral')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      selectedItemsForAI.forEach(id => {
                                        updateItemClassificationMutation.mutate({ id, classification: 'sensitive' });
                                      });
                                      setSelectedItemsForAI(new Set());
                                    }}
                                  >
                                    <Flag className="h-4 w-4 text-red-500 fill-red-500 mr-2" />
                                    {t('markAsSensitive')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      selectedItemsForAI.forEach(id => {
                                        updateItemClassificationMutation.mutate({ id, classification: null });
                                      });
                                      setSelectedItemsForAI(new Set());
                                    }}
                                  >
                                    <div className="h-4 w-4 border-2 border-dashed border-gray-400 rounded mr-2" />
                                    {t('clearClassification')}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuLabel>{t('aiActions')}</DropdownMenuLabel>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setIsAIProcessing(true);
                                      aiClassifyMutation.mutate(Array.from(selectedItemsForAI));
                                    }}
                                  >
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    {t('aiClassifySelected')}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Droppable droppableId="available-items">
                      {(provided) => (
                        <div 
                          ref={provided.innerRef} 
                          {...provided.droppableProps}
                          data-testid="available-items-container"
                          className="space-y-2 min-h-[400px] p-2 rounded-lg"
                        >
                          {isLoadingItems ? (
                            <div className="space-y-2 animate-in fade-in-50 duration-500">
                              {[...Array(5)].map((_, i) => (
                                <ItemCardSkeleton key={i} />
                              ))}
                            </div>
                          ) : sortedAndFilteredItems.length > 50 ? (
                            // Use virtualization for large lists
                            <List
                              height={600}
                              itemCount={sortedAndFilteredItems.length}
                              itemSize={100}
                              width="100%"
                              itemData={sortedAndFilteredItems}
                            >
                              {({ index, style, data }) => {
                                const item = data[index];
                                return (
                                  <div style={style} key={item.uniqueId}>
                                    <ItemCard 
                                      item={item} 
                                      index={index}
                                      selectedItemsForAI={selectedItemsForAI}
                                      setSelectedItemsForAI={setSelectedItemsForAI}
                                      expandedItems={expandedItems}
                                      toggleItemExpanded={toggleItemExpanded}
                                      updateItemClassificationMutation={updateItemClassificationMutation}
                                      handleEditItem={handleEditItem}
                                      setDeleteTarget={setDeleteTarget}
                                      setMoveToConsolidationItem={setMoveToConsolidationItem}
                                      unpackItemMutation={unpackItemMutation}
                                      getClassificationIcon={getClassificationIcon}
                                      getSourceBadge={getSourceBadge}
                                      itemSortBy={itemSortBy}
                                      t={t}
                                    />
                                  </div>
                                );
                              }}
                            </List>
                          ) : (
                            // Regular rendering for smaller lists
                            sortedAndFilteredItems.map((item, index) => (
                            <Draggable key={item.uniqueId} draggableId={item.uniqueId} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`border-2 rounded-xl p-4 lg:p-3 bg-background hover:shadow-md cursor-grab active:cursor-grabbing transition-all min-h-[72px] ${
                                    selectedItemsForAI.has(item.id) 
                                      ? 'ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-900/20 border-purple-400' 
                                      : 'border-border hover:border-purple-200'
                                  } ${snapshot.isDragging ? 'shadow-xl ring-2 ring-primary z-50' : ''}`}
                                  style={provided.draggableProps.style}
                                  onClick={(e) => {
                                    // Only toggle selection if not clicking on buttons or drag handle
                                    const target = e.target as HTMLElement;
                                    if (!target.closest('button') && !target.closest('[data-drag-handle]')) {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      const newSelected = new Set(selectedItemsForAI);
                                      if (newSelected.has(item.id)) {
                                        newSelected.delete(item.id);
                                      } else {
                                        newSelected.add(item.id);
                                      }
                                      setSelectedItemsForAI(newSelected);
                                    }
                                  }}
                                  data-testid={`item-card-${item.id}`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                      {/* Top row with drag handle and name */}
                                      <div className="flex items-start gap-3">
                                        {/* Selection indicator on mobile (56px touch target for older employees) */}
                                        <div 
                                          className="lg:hidden flex items-center justify-center w-14 h-14 rounded-xl border-2 shrink-0 transition-colors active:scale-95"
                                          style={{
                                            backgroundColor: selectedItemsForAI.has(item.id) ? 'rgb(147 51 234)' : 'transparent',
                                            borderColor: selectedItemsForAI.has(item.id) ? 'rgb(147 51 234)' : 'rgb(203 213 225)'
                                          }}
                                          data-testid={`item-select-${item.id}`}
                                        >
                                          {selectedItemsForAI.has(item.id) && (
                                            <Check className="h-6 w-6 text-white" />
                                          )}
                                        </div>
                                        {/* Drag handle - hidden on mobile */}
                                        <div className="hidden lg:flex items-center mt-0.5">
                                          <div 
                                            data-drag-handle
                                            className="hover:bg-muted/50 rounded p-0.5 transition-colors"
                                            title={itemSortBy === 'custom' ? t('dragToReorder') : t('dragToConsolidation')}
                                          >
                                            <Grip className="h-4 w-4 text-muted-foreground flex-shrink-0 hover:text-primary transition-colors" />
                                          </div>
                                        </div>
                                        {item.imageUrl ? (
                                          <img 
                                            src={item.imageUrl} 
                                            alt={item.name}
                                            className="w-14 h-14 lg:w-12 lg:h-12 object-cover rounded-lg border-2 shrink-0"
                                          />
                                        ) : (
                                          <div className="w-14 h-14 lg:w-12 lg:h-12 bg-muted/30 rounded-lg flex items-center justify-center shrink-0">
                                            <Package className="w-7 h-7 lg:w-6 lg:h-6 text-muted-foreground" />
                                          </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-base lg:text-base truncate">{item.name}</span>
                                            {getClassificationIcon(item.classification)}
                                          </div>
                                          
                                          {/* Compact metadata row */}
                                          <div className="flex items-center gap-2 mt-1.5 text-sm lg:text-sm text-muted-foreground flex-wrap">
                                            <span className="font-medium">{t('qty')}: {item.quantity}</span>
                                            {item.weight && <span>• {item.weight} kg</span>}
                                            {item.source && (
                                              <>
                                                <span>•</span>
                                                {getSourceBadge(item.source)}
                                              </>
                                            )}
                                            {item.orderNumber && (
                                              <span className="hidden lg:inline">• {item.orderNumber}</span>
                                            )}
                                            {item.customerName && (
                                              <span className="hidden lg:inline">• {item.customerName}</span>
                                            )}
                                            {/* Inline items toggle for purchase orders */}
                                            {item.purchaseOrderId && item.orderItems && item.orderItems.length > 0 && (
                                              <>
                                                <span>•</span>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-6 px-2 text-xs hover:bg-muted"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleItemExpanded(item.id);
                                                  }}
                                                  title={expandedItems.has(item.id) ? t('hideItems') : t('showItems')}
                                                >
                                                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expandedItems.has(item.id) ? '' : '-rotate-90'}`} />
                                                  <span className="ml-1">{item.orderItems.length} {t('items')}</span>
                                                </Button>
                                              </>
                                            )}
                                          </div>
                                          
                                          {/* Show order items inline if expanded */}
                                          {item.purchaseOrderId && item.orderItems && item.orderItems.length > 0 && expandedItems.has(item.id) && (
                                            <div className="mt-2 ml-4 border-l-2 border-muted pl-3 space-y-1">
                                              {item.orderItems.map((orderItem: any, idx: number) => (
                                                <div key={idx} className="flex items-center justify-between text-xs">
                                                  <div className="flex items-center gap-2">
                                                    <span className="text-gray-900 dark:text-gray-100">{orderItem.name}</span>
                                                    {orderItem.sku && (
                                                      <span className="text-gray-600 dark:text-gray-400">({orderItem.sku})</span>
                                                    )}
                                                  </div>
                                                  <span className="text-gray-700 dark:text-gray-300">{t('qty')}: {orderItem.quantity}</span>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    {/* Mobile: Single action button (56px touch target for older employees) */}
                                    <div className="lg:hidden">
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            className="h-14 w-14 p-0 rounded-xl"
                                            onClick={(e) => e.stopPropagation()}
                                            data-testid={`item-action-menu-${item.id}`}
                                          >
                                            <MoreVertical className="h-6 w-6" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48">
                                          <DropdownMenuLabel>{t('setClassification')}</DropdownMenuLabel>
                                          <DropdownMenuItem
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              updateItemClassificationMutation.mutate({ id: item.id, classification: 'general' });
                                            }}
                                          >
                                            <Flag className="h-4 w-4 text-green-500 fill-green-500 mr-2" />
                                            {t('generalGoods')}
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              updateItemClassificationMutation.mutate({ id: item.id, classification: 'sensitive' });
                                            }}
                                          >
                                            <Flag className="h-4 w-4 text-red-500 fill-red-500 mr-2" />
                                            {t('sensitiveGoods')}
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              updateItemClassificationMutation.mutate({ id: item.id, classification: null });
                                            }}
                                          >
                                            <div className="h-4 w-4 border-2 border-dashed border-gray-400 rounded mr-2" />
                                            {t('none')}
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditItem(item); }}>
                                            <Edit className="h-4 w-4 mr-2" />
                                            {t('edit')}
                                          </DropdownMenuItem>
                                          {item.purchaseOrderId && item.orderItems && item.orderItems.length > 0 && (
                                            <DropdownMenuItem
                                              onClick={(e) => { e.stopPropagation(); unpackItemMutation.mutate(item.id); }}
                                              className="text-primary"
                                            >
                                              <Package2 className="h-4 w-4 mr-2" />
                                              {t('unpackAllItems')}
                                            </DropdownMenuItem>
                                          )}
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem
                                            onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'item', id: item.id, name: item.name }); }}
                                            className="text-red-600"
                                          >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            {t('delete')}
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                    
                                    {/* Desktop: Multiple action buttons */}
                                    <div className="hidden lg:flex gap-1 items-start">
                                      {/* Three dots menu for purchase orders */}
                                      {item.purchaseOrderId && item.orderItems && item.orderItems.length > 0 && (
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="h-8 px-2"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <MoreVertical className="h-4 w-4" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                unpackItemMutation.mutate(item.id);
                                              }}
                                              className="text-primary"
                                            >
                                              <Package2 className="h-4 w-4 mr-2" />
                                              {t('unpackAllItems')}
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleEditItem(item);
                                              }}
                                            >
                                              <Edit2 className="h-4 w-4 mr-2" />
                                              {t('editPackage')}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setDeleteTarget({ type: 'item', id: item.id, name: item.name });
                                              }}
                                              className="text-red-600"
                                            >
                                              <Trash2 className="h-4 w-4 mr-2" />
                                              {t('deletePackage')}
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      )}
                                      
                                      {/* Classification Toggle */}
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 px-2"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            {item.classification === 'sensitive' ? (
                                              <Flag className="h-4 w-4 text-red-500 fill-red-500" />
                                            ) : item.classification === 'general' ? (
                                              <Flag className="h-4 w-4 text-green-500 fill-green-500" />
                                            ) : (
                                              <div className="h-4 w-4 border-2 border-dashed border-gray-400 rounded" />
                                            )}
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuLabel>{t('setClassification')}</DropdownMenuLabel>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              updateItemClassificationMutation.mutate({
                                                id: item.id,
                                                classification: null
                                              });
                                            }}
                                          >
                                            <div className="h-4 w-4 border-2 border-dashed border-gray-400 rounded mr-2" />
                                            {t('none')}
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              updateItemClassificationMutation.mutate({
                                                id: item.id,
                                                classification: 'general'
                                              });
                                            }}
                                          >
                                            <Flag className="h-4 w-4 text-green-500 fill-green-500 mr-2" />
                                            {t('generalGoods')}
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              updateItemClassificationMutation.mutate({
                                                id: item.id,
                                                classification: 'sensitive'
                                              });
                                            }}
                                          >
                                            <Flag className="h-4 w-4 text-red-500 fill-red-500 mr-2" />
                                            {t('sensitiveGoods')}
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                      
                                      <Button 
                                        size="sm"
                                        variant="ghost"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditItem(item);
                                        }}
                                        className="h-8 px-2"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button 
                                            variant="ghost" 
                                            size="sm"
                                            onClick={(e) => e.stopPropagation()}
                                            className="h-8 px-2"
                                          >
                                            <MoreHorizontal className="h-4 w-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem 
                                            className="text-red-600"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setDeleteTarget({ type: 'item', id: item.id, name: item.name });
                                            }}
                                          >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            {t('delete')}
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          )))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </CardContent>
                </Card>
              </div>

              {/* Active Consolidations Column - Only show on desktop */}
              <div className="hidden lg:block lg:col-span-1 order-1 lg:order-2">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{t('activeConsolidations')}</CardTitle>
                        <CardDescription>
                          {selectedItemsForAI.size > 0 
                            ? t('clickToAddSelectedItems', { count: selectedItemsForAI.size })
                            : `${consolidations.filter(c => c.status !== 'shipped' && c.status !== 'delivered').length} ${t('readyForItems')}`
                          }
                        </CardDescription>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsCreateConsolidationOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {t('new')}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[500px] pr-4">
                      <div className="space-y-2">
                        {consolidations
                          .filter(c => c.status !== 'shipped' && c.status !== 'delivered')
                          .map((consolidation) => (
                            <div key={consolidation.id}>
                              <div 
                                className={`border rounded-lg p-2.5 transition-all ${
                                  selectedItemsForAI.size > 0 
                                    ? 'cursor-pointer bg-primary/5 hover:bg-primary/10 border-primary/30 hover:border-primary/50 hover:shadow-md' 
                                    : 'bg-muted/20 hover:bg-muted/30'
                                }`}
                                onClick={() => {
                                  if (selectedItemsForAI.size > 0) {
                                    addItemsToConsolidationMutation.mutate({
                                      consolidationId: consolidation.id,
                                      itemIds: Array.from(selectedItemsForAI)
                                    });
                                    setSelectedItemsForAI(new Set());
                                  }
                                }}
                              >
                                <div className="flex justify-between items-start mb-1.5">
                                  <div className="flex-1">
                                    <div className="flex items-start gap-2">
                                      {(() => {
                                        const method = consolidation.shippingMethod;
                                        if (method?.includes('air')) {
                                          return <Plane className={`h-4 w-4 mt-0.5 ${method.includes('sensitive') ? 'text-orange-500' : 'text-primary'}`} />;
                                        } else if (method?.includes('express')) {
                                          return <Zap className={`h-4 w-4 mt-0.5 ${method.includes('sensitive') ? 'text-orange-500' : 'text-primary'}`} />;
                                        } else if (method?.includes('railway')) {
                                          return <Train className={`h-4 w-4 mt-0.5 ${method.includes('sensitive') ? 'text-orange-500' : 'text-primary'}`} />;
                                        } else if (method?.includes('sea')) {
                                          return <Ship className={`h-4 w-4 mt-0.5 ${method.includes('sensitive') ? 'text-orange-500' : 'text-primary'}`} />;
                                        } else {
                                          return <Package className="h-4 w-4 text-muted-foreground mt-0.5" />;
                                        }
                                      })()}
                                      <div className="flex-1">
                                        <div className="font-medium text-sm">{consolidation.name}</div>
                                        <Badge 
                                          className="text-xs px-1.5 py-0 mt-1" 
                                          variant={
                                            consolidation.shippingMethod?.includes('air') ? 'default' :
                                            consolidation.shippingMethod?.includes('express') ? 'destructive' :
                                            consolidation.shippingMethod?.includes('railway') ? 'outline' :
                                            consolidation.shippingMethod?.includes('sea') ? 'secondary' :
                                            'secondary'
                                          }
                                        >
                                          {consolidation.shippingMethod?.replace(/_/g, ' ').toUpperCase() || t('notSet')}
                                        </Badge>
                                      </div>
                                    </div>
                                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-2 mb-1">
                                      <MapPin className="h-3 w-3" />
                                      {consolidation.location || consolidation.warehouse?.replace('_', ', ') || t('noLocation')}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {consolidation.itemCount || 0} {t('items')} • {t('totalWeight')}: {(() => {
                                        const items = consolidationItems[consolidation.id] || [];
                                        const totalWeight = items.reduce((sum: number, item: any) => {
                                          const fullItem = allItems.find((i: any) => i.id === item.id);
                                          return sum + (parseFloat(fullItem?.weight || '0') || 0);
                                        }, 0);
                                        return totalWeight.toFixed(2);
                                      })()} {t('kg')}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 lg:gap-1" onClick={(e) => e.stopPropagation()}>
                                    {/* Responsive edit button: 56px on mobile, compact on desktop */}
                                    <Button
                                      variant="ghost"
                                      className="h-12 w-12 lg:h-6 lg:w-6 p-0 rounded-lg"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingConsolidation(consolidation);
                                      }}
                                    >
                                      <Edit2 className="h-5 w-5 lg:h-3 lg:w-3" />
                                    </Button>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        {/* Responsive button: 56px on mobile, compact on desktop */}
                                        <Button 
                                          variant="ghost" 
                                          className="h-12 w-12 lg:h-6 lg:w-6 p-0 rounded-lg" 
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <MoreVertical className="h-5 w-5 lg:h-3 lg:w-3" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                          onClick={async () => {
                                            // Fetch fresh items for this specific consolidation
                                            const items = await fetchConsolidationItems(consolidation.id);
                                            const trackingNumbers: string[] = [];
                                            
                                            // Collect tracking numbers from parent purchase orders
                                            for (const item of items) {
                                              // Items from purchase orders have trackingNumber field
                                              if (item.trackingNumber) {
                                                trackingNumbers.push(item.trackingNumber);
                                              } else if (item.orderNumber && item.orderNumber.startsWith('PO-')) {
                                                // Try to match by order number pattern (e.g., "PO-19")
                                                const poId = parseInt(item.orderNumber.replace('PO-', ''));
                                                if (!isNaN(poId)) {
                                                  // Find the purchase order with this ID from ALL purchase orders
                                                  const purchaseOrder = allPurchaseOrders.find((order: ImportPurchase) => order.id === poId);
                                                  if (purchaseOrder?.trackingNumber) {
                                                    trackingNumbers.push(purchaseOrder.trackingNumber);
                                                  }
                                                }
                                              } else if (!item.orderNumber && item.source) {
                                                // Only fall back to supplier matching if no PO number
                                                const supplierName = item.source.replace(/^Supplier:\s*/i, '').trim();
                                                
                                                // Find the most recent purchase order from this supplier
                                                const matchingOrders = allPurchaseOrders
                                                  .filter((order: ImportPurchase) => order.supplier === supplierName)
                                                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                                                
                                                // Only add the most recent order's tracking number
                                                if (matchingOrders.length > 0 && matchingOrders[0].trackingNumber) {
                                                  trackingNumbers.push(matchingOrders[0].trackingNumber);
                                                }
                                              }
                                            }
                                            
                                            // Remove duplicates and filter out null/empty values
                                            const uniqueTrackingNumbers = Array.from(new Set(
                                              trackingNumbers.filter(tn => tn && tn.trim())
                                            ));
                                            
                                            setSelectedConsolidationTracking({
                                              id: consolidation.id,
                                              name: consolidation.name,
                                              trackingNumbers: uniqueTrackingNumbers
                                            });
                                            setShowTrackingModal(true);
                                          }}
                                        >
                                          <Package className="h-3 w-3 mr-2" />
                                          {t('exportTrackingNumbers')}
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          onClick={() => quickShipMutation.mutate(consolidation.id)}
                                          disabled={quickShipMutation.isPending || consolidation.itemCount === 0}
                                        >
                                          <ArrowRightToLine className="h-3 w-3 mr-2 text-green-600" />
                                          {t('quickShipMoveToPending')}
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          onClick={() => handleDeleteConsolidation(consolidation)}
                                          className="text-destructive"
                                        >
                                          <Trash2 className="h-3 w-3 mr-2" />
                                          {t('delete')}
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                                
                                <Droppable droppableId={`consolidation-${consolidation.id}`}>
                                {(provided, snapshot) => (
                                  <div 
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className={`
                                      min-h-[100px] rounded-xl p-4 mb-2 transition-all duration-200
                                      ${snapshot.isDraggingOver 
                                        ? 'border-2 border-dashed border-primary bg-primary/5 scale-[1.02]' 
                                        : 'border-2 border-dashed border-muted-foreground/30 hover:border-muted-foreground/50'
                                      }
                                    `}
                                    style={{
                                      background: snapshot.isDraggingOver 
                                        ? 'linear-gradient(145deg, rgba(var(--primary), 0.03), rgba(var(--primary), 0.08))' 
                                        : ''
                                    }}
                                  >
                                    {consolidation.itemCount === 0 ? (
                                      <div className={`text-center py-4 transition-all ${
                                        snapshot.isDraggingOver 
                                          ? 'text-primary font-medium scale-110' 
                                          : 'text-muted-foreground'
                                      }`}>
                                        <div className="text-2xl mb-2">
                                          {snapshot.isDraggingOver ? '✨' : '📦'}
                                        </div>
                                        <div className="text-sm">
                                          {snapshot.isDraggingOver ? t('releaseToAdd') : t('dropItemsHere')}
                                        </div>
                                      </div>
                                    ) : (
                                      <div>
                                        <div className="flex justify-between items-center mb-2">
                                          <div className="text-sm font-medium">{consolidation.itemCount} {t('items')}</div>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 px-2 text-xs"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleConsolidationExpanded(consolidation.id);
                                            }}
                                          >
                                            {expandedConsolidations.has(consolidation.id) ? (
                                              <ChevronDown className="h-3 w-3" />
                                            ) : (
                                              <ChevronRight className="h-3 w-3" />
                                            )}
                                          </Button>
                                        </div>
                                        
                                        {/* Show items if expanded */}
                                        {expandedConsolidations.has(consolidation.id) && consolidationItems[consolidation.id] && (
                                          <div className="mt-2 space-y-1">
                                            {consolidationItems[consolidation.id].map((item: any) => (
                                              <div key={item.id} className="bg-background rounded p-2 flex justify-between items-center text-xs">
                                                <div className="flex-1">
                                                  <div className="font-medium">{item.name}</div>
                                                  <div className="text-muted-foreground">
                                                    {t('qty')}: {item.quantity} • {item.source}
                                                  </div>
                                                </div>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-6 px-2"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeItemFromConsolidationMutation.mutate({
                                                      consolidationId: consolidation.id,
                                                      itemId: item.id
                                                    });
                                                  }}
                                                >
                                                  <X className="h-3 w-3" />
                                                </Button>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    {provided.placeholder}
                                  </div>
                                )}
                                  </Droppable>
                                  
                                  {/* Ship Consolidation Button - Always at bottom */}
                                  <div className="mt-3 pt-3 border-t">
                                    <Button 
                                      onClick={() => handleShipConsolidation(consolidation)}
                                      className="w-full"
                                      size="sm"
                                      data-testid={`button-ship-consolidation-${consolidation.id}`}
                                    >
                                      <Ship className="h-4 w-4 mr-2" />
                                      {t('shipConsolidation')}
                                    </Button>
                                  </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>
          </DragDropContext>
          
          {/* Mobile Bottom Action Bar - Fixed at bottom */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background border-t shadow-lg safe-area-bottom">
            <div className="flex items-center justify-around p-3 gap-2">
              {/* Consolidations Button */}
              <Button
                variant={selectedItemsForAI.size > 0 ? "default" : "outline"}
                size="lg"
                className="flex-1 h-14 text-base font-medium relative"
                onClick={() => setIsConsolidationDrawerOpen(true)}
                data-testid="button-mobile-consolidations"
              >
                <Package className="h-5 w-5 mr-2" />
                {selectedItemsForAI.size > 0 ? (
                  <>
                    {t('addToConsolidationMobile')}
                    <Badge variant="secondary" className="ml-2 bg-primary-foreground text-primary">
                      {selectedItemsForAI.size}
                    </Badge>
                  </>
                ) : (
                  <>
                    {t('consolidationsMobile')}
                    <Badge variant="secondary" className="ml-2">
                      {consolidations.filter(c => c.status !== 'shipped' && c.status !== 'delivered').length}
                    </Badge>
                  </>
                )}
              </Button>
              
              {/* AI Classify Button */}
              <Button
                variant="outline"
                size="lg"
                className="h-14 px-4"
                onClick={() => {
                  // When items are selected, classify those; otherwise classify ALL available items
                  const itemsToClassify = selectedItemsForAI.size > 0 
                    ? Array.from(selectedItemsForAI)
                    : allItems.map(item => item.id);
                  
                  if (itemsToClassify.length === 0) {
                    toast({
                      title: t('noItemsToClassify'),
                      description: t('noAvailableItemsToClassify'),
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  setIsAIProcessing(true);
                  aiClassifyMutation.mutate(itemsToClassify);
                }}
                disabled={isAIProcessing || aiClassifyMutation.isPending}
                data-testid="button-mobile-ai-classify"
              >
                {aiClassifyMutation.isPending ? (
                  <RefreshCw className="h-5 w-5 animate-spin" />
                ) : (
                  <Sparkles className="h-5 w-5 text-purple-600" />
                )}
              </Button>
              
              {/* More Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="lg" className="h-14 px-4" data-testid="button-mobile-more-actions">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>{t('quickActionsMobile')}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setIsCreateConsolidationOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('newConsolidationMobile')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsAddCustomItemOpen(true)}>
                    <Package className="h-4 w-4 mr-2" />
                    {t('addCustomItem')}
                  </DropdownMenuItem>
                  {selectedItemsForAI.size > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>{t('bulkActionsMobile')}</DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() => {
                          selectedItemsForAI.forEach(id => {
                            updateItemClassificationMutation.mutate({ id, classification: 'general' });
                          });
                          setSelectedItemsForAI(new Set());
                        }}
                      >
                        <Flag className="h-4 w-4 text-green-500 fill-green-500 mr-2" />
                        {t('markAsGeneral')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          selectedItemsForAI.forEach(id => {
                            updateItemClassificationMutation.mutate({ id, classification: 'sensitive' });
                          });
                          setSelectedItemsForAI(new Set());
                        }}
                      >
                        <Flag className="h-4 w-4 text-red-500 fill-red-500 mr-2" />
                        {t('markAsSensitive')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSelectedItemsForAI(new Set())}
                      >
                        <X className="h-4 w-4 mr-2" />
                        {t('clearSelection')}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {/* Spacer for mobile bottom bar */}
          <div className="lg:hidden h-24" />
        </TabsContent>
      </Tabs>

      {/* Edit Custom Item Dialog */}
      <Dialog open={isEditCustomItemOpen} onOpenChange={setIsEditCustomItemOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{t('editItem')}</DialogTitle>
            <DialogDescription>
              {t('updateItemDetails')}
            </DialogDescription>
          </DialogHeader>
          {editingItem && (
            <form onSubmit={handleUpdateCustomItem} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">{t('itemName')} *</Label>
                <Input 
                  id="edit-name" 
                  name="name" 
                  required 
                  defaultValue={editingItem.name}
                  data-testid="input-edit-item-name"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-status">{t('status')}</Label>
                  <Select name="status" defaultValue={editingItem.status}>
                    <SelectTrigger data-testid="select-edit-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">{t('available')}</SelectItem>
                      <SelectItem value="assigned">{t('assigned')}</SelectItem>
                      <SelectItem value="consolidated">{t('consolidated')}</SelectItem>
                      <SelectItem value="shipped">{t('shipped')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-classification">{t('goodsClassification')}</Label>
                  <Select name="classification" defaultValue={editingItem.classification || 'general'}>
                    <SelectTrigger data-testid="select-edit-classification">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">
                        <div className="flex items-center">
                          <Flag className="h-4 w-4 mr-2 text-green-500" />
                          {t('generalGoods')}
                        </div>
                      </SelectItem>
                      <SelectItem value="sensitive">
                        <div className="flex items-center">
                          <Shield className="h-4 w-4 mr-2 text-red-500" />
                          {t('sensitiveGoods')}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-quantity">{t('quantity')} *</Label>
                  <Input 
                    id="edit-quantity" 
                    name="quantity" 
                    type="number" 
                    min="1" 
                    defaultValue={editingItem.quantity}
                    required 
                    data-testid="input-edit-quantity"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-unitPrice">{t('unitPrice')}</Label>
                  <Input 
                    id="edit-unitPrice" 
                    name="unitPrice" 
                    type="number" 
                    step="0.01" 
                    defaultValue={editingItem.unitPrice}
                    data-testid="input-edit-unit-price"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-weight">{t('weight')} ({t('kg')})</Label>
                  <Input 
                    id="edit-weight" 
                    name="weight" 
                    type="number" 
                    step="0.001" 
                    defaultValue={editingItem.weight}
                    data-testid="input-edit-weight"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-dimensions">{t('dimensions')}</Label>
                <Input 
                  id="edit-dimensions" 
                  name="dimensions" 
                  defaultValue={editingItem.dimensions || ''}
                  data-testid="input-edit-dimensions"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-notes">{t('notes')}</Label>
                <Textarea 
                  id="edit-notes" 
                  name="notes" 
                  defaultValue={editingItem.notes || ''}
                  data-testid="textarea-edit-notes"
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                  setIsEditCustomItemOpen(false);
                  setEditingItem(null);
                }}>
                  {t('cancel')}
                </Button>
                <Button type="submit" disabled={updateCustomItemMutation.isPending} data-testid="button-update-item">
                  {updateCustomItemMutation.isPending ? t('updating') : t('updateItem')}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Status Change Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('changeStatus')}</DialogTitle>
            <DialogDescription>
              {t('selectNewStatus')}
            </DialogDescription>
          </DialogHeader>
          
          {statusTarget && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="text-sm text-muted-foreground">{t('currentStatus')}</div>
                <div className="mt-1">{getStatusBadge(statusTarget.currentStatus)}</div>
              </div>

              <div className="space-y-2">
                <Label>{t('newStatus')}</Label>
                <Select onValueChange={confirmStatusChange}>
                  <SelectTrigger data-testid="select-new-status">
                    <SelectValue placeholder={t('selectNewStatus')} />
                  </SelectTrigger>
                  <SelectContent>
                    {statusTarget.type === 'order' ? (
                      <>
                        <SelectItem value="pending">{t('pending')}</SelectItem>
                        <SelectItem value="ordered">{t('ordered')}</SelectItem>
                        <SelectItem value="in_transit">{t('inTransit')}</SelectItem>
                        <SelectItem value="at_warehouse">{t('consolidated')}</SelectItem>
                        <SelectItem value="unpacked">{t('unpacked')}</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="available">{t('available')}</SelectItem>
                        <SelectItem value="assigned">{t('assigned')}</SelectItem>
                        <SelectItem value="consolidated">{t('consolidated')}</SelectItem>
                        <SelectItem value="shipped">{t('shipped')}</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowStatusDialog(false);
                setStatusTarget(null);
              }}
            >
              {t('cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receive without Unpacking Dialog */}
      <Dialog open={showReceiveDialog} onOpenChange={setShowReceiveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('receivePurchaseOrderPackage')}</DialogTitle>
            <DialogDescription>
              {t('willMoveEntireOrder')}
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="font-medium">{selectedOrder.supplier}</div>
                <div className="text-sm text-muted-foreground">
                  PO #{selectedOrder.id.substring(0, 8).toUpperCase()} • {selectedOrder.items?.length || 0} items
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Box className="h-4 w-4 text-blue-500 mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  {t('entireOrderTreatedAsPackage')} 
                  {t('canViewItemsInPackage')}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowReceiveDialog(false)}
              disabled={receiveMutation.isPending}
            >
              {t('cancel')}
            </Button>
            <Button 
              onClick={confirmReceive}
              disabled={receiveMutation.isPending}
              className="gap-2"
            >
              {receiveMutation.isPending ? (
                <>{t('processing')}</>
              ) : (
                <>
                  <Box className="h-4 w-4" />
                  {t('confirmReceive')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unpack Confirmation Dialog */}
      <Dialog open={showUnpackDialog} onOpenChange={setShowUnpackDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('unpackPurchaseOrder')}</DialogTitle>
            <DialogDescription>
              {t('willUnpackToIndividualItems')}
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="font-medium">{selectedOrder.supplier}</div>
                <div className="text-sm text-muted-foreground">
                  PO #{selectedOrder.id.substring(0, 8).toUpperCase()} • {selectedOrder.items?.length || 0} items
                </div>
              </div>

              {/* Item List */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">{t('itemsToBeUnpacked')}</div>
                <div className="max-h-[200px] overflow-y-auto space-y-2 border rounded-lg p-2">
                  {selectedOrder.items?.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center py-1 px-2 hover:bg-muted/50 rounded">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{item.name}</div>
                        {item.sku && (
                          <div className="text-xs text-muted-foreground">{t('sku')}: {item.sku}</div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{t('qty')}: {item.quantity}</div>
                        {item.unitPrice && (
                          <div className="text-xs text-muted-foreground">¥{item.unitPrice}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  {t('eachItemWillBecome')}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowUnpackDialog(false)}
              disabled={unpackMutation.isPending}
            >
              {t('cancel')}
            </Button>
            <Button 
              onClick={confirmUnpack}
              disabled={unpackMutation.isPending}
              className="gap-2"
            >
              {unpackMutation.isPending ? (
                <>{t('processing')}</>
              ) : (
                <>
                  <PackageOpen className="h-4 w-4" />
                  {t('confirmUnpack')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('areYouSure')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteItemConfirmation', { name: deleteTarget?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Move to Consolidation Dialog */}
      <Dialog 
        open={!!moveToConsolidationItem || bulkMoveItems.size > 0} 
        onOpenChange={(open) => {
          if (!open) {
            setMoveToConsolidationItem(null);
            setBulkMoveItems(new Set());
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{t('moveToActiveConsolidation')}</DialogTitle>
            <DialogDescription>
              {bulkMoveItems.size > 0 
                ? t('selectConsolidationToMoveBulk', { count: bulkMoveItems.size })
                : t('selectConsolidationToMove', { name: moveToConsolidationItem?.name })
              }
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {consolidations.filter(c => c.status !== 'shipped' && c.status !== 'delivered').length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">{t('noActiveConsolidations')}</p>
                  <p className="text-sm text-muted-foreground mt-1">{t('allConsolidationsShipped')}</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => {
                      setMoveToConsolidationItem(null);
                      setBulkMoveItems(new Set());
                      setIsCreateConsolidationOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('createNewConsolidation')}
                  </Button>
                </div>
              ) : (
                consolidations.filter(c => c.status !== 'shipped' && c.status !== 'delivered').map((consolidation) => (
                  <div 
                    key={consolidation.id}
                    onClick={() => {
                      const itemIds = bulkMoveItems.size > 0 
                        ? Array.from(bulkMoveItems)
                        : moveToConsolidationItem ? [moveToConsolidationItem.id] : [];
                      
                      if (itemIds.length > 0) {
                        addItemsToConsolidationMutation.mutate({
                          consolidationId: consolidation.id,
                          itemIds: itemIds
                        }, {
                          onSuccess: () => {
                            setMoveToConsolidationItem(null);
                            setBulkMoveItems(new Set());
                            toast({
                              title: t('success'),
                              description: t('itemsMovedToConsolidation', { count: itemIds.length, name: consolidation.name }),
                            });
                          }
                        });
                      }
                    }}
                    className="border rounded-lg p-4 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-semibold text-lg group-hover:text-primary transition-colors">
                          {consolidation.name}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {consolidation.location || consolidation.warehouse.replace('_', ', ')}
                        </div>
                      </div>
                      {getShippingMethodBadge(consolidation.shippingMethod)}
                    </div>
                    
                    <div className="flex items-center gap-4 mt-3 text-sm">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Package className="h-4 w-4" />
                        <span className="font-medium">{consolidation.itemCount || 0}</span>
                        <span>{t('items')}</span>
                      </div>
                      {consolidation.targetWeight && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Weight className="h-4 w-4" />
                          <span>{t('max')}:</span>
                          <span className="font-medium">{consolidation.targetWeight} kg</span>
                        </div>
                      )}
                      <div className="ml-auto">
                        {getStatusBadge(consolidation.status)}
                      </div>
                    </div>
                    
                    {consolidation.notes && (
                      <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">
                        {consolidation.notes}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setMoveToConsolidationItem(null)}
              disabled={addItemsToConsolidationMutation.isPending}
            >
              {t('cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Consolidation Dialog */}
      <Dialog open={!!editingConsolidation} onOpenChange={(open) => !open && setEditingConsolidation(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('editConsolidation')}</DialogTitle>
            <DialogDescription>
              {t('updateConsolidationDetails')}
            </DialogDescription>
          </DialogHeader>
          {editingConsolidation && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="consolidation-name">{t('consolidationName')}</Label>
                <Input
                  id="consolidation-name"
                  value={editingConsolidation.name}
                  onChange={(e) => setEditingConsolidation({
                    ...editingConsolidation,
                    name: e.target.value
                  })}
                  placeholder={t('enterConsolidationName')}
                />
              </div>
              
              <div>
                <Label htmlFor="shipment-type">{t('shipmentType')}</Label>
                <Select 
                  value={editingConsolidation.shippingMethod || "not_set"}
                  onValueChange={(value) => setEditingConsolidation({
                    ...editingConsolidation,
                    shippingMethod: value === "not_set" ? null : value
                  })}
                >
                  <SelectTrigger id="shipment-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_set">{t('notSet')}</SelectItem>
                    <SelectItem value="general_air_ddp">
                      <div className="flex items-center gap-2">
                        <Plane className="h-4 w-4" />
                        {t('generalAirDdp')}
                      </div>
                    </SelectItem>
                    <SelectItem value="sensitive_air_ddp">
                      <div className="flex items-center gap-2">
                        <Plane className="h-4 w-4 text-orange-500" />
                        {t('sensitiveAirDdp')}
                      </div>
                    </SelectItem>
                    <SelectItem value="express_general">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        {t('expressGeneral')}
                      </div>
                    </SelectItem>
                    <SelectItem value="express_sensitive">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-orange-500" />
                        {t('expressSensitive')}
                      </div>
                    </SelectItem>
                    <SelectItem value="railway_general">
                      <div className="flex items-center gap-2">
                        <Train className="h-4 w-4" />
                        {t('railwayGeneral')}
                      </div>
                    </SelectItem>
                    <SelectItem value="railway_sensitive">
                      <div className="flex items-center gap-2">
                        <Train className="h-4 w-4 text-orange-500" />
                        {t('railwaySensitive')}
                      </div>
                    </SelectItem>
                    <SelectItem value="sea_general">
                      <div className="flex items-center gap-2">
                        <Ship className="h-4 w-4" />
                        {t('seaGeneral')}
                      </div>
                    </SelectItem>
                    <SelectItem value="sea_sensitive">
                      <div className="flex items-center gap-2">
                        <Ship className="h-4 w-4 text-orange-500" />
                        {t('seaSensitive')}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="notes">{t('notesOptional')}</Label>
                <Textarea
                  id="notes"
                  value={editingConsolidation.notes || ""}
                  onChange={(e) => setEditingConsolidation({
                    ...editingConsolidation,
                    notes: e.target.value
                  })}
                  placeholder={t('addSpecialInstructions')}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setEditingConsolidation(null)}
              disabled={updateConsolidationMutation.isPending}
            >
              {t('cancel')}
            </Button>
            <Button 
              onClick={() => {
                if (editingConsolidation) {
                  updateConsolidationMutation.mutate({
                    id: editingConsolidation.id,
                    data: {
                      name: editingConsolidation.name,
                      shippingMethod: editingConsolidation.shippingMethod,
                      notes: editingConsolidation.notes
                    }
                  });
                }
              }}
              disabled={updateConsolidationMutation.isPending || !editingConsolidation?.name}
            >
              {updateConsolidationMutation.isPending ? t('saving') : t('saveChanges')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tracking Numbers Export Modal */}
      <Dialog open={showTrackingModal} onOpenChange={setShowTrackingModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{t('trackingNumbersList')}</DialogTitle>
            <DialogDescription>
              {t('copyAll')} {selectedConsolidationTracking?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedConsolidationTracking?.trackingNumbers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t('noTrackingNumbersFound')}</p>
                <p className="text-sm mt-2">{t('noTrackingNumbersYet')}</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>{t('trackingNumbersCount', { count: selectedConsolidationTracking?.trackingNumbers.length })}</Label>
                  <Textarea 
                    readOnly
                    value={selectedConsolidationTracking?.trackingNumbers.join('\n') || ''}
                    className="min-h-[200px] font-mono text-sm"
                    onClick={(e) => e.currentTarget.select()}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('clickToSelectAll')}
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      if (selectedConsolidationTracking?.trackingNumbers) {
                        navigator.clipboard.writeText(selectedConsolidationTracking.trackingNumbers.join('\n'));
                        toast({
                          title: t('copied'),
                          description: t('trackingNumbersCopiedWithCount', { count: selectedConsolidationTracking.trackingNumbers.length }),
                        });
                      }
                    }}
                  >
                    <Package className="h-4 w-4 mr-2" />
                    {t('copyToClipboard')}
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      if (selectedConsolidationTracking?.trackingNumbers) {
                        // Copy with comma separation for easy paste into shipping forms
                        navigator.clipboard.writeText(selectedConsolidationTracking.trackingNumbers.join(', '));
                        toast({
                          title: t('copied'),
                          description: t('trackingNumbersCopied'),
                        });
                      }
                    }}
                  >
                    {t('copyWithCommas')}
                  </Button>
                </div>
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowTrackingModal(false);
                setSelectedConsolidationTracking(null);
              }}
            >
              {t('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}