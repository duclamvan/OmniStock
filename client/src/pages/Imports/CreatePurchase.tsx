import { useState, useEffect, useRef, useMemo } from "react";
import { nanoid } from "nanoid";
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


  // Create purchase mutation
  const createPurchaseMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/imports/purchases', data);
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
      const response = await apiRequest('PATCH', `/api/imports/purchases/${purchaseId}`, data);
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
          title: "File too large",
          description: "Please select an image smaller than 10MB",
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
      title: "Success",
      description: `Added ${variantItems.length} items`,
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
                        setSupplierDropdownOpen(true);
                      }}
                      onFocus={() => setSupplierDropdownOpen(true)}
                      placeholder="Type to search suppliers..."
                      data-testid="input-supplier"
                    />
                    {supplierDropdownOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-80 overflow-auto">
                        {/* Show frequent suppliers when no search term */}
                        {!supplier && enhancedFrequentSuppliers.length > 0 && (
                          <>
                            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0">
                              Frequent Suppliers
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
                                  <span className="text-xs font-medium text-primary">{s.count} orders</span>
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
                                <p className="text-sm text-muted-foreground mb-2">No supplier found</p>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    navigate('/suppliers');
                                  }}
                                  className="w-full"
                                >
                                  <UserPlus className="mr-2 h-4 w-4" />
                                  Go to Suppliers page to add "{supplier}"
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
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="shipping-currency">Shipping Currency</Label>
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
                    <Label htmlFor="shipping">Shipping Cost</Label>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="consolidation">Consolidation?</Label>
                  <Select 
                    value={consolidation} 
                    onValueChange={setConsolidation}
                  >
                    <SelectTrigger id="consolidation" data-testid="select-consolidation">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                  {purchaseCurrency === "EUR" && (
                    <p className="text-xs text-muted-foreground">Auto-selected to "No" for EUR purchases (editable)</p>
                  )}
                </div>
                <div></div>
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
                          <p className="text-xs">Existing Product</p>
                        </div>
                      </div>
                    </div>
                  ) : productImagePreview ? (
                    // Show uploaded image preview
                    <div className="relative">
                      <img
                        src={productImagePreview}
                        alt="Product preview"
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
                          <p className="text-xs">New Image</p>
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
                          {currentItem.name ? "Upload Image" : "Select product first"}
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
                    Clear Selection
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="itemName">Item Name *</Label>
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
                                navigate('/products/add');
                              }}
                              className="w-full"
                              data-testid="button-add-new-product"
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Go to Products page to add "{currentItem.name}"
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
                  <div className="relative" ref={categoryDropdownRef}>
                    <div 
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                      data-testid="select-category"
                    >
                      <span className={currentItem.categoryId ? "text-foreground" : "text-muted-foreground"}>
                        {currentItem.categoryId 
                          ? categories.find(c => c.id === currentItem.categoryId)?.name || "Select a category"
                          : "Select a category"
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
                            Add new category
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
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
                  <Label htmlFor="unitPrice">Unit Price ({purchaseCurrency}) *</Label>
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
                  <Label htmlFor="dimensions">Dimensions</Label>
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
                                  <SelectValue placeholder="Category" />
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
                            
                            {/* Quantity and Price Row */}
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1">
                                <span className="text-sm text-muted-foreground">Qty:</span>
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
                                <span className="text-sm text-muted-foreground">Price:</span>
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
                                {item.dimensions && <div>Dimensions: {item.dimensions}</div>}
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
                          <span>Total Items:</span>
                          <span className="font-medium">{totalQuantity}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Subtotal:</span>
                          <span className="font-medium">{subtotal.toFixed(2)} {purchaseCurrency}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Shipping:</span>
                          <span className="font-medium">{shippingCost.toFixed(2)} {purchaseCurrency}</span>
                        </div>
                        <Separator className="my-2" />
                        <div className="flex justify-between">
                          <span className="font-semibold">Total with Shipping:</span>
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
                        <TableHead className="w-[48px]">Image</TableHead>
                        <TableHead className="min-w-[200px]">Item Details</TableHead>
                        <TableHead className="w-[180px]">Category</TableHead>
                        <TableHead className="w-[80px] text-center">Qty</TableHead>
                        <TableHead className="w-[120px] text-right">Unit Price</TableHead>
                        <TableHead className="w-[120px] text-right">Total</TableHead>
                        <TableHead className="w-[140px] text-right">Cost w/ Shipping</TableHead>
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
                                placeholder="Item name"
                              />
                              {item.sku && (
                                <div className="text-xs text-muted-foreground px-2">SKU: {item.sku}</div>
                              )}
                              {item.notes && (
                                <div className="text-xs text-muted-foreground px-2">{item.notes}</div>
                              )}
                              {item.dimensions && (
                                <div className="text-xs text-muted-foreground px-2">Dimensions: {item.dimensions}</div>
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
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={3} className="font-bold">Totals</TableCell>
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
          {/* Status Selection */}
          <Card className="shadow-md border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Order Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => setStatus("pending")}
                  className={cn(
                    "w-full p-3 rounded-lg border-2 transition-all text-left",
                    status === "pending" 
                      ? "bg-amber-50 dark:bg-amber-950/30 border-amber-400 dark:border-amber-600" 
                      : "bg-background border-border hover:border-amber-300"
                  )}
                  data-testid="status-pending"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Pending</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                      Awaiting
                    </span>
                  </div>
                </button>
                
                <button
                  onClick={() => setStatus("processing")}
                  className={cn(
                    "w-full p-3 rounded-lg border-2 transition-all text-left",
                    status === "processing" 
                      ? "bg-blue-50 dark:bg-blue-950/30 border-blue-400 dark:border-blue-600" 
                      : "bg-background border-border hover:border-blue-300"
                  )}
                  data-testid="status-processing"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Processing</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      Active
                    </span>
                  </div>
                </button>
                
                <button
                  onClick={() => setStatus("at_warehouse")}
                  className={cn(
                    "w-full p-3 rounded-lg border-2 transition-all text-left",
                    status === "at_warehouse" 
                      ? "bg-purple-50 dark:bg-purple-950/30 border-purple-400 dark:border-purple-600" 
                      : "bg-background border-border hover:border-purple-300"
                  )}
                  data-testid="status-at-warehouse"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Consolidation</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                      Staging
                    </span>
                  </div>
                </button>
                
                <button
                  onClick={() => setStatus("shipped")}
                  className={cn(
                    "w-full p-3 rounded-lg border-2 transition-all text-left",
                    status === "shipped" 
                      ? "bg-cyan-50 dark:bg-cyan-950/30 border-cyan-400 dark:border-cyan-600" 
                      : "bg-background border-border hover:border-cyan-300"
                  )}
                  data-testid="status-shipped"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Shipped</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200">
                      In Transit
                    </span>
                  </div>
                </button>
                
                <button
                  onClick={() => setStatus("delivered")}
                  className={cn(
                    "w-full p-3 rounded-lg border-2 transition-all text-left",
                    status === "delivered" 
                      ? "bg-green-50 dark:bg-green-950/30 border-green-400 dark:border-green-600" 
                      : "bg-background border-border hover:border-green-300"
                  )}
                  data-testid="status-delivered"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Delivered</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      Complete
                    </span>
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>

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