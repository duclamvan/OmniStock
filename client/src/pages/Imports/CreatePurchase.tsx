import { useState, useEffect, useRef, useMemo } from "react";
import { nanoid } from "nanoid";
import { useLocation, useParams } from "wouter";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { fuzzySearch } from "@/lib/fuzzySearch";
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
import { useTranslation } from "react-i18next";
import { 
  Plus, Package, Trash2, Calculator, DollarSign, 
  Truck, Calendar, FileText, Save, ArrowLeft,
  Check, UserPlus, User, Clock, Search, MoreVertical, Edit, X, RotateCcw,
  Copy, PackagePlus, ListPlus, Loader2, ChevronDown, ChevronUp, Upload, ImageIcon, Settings, Scale
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

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
  productId?: string;
  imageUrl?: string;
  imageFile?: File | null;
  binLocation?: string;
  processingTimeDays?: number;
  unitType?: 'selling' | 'bulk';
  quantityInSellingUnits?: number;
  cartons?: number;
  sellingUnitName?: string;
  bulkUnitName?: string | null;
  bulkUnitQty?: number | null;
}

interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  website?: string;
  location?: string;
  country?: string;
}

interface Product {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  price?: number;
  weight?: number;
  dimensions?: string;
  categoryId?: number;
  category?: string;
  imageUrl?: string;
  warehouseLocation?: string;
  sellingUnitName?: string;
  bulkUnitName?: string | null;
  bulkUnitQty?: number | null;
  bulkUnitPrice?: string | null;
  allowBulkSales?: boolean;
  stock?: number;
  importCostUSD?: string | null;
  importCostEUR?: string | null;
}

