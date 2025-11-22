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
  Check, UserPlus, Clock, Search, MoreVertical, Edit, X, RotateCcw,
  Copy, PackagePlus, ListPlus, Loader2, ChevronDown, Upload, ImageIcon
} from "lucide-react";
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
    binLocation: "TBA"
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
      category: (product as any).categoryName || product.category || ""
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
      binLocation: "TBA"
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
          processingTimeDays: item.processingTimeDays ? Number(item.processingTimeDays) : undefined
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
      // Store product image reference if available
      productId: selectedProduct?.id,
      imageUrl: selectedProduct?.imageUrl,
      imageFile: productImageFile,
      binLocation: currentItem.binLocation || "TBA"
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
      binLocation: "TBA"
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
        processingTimeDays: item.processingTimeDays
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

      <div className="px-4 md:px-6 max-w-7xl mx-auto space-y-4 md:space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-8">
        {/* Left Column - Form */}
        <div className="space-y-6">
          {/* Supplier Information */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>{t('supplierInformation')}</CardTitle>
              <CardDescription>{t('basicDetailsSupplier')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purchase-currency">{t('currency')} *</Label>
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
                  <Label htmlFor="payment-currency">{t('paymentCurrency')} *</Label>
                  <div className="flex gap-2">
                    <Select value={paymentCurrency} onValueChange={(value) => {
                      if (value === "add-new") {
                        setAddingCurrency(true);
                      } else {
                        setPaymentCurrency(value);
                        setPaymentCurrencyManuallySet(true);
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
                            {t('addNewCurrency')}
                          </SelectItem>
                        </div>
                      </SelectContent>
                    </Select>
                    <div className="relative w-36">
                      <Input
                        type="number"
                        value={totalPaid}
                        onChange={(e) => setTotalPaid(parseFloat(e.target.value) || 0)}
                        placeholder={t('totalPaid')}
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
                      {t('grandTotalIn')} {paymentCurrency}: {getCurrencySymbol(paymentCurrency)}{(grandTotal * exchangeRates[paymentCurrency] / exchangeRates[purchaseCurrency]).toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier">{t('supplierName')} *</Label>
                  <div className="relative" ref={supplierDropdownRef}>
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
                      data-testid="input-supplier"
                    />
                    {supplierDropdownOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-80 overflow-auto">
                        {/* Show frequent suppliers when no search term */}
                        {!supplier && enhancedFrequentSuppliers.length > 0 && (
                          <>
                            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0">
                              {t('frequentSuppliers')}
                            </div>
                            {enhancedFrequentSuppliers.slice(0, 5).map((s) => (
                              <button
                                key={`freq-${s.name}`}
                                className="w-full px-3 py-2.5 text-left hover:bg-accent transition-colors flex items-center gap-3 border-b border-border/50 last:border-0"
                                onClick={() => {
                                  setSupplier(s.name);
                                  if (s.id) setSupplierId(s.id);
                                  setSupplierDropdownOpen(false);
                                }}
                              >
                                <span className="text-xl flex-shrink-0">{getCountryFlag(s.country)}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm truncate">{s.name}</div>
                                  {s.country && (
                                    <div className="text-xs text-muted-foreground">{s.country}</div>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                                  <span className="text-xs font-medium text-primary">{s.count} {t('orders')}</span>
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
                                  className="w-full px-3 py-2.5 text-left hover:bg-accent transition-colors flex items-center gap-3 border-b border-border/50 last:border-0"
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
                                  <span className="text-xl flex-shrink-0">{getCountryFlag(s.country)}</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate">{s.name}</div>
                                    {s.country && (
                                      <div className="text-xs text-muted-foreground">{s.country}</div>
                                    )}
                                  </div>
                                </button>
                              ))
                            ) : (
                              <div className="p-3">
                                <p className="text-sm text-muted-foreground mb-2">{t('noSupplierFound')}</p>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purchase-date">{t('purchaseDate')} *</Label>
                  <Input
                    id="purchase-date"
                    type="datetime-local"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    data-testid="input-purchase-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="processing">{t('processingTime')}</Label>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="shipping-currency">{t('shippingCurrency')}</Label>
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
                    <Label htmlFor="shipping">{t('shippingCost')}</Label>
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
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tracking">{t('trackingNumber')}</Label>
                  <Input
                    id="tracking"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder={t('optionalTracking')}
                    data-testid="input-tracking"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="consolidation">{t('consolidation')}?</Label>
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
                <div></div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">{t('notes')}</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('additionalNotes')}
                  rows={3}
                  data-testid="textarea-notes"
                />
              </div>
            </CardContent>
          </Card>

          {/* Add Item Form */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>{t('addItems')}</CardTitle>
              <CardDescription>{t('addProductsToPurchase')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Product Image Section */}
              <div className="flex justify-center">
                <div className="relative group">
                  {selectedProduct?.imageUrl ? (
                    // Show existing product image
                    <div className="relative">
                      <img
                        src={selectedProduct.imageUrl}
                        alt={selectedProduct.name}
                        className="w-32 h-32 object-contain rounded-lg border-2 border-gray-200 bg-slate-50"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="text-center text-white">
                          <ImageIcon className="h-6 w-6 mx-auto mb-1" />
                          <p className="text-xs">{t('existingProduct')}</p>
                        </div>
                      </div>
                    </div>
                  ) : productImagePreview ? (
                    // Show uploaded image preview
                    <div className="relative">
                      <img
                        src={productImagePreview}
                        alt={t('productPreview')}
                        className="w-32 h-32 object-contain rounded-lg border-2 border-primary bg-slate-50"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                        onClick={() => {
                          setProductImageFile(null);
                          setProductImagePreview(null);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="text-center text-white">
                          <Upload className="h-6 w-6 mx-auto mb-1" />
                          <p className="text-xs">{t('newImage')}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Show upload button for new products
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                        data-testid="input-product-image"
                      />
                      <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-primary hover:bg-primary/5 transition-colors">
                        <Upload className="h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-xs text-gray-500 text-center">
                          {currentItem.name ? t('uploadImage') : t('selectProductFirst')}
                        </p>
                      </div>
                    </label>
                  )}
                </div>
              </div>

              {/* Clear selection button if product is selected */}
              {(selectedProduct || productImagePreview) && (
                <div className="flex justify-center">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={clearProductSelection}
                    className="text-xs"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    {t('clearSelection')}
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="itemName">{t('itemName')} *</Label>
                  <div className="relative" ref={productDropdownRef}>
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
                            <p className="text-sm text-muted-foreground mb-2">{t('noProductFound')}</p>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                navigate('/products/add');
                              }}
                              className="w-full"
                              data-testid="button-add-new-product"
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              {t('goToProductsPage')} "{currentItem.name}"
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku">{t('sku')}</Label>
                  <Input
                    id="sku"
                    value={currentItem.sku}
                    onChange={(e) => setCurrentItem({...currentItem, sku: e.target.value})}
                    placeholder={t('autoFilledOrEnterManually')}
                    data-testid="input-sku"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">{t('category')}</Label>
                  <div className="relative" ref={categoryDropdownRef}>
                    <div 
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                      data-testid="select-category"
                    >
                      <span className={currentItem.categoryId ? "text-foreground" : "text-muted-foreground"}>
                        {currentItem.categoryId 
                          ? categories.find(c => c.id === currentItem.categoryId)?.name || t('selectACategory')
                          : t('selectACategory')
                        }
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </div>
                    
                    {categoryDropdownOpen && (
                      <div className="absolute z-50 top-full mt-1 w-full rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
                        <div className="max-h-60 overflow-y-auto">
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
                <div className="space-y-2">
                  <Label htmlFor="barcode">{t('barcode')}</Label>
                  <Input
                    id="barcode"
                    value={currentItem.barcode}
                    onChange={(e) => setCurrentItem({...currentItem, barcode: e.target.value})}
                    placeholder={t('barcodeExample')}
                    data-testid="input-barcode"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">{t('quantity')} *</Label>
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
                  <Label htmlFor="unitPrice">{t('unitPrice')} ({purchaseCurrency}) *</Label>
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
                  <Label htmlFor="weight">{t('weight')} (kg)</Label>
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
                    data-testid="input-weight"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dimensions">{t('dimensions')}</Label>
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
                    placeholder="L×W×H"
                    data-testid="input-dimensions"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="itemNotes">{t('itemNotes')}</Label>
                <Input
                  id="itemNotes"
                  value={currentItem.notes}
                  onChange={(e) => setCurrentItem({...currentItem, notes: e.target.value})}
                  placeholder={t('optionalNotes')}
                  data-testid="input-item-notes"
                />
              </div>
              
              {/* AI Storage Location Suggestion */}
              <div className="space-y-2">
                <Label htmlFor="binLocation">{t('storageLocation')}</Label>
                <div className="flex gap-2">
                  <Input
                    id="binLocation"
                    value={currentItem.binLocation || ""}
                    onChange={(e) => setCurrentItem({...currentItem, binLocation: e.target.value})}
                    placeholder={t('storageLocationExample')}
                    data-testid="input-bin-location"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={suggestStorageLocation}
                    disabled={!currentItem.name || suggestingLocation}
                    variant="outline"
                    className="gap-2"
                    data-testid="button-suggest-location"
                  >
                    {suggestingLocation ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t('aiSuggesting')}...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4" />
                        {t('aiSuggest')}
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('aiStorageLocationDescription')}
                </p>
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
                <CardTitle>{t('orderItems')}</CardTitle>
                <CardDescription>{t('reviewManageItems')}</CardDescription>
              </CardHeader>
              <CardContent className="p-0 lg:p-6">
                {/* Mobile/Tablet View - Card Layout */}
                <div className="lg:hidden">
                  <div className="divide-y">
                    {items.map((item) => (
                      <div key={item.id} className="p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex gap-3">
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
                            {/* Name and Delete */}
                            <div className="flex items-start justify-between">
                              <Input
                                value={item.name}
                                onChange={(e) => {
                                  const updatedItems = items.map(i => 
                                    i.id === item.id ? {...i, name: e.target.value} : i
                                  );
                                  setItems(updatedItems);
                                }}
                                className="h-auto p-0 font-medium text-base border-0 bg-transparent hover:bg-muted focus:bg-background focus:border-input focus:px-2 focus:py-1"
                                placeholder="Item name"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 -mr-2 text-muted-foreground hover:text-destructive"
                                onClick={() => removeItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            {/* SKU and Category */}
                            <div className="flex items-center gap-2 text-sm">
                              {item.sku && (
                                <span className="text-muted-foreground">SKU: {item.sku}</span>
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
                            
                            {/* Quantity and Price Row */}
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
                                  className="h-7 w-16 text-sm text-center border bg-background [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  min="1"
                                />
                              </div>
                              
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
                                    className="h-7 w-20 text-sm text-right border bg-background [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    step="0.01"
                                    min="0"
                                  />
                                  <span className="text-xs text-muted-foreground">{purchaseCurrency}</span>
                                </div>
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
                            
                            {/* Notes and Dimensions */}
                            {(item.notes || item.dimensions) && (
                              <div className="text-xs text-muted-foreground space-y-0.5">
                                {item.notes && <div>{item.notes}</div>}
                                {item.dimensions && <div>{t('dimensions')}: {item.dimensions}</div>}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
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
                <div className="hidden lg:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[48px]">{t('image')}</TableHead>
                        <TableHead className="min-w-[200px]">{t('itemDetails')}</TableHead>
                        <TableHead className="w-[180px]">{t('category')}</TableHead>
                        <TableHead className="w-[80px] text-center">{t('qty')}</TableHead>
                        <TableHead className="w-[120px] text-right">{t('unitPrice')}</TableHead>
                        <TableHead className="w-[120px] text-right">{t('total')}</TableHead>
                        <TableHead className="w-[140px] text-right">{t('costWithShipping')}</TableHead>
                        <TableHead className="w-[48px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id} className="hover:bg-muted/50">
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
                                className="h-7 text-sm font-medium border-0 bg-transparent hover:bg-muted focus:bg-background focus:border-input px-2"
                                placeholder={t('itemName')}
                              />
                              {item.sku && (
                                <div className="text-xs text-muted-foreground px-2">SKU: {item.sku}</div>
                              )}
                              {item.notes && (
                                <div className="text-xs text-muted-foreground px-2">{item.notes}</div>
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
                              className="h-7 w-16 mx-auto text-sm text-center border-0 bg-transparent hover:bg-muted focus:bg-background focus:border-input [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              min="1"
                            />
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
                        <TableCell colSpan={3} className="font-bold">{t('totals')}</TableCell>
                        <TableCell className="text-center font-bold">{totalQuantity}</TableCell>
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
              
              {/* Payment Section */}
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
                  placeholder="L×W×H"
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
      </div>
    </div>
  );
}