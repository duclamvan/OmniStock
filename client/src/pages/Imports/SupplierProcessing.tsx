import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { Plus, Package2, Truck, MapPin, Clock, CreditCard, Users, Edit, Trash2, ChevronDown, ChevronUp, Filter, Search, ListPlus, PackagePlus, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Purchase {
  id: number;
  supplier: string;
  trackingNumber: string | null;
  estimatedArrival: string | null;
  notes: string | null;
  shippingCost: string;
  totalCost: string;
  purchaseCurrency?: string;
  paymentCurrency?: string;
  totalPaid?: string;
  purchaseTotal?: string;
  exchangeRate?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  items: PurchaseItem[];
  itemCount: number;
  location?: string;
}

interface PurchaseItem {
  id: number;
  purchaseId: number;
  name: string;
  sku: string | null;
  category: string;
  barcode: string;
  quantity: number;
  unitPrice: string;
  weight: string;
  dimensions: string | null;
  notes: string | null;
  createdAt: string;
  isVariant?: boolean;
  variantName?: string;
}

const statusColors: Record<string, string> = {
  pending: "warning",
  processing: "info",
  at_warehouse: "default",
  shipped: "secondary",
  delivered: "default"
} as const;

const locations = ["Europe", "USA", "China", "Vietnam"];

export default function SupplierProcessing() {
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [expandedPurchases, setExpandedPurchases] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Variant state for add item dialog
  const [showVariants, setShowVariants] = useState(false);
  const [variants, setVariants] = useState<Array<{
    id: string;
    name: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    weight: number;
    dimensions: string;
  }>>([]);
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [seriesDialogOpen, setSeriesDialogOpen] = useState(false);
  const [newVariant, setNewVariant] = useState({
    name: "",
    sku: "",
    quantity: 1,
    unitPrice: 0,
    weight: 0,
    dimensions: ""
  });
  const [seriesInput, setSeriesInput] = useState("");
  const [seriesQuantity, setSeriesQuantity] = useState(1);
  const [seriesUnitPrice, setSeriesUnitPrice] = useState(0);
  const [seriesWeight, setSeriesWeight] = useState(0);
  const [selectedVariants, setSelectedVariants] = useState<string[]>([]);
  
  // Form state for add item
  const [currentItem, setCurrentItem] = useState({
    name: "",
    sku: "",
    category: "",
    barcode: "",
    quantity: 1,
    unitPrice: 0,
    weight: 0,
    dimensions: "",
    notes: ""
  });

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [purchaseToDelete, setPurchaseToDelete] = useState<Purchase | null>(null);

  // Mock data for purchases
  const mockPurchases: Purchase[] = [
    {
      id: 1,
      supplier: "Hong Kong Trading Co.",
      location: "China",
      trackingNumber: "HK2024031501",
      estimatedArrival: "2024-04-15T00:00:00Z",
      notes: "Priority shipment - customer waiting",
      shippingCost: "250.00",
      totalCost: "5250.00",
      paymentCurrency: "USD",
      totalPaid: "5250.00",
      purchaseCurrency: "USD",
      purchaseTotal: "5000.00",
      exchangeRate: "1.00",
      status: "at_warehouse",
      createdAt: "2024-03-15T10:00:00Z",
      updatedAt: "2024-03-15T10:00:00Z",
      items: [
        { id: 1, purchaseId: 1, name: "iPhone 15 Pro Max", sku: "IPH15PM256", category: "Electronics", barcode: "1234567890123", quantity: 5, unitPrice: "899.00", weight: "0.221", dimensions: "15x7x1", notes: null, createdAt: "2024-03-15T10:00:00Z" },
        { id: 2, purchaseId: 1, name: "AirPods Pro 2", sku: "APP2023", category: "Electronics", barcode: "1234567890124", quantity: 10, unitPrice: "189.00", weight: "0.051", dimensions: "5x5x2", notes: null, createdAt: "2024-03-15T10:00:00Z" },
        { id: 3, purchaseId: 1, name: "MacBook Air M2", sku: "MBA13M2", category: "Electronics", barcode: "1234567890125", quantity: 3, unitPrice: "1099.00", weight: "1.24", dimensions: "30x21x1.5", notes: null, createdAt: "2024-03-15T10:00:00Z" }
      ],
      itemCount: 3
    },
    {
      id: 2,
      supplier: "Shenzhen Electronics Ltd",
      location: "China",
      trackingNumber: "SZ2024031502",
      estimatedArrival: "2024-04-20T00:00:00Z",
      notes: "Contains fragile items",
      shippingCost: "180.00",
      totalCost: "3680.00",
      paymentCurrency: "CNY",
      totalPaid: "26500.00",
      purchaseCurrency: "CNY",
      purchaseTotal: "25200.00",
      exchangeRate: "7.2",
      status: "processing",
      createdAt: "2024-03-16T14:30:00Z",
      updatedAt: "2024-03-16T14:30:00Z",
      items: [
        { id: 4, purchaseId: 2, name: "Samsung Galaxy S24 Ultra", sku: "SGS24U512", category: "Electronics", barcode: "1234567890126", quantity: 8, unitPrice: "7800.00", weight: "0.233", dimensions: "16x8x1", notes: null, createdAt: "2024-03-16T14:30:00Z" },
        { id: 5, purchaseId: 2, name: "Galaxy Watch 6", sku: "GW6BT44", category: "Electronics", barcode: "1234567890127", quantity: 15, unitPrice: "1800.00", weight: "0.059", dimensions: "4x4x1", notes: null, createdAt: "2024-03-16T14:30:00Z" }
      ],
      itemCount: 2
    },
    {
      id: 3,
      supplier: "Vietnam Textiles Export",
      location: "Vietnam",
      trackingNumber: "VN2024031503",
      estimatedArrival: "2024-04-10T00:00:00Z",
      notes: "Seasonal collection",
      shippingCost: "95.00",
      totalCost: "2095.00",
      paymentCurrency: "VND",
      totalPaid: "52000000",
      purchaseCurrency: "VND",
      purchaseTotal: "50000000",
      exchangeRate: "24800",
      status: "shipped",
      createdAt: "2024-03-17T09:15:00Z",
      updatedAt: "2024-03-17T09:15:00Z",
      items: [
        { id: 6, purchaseId: 3, name: "Cotton T-Shirts (Pack of 50)", sku: "CTS50BLK", quantity: 4, unitPrice: "12500000", weight: "10.0", dimensions: "60x40x30", notes: null, createdAt: "2024-03-17T09:15:00Z" },
        { id: 7, purchaseId: 3, name: "Denim Jeans (Pack of 30)", sku: "DJ30BLU", quantity: 2, unitPrice: "15000000", weight: "15.0", dimensions: "60x40x40", notes: null, createdAt: "2024-03-17T09:15:00Z" }
      ],
      itemCount: 2
    },
    {
      id: 4,
      supplier: "European Luxury Goods",
      location: "Europe",
      trackingNumber: "EU2024031504",
      estimatedArrival: "2024-04-25T00:00:00Z",
      notes: "High-value items, insurance required",
      shippingCost: "450.00",
      totalCost: "12450.00",
      paymentCurrency: "EUR",
      totalPaid: "11500.00",
      purchaseCurrency: "EUR",
      purchaseTotal: "11000.00",
      exchangeRate: "1.08",
      status: "pending",
      createdAt: "2024-03-18T16:45:00Z",
      updatedAt: "2024-03-18T16:45:00Z",
      items: [
        { id: 8, purchaseId: 4, name: "Designer Handbag Collection", sku: "DHB2024SS", quantity: 5, unitPrice: "1800.00", weight: "1.2", dimensions: "35x25x15", notes: null, createdAt: "2024-03-18T16:45:00Z" },
        { id: 9, purchaseId: 4, name: "Luxury Watch Set", sku: "LWS2024", quantity: 3, unitPrice: "3500.00", weight: "0.5", dimensions: "20x15x10", notes: null, createdAt: "2024-03-18T16:45:00Z" }
      ],
      itemCount: 2
    },
    {
      id: 5,
      supplier: "USA Tech Distributors",
      location: "USA",
      trackingNumber: "US2024031505",
      estimatedArrival: "2024-04-18T00:00:00Z",
      notes: "",
      shippingCost: "320.00",
      totalCost: "8320.00",
      paymentCurrency: "USD",
      totalPaid: "8320.00",
      purchaseCurrency: "USD",
      purchaseTotal: "8000.00",
      exchangeRate: "1.00",
      status: "delivered",
      createdAt: "2024-03-10T11:20:00Z",
      updatedAt: "2024-03-10T11:20:00Z",
      items: [
        { id: 10, purchaseId: 5, name: "Dell XPS 15 Laptop", sku: "DXPS15I9", quantity: 4, unitPrice: "1599.00", weight: "2.05", dimensions: "36x25x2", notes: null, createdAt: "2024-03-10T11:20:00Z" },
        { id: 11, purchaseId: 5, name: "iPad Pro 12.9\"", sku: "IPADP13M2", quantity: 6, unitPrice: "1099.00", weight: "0.682", dimensions: "28x21x0.6", notes: null, createdAt: "2024-03-10T11:20:00Z" },
        { id: 12, purchaseId: 5, name: "Sony WH-1000XM5", sku: "SONYWH5", quantity: 12, unitPrice: "299.00", weight: "0.250", dimensions: "23x20x5", notes: null, createdAt: "2024-03-10T11:20:00Z" }
      ],
      itemCount: 3
    }
  ];

  // Fetch purchases from API
  const { data: purchasesData, isLoading } = useQuery<Purchase[]>({
    queryKey: ['/api/imports/purchases']
  });
  
  const purchases = purchasesData || [];

  // Add item mutation
  const addItemMutation = useMutation({
    mutationFn: async ({ purchaseId, item }: { purchaseId: number; item: any }) => {
      const response = await apiRequest('POST', `/api/imports/purchases/${purchaseId}/items`, item);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/purchases'] });
      setIsAddItemModalOpen(false);
      setSelectedPurchase(null);
      toast({ title: "Success", description: "Item added successfully" });
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to add item", 
        variant: "destructive" 
      });
    }
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ purchaseId, status }: { purchaseId: number; status: string }) => {
      const response = await apiRequest('PATCH', `/api/imports/purchases/${purchaseId}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/purchases'] });
      toast({ title: "Success", description: "Status updated successfully" });
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to update status", 
        variant: "destructive" 
      });
    }
  });

  // Delete purchase mutation
  const deletePurchaseMutation = useMutation({
    mutationFn: async (purchaseId: number) => {
      const response = await apiRequest('DELETE', `/api/imports/purchases/${purchaseId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/purchases'] });
      toast({ title: "Success", description: "Purchase deleted successfully" });
      setDeleteDialogOpen(false);
      setPurchaseToDelete(null);
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to delete purchase", 
        variant: "destructive" 
      });
      setDeleteDialogOpen(false);
      setPurchaseToDelete(null);
    }
  });

  const handleDeleteClick = (purchase: Purchase) => {
    setPurchaseToDelete(purchase);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (purchaseToDelete) {
      deletePurchaseMutation.mutate(purchaseToDelete.id);
    }
  };

  // Variant functions
  const addVariant = () => {
    if (!newVariant.name.trim()) {
      toast({ title: "Error", description: "Variant name is required", variant: "destructive" });
      return;
    }
    
    const variant = {
      id: Date.now().toString(),
      name: newVariant.name,
      sku: newVariant.sku,
      quantity: newVariant.quantity,
      unitPrice: newVariant.unitPrice,
      weight: newVariant.weight,
      dimensions: newVariant.dimensions
    };
    
    setVariants([...variants, variant]);
    setNewVariant({ name: "", sku: "", quantity: 1, unitPrice: 0, weight: 0, dimensions: "" });
    setVariantDialogOpen(false);
  };

  const removeVariant = (id: string) => {
    setVariants(variants.filter(v => v.id !== id));
    setSelectedVariants(selectedVariants.filter(v => v !== id));
  };

  const addVariantSeries = () => {
    if (!seriesInput.trim()) {
      toast({ title: "Error", description: "Series input is required", variant: "destructive" });
      return;
    }

    const lines = seriesInput.split('\n').filter(line => line.trim());
    const newVariants = lines.map((line, index) => ({
      id: (Date.now() + index).toString(),
      name: line.trim(),
      sku: "",
      quantity: seriesQuantity,
      unitPrice: seriesUnitPrice,
      weight: seriesWeight,
      dimensions: ""
    }));

    setVariants([...variants, ...newVariants]);
    setSeriesInput("");
    setSeriesQuantity(1);
    setSeriesUnitPrice(0);
    setSeriesWeight(0);
    setSeriesDialogOpen(false);
  };

  const bulkUpdateVariants = (field: string, value: number) => {
    if (selectedVariants.length === 0) {
      toast({ title: "Error", description: "Please select variants to update", variant: "destructive" });
      return;
    }

    setVariants(variants.map(variant => 
      selectedVariants.includes(variant.id) 
        ? { ...variant, [field]: value }
        : variant
    ));
  };

  const removeSelectedVariants = () => {
    if (selectedVariants.length === 0) {
      toast({ title: "Error", description: "Please select variants to remove", variant: "destructive" });
      return;
    }

    setVariants(variants.filter(v => !selectedVariants.includes(v.id)));
    setSelectedVariants([]);
  };

  const resetVariants = () => {
    setShowVariants(false);
    setVariants([]);
    setSelectedVariants([]);
  };

  const handleAddItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPurchase) return;
    
    if (showVariants && variants.length > 0) {
      // Handle variant items
      const items = variants.map(variant => ({
        name: `${currentItem.name} - ${variant.name}`,
        sku: variant.sku || currentItem.sku,
        category: currentItem.category,
        barcode: currentItem.barcode,
        quantity: variant.quantity,
        unitPrice: variant.unitPrice,
        weight: variant.weight,
        dimensions: variant.dimensions || currentItem.dimensions,
        notes: currentItem.notes,
        isVariant: true,
        variantName: variant.name
      }));

      // Add each variant as a separate item
      for (const item of items) {
        await new Promise((resolve) => {
          addItemMutation.mutate({ purchaseId: selectedPurchase.id, item }, {
            onSettled: resolve
          });
        });
      }
      
      // Reset form
      setCurrentItem({
        name: "",
        sku: "",
        category: "",
        barcode: "",
        quantity: 1,
        unitPrice: 0,
        weight: 0,
        dimensions: "",
        notes: ""
      });
      resetVariants();
    } else {
      // Handle single item
      const formData = new FormData(e.currentTarget);
      
      const item = {
        name: formData.get('name') as string,
        sku: formData.get('sku') as string || null,
        category: formData.get('category') as string,
        barcode: formData.get('barcode') as string,
        quantity: parseInt(formData.get('quantity') as string) || 1,
        unitPrice: parseFloat(formData.get('unitPrice') as string) || 0,
        weight: parseFloat(formData.get('weight') as string) || 0,
        dimensions: formData.get('dimensions') as string || null,
        notes: formData.get('notes') as string || null,
      };
      
      addItemMutation.mutate({ purchaseId: selectedPurchase.id, item });
    }
  };

  // Filter and search logic
  const filteredPurchases = useMemo(() => {
    let filtered = [...purchases];
    
    // Add mock location data for demonstration
    filtered = filtered.map(p => ({
      ...p,
      location: locations[p.id % locations.length]
    }));

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.trackingNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.items.some(item => 
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.sku?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    // Location filter
    if (locationFilter !== "all") {
      filtered = filtered.filter(p => p.location === locationFilter);
    }

    return filtered;
  }, [purchases, searchTerm, statusFilter, locationFilter]);

  // DataTable columns for purchase items
  const getItemColumns = (itemCount: number): DataTableColumn<PurchaseItem>[] => {
    const baseColumns: DataTableColumn<PurchaseItem>[] = [
      {
        key: "name",
        header: "Item",
        sortable: true,
        cell: (item) => (
          <div>
            <div className="font-medium text-sm leading-tight">{item.name}</div>
            {item.sku && <div className="text-xs text-muted-foreground leading-tight">SKU: {item.sku}</div>}
          </div>
        ),
        className: itemCount > 6 ? "min-w-[200px]" : "min-w-[150px]"
      },
      {
        key: "quantity",
        header: "Qty",
        sortable: true,
        cell: (item) => (
          <span className="font-medium text-sm">{item.quantity}</span>
        ),
        className: "w-[60px] text-center"
      },
      {
        key: "unitPrice",
        header: "Price",
        sortable: true,
        cell: (item) => (
          <span className="text-sm">${item.unitPrice}</span>
        ),
        className: "w-[80px] text-right"
      }
    ];

    // Add more columns based on item count for smart layout
    if (itemCount <= 6) {
      // Show all columns for fewer items
      baseColumns.push(
        {
          key: "weight",
          header: "Weight",
          sortable: true,
          cell: (item) => (
            <span className="text-sm">{item.weight}kg</span>
          ),
          className: "w-[80px] text-right"
        },
        {
          key: "dimensions",
          header: "Dimensions",
          cell: (item) => {
            const formatDimensions = (dim: any) => {
              if (!dim) return '-';
              if (typeof dim === 'string') return dim;
              if (typeof dim === 'object' && dim !== null) {
                const { length, width, height } = dim;
                if (length || width || height) {
                  return `${length || 0}×${width || 0}×${height || 0}`;
                }
              }
              return '-';
            };
            
            return (
              <span className="text-xs text-muted-foreground">
                {formatDimensions(item.dimensions)}
              </span>
            );
          },
          className: "w-[120px]"
        },
        {
          key: "notes",
          header: "Notes",
          cell: (item) => (
            <span className="text-xs text-muted-foreground truncate max-w-[150px] block">
              {item.notes || '-'}
            </span>
          ),
          className: "w-[150px]"
        }
      );
    } else if (itemCount <= 12) {
      // Medium layout - hide dimensions
      baseColumns.push(
        {
          key: "weight",
          header: "Weight",
          sortable: true,
          cell: (item) => (
            <span className="text-sm">{item.weight}kg</span>
          ),
          className: "w-[80px] text-right"
        },
        {
          key: "total",
          header: "Total",
          sortable: true,
          cell: (item) => (
            <span className="text-sm font-medium">
              ${(item.quantity * parseFloat(item.unitPrice)).toFixed(2)}
            </span>
          ),
          className: "w-[90px] text-right"
        }
      );
    } else {
      // Compact layout for many items
      baseColumns.push(
        {
          key: "total",
          header: "Total",
          sortable: true,
          cell: (item) => (
            <span className="text-sm font-medium">
              ${(item.quantity * parseFloat(item.unitPrice)).toFixed(2)}
            </span>
          ),
          className: "w-[90px] text-right"
        }
      );
    }

    return baseColumns;
  };

  // Toggle all expanded state
  const toggleAllExpanded = () => {
    if (expandedPurchases.size === filteredPurchases.length) {
      setExpandedPurchases(new Set());
    } else {
      setExpandedPurchases(new Set(filteredPurchases.map(p => p.id)));
    }
  };

  // Initialize with all purchases expanded
  useMemo(() => {
    if (purchases.length > 0 && expandedPurchases.size === 0) {
      setExpandedPurchases(new Set(purchases.map(p => p.id)));
    }
  }, [purchases]);

  if (isLoading) {
    return (
      <div className="px-4 py-4 md:p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Supplier Processing</h1>
          <p className="text-sm md:text-base text-muted-foreground">Manage import purchases from suppliers</p>
        </div>
        <Link href="/imports/supplier-processing/create" className="w-full sm:w-auto">
          <Button data-testid="button-create-purchase" className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Create Purchase
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Purchases</CardTitle>
            <Package2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold" data-testid="text-total-purchases">{purchases.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-yellow-600">
              {purchases.filter(p => p.status === 'pending').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">At Warehouse</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-green-600">
              {purchases.filter(p => p.status === 'at_warehouse').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Items</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {purchases.reduce((sum, p) => sum + p.itemCount, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <CardTitle className="text-lg md:text-xl">Purchase Orders</CardTitle>
              <CardDescription className="text-sm">
                Manage your supplier purchases and their items
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-full sm:w-[200px]"
                  data-testid="input-search"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[150px]" data-testid="select-status-filter">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="at_warehouse">At Warehouse</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-full sm:w-[150px]" data-testid="select-location-filter">
                  <MapPin className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  <SelectItem value="Europe">Europe</SelectItem>
                  <SelectItem value="USA">USA</SelectItem>
                  <SelectItem value="China">China</SelectItem>
                  <SelectItem value="Vietnam">Vietnam</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAllExpanded}
                data-testid="button-toggle-all"
                className="w-full sm:w-auto"
              >
                {expandedPurchases.size === filteredPurchases.length ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-2" />
                    Collapse All
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-2" />
                    Expand All
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPurchases.length === 0 ? (
            <div className="text-center py-8">
              <Package2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {purchases.length === 0 ? "No purchases found" : "No matching purchases"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {purchases.length === 0 
                  ? "Create your first purchase order to get started"
                  : "Try adjusting your filters or search term"
                }
              </p>
              {purchases.length === 0 && (
                <Link href="/imports/supplier-processing/create">
                  <Button data-testid="button-create-first-purchase">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Purchase
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPurchases.map((purchase) => {
                const isExpanded = expandedPurchases.has(purchase.id);
                
                return (
                  <Card key={purchase.id} className="border hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      {/* Purchase Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1"
                            onClick={() => {
                              const newExpanded = new Set(expandedPurchases);
                              if (isExpanded) {
                                newExpanded.delete(purchase.id);
                              } else {
                                newExpanded.add(purchase.id);
                              }
                              setExpandedPurchases(newExpanded);
                            }}
                            data-testid={`button-toggle-${purchase.id}`}
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-sm sm:text-base" data-testid={`text-supplier-${purchase.id}`}>
                                {purchase.location === 'Europe' && '🇪🇺 '}
                                {purchase.location === 'USA' && '🇺🇸 '}
                                {purchase.location === 'China' && '🇨🇳 '}
                                {purchase.location === 'Vietnam' && '🇻🇳 '}
                                {purchase.supplier}
                              </h3>
                              <Badge variant={statusColors[purchase.status] as any}>
                                {purchase.status.replace('_', ' ').toUpperCase()}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-muted-foreground mt-1">
                              <span>{purchase.itemCount} items</span>
                              <span>•</span>
                              <span>Created {format(new Date(purchase.createdAt), 'MMM dd, yyyy')}</span>
                              {purchase.trackingNumber && (
                                <>
                                  <span>•</span>
                                  <span>Tracking: {purchase.trackingNumber}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          <Select
                            value={purchase.status}
                            onValueChange={(status) => updateStatusMutation.mutate({ purchaseId: purchase.id, status })}
                          >
                            <SelectTrigger className="w-[120px] sm:w-[140px] h-8 text-xs sm:text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="processing">Processing</SelectItem>
                              <SelectItem value="at_warehouse">At Warehouse</SelectItem>
                              <SelectItem value="shipped">Shipped</SelectItem>
                              <SelectItem value="delivered">Delivered</SelectItem>
                            </SelectContent>
                          </Select>
                          <Link href={`/imports/supplier-processing/edit/${purchase.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              data-testid={`button-edit-${purchase.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setSelectedPurchase(purchase);
                              setIsAddItemModalOpen(true);
                            }}
                            data-testid={`button-add-item-${purchase.id}`}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                data-testid={`button-menu-${purchase.id}`}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleDeleteClick(purchase)}
                                className="text-destructive focus:text-destructive"
                                data-testid={`menu-delete-${purchase.id}`}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Purchase
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Purchase Info Bar */}
                      <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm mb-3 sm:pl-7">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            ETA: {purchase.estimatedArrival 
                              ? format(new Date(purchase.estimatedArrival), 'MMM dd')
                              : 'TBD'
                            }
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Truck className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            Shipping: {purchase.purchaseCurrency || 'USD'} {purchase.shippingCost}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CreditCard className="h-3 w-3 text-muted-foreground" />
                          <span className="font-semibold">
                            Grand Total: {purchase.purchaseCurrency || 'USD'} {purchase.totalCost}
                          </span>
                        </div>
                        {purchase.paymentCurrency && purchase.paymentCurrency !== purchase.purchaseCurrency && (
                          <div className="flex items-center gap-1">
                            <CreditCard className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              Paid: {purchase.paymentCurrency} {purchase.totalPaid || '0'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Items Table - Always visible when expanded */}
                      {isExpanded && (
                        <div className="sm:pl-7">
                          {purchase.items.length === 0 ? (
                            <div className="text-center py-6 bg-muted/30 rounded-lg">
                              <p className="text-muted-foreground text-sm">No items added yet</p>
                            </div>
                          ) : (
                            <div className={cn(
                              "rounded-lg border bg-card overflow-x-auto",
                              purchase.items.length > 12 && "max-h-[400px] overflow-y-auto"
                            )}>
                              <DataTable
                                data={purchase.items}
                                columns={getItemColumns(purchase.items.length)}
                                getRowKey={(item) => item.id.toString()}
                                showPagination={false}
                                className="text-sm"
                                defaultExpandAll={false}
                                compact={true}
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Notes */}
                      {purchase.notes && isExpanded && (
                        <div className="mt-3 sm:pl-7">
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Notes:</p>
                            <p className="text-sm">{purchase.notes}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Item Modal */}
      <Dialog open={isAddItemModalOpen} onOpenChange={setIsAddItemModalOpen}>
        <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Item to Purchase</DialogTitle>
            <DialogDescription>
              Add a new item to "{selectedPurchase?.supplier}" purchase
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddItem} className="space-y-4">
            {/* First row: Item Name and SKU */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Item Name *</Label>
                <Input 
                  id="name" 
                  name="name" 
                  required 
                  data-testid="input-item-name"
                  placeholder="Enter item name"
                  value={currentItem.name}
                  onChange={(e) => setCurrentItem(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">SKU/Product Code</Label>
                <Input 
                  id="sku" 
                  name="sku" 
                  data-testid="input-item-sku"
                  placeholder="Optional SKU"
                  value={currentItem.sku}
                  onChange={(e) => setCurrentItem(prev => ({ ...prev, sku: e.target.value }))}
                />
              </div>
            </div>

            {/* Second row: Category and Barcode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Item Category</Label>
                <Input 
                  id="category" 
                  name="category" 
                  data-testid="input-item-category"
                  placeholder="e.g., Electronics, Clothing"
                  value={currentItem.category}
                  onChange={(e) => setCurrentItem(prev => ({ ...prev, category: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="barcode">Barcode (EAN-13)</Label>
                <Input 
                  id="barcode" 
                  name="barcode" 
                  data-testid="input-item-barcode"
                  placeholder="e.g., 1234567890123"
                  maxLength={13}
                  value={currentItem.barcode}
                  onChange={(e) => setCurrentItem(prev => ({ ...prev, barcode: e.target.value }))}
                />
              </div>
            </div>

            {/* Variants checkbox */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="hasVariants" 
                  checked={showVariants}
                  onCheckedChange={(checked) => {
                    setShowVariants(checked as boolean);
                    if (!checked) {
                      resetVariants();
                    }
                  }}
                  data-testid="checkbox-has-variants"
                />
                <Label htmlFor="hasVariants" className="text-sm font-medium">
                  This item has variants (sizes, colors, etc.)
                </Label>
              </div>

              {/* Variants section */}
              {showVariants && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setVariantDialogOpen(true)}
                      data-testid="button-add-variant"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Variant
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSeriesDialogOpen(true)}
                      data-testid="button-add-series"
                    >
                      <ListPlus className="h-4 w-4 mr-1" />
                      Add Series
                    </Button>
                  </div>

                  {/* Variants table */}
                  {variants.length > 0 && (
                    <div className="space-y-3">
                      <div className="bg-background border rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/50">
                                <TableHead className="w-10 p-2">
                                  <Checkbox
                                    checked={selectedVariants.length === variants.length}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedVariants(variants.map(v => v.id));
                                      } else {
                                        setSelectedVariants([]);
                                      }
                                    }}
                                    data-testid="checkbox-select-all-variants"
                                  />
                                </TableHead>
                                <TableHead className="p-2 min-w-32">Variant Name</TableHead>
                                <TableHead className="p-2 min-w-24">SKU</TableHead>
                                <TableHead className="p-2 w-16">Qty</TableHead>
                                <TableHead className="p-2 w-20">Price</TableHead>
                                <TableHead className="p-2 w-16">Weight</TableHead>
                                <TableHead className="p-2 w-10"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {variants.map((variant) => (
                                <TableRow key={variant.id} className="h-10">
                                  <TableCell className="p-2">
                                    <Checkbox
                                      checked={selectedVariants.includes(variant.id)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setSelectedVariants([...selectedVariants, variant.id]);
                                        } else {
                                          setSelectedVariants(selectedVariants.filter(id => id !== variant.id));
                                        }
                                      }}
                                      data-testid={`checkbox-variant-${variant.id}`}
                                    />
                                  </TableCell>
                                  <TableCell className="p-2 font-medium text-sm">{variant.name}</TableCell>
                                  <TableCell className="p-2">
                                    <Input
                                      type="text"
                                      value={variant.sku}
                                      onChange={(e) => {
                                        setVariants(variants.map(v => 
                                          v.id === variant.id ? {...v, sku: e.target.value} : v
                                        ));
                                      }}
                                      className="h-6 text-xs"
                                      placeholder="SKU"
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Input
                                      type="number"
                                      value={variant.quantity}
                                      onChange={(e) => {
                                        setVariants(variants.map(v => 
                                          v.id === variant.id ? {...v, quantity: parseInt(e.target.value) || 1} : v
                                        ));
                                      }}
                                      className="h-6 w-14 text-right text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      min="1"
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Input
                                      type="number"
                                      value={variant.unitPrice}
                                      onChange={(e) => {
                                        setVariants(variants.map(v => 
                                          v.id === variant.id ? {...v, unitPrice: parseFloat(e.target.value) || 0} : v
                                        ));
                                      }}
                                      className="h-6 w-16 text-right text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      step="0.01"
                                      min="0"
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Input
                                      type="number"
                                      value={variant.weight}
                                      onChange={(e) => {
                                        setVariants(variants.map(v => 
                                          v.id === variant.id ? {...v, weight: parseFloat(e.target.value) || 0} : v
                                        ));
                                      }}
                                      className="h-6 w-14 text-right text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      step="0.01"
                                      min="0"
                                    />
                                  </TableCell>
                                  <TableCell className="p-2">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeVariant(variant.id)}
                                      className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                                      data-testid={`button-remove-variant-${variant.id}`}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>

                      {/* Bulk actions */}
                      {selectedVariants.length > 0 && (
                        <div className="flex flex-wrap gap-2 text-xs">
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Bulk update:</span>
                            <Input
                              type="number"
                              placeholder="Qty"
                              className="h-7 w-16 text-xs"
                              onChange={(e) => {
                                const value = parseInt(e.target.value);
                                if (value > 0) {
                                  bulkUpdateVariants('quantity', value);
                                }
                              }}
                            />
                            <Input
                              type="number"
                              placeholder="Price"
                              className="h-7 w-16 text-xs"
                              step="0.01"
                              onChange={(e) => {
                                const value = parseFloat(e.target.value);
                                if (value >= 0) {
                                  bulkUpdateVariants('unitPrice', value);
                                }
                              }}
                            />
                            <Input
                              type="number"
                              placeholder="Weight"
                              className="h-7 w-16 text-xs"
                              step="0.01"
                              onChange={(e) => {
                                const value = parseFloat(e.target.value);
                                if (value >= 0) {
                                  bulkUpdateVariants('weight', value);
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={removeSelectedVariants}
                              className="h-7 px-2 text-xs"
                            >
                              Remove Selected
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Single item fields - only show when variants are disabled */}
            {!showVariants && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input 
                      id="quantity" 
                      name="quantity" 
                      type="number" 
                      min="1" 
                      defaultValue="1"
                      required 
                      data-testid="input-item-quantity"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unitPrice">Unit Price ($)</Label>
                    <Input 
                      id="unitPrice" 
                      name="unitPrice" 
                      type="number" 
                      step="0.01" 
                      data-testid="input-item-price"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <Input 
                      id="weight" 
                      name="weight" 
                      type="number" 
                      step="0.001" 
                      data-testid="input-item-weight"
                      placeholder="0.000"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dimensions">Dimensions (L×W×H cm)</Label>
                  <Input 
                    id="dimensions" 
                    name="dimensions" 
                    data-testid="input-item-dimensions"
                    placeholder="e.g., 20×15×10"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea 
                id="notes" 
                name="notes" 
                data-testid="textarea-item-notes"
                placeholder="Additional notes about this item..."
                value={currentItem.notes}
                onChange={(e) => setCurrentItem(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setIsAddItemModalOpen(false);
                resetVariants();
                setCurrentItem({
                  name: "",
                  sku: "",
                  category: "",
                  barcode: "",
                  quantity: 1,
                  unitPrice: 0,
                  weight: 0,
                  dimensions: "",
                  notes: ""
                });
              }}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={addItemMutation.isPending || (showVariants && variants.length === 0)} 
                data-testid="button-submit-item"
              >
                {addItemMutation.isPending ? "Adding..." : "Add Item"}
              </Button>
            </DialogFooter>
          </form>

          {/* Add Variant Dialog */}
          <Dialog open={variantDialogOpen} onOpenChange={setVariantDialogOpen}>
            <DialogContent className="w-[95vw] max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add Variant</DialogTitle>
                <DialogDescription>
                  Add a new variant for this item
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="variantName">Variant Name *</Label>
                  <Input
                    id="variantName"
                    placeholder="e.g., Red - Large, 128GB, etc."
                    value={newVariant.name}
                    onChange={(e) => setNewVariant(prev => ({ ...prev, name: e.target.value }))}
                    data-testid="input-variant-name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="variantSku">SKU</Label>
                    <Input
                      id="variantSku"
                      placeholder="Optional"
                      value={newVariant.sku}
                      onChange={(e) => setNewVariant(prev => ({ ...prev, sku: e.target.value }))}
                      data-testid="input-variant-sku"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="variantQuantity">Quantity</Label>
                    <Input
                      id="variantQuantity"
                      type="number"
                      min="1"
                      value={newVariant.quantity}
                      onChange={(e) => setNewVariant(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                      data-testid="input-variant-quantity"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="variantPrice">Unit Price</Label>
                    <Input
                      id="variantPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={newVariant.unitPrice}
                      onChange={(e) => setNewVariant(prev => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))}
                      data-testid="input-variant-price"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="variantWeight">Weight (kg)</Label>
                    <Input
                      id="variantWeight"
                      type="number"
                      step="0.001"
                      min="0"
                      value={newVariant.weight}
                      onChange={(e) => setNewVariant(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
                      data-testid="input-variant-weight"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="variantDimensions">Dimensions (L×W×H cm)</Label>
                  <Input
                    id="variantDimensions"
                    placeholder="e.g., 20×15×10"
                    value={newVariant.dimensions}
                    onChange={(e) => setNewVariant(prev => ({ ...prev, dimensions: e.target.value }))}
                    data-testid="input-variant-dimensions"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setVariantDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={addVariant} data-testid="button-confirm-variant">
                  Add Variant
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Add Series Dialog */}
          <Dialog open={seriesDialogOpen} onOpenChange={setSeriesDialogOpen}>
            <DialogContent className="w-[95vw] max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add Variant Series</DialogTitle>
                <DialogDescription>
                  Add multiple variants at once (one per line)
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="seriesInput">Variant Names *</Label>
                  <Textarea
                    id="seriesInput"
                    placeholder="Red - Small&#10;Red - Medium&#10;Red - Large&#10;Blue - Small&#10;Blue - Medium"
                    value={seriesInput}
                    onChange={(e) => setSeriesInput(e.target.value)}
                    className="min-h-24"
                    data-testid="textarea-series-input"
                  />
                  <p className="text-xs text-muted-foreground">Enter one variant name per line</p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="seriesQuantity">Quantity (each)</Label>
                    <Input
                      id="seriesQuantity"
                      type="number"
                      min="1"
                      value={seriesQuantity}
                      onChange={(e) => setSeriesQuantity(parseInt(e.target.value) || 1)}
                      data-testid="input-series-quantity"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="seriesPrice">Unit Price (each)</Label>
                    <Input
                      id="seriesPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={seriesUnitPrice}
                      onChange={(e) => setSeriesUnitPrice(parseFloat(e.target.value) || 0)}
                      data-testid="input-series-price"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="seriesWeight">Weight (each)</Label>
                    <Input
                      id="seriesWeight"
                      type="number"
                      step="0.001"
                      min="0"
                      value={seriesWeight}
                      onChange={(e) => setSeriesWeight(parseFloat(e.target.value) || 0)}
                      data-testid="input-series-weight"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setSeriesDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={addVariantSeries} data-testid="button-confirm-series">
                  Add Series
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Purchase</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the purchase from "{purchaseToDelete?.supplier}"? This action cannot be undone and will also delete all associated items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false);
              setPurchaseToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletePurchaseMutation.isPending}
              data-testid="confirm-delete-purchase"
            >
              {deletePurchaseMutation.isPending ? "Deleting..." : "Delete Purchase"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}