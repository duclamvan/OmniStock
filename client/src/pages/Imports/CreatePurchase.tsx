import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { normalizeVietnamese } from "@/lib/searchUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, Package, Trash2, Calculator, DollarSign, 
  Truck, Calendar, FileText, Save, ArrowLeft, AlertCircle,
  Check, UserPlus, Clock, Search
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PurchaseItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  weight: number;
  dimensions: string;
  notes: string;
  totalPrice: number;
  costWithShipping: number;
}

interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  website?: string;
}

interface Product {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  price?: number;
  weight?: number;
  dimensions?: string;
}

export default function CreatePurchase() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const supplierDropdownRef = useRef<HTMLDivElement>(null);
  const productDropdownRef = useRef<HTMLDivElement>(null);

  // Form state
  const [supplier, setSupplier] = useState("");
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [supplierLink, setSupplierLink] = useState("");
  const [supplierDropdownOpen, setSupplierDropdownOpen] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [processingTime, setProcessingTime] = useState("");
  const [processingUnit, setProcessingUnit] = useState("days");
  const [notes, setNotes] = useState("");
  const [shippingCost, setShippingCost] = useState(0);
  
  // New supplier dialog
  const [newSupplierDialogOpen, setNewSupplierDialogOpen] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierContact, setNewSupplierContact] = useState("");
  const [newSupplierEmail, setNewSupplierEmail] = useState("");
  const [newSupplierPhone, setNewSupplierPhone] = useState("");
  const [newSupplierWebsite, setNewSupplierWebsite] = useState("");
  
  // Product search state
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  
  // Items state
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [currentItem, setCurrentItem] = useState<Partial<PurchaseItem>>({
    name: "",
    sku: "",
    quantity: 1,
    unitPrice: 0,
    weight: 0,
    dimensions: "",
    notes: ""
  });

  // Set default purchase date to now
  useEffect(() => {
    const now = new Date();
    const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setPurchaseDate(localDateTime);
  }, []);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(event.target as Node)) {
        setSupplierDropdownOpen(false);
      }
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target as Node)) {
        setProductDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch suppliers
  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ['/api/suppliers']
  });

  // Fetch products
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products']
  });

  // Filter suppliers based on search
  const filteredSuppliers = suppliers.filter(s => {
    if (!supplier) return false;
    return s.name.toLowerCase().includes(supplier.toLowerCase());
  });

  // Filter products based on search with Vietnamese diacritics support
  const filteredProducts = products.filter(product => {
    if (!currentItem.name) return false;
    const normalizedSearch = normalizeVietnamese(currentItem.name.toLowerCase());
    const normalizedName = normalizeVietnamese(product.name.toLowerCase());
    const normalizedSku = product.sku ? normalizeVietnamese(product.sku.toLowerCase()) : '';
    
    return normalizedName.includes(normalizedSearch) || 
           normalizedSku.includes(normalizedSearch) ||
           product.name.toLowerCase().includes(currentItem.name.toLowerCase()) ||
           (product.sku && product.sku.toLowerCase().includes(currentItem.name.toLowerCase()));
  });

  // Calculated values
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalWeight = items.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const shippingPerItem = totalQuantity > 0 ? shippingCost / totalQuantity : 0;
  const grandTotal = subtotal + shippingCost;

  // Create new supplier mutation
  const createSupplierMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('/api/suppliers', 'POST', data);
      return response.json();
    },
    onSuccess: (newSupplier) => {
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      setSupplier(newSupplier.name);
      setSupplierId(newSupplier.id);
      setSupplierLink(newSupplier.website || "");
      setNewSupplierDialogOpen(false);
      setNewSupplierName("");
      setNewSupplierContact("");
      setNewSupplierEmail("");
      setNewSupplierPhone("");
      setNewSupplierWebsite("");
      toast({ title: "Success", description: "Supplier added successfully" });
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to add supplier", 
        variant: "destructive" 
      });
    }
  });

  // Create purchase mutation
  const createPurchaseMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('/api/imports/purchases', 'POST', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/purchases'] });
      toast({ title: "Success", description: "Purchase created successfully" });
      navigate('/imports/supplier-processing');
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: "Failed to create purchase", 
        variant: "destructive" 
      });
    }
  });

  const handleAddNewSupplier = () => {
    if (!newSupplierName.trim()) {
      toast({ 
        title: "Validation Error", 
        description: "Please enter supplier name", 
        variant: "destructive" 
      });
      return;
    }

    createSupplierMutation.mutate({
      name: newSupplierName,
      contactPerson: newSupplierContact || null,
      email: newSupplierEmail || null,
      phone: newSupplierPhone || null,
      website: newSupplierWebsite || null
    });
  };

  const selectProduct = (product: Product) => {
    setCurrentItem({
      ...currentItem,
      name: product.name,
      sku: product.sku || "",
      unitPrice: product.price || currentItem.unitPrice || 0,
      weight: product.weight || currentItem.weight || 0,
      dimensions: product.dimensions || currentItem.dimensions || ""
    });
    setProductDropdownOpen(false);
  };

  const addItem = () => {
    if (!currentItem.name || !currentItem.quantity || currentItem.unitPrice === undefined) {
      toast({ 
        title: "Validation Error", 
        description: "Please fill in item name, quantity and unit price", 
        variant: "destructive" 
      });
      return;
    }

    const newItem: PurchaseItem = {
      id: Date.now().toString(),
      name: currentItem.name || "",
      sku: currentItem.sku || "",
      quantity: currentItem.quantity || 1,
      unitPrice: currentItem.unitPrice || 0,
      weight: currentItem.weight || 0,
      dimensions: currentItem.dimensions || "",
      notes: currentItem.notes || "",
      totalPrice: (currentItem.quantity || 1) * (currentItem.unitPrice || 0),
      costWithShipping: 0
    };

    const updatedItems = [...items, newItem];
    updateItemsWithShipping(updatedItems);
    
    // Reset form
    setCurrentItem({
      name: "",
      sku: "",
      quantity: 1,
      unitPrice: 0,
      weight: 0,
      dimensions: "",
      notes: ""
    });
  };

  const removeItem = (id: string) => {
    const updatedItems = items.filter(item => item.id !== id);
    updateItemsWithShipping(updatedItems);
  };

  const updateItemsWithShipping = (updatedItems: PurchaseItem[]) => {
    const totalQty = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
    const perItemShipping = totalQty > 0 ? shippingCost / totalQty : 0;
    
    const itemsWithShipping = updatedItems.map(item => ({
      ...item,
      costWithShipping: item.unitPrice + (perItemShipping / item.quantity)
    }));
    
    setItems(itemsWithShipping);
  };

  const handleShippingCostChange = (value: number) => {
    setShippingCost(value);
    updateItemsWithShipping(items);
  };

  const handleSubmit = async () => {
    if (!supplier) {
      toast({ 
        title: "Validation Error", 
        description: "Please select or add a supplier", 
        variant: "destructive" 
      });
      return;
    }

    if (items.length === 0) {
      toast({ 
        title: "Validation Error", 
        description: "Please add at least one item", 
        variant: "destructive" 
      });
      return;
    }

    let estimatedArrival = null;
    if (processingTime && purchaseDate) {
      const purchaseDateObj = new Date(purchaseDate);
      const timeValue = parseInt(processingTime);
      
      if (!isNaN(timeValue)) {
        if (processingUnit === 'days') {
          purchaseDateObj.setDate(purchaseDateObj.getDate() + timeValue);
        } else if (processingUnit === 'weeks') {
          purchaseDateObj.setDate(purchaseDateObj.getDate() + (timeValue * 7));
        } else if (processingUnit === 'months') {
          purchaseDateObj.setMonth(purchaseDateObj.getMonth() + timeValue);
        }
        estimatedArrival = purchaseDateObj.toISOString();
      }
    }

    const purchaseData = {
      supplier,
      supplierId,
      purchaseDate: purchaseDate ? new Date(purchaseDate).toISOString() : new Date().toISOString(),
      trackingNumber: trackingNumber || null,
      estimatedArrival,
      processingTime: processingTime ? `${processingTime} ${processingUnit}` : null,
      notes: notes || null,
      shippingCost,
      totalCost: grandTotal,
      items: items.map(item => ({
        name: item.name,
        sku: item.sku || null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        weight: item.weight,
        dimensions: item.dimensions || null,
        notes: item.notes || null
      }))
    };

    createPurchaseMutation.mutate(purchaseData);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/imports/supplier-processing')}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Create Purchase Order</h1>
            <p className="text-muted-foreground">Add supplier purchase with multiple items</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => navigate('/imports/supplier-processing')}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={createPurchaseMutation.isPending}
            data-testid="button-save-purchase"
          >
            <Save className="h-4 w-4 mr-2" />
            {createPurchaseMutation.isPending ? "Creating..." : "Create Purchase"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Supplier Information */}
          <Card>
            <CardHeader>
              <CardTitle>Supplier Information</CardTitle>
              <CardDescription>Basic details about the supplier and order</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier">Supplier Name *</Label>
                  <div className="relative" ref={supplierDropdownRef}>
                    <Input
                      id="supplier"
                      value={supplier}
                      onChange={(e) => {
                        setSupplier(e.target.value);
                        setSupplierId(null);
                        setSupplierLink("");
                        setSupplierDropdownOpen(true);
                      }}
                      onFocus={() => setSupplierDropdownOpen(true)}
                      placeholder="Type to search suppliers..."
                      data-testid="input-supplier"
                    />
                    {supplierDropdownOpen && supplier && (
                      <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                        {filteredSuppliers.length > 0 ? (
                          filteredSuppliers.map((s) => (
                            <button
                              key={s.id}
                              className="w-full px-3 py-2 text-left hover:bg-accent flex items-center"
                              onClick={() => {
                                setSupplier(s.name);
                                setSupplierId(s.id);
                                setSupplierLink(s.website || "");
                                setSupplierDropdownOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  supplierId === s.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {s.name}
                            </button>
                          ))
                        ) : (
                          <div className="p-2">
                            <p className="text-sm text-muted-foreground mb-2">No supplier found</p>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setNewSupplierName(supplier);
                                setNewSupplierDialogOpen(true);
                                setSupplierDropdownOpen(false);
                              }}
                              className="w-full"
                            >
                              <UserPlus className="mr-2 h-4 w-4" />
                              Add new supplier "{supplier}"
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier-link">Supplier Link</Label>
                  <Input
                    id="supplier-link"
                    value={supplierLink}
                    onChange={(e) => setSupplierLink(e.target.value)}
                    placeholder="Auto-filled or enter manually"
                    data-testid="input-supplier-link"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purchase-date">Purchase Date *</Label>
                  <Input
                    id="purchase-date"
                    type="datetime-local"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    data-testid="input-purchase-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="processing">Processing Time</Label>
                  <div className="flex gap-2">
                    <Input
                      id="processing"
                      type="number"
                      min="0"
                      value={processingTime}
                      onChange={(e) => setProcessingTime(e.target.value)}
                      placeholder="0"
                      className="flex-1"
                      data-testid="input-processing-time"
                    />
                    <Select value={processingUnit} onValueChange={setProcessingUnit}>
                      <SelectTrigger className="w-[120px]" data-testid="select-processing-unit">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="days">Days</SelectItem>
                        <SelectItem value="weeks">Weeks</SelectItem>
                        <SelectItem value="months">Months</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shipping">Shipping Cost ($)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="shipping"
                      type="number"
                      step="0.01"
                      value={shippingCost}
                      onChange={(e) => handleShippingCostChange(parseFloat(e.target.value) || 0)}
                      className="pl-10"
                      placeholder="0.00"
                      data-testid="input-shipping"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tracking">Tracking Number</Label>
                  <Input
                    id="tracking"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Optional tracking number"
                    data-testid="input-tracking"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes about this purchase..."
                  rows={3}
                  data-testid="textarea-notes"
                />
              </div>
            </CardContent>
          </Card>

          {/* Add Item Form */}
          <Card>
            <CardHeader>
              <CardTitle>Add Items</CardTitle>
              <CardDescription>Add products to this purchase order</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="itemName">Item Name *</Label>
                  <div className="relative" ref={productDropdownRef}>
                    <Input
                      id="itemName"
                      value={currentItem.name}
                      onChange={(e) => {
                        setCurrentItem({...currentItem, name: e.target.value, sku: ""});
                        setProductDropdownOpen(true);
                      }}
                      onFocus={() => setProductDropdownOpen(true)}
                      placeholder="Type to search products..."
                      data-testid="input-item-name"
                    />
                    {productDropdownOpen && currentItem.name && (
                      <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                        {filteredProducts.length > 0 ? (
                          <div>
                            {filteredProducts.slice(0, 10).map((product) => (
                              <button
                                key={product.id}
                                className="w-full px-3 py-2 text-left hover:bg-accent flex items-start"
                                onClick={() => selectProduct(product)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4 mt-0.5",
                                    currentItem.name === product.name ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex-1">
                                  <div className="font-medium">{product.name}</div>
                                  {product.sku && (
                                    <div className="text-xs text-muted-foreground">SKU: {product.sku}</div>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="p-2">
                            <p className="text-sm text-muted-foreground mb-2">No product found</p>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setProductDropdownOpen(false);
                              }}
                              className="w-full"
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Use "{currentItem.name}" as new product
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU/Code</Label>
                  <Input
                    id="sku"
                    value={currentItem.sku}
                    onChange={(e) => setCurrentItem({...currentItem, sku: e.target.value})}
                    placeholder="Auto-filled or enter manually"
                    data-testid="input-sku"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={currentItem.quantity}
                    onChange={(e) => setCurrentItem({...currentItem, quantity: parseInt(e.target.value) || 1})}
                    data-testid="input-quantity"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unitPrice">Unit Price ($) *</Label>
                  <Input
                    id="unitPrice"
                    type="number"
                    step="0.01"
                    value={currentItem.unitPrice}
                    onChange={(e) => setCurrentItem({...currentItem, unitPrice: parseFloat(e.target.value) || 0})}
                    data-testid="input-unit-price"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.01"
                    value={currentItem.weight}
                    onChange={(e) => setCurrentItem({...currentItem, weight: parseFloat(e.target.value) || 0})}
                    data-testid="input-weight"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dimensions">Dimensions</Label>
                  <Input
                    id="dimensions"
                    value={currentItem.dimensions}
                    onChange={(e) => setCurrentItem({...currentItem, dimensions: e.target.value})}
                    placeholder="L×W×H"
                    data-testid="input-dimensions"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="itemNotes">Item Notes</Label>
                <Input
                  id="itemNotes"
                  value={currentItem.notes}
                  onChange={(e) => setCurrentItem({...currentItem, notes: e.target.value})}
                  placeholder="Optional notes for this item"
                  data-testid="input-item-notes"
                />
              </div>
              <Button 
                onClick={addItem} 
                className="w-full"
                data-testid="button-add-item"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </CardContent>
          </Card>

          {/* Items Table */}
          {items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Order Items</CardTitle>
                <CardDescription>Review and manage items in this purchase order</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Weight</TableHead>
                        <TableHead className="text-right">Cost w/ Shipping</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            <div>
                              <div>{item.name}</div>
                              {item.notes && (
                                <div className="text-xs text-muted-foreground">{item.notes}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{item.sku || '-'}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">${item.unitPrice.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium">
                            ${item.totalPrice.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            {(item.weight * item.quantity).toFixed(2)}kg
                          </TableCell>
                          <TableCell className="text-right text-green-600 font-medium">
                            ${item.costWithShipping.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(item.id)}
                              data-testid={`button-remove-${item.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={2} className="font-bold">Totals</TableCell>
                        <TableCell className="text-right font-bold">{totalQuantity}</TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-right font-bold">${subtotal.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-bold">{totalWeight.toFixed(2)}kg</TableCell>
                        <TableCell className="text-right font-bold text-green-600">
                          ${grandTotal.toFixed(2)}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Summary */}
        <div className="space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items Count:</span>
                <span className="font-medium">{items.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Quantity:</span>
                <span className="font-medium">{totalQuantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Weight:</span>
                <span className="font-medium">{totalWeight.toFixed(2)} kg</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-muted-foreground">Shipping:</span>
                  <span className="font-medium">${shippingCost.toFixed(2)}</span>
                </div>
                {totalQuantity > 0 && (
                  <div className="flex justify-between mt-2 text-sm">
                    <span className="text-muted-foreground">Per Item Shipping:</span>
                    <span>${shippingPerItem.toFixed(2)}</span>
                  </div>
                )}
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between text-lg">
                  <span className="font-bold">Grand Total:</span>
                  <span className="font-bold text-green-600">${grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Quick Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <Search className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Smart Product Search</p>
                  <p className="text-muted-foreground">Search existing products with Vietnamese diacritics support</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Package className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Auto-fill SKU</p>
                  <p className="text-muted-foreground">SKU automatically filled when selecting existing products</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Processing Time</p>
                  <p className="text-muted-foreground">Estimated arrival calculated from purchase date + processing time</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add New Supplier Dialog */}
      <Dialog open={newSupplierDialogOpen} onOpenChange={setNewSupplierDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Supplier</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-supplier-name">Supplier Name *</Label>
              <Input
                id="new-supplier-name"
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
                placeholder="Enter supplier name"
                data-testid="input-new-supplier-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-supplier-contact">Contact Person</Label>
              <Input
                id="new-supplier-contact"
                value={newSupplierContact}
                onChange={(e) => setNewSupplierContact(e.target.value)}
                placeholder="Optional contact person"
                data-testid="input-new-supplier-contact"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-supplier-email">Email</Label>
              <Input
                id="new-supplier-email"
                type="email"
                value={newSupplierEmail}
                onChange={(e) => setNewSupplierEmail(e.target.value)}
                placeholder="Optional email"
                data-testid="input-new-supplier-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-supplier-phone">Phone</Label>
              <Input
                id="new-supplier-phone"
                value={newSupplierPhone}
                onChange={(e) => setNewSupplierPhone(e.target.value)}
                placeholder="Optional phone"
                data-testid="input-new-supplier-phone"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-supplier-website">Website</Label>
              <Input
                id="new-supplier-website"
                value={newSupplierWebsite}
                onChange={(e) => setNewSupplierWebsite(e.target.value)}
                placeholder="Optional website URL"
                data-testid="input-new-supplier-website"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setNewSupplierDialogOpen(false);
                setNewSupplierName("");
                setNewSupplierContact("");
                setNewSupplierEmail("");
                setNewSupplierPhone("");
                setNewSupplierWebsite("");
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddNewSupplier}
              disabled={createSupplierMutation.isPending}
              data-testid="button-create-supplier"
            >
              {createSupplierMutation.isPending ? "Adding..." : "Add Supplier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}