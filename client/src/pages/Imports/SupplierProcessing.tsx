import { useState, useMemo } from "react";
import { Link } from "wouter";
// import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { Plus, Package2, Truck, MapPin, Clock, CreditCard, Users, Edit, Trash2, ChevronDown, ChevronUp, Filter, Search } from "lucide-react";
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
  quantity: number;
  unitPrice: string;
  weight: string;
  dimensions: string | null;
  notes: string | null;
  createdAt: string;
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
  // const queryClient = useQueryClient();

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
        { id: 1, purchaseId: 1, name: "iPhone 15 Pro Max", sku: "IPH15PM256", quantity: 5, unitPrice: "899.00", weight: "0.221", dimensions: "15x7x1", notes: null, createdAt: "2024-03-15T10:00:00Z" },
        { id: 2, purchaseId: 1, name: "AirPods Pro 2", sku: "APP2023", quantity: 10, unitPrice: "189.00", weight: "0.051", dimensions: "5x5x2", notes: null, createdAt: "2024-03-15T10:00:00Z" },
        { id: 3, purchaseId: 1, name: "MacBook Air M2", sku: "MBA13M2", quantity: 3, unitPrice: "1099.00", weight: "1.24", dimensions: "30x21x1.5", notes: null, createdAt: "2024-03-15T10:00:00Z" }
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
        { id: 4, purchaseId: 2, name: "Samsung Galaxy S24 Ultra", sku: "SGS24U512", quantity: 8, unitPrice: "7800.00", weight: "0.233", dimensions: "16x8x1", notes: null, createdAt: "2024-03-16T14:30:00Z" },
        { id: 5, purchaseId: 2, name: "Galaxy Watch 6", sku: "GW6BT44", quantity: 15, unitPrice: "1800.00", weight: "0.059", dimensions: "4x4x1", notes: null, createdAt: "2024-03-16T14:30:00Z" }
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

  const [purchases, setPurchases] = useState<Purchase[]>(mockPurchases);
  const isLoading = false;

  // Mock mutations - update local state instead of API calls
  const addItemMutation = {
    mutate: ({ purchaseId, item }: { purchaseId: number; item: any }) => {
      setPurchases(prev => prev.map(p => {
        if (p.id === purchaseId) {
          const newItem = {
            id: Date.now(),
            purchaseId,
            name: item.name,
            sku: item.sku || null,
            quantity: parseInt(item.quantity),
            unitPrice: item.unitPrice || "0",
            weight: item.weight || "0",
            dimensions: item.dimensions || null,
            notes: item.notes || null,
            createdAt: new Date().toISOString()
          };
          return {
            ...p,
            items: [...p.items, newItem],
            itemCount: p.items.length + 1
          };
        }
        return p;
      }));
      setIsAddItemModalOpen(false);
      setSelectedPurchase(null);
      toast({ title: "Success", description: "Item added successfully" });
    },
    isPending: false
  };

  // Update status mutation
  const updateStatusMutation = {
    mutate: ({ purchaseId, status }: { purchaseId: number; status: string }) => {
      setPurchases(prev => prev.map(p => 
        p.id === purchaseId ? { ...p, status } : p
      ));
      toast({ title: "Success", description: "Status updated successfully" });
    }
  };

  // Delete purchase mutation
  const deletePurchaseMutation = {
    mutate: (purchaseId: number) => {
      setPurchases(prev => prev.filter(p => p.id !== purchaseId));
      toast({ title: "Success", description: "Purchase deleted successfully" });
    }
  };

  const handleAddItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPurchase) return;
    
    const formData = new FormData(e.currentTarget);
    
    const item = {
      name: formData.get('name') as string,
      sku: formData.get('sku') as string || null,
      quantity: parseInt(formData.get('quantity') as string) || 1,
      unitPrice: parseFloat(formData.get('unitPrice') as string) || 0,
      weight: parseFloat(formData.get('weight') as string) || 0,
      dimensions: formData.get('dimensions') as string || null,
      notes: formData.get('notes') as string || null,
    };
    
    addItemMutation.mutate({ purchaseId: selectedPurchase.id, item });
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
          cell: (item) => (
            <span className="text-xs text-muted-foreground">
              {item.dimensions || '-'}
            </span>
          ),
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
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deletePurchaseMutation.mutate(purchase.id)}
                            data-testid={`button-delete-${purchase.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <Label htmlFor="sku">SKU/Product Code</Label>
                <Input 
                  id="sku" 
                  name="sku" 
                  data-testid="input-item-sku"
                  placeholder="Optional SKU"
                />
              </div>
            </div>
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
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea 
                id="notes" 
                name="notes" 
                data-testid="textarea-item-notes"
                placeholder="Additional notes about this item..."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddItemModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addItemMutation.isPending} data-testid="button-submit-item">
                {addItemMutation.isPending ? "Adding..." : "Add Item"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}