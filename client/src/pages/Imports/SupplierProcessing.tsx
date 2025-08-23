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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { Plus, Package2, Truck, MapPin, Clock, DollarSign, Users, Edit, Trash2, ChevronDown, ChevronUp, Filter, Search } from "lucide-react";
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
  const queryClient = useQueryClient();

  // Fetch purchases
  const { data: purchases = [], isLoading } = useQuery<Purchase[]>({
    queryKey: ['/api/imports/purchases']
  });

  // Add item mutation
  const addItemMutation = useMutation({
    mutationFn: async ({ purchaseId, item }: { purchaseId: number; item: any }) => {
      const response = await apiRequest('/api/imports/purchases/' + purchaseId + '/items', 'POST', item);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/purchases'] });
      setIsAddItemModalOpen(false);
      setSelectedPurchase(null);
      toast({ title: "Success", description: "Item added successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add item", variant: "destructive" });
    }
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ purchaseId, status }: { purchaseId: number; status: string }) => {
      const response = await apiRequest('/api/imports/purchases/' + purchaseId + '/status', 'PATCH', { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/purchases'] });
      toast({ title: "Success", description: "Status updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    }
  });

  // Delete purchase mutation
  const deletePurchaseMutation = useMutation({
    mutationFn: async (purchaseId: number) => {
      const response = await apiRequest('/api/imports/purchases/' + purchaseId, 'DELETE');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/purchases'] });
      toast({ title: "Success", description: "Purchase deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete purchase", variant: "destructive" });
    }
  });

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
          <h1 className="text-3xl font-bold">Supplier Processing</h1>
          <p className="text-muted-foreground">Manage import purchases from suppliers</p>
        </div>
        <Link href="/imports/supplier-processing/create">
          <Button data-testid="button-create-purchase">
            <Plus className="h-4 w-4 mr-2" />
            Create Purchase
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
            <Package2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-purchases">{purchases.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {purchases.filter(p => p.status === 'pending').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At Warehouse</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {purchases.filter(p => p.status === 'at_warehouse').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {purchases.reduce((sum, p) => sum + p.itemCount, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Purchase Orders</CardTitle>
              <CardDescription>
                Manage your supplier purchases and their items
              </CardDescription>
            </div>
            <div className="flex flex-col md:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-full md:w-[200px]"
                  data-testid="input-search"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[150px]" data-testid="select-status-filter">
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
                <SelectTrigger className="w-full md:w-[150px]" data-testid="select-location-filter">
                  <Globe className="h-4 w-4 mr-2" />
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
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
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
                              <h3 className="font-semibold text-base" data-testid={`text-supplier-${purchase.id}`}>
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
                            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
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
                        <div className="flex items-center gap-2">
                          <Select
                            value={purchase.status}
                            onValueChange={(status) => updateStatusMutation.mutate({ purchaseId: purchase.id, status })}
                          >
                            <SelectTrigger className="w-[140px] h-8 text-sm">
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
                            size="sm"
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
                      <div className="flex items-center gap-6 text-sm mb-3 pl-7">
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
                          <DollarSign className="h-3 w-3 text-muted-foreground" />
                          <span className="font-semibold">
                            Grand Total: {purchase.purchaseCurrency || 'USD'} {purchase.totalCost}
                          </span>
                        </div>
                        {purchase.paymentCurrency && purchase.paymentCurrency !== purchase.purchaseCurrency && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              Paid: {purchase.paymentCurrency} {purchase.totalPaid || '0'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Items Table - Always visible when expanded */}
                      {isExpanded && (
                        <div className="pl-7">
                          {purchase.items.length === 0 ? (
                            <div className="text-center py-6 bg-muted/30 rounded-lg">
                              <p className="text-muted-foreground text-sm">No items added yet</p>
                            </div>
                          ) : (
                            <div className={cn(
                              "rounded-lg border bg-card",
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
                        <div className="mt-3 pl-7">
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
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add Item to Purchase</DialogTitle>
            <DialogDescription>
              Add a new item to "{selectedPurchase?.supplier}" purchase
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddItem} className="space-y-4">
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
                <Label htmlFor="sku">SKU/Product Code</Label>
                <Input 
                  id="sku" 
                  name="sku" 
                  data-testid="input-item-sku"
                  placeholder="Optional SKU"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
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