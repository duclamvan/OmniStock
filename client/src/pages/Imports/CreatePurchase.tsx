import { useState, useEffect, useRef } from "react";
import { useLocation, useParams } from "wouter";
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
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, Package, Trash2, Calculator, DollarSign, 
  Truck, Calendar, FileText, Save, ArrowLeft, AlertCircle,
  Check, UserPlus, Clock, Search, MoreVertical, Edit, X, RotateCcw
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
  location?: string;
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
  const params = useParams();
  const purchaseId = params.id ? parseInt(params.id) : null;
  const isEditMode = !!purchaseId;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const supplierDropdownRef = useRef<HTMLDivElement>(null);
  const productDropdownRef = useRef<HTMLDivElement>(null);
  const locationDropdownRef = useRef<HTMLDivElement>(null);

  // Form state
  const [purchaseCurrency, setPurchaseCurrency] = useState("USD");
  const [paymentCurrency, setPaymentCurrency] = useState("USD");
  const [totalPaid, setTotalPaid] = useState(0);
  const [displayCurrency, setDisplayCurrency] = useState("USD");
  const [customCurrencies, setCustomCurrencies] = useState<string[]>([]);
  const [newCurrencyCode, setNewCurrencyCode] = useState("");
  const [addingCurrency, setAddingCurrency] = useState(false);
  const [supplier, setSupplier] = useState("");
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [supplierLink, setSupplierLink] = useState("");
  const [supplierLocation, setSupplierLocation] = useState("");
  const [supplierDropdownOpen, setSupplierDropdownOpen] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [processingTime, setProcessingTime] = useState("");
  const [processingUnit, setProcessingUnit] = useState("days");
  const [notes, setNotes] = useState("");
  const [shippingCost, setShippingCost] = useState(0);
  
  // Exchange rates state
  const [exchangeRates, setExchangeRates] = useState<{[key: string]: number}>({
    USD: 1,
    EUR: 0.92,
    CZK: 23.5,
    VND: 24500,
    CNY: 7.2
  });
  
  // Currency symbols map
  const getCurrencySymbol = (currency: string) => {
    const symbols: {[key: string]: string} = {
      USD: "$",
      EUR: "€",
      CZK: "Kč",
      VND: "₫",
      CNY: "¥",
      GBP: "£",
      JPY: "¥",
      INR: "₹",
      AUD: "A$",
      CAD: "C$",
      CHF: "Fr",
      SEK: "kr",
      NOK: "kr",
      DKK: "kr"
    };
    return symbols[currency] || currency + " ";
  };
  
  // New supplier dialog
  const [newSupplierDialogOpen, setNewSupplierDialogOpen] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierContact, setNewSupplierContact] = useState("");
  const [newSupplierEmail, setNewSupplierEmail] = useState("");
  const [newSupplierPhone, setNewSupplierPhone] = useState("");
  const [newSupplierWebsite, setNewSupplierWebsite] = useState("");
  const [newSupplierLocation, setNewSupplierLocation] = useState("");
  
  // Product search state
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  
  // Location search state
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [locationSearchTimeout, setLocationSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  
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
  
  // Purchase creation state  
  const [frequentSuppliers, setFrequentSuppliers] = useState<Array<{ name: string; count: number; lastUsed: string }>>([]);
  
  // Edit state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<Partial<PurchaseItem>>({});
  const [itemCurrencyDisplay, setItemCurrencyDisplay] = useState<{[key: string]: string}>({});

  // Set default purchase date to now
  useEffect(() => {
    const now = new Date();
    const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setPurchaseDate(localDateTime);
  }, []);
  
  // Fetch exchange rates
  useEffect(() => {
    const fetchExchangeRates = async () => {
      try {
        const response = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json');
        const data = await response.json();
        
        setExchangeRates({
          USD: 1,
          EUR: data.usd.eur || 0.92,
          CZK: data.usd.czk || 23.5,
          VND: data.usd.vnd || 24500,
          CNY: data.usd.cny || 7.2
        });
      } catch (error) {
        console.error('Error fetching exchange rates:', error);
      }
    };
    
    fetchExchangeRates();
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
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target as Node)) {
        setLocationDropdownOpen(false);
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
  
  // Currency symbol
  const currencySymbol = getCurrencySymbol(purchaseCurrency);
  
  // Convert to USD
  const convertToUSD = (amount: number, fromCurrency: string) => {
    if (fromCurrency === "USD") return amount;
    const fromRate = exchangeRates[fromCurrency] || 1;
    return amount / fromRate;
  };
  
  // Convert from USD to any currency
  const convertFromUSD = (amountInUSD: number, toCurrency: string) => {
    const toRate = exchangeRates[toCurrency] || 1;
    return amountInUSD * toRate;
  };
  
  // USD equivalents
  const subtotalUSD = convertToUSD(subtotal, purchaseCurrency);
  const shippingCostUSD = convertToUSD(shippingCost, purchaseCurrency);
  const grandTotalUSD = convertToUSD(grandTotal, purchaseCurrency);
  
  // Display currency conversions
  const displaySubtotal = displayCurrency === purchaseCurrency ? subtotal : convertFromUSD(subtotalUSD, displayCurrency);
  const displayShippingCost = displayCurrency === purchaseCurrency ? shippingCost : convertFromUSD(shippingCostUSD, displayCurrency);
  const displayGrandTotal = displayCurrency === purchaseCurrency ? grandTotal : convertFromUSD(grandTotalUSD, displayCurrency);
  const displayCurrencySymbol = getCurrencySymbol(displayCurrency);

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
      setSupplierLocation(newSupplier.location || "");
      setNewSupplierDialogOpen(false);
      setNewSupplierName("");
      setNewSupplierContact("");
      setNewSupplierEmail("");
      setNewSupplierPhone("");
      setNewSupplierWebsite("");
      setNewSupplierLocation("");
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

  // Update purchase mutation
  const updatePurchaseMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest(`/api/imports/purchases/${purchaseId}`, 'PATCH', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/purchases'] });
      toast({ title: "Success", description: "Purchase updated successfully" });
      navigate('/imports/supplier-processing');
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: "Failed to update purchase", 
        variant: "destructive" 
      });
    }
  });

  // Fetch purchase data for editing
  const { data: existingPurchase, isLoading: loadingPurchase } = useQuery<any>({
    queryKey: [`/api/imports/purchases/${purchaseId}`],
    enabled: isEditMode
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
      website: newSupplierWebsite || null,
      location: newSupplierLocation || null
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

  // Search for locations using Nominatim API
  const searchLocations = async (query: string) => {
    if (query.length < 2) {
      setLocationSuggestions([]);
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`
      );
      const data = await response.json();
      
      // Format suggestions to show city and country
      const formatted = data.map((item: any) => ({
        display_name: item.display_name,
        city: item.address?.city || item.address?.town || item.address?.village || item.address?.state || '',
        country: item.address?.country || '',
        formatted: `${item.address?.city || item.address?.town || item.address?.village || item.address?.state || ''}, ${item.address?.country || ''}`.replace(/^, |, $/, '')
      })).filter((item: any) => item.formatted && item.formatted !== ', ');
      
      setLocationSuggestions(formatted);
    } catch (error) {
      console.error('Error fetching location suggestions:', error);
      setLocationSuggestions([]);
    }
  };

  // Handle location input change with debouncing
  const handleLocationChange = (value: string) => {
    setSupplierLocation(value);
    setLocationDropdownOpen(true);
    
    // Clear existing timeout
    if (locationSearchTimeout) {
      clearTimeout(locationSearchTimeout);
    }
    
    // Set new timeout for debounced search
    const timeout = setTimeout(() => {
      searchLocations(value);
    }, 300);
    
    setLocationSearchTimeout(timeout);
  };

  // Load frequent suppliers on mount
  useEffect(() => {
    fetch("/api/imports/suppliers/frequent")
      .then(res => res.json())
      .then(data => setFrequentSuppliers(data))
      .catch(err => console.error("Error loading frequent suppliers:", err));
  }, []);

  // Load existing purchase data for editing
  useEffect(() => {
    if (isEditMode && existingPurchase) {
      // Set basic fields
      setSupplier(existingPurchase.supplier || "");
      setSupplierId(existingPurchase.supplierId || null);
      setSupplierLink(existingPurchase.supplierLink || "");
      setSupplierLocation(existingPurchase.supplierLocation || "");
      setTrackingNumber(existingPurchase.trackingNumber || "");
      setNotes(existingPurchase.notes || "");
      setShippingCost(parseFloat(existingPurchase.shippingCost) || 0);
      
      // Set currencies
      setPurchaseCurrency(existingPurchase.purchaseCurrency || existingPurchase.paymentCurrency || "USD");
      setPaymentCurrency(existingPurchase.paymentCurrency || "USD");
      setTotalPaid(parseFloat(existingPurchase.totalPaid) || 0);
      
      // Set purchase date
      if (existingPurchase.createdAt) {
        const date = new Date(existingPurchase.createdAt);
        const localDateTime = date.toISOString().slice(0, 16);
        setPurchaseDate(localDateTime);
      }
      
      // Load items
      if (existingPurchase.items && existingPurchase.items.length > 0) {
        const loadedItems = existingPurchase.items.map((item: any) => ({
          id: item.id.toString(),
          name: item.name,
          sku: item.sku || "",
          quantity: item.quantity,
          unitPrice: parseFloat(item.unitPrice),
          weight: parseFloat(item.weight) || 0,
          dimensions: item.dimensions || "",
          notes: item.notes || "",
          totalPrice: item.quantity * parseFloat(item.unitPrice),
          costWithShipping: 0
        }));
        setItems(loadedItems);
      }
    }
  }, [isEditMode, existingPurchase]);

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
  
  const startEditItem = (item: PurchaseItem) => {
    setEditingItemId(item.id);
    setEditingItem({
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice
    });
  };
  
  const saveEditItem = () => {
    if (!editingItemId) return;
    
    const updatedItems = items.map(item => {
      if (item.id === editingItemId) {
        const totalPrice = (editingItem.quantity || 0) * (editingItem.unitPrice || 0);
        
        return {
          ...item,
          name: editingItem.name || item.name,
          quantity: editingItem.quantity || item.quantity,
          unitPrice: editingItem.unitPrice || item.unitPrice,
          totalPrice,
          costWithShipping: 0 // Will be recalculated by updateItemsWithShipping
        };
      }
      return item;
    });
    
    updateItemsWithShipping(updatedItems);
    setEditingItemId(null);
    setEditingItem({});
  };
  
  const cancelEditItem = () => {
    setEditingItemId(null);
    setEditingItem({});
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

    // Calculate the exchange rate between purchase and payment currency
    const exchangeRate = exchangeRates[paymentCurrency] / exchangeRates[purchaseCurrency];
    
    // Convert purchase total to payment currency if different
    const purchaseTotal = grandTotal;
    const autoConvertedTotal = purchaseCurrency !== paymentCurrency 
      ? grandTotal * exchangeRate 
      : grandTotal;

    const purchaseData = {
      // Currency fields for database
      purchaseCurrency,
      paymentCurrency,
      totalPaid: totalPaid || autoConvertedTotal, // Use entered value or auto-converted
      purchaseTotal,
      exchangeRate,
      
      // Other fields
      supplier,
      supplierId,
      supplierLink: supplierLink || null,
      supplierLocation: supplierLocation || null,
      purchaseDate: purchaseDate ? new Date(purchaseDate).toISOString() : new Date().toISOString(),
      trackingNumber: trackingNumber || null,
      estimatedArrival,
      processingTime: processingTime ? `${processingTime} ${processingUnit}` : null,
      notes: notes || null,
      shippingCost,
      totalCost: grandTotal, // Keep for backward compatibility
      // Store converted prices
      prices: {
        original: {
          currency: purchaseCurrency,
          subtotal,
          shippingCost,
          total: grandTotal
        },
        usd: {
          subtotal: subtotalUSD,
          shippingCost: shippingCostUSD,
          total: grandTotalUSD
        },
        eur: {
          subtotal: convertFromUSD(subtotalUSD, "EUR"),
          shippingCost: convertFromUSD(shippingCostUSD, "EUR"),
          total: convertFromUSD(grandTotalUSD, "EUR")
        },
        czk: {
          subtotal: convertFromUSD(subtotalUSD, "CZK"),
          shippingCost: convertFromUSD(shippingCostUSD, "CZK"),
          total: convertFromUSD(grandTotalUSD, "CZK")
        }
      },
      exchangeRates: {
        ...exchangeRates,
        date: new Date().toISOString()
      },
      items: items.map(item => ({
        name: item.name,
        sku: item.sku || null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        unitPriceUSD: convertToUSD(item.unitPrice, purchaseCurrency),
        weight: item.weight,
        dimensions: item.dimensions || null,
        notes: item.notes || null
      }))
    };

    if (isEditMode) {
      updatePurchaseMutation.mutate(purchaseData);
    } else {
      createPurchaseMutation.mutate(purchaseData);
    }
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
            <h1 className="text-3xl font-bold">{isEditMode ? 'Edit Purchase Order' : 'Create Purchase Order'}</h1>
            <p className="text-muted-foreground">{isEditMode ? 'Update purchase details' : 'Add supplier purchase with multiple items'}</p>
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
            disabled={createPurchaseMutation.isPending || updatePurchaseMutation.isPending}
            data-testid="button-save-purchase"
          >
            <Save className="h-4 w-4 mr-2" />
            {(createPurchaseMutation.isPending || updatePurchaseMutation.isPending) ? (isEditMode ? "Updating..." : "Creating...") : (isEditMode ? "Update Purchase" : "Create Purchase")}
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
                  <Label htmlFor="purchase-currency">Purchase Currency *</Label>
                  <Select value={purchaseCurrency} onValueChange={(value) => {
                    if (value === "add-new") {
                      setAddingCurrency(true);
                    } else {
                      setPurchaseCurrency(value);
                    }
                  }}>
                    <SelectTrigger data-testid="select-purchase-currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="CZK">CZK - Czech Koruna</SelectItem>
                      <SelectItem value="VND">VND - Vietnamese Dong</SelectItem>
                      <SelectItem value="CNY">CNY - Chinese Yuan</SelectItem>
                      {customCurrencies.map(currency => (
                        <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                      ))}
                      <div className="border-t">
                        <SelectItem value="add-new">
                          <Plus className="mr-2 h-4 w-4 inline" />
                          Add New Currency
                        </SelectItem>
                      </div>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment-currency">Payment Currency *</Label>
                  <div className="flex gap-2">
                    <Select value={paymentCurrency} onValueChange={(value) => {
                      if (value === "add-new") {
                        setAddingCurrency(true);
                      } else {
                        setPaymentCurrency(value);
                      }
                    }}>
                      <SelectTrigger className="flex-1" data-testid="select-payment-currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="CZK">CZK</SelectItem>
                        <SelectItem value="VND">VND</SelectItem>
                        <SelectItem value="CNY">CNY</SelectItem>
                        {customCurrencies.map(currency => (
                          <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                        ))}
                        <div className="border-t">
                          <SelectItem value="add-new">
                            <Plus className="mr-2 h-4 w-4 inline" />
                            Add New Currency
                          </SelectItem>
                        </div>
                      </SelectContent>
                    </Select>
                    <div className="relative w-36">
                      <Input
                        type="number"
                        value={totalPaid}
                        onChange={(e) => setTotalPaid(parseFloat(e.target.value) || 0)}
                        placeholder="Total Paid"
                        className="pl-8"
                        step="0.01"
                        min="0"
                        data-testid="input-total-paid"
                      />
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">
                        {getCurrencySymbol(paymentCurrency)}
                      </span>
                    </div>
                  </div>
                  {purchaseCurrency !== paymentCurrency && grandTotal > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Grand total in {paymentCurrency}: {getCurrencySymbol(paymentCurrency)}{(grandTotal * exchangeRates[paymentCurrency] / exchangeRates[purchaseCurrency]).toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
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
                    {supplierDropdownOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                        {/* Show frequent suppliers when no search term */}
                        {!supplier && frequentSuppliers.length > 0 && (
                          <>
                            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/50">
                              Frequent Suppliers
                            </div>
                            {frequentSuppliers.slice(0, 5).map((s) => (
                              <button
                                key={`freq-${s.name}`}
                                className="w-full px-3 py-2 text-left hover:bg-accent flex items-center justify-between"
                                onClick={() => {
                                  setSupplier(s.name);
                                  setSupplierDropdownOpen(false);
                                }}
                              >
                                <span>{s.name}</span>
                                <span className="text-xs text-muted-foreground">Used {s.count}x</span>
                              </button>
                            ))}
                          </>
                        )}
                        
                        {/* Show filtered suppliers when searching */}
                        {supplier && (
                          <>
                            {filteredSuppliers.length > 0 ? (
                              filteredSuppliers.map((s) => (
                                <button
                                  key={s.id}
                                  className="w-full px-3 py-2 text-left hover:bg-accent flex items-center"
                                  onClick={() => {
                                    setSupplier(s.name);
                                    setSupplierId(s.id);
                                    setSupplierLink(s.website || "");
                                    setSupplierLocation(s.location || "");
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
                          </>
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
              <div className="space-y-2">
                <Label htmlFor="supplier-location">Supplier Location</Label>
                <div className="relative" ref={locationDropdownRef}>
                  <Input
                    id="supplier-location"
                    value={supplierLocation}
                    onChange={(e) => handleLocationChange(e.target.value)}
                    onFocus={() => {
                      setLocationDropdownOpen(true);
                      if (supplierLocation) searchLocations(supplierLocation);
                    }}
                    placeholder="e.g., Shenzhen, China"
                    data-testid="input-supplier-location"
                  />
                  {locationDropdownOpen && locationSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                      {locationSuggestions.map((location, index) => (
                        <button
                          key={index}
                          className="w-full px-3 py-2 text-left hover:bg-accent"
                          onClick={() => {
                            setSupplierLocation(location.formatted);
                            setLocationDropdownOpen(false);
                            setLocationSuggestions([]);
                          }}
                        >
                          <div className="font-medium">{location.formatted}</div>
                          <div className="text-xs text-muted-foreground">{location.display_name}</div>
                        </button>
                      ))}
                    </div>
                  )}
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
                  <Label htmlFor="shipping">Shipping Cost ({purchaseCurrency})</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">{currencySymbol}</span>
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
                  <Label htmlFor="unitPrice">Unit Price *</Label>
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
                        <TableHead className="text-center w-16">Qty</TableHead>
                        <TableHead className="text-right w-24">Unit Price</TableHead>
                        <TableHead className="text-right w-24">Total</TableHead>
                        <TableHead className="text-right w-28">Cost w/ Shipping</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => {
                        const isEditing = editingItemId === item.id;
                        
                        return (
                          <TableRow key={item.id} className="hover:bg-muted/50 transition-colors">
                            <TableCell className="font-medium">
                              {isEditing ? (
                                <Input
                                  value={editingItem.name || ''}
                                  onChange={(e) => setEditingItem({...editingItem, name: e.target.value})}
                                  className="h-8 text-sm"
                                  autoFocus
                                />
                              ) : (
                                <div className="space-y-0.5 py-1">
                                  <div className="font-medium text-sm">{item.name}</div>
                                  {item.notes && (
                                    <div className="text-xs text-muted-foreground">{item.notes}</div>
                                  )}
                                  {item.dimensions && (
                                    <div className="text-xs text-muted-foreground">Dimensions: {item.dimensions}</div>
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {isEditing ? (
                                <Input
                                  type="number"
                                  value={editingItem.quantity || 0}
                                  onChange={(e) => setEditingItem({...editingItem, quantity: parseInt(e.target.value) || 0})}
                                  className="h-8 w-16 mx-auto text-sm text-center"
                                  min="1"
                                />
                              ) : (
                                <span className="font-medium text-sm">{item.quantity}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {isEditing ? (
                                <Input
                                  type="number"
                                  value={editingItem.unitPrice || 0}
                                  onChange={(e) => setEditingItem({...editingItem, unitPrice: parseFloat(e.target.value) || 0})}
                                  className="h-8 w-20 ml-auto text-sm text-right"
                                  step="0.01"
                                  min="0"
                                />
                              ) : (
                                <span className="font-mono text-sm">{currencySymbol}{item.unitPrice.toFixed(2)}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="font-medium text-sm">
                                {currencySymbol}
                                {isEditing 
                                  ? ((editingItem.quantity || 0) * (editingItem.unitPrice || 0)).toFixed(2)
                                  : item.totalPrice.toFixed(2)
                                }
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              {(() => {
                                const selectedCurrency = itemCurrencyDisplay[item.id] || purchaseCurrency;
                                const rate = exchangeRates[selectedCurrency] / exchangeRates[purchaseCurrency];
                                const convertedCost = item.costWithShipping * rate;
                                const symbol = getCurrencySymbol(selectedCurrency);
                                
                                return (
                                  <div className="space-y-1">
                                    <span className="text-green-600 font-medium text-sm">
                                      {symbol}{convertedCost.toFixed(2)}
                                    </span>
                                    {selectedCurrency !== purchaseCurrency && (
                                      <div className="text-xs text-muted-foreground">
                                        {selectedCurrency}
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={saveEditItem}
                                    className="h-7 px-2"
                                    data-testid={`button-save-${item.id}`}
                                  >
                                    <Check className="h-3.5 w-3.5 text-green-600" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={cancelEditItem}
                                    className="h-7 px-2"
                                    data-testid={`button-cancel-${item.id}`}
                                  >
                                    <X className="h-3.5 w-3.5 text-destructive" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-end">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem 
                                        onClick={() => startEditItem(item)}
                                      >
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit Item
                                      </DropdownMenuItem>
                                      <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>
                                          <DollarSign className="mr-2 h-4 w-4" />
                                          Show Cost in Currency
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent>
                                          <DropdownMenuItem onClick={() => setItemCurrencyDisplay(prev => ({...prev, [item.id]: "USD"}))}>
                                            <Check className={cn("mr-2 h-4 w-4", itemCurrencyDisplay[item.id] === "USD" ? "opacity-100" : "opacity-0")} />
                                            USD
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => setItemCurrencyDisplay(prev => ({...prev, [item.id]: "EUR"}))}>
                                            <Check className={cn("mr-2 h-4 w-4", itemCurrencyDisplay[item.id] === "EUR" ? "opacity-100" : "opacity-0")} />
                                            EUR
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => setItemCurrencyDisplay(prev => ({...prev, [item.id]: "CZK"}))}>
                                            <Check className={cn("mr-2 h-4 w-4", itemCurrencyDisplay[item.id] === "CZK" ? "opacity-100" : "opacity-0")} />
                                            CZK
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => setItemCurrencyDisplay(prev => ({...prev, [item.id]: "VND"}))}>
                                            <Check className={cn("mr-2 h-4 w-4", itemCurrencyDisplay[item.id] === "VND" ? "opacity-100" : "opacity-0")} />
                                            VND
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => setItemCurrencyDisplay(prev => ({...prev, [item.id]: "CNY"}))}>
                                            <Check className={cn("mr-2 h-4 w-4", itemCurrencyDisplay[item.id] === "CNY" ? "opacity-100" : "opacity-0")} />
                                            CNY
                                          </DropdownMenuItem>
                                          {customCurrencies.map(currency => (
                                            <DropdownMenuItem key={currency} onClick={() => setItemCurrencyDisplay(prev => ({...prev, [item.id]: currency}))}>
                                              <Check className={cn("mr-2 h-4 w-4", itemCurrencyDisplay[item.id] === currency ? "opacity-100" : "opacity-0")} />
                                              {currency}
                                            </DropdownMenuItem>
                                          ))}
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem onClick={() => setItemCurrencyDisplay(prev => ({...prev, [item.id]: purchaseCurrency}))}>
                                            <RotateCcw className="mr-2 h-4 w-4" />
                                            Reset to Original
                                          </DropdownMenuItem>
                                        </DropdownMenuSubContent>
                                      </DropdownMenuSub>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem 
                                        onClick={() => removeItem(item.id)}
                                        className="text-destructive focus:text-destructive"
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete Item
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell className="font-bold">Totals</TableCell>
                        <TableCell className="text-center font-bold">{totalQuantity}</TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-right font-bold">
                          {currencySymbol}{subtotal.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-green-600">
                          {currencySymbol}{grandTotal.toFixed(2)}
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
              <div className="space-y-2">
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Order Summary
                </CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{purchaseCurrency}</span>
                  <span>→</span>
                  <span className="font-medium text-foreground">{paymentCurrency}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto">
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setDisplayCurrency("USD")}>
                        <Check className={cn("mr-2 h-4 w-4", displayCurrency === "USD" ? "opacity-100" : "opacity-0")} />
                        View in USD{purchaseCurrency === "USD" ? " (purchase)" : paymentCurrency === "USD" ? " (payment)" : ""}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDisplayCurrency("EUR")}>
                        <Check className={cn("mr-2 h-4 w-4", displayCurrency === "EUR" ? "opacity-100" : "opacity-0")} />
                        View in EUR{purchaseCurrency === "EUR" ? " (purchase)" : paymentCurrency === "EUR" ? " (payment)" : ""}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDisplayCurrency("CZK")}>
                        <Check className={cn("mr-2 h-4 w-4", displayCurrency === "CZK" ? "opacity-100" : "opacity-0")} />
                        View in CZK{purchaseCurrency === "CZK" ? " (purchase)" : paymentCurrency === "CZK" ? " (payment)" : ""}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDisplayCurrency("VND")}>
                        <Check className={cn("mr-2 h-4 w-4", displayCurrency === "VND" ? "opacity-100" : "opacity-0")} />
                        View in VND{purchaseCurrency === "VND" ? " (purchase)" : paymentCurrency === "VND" ? " (payment)" : ""}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDisplayCurrency("CNY")}>
                        <Check className={cn("mr-2 h-4 w-4", displayCurrency === "CNY" ? "opacity-100" : "opacity-0")} />
                        View in CNY{purchaseCurrency === "CNY" ? " (purchase)" : paymentCurrency === "CNY" ? " (payment)" : ""}
                      </DropdownMenuItem>
                      {customCurrencies.map(currency => (
                        <DropdownMenuItem key={currency} onClick={() => setDisplayCurrency(currency)}>
                          <Check className={cn("mr-2 h-4 w-4", displayCurrency === currency ? "opacity-100" : "opacity-0")} />
                          View in {currency}{purchaseCurrency === currency ? " (purchase)" : paymentCurrency === currency ? " (payment)" : ""}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
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
                  <span className="font-medium">{displayCurrencySymbol}{displaySubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-muted-foreground">Shipping:</span>
                  <span className="font-medium">{displayCurrencySymbol}{displayShippingCost.toFixed(2)}</span>
                </div>
                {totalQuantity > 0 && (
                  <div className="flex justify-between mt-2 text-sm">
                    <span className="text-muted-foreground">Per Item Shipping:</span>
                    <span>{displayCurrencySymbol}{(displayShippingCost / totalQuantity).toFixed(2)}</span>
                  </div>
                )}
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between text-lg">
                  <span className="font-bold">Grand Total:</span>
                  <span className="font-bold text-green-600">{displayCurrencySymbol}{displayGrandTotal.toFixed(2)}</span>
                </div>
                {displayCurrency !== purchaseCurrency && (
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-muted-foreground">Original ({purchaseCurrency}):</span>
                    <span className="text-muted-foreground">{currencySymbol}{grandTotal.toFixed(2)}</span>
                  </div>
                )}
              </div>
              
              {/* Payment Section */}
              <div className="border-t pt-3 bg-muted/30 -mx-6 px-6 pb-3 -mb-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Paid ({paymentCurrency}):</span>
                  <span className="font-bold text-blue-600">
                    {getCurrencySymbol(paymentCurrency)}
                    {totalPaid.toFixed(2)}
                  </span>
                </div>
                {paymentCurrency !== purchaseCurrency && (
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-muted-foreground">Exchange Rate:</span>
                    <span className="text-muted-foreground">
                      1 {purchaseCurrency} = {(exchangeRates[paymentCurrency] / exchangeRates[purchaseCurrency]).toFixed(4)} {paymentCurrency}
                    </span>
                  </div>
                )}
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
              <div className="flex items-start gap-2">
                <Calculator className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Currency Conversion</p>
                  <p className="text-muted-foreground">Use the ⋮ menu in Order Summary to view prices in different currencies</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add New Currency Dialog */}
      <Dialog open={addingCurrency} onOpenChange={setAddingCurrency}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Currency</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-currency-code">Currency Code *</Label>
              <Input
                id="new-currency-code"
                value={newCurrencyCode}
                onChange={(e) => setNewCurrencyCode(e.target.value.toUpperCase())}
                placeholder="e.g., GBP, JPY, AUD"
                maxLength={3}
                data-testid="input-new-currency-code"
              />
              <p className="text-xs text-muted-foreground">Enter a 3-letter currency code</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setNewCurrencyCode("");
              setAddingCurrency(false);
            }}>
              Cancel
            </Button>
            <Button onClick={async () => {
              if (newCurrencyCode.length === 3 && !customCurrencies.includes(newCurrencyCode)) {
                // Add the currency to the list
                setCustomCurrencies([...customCurrencies, newCurrencyCode]);
                
                // Try to fetch exchange rate for the new currency
                try {
                  const response = await fetch(`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json`);
                  const data = await response.json();
                  
                  const currencyLower = newCurrencyCode.toLowerCase();
                  if (data.usd && data.usd[currencyLower]) {
                    setExchangeRates(prev => ({
                      ...prev,
                      [newCurrencyCode]: data.usd[currencyLower]
                    }));
                  } else {
                    // If rate not found, default to 1
                    setExchangeRates(prev => ({
                      ...prev,
                      [newCurrencyCode]: 1
                    }));
                    toast({ 
                      title: "Note", 
                      description: `Exchange rate not found for ${newCurrencyCode}, defaulting to 1:1 with USD` 
                    });
                  }
                } catch (error) {
                  // If API fails, default to 1
                  setExchangeRates(prev => ({
                    ...prev,
                    [newCurrencyCode]: 1
                  }));
                }
                
                setPurchaseCurrency(newCurrencyCode);
                setNewCurrencyCode("");
                setAddingCurrency(false);
                toast({ title: "Success", description: `Added ${newCurrencyCode} to currency list` });
              } else {
                toast({ 
                  title: "Error", 
                  description: "Please enter a valid 3-letter currency code",
                  variant: "destructive"
                });
              }
            }}>
              Add Currency
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <div className="space-y-2">
              <Label htmlFor="new-supplier-location">Location</Label>
              <Input
                id="new-supplier-location"
                value={newSupplierLocation}
                onChange={(e) => setNewSupplierLocation(e.target.value)}
                placeholder="e.g., Shenzhen, China"
                data-testid="input-new-supplier-location"
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
                setNewSupplierLocation("");
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