export default function CreatePurchase() {
  const { t } = useTranslation('imports');
  const [, navigate] = useLocation();
  const params = useParams();
  const purchaseId = params.id ? parseInt(params.id) : null;
  const isEditMode = !!purchaseId;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const supplierDropdownRef = useRef<HTMLDivElement>(null);
  const productDropdownRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Form state
  const [purchaseCurrency, setPurchaseCurrency] = useState("USD");
  const [paymentCurrency, setPaymentCurrency] = useState("USD");
  const [paymentCurrencyManuallySet, setPaymentCurrencyManuallySet] = useState(false);
  const [totalPaid, setTotalPaid] = useState(0);
  const [displayCurrency, setDisplayCurrency] = useState("USD");
  const [customCurrencies, setCustomCurrencies] = useState<string[]>([]);
  const [newCurrencyCode, setNewCurrencyCode] = useState("");
  const [addingCurrency, setAddingCurrency] = useState(false);
  const [supplier, setSupplier] = useState("");
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [supplierDropdownOpen, setSupplierDropdownOpen] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [processingTime, setProcessingTime] = useState("");
  const [processingUnit, setProcessingUnit] = useState("days");
  const [notes, setNotes] = useState("");
  const [shippingCost, setShippingCost] = useState(0);
  const [shippingCurrency, setShippingCurrency] = useState("USD");
  const [consolidation, setConsolidation] = useState("No");
  const [status, setStatus] = useState("pending");
  
  // Exchange rates state
  const [exchangeRates, setExchangeRates] = useState<{[key: string]: number}>({
    USD: 1,
    EUR: 0.92,
    CZK: 23,
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
  
  // Country flag helper
  const getCountryFlag = (country?: string) => {
    if (!country) return "🌐";
    
    const flags: {[key: string]: string} = {
      "China": "🇨🇳",
      "Hong Kong": "🇭🇰",
      "Vietnam": "🇻🇳",
      "USA": "🇺🇸",
      "United States": "🇺🇸",
      "Germany": "🇩🇪",
      "Czech Republic": "🇨🇿",
      "Czechia": "🇨🇿",
      "Japan": "🇯🇵",
      "South Korea": "🇰🇷",
      "Taiwan": "🇹🇼",
      "Singapore": "🇸🇬",
      "Thailand": "🇹🇭",
      "Malaysia": "🇲🇾",
      "Indonesia": "🇮🇩",
      "Philippines": "🇵🇭",
      "India": "🇮🇳",
      "United Kingdom": "🇬🇧",
      "UK": "🇬🇧",
      "France": "🇫🇷",
      "Italy": "🇮🇹",
      "Spain": "🇪🇸",
      "Netherlands": "🇳🇱",
      "Belgium": "🇧🇪",
      "Poland": "🇵🇱",
      "Turkey": "🇹🇷",
      "Australia": "🇦🇺",
      "Canada": "🇨🇦",
      "Mexico": "🇲🇽",
      "Brazil": "🇧🇷"
    };
    
    return flags[country] || "🌐";
  };
  
  
  // Product search state
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [productImagePreview, setProductImagePreview] = useState<string | null>(null);
  
  // Category dropdown state
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  
  // Product search debounce state
  const [productSearchTimeout, setProductSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  
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
    notes: "",
    binLocation: "TBA",
    unitType: 'selling',
    cartons: undefined
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
  
  // AI storage location suggestion state
  const [suggestingLocation, setSuggestingLocation] = useState(false);
  
  // Bulk selection state
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  
  // Mobile card expand state
  const [expandedCards, setExpandedCards] = useState<string[]>([]);

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
  
  // Auto-set consolidation to "No" when purchase currency is EUR
  useEffect(() => {
    if (purchaseCurrency === "EUR") {
      setConsolidation("No");
    }
  }, [purchaseCurrency]);
  
  // Auto-sync payment currency with purchase currency unless manually changed
  useEffect(() => {
    if (!paymentCurrencyManuallySet) {
      setPaymentCurrency(purchaseCurrency);
    }
  }, [purchaseCurrency, paymentCurrencyManuallySet]);
  
  // Fetch exchange rates
  useEffect(() => {
    const fetchExchangeRates = async () => {
      try {
        const response = await fetch('https://api.frankfurter.app/latest?from=USD&to=EUR,CZK,VND,CNY');
        const data = await response.json();
        
        setExchangeRates({
          USD: 1,
          EUR: data.rates?.EUR || 0.92,
          CZK: data.rates?.CZK || 23,
          VND: data.rates?.VND || 24500,
          CNY: data.rates?.CNY || 7.2
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
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setCategoryDropdownOpen(false);
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

  // Enhanced frequent suppliers with country info
  const enhancedFrequentSuppliers = useMemo(() => {
    return frequentSuppliers.map(freq => {
      const supplierData = suppliers.find(s => s.name === freq.name);
      return {
        ...freq,
        country: supplierData?.country,
        id: supplierData?.id
      };
    });
  }, [frequentSuppliers, suppliers]);

  // Filter products based on search with Vietnamese diacritics support
  const filteredProducts = currentItem.name
    ? fuzzySearch(products, currentItem.name, {
        fields: ['name', 'sku'],
        threshold: 0.2,
        fuzzy: true,
        vietnameseNormalization: true,
      }).map(r => r.item)
    : [];

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


  // Create purchase mutation
  const createPurchaseMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/imports/purchases', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/purchases'] });
      toast({ title: t('success'), description: t('purchaseCreated') });
      navigate('/purchase-orders');
    },
    onError: () => {
      toast({ 
        title: t('error'), 
        description: t('purchaseCreatedFailed'), 
        variant: "destructive" 
      });
    }
  });

  // Update purchase mutation
  const updatePurchaseMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('PATCH', `/api/imports/purchases/${purchaseId}`, data);
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/purchases'] });
      queryClient.invalidateQueries({ queryKey: [`/api/imports/purchases/${purchaseId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/purchases/at-warehouse'] });
      
      // Invalidate shipment queries if status was set to delivered
      if (variables.status === 'delivered') {
        queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/receivable'] });
        queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments'] });
      }
      
      toast({ title: t('success'), description: t('purchaseUpdated') });
      navigate('/purchase-orders');
    },
    onError: () => {
      toast({ 
        title: t('error'), 
        description: t('purchaseUpdatedFailed'), 
        variant: "destructive" 
      });
    }
  });


  // Fetch existing purchase data from API when in edit mode
  const { data: existingPurchase, isLoading: loadingPurchase } = useQuery({
    queryKey: [`/api/imports/purchases/${purchaseId}`],
    enabled: isEditMode
  });


  const selectProduct = async (product: Product) => {
    setCurrentItem({
      ...currentItem,
      name: product.name,
      sku: product.sku || "",
      unitPrice: product.price || currentItem.unitPrice || 0,
      weight: product.weight || currentItem.weight || 0,
      dimensions: product.dimensions || currentItem.dimensions || "",
      barcode: product.barcode || "",
      categoryId: product.categoryId,
      category: (product as any).categoryName || product.category || "",
      unitType: 'selling'
    });
    setSelectedProduct(product);
    setProductImageFile(null);
    setProductImagePreview(null);
    setProductDropdownOpen(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: t('fileTooLarge'),
          description: t('fileTooLargeDesc'),
          variant: "destructive"
        });
        return;
      }
      
      setProductImageFile(file);
      setSelectedProduct(null);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setProductImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearProductSelection = () => {
    setSelectedProduct(null);
    setProductImageFile(null);
    setProductImagePreview(null);
    setCurrentItem({
      id: nanoid(),
      name: "",
      sku: "",
      category: "",
      categoryId: undefined,
      barcode: "",
      quantity: 1,
      unitPrice: 0,
      weight: 0,
      dimensions: "",
      notes: "",
      totalPrice: 0,
      costWithShipping: 0,
      binLocation: "TBA",
      unitType: 'selling',
      cartons: undefined
    });
  };

  // AI-powered storage location suggestion
  const suggestStorageLocation = async () => {
    if (!currentItem.name) {
      toast({
        title: t('productNameRequired'),
        description: t('productNameRequiredDesc'),
        variant: "destructive"
      });
      return;
    }
    
    setSuggestingLocation(true);
    try {
      const response = await apiRequest(
        'POST',
        '/api/imports/suggest-storage-location',
        {
          productId: selectedProduct?.id,
          productName: currentItem.name,
          category: currentItem.category || 'General'
        }
      );
      
      const data = await response.json();
      
      setCurrentItem({
        ...currentItem,
        binLocation: data.suggestedLocation
      });
      
      toast({
        title: t('locationSuggested'),
        description: `${data.reasoning} (${data.accessibility} accessibility)`,
      });
    } catch (error) {
      console.error("Error suggesting location:", error);
      toast({
        title: t('suggestionFailed'),
        description: t('suggestionFailedDesc'),
        variant: "destructive"
      });
    } finally {
      setSuggestingLocation(false);
    }
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
      // Type-safe access to purchase data
      const purchase = existingPurchase as any;
      
      // Set basic fields with explicit type conversions to ensure state updates
      setSupplier(String(purchase?.supplier || ""));
      setSupplierId(purchase?.supplierId || null);
      setTrackingNumber(String(purchase?.trackingNumber || ""));
      setNotes(String(purchase?.notes || ""));
      setShippingCost(Number(purchase?.shippingCost) || 0);
      setShippingCurrency(String(purchase?.shippingCurrency || "USD"));
      setConsolidation(String(purchase?.consolidation || "No"));
      setStatus(String(purchase?.status || "pending"));
      
      // Set currencies
      const loadedPurchaseCurrency = String(purchase?.purchaseCurrency || purchase?.paymentCurrency || "USD");
      const loadedPaymentCurrency = String(purchase?.paymentCurrency || "USD");
      setPurchaseCurrency(loadedPurchaseCurrency);
      setPaymentCurrency(loadedPaymentCurrency);
      // If payment currency differs from purchase currency, mark as manually set
      if (loadedPaymentCurrency !== loadedPurchaseCurrency) {
        setPaymentCurrencyManuallySet(true);
      }
      setTotalPaid(Number(purchase?.totalPaid) || 0);
      setDisplayCurrency(loadedPurchaseCurrency);
      
      // Set purchase date
      if (purchase?.createdAt) {
        const date = new Date(purchase.createdAt);
        const localDateTime = date.toISOString().slice(0, 16);
        setPurchaseDate(localDateTime);
      }
      
      // Set estimated arrival date and processing time
      if (purchase?.estimatedArrival) {
        const arrivalDate = new Date(purchase.estimatedArrival);
        const purchaseDate = new Date(purchase.createdAt);
        const daysDiff = Math.ceil((arrivalDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
        setProcessingTime(String(daysDiff));
        setProcessingUnit("days");
      }
      
      // Load items with proper currency display
      if (purchase?.items && purchase.items.length > 0) {
        const loadedItems = purchase.items.map((item: any) => ({
          id: String(item.id),
          name: String(item.name),
          sku: String(item.sku || ""),
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          weight: Number(item.weight) || 0,
          dimensions: String(item.dimensions || ""),
          notes: String(item.notes || ""),
          totalPrice: Number(item.quantity) * Number(item.unitPrice),
          costWithShipping: 0,
          processingTimeDays: item.processingTimeDays ? Number(item.processingTimeDays) : undefined,
          unitType: item.unitType || 'selling',
          quantityInSellingUnits: item.quantityInSellingUnits || Number(item.quantity)
        }));
        setItems(loadedItems);
        
        // Set item currency display for all items
        const currencyDisplay: {[key: string]: string} = {};
        loadedItems.forEach((item: PurchaseItem) => {
          currencyDisplay[item.id] = purchase?.purchaseCurrency || "USD";
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
        title: t('validationError'), 
        description: t('pleaseFillItemFields'), 
        variant: "destructive" 
      });
      return;
    }

    // Calculate quantity in selling units based on unit type
    const quantity = currentItem.quantity || 1;
    const unitType = currentItem.unitType || 'selling';
    let quantityInSellingUnits = quantity;
    
    if (unitType === 'bulk' && selectedProduct?.bulkUnitQty) {
      quantityInSellingUnits = quantity * selectedProduct.bulkUnitQty;
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
      costWithShipping: 0,
      productId: selectedProduct?.id,
      imageUrl: selectedProduct?.imageUrl,
      imageFile: productImageFile,
      binLocation: currentItem.binLocation || "TBA",
      unitType: unitType,
      quantityInSellingUnits: quantityInSellingUnits,
      cartons: currentItem.cartons,
      sellingUnitName: selectedProduct?.sellingUnitName || 'piece',
      bulkUnitName: selectedProduct?.bulkUnitName,
      bulkUnitQty: selectedProduct?.bulkUnitQty
    };

    const updatedItems = [...items, newItem];
    updateItemsWithShipping(updatedItems);
    
    // Reset form and image states
    setSelectedProduct(null);
    setProductImageFile(null);
    setProductImagePreview(null);
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
      notes: "",
      binLocation: "TBA",
      unitType: 'selling',
      cartons: undefined
    });
  };

  const removeItem = (id: string) => {
    const updatedItems = items.filter(item => item.id !== id);
    updateItemsWithShipping(updatedItems);
    setSelectedItems(prev => prev.filter(itemId => itemId !== id));
  };
  
  // Bulk selection handlers
  const toggleSelectAll = () => {
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(items.map(item => item.id));
    }
  };
  
  const toggleSelectItem = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(itemId => itemId !== id)
        : [...prev, id]
    );
  };
  
  const deleteSelectedItems = () => {
    const updatedItems = items.filter(item => !selectedItems.includes(item.id));
    updateItemsWithShipping(updatedItems);
    setSelectedItems([]);
    setDeleteConfirmOpen(false);
    toast({
      title: t('itemRemoved'),
      description: t('selectedItems', { count: selectedItems.length }) + ' ' + t('deleted'),
    });
  };
  
  // Mobile card expand/collapse handlers
  const toggleCardExpand = (id: string) => {
    setExpandedCards(prev =>
      prev.includes(id)
        ? prev.filter(cardId => cardId !== id)
        : [...prev, id]
    );
  };
  
  // Save new category
  const saveNewCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        title: t('error'),
        description: t('enterCategoryNamePlaceholder'),
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
          title: t('success'),
          description: t('categoryAddedSuccess')
        });
      } else {
        throw new Error('Failed to save category');
      }
    } catch (error) {
      toast({
        title: t('error'),
        description: t('categoryAddFailed'),
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
        title: t('success'),
        description: t('variantAddedSuccess'),
      });
    }
  };
  
  // Add series of variants
  const addVariantSeries = () => {
    if (!seriesInput.trim() || !currentItem.name) {
      toast({
        title: t('error'),
        description: t('enterSeriesPattern'),
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
          title: t('error'),
          description: t('seriesRangeTooLarge'),
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
        title: t('success'),
        description: t('addedVariantsCount', { count: newVariantsArray.length }),
      });
    } else {
      toast({
        title: t('error'),
        description: t('formatExample'),
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
        title: t('error'),
        description: t('enterMainProductName'),
        variant: "destructive",
      });
      return;
    }
    
    const variantItems = variants.map(variant => ({
      id: `item-${Date.now()}-${Math.random()}`,
      name: `${currentItem.name} - ${variant.name}`,
      sku: variant.sku || currentItem.sku || "",
      category: currentItem.category || "",
      categoryId: currentItem.categoryId,
      barcode: currentItem.barcode || "",
      quantity: variant.quantity,
      unitPrice: variant.unitPrice,
      weight: variant.weight,
      dimensions: variant.dimensions,
      notes: currentItem.notes || "",
      // Include product image for variants
      productId: selectedProduct?.id,
      imageUrl: selectedProduct?.imageUrl,
      imageFile: productImageFile,
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
    
    // Clear product selection and images
    setSelectedProduct(null);
    setProductImageFile(null);
    setProductImagePreview(null);
    
    toast({
      title: t('success'),
      description: t('addedItemsCount', { count: variantItems.length }),
    });
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
        title: t('validationError'), 
        description: t('pleaseSelectSupplier'), 
        variant: "destructive" 
      });
      return;
    }

    if (items.length === 0) {
      toast({ 
        title: t('validationError'), 
        description: t('pleaseAddAtLeastOneItem'), 
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
      purchaseDate: purchaseDate ? new Date(purchaseDate).toISOString() : new Date().toISOString(),
      trackingNumber: trackingNumber || null,
      estimatedArrival,
      processingTime: processingTime ? `${processingTime} ${processingUnit}` : null,
      notes: notes || null,
      shippingCost,
      shippingCurrency,
      consolidation,
      status,
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
        notes: item.notes || null,
        processingTimeDays: item.processingTimeDays,
        unitType: item.unitType || 'selling',
        quantityInSellingUnits: item.quantityInSellingUnits || item.quantity
      }))
    };

    if (isEditMode) {
      updatePurchaseMutation.mutate(purchaseData);
    } else {
      createPurchaseMutation.mutate(purchaseData);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-6">
      {/* Mobile-First Sticky Header */}
      <div className="sticky top-0 z-10 bg-background border-b md:relative md:border-0">
        <div className="flex items-center justify-between p-4 md:p-0">
          <div className="flex items-center gap-2 md:gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/purchase-orders')}
              data-testid="button-back"
              className="md:hidden"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/purchase-orders')}
              className="hidden md:flex"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('backToPurchaseOrders')}
            </Button>
            <div>
              <h1 className="text-lg md:text-2xl font-semibold">{isEditMode ? t('editPurchase') : t('createPurchase')}</h1>
              <p className="text-xs md:text-sm text-muted-foreground hidden md:block">{isEditMode ? t('updateImportOrder') : t('basicDetailsSupplier')}</p>
            </div>
          </div>
          <div className="hidden md:flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => navigate('/purchase-orders')}
              data-testid="button-cancel"
            >
              {t('cancel')}
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createPurchaseMutation.isPending || updatePurchaseMutation.isPending}
              data-testid="button-save-purchase"
            >
              <Save className="h-4 w-4 mr-2" />
              {(createPurchaseMutation.isPending || updatePurchaseMutation.isPending) ? (isEditMode ? t('updating') : t('creating')) : (isEditMode ? t('update') : t('create'))}
            </Button>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Actions for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 md:hidden z-10">
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => navigate('/purchase-orders')}
            data-testid="button-cancel-mobile"
            className="flex-1"
          >
            {t('cancel')}
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={createPurchaseMutation.isPending || updatePurchaseMutation.isPending}
            data-testid="button-save-purchase-mobile"
            className="flex-1"
          >
            <Save className="h-4 w-4 mr-2" />
            {(createPurchaseMutation.isPending || updatePurchaseMutation.isPending) ? (isEditMode ? t('updating') : t('creating')) : (isEditMode ? t('update') : t('create'))}
          </Button>
        </div>
      </div>

      <div className="px-4 md:px-6 pb-20 md:pb-6 max-w-7xl mx-auto space-y-4 md:space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-8">
        {/* Left Column - Form */}
        <div className="space-y-6">
          {/* Order Details */}
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle>{t('orderDetails')}</CardTitle>
              <CardDescription>{t('basicDetailsSupplier')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Currency & Payment Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span>{t('currencyAndPayment')}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="purchase-currency" className="text-xs text-muted-foreground">{t('currency')} *</Label>
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
                        <SelectItem value="USD">{t('currencyUSD')}</SelectItem>
                        <SelectItem value="EUR">{t('currencyEUR')}</SelectItem>
                        <SelectItem value="CZK">{t('currencyCZK')}</SelectItem>
                        <SelectItem value="VND">{t('currencyVND')}</SelectItem>
                        <SelectItem value="CNY">{t('currencyCNY')}</SelectItem>
                        {customCurrencies.map(currency => (
                          <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                        ))}
                        <div className="border-t">
                          <SelectItem value="add-new">
                            <Plus className="mr-2 h-4 w-4 inline" />
                            {t('addNewCurrency')}
                          </SelectItem>
                        </div>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment-currency" className="text-xs text-muted-foreground">{t('paymentCurrency')} *</Label>
                    <Select value={paymentCurrency} onValueChange={(value) => {
                      if (value === "add-new") {
                        setAddingCurrency(true);
                      } else {
                        setPaymentCurrency(value);
                        setPaymentCurrencyManuallySet(true);
                      }
                    }}>
                      <SelectTrigger data-testid="select-payment-currency">
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
                            {t('addNewCurrency')}
                          </SelectItem>
                        </div>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="total-paid" className="text-xs text-muted-foreground">{t('totalPaid')}</Label>
                    <div className="relative">
                      <Input
                        id="total-paid"
                        type="number"
                        value={totalPaid}
                        onChange={(e) => setTotalPaid(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="pl-8"
                        step="0.01"
                        min="0"
                        data-testid="input-total-paid"
                      />
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">
                        {getCurrencySymbol(paymentCurrency)}
                      </span>
                    </div>
                    {purchaseCurrency !== paymentCurrency && grandTotal > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {t('grandTotalIn')} {paymentCurrency}: {getCurrencySymbol(paymentCurrency)}{(grandTotal * exchangeRates[paymentCurrency] / exchangeRates[purchaseCurrency]).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Supplier Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <User className="h-4 w-4 text-primary" />
                  <span>{t('supplierDetails')}</span>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier" className="text-xs text-muted-foreground">{t('supplierName')} *</Label>
                  <div className="relative" ref={supplierDropdownRef}>
                    <div className="relative">
                      <Input
                        id="supplier"
                        value={supplier}
                        onChange={(e) => {
                          setSupplier(e.target.value);
                          setSupplierId(null);
                          setSupplierDropdownOpen(true);
                        }}
                        onFocus={() => setSupplierDropdownOpen(true)}
                        placeholder={t('typeToSearchSuppliers')}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        className="pl-10"
                        data-testid="input-supplier"
                      />
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                    {supplierDropdownOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-80 overflow-auto">
                        {/* Show frequent suppliers when no search term */}
                        {!supplier && enhancedFrequentSuppliers.length > 0 && (
                          <>
                            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0 flex items-center gap-2">
                              <Clock className="h-3 w-3" />
                              {t('frequentSuppliers')}
                            </div>
                            {enhancedFrequentSuppliers.slice(0, 5).map((s) => (
                              <button
                                key={`freq-${s.name}`}
                                className="w-full px-3 py-3 text-left hover:bg-accent transition-colors flex items-center gap-3 border-b border-border/50 last:border-0"
                                onClick={() => {
                                  setSupplier(s.name);
                                  if (s.id) setSupplierId(s.id);
                                  setSupplierDropdownOpen(false);
                                }}
                              >
                                <span className="text-2xl flex-shrink-0 w-10 h-10 bg-muted rounded-lg flex items-center justify-center">{getCountryFlag(s.country)}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm truncate">{s.name}</div>
                                  {s.country && (
                                    <div className="text-xs text-muted-foreground">{s.country}</div>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                                  <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">{s.count} {t('orders')}</span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {new Date(s.lastUsed).toLocaleDateString()}
                                  </span>
                                </div>
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
                                  className="w-full px-3 py-3 text-left hover:bg-accent transition-colors flex items-center gap-3 border-b border-border/50 last:border-0"
                                  onClick={() => {
                                    setSupplier(s.name);
                                    setSupplierId(s.id);
                                    setSupplierDropdownOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "h-4 w-4 flex-shrink-0",
                                      supplierId === s.id ? "opacity-100 text-primary" : "opacity-0"
                                    )}
                                  />
                                  <span className="text-2xl flex-shrink-0 w-10 h-10 bg-muted rounded-lg flex items-center justify-center">{getCountryFlag(s.country)}</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate">{s.name}</div>
                                    {s.country && (
                                      <div className="text-xs text-muted-foreground">{s.country}</div>
                                    )}
                                  </div>
                                </button>
                              ))
                            ) : (
                              <div className="p-4">
                                <p className="text-sm text-muted-foreground mb-3">{t('noSupplierFound')}</p>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    navigate('/suppliers');
                                  }}
                                  className="w-full"
                                >
                                  <UserPlus className="mr-2 h-4 w-4" />
                                  {t('goToSuppliersPage')} "{supplier}"
                                </Button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Timeline Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>{t('timelineSection')}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="purchase-date" className="text-xs text-muted-foreground">{t('purchaseDate')} *</Label>
                    <Input
                      id="purchase-date"
                      type="datetime-local"
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                      data-testid="input-purchase-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="processing" className="text-xs text-muted-foreground">{t('processingTime')}</Label>
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
                          <SelectItem value="days">{t('days')}</SelectItem>
                          <SelectItem value="weeks">{t('weeks')}</SelectItem>
                          <SelectItem value="months">{t('months')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Shipping Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Truck className="h-4 w-4 text-primary" />
                  <span>{t('shippingDetails')}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="shipping-currency" className="text-xs text-muted-foreground">{t('shippingCurrency')}</Label>
                    <Select value={shippingCurrency} onValueChange={setShippingCurrency}>
                      <SelectTrigger id="shipping-currency" data-testid="select-shipping-currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="CZK">CZK (Kč)</SelectItem>
                        <SelectItem value="CNY">CNY (¥)</SelectItem>
                        <SelectItem value="VND">VND (₫)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shipping" className="text-xs text-muted-foreground">{t('shippingCost')}</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">{getCurrencySymbol(shippingCurrency)}</span>
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
                    <Label htmlFor="tracking" className="text-xs text-muted-foreground">{t('trackingNumber')}</Label>
                    <Input
                      id="tracking"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder={t('optionalTracking')}
                      data-testid="input-tracking"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Options Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Settings className="h-4 w-4 text-primary" />
                  <span>{t('optionsSection')}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="consolidation" className="text-xs text-muted-foreground">{t('consolidation')}?</Label>
                    <Select 
                      value={consolidation} 
                      onValueChange={setConsolidation}
                    >
                      <SelectTrigger id="consolidation" data-testid="select-consolidation">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Yes">{t('yes')}</SelectItem>
                        <SelectItem value="No">{t('no')}</SelectItem>
                      </SelectContent>
                    </Select>
                    {purchaseCurrency === "EUR" && (
                      <p className="text-xs text-muted-foreground">{t('autoSelectedNoForEUR')}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-xs text-muted-foreground">{t('notes')}</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t('additionalNotes')}
                    rows={3}
                    data-testid="textarea-notes"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Add Item Form */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>{t('addItems')}</CardTitle>
              <CardDescription>{t('addProductsToPurchase')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Product Selection Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {/* Product Image */}
                  <div className="flex-shrink-0">
                    <div className="relative group">
                      {selectedProduct?.imageUrl ? (
                        <div className="relative">
                          <img
                            src={selectedProduct.imageUrl}
                            alt={selectedProduct.name}
                            className="w-20 h-20 object-contain rounded-lg border-2 border-primary/30 bg-slate-50"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <ImageIcon className="h-5 w-5 text-white" />
                          </div>
                        </div>
                      ) : productImagePreview ? (
                        <div className="relative">
                          <img
                            src={productImagePreview}
                            alt={t('productPreview')}
                            className="w-20 h-20 object-contain rounded-lg border-2 border-primary bg-slate-50"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0"
                            onClick={() => {
                              setProductImageFile(null);
                              setProductImagePreview(null);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleImageUpload}
                            data-testid="input-product-image"
                          />
                          <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-primary hover:bg-primary/5 transition-colors">
                            <Upload className="h-6 w-6 text-gray-400 mb-1" />
                            <p className="text-[10px] text-gray-500 text-center px-1">
                              {currentItem.name ? t('uploadImage') : t('selectProductFirst')}
                            </p>
                          </div>
                        </label>
                      )}
                    </div>
                  </div>
                  
                  {/* Product Name and SKU */}
                  <div className="flex-1 space-y-2">
                    <div className="relative" ref={productDropdownRef}>
                      <Label htmlFor="itemName" className="text-xs text-muted-foreground">{t('itemName')} *</Label>
                      <Input
                        id="itemName"
                        value={currentItem.name}
                        onChange={(e) => {
                          setCurrentItem({...currentItem, name: e.target.value, sku: ""});
                          setSelectedProduct(null);
                          setProductDropdownOpen(true);
                        }}
                        onFocus={() => setProductDropdownOpen(true)}
                        placeholder={t('typeToSearchProducts')}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        className="h-9"
                        data-testid="input-item-name"
                      />
                      {productDropdownOpen && currentItem.name && (
                        <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-72 overflow-auto">
                          {filteredProducts.length > 0 ? (
                            <div>
                              {filteredProducts.slice(0, 10).map((product) => (
                                <button
                                  key={product.id}
                                  className="w-full px-3 py-2.5 text-left hover:bg-accent flex items-start gap-3 border-b last:border-b-0"
                                  onClick={() => selectProduct(product)}
                                >
                                  {product.imageUrl ? (
                                    <img src={product.imageUrl} alt="" className="w-10 h-10 object-contain rounded border bg-slate-50 flex-shrink-0" />
                                  ) : (
                                    <div className="w-10 h-10 rounded border bg-muted flex items-center justify-center flex-shrink-0">
                                      <Package className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate">{product.name}</div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                      {product.sku && <span>SKU: {product.sku}</span>}
                                      {product.stock !== undefined && (
                                        <span className={cn(
                                          "px-1.5 py-0.5 rounded text-[10px] font-medium",
                                          product.stock > 10 ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" :
                                          product.stock > 0 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" :
                                          "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                                        )}>
                                          {t('inStock')}: {product.stock}
                                        </span>
                                      )}
                                    </div>
                                    {product.bulkUnitName && product.bulkUnitQty && (
                                      <div className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5">
                                        {product.bulkUnitQty} {product.sellingUnitName || 'pcs'}/{product.bulkUnitName}
                                      </div>
                                    )}
                                  </div>
                                  <Check className={cn("h-4 w-4 mt-1 flex-shrink-0", currentItem.name === product.name ? "opacity-100 text-primary" : "opacity-0")} />
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="p-3">
                              <p className="text-sm text-muted-foreground mb-2">{t('noProductFound')}</p>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const productName = encodeURIComponent(currentItem.name || '');
                                  window.open(`/inventory/add?name=${productName}`, '_blank');
                                }}
                                className="w-full"
                                data-testid="button-add-new-product"
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                {t('createNewProduct')} "{currentItem.name}"
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="sku" className="text-xs text-muted-foreground">{t('sku')}</Label>
                        <Input
                          id="sku"
                          value={currentItem.sku}
                          onChange={(e) => setCurrentItem({...currentItem, sku: e.target.value})}
                          placeholder={t('autoFilledOrEnterManually')}
                          className="h-8 text-sm"
                          data-testid="input-sku"
                        />
                      </div>
                      <div>
                        <Label htmlFor="barcode" className="text-xs text-muted-foreground">{t('barcode')}</Label>
                        <Input
                          id="barcode"
                          value={currentItem.barcode}
                          onChange={(e) => setCurrentItem({...currentItem, barcode: e.target.value})}
                          placeholder={t('barcodeExample')}
                          className="h-8 text-sm"
                          data-testid="input-barcode"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Clear Button */}
                  {(selectedProduct || productImagePreview) && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={clearProductSelection}
                      className="h-8 px-2"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                {/* Selected Product Info Panel */}
                {selectedProduct && (
                  <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">{t('productInfo')}</span>
                      {selectedProduct.warehouseLocation && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                          {selectedProduct.warehouseLocation}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="text-xs text-muted-foreground block">{t('currentStock')}</span>
                        <span className={cn(
                          "font-medium",
                          (selectedProduct.stock || 0) > 10 ? "text-green-600" :
                          (selectedProduct.stock || 0) > 0 ? "text-yellow-600" : "text-red-600"
                        )}>
                          {selectedProduct.stock ?? 0} {selectedProduct.sellingUnitName || 'pcs'}
                        </span>
                      </div>
                      {selectedProduct.bulkUnitName && selectedProduct.bulkUnitQty && (
                        <div>
                          <span className="text-xs text-muted-foreground block">{t('purchaseUnit')}</span>
                          <span className="font-medium text-blue-600">
                            {selectedProduct.bulkUnitQty} {selectedProduct.sellingUnitName || 'pcs'}/{selectedProduct.bulkUnitName}
                          </span>
                        </div>
                      )}
                      {(selectedProduct.importCostUSD || selectedProduct.importCostEUR) && (
                        <div>
                          <span className="text-xs text-muted-foreground block">{t('lastImportCost')}</span>
                          <span className="font-medium">
                            {selectedProduct.importCostUSD ? `$${parseFloat(selectedProduct.importCostUSD).toFixed(2)}` : 
                             selectedProduct.importCostEUR ? `€${parseFloat(selectedProduct.importCostEUR).toFixed(2)}` : '-'}
                          </span>
                        </div>
                      )}
                      {selectedProduct.weight && (
                        <div>
                          <span className="text-xs text-muted-foreground block">{t('weight')}</span>
                          <span className="font-medium">{selectedProduct.weight} kg</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <Separator />
              
              {/* Quantity & Pricing Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-muted-foreground" />
                  {t('quantityAndPricing')}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="quantity" className="text-xs">{t('quantity')} *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={currentItem.quantity}
                      onChange={(e) => setCurrentItem({...currentItem, quantity: parseInt(e.target.value) || 1})}
                      className="h-9"
                      data-testid="input-quantity"
                    />
                  </div>
                  {selectedProduct?.bulkUnitName && (
                    <div className="space-y-1">
                      <Label htmlFor="unitType" className="text-xs">{t('purchaseUnit')}</Label>
                      <Select
                        value={currentItem.unitType || 'selling'}
                        onValueChange={(value: 'selling' | 'bulk') => setCurrentItem({...currentItem, unitType: value})}
                      >
                        <SelectTrigger id="unitType" className="h-9" data-testid="select-unit-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="selling">
                            {selectedProduct?.sellingUnitName || t('sellingUnit')}
                          </SelectItem>
                          <SelectItem value="bulk">
                            {selectedProduct?.bulkUnitName}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label htmlFor="unitPrice" className="text-xs">{t('unitPrice')} ({purchaseCurrency}) *</Label>
                    <Input
                      id="unitPrice"
                      type="number"
                      step="0.01"
                      value={currentItem.unitPrice}
                      onChange={(e) => setCurrentItem({...currentItem, unitPrice: parseFloat(e.target.value) || 0})}
                      className="h-9"
                      data-testid="input-unit-price"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="cartons" className="text-xs">{t('cartonsOptional')}</Label>
                    <Input
                      id="cartons"
                      type="number"
                      min="0"
                      value={currentItem.cartons || ""}
                      onChange={(e) => setCurrentItem({...currentItem, cartons: e.target.value ? parseInt(e.target.value) : undefined})}
                      placeholder={t('cartonsPlaceholder')}
                      className="h-9"
                      data-testid="input-cartons"
                    />
                  </div>
                </div>
                
                {/* Multi-unit conversion helper */}
                {selectedProduct?.bulkUnitName && currentItem.unitType === 'bulk' && selectedProduct?.bulkUnitQty && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                    <Package className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    <span className="text-sm text-blue-700 dark:text-blue-300">
                      {t('conversionHelper', {
                        qty: currentItem.quantity || 1,
                        bulkUnit: selectedProduct.bulkUnitName,
                        totalQty: (currentItem.quantity || 1) * selectedProduct.bulkUnitQty,
                        sellingUnit: selectedProduct.sellingUnitName || t('sellingUnit')
                      })}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Physical Properties Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  {t('physicalProperties')}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="weight" className="text-xs">{t('weight')} (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.01"
                      value={currentItem.weight}
                      onChange={(e) => setCurrentItem({...currentItem, weight: parseFloat(e.target.value) || 0})}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          document.getElementById('dimensions')?.focus();
                        }
                      }}
                      className="h-9"
                      data-testid="input-weight"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="dimensions" className="text-xs">{t('dimensions')}</Label>
                    <Input
                      id="dimensions"
                      value={currentItem.dimensions}
                      onChange={(e) => setCurrentItem({...currentItem, dimensions: e.target.value})}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (!showVariants || variants.length === 0) {
                            addItem();
                          }
                        }
                      }}
                      placeholder={t('dimensionsPlaceholder')}
                      className="h-9"
                      data-testid="input-dimensions"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="category" className="text-xs">{t('category')}</Label>
                    <div className="relative" ref={categoryDropdownRef}>
                      <div 
                        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                        data-testid="select-category"
                      >
                        <span className={cn("truncate", currentItem.categoryId ? "text-foreground" : "text-muted-foreground")}>
                          {currentItem.categoryId 
                            ? categories.find(c => c.id === currentItem.categoryId)?.name || t('selectACategory')
                            : t('selectACategory')
                          }
                        </span>
                        <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
                      </div>
                      
                      {categoryDropdownOpen && (
                        <div className="absolute z-50 top-full mt-1 w-full rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
                          <div className="max-h-48 overflow-y-auto">
                            {categories.map((category) => (
                              <div
                                key={category.id}
                                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                onClick={() => {
                                  setCurrentItem({
                                    ...currentItem, 
                                    categoryId: category.id, 
                                    category: category.name || category.name_en || ""
                                  });
                                  setCategoryDropdownOpen(false);
                                }}
                              >
                                {category.name || category.name_en}
                              </div>
                            ))}
                            <div
                              className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground text-primary"
                              onClick={() => {
                                setNewCategoryDialogOpen(true);
                                setCategoryDropdownOpen(false);
                              }}
                            >
                              <Plus className="h-3 w-3 mr-2" />
                              {t('addNewCategory')}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Additional Details Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  {t('additionalDetails')}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="binLocation" className="text-xs">{t('storageLocation')}</Label>
                    <div className="flex gap-2">
                      <Input
                        id="binLocation"
                        value={currentItem.binLocation || ""}
                        onChange={(e) => setCurrentItem({...currentItem, binLocation: e.target.value})}
                        placeholder={t('storageLocationExample')}
                        className="h-9 flex-1"
                        data-testid="input-bin-location"
                      />
                      <Button
                        type="button"
                        onClick={suggestStorageLocation}
                        disabled={!currentItem.name || suggestingLocation}
                        variant="outline"
                        size="sm"
                        className="h-9 gap-1.5 px-2.5"
                        data-testid="button-suggest-location"
                      >
                        {suggestingLocation ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4" />
                        )}
                        <span className="hidden sm:inline">{t('aiSuggest')}</span>
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="itemNotes" className="text-xs">{t('itemNotes')}</Label>
                    <Input
                      id="itemNotes"
                      value={currentItem.notes}
                      onChange={(e) => setCurrentItem({...currentItem, notes: e.target.value})}
                      placeholder={t('optionalNotes')}
                      className="h-9"
                      data-testid="input-item-notes"
                    />
                  </div>
                </div>
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
                    {t('addAsMultipleVariants')}
                  </Label>
                </div>
              )}
              
              {/* Variants Section */}
              {showVariants && currentItem.name && (
                <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h4 className="text-sm font-medium">{t('productVariants')}</h4>
                      <p className="text-xs text-muted-foreground">
                        {t('addVariantsOf')} {currentItem.name}
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
                        {t('addVariant')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setSeriesDialogOpen(true)}
                      >
                        <ListPlus className="h-4 w-4 mr-1" />
                        {t('addSeries')}
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
                            {selectedVariants.length > 0 ? `${selectedVariants.length} ${t('selected')}` : `${variants.length} ${t('variants')}`}
                          </span>
                        </div>
                        {selectedVariants.length > 0 && (
                          <Button type="button" variant="destructive" size="sm" onClick={bulkDeleteVariants}>
                            <Trash2 className="h-4 w-4 mr-1" />
                            {t('delete')} ({selectedVariants.length})
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
                              <TableHead className="w-24 p-2">{t('variantName')}</TableHead>
                              <TableHead className="w-16 p-2">{t('sku')}</TableHead>
                              <TableHead className="text-center w-12 p-2">{t('qty')}</TableHead>
                              <TableHead className="text-right w-16 p-2">{t('price')}</TableHead>
                              <TableHead className="text-right w-16 p-2">{t('weight')}</TableHead>
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
                  {t('addItem')}
                </Button>
              ) : (
                <Button 
                  onClick={addVariantsAsItems} 
                  className="w-full"
                  data-testid="button-add-variants"
                >
                  <PackagePlus className="h-4 w-4 mr-2" />
                  {t('addVariantsAsItems', { count: variants.length })}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Items Table */}
          {items.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{t('orderItems')}</CardTitle>
                    <CardDescription>{t('reviewManageItems')}</CardDescription>
                  </div>
                  {selectedItems.length > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg border border-primary/20">
                      <span className="text-sm font-medium text-primary">
                        {t('selectedItems', { count: selectedItems.length })}
                      </span>
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedItems([])}
                          className="h-7 px-2 text-xs"
                          data-testid="button-clear-selection"
                        >
                          <X className="h-3 w-3 mr-1" />
                          {t('clearSelection')}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteConfirmOpen(true)}
                          className="h-7 px-2 text-xs"
                          data-testid="button-delete-selected"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          {t('deleteSelected')}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0 lg:p-6">
                {/* Mobile/Tablet View - Card Layout */}
                <div className="lg:hidden">
                  <div className="divide-y">
                    {items.map((item, index) => (
                      <Collapsible 
                        key={item.id}
                        open={expandedCards.includes(item.id)}
                        onOpenChange={() => toggleCardExpand(item.id)}
                      >
                        <div className={cn(
                          "p-4 transition-colors",
                          index % 2 === 1 && "bg-muted/30",
                          "hover:bg-muted/50"
                        )}>
                          <div className="flex gap-3">
                            {/* Checkbox */}
                            <div className="flex-shrink-0 pt-1">
                              <Checkbox
                                checked={selectedItems.includes(item.id)}
                                onCheckedChange={() => toggleSelectItem(item.id)}
                                data-testid={`checkbox-item-mobile-${item.id}`}
                              />
                            </div>
                            
                            {/* Product Image */}
                            <div className="flex-shrink-0">
                              <div className="w-[60px] h-[60px] rounded-lg border bg-muted flex items-center justify-center overflow-hidden">
                                {item.imageUrl ? (
                                  <img 
                                    src={item.imageUrl} 
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Package className="h-6 w-6 text-muted-foreground" />
                                )}
                              </div>
                            </div>
                            
                            {/* Product Details */}
                            <div className="flex-1 space-y-2">
                              {/* Name and Actions */}
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <Input
                                    value={item.name}
                                    onChange={(e) => {
                                      const updatedItems = items.map(i => 
                                        i.id === item.id ? {...i, name: e.target.value} : i
                                      );
                                      setItems(updatedItems);
                                    }}
                                    className="h-auto p-0 font-medium text-base border-0 bg-transparent hover:bg-muted focus:bg-background focus:border-input focus:px-2 focus:py-1 focus:ring-2 focus:ring-primary/20"
                                    placeholder={t('itemNamePlaceholder')}
                                  />
                                  {item.unitType === 'bulk' && item.cartons && item.bulkUnitQty && (
                                    <span className="inline-flex items-center mt-1 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                                      {t('bulkUnit', { cartons: item.cartons, quantity: item.cartons * item.bulkUnitQty })}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <CollapsibleTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground"
                                      data-testid={`button-expand-${item.id}`}
                                    >
                                      {expandedCards.includes(item.id) ? (
                                        <ChevronUp className="h-4 w-4" />
                                      ) : (
                                        <ChevronDown className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </CollapsibleTrigger>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                    onClick={() => removeItem(item.id)}
                                    data-testid={`button-remove-item-mobile-${item.id}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            
                              {/* Quantity and Price Row - Always Visible */}
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1">
                                  <span className="text-sm text-muted-foreground">{t('qty')}:</span>
                                  <Input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => {
                                      const updatedItems = items.map(i => 
                                        i.id === item.id ? {...i, quantity: parseInt(e.target.value) || 1, totalPrice: (parseInt(e.target.value) || 1) * i.unitPrice} : i
                                      );
                                      updateItemsWithShipping(updatedItems);
                                    }}
                                    className="h-7 w-16 text-sm text-center border bg-background hover:border-primary/50 focus:ring-2 focus:ring-primary/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    min="1"
                                  />
                                </div>
                              
                                <div className="ml-auto text-right">
                                  <div className="text-sm font-medium">
                                    {item.totalPrice.toFixed(2)} {purchaseCurrency}
                                  </div>
                                  <div className="text-xs text-green-600">
                                    +ship: {item.costWithShipping.toFixed(2)} {purchaseCurrency}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Collapsible Content - Extended Details */}
                              <CollapsibleContent className="space-y-3 pt-2">
                                {/* SKU and Category */}
                                <div className="flex items-center gap-2 text-sm flex-wrap">
                                  {item.sku && (
                                    <span className="text-muted-foreground bg-muted px-2 py-0.5 rounded">SKU: {item.sku}</span>
                                  )}
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
                                    <SelectTrigger className="h-7 w-auto border-0 bg-transparent hover:bg-muted focus:bg-background focus:border-input text-sm px-2">
                                      <SelectValue placeholder={t('category')} />
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
                                          {t('addNewCategory')}
                                        </div>
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                {/* Price Edit */}
                                <div className="flex items-center gap-1">
                                  <span className="text-sm text-muted-foreground">{t('price')}:</span>
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="number"
                                      value={item.unitPrice}
                                      onChange={(e) => {
                                        const updatedItems = items.map(i => 
                                          i.id === item.id ? {...i, unitPrice: parseFloat(e.target.value) || 0, totalPrice: i.quantity * (parseFloat(e.target.value) || 0)} : i
                                        );
                                        updateItemsWithShipping(updatedItems);
                                      }}
                                      className="h-7 w-20 text-sm text-right border bg-background hover:border-primary/50 focus:ring-2 focus:ring-primary/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      step="0.01"
                                      min="0"
                                    />
                                    <span className="text-xs text-muted-foreground">{purchaseCurrency}</span>
                                  </div>
                                </div>
                                
                                {/* Weight */}
                                <div className="flex items-center gap-1">
                                  <span className="text-sm text-muted-foreground">{t('weight')}:</span>
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="number"
                                      value={item.weight}
                                      onChange={(e) => {
                                        const updatedItems = items.map(i => 
                                          i.id === item.id ? {...i, weight: parseFloat(e.target.value) || 0} : i
                                        );
                                        setItems(updatedItems);
                                      }}
                                      className="h-7 w-16 text-sm text-right border bg-background hover:border-primary/50 focus:ring-2 focus:ring-primary/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      step="0.01"
                                      min="0"
                                    />
                                    <span className="text-xs text-muted-foreground">kg</span>
                                    {item.weight > 0 && item.quantity > 1 && (
                                      <span className="text-xs text-muted-foreground ml-1">
                                        (= {(item.weight * item.quantity).toFixed(2)} kg total)
                                      </span>
                                    )}
                                  </div>
                                </div>
                            
                                {/* Dimensions */}
                                {item.dimensions && (
                                  <div className="text-xs text-muted-foreground">
                                    {t('dimensions')}: {item.dimensions}
                                  </div>
                                )}
                                
                                {/* Notes */}
                                {item.notes && (
                                  <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                                    {item.notes}
                                  </div>
                                )}
                              </CollapsibleContent>
                            </div>
                          </div>
                        </div>
                      </Collapsible>
                    ))}
                    
                    {/* Mobile Totals */}
                    <div className="p-4 bg-muted/30">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{t('totalItems')}:</span>
                          <span className="font-medium">{totalQuantity}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>{t('subtotal')}:</span>
                          <span className="font-medium">{subtotal.toFixed(2)} {purchaseCurrency}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>{t('shipping')}:</span>
                          <span className="font-medium">{shippingCost.toFixed(2)} {purchaseCurrency}</span>
                        </div>
                        <Separator className="my-2" />
                        <div className="flex justify-between">
                          <span className="font-semibold">{t('totalWithShipping')}:</span>
                          <span className="font-semibold text-green-600">{grandTotal.toFixed(2)} {purchaseCurrency}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Desktop View - Table Layout */}
                <div className="hidden lg:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[40px]">
                          <Checkbox
                            checked={selectedItems.length === items.length && items.length > 0}
                            onCheckedChange={toggleSelectAll}
                            aria-label={t('selectAll')}
                            data-testid="checkbox-select-all"
                          />
                        </TableHead>
                        <TableHead className="w-[48px]">{t('image')}</TableHead>
                        <TableHead className="min-w-[200px]">{t('itemDetails')}</TableHead>
                        <TableHead className="w-[160px]">{t('category')}</TableHead>
                        <TableHead className="w-[80px] text-center">{t('qty')}</TableHead>
                        <TableHead className="w-[100px] text-center">{t('weightColumn')}</TableHead>
                        <TableHead className="w-[120px] text-right">{t('unitPrice')}</TableHead>
                        <TableHead className="w-[120px] text-right">{t('total')}</TableHead>
                        <TableHead className="w-[140px] text-right">{t('costWithShipping')}</TableHead>
                        <TableHead className="w-[48px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, index) => (
                        <TableRow 
                          key={item.id} 
                          className={cn(
                            "hover:bg-muted/50 transition-colors",
                            index % 2 === 1 && "bg-muted/20",
                            selectedItems.includes(item.id) && "bg-primary/5"
                          )}
                          data-testid={`table-row-${item.id}`}
                        >
                          {/* Checkbox Column */}
                          <TableCell className="p-2">
                            <Checkbox
                              checked={selectedItems.includes(item.id)}
                              onCheckedChange={() => toggleSelectItem(item.id)}
                              data-testid={`checkbox-item-${item.id}`}
                            />
                          </TableCell>
                          
                          {/* Image Column */}
                          <TableCell className="p-2">
                            <div className="w-12 h-12 rounded-md border bg-muted flex items-center justify-center overflow-hidden">
                              {item.imageUrl ? (
                                <img 
                                  src={item.imageUrl} 
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Package className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                          </TableCell>
                          
                          {/* Item Details */}
                          <TableCell className="font-medium">
                            <div className="space-y-1">
                              <Input
                                value={item.name}
                                onChange={(e) => {
                                  const updatedItems = items.map(i => 
                                    i.id === item.id ? {...i, name: e.target.value} : i
                                  );
                                  setItems(updatedItems);
                                }}
                                className="h-7 text-sm font-medium border-0 bg-transparent hover:bg-muted hover:border hover:border-input/50 focus:bg-background focus:border-input focus:ring-2 focus:ring-primary/20 px-2 rounded transition-all"
                                placeholder={t('itemName')}
                              />
                              {item.unitType === 'bulk' && item.cartons && item.bulkUnitQty && (
                                <span className="inline-flex items-center ml-2 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                                  {t('bulkUnit', { cartons: item.cartons, quantity: item.cartons * item.bulkUnitQty })}
                                </span>
                              )}
                              {item.sku && (
                                <div className="text-xs text-muted-foreground px-2">SKU: {item.sku}</div>
                              )}
                              {item.notes && (
                                <div className="text-xs text-muted-foreground px-2 truncate max-w-[180px]" title={item.notes}>{item.notes}</div>
                              )}
                              {item.dimensions && (
                                <div className="text-xs text-muted-foreground px-2">{t('dimensions')}: {item.dimensions}</div>
                              )}
                            </div>
                          </TableCell>
                          
                          {/* Category */}
                          <TableCell>
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
                                <SelectValue placeholder={t('selectCategory')} />
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
                                    {t('addNewCategory')}
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          
                          {/* Quantity */}
                          <TableCell className="text-center">
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => {
                                const updatedItems = items.map(i => 
                                  i.id === item.id ? {...i, quantity: parseInt(e.target.value) || 1, totalPrice: (parseInt(e.target.value) || 1) * i.unitPrice} : i
                                );
                                updateItemsWithShipping(updatedItems);
                              }}
                              className="h-7 w-16 mx-auto text-sm text-center border-0 bg-transparent hover:bg-muted hover:border hover:border-input/50 focus:bg-background focus:border-input focus:ring-2 focus:ring-primary/20 rounded transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              min="1"
                            />
                          </TableCell>
                          
                          {/* Weight */}
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center">
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  value={item.weight}
                                  onChange={(e) => {
                                    const updatedItems = items.map(i => 
                                      i.id === item.id ? {...i, weight: parseFloat(e.target.value) || 0} : i
                                    );
                                    setItems(updatedItems);
                                  }}
                                  className="h-7 w-14 text-sm text-right border-0 bg-transparent hover:bg-muted hover:border hover:border-input/50 focus:bg-background focus:border-input focus:ring-2 focus:ring-primary/20 rounded transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  step="0.01"
                                  min="0"
                                  data-testid={`input-weight-${item.id}`}
                                />
                                <span className="text-xs text-muted-foreground">kg</span>
                              </div>
                              {item.weight > 0 && item.quantity > 1 && (
                                <span className="text-[10px] text-muted-foreground mt-0.5">
                                  = {(item.weight * item.quantity).toFixed(2)} kg
                                </span>
                              )}
                            </div>
                          </TableCell>
                          
                          {/* Unit Price */}
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Input
                                type="number"
                                value={item.unitPrice}
                                onChange={(e) => {
                                  const updatedItems = items.map(i => 
                                    i.id === item.id ? {...i, unitPrice: parseFloat(e.target.value) || 0, totalPrice: i.quantity * (parseFloat(e.target.value) || 0)} : i
                                  );
                                  updateItemsWithShipping(updatedItems);
                                }}
                                className="h-7 w-20 text-sm text-right border-0 bg-transparent hover:bg-muted focus:bg-background focus:border-input [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                step="0.01"
                                min="0"
                              />
                              <span className="text-xs text-muted-foreground">{purchaseCurrency}</span>
                            </div>
                          </TableCell>
                          
                          {/* Total */}
                          <TableCell className="text-right">
                            <span className="font-medium text-sm">
                              {item.totalPrice.toFixed(2)} {purchaseCurrency}
                            </span>
                          </TableCell>
                          
                          {/* Cost with Shipping */}
                          <TableCell className="text-right">
                            {(() => {
                              const selectedCurrency = itemCurrencyDisplay[item.id] || purchaseCurrency;
                              const rate = exchangeRates[selectedCurrency] / exchangeRates[purchaseCurrency];
                              const convertedCost = item.costWithShipping * rate;
                              
                              return (
                                <div className="space-y-1">
                                  <span className="text-green-600 font-medium text-sm">
                                    {convertedCost.toFixed(2)} {selectedCurrency}
                                  </span>
                                </div>
                              );
                            })()}
                          </TableCell>
                          
                          {/* Actions */}
                          <TableCell className="p-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger>
                                    <DollarSign className="mr-2 h-4 w-4" />
                                    {t('showCostInCurrency')}
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
                                      {t('resetToOriginal')}
                                    </DropdownMenuItem>
                                  </DropdownMenuSubContent>
                                </DropdownMenuSub>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => removeItem(item.id)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  {t('deleteItem')}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={4} className="font-bold">{t('totals')}</TableCell>
                        <TableCell className="text-center font-bold">{totalQuantity}</TableCell>
                        <TableCell className="text-center font-bold">
                          {items.reduce((sum, item) => sum + (item.weight * item.quantity), 0).toFixed(2)} kg
                        </TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-right font-bold">
                          {subtotal.toFixed(2)} {purchaseCurrency}
                        </TableCell>
                        <TableCell className="text-right font-bold text-green-600">
                          {grandTotal.toFixed(2)} {purchaseCurrency}
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

        {/* Right Column - Summary (Sticky) */}
        <div className="xl:sticky xl:top-6 h-fit space-y-6">
          {/* Status Selection - Compact Dropdown */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('orderStatus')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full" data-testid="select-status">
                  <SelectValue placeholder={t('selectStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending" data-testid="status-pending">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                      {t('pending')}
                    </span>
                  </SelectItem>
                  <SelectItem value="processing" data-testid="status-processing">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                      {t('processing')}
                    </span>
                  </SelectItem>
                  <SelectItem value="at_warehouse" data-testid="status-at-warehouse">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-purple-500"></span>
                      {t('consolidation')}
                    </span>
                  </SelectItem>
                  <SelectItem value="shipped" data-testid="status-shipped">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-cyan-500"></span>
                      {t('shipped')}
                    </span>
                  </SelectItem>
                  <SelectItem value="delivered" data-testid="status-delivered">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-green-500"></span>
                      {t('delivered')}
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card className="shadow-lg border-2">
            <CardHeader className="bg-muted/30 border-b">
              <div className="space-y-2">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Calculator className="h-5 w-5 text-primary" />
                  {t('orderSummary')}
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
                        {t('viewIn')} USD{purchaseCurrency === "USD" ? ` (${t('purchase')})` : paymentCurrency === "USD" ? ` (${t('payment')})` : ""}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDisplayCurrency("EUR")}>
                        <Check className={cn("mr-2 h-4 w-4", displayCurrency === "EUR" ? "opacity-100" : "opacity-0")} />
                        {t('viewIn')} EUR{purchaseCurrency === "EUR" ? ` (${t('purchase')})` : paymentCurrency === "EUR" ? ` (${t('payment')})` : ""}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDisplayCurrency("CZK")}>
                        <Check className={cn("mr-2 h-4 w-4", displayCurrency === "CZK" ? "opacity-100" : "opacity-0")} />
                        {t('viewIn')} CZK{purchaseCurrency === "CZK" ? ` (${t('purchase')})` : paymentCurrency === "CZK" ? ` (${t('payment')})` : ""}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDisplayCurrency("VND")}>
                        <Check className={cn("mr-2 h-4 w-4", displayCurrency === "VND" ? "opacity-100" : "opacity-0")} />
                        {t('viewIn')} VND{purchaseCurrency === "VND" ? ` (${t('purchase')})` : paymentCurrency === "VND" ? ` (${t('payment')})` : ""}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDisplayCurrency("CNY")}>
                        <Check className={cn("mr-2 h-4 w-4", displayCurrency === "CNY" ? "opacity-100" : "opacity-0")} />
                        {t('viewIn')} CNY{purchaseCurrency === "CNY" ? ` (${t('purchase')})` : paymentCurrency === "CNY" ? ` (${t('payment')})` : ""}
                      </DropdownMenuItem>
                      {customCurrencies.map(currency => (
                        <DropdownMenuItem key={currency} onClick={() => setDisplayCurrency(currency)}>
                          <Check className={cn("mr-2 h-4 w-4", displayCurrency === currency ? "opacity-100" : "opacity-0")} />
                          {t('viewIn')} {currency}{purchaseCurrency === currency ? ` (${t('purchase')})` : paymentCurrency === currency ? ` (${t('payment')})` : ""}
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
                  <span className="text-sm font-medium text-muted-foreground">{t('itemsCount')}</span>
                  <span className="font-semibold text-base">{items.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">{t('totalQuantity')}</span>
                  <span className="font-semibold text-base">{totalQuantity}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">{t('totalWeight')}</span>
                  <span className="font-semibold text-base">{totalWeight.toFixed(2)} kg</span>
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">{t('subtotal')}</span>
                  <span className="font-semibold text-base">{displayCurrencySymbol}{displaySubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">{t('shipping')}</span>
                  <span className="font-semibold text-base">{displayCurrencySymbol}{displayShippingCost.toFixed(2)}</span>
                </div>
                {totalQuantity > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">{t('perItemShipping')}</span>
                    <span className="text-sm">{displayCurrencySymbol}{(displayShippingCost / totalQuantity).toFixed(2)}</span>
                  </div>
                )}
              </div>
              <Separator />
              <div className="pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-base font-semibold">{t('grandTotal')}</span>
                  <span className="text-2xl font-bold text-green-600">{displayCurrencySymbol}{displayGrandTotal.toFixed(2)}</span>
                </div>
                {displayCurrency !== purchaseCurrency && (
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-muted-foreground">{t('original')} ({purchaseCurrency})</span>
                    <span className="text-xs text-muted-foreground">{currencySymbol}{grandTotal.toFixed(2)}</span>
                  </div>
                )}
              </div>
              
              {/* Payment Section with Progress */}
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">{t('totalPaid')} ({paymentCurrency})</span>
                  <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {getCurrencySymbol(paymentCurrency)}
                    {totalPaid.toFixed(2)}
                  </span>
                </div>
                {paymentCurrency !== purchaseCurrency && (
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-blue-700 dark:text-blue-300">{t('exchangeRate')}</span>
                    <span className="text-xs text-blue-700 dark:text-blue-300">
                      1 {purchaseCurrency} = {(exchangeRates[paymentCurrency] / exchangeRates[purchaseCurrency]).toFixed(4)} {paymentCurrency}
                    </span>
                  </div>
                )}
                
                {/* Payment Progress Indicator */}
                {grandTotal > 0 && (
                  <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-medium text-blue-800 dark:text-blue-200">{t('paymentProgress')}</span>
                      <span className={cn(
                        "text-xs font-semibold",
                        totalPaid >= grandTotal ? "text-green-600 dark:text-green-400" : 
                        totalPaid > 0 ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400"
                      )}>
                        {t('percentPaid', { percent: Math.min(100, Math.round((totalPaid / grandTotal) * 100)) })}
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(100, (totalPaid / grandTotal) * 100)} 
                      className={cn(
                        "h-2",
                        totalPaid >= grandTotal ? "[&>div]:bg-green-500" : 
                        totalPaid > 0 ? "[&>div]:bg-blue-500" : "[&>div]:bg-amber-500"
                      )}
                      data-testid="progress-payment"
                    />
                    {grandTotal > totalPaid && (
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-blue-700 dark:text-blue-300">{t('remainingBalance')}</span>
                        <span className="text-xs font-medium text-blue-800 dark:text-blue-200">
                          {getCurrencySymbol(paymentCurrency)}{(grandTotal - totalPaid).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Landed Cost Breakdown */}
              {totalQuantity > 0 && grandTotal > 0 && (
                <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2 mb-3">
                    <Scale className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-sm font-semibold text-purple-900 dark:text-purple-100">{t('landedCostBreakdown')}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-purple-700 dark:text-purple-300">{t('avgCostPerUnit')}</span>
                      <span className="text-sm font-medium text-purple-900 dark:text-purple-100">
                        {displayCurrencySymbol}{(displayGrandTotal / totalQuantity).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-purple-700 dark:text-purple-300">{t('shippingPerUnit')}</span>
                      <span className="text-sm font-medium text-purple-900 dark:text-purple-100">
                        {displayCurrencySymbol}{(displayShippingCost / totalQuantity).toFixed(2)}
                      </span>
                    </div>
                    
                    {/* Visual Cost Breakdown */}
                    <div className="mt-3 pt-2 border-t border-purple-200 dark:border-purple-700">
                      <div className="flex h-3 rounded-full overflow-hidden bg-purple-100 dark:bg-purple-900">
                        <div 
                          className="bg-purple-500 dark:bg-purple-400 transition-all"
                          style={{ width: `${grandTotal > 0 ? (subtotal / grandTotal) * 100 : 100}%` }}
                        />
                        <div 
                          className="bg-pink-400 dark:bg-pink-500 transition-all"
                          style={{ width: `${grandTotal > 0 ? (shippingCost / grandTotal) * 100 : 0}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center mt-2 text-xs">
                        <span className="flex items-center gap-1 text-purple-700 dark:text-purple-300">
                          <span className="h-2 w-2 rounded-full bg-purple-500" />
                          {t('productCostPercent', { percent: grandTotal > 0 ? Math.round((subtotal / grandTotal) * 100) : 100 })}
                        </span>
                        <span className="flex items-center gap-1 text-pink-600 dark:text-pink-400">
                          <span className="h-2 w-2 rounded-full bg-pink-400" />
                          {t('shippingCostPercent', { percent: grandTotal > 0 ? Math.round((shippingCost / grandTotal) * 100) : 0 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Exchange Rates Section */}
              <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-muted">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">{t('exchangeRates')}</span>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>1 USD =</span>
                    <span>{exchangeRates['EUR']?.toFixed(4) || '0.92'} EUR</span>
                  </div>
                  <div className="flex justify-between">
                    <span>1 USD =</span>
                    <span>{exchangeRates['CZK']?.toFixed(2) || '23.00'} CZK</span>
                  </div>
                  <div className="flex justify-between">
                    <span>1 USD =</span>
                    <span>{exchangeRates['VND']?.toFixed(0) || '24500'} VND</span>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-muted text-xs text-muted-foreground/70">
                  {t('lastUpdated')}: {new Date().toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Multi-Currency Comparison Card */}
          <Card className="shadow-sm" data-testid="card-currency-comparison">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                {t('currencyComparison')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {/* USD Column */}
                <div className={cn(
                  "p-3 rounded-lg border text-center transition-all",
                  purchaseCurrency === "USD" || paymentCurrency === "USD" 
                    ? "bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-700 ring-2 ring-green-500/20" 
                    : "bg-muted/30 border-muted"
                )}>
                  <div className="text-lg mb-1">🇺🇸</div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">USD</div>
                  <div className="text-sm font-bold text-foreground">
                    ${(grandTotal / (exchangeRates['USD'] || 1) * (exchangeRates[purchaseCurrency] || 1)).toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Ship: ${(shippingCost / (exchangeRates['USD'] || 1) * (exchangeRates[shippingCurrency] || 1)).toFixed(2)}
                  </div>
                  {(purchaseCurrency === "USD" || paymentCurrency === "USD") && (
                    <div className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">
                      {purchaseCurrency === "USD" ? t('purchase') : t('payment')}
                    </div>
                  )}
                </div>
                
                {/* EUR Column */}
                <div className={cn(
                  "p-3 rounded-lg border text-center transition-all",
                  purchaseCurrency === "EUR" || paymentCurrency === "EUR" 
                    ? "bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-700 ring-2 ring-green-500/20" 
                    : "bg-muted/30 border-muted"
                )}>
                  <div className="text-lg mb-1">🇪🇺</div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">EUR</div>
                  <div className="text-sm font-bold text-foreground">
                    €{(grandTotal / (exchangeRates['EUR'] || 0.92) * (exchangeRates[purchaseCurrency] || 1) / (exchangeRates['USD'] || 1)).toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Ship: €{(shippingCost / (exchangeRates['EUR'] || 0.92) * (exchangeRates[shippingCurrency] || 1) / (exchangeRates['USD'] || 1)).toFixed(2)}
                  </div>
                  {(purchaseCurrency === "EUR" || paymentCurrency === "EUR") && (
                    <div className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">
                      {purchaseCurrency === "EUR" ? t('purchase') : t('payment')}
                    </div>
                  )}
                </div>
                
                {/* CZK Column */}
                <div className={cn(
                  "p-3 rounded-lg border text-center transition-all",
                  purchaseCurrency === "CZK" || paymentCurrency === "CZK" 
                    ? "bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-700 ring-2 ring-green-500/20" 
                    : "bg-muted/30 border-muted"
                )}>
                  <div className="text-lg mb-1">🇨🇿</div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">CZK</div>
                  <div className="text-sm font-bold text-foreground">
                    Kč{(grandTotal / (exchangeRates['CZK'] || 23) * (exchangeRates[purchaseCurrency] || 1) / (exchangeRates['USD'] || 1)).toFixed(0)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Ship: Kč{(shippingCost / (exchangeRates['CZK'] || 23) * (exchangeRates[shippingCurrency] || 1) / (exchangeRates['USD'] || 1)).toFixed(0)}
                  </div>
                  {(purchaseCurrency === "CZK" || paymentCurrency === "CZK") && (
                    <div className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">
                      {purchaseCurrency === "CZK" ? t('purchase') : t('payment')}
                    </div>
                  )}
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
            <DialogTitle>{t('addCustomCurrency')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-currency-code">{t('currencyCode')} *</Label>
              <Input
                id="new-currency-code"
                value={newCurrencyCode}
                onChange={(e) => setNewCurrencyCode(e.target.value.toUpperCase())}
                placeholder={t('currencyCodeExample')}
                maxLength={3}
                data-testid="input-new-currency-code"
              />
              <p className="text-xs text-muted-foreground">{t('currencyCodeHelp')}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setNewCurrencyCode("");
              setAddingCurrency(false);
            }}>
              {t('cancel')}
            </Button>
            <Button onClick={async () => {
              if (newCurrencyCode.length === 3 && !customCurrencies.includes(newCurrencyCode)) {
                // Add the currency to the list
                setCustomCurrencies([...customCurrencies, newCurrencyCode]);
                
                // Try to fetch exchange rate for the new currency
                try {
                  const response = await fetch(`https://api.frankfurter.app/latest?from=USD&to=${newCurrencyCode}`);
                  const data = await response.json();
                  
                  if (data.rates && data.rates[newCurrencyCode]) {
                    setExchangeRates(prev => ({
                      ...prev,
                      [newCurrencyCode]: data.rates[newCurrencyCode]
                    }));
                  } else {
                    // If rate not found, default to 1
                    setExchangeRates(prev => ({
                      ...prev,
                      [newCurrencyCode]: 1
                    }));
                    toast({ 
                      title: t('exchangeRateNote'), 
                      description: t('exchangeRateNotFound', { currency: newCurrencyCode }) 
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
                toast({ title: t('success'), description: t('addedCurrencyToList', { currency: newCurrencyCode }) });
              } else {
                toast({ 
                  title: t('error'), 
                  description: t('validCurrencyCode'),
                  variant: "destructive"
                });
              }
            }}>
              {t('addCurrency')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Single Variant Dialog */}
      <Dialog open={variantDialogOpen} onOpenChange={setVariantDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('addProductVariant')}</DialogTitle>
            <DialogDescription>
              {t('addVariantFor', { name: currentItem.name })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('variantName')} *</Label>
              <Input
                value={newVariant.name}
                onChange={(e) => setNewVariant({...newVariant, name: e.target.value})}
                placeholder={t('variantNameExample')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('sku')}</Label>
              <Input
                value={newVariant.sku}
                onChange={(e) => setNewVariant({...newVariant, sku: e.target.value})}
                placeholder={t('optionalSKU')}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('quantity')}</Label>
                <Input
                  type="number"
                  value={newVariant.quantity}
                  onChange={(e) => setNewVariant({...newVariant, quantity: parseInt(e.target.value) || 1})}
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('unitPrice')}</Label>
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
                <Label>{t('weight')}</Label>
                <Input
                  type="number"
                  value={newVariant.weight}
                  onChange={(e) => setNewVariant({...newVariant, weight: parseFloat(e.target.value) || 0})}
                  step="0.01"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('dimensions')}</Label>
                <Input
                  value={newVariant.dimensions}
                  onChange={(e) => setNewVariant({...newVariant, dimensions: e.target.value})}
                  placeholder={t('dimensionsPlaceholder')}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVariantDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={addVariant}>
              {t('addVariant')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Series Dialog */}
      <Dialog open={seriesDialogOpen} onOpenChange={setSeriesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('addVariantSeries')}</DialogTitle>
            <DialogDescription>
              {t('createMultipleVariants', { name: currentItem.name })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('seriesPattern')} *</Label>
              <Input
                value={seriesInput}
                onChange={(e) => setSeriesInput(e.target.value)}
                placeholder={t('seriesPatternExample')}
              />
              <p className="text-xs text-muted-foreground">
                {t('seriesPatternHelp')}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('quantityPerVariant')}</Label>
                <Input
                  type="number"
                  value={seriesQuantity}
                  onChange={(e) => setSeriesQuantity(parseInt(e.target.value) || 1)}
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('unitPrice')}</Label>
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
              <Label>{t('weightPerVariant')}</Label>
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
              {t('cancel')}
            </Button>
            <Button onClick={addVariantSeries}>
              {t('createSeries')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Category Dialog */}
      <Dialog open={newCategoryDialogOpen} onOpenChange={setNewCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('addNewCategory')}</DialogTitle>
            <DialogDescription>
              {t('createNewCategory')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">{t('categoryName')}</Label>
              <Input
                id="category-name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder={t('enterCategoryName')}
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
              {t('cancel')}
            </Button>
            <Button 
              onClick={saveNewCategory}
              disabled={savingCategory || !newCategoryName.trim()}
            >
              {savingCategory ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('saving')}
                </>
              ) : (
                t('saveCategory')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Selected Items Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirmDeleteItems', { count: selectedItems.length })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={deleteSelectedItems}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {t('deleteSelected')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
}