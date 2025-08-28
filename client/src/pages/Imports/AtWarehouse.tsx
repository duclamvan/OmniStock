import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Package, Plane, Ship, Zap, Truck, MapPin, Clock, Weight, Users, ShoppingCart, Star, Trash2, Package2, PackageOpen, AlertCircle, CheckCircle, Edit, MoreHorizontal, ArrowUp, ArrowDown, Archive, Send, RefreshCw, Flag, Shield, Grip, AlertTriangle, ChevronDown, ChevronRight, Box, Sparkles, X, Search, SortAsc, CheckSquare, Square, ChevronsDown, ChevronsUp, Filter, Calendar, Hash, Camera, ArrowRightToLine, MoreVertical, Edit2 } from "lucide-react";
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
  createdAt: string;
}

interface Consolidation {
  id: number;
  name: string;
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
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  ordered: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  in_transit: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  at_warehouse: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  unpacked: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  available: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  assigned: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  consolidated: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  shipped: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
};

const shippingMethodColors: Record<string, string> = {
  air_express: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200",
  air_standard: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200",
  sea_freight: "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900 dark:text-cyan-200",
  rail_freight: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200",
  priority: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900 dark:text-purple-200"
};

const shippingMethodIcons: Record<string, any> = {
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

export default function AtWarehouse() {
  const [isAddCustomItemOpen, setIsAddCustomItemOpen] = useState(false);
  const [isEditCustomItemOpen, setIsEditCustomItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CustomItem | null>(null);
  const [isCreateConsolidationOpen, setIsCreateConsolidationOpen] = useState(false);
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
  const [itemCustomerFilter, setItemCustomerFilter] = useState<string>("all");
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
    
    // Apply customer filter
    if (itemCustomerFilter === "has_customer") {
      filtered = filtered.filter(item => item.customerName);
    } else if (itemCustomerFilter === "no_customer") {
      filtered = filtered.filter(item => !item.customerName);
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
    itemClassificationFilter,
    itemCustomerFilter
  ]);

  // Filter orders by location
  const filteredOrders = locationFilter === "all" 
    ? atWarehouseOrders 
    : atWarehouseOrders.filter(order => order.location === locationFilter);

  // Fetch consolidations
  const { data: consolidations = [], isLoading: isLoadingConsolidations } = useQuery<Consolidation[]>({
    queryKey: ['/api/imports/consolidations'],
  });
  
  // Fetch consolidation items for expanded consolidations - expanded by default
  const [expandedConsolidations, setExpandedConsolidations] = useState<Set<number>>(new Set());
  const [consolidationItems, setConsolidationItems] = useState<Record<number, any[]>>({});
  const [editingConsolidation, setEditingConsolidation] = useState<any>(null);

  // Unpack purchase order mutation
  const unpackMutation = useMutation({
    mutationFn: async (purchaseId: number) => {
      return apiRequest('/api/imports/purchases/unpack', 'POST', { purchaseId });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Purchase order has been unpacked successfully",
      });
      setShowUnpackDialog(false);
      setSelectedOrder(null);
      queryClient.invalidateQueries({ queryKey: ['/api/imports/purchases/at-warehouse'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/unpacked-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/custom-items'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to unpack purchase order",
        variant: "destructive",
      });
    },
  });

  // Receive without unpacking mutation
  const receiveMutation = useMutation({
    mutationFn: async (purchaseId: number) => {
      return apiRequest('/api/imports/purchases/receive', 'POST', { purchaseId });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Purchase order received as a single package",
      });
      setShowReceiveDialog(false);
      setSelectedOrder(null);
      queryClient.invalidateQueries({ queryKey: ['/api/imports/purchases/at-warehouse'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/custom-items'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to receive purchase order",
        variant: "destructive",
      });
    },
  });

  // Update purchase order status mutation
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      return apiRequest(`/api/imports/purchases/${id}`, 'PATCH', { status });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Order status updated successfully",
      });
      setShowStatusDialog(false);
      setStatusTarget(null);
      queryClient.invalidateQueries({ queryKey: ['/api/imports/purchases/at-warehouse'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/purchases'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update order status",
        variant: "destructive",
      });
    },
  });

  // Update custom item status mutation
  const updateItemStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      return apiRequest(`/api/imports/custom-items/${id}`, 'PATCH', { status });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Item status updated successfully",
      });
      setShowStatusDialog(false);
      setStatusTarget(null);
      queryClient.invalidateQueries({ queryKey: ['/api/imports/custom-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/unpacked-items'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update item status",
        variant: "destructive",
      });
    },
  });

  // Update item classification mutation
  const updateItemClassificationMutation = useMutation({
    mutationFn: async ({ id, classification }: { id: number, classification: string | null }) => {
      return apiRequest(`/api/imports/custom-items/${id}`, 'PATCH', { classification });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Item classification updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/custom-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/unpacked-items'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update classification",
        variant: "destructive",
      });
    },
  });

  // AI auto-classification mutation
  const aiClassifyMutation = useMutation({
    mutationFn: async (itemIds: number[]) => {
      return apiRequest('/api/imports/items/auto-classify', 'POST', { itemIds });
    },
    onSuccess: (data: any) => {
      toast({
        title: "AI Classification Complete",
        description: data?.message || "Items have been automatically classified",
      });
      setSelectedItemsForAI(new Set());
      setIsAIProcessing(false);
      queryClient.invalidateQueries({ queryKey: ['/api/imports/custom-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/unpacked-items'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to auto-classify items",
        variant: "destructive",
      });
      setIsAIProcessing(false);
    },
  });

  // Create custom item mutation
  const createCustomItemMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/imports/custom-items', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/custom-items'] });
      setIsAddCustomItemOpen(false);
      toast({ title: "Success", description: "Custom item added successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add custom item", variant: "destructive" });
    }
  });

  // Update custom item mutation
  const updateCustomItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      return apiRequest(`/api/imports/custom-items/${id}`, 'PATCH', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/custom-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/unpacked-items'] });
      setIsEditCustomItemOpen(false);
      setEditingItem(null);
      toast({ title: "Success", description: "Item updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update item", variant: "destructive" });
    }
  });

  // Delete custom item mutation
  const deleteCustomItemMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/imports/custom-items/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/custom-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/unpacked-items'] });
      toast({ title: "Success", description: "Item deleted successfully" });
      setDeleteTarget(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete item", variant: "destructive" });
    }
  });

  // Unpack custom item mutation
  const unpackItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const response = await apiRequest(`/api/imports/custom-items/${itemId}/unpack`, 'POST');
      return response;
    },
    onSuccess: (data: any) => {
      toast({
        title: "Success",
        description: `Unpacked ${data.unpackedItems?.length || 0} items successfully`,
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
        title: "Error",
        description: error.message || "Failed to unpack item",
        variant: "destructive",
      });
    }
  });

  // Fetch items for a consolidation
  const fetchConsolidationItems = async (consolidationId: number) => {
    try {
      const response = await fetch(`/api/imports/consolidations/${consolidationId}/items`);
      if (response.ok) {
        const items = await response.json();
        // Items are already sorted by the backend (by when they were added)
        setConsolidationItems(prev => ({ ...prev, [consolidationId]: items }));
      }
    } catch (error) {
      console.error('Failed to fetch consolidation items:', error);
    }
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
  
  // Toggle consolidation expansion
  const toggleConsolidationExpanded = (consolidationId: number) => {
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

  // Simple add items mutation with optimized cache updates
  const addItemsToConsolidationMutation = useMutation({
    mutationFn: async ({ consolidationId, itemIds }: { consolidationId: number, itemIds: number[] }) => {
      return apiRequest(`/api/imports/consolidations/${consolidationId}/items`, 'POST', { itemIds });
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
      toast({ title: "Error", description: "Failed to add item", variant: "destructive" });
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
      toast({ title: "Success", description: "Item added to consolidation" });
    }
  });

  // Create consolidation mutation
  const createConsolidationMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/imports/consolidations', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/consolidations'] });
      setIsCreateConsolidationOpen(false);
      toast({ title: "Success", description: "Consolidation created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create consolidation", variant: "destructive" });
    }
  });

  // Delete consolidation mutation
  const deleteConsolidationMutation = useMutation({
    mutationFn: async (consolidationId: number) => {
      return apiRequest(`/api/imports/consolidations/${consolidationId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/consolidations'] });
      toast({ title: "Success", description: "Consolidation deleted successfully" });
      setDeleteTarget(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete consolidation", variant: "destructive" });
    }
  });
  
  // Remove item from consolidation mutation with optimistic updates
  const removeItemFromConsolidationMutation = useMutation({
    mutationFn: async ({ consolidationId, itemId }: { consolidationId: number, itemId: number }) => {
      return apiRequest(`/api/imports/consolidations/${consolidationId}/items/${itemId}`, 'DELETE');
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
      toast({ title: "Error", description: "Failed to remove item", variant: "destructive" });
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
      toast({ title: "Success", description: "Item removed from consolidation" });
    }
  });
  
  // Ship consolidation mutation
  const shipConsolidationMutation = useMutation({
    mutationFn: async ({ id, trackingNumber, carrier }: { id: number, trackingNumber?: string, carrier?: string }) => {
      return apiRequest(`/api/imports/consolidations/${id}/ship`, 'POST', { trackingNumber, carrier });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/consolidations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/custom-items'] });
      toast({ title: "Success", description: "Consolidation shipped successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to ship consolidation", variant: "destructive" });
    }
  });
  
  // Update consolidation mutation  
  const updateConsolidationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      return apiRequest(`/api/imports/consolidations/${id}`, 'PATCH', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/consolidations'] });
      toast({ title: "Success", description: "Consolidation updated" });
      setEditingConsolidation(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update consolidation", variant: "destructive" });
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
        title: "Success",
        description: `Extracted ${items.length} item(s) from screenshot`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process screenshot. Please add items manually.",
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
    
    const data = {
      name: formData.get('name') as string,
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
      const itemId = parseInt(result.draggableId.replace('item-', ''));
      const consolidationId = parseInt(destinationId.replace('consolidation-', ''));
      
      if (!isNaN(itemId) && !isNaN(consolidationId)) {
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
          <span className="text-xs font-medium text-red-600">Sensitive</span>
        </div>
      );
    } else if (classification === 'general') {
      return (
        <div className="flex items-center gap-1">
          <Flag className="h-4 w-4 text-green-500 fill-green-500" />
          <span className="text-xs font-medium text-green-600">General</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1">
        <div className="h-4 w-4 border-2 border-dashed border-gray-300 rounded" />
        <span className="text-xs font-medium text-gray-500">Unclassified</span>
      </div>
    );
  };

  const getClassificationBadge = (classification?: string) => {
    if (classification === 'sensitive') {
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          <Shield className="h-3 w-3 mr-1" />
          Sensitive
        </Badge>
      );
    }
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        <Flag className="h-3 w-3 mr-1" />
        General
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">At Warehouse</h1>
          <p className="text-muted-foreground">Process incoming orders and manage warehouse items</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Location Filter */}
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-[150px]" data-testid="select-location-filter">
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              <SelectItem value="China">🇨🇳 China</SelectItem>
              <SelectItem value="USA">🇺🇸 USA</SelectItem>
              <SelectItem value="Vietnam">🇻🇳 Vietnam</SelectItem>
              <SelectItem value="Europe">🇪🇺 Europe</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex space-x-2">
          <Dialog open={isAddCustomItemOpen} onOpenChange={setIsAddCustomItemOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-add-custom-item">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Add Custom Item
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Custom Item</DialogTitle>
                <DialogDescription>
                  Add items from external sources like Taobao, Pinduoduo, etc.
                </DialogDescription>
              </DialogHeader>
              {/* AI Screenshot Upload Section */}
              <div className="mb-4 p-4 border-2 border-dashed rounded-lg bg-muted/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Camera className="h-5 w-5 text-primary" />
                    <Label className="text-base font-semibold">AI Screenshot Reader</Label>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Pinduoduo / Taobao
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Upload a screenshot from Pinduoduo or Taobao to auto-extract order details
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
                      <span>Processing...</span>
                    </div>
                  )}
                </div>
              </div>

              <form onSubmit={handleCreateCustomItem} className="space-y-4">
                {/* Extracted Items Table */}
                {extractedItems.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-base font-semibold">Extracted Items ({extractedItems.length})</Label>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item Name</TableHead>
                            <TableHead>Platform</TableHead>
                            <TableHead>Order #</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Classification</TableHead>
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
                                    <SelectItem value="taobao">Taobao</SelectItem>
                                    <SelectItem value="pinduoduo">Pinduoduo</SelectItem>
                                    <SelectItem value="1688">1688</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
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
                                    <SelectItem value="general">General</SelectItem>
                                    <SelectItem value="sensitive">Sensitive</SelectItem>
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
                        <Label htmlFor="name">Item Name *</Label>
                        <Input 
                          id="name" 
                          name="name" 
                          required 
                          data-testid="input-item-name"
                          placeholder="Enter item name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="source">Source Platform *</Label>
                        <Select name="source" required>
                          <SelectTrigger data-testid="select-source">
                            <SelectValue placeholder="Select platform" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="taobao">Taobao</SelectItem>
                            <SelectItem value="pinduoduo">Pinduoduo</SelectItem>
                            <SelectItem value="1688">1688</SelectItem>
                            <SelectItem value="alibaba">Alibaba</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="orderNumber">Order Number</Label>
                        <Input 
                          id="orderNumber" 
                          name="orderNumber" 
                          data-testid="input-order-number"
                          placeholder="Platform order number"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="classification">Goods Classification *</Label>
                        <Select name="classification" defaultValue="general">
                          <SelectTrigger data-testid="select-classification">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">
                              <div className="flex items-center">
                                <Flag className="h-4 w-4 mr-2 text-green-500" />
                                General Goods
                              </div>
                            </SelectItem>
                            <SelectItem value="sensitive">
                              <div className="flex items-center">
                                <Shield className="h-4 w-4 mr-2 text-red-500" />
                                Sensitive Goods
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="quantity">Quantity *</Label>
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
                        <Label htmlFor="unitPrice">Unit Price ($)</Label>
                        <Input 
                          id="unitPrice" 
                          name="unitPrice" 
                          type="number" 
                          step="0.01" 
                          data-testid="input-unit-price"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea 
                        id="notes" 
                        name="notes" 
                        data-testid="textarea-notes"
                        placeholder="Additional notes..."
                        rows={2}
                      />
                    </div>
                  </>
                )}

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddCustomItemOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createCustomItemMutation.isPending} data-testid="button-submit-item">
                    {createCustomItemMutation.isPending ? "Adding..." : extractedItems.length > 0 ? `Add ${extractedItems.length} Items` : "Add Item"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateConsolidationOpen} onOpenChange={setIsCreateConsolidationOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-consolidation">
                <Plus className="h-4 w-4 mr-2" />
                Create Consolidation
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Create New Consolidation</DialogTitle>
                <DialogDescription>
                  Create a new shipment consolidation for grouping items
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateConsolidation} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Consolidation Name *</Label>
                  <Input 
                    id="name" 
                    name="name" 
                    required 
                    data-testid="input-consolidation-name"
                    placeholder="e.g., USA Express Batch #1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="shippingMethod">Shipping Method *</Label>
                    <Select name="shippingMethod" required>
                      <SelectTrigger data-testid="select-shipping-method">
                        <SelectValue placeholder="Select shipping method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="priority">
                          <div className="flex items-center space-x-2">
                            <Star className="h-4 w-4 text-purple-600" />
                            <span>Priority Express</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="air_express">
                          <div className="flex items-center space-x-2">
                            <Zap className="h-4 w-4 text-red-600" />
                            <span>Air Express</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="air_standard">
                          <div className="flex items-center space-x-2">
                            <Plane className="h-4 w-4 text-blue-600" />
                            <span>Air Standard</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="sea_freight">
                          <div className="flex items-center space-x-2">
                            <Ship className="h-4 w-4 text-cyan-600" />
                            <span>Sea Freight</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="rail_freight">
                          <div className="flex items-center space-x-2">
                            <Truck className="h-4 w-4 text-green-600" />
                            <span>Rail Freight</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="warehouse">Warehouse Location *</Label>
                    <Select name="warehouse" required>
                      <SelectTrigger data-testid="select-warehouse">
                        <SelectValue placeholder="Select warehouse" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="china_guangzhou">China - Guangzhou</SelectItem>
                        <SelectItem value="china_shenzhen">China - Shenzhen</SelectItem>
                        <SelectItem value="usa_california">USA - California</SelectItem>
                        <SelectItem value="usa_new_york">USA - New York</SelectItem>
                        <SelectItem value="vietnam_hcmc">Vietnam - Ho Chi Minh</SelectItem>
                        <SelectItem value="vietnam_hanoi">Vietnam - Hanoi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="targetWeight">Target Weight (kg)</Label>
                    <Input 
                      id="targetWeight" 
                      name="targetWeight" 
                      type="number" 
                      step="0.1" 
                      data-testid="input-target-weight"
                      placeholder="Max weight limit"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxItems">Max Items</Label>
                    <Input 
                      id="maxItems" 
                      name="maxItems" 
                      type="number" 
                      min="1" 
                      data-testid="input-max-items"
                      placeholder="Max item count"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea 
                    id="notes" 
                    name="notes" 
                    data-testid="textarea-consolidation-notes"
                    placeholder="Additional notes about this consolidation..."
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateConsolidationOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createConsolidationMutation.isPending} data-testid="button-submit-consolidation">
                    {createConsolidationMutation.isPending ? "Creating..." : "Create Consolidation"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Incoming Orders</CardTitle>
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
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
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
            <CardTitle className="text-sm font-medium">Sensitive Goods</CardTitle>
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
            <CardTitle className="text-sm font-medium">Consolidations</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-consolidations-count">
              {consolidations.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="incoming" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="incoming">
            Incoming Orders ({filteredOrders.length})
          </TabsTrigger>
          <TabsTrigger value="items">
            All Items ({allItems.length})
          </TabsTrigger>
        </TabsList>

        {/* Incoming Orders Tab */}
        <TabsContent value="incoming" className="space-y-4">
          {filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No incoming orders at warehouse</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Orders with "At Warehouse" status will appear here
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
                          <h3 className="text-lg font-semibold">PO #{order.id} - {order.supplier}</h3>
                          {getStatusBadge(order.status)}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Items</div>
                            <div className="font-medium">{order.items?.length || 0}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Total Value</div>
                            <div className="font-medium">
                              {order.paymentCurrency} {Number(order.totalPaid || 0).toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Tracking</div>
                            <div className="font-mono text-xs">{order.trackingNumber || 'N/A'}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Arrived</div>
                            <div className="text-sm">
                              {order.updatedAt ? format(new Date(order.updatedAt), 'MMM dd, yyyy') : 'N/A'}
                            </div>
                          </div>
                        </div>

                        {order.items && order.items.length > 0 && (
                          <div className="border rounded-lg p-3 bg-muted/30">
                            <div className="text-sm font-medium mb-2">Order Items:</div>
                            <div className="space-y-1">
                              {(expandedOrders.has(order.id) ? order.items : order.items.slice(0, 5)).map((item: any, index: number) => (
                                <div key={index} className="text-sm flex justify-between">
                                  <span className="text-muted-foreground">
                                    {item.name} {item.sku && `(${item.sku})`}
                                  </span>
                                  <span className="font-medium">Qty: {item.quantity}</span>
                                </div>
                              ))}
                              {!expandedOrders.has(order.id) && order.items.length > 5 && (
                                <button
                                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline cursor-pointer pt-1"
                                  onClick={() => toggleOrderExpanded(order.id)}
                                >
                                  ... and {order.items.length - 5} more items
                                </button>
                              )}
                              {expandedOrders.has(order.id) && order.items.length > 5 && (
                                <button
                                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline cursor-pointer pt-1"
                                  onClick={() => toggleOrderExpanded(order.id)}
                                >
                                  Show less
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
                          Receive
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => handleUnpack(order)}
                          data-testid={`button-unpack-order-${order.id}`}
                        >
                          <PackageOpen className="h-4 w-4 mr-1" />
                          Unpack
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
        <TabsContent value="items" className="space-y-4">
          {/* AI Classification Bar */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  <h3 className="font-semibold text-gray-900">AI Goods Classification</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Automatically classify items as sensitive or general goods based on product names, categories, and historical data.
                  {selectedItemsForAI.size > 0 && (
                    <span className="ml-2 font-medium text-purple-600">
                      {selectedItemsForAI.size} item{selectedItemsForAI.size > 1 ? 's' : ''} selected
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {selectedItemsForAI.size > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedItemsForAI(new Set())}
                  >
                    Clear Selection
                  </Button>
                )}
                <Button
                  onClick={() => {
                    const itemsToClassify = selectedItemsForAI.size > 0 
                      ? Array.from(selectedItemsForAI)
                      : sortedAndFilteredItems.map(item => item.id);
                    
                    if (itemsToClassify.length === 0) {
                      toast({
                        title: "No items to classify",
                        description: "All items are already consolidated or no items available",
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    setIsAIProcessing(true);
                    aiClassifyMutation.mutate(itemsToClassify);
                  }}
                  disabled={isAIProcessing || aiClassifyMutation.isPending}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {aiClassifyMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      {selectedItemsForAI.size > 0 ? `Classify Selected` : 'Auto-Classify All'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Available Items Column */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">Available Items</CardTitle>
                          <CardDescription>Drag items to consolidations or select for AI classification</CardDescription>
                        </div>
                        <Badge variant="secondary" className="font-medium">
                          {sortedAndFilteredItems.length} items
                        </Badge>
                      </div>
                      
                      {/* Search and Sort Controls */}
                      <div className="flex gap-2 flex-wrap">
                        <div className="relative flex-1 min-w-[200px]">
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search items by name, order number, source..."
                            value={itemSearchTerm}
                            onChange={(e) => setItemSearchTerm(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                        
                        <Select value={itemSortBy} onValueChange={setItemSortBy}>
                          <SelectTrigger className="w-[200px]">
                            <SortAsc className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Sort by..." />
                          </SelectTrigger>
                          <SelectContent>
                            {itemSortBy === 'custom' && (
                              <>
                                <SelectItem value="custom">
                                  <div className="flex items-center">
                                    <Grip className="h-4 w-4 mr-2" />
                                    Custom Order
                                  </div>
                                </SelectItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            <SelectItem value="newest">
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2" />
                                Newest First
                              </div>
                            </SelectItem>
                            <SelectItem value="oldest">
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2" />
                                Oldest First
                              </div>
                            </SelectItem>
                            <DropdownMenuSeparator />
                            <SelectItem value="sensitive-first">
                              <div className="flex items-center">
                                <Flag className="h-4 w-4 text-red-500 fill-red-500 mr-2" />
                                Sensitive First
                              </div>
                            </SelectItem>
                            <SelectItem value="general-first">
                              <div className="flex items-center">
                                <Flag className="h-4 w-4 text-green-500 fill-green-500 mr-2" />
                                General First
                              </div>
                            </SelectItem>
                            <DropdownMenuSeparator />
                            <SelectItem value="name-asc">
                              <div className="flex items-center">
                                <ArrowUp className="h-4 w-4 mr-2" />
                                Name (A-Z)
                              </div>
                            </SelectItem>
                            <SelectItem value="name-desc">
                              <div className="flex items-center">
                                <ArrowDown className="h-4 w-4 mr-2" />
                                Name (Z-A)
                              </div>
                            </SelectItem>
                            <DropdownMenuSeparator />
                            <SelectItem value="quantity-high">
                              <div className="flex items-center">
                                <Hash className="h-4 w-4 mr-2" />
                                Quantity (High-Low)
                              </div>
                            </SelectItem>
                            <SelectItem value="quantity-low">
                              <div className="flex items-center">
                                <Hash className="h-4 w-4 mr-2" />
                                Quantity (Low-High)
                              </div>
                            </SelectItem>
                            <DropdownMenuSeparator />
                            <SelectItem value="weight-high">
                              <div className="flex items-center">
                                <Weight className="h-4 w-4 mr-2" />
                                Weight (Heavy-Light)
                              </div>
                            </SelectItem>
                            <SelectItem value="weight-low">
                              <div className="flex items-center">
                                <Weight className="h-4 w-4 mr-2" />
                                Weight (Light-Heavy)
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Filter Controls */}
                      <div className="flex gap-2 flex-wrap">
                        <Select value={itemSourceFilter} onValueChange={setItemSourceFilter}>
                          <SelectTrigger className="w-[140px]">
                            <Filter className="h-3 w-3 mr-2" />
                            <SelectValue placeholder="Source" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Sources</SelectItem>
                            <SelectItem value="taobao">Taobao</SelectItem>
                            <SelectItem value="pinduoduo">Pinduoduo</SelectItem>
                            <SelectItem value="1688">1688</SelectItem>
                            <SelectItem value="alibaba">Alibaba</SelectItem>
                            <SelectItem value="jd.com">JD.com</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <Select value={itemClassificationFilter} onValueChange={setItemClassificationFilter}>
                          <SelectTrigger className="w-[150px]">
                            <Flag className="h-3 w-3 mr-2" />
                            <SelectValue placeholder="Classification" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Items</SelectItem>
                            <SelectItem value="general">General</SelectItem>
                            <SelectItem value="sensitive">Sensitive</SelectItem>
                            <SelectItem value="unclassified">Unclassified</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <Select value={itemCustomerFilter} onValueChange={setItemCustomerFilter}>
                          <SelectTrigger className="w-[140px]">
                            <Users className="h-3 w-3 mr-2" />
                            <SelectValue placeholder="Customer" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Items</SelectItem>
                            <SelectItem value="has_customer">Has Customer</SelectItem>
                            <SelectItem value="no_customer">No Customer</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        {(itemSourceFilter !== "all" || itemClassificationFilter !== "all" || itemCustomerFilter !== "all") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setItemSourceFilter("all");
                              setItemClassificationFilter("all");
                              setItemCustomerFilter("all");
                            }}
                            className="h-9"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Clear Filters
                          </Button>
                        )}
                      </div>
                      
                      {/* Quick Stats and Bulk Actions */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Flag className="h-4 w-4 text-red-500 fill-red-500" />
                            <span className="text-muted-foreground">
                              {sortedAndFilteredItems.filter(i => i.classification === 'sensitive').length} Sensitive
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Flag className="h-4 w-4 text-green-500 fill-green-500" />
                            <span className="text-muted-foreground">
                              {sortedAndFilteredItems.filter(i => i.classification === 'general').length} General
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="h-4 w-4 border-2 border-dashed border-gray-400 rounded" />
                            <span className="text-muted-foreground">
                              {sortedAndFilteredItems.filter(i => !i.classification).length} Unclassified
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
                                    Deselect All ({selectedItemsForAI.size})
                                  </>
                                );
                              } else {
                                return (
                                  <>
                                    <CheckSquare className="h-3 w-3 mr-1" />
                                    Select All ({sortedAndFilteredItems.length})
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
                                title="Expand all items with sub-items"
                              >
                                <ChevronsDown className={selectedItemsForAI.size > 0 ? "h-3 w-3" : "h-3 w-3 mr-1"} />
                                {selectedItemsForAI.size === 0 && "Expand All"}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={collapseAllItems}
                                title="Collapse all items"
                              >
                                <ChevronsUp className={selectedItemsForAI.size > 0 ? "h-3 w-3" : "h-3 w-3 mr-1"} />
                                {selectedItemsForAI.size === 0 && "Collapse All"}
                              </Button>
                            </>
                          )}
                          {selectedItemsForAI.size > 0 && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                  Bulk Actions ({selectedItemsForAI.size})
                                  <ChevronDown className="h-4 w-4 ml-1" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Classification</DropdownMenuLabel>
                                <DropdownMenuItem
                                  onClick={() => {
                                    selectedItemsForAI.forEach(id => {
                                      updateItemClassificationMutation.mutate({ id, classification: 'general' });
                                    });
                                    setSelectedItemsForAI(new Set());
                                  }}
                                >
                                  <Flag className="h-4 w-4 text-green-500 fill-green-500 mr-2" />
                                  Mark as General
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
                                  Mark as Sensitive
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
                                  Clear Classification
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel>AI Actions</DropdownMenuLabel>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setIsAIProcessing(true);
                                    aiClassifyMutation.mutate(Array.from(selectedItemsForAI));
                                  }}
                                >
                                  <Sparkles className="h-4 w-4 mr-2" />
                                  AI Classify Selected
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel>Move Items</DropdownMenuLabel>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setBulkMoveItems(new Set(selectedItemsForAI));
                                    setSelectedItemsForAI(new Set());
                                  }}
                                >
                                  <ArrowRightToLine className="h-4 w-4 mr-2" />
                                  Move to Consolidation
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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
                          {sortedAndFilteredItems.map((item, index) => (
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
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      {/* Top row with drag handle and name */}
                                      <div className="flex items-start gap-3">
                                        <div className="flex items-center mt-0.5">
                                          <div 
                                            data-drag-handle
                                            className="hover:bg-muted/50 rounded p-0.5 transition-colors"
                                            title={itemSortBy === 'custom' ? "Drag card to reorder items" : "Drag card to consolidation"}
                                          >
                                            <Grip className="h-4 w-4 text-muted-foreground flex-shrink-0 hover:text-primary transition-colors" />
                                          </div>
                                        </div>
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-base">{item.name}</span>
                                            {getClassificationIcon(item.classification)}
                                          </div>
                                          
                                          {/* Compact metadata row */}
                                          <div className="flex items-center gap-2 mt-1 text-sm text-gray-700 dark:text-gray-300 flex-wrap">
                                            <span>Qty: {item.quantity}</span>
                                            {item.weight && <span>• {item.weight} kg</span>}
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
                                            {/* Inline items toggle for purchase orders */}
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
                                                  title={expandedItems.has(item.id) ? "Hide items" : "Show items"}
                                                >
                                                  <ChevronDown className={`h-3 w-3 transition-transform ${expandedItems.has(item.id) ? '' : '-rotate-90'}`} />
                                                  <span className="ml-1">{item.orderItems.length} items</span>
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
                                                  <span className="text-gray-700 dark:text-gray-300">Qty: {orderItem.quantity}</span>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex gap-1 items-start">
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
                                              Unpack All Items
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleEditItem(item);
                                              }}
                                            >
                                              <Edit2 className="h-4 w-4 mr-2" />
                                              Edit Package
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setDeleteTarget({ type: 'item', id: item.id, name: item.name });
                                              }}
                                              className="text-red-600"
                                            >
                                              <Trash2 className="h-4 w-4 mr-2" />
                                              Delete Package
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
                                          <DropdownMenuLabel>Set Classification</DropdownMenuLabel>
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
                                            None
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
                                            General Goods
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
                                            Sensitive Goods
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                      
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setMoveToConsolidationItem({ id: item.id, name: item.name });
                                        }}
                                        className="h-8 px-2"
                                        title="Move to consolidation"
                                      >
                                        <ArrowRightToLine className="h-4 w-4" />
                                      </Button>
                                      
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
                                            Delete
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </CardContent>
                </Card>
              </div>

              {/* Active Consolidations Column - Only show active */}
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Active Consolidations</CardTitle>
                    <CardDescription>
                      {consolidations.filter(c => c.status !== 'shipped' && c.status !== 'delivered').length} ready for items
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[500px] pr-4">
                      <div className="space-y-2">
                        {consolidations
                          .filter(c => c.status !== 'shipped' && c.status !== 'delivered')
                          .map((consolidation) => (
                            <div key={consolidation.id}>
                              <div className="border rounded-lg p-2.5 bg-muted/20 hover:bg-muted/30 transition-colors">
                                <div className="flex justify-between items-start mb-1.5">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <div className="font-medium text-sm">{consolidation.name}</div>
                                      <Badge className="text-xs px-1.5 py-0" variant={consolidation.shippingMethod === 'air' ? 'default' : 'secondary'}>
                                        {consolidation.shippingMethod?.replace('_', ' ').toUpperCase() || 'Not Set'}
                                      </Badge>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {consolidation.itemCount || 0} items • {consolidation.warehouse.replace('_', ' - ')}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => setEditingConsolidation(consolidation)}
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </Button>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6">
                                          <MoreVertical className="h-3 w-3" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                          onClick={() => handleShipConsolidation(consolidation)}
                                        >
                                          <Ship className="h-3 w-3 mr-2" />
                                          Ship Consolidation
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={async () => {
                                            // Get full item details including tracking numbers
                                            const items = consolidationItems[consolidation.id] || [];
                                            const trackingNumbers: string[] = [];
                                            
                                            // Collect tracking numbers from items
                                            for (const item of items) {
                                              // Get the full custom item details to access tracking number
                                              const fullItem = allItems.find((i: any) => i.id === item.id);
                                              if (fullItem?.trackingNumber) {
                                                trackingNumbers.push(fullItem.trackingNumber);
                                              }
                                            }
                                            
                                            // Remove duplicates
                                            const uniqueTrackingNumbers = Array.from(new Set(trackingNumbers));
                                            
                                            setSelectedConsolidationTracking({
                                              id: consolidation.id,
                                              name: consolidation.name,
                                              trackingNumbers: uniqueTrackingNumbers
                                            });
                                            setShowTrackingModal(true);
                                          }}
                                        >
                                          <Package className="h-3 w-3 mr-2" />
                                          Export Tracking Numbers
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          onClick={() => handleDeleteConsolidation(consolidation)}
                                          className="text-destructive"
                                        >
                                          <Trash2 className="h-3 w-3 mr-2" />
                                          Delete
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
                                          {snapshot.isDraggingOver ? 'Release to add' : 'Drop items here'}
                                        </div>
                                      </div>
                                    ) : (
                                      <div>
                                        <div className="flex justify-between items-center mb-2">
                                          <div className="text-sm font-medium">{consolidation.itemCount} items</div>
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
                                              <>
                                                <ChevronDown className="h-3 w-3 mr-1" />
                                                Hide
                                              </>  
                                            ) : (
                                              <>
                                                <ChevronRight className="h-3 w-3 mr-1" />
                                                View
                                              </>
                                            )}
                                          </Button>
                                        </div>
                                        {consolidation.targetWeight && (
                                          <div className="text-xs text-muted-foreground">
                                            Max weight: {consolidation.targetWeight} kg
                                          </div>
                                        )}
                                        
                                        {/* Show items if expanded */}
                                        {expandedConsolidations.has(consolidation.id) && consolidationItems[consolidation.id] && (
                                          <div className="mt-2 space-y-1">
                                            {consolidationItems[consolidation.id].map((item: any) => (
                                              <div key={item.id} className="bg-background rounded p-2 flex justify-between items-center text-xs">
                                                <div className="flex-1">
                                                  <div className="font-medium">{item.name}</div>
                                                  <div className="text-muted-foreground">
                                                    Qty: {item.quantity} • {item.source}
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
        </TabsContent>
      </Tabs>

      {/* Edit Custom Item Dialog */}
      <Dialog open={isEditCustomItemOpen} onOpenChange={setIsEditCustomItemOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
            <DialogDescription>
              Update item details and status
            </DialogDescription>
          </DialogHeader>
          {editingItem && (
            <form onSubmit={handleUpdateCustomItem} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Item Name *</Label>
                  <Input 
                    id="edit-name" 
                    name="name" 
                    required 
                    defaultValue={editingItem.name}
                    data-testid="input-edit-item-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-source">Source Platform *</Label>
                  <Select name="source" defaultValue={editingItem.source} required>
                    <SelectTrigger data-testid="select-edit-source">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="taobao">Taobao</SelectItem>
                      <SelectItem value="pinduoduo">Pinduoduo</SelectItem>
                      <SelectItem value="1688">1688</SelectItem>
                      <SelectItem value="alibaba">Alibaba</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select name="status" defaultValue={editingItem.status}>
                    <SelectTrigger data-testid="select-edit-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="consolidated">Consolidated</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-classification">Goods Classification</Label>
                  <Select name="classification" defaultValue={editingItem.classification || 'general'}>
                    <SelectTrigger data-testid="select-edit-classification">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">
                        <div className="flex items-center">
                          <Flag className="h-4 w-4 mr-2 text-green-500" />
                          General Goods
                        </div>
                      </SelectItem>
                      <SelectItem value="sensitive">
                        <div className="flex items-center">
                          <Shield className="h-4 w-4 mr-2 text-red-500" />
                          Sensitive Goods
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-quantity">Quantity *</Label>
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
                  <Label htmlFor="edit-unitPrice">Unit Price ($)</Label>
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
                  <Label htmlFor="edit-weight">Weight (kg)</Label>
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
                <Label htmlFor="edit-dimensions">Dimensions</Label>
                <Input 
                  id="edit-dimensions" 
                  name="dimensions" 
                  defaultValue={editingItem.dimensions || ''}
                  data-testid="input-edit-dimensions"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-customerName">Customer Name</Label>
                  <Input 
                    id="edit-customerName" 
                    name="customerName" 
                    defaultValue={editingItem.customerName || ''}
                    data-testid="input-edit-customer-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-customerEmail">Customer Email</Label>
                  <Input 
                    id="edit-customerEmail" 
                    name="customerEmail" 
                    type="email" 
                    defaultValue={editingItem.customerEmail || ''}
                    data-testid="input-edit-customer-email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes</Label>
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
                  Cancel
                </Button>
                <Button type="submit" disabled={updateCustomItemMutation.isPending} data-testid="button-update-item">
                  {updateCustomItemMutation.isPending ? "Updating..." : "Update Item"}
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
            <DialogTitle>Change Status</DialogTitle>
            <DialogDescription>
              Select a new status for this {statusTarget?.type === 'order' ? 'incoming order' : 'item'}
            </DialogDescription>
          </DialogHeader>
          
          {statusTarget && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="text-sm text-muted-foreground">Current Status</div>
                <div className="mt-1">{getStatusBadge(statusTarget.currentStatus)}</div>
              </div>

              <div className="space-y-2">
                <Label>New Status</Label>
                <Select onValueChange={confirmStatusChange}>
                  <SelectTrigger data-testid="select-new-status">
                    <SelectValue placeholder="Select new status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusTarget.type === 'order' ? (
                      <>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="ordered">Ordered</SelectItem>
                        <SelectItem value="in_transit">In Transit</SelectItem>
                        <SelectItem value="at_warehouse">At Warehouse</SelectItem>
                        <SelectItem value="unpacked">Unpacked</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="assigned">Assigned</SelectItem>
                        <SelectItem value="consolidated">Consolidated</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
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
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receive without Unpacking Dialog */}
      <Dialog open={showReceiveDialog} onOpenChange={setShowReceiveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receive Purchase Order as Package</DialogTitle>
            <DialogDescription>
              This will move the entire order as a single package to the All Items section without unpacking.
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="font-medium">{selectedOrder.supplier}</div>
                <div className="text-sm text-muted-foreground">
                  PO #{selectedOrder.id} • {selectedOrder.items?.length || 0} items
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Box className="h-4 w-4 text-blue-500 mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  The entire purchase order will be treated as a single package. 
                  You can view the individual items inside the package in the All Items tab.
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
              Cancel
            </Button>
            <Button 
              onClick={confirmReceive}
              disabled={receiveMutation.isPending}
              className="gap-2"
            >
              {receiveMutation.isPending ? (
                <>Processing...</>
              ) : (
                <>
                  <Box className="h-4 w-4" />
                  Confirm Receive
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
            <DialogTitle>Unpack Purchase Order</DialogTitle>
            <DialogDescription>
              This will unpack the purchase order into individual items for consolidation.
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="font-medium">{selectedOrder.supplier}</div>
                <div className="text-sm text-muted-foreground">
                  PO #{selectedOrder.id} • {selectedOrder.items?.length || 0} items
                </div>
              </div>

              {/* Item List */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Items to be unpacked:</div>
                <div className="max-h-[200px] overflow-y-auto space-y-2 border rounded-lg p-2">
                  {selectedOrder.items?.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center py-1 px-2 hover:bg-muted/50 rounded">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{item.name}</div>
                        {item.sku && (
                          <div className="text-xs text-muted-foreground">SKU: {item.sku}</div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">Qty: {item.quantity}</div>
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
                  Each item in this purchase order will become an individual item ready for consolidation. 
                  The items will retain all supplier and order information.
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
              Cancel
            </Button>
            <Button 
              onClick={confirmUnpack}
              disabled={unpackMutation.isPending}
              className="gap-2"
            >
              {unpackMutation.isPending ? (
                <>Processing...</>
              ) : (
                <>
                  <PackageOpen className="h-4 w-4" />
                  Confirm Unpack
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
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteTarget?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
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
            <DialogTitle>Move to Active Consolidation</DialogTitle>
            <DialogDescription>
              {bulkMoveItems.size > 0 
                ? `Select an active consolidation to move ${bulkMoveItems.size} item${bulkMoveItems.size > 1 ? 's' : ''}. Shipped consolidations cannot accept new items.`
                : `Select an active consolidation to move "${moveToConsolidationItem?.name}". Shipped consolidations cannot accept new items.`
              }
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {consolidations.filter(c => c.status !== 'shipped' && c.status !== 'delivered').length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No active consolidations available</p>
                  <p className="text-sm text-muted-foreground mt-1">All consolidations are either shipped or delivered</p>
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
                    Create New Consolidation
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
                              title: "Success",
                              description: `${itemIds.length} item${itemIds.length > 1 ? 's' : ''} moved to ${consolidation.name}`,
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
                          {consolidation.warehouse.replace('_', ', ')}
                        </div>
                      </div>
                      {getShippingMethodBadge(consolidation.shippingMethod)}
                    </div>
                    
                    <div className="flex items-center gap-4 mt-3 text-sm">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Package className="h-4 w-4" />
                        <span className="font-medium">{consolidation.itemCount || 0}</span>
                        <span>items</span>
                      </div>
                      {consolidation.targetWeight && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Weight className="h-4 w-4" />
                          <span>Max:</span>
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
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Consolidation Dialog */}
      <Dialog open={!!editingConsolidation} onOpenChange={(open) => !open && setEditingConsolidation(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Consolidation</DialogTitle>
            <DialogDescription>
              Update consolidation details and shipment settings
            </DialogDescription>
          </DialogHeader>
          {editingConsolidation && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="consolidation-name">Consolidation Name</Label>
                <Input
                  id="consolidation-name"
                  value={editingConsolidation.name}
                  onChange={(e) => setEditingConsolidation({
                    ...editingConsolidation,
                    name: e.target.value
                  })}
                  placeholder="Enter consolidation name"
                />
              </div>
              
              <div>
                <Label htmlFor="shipment-type">Shipment Type</Label>
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
                    <SelectItem value="not_set">Not Set</SelectItem>
                    <SelectItem value="air">
                      <div className="flex items-center gap-2">
                        <Plane className="h-4 w-4" />
                        Air Freight
                      </div>
                    </SelectItem>
                    <SelectItem value="sea">
                      <div className="flex items-center gap-2">
                        <Ship className="h-4 w-4" />
                        Sea Freight
                      </div>
                    </SelectItem>
                    <SelectItem value="express">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Express Courier
                      </div>
                    </SelectItem>
                    <SelectItem value="priority">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Priority Shipping
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={editingConsolidation.notes || ""}
                  onChange={(e) => setEditingConsolidation({
                    ...editingConsolidation,
                    notes: e.target.value
                  })}
                  placeholder="Add any special instructions or notes..."
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="target-weight">Target Weight (kg)</Label>
                <Input
                  id="target-weight"
                  type="number"
                  min="0"
                  step="0.1"
                  value={editingConsolidation.targetWeight || ""}
                  onChange={(e) => setEditingConsolidation({
                    ...editingConsolidation,
                    targetWeight: e.target.value ? parseFloat(e.target.value) : null
                  })}
                  placeholder="Maximum weight for this consolidation"
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
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (editingConsolidation) {
                  updateConsolidationMutation.mutate({
                    id: editingConsolidation.id,
                    data: {
                      name: editingConsolidation.name,
                      shippingMethod: editingConsolidation.shippingMethod,
                      notes: editingConsolidation.notes,
                      targetWeight: editingConsolidation.targetWeight
                    }
                  });
                }
              }}
              disabled={updateConsolidationMutation.isPending || !editingConsolidation?.name}
            >
              {updateConsolidationMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tracking Numbers Export Modal */}
      <Dialog open={showTrackingModal} onOpenChange={setShowTrackingModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Export Tracking Numbers</DialogTitle>
            <DialogDescription>
              Copy tracking numbers for {selectedConsolidationTracking?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedConsolidationTracking?.trackingNumbers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No tracking numbers found</p>
                <p className="text-sm mt-2">Items in this consolidation don't have tracking numbers yet.</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Tracking Numbers ({selectedConsolidationTracking?.trackingNumbers.length} total)</Label>
                  <Textarea 
                    readOnly
                    value={selectedConsolidationTracking?.trackingNumbers.join('\n') || ''}
                    className="min-h-[200px] font-mono text-sm"
                    onClick={(e) => e.currentTarget.select()}
                  />
                  <p className="text-xs text-muted-foreground">
                    Click the text area to select all tracking numbers
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
                          title: "Copied!",
                          description: `${selectedConsolidationTracking.trackingNumbers.length} tracking number(s) copied to clipboard`,
                        });
                      }
                    }}
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Copy to Clipboard
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      if (selectedConsolidationTracking?.trackingNumbers) {
                        // Copy with comma separation for easy paste into shipping forms
                        navigator.clipboard.writeText(selectedConsolidationTracking.trackingNumbers.join(', '));
                        toast({
                          title: "Copied!",
                          description: "Tracking numbers copied with comma separation",
                        });
                      }
                    }}
                  >
                    Copy with Commas
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
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}