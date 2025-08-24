import { useState, useEffect, useRef, useMemo } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
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
  Truck, Calendar, FileText, Save, ArrowLeft,
  Check, UserPlus, Clock, Search, MoreVertical, Edit, X, RotateCcw,
  Copy, PackagePlus, ListPlus, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

interface PurchaseItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  categoryId?: number;
  barcode: string;
  quantity: number;
  unitPrice: number;
  weight: number;
  dimensions: string;
  notes: string;
  totalPrice: number;
  costWithShipping: number;
  isVariant?: boolean;
  variantName?: string;
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
    category: "",
    categoryId: undefined,
    barcode: "",
    quantity: 1,
    unitPrice: 0,
    weight: 0,
    dimensions: "",
    notes: ""
  });
  
  // Variants state
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
  
  // Purchase creation state  
  const [frequentSuppliers, setFrequentSuppliers] = useState<Array<{ name: string; count: number; lastUsed: string }>>([]);
  
  // Currency display state for items
  const [itemCurrencyDisplay, setItemCurrencyDisplay] = useState<{[key: string]: string}>({});
  
  // Categories state
  const [categories, setCategories] = useState<Array<{ id: number; name: string; name_en?: string }>>([]);
  const [newCategoryDialogOpen, setNewCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);
  
  // Column sizes for resizable table
  const [columnSizes, setColumnSizes] = useState<number[]>(() => {
    const saved = localStorage.getItem('orderEdit-columnSizes');
    return saved ? JSON.parse(saved) : [25, 20, 10, 15, 15, 15];
  });

  // Set default purchase date to now
  useEffect(() => {
    const now = new Date();
    const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setPurchaseDate(localDateTime);
  }, []);
  
  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories');
        if (response.ok) {
          const data = await response.json();
          setCategories(data);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
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

  // Mock create new supplier mutation
  const createSupplierMutation = {
    mutate: (data: any) => {
      const newSupplier = {
        id: String(Date.now()),
        name: data.name,
        website: data.website || "",
        location: data.location || ""
      };
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
      toast({ title: "Success", description: "Supplier added successfully (mock)" });
    },
    isPending: false
  };

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
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to create purchase order", 
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
      queryClient.invalidateQueries({ queryKey: [`/api/imports/purchases/${purchaseId}`] });
      toast({ title: "Success", description: "Purchase updated successfully" });
      navigate('/imports/supplier-processing');
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to update purchase order", 
        variant: "destructive" 
      });
    }
  });

  // Mock data for editing - same as in SupplierProcessing
  const mockPurchases: any[] = [
    {
      id: 1,
      supplier: "Hong Kong Trading Co.",
      supplierLocation: "China", 
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
        { id: 1, purchaseId: 1, name: "iPhone 15 Pro Max", sku: "IPH15PM256", quantity: 5, unitPrice: "899.00", weight: "0.221", dimensions: "15x7x1", notes: null },
        { id: 2, purchaseId: 1, name: "AirPods Pro 2", sku: "APP2023", quantity: 10, unitPrice: "189.00", weight: "0.051", dimensions: "5x5x2", notes: null },
        { id: 3, purchaseId: 1, name: "MacBook Air M2", sku: "MBA13M2", quantity: 3, unitPrice: "1099.00", weight: "1.24", dimensions: "30x21x1.5", notes: null }
      ]
    },
    {
      id: 2,
      supplier: "Shenzhen Electronics Ltd",
      supplierLocation: "China",
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
        { id: 4, purchaseId: 2, name: "Samsung Galaxy S24 Ultra", sku: "SGS24U512", quantity: 8, unitPrice: "7800.00", weight: "0.233", dimensions: "16x8x1", notes: null },
        { id: 5, purchaseId: 2, name: "Galaxy Watch 6", sku: "GW6BT44", quantity: 15, unitPrice: "1800.00", weight: "0.059", dimensions: "4x4x1", notes: null }
      ]
    },
    {
      id: 3,
      supplier: "Vietnam Textiles Export",
      supplierLocation: "Vietnam",
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
        { id: 6, purchaseId: 3, name: "Cotton T-Shirts (Pack of 50)", sku: "CTS50BLK", quantity: 4, unitPrice: "12500000", weight: "10.0", dimensions: "60x40x30", notes: null },
        { id: 7, purchaseId: 3, name: "Denim Jeans (Pack of 30)", sku: "DJ30BLU", quantity: 2, unitPrice: "15000000", weight: "15.0", dimensions: "60x40x40", notes: null }
      ]
    },
    {
      id: 4,
      supplier: "European Luxury Goods",
      supplierLocation: "Europe",
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
        { id: 8, purchaseId: 4, name: "Designer Handbag Collection", sku: "DHB2024SS", quantity: 5, unitPrice: "1800.00", weight: "1.2", dimensions: "35x25x15", notes: null },
        { id: 9, purchaseId: 4, name: "Luxury Watch Set", sku: "LWS2024", quantity: 3, unitPrice: "3500.00", weight: "0.5", dimensions: "20x15x10", notes: null }
      ]
    },
    {
      id: 5,
      supplier: "USA Tech Distributors",
      supplierLocation: "USA",
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
        { id: 10, purchaseId: 5, name: "Dell XPS 15 Laptop", sku: "DXPS15I9", quantity: 4, unitPrice: "1599.00", weight: "2.05", dimensions: "36x25x2", notes: null },
        { id: 11, purchaseId: 5, name: "iPad Pro 12.9\"", sku: "IPADP13M2", quantity: 6, unitPrice: "1099.00", weight: "0.682", dimensions: "28x21x0.6", notes: null },
        { id: 12, purchaseId: 5, name: "Sony WH-1000XM5", sku: "SONYWH5", quantity: 12, unitPrice: "299.00", weight: "0.250", dimensions: "23x20x5", notes: null }
      ]
    }
  ];

  // Fetch existing purchase data from API when in edit mode
  const { data: existingPurchase, isLoading: loadingPurchase } = useQuery({
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

  // Flag to track if data has been loaded to prevent re-initialization
  const [dataLoaded, setDataLoaded] = useState(false);
  
  // Load existing purchase data for editing - only once
  useEffect(() => {
    if (isEditMode && existingPurchase && !dataLoaded) {
      // Set basic fields with explicit type conversions to ensure state updates
      setSupplier(String(existingPurchase.supplier || ""));
      setSupplierId(existingPurchase.supplierId || null);
      setSupplierLink(String(existingPurchase.supplierLink || ""));
      setSupplierLocation(String(existingPurchase.supplierLocation || ""));
      setTrackingNumber(String(existingPurchase.trackingNumber || ""));
      setNotes(String(existingPurchase.notes || ""));
      setShippingCost(Number(existingPurchase.shippingCost) || 0);
      
      // Set currencies
      setPurchaseCurrency(String(existingPurchase.purchaseCurrency || existingPurchase.paymentCurrency || "USD"));
      setPaymentCurrency(String(existingPurchase.paymentCurrency || "USD"));
      setTotalPaid(Number(existingPurchase.totalPaid) || 0);
      setDisplayCurrency(String(existingPurchase.purchaseCurrency || existingPurchase.paymentCurrency || "USD"));
      
      // Set purchase date
      if (existingPurchase.createdAt) {
        const date = new Date(existingPurchase.createdAt);
        const localDateTime = date.toISOString().slice(0, 16);
        setPurchaseDate(localDateTime);
      }
      
      // Set estimated arrival date and processing time
      if (existingPurchase.estimatedArrival) {
        const arrivalDate = new Date(existingPurchase.estimatedArrival);
        const purchaseDate = new Date(existingPurchase.createdAt);
        const daysDiff = Math.ceil((arrivalDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
        setProcessingTime(String(daysDiff));
        setProcessingUnit("days");
      }
      
      // Load items with proper currency display
      if (existingPurchase.items && existingPurchase.items.length > 0) {
        const loadedItems = existingPurchase.items.map((item: any) => ({
          id: String(item.id),
          name: String(item.name),
          sku: String(item.sku || ""),
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          weight: Number(item.weight) || 0,
          dimensions: String(item.dimensions || ""),
          notes: String(item.notes || ""),
          totalPrice: Number(item.quantity) * Number(item.unitPrice),
          costWithShipping: 0
        }));
        setItems(loadedItems);
        
        // Set item currency display for all items
        const currencyDisplay: {[key: string]: string} = {};
        loadedItems.forEach((item: PurchaseItem) => {
          currencyDisplay[item.id] = existingPurchase.purchaseCurrency || "USD";
        });
        setItemCurrencyDisplay(currencyDisplay);
      }
      
      // Mark data as loaded to prevent re-initialization
      setDataLoaded(true);
    }
  }, [isEditMode, existingPurchase, dataLoaded]);

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
      category: currentItem.category || "",
      categoryId: currentItem.categoryId,
      barcode: currentItem.barcode || "",
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
      category: "",
      categoryId: undefined,
      barcode: "",
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
  
  // Save new category
  const saveNewCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a category name",
        variant: "destructive"
      });
      return;
    }
    
    setSavingCategory(true);
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCategoryName,
          name_en: newCategoryName,
          description: ""
        })
      });
      
      if (response.ok) {
        const newCategory = await response.json();
        setCategories([...categories, newCategory]);
        
        // Set the new category in currentItem
        setCurrentItem({
          ...currentItem,
          categoryId: newCategory.id,
          category: newCategory.name || newCategory.name_en || ""
        });
        
        setNewCategoryName("");
        setNewCategoryDialogOpen(false);
        toast({
          title: "Success",
          description: "Category added successfully"
        });
      } else {
        throw new Error('Failed to save category');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save category",
        variant: "destructive"
      });
    } finally {
      setSavingCategory(false);
    }
  };
  
  // Add single variant
  const addVariant = () => {
    if (newVariant.name.trim() && currentItem.name) {
      const variantWithId = {
        ...newVariant,
        id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: newVariant.name.trim(),
      };
      setVariants([...variants, variantWithId]);
      setNewVariant({
        name: "",
        sku: "",
        quantity: 1,
        unitPrice: currentItem.unitPrice || 0,
        weight: currentItem.weight || 0,
        dimensions: currentItem.dimensions || ""
      });
      setVariantDialogOpen(false);
      toast({
        title: "Success",
        description: "Variant added successfully",
      });
    }
  };
  
  // Add series of variants
  const addVariantSeries = () => {
    if (!seriesInput.trim() || !currentItem.name) {
      toast({
        title: "Error",
        description: "Please enter a series pattern",
        variant: "destructive",
      });
      return;
    }

    // Check if input contains pattern like "Variant <1-100>"
    const match = seriesInput.match(/<(\d+)-(\d+)>/);
    if (match) {
      const start = parseInt(match[1]);
      const end = parseInt(match[2]);
      const baseName = seriesInput.replace(/<\d+-\d+>/, '').trim();
      
      if (end - start > 200) {
        toast({
          title: "Error",
          description: "Series range too large. Maximum 200 variants at once.",
          variant: "destructive",
        });
        return;
      }
      
      const newVariantsArray = [];
      for (let i = start; i <= end; i++) {
        newVariantsArray.push({
          id: `temp-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
          name: `${baseName} ${i}`,
          sku: "",
          quantity: seriesQuantity,
          unitPrice: seriesUnitPrice,
          weight: seriesWeight,
          dimensions: ""
        });
      }
      
      setVariants([...variants, ...newVariantsArray]);
      // Reset series fields
      setSeriesInput("");
      setSeriesQuantity(1);
      setSeriesUnitPrice(currentItem.unitPrice || 0);
      setSeriesWeight(currentItem.weight || 0);
      setSeriesDialogOpen(false);
      toast({
        title: "Success",
        description: `Added ${newVariantsArray.length} variants`,
      });
    } else {
      toast({
        title: "Error",
        description: "Use format like 'Size <1-10>' to create series",
        variant: "destructive",
      });
    }
  };
  
  // Remove variant
  const removeVariant = (variantId: string) => {
    setVariants(variants.filter(v => v.id !== variantId));
  };
  
  // Toggle select all variants
  const toggleSelectAllVariants = () => {
    if (selectedVariants.length === variants.length) {
      setSelectedVariants([]);
    } else {
      setSelectedVariants(variants.map(v => v.id));
    }
  };
  
  // Bulk delete variants
  const bulkDeleteVariants = () => {
    setVariants(variants.filter(v => !selectedVariants.includes(v.id)));
    setSelectedVariants([]);
  };
  
  // Add all variants as items
  const addVariantsAsItems = () => {
    if (!currentItem.name) {
      toast({
        title: "Error",
        description: "Please enter the main product name first",
        variant: "destructive",
      });
      return;
    }
    
    const variantItems = variants.map(variant => ({
      id: `item-${Date.now()}-${Math.random()}`,
      name: `${currentItem.name} - ${variant.name}`,
      sku: variant.sku || currentItem.sku || "",
      category: currentItem.category || "",
      barcode: currentItem.barcode || "",
      quantity: variant.quantity,
      unitPrice: variant.unitPrice,
      weight: variant.weight,
      dimensions: variant.dimensions,
      notes: currentItem.notes || "",
      totalPrice: variant.quantity * variant.unitPrice,
      costWithShipping: 0,
      isVariant: true,
      variantName: variant.name
    }));
    
    const updatedItems = [...items, ...variantItems];
    updateItemsWithShipping(updatedItems);
    
    // Reset form
    setCurrentItem({
      name: "",
      sku: "",
      category: "",
      categoryId: undefined,
      barcode: "",
      quantity: 1,
      unitPrice: 0,
      weight: 0,
      dimensions: "",
      notes: ""
    });
    setVariants([]);
    setShowVariants(false);
    
    toast({
      title: "Success",
      description: `Added ${variantItems.length} items`,
    });
  };
  
  // These functions are no longer needed with inline editing
  // Keeping them commented in case we need to revert
  // const startEditItem = (item: PurchaseItem) => { ... }
  // const saveEditItem = () => { ... }
  // const cancelEditItem = () => { ... }

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
            <h1 className="text-2xl font-semibold">{isEditMode ? 'Edit Purchase Order' : 'Create Purchase Order'}</h1>
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

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-8">
        {/* Left Column - Form */}
        <div className="space-y-6">
          {/* Supplier Information */}
          <Card className="shadow-sm">
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
          <Card className="shadow-sm">
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Item Category</Label>
                  <Select
                    value={currentItem.categoryId?.toString() || ""}
                    onValueChange={(value) => {
                      if (value === "add-new") {
                        setNewCategoryDialogOpen(true);
                      } else {
                        const categoryId = parseInt(value);
                        const category = categories.find(c => c.id === categoryId);
                        setCurrentItem({
                          ...currentItem, 
                          categoryId, 
                          category: category?.name || category?.name_en || ""
                        });
                      }
                    }}
                  >
                    <SelectTrigger id="category" data-testid="select-category">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name || category.name_en}
                        </SelectItem>
                      ))}
                      <SelectItem value="add-new" className="text-primary">
                        <div className="flex items-center">
                          <Plus className="h-3 w-3 mr-1" />
                          Add new category
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="barcode">Barcode (EAN-13)</Label>
                  <Input
                    id="barcode"
                    value={currentItem.barcode}
                    onChange={(e) => setCurrentItem({...currentItem, barcode: e.target.value})}
                    placeholder="e.g., 1234567890123"
                    data-testid="input-barcode"
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
              
              {/* Variants Toggle */}
              {currentItem.name && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show-variants"
                    checked={showVariants}
                    onCheckedChange={(checked) => setShowVariants(!!checked)}
                  />
                  <Label htmlFor="show-variants" className="text-sm font-medium">
                    Add as multiple variants (e.g., different sizes, colors)
                  </Label>
                </div>
              )}
              
              {/* Variants Section */}
              {showVariants && currentItem.name && (
                <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h4 className="text-sm font-medium">Product Variants</h4>
                      <p className="text-xs text-muted-foreground">
                        Add variants of {currentItem.name}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setVariantDialogOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Variant
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setSeriesDialogOpen(true)}
                      >
                        <ListPlus className="h-4 w-4 mr-1" />
                        Add Series
                      </Button>
                    </div>
                  </div>
                  
                  {/* Variants Table */}
                  {variants.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={selectedVariants.length === variants.length && variants.length > 0}
                            onCheckedChange={toggleSelectAllVariants}
                          />
                          <span className="text-sm text-muted-foreground">
                            {selectedVariants.length > 0 ? `${selectedVariants.length} selected` : `${variants.length} variants`}
                          </span>
                        </div>
                        {selectedVariants.length > 0 && (
                          <Button type="button" variant="destructive" size="sm" onClick={bulkDeleteVariants}>
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete ({selectedVariants.length})
                          </Button>
                        )}
                      </div>
                      
                      <div className="border rounded-lg overflow-x-auto">
                        <Table className="min-w-[550px] text-sm">
                          <TableHeader>
                            <TableRow className="h-8">
                              <TableHead className="w-8 p-2">
                                <Checkbox
                                  checked={selectedVariants.length === variants.length && variants.length > 0}
                                  onCheckedChange={toggleSelectAllVariants}
                                  className="h-3 w-3"
                                />
                              </TableHead>
                              <TableHead className="w-24 p-2">Variant Name</TableHead>
                              <TableHead className="w-16 p-2">SKU</TableHead>
                              <TableHead className="text-center w-12 p-2">Qty</TableHead>
                              <TableHead className="text-right w-16 p-2">Price</TableHead>
                              <TableHead className="text-right w-16 p-2">Weight</TableHead>
                              <TableHead className="w-8 p-2"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {variants.map((variant) => (
                              <TableRow key={variant.id} className="h-8">
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
                                    className="h-3 w-3"
                                  />
                                </TableCell>
                                <TableCell className="font-medium p-2 text-sm">{variant.name}</TableCell>
                                <TableCell className="p-2">
                                  <Input
                                    value={variant.sku}
                                    onChange={(e) => {
                                      setVariants(variants.map(v => 
                                        v.id === variant.id ? {...v, sku: e.target.value} : v
                                      ));
                                    }}
                                    className="h-6 w-full max-w-14 text-xs"
                                    placeholder="SKU"
                                  />
                                </TableCell>
                                <TableCell className="p-2">
                                  <Input
                                    type="number"
                                    value={variant.quantity}
                                    onChange={(e) => {
                                      setVariants(variants.map(v => 
                                        v.id === variant.id ? {...v, quantity: parseInt(e.target.value) || 0} : v
                                      ));
                                    }}
                                    className="h-6 w-12 text-center text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    min="0"
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
                                    className="h-6 w-14 text-right text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                                    className="h-6 w-6 p-1"
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
                  )}
                </div>
              )}
              
              {/* Add Button */}
              {(!showVariants || variants.length === 0) ? (
                <Button 
                  onClick={addItem} 
                  className="w-full"
                  data-testid="button-add-item"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              ) : (
                <Button 
                  onClick={addVariantsAsItems} 
                  className="w-full"
                  data-testid="button-add-variants"
                >
                  <PackagePlus className="h-4 w-4 mr-2" />
                  Add {variants.length} Variant{variants.length > 1 ? 's' : ''} as Items
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Items Table */}
          {items.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Order Items</CardTitle>
                <CardDescription>Review and manage items in this purchase order</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <ResizablePanelGroup 
                    direction="horizontal" 
                    className="min-h-0 border-b"
                    onLayout={(sizes) => {
                      setColumnSizes(sizes);
                      localStorage.setItem('orderEdit-columnSizes', JSON.stringify(sizes));
                    }}
                  >
                    <ResizablePanel defaultSize={columnSizes[0]} minSize={10}>
                      <div className="px-2 py-2 font-semibold text-sm">Item</div>
                    </ResizablePanel>
                    <ResizableHandle withHandle className="mx-1" />
                    <ResizablePanel defaultSize={columnSizes[1]} minSize={10}>
                      <div className="px-2 py-2 font-semibold text-sm">Category</div>
                    </ResizablePanel>
                    <ResizableHandle withHandle className="mx-1" />
                    <ResizablePanel defaultSize={columnSizes[2]} minSize={8}>
                      <div className="px-2 py-2 font-semibold text-sm text-center">Qty</div>
                    </ResizablePanel>
                    <ResizableHandle withHandle className="mx-1" />
                    <ResizablePanel defaultSize={columnSizes[3]} minSize={10}>
                      <div className="px-2 py-2 font-semibold text-sm text-right">Unit Price</div>
                    </ResizablePanel>
                    <ResizableHandle withHandle className="mx-1 hidden sm:flex" />
                    <ResizablePanel defaultSize={columnSizes[4]} minSize={10} className="hidden sm:block">
                      <div className="px-2 py-2 font-semibold text-sm text-right">Total</div>
                    </ResizablePanel>
                    <ResizableHandle withHandle className="mx-1 hidden md:flex" />
                    <ResizablePanel defaultSize={columnSizes[5]} minSize={10} className="hidden md:block">
                      <div className="px-2 py-2 font-semibold text-sm text-right">Cost w/ Shipping</div>
                    </ResizablePanel>
                    <div className="w-10">
                      <div className="px-2 py-2"></div>
                    </div>
                  </ResizablePanelGroup>
                  <Table>
                    <TableHeader className="sr-only">
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Cost w/ Shipping</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => {
                        return (
                          <TableRow key={item.id} className="hover:bg-muted/50 transition-colors">
                            <TableCell className="font-medium" style={{ width: `${columnSizes[0]}%` }}>
                              <div className="space-y-0.5">
                                <Input
                                  value={item.name}
                                  onChange={(e) => {
                                    const updatedItems = items.map(i => 
                                      i.id === item.id ? {...i, name: e.target.value} : i
                                    );
                                    setItems(updatedItems);
                                  }}
                                  className="h-7 text-sm font-medium border-0 bg-transparent hover:bg-muted focus:bg-background focus:border-input px-2"
                                  placeholder="Item name"
                                />
                                {item.notes && (
                                  <div className="text-xs text-muted-foreground px-2">{item.notes}</div>
                                )}
                                {item.dimensions && (
                                  <div className="text-xs text-muted-foreground px-2">Dimensions: {item.dimensions}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell style={{ width: `${columnSizes[1]}%` }}>
                              <Select
                                value={item.categoryId?.toString() || ""}
                                onValueChange={(value) => {
                                  if (value === "add-new") {
                                    setNewCategoryDialogOpen(true);
                                  } else {
                                    const categoryId = parseInt(value);
                                    const category = categories.find(c => c.id === categoryId);
                                    const updatedItems = items.map(i => 
                                      i.id === item.id 
                                        ? {...i, categoryId, category: category?.name || category?.name_en || ""} 
                                        : i
                                    );
                                    setItems(updatedItems);
                                  }
                                }}
                              >
                                <SelectTrigger className="h-7 border-0 bg-transparent hover:bg-muted focus:bg-background focus:border-input">
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                  {categories.map((category) => (
                                    <SelectItem key={category.id} value={category.id.toString()}>
                                      {category.name || category.name_en}
                                    </SelectItem>
                                  ))}
                                  <SelectItem value="add-new" className="text-primary">
                                    <div className="flex items-center">
                                      <Plus className="h-3 w-3 mr-1" />
                                      Add new category
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-center" style={{ width: `${columnSizes[2]}%` }}>
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => {
                                  const updatedItems = items.map(i => 
                                    i.id === item.id ? {...i, quantity: parseInt(e.target.value) || 1, totalPrice: (parseInt(e.target.value) || 1) * i.unitPrice} : i
                                  );
                                  updateItemsWithShipping(updatedItems);
                                }}
                                className="h-7 w-12 sm:w-16 mx-auto text-sm text-center border-0 bg-transparent hover:bg-muted focus:bg-background focus:border-input [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                min="1"
                              />
                            </TableCell>
                            <TableCell className="text-right" style={{ width: `${columnSizes[3]}%` }}>
                              <div className="flex items-center justify-end">
                                <span className="font-mono text-sm mr-1">{currencySymbol}</span>
                                <Input
                                  type="number"
                                  value={item.unitPrice}
                                  onChange={(e) => {
                                    const updatedItems = items.map(i => 
                                      i.id === item.id ? {...i, unitPrice: parseFloat(e.target.value) || 0, totalPrice: i.quantity * (parseFloat(e.target.value) || 0)} : i
                                    );
                                    updateItemsWithShipping(updatedItems);
                                  }}
                                  className="h-7 w-14 sm:w-20 text-sm text-right border-0 bg-transparent hover:bg-muted focus:bg-background focus:border-input [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  step="0.01"
                                  min="0"
                                />
                              </div>
                            </TableCell>
                            <TableCell className="text-right hidden sm:table-cell" style={{ width: `${columnSizes[4]}%` }}>
                              <span className="font-medium text-sm">
                                {currencySymbol}
                                {item.totalPrice.toFixed(2)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right hidden md:table-cell" style={{ width: `${columnSizes[5]}%` }}>
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
                            <TableCell className="px-1" style={{ width: '40px' }}>
                              <div className="flex items-center justify-end">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
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
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell className="font-bold" style={{ width: `${columnSizes[0]}%` }}>Totals</TableCell>
                        <TableCell style={{ width: `${columnSizes[1]}%` }}></TableCell>
                        <TableCell className="text-center font-bold" style={{ width: `${columnSizes[2]}%` }}>{totalQuantity}</TableCell>
                        <TableCell style={{ width: `${columnSizes[3]}%` }}></TableCell>
                        <TableCell className="text-right font-bold hidden sm:table-cell" style={{ width: `${columnSizes[4]}%` }}>
                          {currencySymbol}{subtotal.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-green-600 hidden md:table-cell" style={{ width: `${columnSizes[5]}%` }}>
                          {currencySymbol}{grandTotal.toFixed(2)}
                        </TableCell>
                        <TableCell style={{ width: '40px' }}></TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Summary (Sticky) */}
        <div className="xl:sticky xl:top-6 h-fit space-y-6">
          {/* Order Summary */}
          <Card className="shadow-lg border-2">
            <CardHeader className="bg-muted/30 border-b">
              <div className="space-y-2">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Calculator className="h-5 w-5 text-primary" />
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
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">Items Count</span>
                  <span className="font-semibold text-base">{items.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">Total Quantity</span>
                  <span className="font-semibold text-base">{totalQuantity}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">Total Weight</span>
                  <span className="font-semibold text-base">{totalWeight.toFixed(2)} kg</span>
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">Subtotal</span>
                  <span className="font-semibold text-base">{displayCurrencySymbol}{displaySubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">Shipping</span>
                  <span className="font-semibold text-base">{displayCurrencySymbol}{displayShippingCost.toFixed(2)}</span>
                </div>
                {totalQuantity > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Per Item Shipping</span>
                    <span className="text-sm">{displayCurrencySymbol}{(displayShippingCost / totalQuantity).toFixed(2)}</span>
                  </div>
                )}
              </div>
              <Separator />
              <div className="pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-base font-semibold">Grand Total</span>
                  <span className="text-2xl font-bold text-green-600">{displayCurrencySymbol}{displayGrandTotal.toFixed(2)}</span>
                </div>
                {displayCurrency !== purchaseCurrency && (
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-muted-foreground">Original ({purchaseCurrency})</span>
                    <span className="text-xs text-muted-foreground">{currencySymbol}{grandTotal.toFixed(2)}</span>
                  </div>
                )}
              </div>
              
              {/* Payment Section */}
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">Total Paid ({paymentCurrency})</span>
                  <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {getCurrencySymbol(paymentCurrency)}
                    {totalPaid.toFixed(2)}
                  </span>
                </div>
                {paymentCurrency !== purchaseCurrency && (
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-blue-700 dark:text-blue-300">Exchange Rate</span>
                    <span className="text-xs text-blue-700 dark:text-blue-300">
                      1 {purchaseCurrency} = {(exchangeRates[paymentCurrency] / exchangeRates[purchaseCurrency]).toFixed(4)} {paymentCurrency}
                    </span>
                  </div>
                )}
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
      
      {/* Add Single Variant Dialog */}
      <Dialog open={variantDialogOpen} onOpenChange={setVariantDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Product Variant</DialogTitle>
            <DialogDescription>
              Add a variant for {currentItem.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Variant Name *</Label>
              <Input
                value={newVariant.name}
                onChange={(e) => setNewVariant({...newVariant, name: e.target.value})}
                placeholder="e.g., Size L, Color Red"
              />
            </div>
            <div className="space-y-2">
              <Label>SKU</Label>
              <Input
                value={newVariant.sku}
                onChange={(e) => setNewVariant({...newVariant, sku: e.target.value})}
                placeholder="Optional SKU"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  value={newVariant.quantity}
                  onChange={(e) => setNewVariant({...newVariant, quantity: parseInt(e.target.value) || 1})}
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <Label>Unit Price</Label>
                <Input
                  type="number"
                  value={newVariant.unitPrice}
                  onChange={(e) => setNewVariant({...newVariant, unitPrice: parseFloat(e.target.value) || 0})}
                  step="0.01"
                  min="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Weight (kg)</Label>
                <Input
                  type="number"
                  value={newVariant.weight}
                  onChange={(e) => setNewVariant({...newVariant, weight: parseFloat(e.target.value) || 0})}
                  step="0.01"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Dimensions</Label>
                <Input
                  value={newVariant.dimensions}
                  onChange={(e) => setNewVariant({...newVariant, dimensions: e.target.value})}
                  placeholder="L×W×H"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVariantDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addVariant}>
              Add Variant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Series Dialog */}
      <Dialog open={seriesDialogOpen} onOpenChange={setSeriesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Variant Series</DialogTitle>
            <DialogDescription>
              Create multiple variants for {currentItem.name} using a pattern
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Series Pattern *</Label>
              <Input
                value={seriesInput}
                onChange={(e) => setSeriesInput(e.target.value)}
                placeholder="e.g., Size <1-10> or Color <1-5>"
              />
              <p className="text-xs text-muted-foreground">
                Use &lt;start-end&gt; to generate a numbered series
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity per Variant</Label>
                <Input
                  type="number"
                  value={seriesQuantity}
                  onChange={(e) => setSeriesQuantity(parseInt(e.target.value) || 1)}
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <Label>Unit Price</Label>
                <Input
                  type="number"
                  value={seriesUnitPrice}
                  onChange={(e) => setSeriesUnitPrice(parseFloat(e.target.value) || 0)}
                  step="0.01"
                  min="0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Weight per Variant (kg)</Label>
              <Input
                type="number"
                value={seriesWeight}
                onChange={(e) => setSeriesWeight(parseFloat(e.target.value) || 0)}
                step="0.01"
                min="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSeriesDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addVariantSeries}>
              Create Series
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Category Dialog */}
      <Dialog open={newCategoryDialogOpen} onOpenChange={setNewCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
            <DialogDescription>
              Create a new category for your products
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Category Name</Label>
              <Input
                id="category-name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Enter category name"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setNewCategoryDialogOpen(false);
                setNewCategoryName("");
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={saveNewCategory}
              disabled={savingCategory || !newCategoryName.trim()}
            >
              {savingCategory ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Category"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}