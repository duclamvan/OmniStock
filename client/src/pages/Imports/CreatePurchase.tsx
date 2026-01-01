import { useState, useEffect, useRef, useMemo, Fragment } from "react";
import { nanoid } from "nanoid";
import { useLocation, useParams } from "wouter";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { fuzzySearch } from "@/lib/fuzzySearch";
import { generateVariantSku } from "@/lib/vietnameseSearch";
import { formatCurrency } from "@/lib/currencyUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DecimalInput } from "@/components/ui/decimal-input";
import { handleDecimalKeyDown, parseDecimal } from "@/lib/utils";
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
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { 
  Plus, Package, Trash2, Calculator, DollarSign, 
  Truck, Calendar, FileText, Save, ArrowLeft,
  Check, UserPlus, User, Clock, Search, MoreVertical, Edit, X, RotateCcw,
  Copy, PackagePlus, ListPlus, Loader2, ChevronDown, ChevronUp, ChevronRight, Upload, ImageIcon, Settings, Scale,
  Barcode, MapPin, ClipboardPaste, PlusCircle, Pencil, Zap, ClipboardList, Building2
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// Convert weight from any unit to kg for storage
const convertWeightToKg = (weight: number, unit: 'mg' | 'g' | 'kg' | 'oz' | 'lb'): number => {
  switch (unit) {
    case 'mg': return weight / 1000000;
    case 'g': return weight / 1000;
    case 'kg': return weight;
    case 'oz': return weight * 0.0283495;
    case 'lb': return weight * 0.453592;
    default: return weight;
  }
};

// Variant allocation for products with variants
interface VariantAllocation {
  variantId: string;
  variantName: string;
  quantity: number;
  unitPrice: number;
  unitPriceCurrency?: string; // Currency of the unitPrice, defaults to parent's paymentCurrency
  sku?: string;
  barcode?: string; // Barcode for variant
}

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
  weightUnit?: 'mg' | 'g' | 'kg' | 'oz' | 'lb';
  length?: number;
  width?: number;
  height?: number;
  dimensionUnit?: 'mm' | 'cm' | 'in';
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
  hasVariants?: boolean;
  variantAllocations?: VariantAllocation[];
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
  const purchaseId = params.id || null;
  const isEditMode = !!purchaseId;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const supplierDropdownRef = useRef<HTMLDivElement>(null);
  
  // Theme accent colors based on mode (Add = blue, Edit = amber)
  const accentColors = {
    headerBg: isEditMode ? 'bg-amber-600 dark:bg-amber-700' : 'bg-slate-700 dark:bg-slate-800',
    primaryBtn: isEditMode ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white',
    secondaryBtn: isEditMode ? 'bg-amber-100 hover:bg-amber-200 text-amber-700 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 dark:text-amber-300' : 'bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-300',
    border: isEditMode ? 'border-amber-200 dark:border-amber-800' : 'border-slate-200 dark:border-slate-700',
    borderAccent: isEditMode ? 'border-amber-400 dark:border-amber-600' : 'border-blue-400 dark:border-blue-600',
    focusRing: isEditMode ? 'focus:border-amber-400 focus:ring-amber-300' : 'focus:border-blue-400 focus:ring-blue-300',
    selectedBg: isEditMode ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-blue-50 dark:bg-blue-900/20',
    textAccent: isEditMode ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400',
  };
  const productDropdownRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Form state
  const [purchaseCurrency, setPurchaseCurrency] = useState("USD");
  const [paymentCurrency, setPaymentCurrency] = useState("USD");
  const [paymentCurrencyManuallySet, setPaymentCurrencyManuallySet] = useState(false);
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalPaidManuallySet, setTotalPaidManuallySet] = useState(false);
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
  
  // Country flag helper - case-insensitive with multiple language support
  const getCountryFlag = (country?: string) => {
    if (!country) return "🌐";
    
    const normalizedCountry = country.toLowerCase().trim();
    
    const flags: {[key: string]: string} = {
      "china": "🇨🇳",
      "trung quốc": "🇨🇳",
      "中国": "🇨🇳",
      "cn": "🇨🇳",
      "hong kong": "🇭🇰",
      "hồng kông": "🇭🇰",
      "hk": "🇭🇰",
      "vietnam": "🇻🇳",
      "việt nam": "🇻🇳",
      "vn": "🇻🇳",
      "usa": "🇺🇸",
      "united states": "🇺🇸",
      "mỹ": "🇺🇸",
      "us": "🇺🇸",
      "america": "🇺🇸",
      "germany": "🇩🇪",
      "đức": "🇩🇪",
      "deutschland": "🇩🇪",
      "de": "🇩🇪",
      "czech republic": "🇨🇿",
      "czechia": "🇨🇿",
      "séc": "🇨🇿",
      "cz": "🇨🇿",
      "japan": "🇯🇵",
      "nhật bản": "🇯🇵",
      "jp": "🇯🇵",
      "south korea": "🇰🇷",
      "korea": "🇰🇷",
      "hàn quốc": "🇰🇷",
      "kr": "🇰🇷",
      "taiwan": "🇹🇼",
      "đài loan": "🇹🇼",
      "tw": "🇹🇼",
      "singapore": "🇸🇬",
      "sg": "🇸🇬",
      "thailand": "🇹🇭",
      "thái lan": "🇹🇭",
      "th": "🇹🇭",
      "malaysia": "🇲🇾",
      "mã lai": "🇲🇾",
      "my": "🇲🇾",
      "indonesia": "🇮🇩",
      "id": "🇮🇩",
      "philippines": "🇵🇭",
      "ph": "🇵🇭",
      "india": "🇮🇳",
      "ấn độ": "🇮🇳",
      "in": "🇮🇳",
      "united kingdom": "🇬🇧",
      "uk": "🇬🇧",
      "england": "🇬🇧",
      "anh": "🇬🇧",
      "gb": "🇬🇧",
      "france": "🇫🇷",
      "pháp": "🇫🇷",
      "fr": "🇫🇷",
      "italy": "🇮🇹",
      "ý": "🇮🇹",
      "it": "🇮🇹",
      "spain": "🇪🇸",
      "tây ban nha": "🇪🇸",
      "es": "🇪🇸",
      "netherlands": "🇳🇱",
      "hà lan": "🇳🇱",
      "nl": "🇳🇱",
      "belgium": "🇧🇪",
      "bỉ": "🇧🇪",
      "be": "🇧🇪",
      "poland": "🇵🇱",
      "ba lan": "🇵🇱",
      "pl": "🇵🇱",
      "turkey": "🇹🇷",
      "thổ nhĩ kỳ": "🇹🇷",
      "tr": "🇹🇷",
      "australia": "🇦🇺",
      "úc": "🇦🇺",
      "au": "🇦🇺",
      "canada": "🇨🇦",
      "ca": "🇨🇦",
      "mexico": "🇲🇽",
      "mx": "🇲🇽",
      "brazil": "🇧🇷",
      "brasil": "🇧🇷",
      "br": "🇧🇷",
      "russia": "🇷🇺",
      "nga": "🇷🇺",
      "ru": "🇷🇺",
      "sweden": "🇸🇪",
      "thụy điển": "🇸🇪",
      "se": "🇸🇪",
      "norway": "🇳🇴",
      "na uy": "🇳🇴",
      "no": "🇳🇴",
      "denmark": "🇩🇰",
      "đan mạch": "🇩🇰",
      "dk": "🇩🇰",
      "switzerland": "🇨🇭",
      "thụy sĩ": "🇨🇭",
      "ch": "🇨🇭",
      "austria": "🇦🇹",
      "áo": "🇦🇹",
      "at": "🇦🇹",
      "portugal": "🇵🇹",
      "bồ đào nha": "🇵🇹",
      "pt": "🇵🇹",
      "greece": "🇬🇷",
      "hy lạp": "🇬🇷",
      "gr": "🇬🇷",
      "ireland": "🇮🇪",
      "ai-len": "🇮🇪",
      "ie": "🇮🇪",
      "new zealand": "🇳🇿",
      "nz": "🇳🇿",
      "uae": "🇦🇪",
      "united arab emirates": "🇦🇪",
      "ae": "🇦🇪",
      "saudi arabia": "🇸🇦",
      "ả rập xê út": "🇸🇦",
      "sa": "🇸🇦"
    };
    
    return flags[normalizedCountry] || "🌐";
  };
  
  
  // Product search state
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [productImagePreview, setProductImagePreview] = useState<string | null>(null);
  
  // Item image editing state
  const [editingItemImageId, setEditingItemImageId] = useState<string | null>(null);
  const itemImageInputRef = useRef<HTMLInputElement>(null);
  
  // Handle item image change
  const handleItemImageChange = (e: React.ChangeEvent<HTMLInputElement>, itemId: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const updatedItems = items.map(i => 
          i.id === itemId ? {...i, imageUrl: reader.result as string} : i
        );
        setItems(updatedItems);
      };
      reader.readAsDataURL(file);
    }
    setEditingItemImageId(null);
    // Reset the input so the same file can be selected again
    e.target.value = '';
  };
  
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
    weightUnit: 'kg',
    length: 0,
    width: 0,
    height: 0,
    dimensionUnit: 'cm',
    dimensions: "",
    notes: "",
    binLocation: "TBA",
    unitType: 'selling',
    cartons: undefined
  });
  
  // Variants state
  const [showVariants, setShowVariants] = useState(false);
  const [variantsSectionExpanded, setVariantsSectionExpanded] = useState(true);
  const [variants, setVariants] = useState<Array<{
    id: string;
    name: string;
    sku: string;
    barcode: string;
    quantity: number;
    unitPrice: number;
    weight?: number;
    weightUnit?: string;
    dimensions?: string;
    dimensionsUnit?: string;
    imageUrl?: string;
  }>>([]);
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [seriesDialogOpen, setSeriesDialogOpen] = useState(false);
  const [newVariant, setNewVariant] = useState({
    name: "",
    sku: "",
    quantity: 1,
    unitPrice: 0,
    weight: undefined as number | undefined,
    weightUnit: undefined as string | undefined,
    dimensions: undefined as string | undefined,
    dimensionsUnit: undefined as string | undefined,
    imageUrl: undefined as string | undefined
  });
  const [seriesInput, setSeriesInput] = useState("");
  const [seriesQuantity, setSeriesQuantity] = useState(1);
  const [seriesUnitPrice, setSeriesUnitPrice] = useState(0);
  const [selectedVariants, setSelectedVariants] = useState<string[]>([]);
  
  // Quick Selection dialog state (select all variants and fill quantity)
  const [quickSelectDialogOpen, setQuickSelectDialogOpen] = useState(false);
  const [quickSelectQuantity, setQuickSelectQuantity] = useState(1);
  const [quickSelectUnitPrice, setQuickSelectUnitPrice] = useState(0);
  const [quickSelectPattern, setQuickSelectPattern] = useState(""); // e.g. "4,5,6,7,33,67" or "20-60"
  
  // Existing product variants state (for selecting from parent product)
  const [existingVariants, setExistingVariants] = useState<Array<{
    id: string;
    name: string;
    sku?: string;
    barcode?: string;
    quantity?: number;
    locationCode?: string;
    importCostUsd?: string;
    importCostCzk?: string;
    importCostEur?: string;
  }>>([]);
  const [existingVariantsDialogOpen, setExistingVariantsDialogOpen] = useState(false);
  const [selectedExistingVariants, setSelectedExistingVariants] = useState<string[]>([]);
  const [existingVariantQuantities, setExistingVariantQuantities] = useState<{[id: string]: number}>({});
  const [loadingExistingVariants, setLoadingExistingVariants] = useState(false);
  
  // Variant-aware import: store variant allocations on current item
  const [currentItemVariantAllocations, setCurrentItemVariantAllocations] = useState<VariantAllocation[]>([]);
  const [showVariantAllocations, setShowVariantAllocations] = useState(false);
  
  // Barcode paste dialog state
  const [barcodePasteDialogOpen, setBarcodePasteDialogOpen] = useState(false);
  const [barcodePasteText, setBarcodePasteText] = useState("");
  
  // Quick fill dialog state for variants
  const [quickFillDialogOpen, setQuickFillDialogOpen] = useState(false);
  const [quickFillField, setQuickFillField] = useState<'quantity' | 'unitPrice'>('quantity');
  const [quickFillListText, setQuickFillListText] = useState("");
  
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
  
  // Invoice parsing state
  const [parsingInvoice, setParsingInvoice] = useState(false);
  const invoiceInputRef = useRef<HTMLInputElement>(null);
  
  // Bulk selection state
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  
  // Mobile card expand state
  const [expandedCards, setExpandedCards] = useState<string[]>([]);
  
  // Quick add supplier state
  const [showQuickAddSupplier, setShowQuickAddSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierCountry, setNewSupplierCountry] = useState("");
  const [newSupplierWebsite, setNewSupplierWebsite] = useState("");
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  
  // Common countries for quick selection (ordered by usage frequency)
  const COMMON_COUNTRIES = [
    { name: "China", flag: "🇨🇳" },
    { name: "Vietnam", flag: "🇻🇳" },
    { name: "USA", flag: "🇺🇸" },
    { name: "Germany", flag: "🇩🇪" },
    { name: "Czech Republic", flag: "🇨🇿" },
    { name: "Hong Kong", flag: "🇭🇰" },
    { name: "Taiwan", flag: "🇹🇼" },
    { name: "Thailand", flag: "🇹🇭" },
    { name: "India", flag: "🇮🇳" },
    { name: "United Kingdom", flag: "🇬🇧" },
    { name: "France", flag: "🇫🇷" },
    { name: "Italy", flag: "🇮🇹" },
    { name: "Poland", flag: "🇵🇱" },
    { name: "Netherlands", flag: "🇳🇱" },
    { name: "Japan", flag: "🇯🇵" },
    { name: "South Korea", flag: "🇰🇷" },
    { name: "Singapore", flag: "🇸🇬" },
    { name: "Malaysia", flag: "🇲🇾" },
    { name: "Indonesia", flag: "🇮🇩" },
  ];

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
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setCountryDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Filter countries based on search with fuzzy matching
  const filteredCountries = useMemo(() => {
    if (!newSupplierCountry.trim()) {
      return COMMON_COUNTRIES;
    }
    const searchTerm = newSupplierCountry.toLowerCase().trim();
    return COMMON_COUNTRIES.filter(c => 
      c.name.toLowerCase().includes(searchTerm) ||
      c.name.toLowerCase().startsWith(searchTerm)
    ).sort((a, b) => {
      // Prioritize exact prefix matches
      const aStartsWith = a.name.toLowerCase().startsWith(searchTerm);
      const bStartsWith = b.name.toLowerCase().startsWith(searchTerm);
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      return 0;
    });
  }, [newSupplierCountry]);

  // Fetch suppliers
  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ['/api/suppliers']
  });

  // Fetch products
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products']
  });

  // Handle returning from product creation with newProductId
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const newProductId = urlParams.get('newProductId');
    
    if (newProductId && products.length > 0) {
      const newProduct = products.find((p: Product) => p.id === newProductId);
      if (newProduct) {
        // Auto-select the newly created product
        setSelectedProduct(newProduct);
        setCurrentItem(prev => ({
          ...prev,
          name: newProduct.name,
          sku: newProduct.sku || "",
          barcode: newProduct.barcode || "",
          weight: newProduct.weight || 0,
          dimensions: newProduct.dimensions || "",
          categoryId: newProduct.categoryId,
          category: newProduct.category || "",
          binLocation: newProduct.warehouseLocation || "TBA",
          sellingUnitName: newProduct.sellingUnitName,
          bulkUnitName: newProduct.bulkUnitName,
          bulkUnitQty: newProduct.bulkUnitQty
        }));
        
        // Clean up URL to remove the newProductId param
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
        
        toast({ title: t('success'), description: t('productSelectedAutomatically') });
      }
    }
  }, [products, t, toast]);

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
  const totalWeight = items.reduce((sum, item) => sum + (convertWeightToKg(item.weight, item.weightUnit || 'kg') * item.quantity), 0);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  
  // Currency symbol
  const currencySymbol = getCurrencySymbol(purchaseCurrency);
  
  // Convert to USD (base currency for all conversions)
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
  
  // Convert between any two currencies via USD
  const convertCurrency = (amount: number, fromCurrency: string, toCurrency: string) => {
    if (fromCurrency === toCurrency) return amount;
    const amountInUSD = convertToUSD(amount, fromCurrency);
    return convertFromUSD(amountInUSD, toCurrency);
  };
  
  // USD equivalents (all values normalized to USD for comparison)
  const subtotalUSD = convertToUSD(subtotal, purchaseCurrency);
  const shippingCostUSD = convertToUSD(shippingCost, shippingCurrency); // Fixed: use shippingCurrency
  const grandTotalUSD = subtotalUSD + shippingCostUSD;
  
  // Convert shipping to purchase currency for combined display
  const shippingInPurchaseCurrency = convertCurrency(shippingCost, shippingCurrency, purchaseCurrency);
  const grandTotalInPurchaseCurrency = subtotal + shippingInPurchaseCurrency;
  
  // Shipping per item in purchase currency
  const shippingPerItem = totalQuantity > 0 ? shippingInPurchaseCurrency / totalQuantity : 0;
  
  // Display currency conversions - convert everything to display currency
  const displaySubtotal = convertFromUSD(subtotalUSD, displayCurrency);
  const displayShippingCost = convertFromUSD(shippingCostUSD, displayCurrency);
  const displayGrandTotal = convertFromUSD(grandTotalUSD, displayCurrency);
  const displayCurrencySymbol = getCurrencySymbol(displayCurrency);
  
  // Payment currency conversions - for remaining balance calculation
  const grandTotalInPaymentCurrency = convertFromUSD(grandTotalUSD, paymentCurrency);
  const remainingBalance = Math.max(0, grandTotalInPaymentCurrency - totalPaid);

  // Auto-update totalPaid when grand total changes (unless manually set)
  useEffect(() => {
    if (!totalPaidManuallySet && grandTotalInPaymentCurrency > 0) {
      setTotalPaid(parseFloat(grandTotalInPaymentCurrency.toFixed(2)));
    }
  }, [grandTotalInPaymentCurrency, totalPaidManuallySet]);

  // Recalculate costWithShipping when currencies or shipping cost changes
  useEffect(() => {
    if (items.length > 0) {
      const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
      const shippingInPurchase = convertCurrency(shippingCost, shippingCurrency, purchaseCurrency);
      const perUnitShipping = totalQty > 0 ? shippingInPurchase / totalQty : 0;
      
      const itemsWithShipping = items.map(item => ({
        ...item,
        costWithShipping: item.unitPrice + perUnitShipping
      }));
      
      // Only update if values actually changed to prevent infinite loop
      const hasChanged = items.some((item, idx) => 
        Math.abs(item.costWithShipping - itemsWithShipping[idx].costWithShipping) > 0.0001
      );
      
      if (hasChanged) {
        setItems(itemsWithShipping);
      }
    }
  }, [shippingCost, shippingCurrency, purchaseCurrency, exchangeRates]);

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
      queryClient.invalidateQueries({ queryKey: ['/api/imports/purchases', purchaseId] });
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
  const { data: existingPurchase, isLoading: loadingPurchase } = useQuery<{
    id: string;
    supplier: string;
    supplierId?: string;
    location: string;
    trackingNumber?: string;
    estimatedArrival?: string;
    notes?: string;
    shippingCost?: string;
    shippingCurrency?: string;
    consolidation?: string;
    totalCost?: string;
    paymentCurrency?: string;
    totalPaid?: string;
    purchaseCurrency?: string;
    purchaseTotal?: string;
    exchangeRate?: string;
    status: string;
    createdAt: string;
    items: Array<{
      id: string;
      name: string;
      sku?: string;
      quantity: number;
      unitPrice?: string;
      totalPrice?: string;
      weight?: string;
      dimensions?: any;
      imageUrl?: string;
      notes?: string;
      warehouseLocation?: string;
      unitType?: string;
      unitName?: string;
      quantityInSellingUnits?: number;
      processingTimeDays?: number;
      productId?: string;
      variantAllocations?: Array<{
        variantId?: string;
        variantName: string;
        quantity: number;
        unitPrice: number;
      }>;
    }>;
  }>({
    queryKey: ['/api/imports/purchases', purchaseId],
    enabled: isEditMode && !!purchaseId
  });

  // Hydrate form state when existing purchase data is loaded
  useEffect(() => {
    if (existingPurchase && isEditMode) {
      // Set purchase-level fields
      setSupplier(existingPurchase.supplier || '');
      // Set or clear supplierId to avoid stale associations
      setSupplierId(existingPurchase.supplierId || null);
      
      setPurchaseCurrency(existingPurchase.purchaseCurrency || 'USD');
      setPaymentCurrency(existingPurchase.paymentCurrency || 'USD');
      setDisplayCurrency(existingPurchase.purchaseCurrency || 'USD');
      setShippingCurrency(existingPurchase.shippingCurrency || 'USD');
      setTotalPaid(parseFloat(existingPurchase.totalPaid || '0'));
      setShippingCost(parseFloat(existingPurchase.shippingCost || '0'));
      setTrackingNumber(existingPurchase.trackingNumber || '');
      setNotes(existingPurchase.notes || '');
      setStatus(existingPurchase.status || 'pending');
      setConsolidation(existingPurchase.consolidation || 'No');
      
      // If payment currency differs from purchase currency, mark it as manually set
      if (existingPurchase.paymentCurrency && existingPurchase.purchaseCurrency && 
          existingPurchase.paymentCurrency !== existingPurchase.purchaseCurrency) {
        setPaymentCurrencyManuallySet(true);
      }
      
      // Set purchase date from createdAt - use slice(0,16) for datetime-local format
      if (existingPurchase.createdAt) {
        const date = new Date(existingPurchase.createdAt);
        setPurchaseDate(date.toISOString().slice(0, 16));
      }
      
      // Calculate processing time from estimatedArrival if available
      if (existingPurchase.estimatedArrival && existingPurchase.createdAt) {
        const created = new Date(existingPurchase.createdAt);
        const estimated = new Date(existingPurchase.estimatedArrival);
        const daysDiff = Math.round((estimated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff > 0) {
          if (daysDiff >= 30 && daysDiff % 30 === 0) {
            setProcessingTime(String(daysDiff / 30));
            setProcessingUnit('months');
          } else if (daysDiff >= 7 && daysDiff % 7 === 0) {
            setProcessingTime(String(daysDiff / 7));
            setProcessingUnit('weeks');
          } else {
            setProcessingTime(String(daysDiff));
            setProcessingUnit('days');
          }
        }
      }
      
      // Map items to the component's PurchaseItem format
      if (existingPurchase.items && existingPurchase.items.length > 0) {
        const mappedItems: PurchaseItem[] = existingPurchase.items.map((item) => {
          const unitPrice = parseFloat(item.unitPrice || '0');
          const quantity = item.quantity || 1;
          const totalPrice = parseFloat(item.totalPrice || '0') || unitPrice * quantity;
          
          // Parse dimensions if it's a JSON object
          let dimensionsStr = '';
          if (item.dimensions) {
            if (typeof item.dimensions === 'object') {
              const d = item.dimensions as { length?: number; width?: number; height?: number };
              if (d.length && d.width && d.height) {
                dimensionsStr = `${d.length}×${d.width}×${d.height}`;
              }
            } else if (typeof item.dimensions === 'string') {
              dimensionsStr = item.dimensions;
            }
          }
          
          // Parse variantAllocations - handle both object and string formats
          let variantAllocations: VariantAllocation[] | undefined;
          if (item.variantAllocations) {
            try {
              variantAllocations = typeof item.variantAllocations === 'string' 
                ? JSON.parse(item.variantAllocations as unknown as string)
                : item.variantAllocations;
            } catch (e) {
              console.warn('Failed to parse variantAllocations:', e);
            }
          }
          
          const hasVariants = variantAllocations && variantAllocations.length > 0;
          
          const itemExt = item as any;
          return {
            id: item.id,
            name: item.name,
            sku: item.sku || '',
            category: itemExt.category || '',
            categoryId: itemExt.categoryId,
            barcode: itemExt.barcode || '',
            quantity: quantity,
            unitPrice: unitPrice,
            weight: parseFloat(item.weight || '0'),
            dimensions: dimensionsStr,
            notes: item.notes || '',
            totalPrice: totalPrice,
            costWithShipping: totalPrice,
            imageUrl: item.imageUrl,
            binLocation: item.warehouseLocation || 'TBA',
            unitType: (item.unitType as 'selling' | 'bulk') || 'selling',
            quantityInSellingUnits: item.quantityInSellingUnits,
            processingTimeDays: item.processingTimeDays,
            productId: item.productId?.toString(),
            hasVariants: hasVariants,
            variantAllocations: variantAllocations
          };
        });
        setItems(mappedItems);
      }
    }
  }, [existingPurchase, isEditMode]);


  const selectProduct = async (product: Product) => {
    setCurrentItem({
      ...currentItem,
      name: product.name,
      sku: product.sku || "",
      unitPrice: product.price || currentItem.unitPrice || 0,
      weight: product.weight || currentItem.weight || 0,
      weightUnit: (product as any).weightUnit || currentItem.weightUnit || 'kg',
      length: parseFloat((product as any).length) || currentItem.length || 0,
      width: parseFloat((product as any).width) || currentItem.width || 0,
      height: parseFloat((product as any).height) || currentItem.height || 0,
      dimensionUnit: (product as any).dimensionUnit || currentItem.dimensionUnit || 'cm',
      dimensions: product.dimensions || currentItem.dimensions || "",
      barcode: product.barcode || "",
      categoryId: product.categoryId,
      category: (product as any).categoryName || product.category || "",
      unitType: 'selling',
      binLocation: product.warehouseLocation || currentItem.binLocation || "TBA"
    });
    setSelectedProduct(product);
    setProductImageFile(null);
    setProductImagePreview(null);
    setProductDropdownOpen(false);
    
    // Fetch existing variants for this product
    setLoadingExistingVariants(true);
    try {
      const response = await fetch(`/api/products/${product.id}/variants`, {
        credentials: 'include'
      });
      if (response.ok) {
        const variantsData = await response.json();
        setExistingVariants(variantsData || []);
        
        // Auto-populate variants table if product has variants
        if (variantsData && variantsData.length > 0) {
          const parentSku = product.sku || '';
          const loadedVariants = variantsData.map((v: any) => ({
            id: nanoid(),
            name: v.name,
            sku: v.sku || (parentSku ? generateVariantSku(parentSku, v.name) : ''),
            barcode: v.barcode || '',
            quantity: 0, // User will fill in quantities
            unitPrice: (() => {
              // Get import cost in purchase currency
              if (purchaseCurrency === 'USD' && v.importCostUsd) return parseFloat(v.importCostUsd);
              if (purchaseCurrency === 'CZK' && v.importCostCzk) return parseFloat(v.importCostCzk);
              if (purchaseCurrency === 'EUR' && v.importCostEur) return parseFloat(v.importCostEur);
              if (v.importCostUsd) return parseFloat(v.importCostUsd);
              return product.price || 0;
            })(),
            weight: product.weight || 0,
            dimensions: product.dimensions || ''
          }));
          setVariants(loadedVariants);
          setShowVariants(true);
          setShowVariantAllocations(false);
        } else {
          setShowVariantAllocations(false);
        }
      } else {
        setExistingVariants([]);
        setShowVariantAllocations(false);
      }
    } catch (error) {
      console.error('Error fetching variants:', error);
      setExistingVariants([]);
      setShowVariantAllocations(false);
    } finally {
      setLoadingExistingVariants(false);
    }
  };
  
  // Add existing variants to the variants list
  const addExistingVariantsToList = () => {
    const selectedItems = existingVariants.filter(v => selectedExistingVariants.includes(v.id));
    const parentSku = currentItem.sku || selectedProduct?.sku || '';
    
    const newVariants = selectedItems.map(variant => ({
      id: nanoid(),
      name: variant.name,
      sku: variant.sku || (parentSku ? generateVariantSku(parentSku, variant.name) : ''),
      barcode: variant.barcode || '',
      quantity: existingVariantQuantities[variant.id] || 1,
      unitPrice: (() => {
        // Get import cost in purchase currency
        if (purchaseCurrency === 'USD' && variant.importCostUsd) return parseFloat(variant.importCostUsd);
        if (purchaseCurrency === 'CZK' && variant.importCostCzk) return parseFloat(variant.importCostCzk);
        if (purchaseCurrency === 'EUR' && variant.importCostEur) return parseFloat(variant.importCostEur);
        // Fallback to any available cost
        if (variant.importCostUsd) return parseFloat(variant.importCostUsd);
        return currentItem.unitPrice || 0;
      })(),
      weight: currentItem.weight || 0,
      dimensions: currentItem.dimensions || ''
    }));
    
    setVariants([...variants, ...newVariants]);
    setExistingVariantsDialogOpen(false);
    setSelectedExistingVariants([]);
    setExistingVariantQuantities({});
    setShowVariants(true);
    
    toast({
      title: t('success'),
      description: t('variantsAddedCount', { count: newVariants.length })
    });
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
      // Don't clear selectedProduct - allow custom image with existing product info
      
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
  
  // Handle invoice file upload and AI parsing
  const handleInvoiceUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setParsingInvoice(true);
    try {
      const formData = new FormData();
      formData.append('invoice', file);
      
      const response = await fetch('/api/imports/parse-invoice', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to parse invoice');
      }
      
      const data = result.data;
      
      // Autofill supplier if found
      if (data.supplierId) {
        setSupplierId(data.supplierId);
      }
      if (data.supplierName) {
        setSupplier(data.supplierName);
      }
      
      // Autofill currency if detected
      if (data.currency) {
        const normalizedCurrency = data.currency.toUpperCase();
        if (['USD', 'EUR', 'CZK', 'VND', 'CNY'].includes(normalizedCurrency)) {
          setPurchaseCurrency(normalizedCurrency);
        }
      }
      
      // Autofill notes if provided
      if (data.notes) {
        setNotes(data.notes);
      }
      
      // Autofill shipping cost
      if (data.shippingCost) {
        setShippingCost(data.shippingCost);
      }
      
      // Add items from invoice
      const parsedItems = data.items || [];
      if (parsedItems.length > 0) {
        const newItems: PurchaseItem[] = parsedItems.map((item: any) => ({
          id: crypto.randomUUID(),
          name: item.name || 'Unknown Item',
          sku: item.sku || '',
          category: '',
          categoryId: undefined,
          barcode: item.barcode || '',
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
          weight: item.weight || 0,
          weightUnit: item.weightUnit || 'kg',
          dimensions: item.dimensions || '',
          notes: item.notes || '',
          totalPrice: (item.quantity || 1) * (item.unitPrice || 0),
          costWithShipping: 0,
          productId: item.productId,
          binLocation: 'TBA'
        }));
        
        // Use functional updater to get the latest state and update shipping costs
        setItems(prevItems => {
          const updatedItems = [...prevItems, ...newItems];
          // Schedule shipping cost update after state update
          setTimeout(() => {
            updateItemsWithShipping(updatedItems);
          }, 50);
          return updatedItems;
        });
      }
      
      const itemCount = parsedItems.length;
      const confidencePercent = Math.round((data.confidence || 0) * 100);
      
      // Check if parsing returned a fallback message (vision not supported)
      if (itemCount === 0 && data.notes?.includes('not available')) {
        toast({
          title: t('invoiceParseUnavailable'),
          description: t('invoiceParseUnavailableDesc'),
          variant: 'destructive'
        });
      } else if (itemCount > 0) {
        toast({
          title: t('invoiceParsed'),
          description: t('invoiceParsedDesc', { count: itemCount, confidence: confidencePercent }),
        });
      } else {
        toast({
          title: t('invoiceParseEmpty'),
          description: t('invoiceParseEmptyDesc'),
        });
      }
      
    } catch (error: any) {
      console.error("Error parsing invoice:", error);
      toast({
        title: t('invoiceParseFailed'),
        description: error.message || t('invoiceParseFailedDesc'),
        variant: "destructive"
      });
    } finally {
      setParsingInvoice(false);
      // Reset file input
      if (invoiceInputRef.current) {
        invoiceInputRef.current.value = '';
      }
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
      
      // Load items with proper currency display and all fields
      if (purchase?.items && purchase.items.length > 0) {
        const loadedShippingCost = Number(purchase?.shippingCost) || 0;
        const totalQty = purchase.items.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 1), 0);
        const perItemShipping = totalQty > 0 ? loadedShippingCost / totalQty : 0;
        
        const loadedItems = purchase.items.map((item: any) => {
          const unitPrice = parseFloat(item.unitCost || item.unitPrice) || 0;
          const quantity = Number(item.quantity) || 1;
          // Calculate costWithShipping: unitPrice + (shipping portion per unit)
          const savedCostWithShipping = parseFloat(item.costWithShipping) || 0;
          const calculatedCostWithShipping = unitPrice + (perItemShipping / quantity);
          
          // Parse variantAllocations - handle both object and string formats
          let variantAllocations: VariantAllocation[] | undefined;
          if (item.variantAllocations) {
            try {
              variantAllocations = typeof item.variantAllocations === 'string' 
                ? JSON.parse(item.variantAllocations)
                : item.variantAllocations;
            } catch (e) {
              console.warn('Failed to parse variantAllocations:', e);
            }
          }
          const hasVariants = variantAllocations && variantAllocations.length > 0;
          
          return {
            id: String(item.id),
            name: String(item.productName || item.name || ""),
            sku: String(item.sku || ""),
            category: String(item.category || ""),
            categoryId: item.categoryId,
            barcode: String(item.barcode || ""),
            quantity,
            unitPrice,
            weight: parseFloat(item.weight) || 0,
            weightUnit: (item.weightUnit as 'mg' | 'g' | 'kg' | 'oz' | 'lb') || 'kg',
            dimensions: typeof item.dimensions === 'string' ? item.dimensions : (item.dimensions ? JSON.stringify(item.dimensions) : ""),
            notes: String(item.notes || ""),
            totalPrice: parseFloat(item.totalCost || item.totalPrice) || (quantity * unitPrice),
            costWithShipping: savedCostWithShipping > 0 ? savedCostWithShipping : calculatedCostWithShipping,
            isVariant: item.isVariant || false,
            variantName: item.variantName || "",
            productId: item.productId,
            imageUrl: item.imageUrl,
            binLocation: String(item.warehouseLocation || item.binLocation || "TBA"),
            processingTimeDays: item.processingTimeDays ? Number(item.processingTimeDays) : undefined,
            unitType: item.unitType || 'selling',
            quantityInSellingUnits: item.quantityInSellingUnits || quantity,
            cartons: item.cartons,
            sellingUnitName: item.sellingUnitName || 'piece',
            bulkUnitName: item.bulkUnitName || null,
            bulkUnitQty: item.bulkUnitQty || null,
            hasVariants: hasVariants,
            variantAllocations: variantAllocations
          };
        });
        setItems(loadedItems);
        
        // Fetch images from products for items without imageUrl (batch approach)
        const itemsNeedingImages = loadedItems.filter((item: PurchaseItem) => !item.imageUrl && item.sku);
        if (itemsNeedingImages.length > 0) {
          const uniqueSkus = Array.from(new Set(itemsNeedingImages.map((item: PurchaseItem) => item.sku))) as string[];
          // Batch fetch products for all unique SKUs (chunked to avoid overwhelming the server)
          const chunkSize = 5;
          const fetchProductImages = async () => {
            const productMap = new Map<string, string>();
            for (let i = 0; i < uniqueSkus.length; i += chunkSize) {
              const chunk = uniqueSkus.slice(i, i + chunkSize);
              const results = await Promise.all(chunk.map(async (sku: string) => {
                try {
                  const response = await fetch(`/api/products/search?q=${encodeURIComponent(sku)}`);
                  if (response.ok) {
                    const searchResults = await response.json();
                    return searchResults.find((p: any) => p.sku === sku);
                  }
                } catch (e) {
                  return null;
                }
                return null;
              }));
              results.filter(Boolean).forEach((product: any) => {
                if (product?.sku && product?.imageUrl) {
                  productMap.set(product.sku, product.imageUrl);
                }
              });
            }
            if (productMap.size > 0) {
              setItems(prevItems => prevItems.map(prevItem => {
                if (!prevItem.imageUrl && prevItem.sku && productMap.has(prevItem.sku)) {
                  return { ...prevItem, imageUrl: productMap.get(prevItem.sku) };
                }
                return prevItem;
              }));
            }
          };
          fetchProductImages();
        }
        
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
    // For products with variants, check that at least one variant has quantity > 0
    const hasVariantAllocations = showVariantAllocations && currentItemVariantAllocations.length > 0;
    const activeAllocations = hasVariantAllocations 
      ? currentItemVariantAllocations.filter(a => a.quantity > 0)
      : [];
    
    if (hasVariantAllocations && activeAllocations.length === 0) {
      toast({ 
        title: t('validationError'), 
        description: t('pleaseAllocateVariantQuantities') || 'Please allocate quantities to at least one variant', 
        variant: "destructive" 
      });
      return;
    }
    
    if (!currentItem.name || (!hasVariantAllocations && (!currentItem.quantity || currentItem.unitPrice === undefined))) {
      toast({ 
        title: t('validationError'), 
        description: t('pleaseFillItemFields'), 
        variant: "destructive" 
      });
      return;
    }

    // Calculate quantity - for variant products, sum of variant allocations
    let quantity = currentItem.quantity || 1;
    let unitPrice = currentItem.unitPrice || 0;
    
    if (hasVariantAllocations) {
      quantity = activeAllocations.reduce((sum, a) => sum + a.quantity, 0);
      // Calculate weighted average unit price
      const totalValue = activeAllocations.reduce((sum, a) => sum + (a.quantity * a.unitPrice), 0);
      unitPrice = quantity > 0 ? totalValue / quantity : 0;
    }
    
    // Calculate quantity in selling units based on unit type
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
      quantity: quantity,
      unitPrice: unitPrice,
      weight: currentItem.weight || 0,
      weightUnit: currentItem.weightUnit || 'kg',
      length: currentItem.length || 0,
      width: currentItem.width || 0,
      height: currentItem.height || 0,
      dimensionUnit: currentItem.dimensionUnit || 'cm',
      dimensions: currentItem.dimensions || "",
      notes: currentItem.notes || "",
      totalPrice: quantity * unitPrice,
      costWithShipping: 0,
      productId: selectedProduct?.id,
      imageUrl: productImagePreview || selectedProduct?.imageUrl,
      imageFile: productImageFile,
      binLocation: currentItem.binLocation || "TBA",
      unitType: unitType,
      quantityInSellingUnits: quantityInSellingUnits,
      cartons: currentItem.cartons,
      sellingUnitName: selectedProduct?.sellingUnitName || 'piece',
      bulkUnitName: selectedProduct?.bulkUnitName,
      bulkUnitQty: selectedProduct?.bulkUnitQty,
      hasVariants: hasVariantAllocations,
      variantAllocations: hasVariantAllocations ? activeAllocations : undefined
    };

    const updatedItems = [...items, newItem];
    updateItemsWithShipping(updatedItems);
    
    // Reset form and image states
    setSelectedProduct(null);
    setProductImageFile(null);
    setProductImagePreview(null);
    setCurrentItemVariantAllocations([]);
    setShowVariantAllocations(false);
    setCurrentItem({
      name: "",
      sku: "",
      category: "",
      categoryId: undefined,
      barcode: "",
      quantity: 1,
      unitPrice: 0,
      weight: 0,
      weightUnit: 'kg',
      length: 0,
      width: 0,
      height: 0,
      dimensionUnit: 'cm',
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
      const parentSku = currentItem.sku || selectedProduct?.sku || '';
      const variantWithId = {
        id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: newVariant.name.trim(),
        sku: newVariant.sku || (parentSku ? generateVariantSku(parentSku, newVariant.name.trim()) : ''),
        barcode: '',
        quantity: newVariant.quantity,
        unitPrice: newVariant.unitPrice,
        // Optional fields - inherit from parent if not set
        weight: newVariant.weight,
        weightUnit: newVariant.weightUnit,
        dimensions: newVariant.dimensions,
        dimensionsUnit: newVariant.dimensionsUnit,
        imageUrl: newVariant.imageUrl
      };
      setVariants([...variants, variantWithId]);
      // Reset form with undefined optional values (will inherit from parent)
      setNewVariant({
        name: "",
        sku: "",
        quantity: 1,
        unitPrice: currentItem.unitPrice || 0,
        weight: undefined,
        weightUnit: undefined,
        dimensions: undefined,
        dimensionsUnit: undefined,
        imageUrl: undefined
      });
      setVariantDialogOpen(false);
      toast({
        title: t('success'),
        description: t('variantAddedSuccess'),
      });
    }
  };
  
  // Parse quick selection pattern (comma-separated numbers and/or ranges like "4,5,6,7,33,67" or "20-60")
  const parseQuickSelectPattern = (pattern: string): number[] => {
    if (!pattern.trim()) return [];
    
    const numbers: number[] = [];
    const parts = pattern.split(',').map(p => p.trim()).filter(Boolean);
    
    for (const part of parts) {
      // Check if it's a range like "20-60"
      const rangeMatch = part.match(/^(\d+)\s*-\s*(\d+)$/);
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1]);
        const end = parseInt(rangeMatch[2]);
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
            if (!numbers.includes(i)) numbers.push(i);
          }
        }
      } else {
        // It's a single number
        const num = parseInt(part);
        if (!isNaN(num) && !numbers.includes(num)) {
          numbers.push(num);
        }
      }
    }
    
    return numbers.sort((a, b) => a - b);
  };
  
  // Extract number from variant name (e.g. "Size 42" => 42, "Variant 5" => 5)
  const extractVariantNumber = (name: string): number | null => {
    const matches = name.match(/\d+/g);
    if (matches && matches.length > 0) {
      // Use the last number found in the name (typically the size/variant number)
      return parseInt(matches[matches.length - 1]);
    }
    return null;
  };
  
  // Quick Selection - select variants by pattern and apply quantity/price
  const applyQuickSelection = () => {
    if (variants.length === 0) {
      toast({
        title: t('error'),
        description: t('noVariantsToSelect'),
        variant: "destructive",
      });
      return;
    }
    
    let targetVariants = variants;
    
    // If pattern is specified, filter variants by pattern
    if (quickSelectPattern.trim()) {
      const targetNumbers = parseQuickSelectPattern(quickSelectPattern);
      if (targetNumbers.length === 0) {
        toast({
          title: t('error'),
          description: t('invalidPattern'),
          variant: "destructive",
        });
        return;
      }
      
      targetVariants = variants.filter(v => {
        const variantNum = extractVariantNumber(v.name);
        return variantNum !== null && targetNumbers.includes(variantNum);
      });
      
      if (targetVariants.length === 0) {
        toast({
          title: t('error'),
          description: t('noVariantsMatchPattern'),
          variant: "destructive",
        });
        return;
      }
    }
    
    // Select the target variants
    setSelectedVariants(targetVariants.map(v => v.id));
    
    // Apply quantity and price to target variants
    const targetIds = new Set(targetVariants.map(v => v.id));
    const updatedVariants = variants.map(v => {
      if (targetIds.has(v.id)) {
        return {
          ...v,
          quantity: quickSelectQuantity,
          unitPrice: quickSelectUnitPrice
        };
      }
      return v;
    });
    setVariants(updatedVariants);
    
    // Reset and close dialog
    setQuickSelectDialogOpen(false);
    setQuickSelectPattern("");
    toast({
      title: t('success'),
      description: t('quickSelectionApplied', { count: targetVariants.length }),
    });
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
      
      const parentSku = currentItem.sku || selectedProduct?.sku || '';
      const newVariantsArray = [];
      for (let i = start; i <= end; i++) {
        const variantName = `${baseName} ${i}`;
        newVariantsArray.push({
          id: `temp-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
          name: variantName,
          sku: parentSku ? generateVariantSku(parentSku, variantName) : '',
          barcode: '',
          quantity: seriesQuantity,
          unitPrice: seriesUnitPrice,
          // Weight inherits from parent, no override in series
          weight: undefined,
          dimensions: undefined
        });
      }
      
      setVariants([...variants, ...newVariantsArray]);
      // Reset series fields
      setSeriesInput("");
      setSeriesQuantity(1);
      setSeriesUnitPrice(currentItem.unitPrice || 0);
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
  
  // Fill down value from current row to all rows below
  const fillDownVariantValue = (variantId: string, field: 'quantity' | 'unitPrice' | 'weight' | 'sku' | 'barcode') => {
    const variantIndex = variants.findIndex(v => v.id === variantId);
    if (variantIndex === -1 || variantIndex === variants.length - 1) return;
    
    const sourceValue = variants[variantIndex][field];
    const updatedVariants = variants.map((v, index) => {
      if (index > variantIndex) {
        return { ...v, [field]: sourceValue };
      }
      return v;
    });
    
    setVariants(updatedVariants);
    const filledCount = variants.length - variantIndex - 1;
    toast({
      title: t('success'),
      description: t('filledDownCount', { count: filledCount }),
    });
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
  
  // Apply barcodes from pasted list to variants
  const applyBarcodesToVariants = () => {
    const barcodes = barcodePasteText
      .split('\n')
      .map(b => b.trim())
      .filter(b => b.length > 0);
    
    if (barcodes.length === 0) {
      toast({
        title: t('error'),
        description: t('noBarcodesPasted'),
        variant: "destructive",
      });
      return;
    }
    
    const updatedVariants = variants.map((variant, index) => ({
      ...variant,
      barcode: barcodes[index] || variant.barcode
    }));
    
    setVariants(updatedVariants);
    setBarcodePasteDialogOpen(false);
    setBarcodePasteText("");
    
    const appliedCount = Math.min(barcodes.length, variants.length);
    toast({
      title: t('success'),
      description: t('barcodesApplied', { count: appliedCount }),
    });
  };
  
  // Quick fill selected variants with a preset value (field passed explicitly to avoid state confusion)
  const quickFillSelectedVariants = (value: number, field: 'quantity' | 'unitPrice') => {
    const targetVariants = selectedVariants.length > 0 ? selectedVariants : variants.map(v => v.id);
    const updatedVariants = variants.map(v => {
      if (targetVariants.includes(v.id)) {
        return { ...v, [field]: value };
      }
      return v;
    });
    setVariants(updatedVariants);
    const fieldLabel = field === 'quantity' ? t('quantity') : t('unitCost');
    toast({
      title: t('success'),
      description: t('quickFillApplied', { count: targetVariants.length, value }),
    });
  };
  
  // Apply list of values to selected variants
  const applyListToSelectedVariants = () => {
    const values = quickFillListText
      .split(/[,\n\t]/)
      .map(v => v.trim())
      .filter(v => v.length > 0)
      .map(v => parseFloat(v) || 0);
    
    if (values.length === 0) {
      toast({
        title: t('error'),
        description: t('noValuesProvided'),
        variant: "destructive",
      });
      return;
    }
    
    const targetVariants = selectedVariants.length > 0 ? selectedVariants : variants.map(v => v.id);
    let valueIndex = 0;
    const updatedVariants = variants.map(v => {
      if (targetVariants.includes(v.id) && valueIndex < values.length) {
        // For quantity, floor to integer; for cost, preserve decimals
        const newValue = quickFillField === 'quantity' 
          ? Math.max(0, Math.floor(values[valueIndex])) 
          : Math.max(0, values[valueIndex]);
        valueIndex++;
        return { ...v, [quickFillField]: newValue };
      }
      return v;
    });
    
    setVariants(updatedVariants);
    setQuickFillDialogOpen(false);
    setQuickFillListText("");
    
    toast({
      title: t('success'),
      description: t('listValuesApplied', { count: valueIndex }),
    });
  };
  
  // Add product with all variants as a single parent item
  const addVariantsAsItems = () => {
    if (!currentItem.name) {
      toast({
        title: t('error'),
        description: t('enterMainProductName'),
        variant: "destructive",
      });
      return;
    }
    
    // Calculate totals from variants
    const totalQuantity = variants.reduce((sum, v) => sum + v.quantity, 0);
    const totalValue = variants.reduce((sum, v) => sum + (v.quantity * v.unitPrice), 0);
    const avgUnitPrice = totalQuantity > 0 ? totalValue / totalQuantity : 0;
    
    // Create variant allocations for the parent item
    // Include unitPriceCurrency so receiving finalization knows which currency the price is in
    const variantAllocations: VariantAllocation[] = variants.map(variant => ({
      variantId: variant.id,
      variantName: variant.name,
      quantity: variant.quantity,
      unitPrice: variant.unitPrice,
      unitPriceCurrency: paymentCurrency, // Store the currency for each variant price
      sku: variant.sku || '',
      barcode: variant.barcode || '' // Include barcode for variant creation during receiving
    }));
    
    // Create a single parent item with nested variants
    const parentItem: PurchaseItem = {
      id: `item-${Date.now()}-${Math.random()}`,
      name: currentItem.name,
      sku: currentItem.sku || "",
      category: currentItem.category || "",
      categoryId: currentItem.categoryId,
      barcode: currentItem.barcode || "",
      quantity: totalQuantity,
      unitPrice: avgUnitPrice,
      weight: currentItem.weight ?? 0,
      weightUnit: currentItem.weightUnit || 'kg',
      length: currentItem.length ?? 0,
      width: currentItem.width ?? 0,
      height: currentItem.height ?? 0,
      dimensionUnit: currentItem.dimensionUnit || 'cm',
      dimensions: currentItem.dimensions ?? "",
      notes: currentItem.notes || "",
      binLocation: currentItem.binLocation || "",
      productId: selectedProduct?.id,
      imageUrl: productImagePreview || selectedProduct?.imageUrl,
      imageFile: productImageFile,
      totalPrice: totalValue,
      costWithShipping: 0,
      hasVariants: true,
      variantAllocations: variantAllocations
    };
    
    const updatedItems = [...items, parentItem];
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
      weightUnit: 'kg',
      length: 0,
      width: 0,
      height: 0,
      dimensionUnit: 'cm',
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
      description: t('productWithVariantsAdded', { name: currentItem.name, count: variants.length }),
    });
  };
  

  const updateItemsWithShipping = (updatedItems: PurchaseItem[]) => {
    const totalQty = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
    // Convert shipping to purchase currency before distributing
    const shippingInPurchase = convertCurrency(shippingCost, shippingCurrency, purchaseCurrency);
    const perUnitShipping = totalQty > 0 ? shippingInPurchase / totalQty : 0;
    
    const itemsWithShipping = updatedItems.map(item => ({
      ...item,
      // costWithShipping = unit price + shipping per unit (both in purchase currency)
      costWithShipping: item.unitPrice + perUnitShipping
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
    const purchaseTotal = grandTotalInPurchaseCurrency;
    const autoConvertedTotal = purchaseCurrency !== paymentCurrency 
      ? grandTotalInPurchaseCurrency * exchangeRate 
      : grandTotalInPurchaseCurrency;

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
      totalCost: grandTotalInPurchaseCurrency, // Keep for backward compatibility
      // Store converted prices
      prices: {
        original: {
          currency: purchaseCurrency,
          subtotal,
          shippingCost: shippingInPurchaseCurrency,
          total: grandTotalInPurchaseCurrency
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
        barcode: item.barcode || null, // Include barcode for item
        category: item.category || null,
        categoryId: item.categoryId || null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        unitPriceUSD: convertToUSD(item.unitPrice, purchaseCurrency),
        weight: item.weight, // Keep original weight value (unit is stored separately)
        weightUnit: item.weightUnit || 'kg',
        costWithShipping: item.costWithShipping || 0,
        length: item.length || null,
        width: item.width || null,
        height: item.height || null,
        dimensionUnit: item.dimensionUnit || 'cm',
        dimensions: item.dimensions || null,
        notes: item.notes || null,
        binLocation: item.binLocation || null,
        processingTimeDays: item.processingTimeDays,
        unitType: item.unitType || 'selling',
        quantityInSellingUnits: item.quantityInSellingUnits || item.quantity,
        imageUrl: item.imageUrl || null,
        productId: item.productId || null,
        hasVariants: item.hasVariants || false,
        variantAllocations: item.variantAllocations || null
      }))
    };

    if (isEditMode) {
      updatePurchaseMutation.mutate(purchaseData);
    } else {
      createPurchaseMutation.mutate(purchaseData);
    }
  };

  // Show loading state while fetching purchase data in edit mode
  if (isEditMode && loadingPurchase) {
    return (
      <div className="space-y-4 md:space-y-6 pb-20 md:pb-6 overflow-x-hidden">
        <div className="sticky top-0 z-10 bg-background border-b md:relative md:border-0">
          <div className="flex items-center justify-between p-2 sm:p-4 md:p-0">
            <div className="flex items-center gap-2 md:gap-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate('/purchase-orders')}
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
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <Pencil className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h1 className="text-lg md:text-2xl font-semibold">{t('editPurchase')}</h1>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            <p className="text-muted-foreground">{t('loading') || 'Loading...'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-6 overflow-x-hidden">
      {/* Mobile-First Sticky Header */}
      <div className="sticky top-0 z-10 bg-background border-b md:relative md:border-0">
        <div className="flex items-center justify-between p-3 sm:p-4 md:px-4 md:py-5">
          <div className="flex items-center gap-3 md:gap-4">
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
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                isEditMode 
                  ? "bg-amber-100 dark:bg-amber-900/30" 
                  : "bg-emerald-100 dark:bg-emerald-900/30"
              )}>
                {isEditMode ? (
                  <Pencil className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                ) : (
                  <PlusCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                )}
              </div>
              <div>
                <h1 className="text-lg md:text-2xl font-semibold">{isEditMode ? t('editPurchase') : t('createPurchase')}</h1>
                <p className="text-xs md:text-sm text-muted-foreground hidden md:block">{isEditMode ? t('updateImportOrder') : t('basicDetailsSupplier')}</p>
              </div>
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
              className={cn(
                isEditMode 
                  ? "bg-amber-600 hover:bg-amber-700 text-white" 
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              )}
            >
              {isEditMode ? (
                <Pencil className="h-4 w-4 mr-2" />
              ) : (
                <PlusCircle className="h-4 w-4 mr-2" />
              )}
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
            className={cn(
              "flex-1",
              isEditMode 
                ? "bg-amber-600 hover:bg-amber-700 text-white" 
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            )}
          >
            {isEditMode ? (
              <Pencil className="h-4 w-4 mr-2" />
            ) : (
              <PlusCircle className="h-4 w-4 mr-2" />
            )}
            {(createPurchaseMutation.isPending || updatePurchaseMutation.isPending) ? (isEditMode ? t('updating') : t('creating')) : (isEditMode ? t('update') : t('create'))}
          </Button>
        </div>
      </div>

      <div className="px-2 sm:px-4 md:px-4 pb-20 md:pb-6 space-y-4 md:space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-4 md:gap-8">
        {/* Left Column - Form */}
        <div className="space-y-6">
          {/* Order Details */}
          <Card className={cn("shadow-sm border-0 ring-1 overflow-hidden", accentColors.border)}>
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", accentColors.selectedBg)}>
                    <ClipboardList className={cn("h-5 w-5", accentColors.textAccent)} />
                  </div>
                  <div>
                    <CardTitle className="text-foreground">{t('orderDetails')}</CardTitle>
                    <CardDescription className="text-muted-foreground">{t('basicDetailsSupplier')}</CardDescription>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="file"
                    ref={invoiceInputRef}
                    onChange={handleInvoiceUpload}
                    accept="image/*,.pdf"
                    className="hidden"
                    data-testid="input-invoice-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => invoiceInputRef.current?.click()}
                    disabled={parsingInvoice}
                    className="gap-2"
                    data-testid="button-upload-invoice"
                  >
                    {parsingInvoice ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">{t('uploadInvoice')}</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 p-4 sm:p-6">
              {/* Currency & Payment Section */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <div className={cn("p-1.5 rounded-lg", accentColors.selectedBg)}>
                    <DollarSign className={cn("h-4 w-4", accentColors.textAccent)} />
                  </div>
                  <span className={accentColors.textAccent}>{t('currencyAndPayment')}</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="purchase-currency" className="text-xs text-muted-foreground">{t('purchaseCurrency')} *</Label>
                    <Select value={purchaseCurrency} onValueChange={(value) => {
                      if (value === "add-new") {
                        setAddingCurrency(true);
                      } else {
                        setPurchaseCurrency(value);
                        // Auto-sync other currency fields unless manually set
                        if (!paymentCurrencyManuallySet) {
                          setPaymentCurrency(value);
                        }
                        setShippingCurrency(value);
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
                    <div className="flex items-center justify-between h-5">
                      <Label htmlFor="total-paid" className="text-xs text-muted-foreground">{t('totalPaid')}</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={cn("h-5 text-xs text-muted-foreground hover:text-foreground px-1", !totalPaidManuallySet && "hidden")}
                        onClick={() => {
                          setTotalPaidManuallySet(false);
                          setTotalPaid(parseFloat(grandTotalInPaymentCurrency.toFixed(2)));
                        }}
                        title={t('resetToAutoCalculated')}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        {t('autoReset')}
                      </Button>
                    </div>
                    <div className="relative">
                      <DecimalInput
                        id="total-paid"
                        value={totalPaid}
                        onChange={(val) => {
                          setTotalPaid(val);
                          setTotalPaidManuallySet(true);
                        }}
                        placeholder="0.00"
                        className={cn("pl-8", totalPaidManuallySet && "border-amber-400")}
                        min="0"
                        data-testid="input-total-paid"
                      />
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">
                        {getCurrencySymbol(paymentCurrency)}
                      </span>
                    </div>
                    {purchaseCurrency !== paymentCurrency && grandTotalInPurchaseCurrency > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {t('grandTotalIn')} {paymentCurrency}: {getCurrencySymbol(paymentCurrency)}{grandTotalInPaymentCurrency.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Supplier & Dates Section */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <div className={cn("p-1.5 rounded-lg", accentColors.selectedBg)}>
                    <Building2 className={cn("h-4 w-4", accentColors.textAccent)} />
                  </div>
                  <span className={accentColors.textAccent}>{t('supplierAndDates')}</span>
                </h4>
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
                              <div className="p-4 space-y-3">
                                <p className="text-sm text-muted-foreground">{t('noSupplierFound')}</p>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => {
                                    setShowQuickAddSupplier(true);
                                    setNewSupplierName(supplier);
                                    setSupplierDropdownOpen(false);
                                  }}
                                  className="w-full"
                                  data-testid="button-quick-add-supplier"
                                >
                                  <UserPlus className="mr-2 h-4 w-4" />
                                  {t('quickAddSupplier')} "{supplier}"
                                </Button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Quick Add Supplier Form - Outside Dropdown */}
                {showQuickAddSupplier && (
                  <div className="mt-3 space-y-3 border rounded-lg p-4 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <UserPlus className="h-4 w-4 text-primary" />
                        {t('quickAddSupplier')}
                      </h4>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setShowQuickAddSupplier(false);
                          setNewSupplierName("");
                          setNewSupplierCountry("");
                          setNewSupplierWebsite("");
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs">{t('supplierName')} *</Label>
                        <Input
                          value={newSupplierName}
                          onChange={(e) => setNewSupplierName(e.target.value)}
                          placeholder={t('supplierNamePlaceholder')}
                          className="h-9"
                          data-testid="input-new-supplier-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">{t('country')}</Label>
                        <div className="relative" ref={countryDropdownRef}>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-lg">
                              {getCountryFlag(newSupplierCountry)}
                            </span>
                            <Input
                              value={newSupplierCountry}
                              onChange={(e) => setNewSupplierCountry(e.target.value)}
                              onFocus={() => setCountryDropdownOpen(true)}
                              placeholder={t('countryPlaceholder')}
                              className="h-9 pl-10"
                              data-testid="input-new-supplier-country"
                            />
                          </div>
                          {countryDropdownOpen && (
                            <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                              {filteredCountries.length > 0 ? (
                                filteredCountries.map((country) => (
                                  <button
                                    key={country.name}
                                    type="button"
                                    className="w-full px-3 py-2 text-left hover:bg-accent transition-colors flex items-center gap-2 text-sm"
                                    onClick={() => {
                                      setNewSupplierCountry(country.name);
                                      setCountryDropdownOpen(false);
                                    }}
                                  >
                                    <span className="text-lg">{country.flag}</span>
                                    <span>{country.name}</span>
                                  </button>
                                ))
                              ) : (
                                <div className="px-3 py-2 text-sm text-muted-foreground">
                                  {t('noCountryFound')}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">{t('website')}</Label>
                        <Input
                          value={newSupplierWebsite}
                          onChange={(e) => setNewSupplierWebsite(e.target.value)}
                          placeholder={t('websitePlaceholder')}
                          className="h-9"
                          data-testid="input-new-supplier-website"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowQuickAddSupplier(false);
                          setNewSupplierName("");
                          setNewSupplierCountry("");
                          setNewSupplierWebsite("");
                        }}
                        disabled={savingSupplier}
                      >
                        {t('cancel')}
                      </Button>
                      <Button
                        size="sm"
                        onClick={async () => {
                          if (!newSupplierName.trim()) {
                            toast({ title: t('error'), description: t('supplierNameRequired'), variant: "destructive" });
                            return;
                          }
                          setSavingSupplier(true);
                          try {
                            const response = await apiRequest('POST', '/api/suppliers', {
                              name: newSupplierName.trim(),
                              country: newSupplierCountry.trim() || undefined,
                              website: newSupplierWebsite.trim() || undefined
                            });
                            const newSupplier = await response.json();
                            queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
                            setSupplier(newSupplier.name);
                            setSupplierId(newSupplier.id.toString());
                            setShowQuickAddSupplier(false);
                            setNewSupplierName("");
                            setNewSupplierCountry("");
                            setNewSupplierWebsite("");
                            toast({ title: t('success'), description: t('supplierAddedSuccess') });
                          } catch (error) {
                            toast({ title: t('error'), description: t('supplierAddFailed'), variant: "destructive" });
                          } finally {
                            setSavingSupplier(false);
                          }
                        }}
                        disabled={savingSupplier || !newSupplierName.trim()}
                        data-testid="button-save-new-supplier"
                      >
                        {savingSupplier ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
                        {t('save')}
                      </Button>
                    </div>
                  </div>
                )}
                {/* Date Fields - Part of Supplier & Dates Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
                        onFocus={(e) => e.target.select()}
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

              {/* Shipping Details Section */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <div className={cn("p-1.5 rounded-lg", accentColors.selectedBg)}>
                    <Truck className={cn("h-4 w-4", accentColors.textAccent)} />
                  </div>
                  <span className={accentColors.textAccent}>{t('shippingDetails')}</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                      <DecimalInput
                        id="shipping"
                        value={shippingCost}
                        onChange={(val) => handleShippingCostChange(val)}
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
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <div className={cn("p-1.5 rounded-lg", accentColors.selectedBg)}>
                    <Settings className={cn("h-4 w-4", accentColors.textAccent)} />
                  </div>
                  <span className={accentColors.textAccent}>{t('optionsSection')}</span>
                </h4>
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
          <Card className={cn("shadow-sm border-0 ring-1 overflow-hidden", accentColors.border)}>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", accentColors.selectedBg)}>
                  <Package className={cn("h-5 w-5", accentColors.textAccent)} />
                </div>
                <div>
                  <CardTitle className="text-foreground">{t('addItems')}</CardTitle>
                  <CardDescription className="text-muted-foreground">{t('addProductsToPurchase')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 p-4 sm:p-6">
              {/* Product Selection Section */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  {/* Product Image - Enhanced with gradient border */}
                  <div className="flex-shrink-0 mx-auto sm:mx-0">
                    <div className="relative group">
                      {(selectedProduct?.imageUrl || productImagePreview) ? (
                        <label className="cursor-pointer block">
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleImageUpload}
                            data-testid="input-product-image-change"
                          />
                          <div className="relative p-1 rounded-xl bg-slate-200 dark:bg-slate-700 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/30">
                            <img
                              src={productImagePreview || selectedProduct?.imageUrl}
                              alt={selectedProduct?.name || t('productPreview')}
                              className="w-24 h-24 sm:w-20 sm:h-20 object-contain rounded-lg bg-white dark:bg-slate-900"
                            />
                            <div className="absolute inset-1 bg-black/50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Upload className="h-5 w-5 text-white" />
                            </div>
                          </div>
                          {productImagePreview && (
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 z-10 shadow-md"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setProductImageFile(null);
                                setProductImagePreview(null);
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </label>
                      ) : (
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleImageUpload}
                            data-testid="input-product-image"
                          />
                          <div className="w-24 h-24 sm:w-20 sm:h-20 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl flex flex-col items-center justify-center hover:border-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200">
                            <Upload className="h-6 w-6 text-slate-400 dark:text-slate-500 mb-1" />
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center px-1 font-medium">
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
                                  // Build URL with all available item details for pre-filling the product form
                                  const params = new URLSearchParams();
                                  
                                  // Basic info
                                  if (currentItem.name) params.set('name', currentItem.name);
                                  if (currentItem.sku) params.set('sku', currentItem.sku);
                                  if (currentItem.barcode) params.set('barcode', currentItem.barcode);
                                  if (currentItem.categoryId) params.set('categoryId', String(currentItem.categoryId));
                                  
                                  // Supplier info from purchase order
                                  if (supplierId) params.set('supplierId', supplierId);
                                  
                                  // Pricing - convert to appropriate currency fields
                                  if (currentItem.unitPrice) {
                                    // Pass the import cost in the purchase currency
                                    if (purchaseCurrency === 'USD') {
                                      params.set('importCostUsd', currentItem.unitPrice.toString());
                                    } else if (purchaseCurrency === 'EUR') {
                                      params.set('importCostEur', currentItem.unitPrice.toString());
                                    } else if (purchaseCurrency === 'CZK') {
                                      params.set('importCostCzk', currentItem.unitPrice.toString());
                                    } else if (purchaseCurrency === 'VND') {
                                      params.set('importCostVnd', currentItem.unitPrice.toString());
                                    } else if (purchaseCurrency === 'CNY') {
                                      params.set('importCostCny', currentItem.unitPrice.toString());
                                    }
                                    // Also pass the raw value and currency for reference
                                    params.set('importCost', currentItem.unitPrice.toString());
                                    params.set('importCostCurrency', purchaseCurrency);
                                  }
                                  
                                  // Physical properties
                                  if (currentItem.weight) params.set('weight', currentItem.weight.toString());
                                  if (currentItem.weightUnit) params.set('weightUnit', currentItem.weightUnit);
                                  if (currentItem.dimensions) params.set('dimensions', currentItem.dimensions);
                                  
                                  // Image if available
                                  if (productImagePreview) params.set('imageUrl', productImagePreview);
                                  
                                  // Return URL for navigation back
                                  const currentPath = window.location.pathname + window.location.search;
                                  params.set('returnUrl', currentPath);
                                  
                                  navigate(`/inventory/add?${params.toString()}`);
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
                  <div className={cn("rounded-xl border p-4 space-y-3 shadow-sm", accentColors.border, accentColors.selectedBg)}>
                    <div className="flex items-center justify-between">
                      <span className={cn("text-xs font-semibold", accentColors.textAccent)}>{t('productInfo')}</span>
                      {selectedProduct.warehouseLocation && (
                        <span className={cn("text-xs text-white px-2.5 py-1 rounded-full font-medium shadow-sm", isEditMode ? "bg-amber-500" : "bg-blue-500")}>
                          {selectedProduct.warehouseLocation}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="text-xs text-muted-foreground block">{t('currentStock')}</span>
                        <span className={cn(
                          "font-medium",
                          ((selectedProduct as any).quantity || 0) > 10 ? "text-green-600" :
                          ((selectedProduct as any).quantity || 0) > 0 ? "text-yellow-600" : "text-red-600"
                        )}>
                          {(selectedProduct as any).quantity ?? 0} {selectedProduct.sellingUnitName || 'pcs'}
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
              {!showVariantAllocations && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <div className={cn("p-1.5 rounded-lg", accentColors.selectedBg)}>
                    <Calculator className={cn("h-4 w-4", accentColors.textAccent)} />
                  </div>
                  <span className={accentColors.textAccent}>{t('quantityAndPricing')}</span>
                </h4>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="quantity" className="text-xs font-medium">{t('quantity')} *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={currentItem.quantity}
                      onChange={(e) => setCurrentItem({...currentItem, quantity: parseInt(e.target.value) || 1})}
                      onFocus={(e) => e.target.select()}
                      className="h-10 sm:h-9 border-slate-200 dark:border-slate-700 focus:border-blue-400 focus:ring-blue-300 dark:focus:border-blue-500 dark:focus:ring-blue-400"
                      data-testid="input-quantity"
                    />
                  </div>
                  {selectedProduct?.bulkUnitName && (
                    <div className="space-y-1.5">
                      <Label htmlFor="unitType" className="text-xs font-medium">{t('purchaseUnit')}</Label>
                      <Select
                        value={currentItem.unitType || 'selling'}
                        onValueChange={(value: 'selling' | 'bulk') => setCurrentItem({...currentItem, unitType: value})}
                      >
                        <SelectTrigger id="unitType" className="h-10 sm:h-9 border-slate-200 dark:border-slate-700" data-testid="select-unit-type">
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
                  <div className="space-y-1.5">
                    <Label htmlFor="unitPrice" className="text-xs font-medium">{t('cost')} ({purchaseCurrency}) *</Label>
                    <DecimalInput
                      id="unitPrice"
                      value={currentItem.unitPrice || 0}
                      onChange={(val) => setCurrentItem({...currentItem, unitPrice: val})}
                      className="h-10 sm:h-9 border-slate-200 dark:border-slate-700 focus:border-blue-400 focus:ring-blue-300 dark:focus:border-blue-500 dark:focus:ring-blue-400"
                      data-testid="input-unit-price"
                    />
                    {selectedProduct && ((selectedProduct as any).importCostUSD || (selectedProduct as any).importCostEUR) && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t('lastPurchasePrice')}: {(() => {
                          const prod = selectedProduct as any;
                          const cost = purchaseCurrency === 'USD' 
                            ? prod.importCostUSD
                            : purchaseCurrency === 'EUR'
                            ? prod.importCostEUR
                            : purchaseCurrency === 'CZK'
                            ? prod.importCostCZK
                            : prod.importCostUSD || prod.importCostEUR;
                          const date = prod.updatedAt ? new Date(prod.updatedAt) : null;
                          return cost ? `${parseFloat(cost).toFixed(2)} ${purchaseCurrency}${date ? ` (${date.toLocaleDateString()})` : ''}` : '-';
                        })()}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cartons" className="text-xs font-medium">{t('cartonsOptional')}</Label>
                    <Input
                      id="cartons"
                      type="number"
                      min="0"
                      value={currentItem.cartons || ""}
                      onChange={(e) => setCurrentItem({...currentItem, cartons: e.target.value ? parseInt(e.target.value) : undefined})}
                      onFocus={(e) => e.target.select()}
                      placeholder={t('cartonsPlaceholder')}
                      className="h-10 sm:h-9 border-slate-200 dark:border-slate-700 focus:border-blue-400 focus:ring-blue-300 dark:focus:border-blue-500 dark:focus:ring-blue-400"
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
              )}
              
              {/* Physical Properties Section */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <div className={cn("p-1.5 rounded-lg", accentColors.selectedBg)}>
                    <Scale className={cn("h-4 w-4", accentColors.textAccent)} />
                  </div>
                  <span className={accentColors.textAccent}>{t('physicalProperties')}</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="weight" className="text-xs font-medium">{t('weight')}</Label>
                    <div className="flex gap-2">
                      <DecimalInput
                        id="weight"
                        value={currentItem.weight || 0}
                        onChange={(val) => setCurrentItem({...currentItem, weight: val})}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            document.getElementById('dimensions')?.focus();
                          }
                        }}
                        className="h-10 sm:h-9 flex-1 border-slate-200 dark:border-slate-700 focus:border-blue-400 focus:ring-blue-300 dark:focus:border-blue-500 dark:focus:ring-blue-400"
                        data-testid="input-weight"
                      />
                      <Select
                        value={currentItem.weightUnit || 'kg'}
                        onValueChange={(value: 'mg' | 'g' | 'kg' | 'oz' | 'lb') => setCurrentItem({...currentItem, weightUnit: value})}
                      >
                        <SelectTrigger className="h-10 sm:h-9 w-[70px] border-slate-200 dark:border-slate-700" data-testid="select-weight-unit">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mg">mg</SelectItem>
                          <SelectItem value="g">g</SelectItem>
                          <SelectItem value="kg">kg</SelectItem>
                          <SelectItem value="oz">oz</SelectItem>
                          <SelectItem value="lb">lb</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{t('dimensions')}</Label>
                    <div className="flex gap-1.5">
                      <Input
                        id="length"
                        type="number"
                        step="0.1"
                        min="0"
                        value={currentItem.length || ''}
                        onChange={(e) => setCurrentItem({...currentItem, length: parseFloat(e.target.value) || 0})}
                        placeholder="L"
                        className="h-10 sm:h-9 w-14 sm:w-16 border-slate-200 dark:border-slate-700 focus:border-blue-400 focus:ring-blue-300 dark:focus:border-blue-500 dark:focus:ring-blue-400"
                        data-testid="input-length"
                      />
                      <Input
                        id="width"
                        type="number"
                        step="0.1"
                        min="0"
                        value={currentItem.width || ''}
                        onChange={(e) => setCurrentItem({...currentItem, width: parseFloat(e.target.value) || 0})}
                        placeholder="W"
                        className="h-10 sm:h-9 w-14 sm:w-16 border-slate-200 dark:border-slate-700 focus:border-blue-400 focus:ring-blue-300 dark:focus:border-blue-500 dark:focus:ring-blue-400"
                        data-testid="input-width"
                      />
                      <Input
                        id="height"
                        type="number"
                        step="0.1"
                        min="0"
                        value={currentItem.height || ''}
                        onChange={(e) => setCurrentItem({...currentItem, height: parseFloat(e.target.value) || 0})}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (!showVariants || variants.length === 0) {
                              addItem();
                            }
                          }
                        }}
                        placeholder="H"
                        className="h-10 sm:h-9 w-14 sm:w-16 border-slate-200 dark:border-slate-700 focus:border-blue-400 focus:ring-blue-300 dark:focus:border-blue-500 dark:focus:ring-blue-400"
                        data-testid="input-height"
                      />
                      <Select
                        value={currentItem.dimensionUnit || 'cm'}
                        onValueChange={(value: 'mm' | 'cm' | 'in') => setCurrentItem({...currentItem, dimensionUnit: value})}
                      >
                        <SelectTrigger className="h-10 sm:h-9 w-[60px] border-slate-200 dark:border-slate-700" data-testid="select-dimension-unit">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mm">mm</SelectItem>
                          <SelectItem value="cm">cm</SelectItem>
                          <SelectItem value="in">in</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="category" className="text-xs font-medium">{t('category')}</Label>
                    <div className="relative" ref={categoryDropdownRef}>
                      <div 
                        className="flex h-10 sm:h-9 w-full items-center justify-between rounded-md border border-slate-200 dark:border-slate-700 bg-background px-3 py-2 text-sm ring-offset-background cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400/20"
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
              <div className="space-y-4">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <div className={cn("p-1.5 rounded-lg", accentColors.selectedBg)}>
                    <MapPin className={cn("h-4 w-4", accentColors.textAccent)} />
                  </div>
                  <span className={accentColors.textAccent}>{t('additionalDetails')}</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="binLocation" className="text-xs font-medium">{t('storageLocation')}</Label>
                    <div className="flex gap-2">
                      <Input
                        id="binLocation"
                        value={currentItem.binLocation || ""}
                        onChange={(e) => setCurrentItem({...currentItem, binLocation: e.target.value})}
                        placeholder={t('storageLocationExample')}
                        className="h-10 sm:h-9 flex-1 border-slate-200 dark:border-slate-700 focus:border-blue-400 focus:ring-blue-300 dark:focus:border-blue-500 dark:focus:ring-blue-400"
                        data-testid="input-bin-location"
                      />
                      <Button
                        type="button"
                        onClick={suggestStorageLocation}
                        disabled={!currentItem.name || suggestingLocation}
                        variant="outline"
                        size="sm"
                        className={cn("h-10 sm:h-9 gap-1.5 px-3", accentColors.border, "hover:bg-slate-100 dark:hover:bg-slate-800")}
                        data-testid="button-suggest-location"
                      >
                        {suggestingLocation ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Zap className={cn("h-4 w-4", accentColors.textAccent)} />
                        )}
                        <span className="hidden sm:inline">{t('aiSuggest')}</span>
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="itemNotes" className="text-xs font-medium">{t('itemNotes')}</Label>
                    <Input
                      id="itemNotes"
                      value={currentItem.notes}
                      onChange={(e) => setCurrentItem({...currentItem, notes: e.target.value})}
                      placeholder={t('optionalNotes')}
                      className="h-10 sm:h-9 border-slate-200 dark:border-slate-700 focus:border-blue-400 focus:ring-blue-300 dark:focus:border-blue-500 dark:focus:ring-blue-400"
                      data-testid="input-item-notes"
                    />
                  </div>
                </div>
              </div>
              
              {/* Variants Toggle */}
              {currentItem.name && (
                <div className={cn("flex items-center space-x-3 p-3 rounded-xl border", accentColors.selectedBg, accentColors.border)}>
                  <Checkbox
                    id="show-variants"
                    checked={showVariants}
                    onCheckedChange={(checked) => setShowVariants(!!checked)}
                    className={cn("border-slate-300 dark:border-slate-600", isEditMode ? "data-[state=checked]:bg-amber-500" : "data-[state=checked]:bg-blue-500")}
                  />
                  <Label htmlFor="show-variants" className="text-sm font-medium cursor-pointer">
                    {t('addAsMultipleVariants')}
                  </Label>
                </div>
              )}
              
              {/* Variants Section - Clean Professional Design */}
              {showVariants && currentItem.name && (
                <Collapsible
                  open={variantsSectionExpanded}
                  onOpenChange={setVariantsSectionExpanded}
                  className={cn("border rounded-xl overflow-hidden shadow-sm", accentColors.border)}
                >
                  <CollapsibleTrigger asChild>
                    <div className={cn(
                      "flex flex-col sm:flex-row sm:items-center justify-between p-4 cursor-pointer transition-all duration-300",
                      variantsSectionExpanded 
                        ? cn(accentColors.headerBg, "text-white")
                        : "bg-muted/30 hover:bg-muted/50"
                    )}>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-lg",
                          variantsSectionExpanded ? "bg-white/20" : accentColors.selectedBg
                        )}>
                          {variantsSectionExpanded ? (
                            <ChevronDown className="h-4 w-4 text-white" />
                          ) : (
                            <ChevronRight className={accentColors.textAccent + " h-4 w-4"} />
                          )}
                        </div>
                        <div className="space-y-0.5">
                          <h4 className={cn(
                            "text-sm font-semibold",
                            variantsSectionExpanded ? "text-white" : "text-foreground"
                          )}>
                            {t('productVariants')}
                          </h4>
                          <p className={cn(
                            "text-xs",
                            variantsSectionExpanded ? "text-white/80" : "text-muted-foreground"
                          )}>
                            {variants.length > 0 
                              ? `${variants.length} ${t('variants')} - ${t('addVariantsOf')} ${currentItem.name}`
                              : `${t('addVariantsOf')} ${currentItem.name}`
                            }
                          </p>
                        </div>
                      </div>
                      
                      {/* Action Buttons - Responsive Layout */}
                      <div className="flex gap-2 mt-3 sm:mt-0 flex-wrap" onClick={(e) => e.stopPropagation()}>
                        {selectedProduct && loadingExistingVariants && (
                          <Button type="button" size="sm" variant="secondary" disabled className="opacity-70">
                            <Loader2 className="h-4 w-4 animate-spin sm:mr-1" />
                            <span className="hidden sm:inline">{t('loading')}</span>
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => setVariantDialogOpen(true)}
                          className={cn(
                            "transition-all duration-200",
                            variantsSectionExpanded 
                              ? "bg-white/20 hover:bg-white/30 text-white border-white/30" 
                              : accentColors.primaryBtn
                          )}
                        >
                          <Plus className="h-4 w-4 sm:mr-1" />
                          <span className="hidden sm:inline">{t('addVariant')}</span>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => setSeriesDialogOpen(true)}
                          className={cn(
                            "transition-all duration-200",
                            variantsSectionExpanded 
                              ? "bg-white/20 hover:bg-white/30 text-white border-white/30" 
                              : accentColors.primaryBtn
                          )}
                        >
                          <ListPlus className="h-4 w-4 sm:mr-1" />
                          <span className="hidden sm:inline">{t('addSeries')}</span>
                        </Button>
                        {variants.length > 0 && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              setQuickSelectQuantity(1);
                              setQuickSelectUnitPrice(currentItem.unitPrice || 0);
                              setQuickSelectDialogOpen(true);
                            }}
                            data-testid="button-quick-selection"
                            className={cn(
                              "transition-all duration-200",
                              variantsSectionExpanded 
                                ? "bg-white/20 hover:bg-white/30 text-white border-white/30" 
                                : accentColors.primaryBtn
                            )}
                          >
                            <Zap className="h-4 w-4 sm:mr-1" />
                            <span className="hidden sm:inline">{t('quickSelection')}</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    {/* Variants Content */}
                    {variants.length > 0 && (
                    <div className="p-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/30">
                      {/* Header with Selection and Quick Actions */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={selectedVariants.length === variants.length && variants.length > 0}
                            onCheckedChange={toggleSelectAllVariants}
                            className={cn("border-slate-300 dark:border-slate-600", isEditMode ? "data-[state=checked]:bg-amber-500" : "data-[state=checked]:bg-blue-500")}
                          />
                          <span className={cn("text-sm font-medium", accentColors.textAccent)}>
                            {selectedVariants.length > 0 ? `${selectedVariants.length} ${t('selected')}` : `${variants.length} ${t('variants')}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Quick Fill Dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className={cn("border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600", accentColors.border)}
                                data-testid="button-quick-fill"
                              >
                                <Zap className={cn("h-4 w-4 sm:mr-1", accentColors.textAccent)} />
                                <span className="hidden sm:inline">{t('quickFill')}</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuLabel className={accentColors.textAccent}>{t('fillQuantity')}</DropdownMenuLabel>
                              <div className="flex flex-wrap gap-1 px-2 pb-2">
                                {[1, 5, 10, 20, 50, 100].map((val) => (
                                  <Button
                                    key={val}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600"
                                    onClick={() => quickFillSelectedVariants(val, 'quantity')}
                                    data-testid={`button-quick-fill-qty-${val}`}
                                  >
                                    {val}
                                  </Button>
                                ))}
                              </div>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel className="text-purple-600">{t('fillCost')}</DropdownMenuLabel>
                              <div className="flex flex-wrap gap-1 px-2 pb-2">
                                {[0.5, 1, 2, 5, 10].map((val) => (
                                  <Button
                                    key={val}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 text-xs hover:bg-purple-50 hover:border-purple-300 hover:text-purple-600"
                                    onClick={() => quickFillSelectedVariants(val, 'unitPrice')}
                                    data-testid={`button-quick-fill-cost-${val}`}
                                  >
                                    {val}
                                  </Button>
                                ))}
                              </div>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setQuickFillField('quantity');
                                  setQuickFillDialogOpen(true);
                                }}
                                className="hover:bg-slate-100 dark:hover:bg-slate-800"
                              >
                                <ClipboardList className="h-4 w-4 mr-2 text-slate-500 dark:text-slate-400" />
                                {t('pasteQtyList')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setQuickFillField('unitPrice');
                                  setQuickFillDialogOpen(true);
                                }}
                                className="hover:bg-purple-50"
                              >
                                <ClipboardList className="h-4 w-4 mr-2 text-purple-500" />
                                {t('pasteCostList')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setBarcodePasteDialogOpen(true)}
                            className={cn("border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600", accentColors.border)}
                            data-testid="button-paste-barcodes"
                          >
                            <ClipboardPaste className={cn("h-4 w-4 sm:mr-1", accentColors.textAccent)} />
                            <span className="hidden sm:inline">{t('pasteBarcodeList')}</span>
                          </Button>
                          {selectedVariants.length > 0 && (
                            <Button 
                              type="button" 
                              variant="destructive" 
                              size="sm" 
                              onClick={bulkDeleteVariants}
                              className="bg-red-500 hover:bg-red-600"
                            >
                              <Trash2 className="h-4 w-4 sm:mr-1" />
                              <span className="hidden sm:inline">{t('delete')}</span>
                              <span className="ml-1">({selectedVariants.length})</span>
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {/* Mobile Card Layout */}
                      <div className="md:hidden space-y-3">
                        {variants.map((variant, index) => (
                          <div
                            key={variant.id}
                            className={cn(
                              "rounded-xl border overflow-hidden transition-all duration-200",
                              selectedVariants.includes(variant.id)
                                ? cn(accentColors.borderAccent, accentColors.selectedBg, "shadow-md")
                                : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:shadow-sm"
                            )}
                          >
                            {/* Card Header with Variant Name and Selection */}
                            <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-800">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <Checkbox
                                  checked={selectedVariants.includes(variant.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedVariants([...selectedVariants, variant.id]);
                                    } else {
                                      setSelectedVariants(selectedVariants.filter(id => id !== variant.id));
                                    }
                                  }}
                                  className={cn("border-slate-300 dark:border-slate-600 flex-shrink-0", isEditMode ? "data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500" : "data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500")}
                                />
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className={cn("inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold flex-shrink-0", isEditMode ? "bg-amber-500" : "bg-blue-500")}>
                                    {index + 1}
                                  </span>
                                  <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                                    {variant.name}
                                  </span>
                                </div>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-gray-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {index < variants.length - 1 && (
                                    <>
                                      <DropdownMenuItem onClick={() => fillDownVariantValue(variant.id, 'quantity')}>
                                        <ChevronDown className="h-4 w-4 mr-2" />
                                        {t('fillDown')} {t('qty')}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => fillDownVariantValue(variant.id, 'unitPrice')}>
                                        <ChevronDown className="h-4 w-4 mr-2" />
                                        {t('fillDown')} {t('cost')}
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                    </>
                                  )}
                                  <DropdownMenuItem 
                                    onClick={() => removeVariant(variant.id)}
                                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    {t('delete')}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            
                            {/* Card Body */}
                            <div className="p-3 space-y-3">
                              {/* SKU and Barcode Row */}
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1 block">{t('sku')}</Label>
                                  <Input
                                    value={variant.sku}
                                    onChange={(e) => {
                                      setVariants(variants.map(v => 
                                        v.id === variant.id ? {...v, sku: e.target.value} : v
                                      ));
                                    }}
                                    className="h-9 text-sm border-slate-200 dark:border-slate-700 focus:border-blue-400 focus:ring-blue-300 dark:focus:border-blue-500 dark:focus:ring-blue-400"
                                    placeholder={t('sku')}
                                    data-testid={`input-variant-sku-${variant.id}`}
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1 block">{t('barcode')}</Label>
                                  <Input
                                    value={variant.barcode}
                                    onChange={(e) => {
                                      setVariants(variants.map(v => 
                                        v.id === variant.id ? {...v, barcode: e.target.value} : v
                                      ));
                                    }}
                                    className="h-9 text-sm border-slate-200 dark:border-slate-700 focus:border-blue-400 focus:ring-blue-300 dark:focus:border-blue-500 dark:focus:ring-blue-400"
                                    placeholder={t('barcode')}
                                    data-testid={`input-variant-barcode-${variant.id}`}
                                  />
                                </div>
                              </div>
                              
                              {/* Quantity and Cost Row */}
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1 block">{t('qty')}</Label>
                                  <Input
                                    type="text"
                                    inputMode="numeric"
                                    value={variant.quantity}
                                    onChange={(e) => {
                                      const val = e.target.value.replace(/[^0-9]/g, '');
                                      setVariants(variants.map(v => 
                                        v.id === variant.id ? {...v, quantity: parseInt(val) || 0} : v
                                      ));
                                    }}
                                    onFocus={(e) => e.target.select()}
                                    className="h-9 text-sm text-center font-medium border-slate-200 dark:border-slate-700 focus:border-blue-400 focus:ring-blue-300 dark:focus:border-blue-500 dark:focus:ring-blue-400 bg-slate-50/50 dark:bg-slate-900/50"
                                    data-testid={`input-variant-qty-${variant.id}`}
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1 block">{t('cost')}</Label>
                                  <DecimalInput
                                    value={variant.unitPrice}
                                    onChange={(val) => {
                                      setVariants(variants.map(v => 
                                        v.id === variant.id ? {...v, unitPrice: val} : v
                                      ));
                                    }}
                                    className="h-9 text-sm text-right font-medium border-purple-200 focus:border-purple-400 focus:ring-purple-400 bg-purple-50/50 dark:bg-purple-950/20"
                                    data-testid={`input-variant-price-${variant.id}`}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Desktop Table Layout */}
                      <div className="hidden md:block border rounded-xl overflow-hidden shadow-sm">
                        <Table className="text-sm">
                          <TableHeader>
                            <TableRow className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                              <TableHead className="w-10 p-3 align-middle">
                                <div className="flex items-center justify-center">
                                  <Checkbox
                                    checked={selectedVariants.length === variants.length && variants.length > 0}
                                    onCheckedChange={toggleSelectAllVariants}
                                    className={cn("h-4 w-4 border-slate-300 dark:border-slate-600", isEditMode ? "data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500" : "data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500")}
                                  />
                                </div>
                              </TableHead>
                              <TableHead className="min-w-[140px] p-3 font-semibold text-slate-700 dark:text-slate-300">{t('variantName')}</TableHead>
                              <TableHead className="min-w-[140px] p-3 font-semibold text-slate-700 dark:text-slate-300">{t('sku')}</TableHead>
                              <TableHead className="min-w-[120px] p-3 font-semibold text-slate-700 dark:text-slate-300">{t('barcode')}</TableHead>
                              <TableHead className="text-center w-24 p-3 font-semibold text-slate-600 dark:text-slate-400">{t('qty')}</TableHead>
                              <TableHead className="text-right w-28 p-3 font-semibold text-purple-600 dark:text-purple-400">{t('cost')}</TableHead>
                              <TableHead className="w-12 p-3"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {variants.map((variant, index) => (
                              <TableRow 
                                key={variant.id} 
                                className={cn(
                                  "transition-colors",
                                  selectedVariants.includes(variant.id)
                                    ? accentColors.selectedBg
                                    : "hover:bg-slate-100/50 dark:hover:bg-slate-800/50",
                                  index % 2 === 0 ? "bg-white dark:bg-gray-950" : "bg-gray-50/50 dark:bg-gray-900/50"
                                )}
                              >
                                <TableCell className="p-3 align-middle">
                                  <div className="flex items-center justify-center">
                                    <Checkbox
                                      checked={selectedVariants.includes(variant.id)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setSelectedVariants([...selectedVariants, variant.id]);
                                        } else {
                                          setSelectedVariants(selectedVariants.filter(id => id !== variant.id));
                                        }
                                      }}
                                      className={cn("h-4 w-4 border-slate-300 dark:border-slate-600", isEditMode ? "data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500" : "data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500")}
                                    />
                                  </div>
                                </TableCell>
                                <TableCell className="p-3">
                                  <div className="flex items-center gap-2">
                                    <span className={cn("inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold", isEditMode ? "bg-amber-500" : "bg-blue-500")}>
                                      {index + 1}
                                    </span>
                                    <span className="font-medium text-gray-900 dark:text-gray-100">{variant.name}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="p-3">
                                  <Input
                                    value={variant.sku}
                                    onChange={(e) => {
                                      setVariants(variants.map(v => 
                                        v.id === variant.id ? {...v, sku: e.target.value} : v
                                      ));
                                    }}
                                    className="h-8 w-full text-xs border-slate-200 dark:border-slate-700 focus:border-blue-400 focus:ring-blue-300 dark:focus:border-blue-500 dark:focus:ring-blue-400"
                                    placeholder={t('sku')}
                                    data-testid={`input-variant-sku-${variant.id}`}
                                  />
                                </TableCell>
                                <TableCell className="p-3">
                                  <Input
                                    value={variant.barcode}
                                    onChange={(e) => {
                                      setVariants(variants.map(v => 
                                        v.id === variant.id ? {...v, barcode: e.target.value} : v
                                      ));
                                    }}
                                    className="h-8 w-full text-xs border-slate-200 dark:border-slate-700 focus:border-blue-400 focus:ring-blue-300 dark:focus:border-blue-500 dark:focus:ring-blue-400"
                                    placeholder={t('barcode')}
                                    data-testid={`input-variant-barcode-${variant.id}`}
                                  />
                                </TableCell>
                                <TableCell className="p-3">
                                  <div className="flex items-center justify-center gap-1 group">
                                    <Input
                                      type="text"
                                      inputMode="numeric"
                                      value={variant.quantity}
                                      onChange={(e) => {
                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                        setVariants(variants.map(v => 
                                          v.id === variant.id ? {...v, quantity: parseInt(val) || 0} : v
                                        ));
                                      }}
                                      onFocus={(e) => e.target.select()}
                                      className="h-8 w-16 text-center text-xs font-medium border-slate-200 dark:border-slate-700 focus:border-blue-400 focus:ring-blue-300 dark:focus:border-blue-500 dark:focus:ring-blue-400 bg-slate-50/50 dark:bg-slate-900/50"
                                      data-testid={`input-variant-qty-${variant.id}`}
                                    />
                                    {index < variants.length - 1 && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => fillDownVariantValue(variant.id, 'quantity')}
                                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300"
                                        title={t('fillDown')}
                                      >
                                        <ChevronDown className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="p-3">
                                  <div className="flex items-center justify-end gap-1 group">
                                    <DecimalInput
                                      value={variant.unitPrice}
                                      onChange={(val) => {
                                        setVariants(variants.map(v => 
                                          v.id === variant.id ? {...v, unitPrice: val} : v
                                        ));
                                      }}
                                      className="h-8 w-20 text-right text-xs font-medium border-purple-200 focus:border-purple-400 focus:ring-purple-400 bg-purple-50/50 dark:bg-purple-950/20"
                                      data-testid={`input-variant-price-${variant.id}`}
                                    />
                                    {index < variants.length - 1 && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => fillDownVariantValue(variant.id, 'unitPrice')}
                                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-purple-100 hover:text-purple-600"
                                        title={t('fillDown')}
                                      >
                                        <ChevronDown className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="p-3">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeVariant(variant.id)}
                                    className="h-7 w-7 p-1 hover:bg-red-100 hover:text-red-600 transition-colors"
                                    data-testid={`button-remove-variant-${variant.id}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                  </CollapsibleContent>
                </Collapsible>
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
                  {t('addProductWithVariants', { count: variants.length })}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Items Table */}
          {items.length > 0 && (
            <Card className={cn("shadow-sm overflow-hidden", accentColors.border)}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", accentColors.selectedBg)}>
                      <Package className={cn("h-5 w-5", accentColors.textAccent)} />
                    </div>
                    <div>
                      <CardTitle className="text-foreground">{t('orderItems')}</CardTitle>
                      <CardDescription className="text-muted-foreground">{t('reviewManageItems')}</CardDescription>
                    </div>
                  </div>
                  {selectedItems.length > 0 && (
                    <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg border", accentColors.selectedBg, accentColors.border)}>
                      <span className={cn("text-sm font-medium", accentColors.textAccent)}>
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
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleteConfirmOpen(true)}
                          className="h-7 px-2 text-xs"
                          data-testid="button-delete-selected"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          {t('deleteSelected', { count: selectedItems.length })}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0 lg:p-6">
                {/* Mobile/Tablet View - Card Layout */}
                <div className="lg:hidden">
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {items.map((item, index) => (
                      <Collapsible 
                        key={item.id}
                        open={expandedCards.includes(item.id)}
                        onOpenChange={() => toggleCardExpand(item.id)}
                      >
                        <div className={cn(
                          "p-4 transition-all duration-200",
                          index % 2 === 1 && "bg-slate-50/50 dark:bg-slate-900/50",
                          "hover:bg-slate-100/60 dark:hover:bg-slate-800/50",
                          selectedItems.includes(item.id) && cn("ring-2 ring-inset", accentColors.borderAccent, accentColors.selectedBg)
                        )}>
                          <div className="flex gap-3">
                            {/* Checkbox */}
                            <div className="flex-shrink-0 pt-1">
                              <Checkbox
                                checked={selectedItems.includes(item.id)}
                                onCheckedChange={() => toggleSelectItem(item.id)}
                                className={cn("border-slate-300 dark:border-slate-600", isEditMode ? "data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500" : "data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500")}
                                data-testid={`checkbox-item-mobile-${item.id}`}
                              />
                            </div>
                            
                            {/* Product Image - Clickable */}
                            <div className="flex-shrink-0">
                              <div 
                                className={cn("w-[60px] h-[60px] rounded-xl border-2 border-slate-200/60 dark:border-slate-700/40 bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden cursor-pointer hover:shadow-lg hover:shadow-slate-200/30 dark:hover:shadow-slate-900/30 transition-all group relative", accentColors.border)}
                                onClick={() => {
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.accept = 'image/*';
                                  input.onchange = (e) => {
                                    const file = (e.target as HTMLInputElement).files?.[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onload = () => {
                                        const updatedItems = items.map(i => 
                                          i.id === item.id ? {...i, imageUrl: reader.result as string} : i
                                        );
                                        setItems(updatedItems);
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  };
                                  input.click();
                                }}
                                title={t('clickToChangeImage')}
                              >
                                {item.imageUrl ? (
                                  <img 
                                    src={item.imageUrl} 
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Package className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                                )}
                                <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center", isEditMode ? "bg-amber-500/60" : "bg-blue-500/60")}>
                                  <ImageIcon className="h-4 w-4 text-white" />
                                </div>
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
                                    className="h-auto p-0 font-medium text-base border-0 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-background focus:border-slate-300 dark:focus:border-slate-600 focus:px-2 focus:py-1 focus:ring-2 focus:ring-blue-300/30 dark:focus:ring-blue-400/30"
                                    placeholder={t('itemNamePlaceholder')}
                                  />
                                  {item.unitType === 'bulk' && item.cartons && item.bulkUnitQty && (
                                    <span className={cn("inline-flex items-center mt-1.5 px-2.5 py-1 text-xs font-medium text-white rounded-full shadow-sm", isEditMode ? "bg-amber-500" : "bg-blue-500")}>
                                      <Package className="h-3 w-3 mr-1" />
                                      {t('bulkUnit', { cartons: item.cartons, quantity: item.cartons * item.bulkUnitQty })}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <CollapsibleTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className={cn("h-9 w-9 transition-all hover:bg-slate-100 dark:hover:bg-slate-800", accentColors.textAccent)}
                                      data-testid={`button-expand-${item.id}`}
                                    >
                                      {expandedCards.includes(item.id) ? (
                                        <ChevronUp className="h-5 w-5" />
                                      ) : (
                                        <ChevronDown className="h-5 w-5" />
                                      )}
                                    </Button>
                                  </CollapsibleTrigger>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 text-red-400 hover:text-white hover:bg-red-500 transition-all"
                                    onClick={() => removeItem(item.id)}
                                    data-testid={`button-remove-item-mobile-${item.id}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            
                              {/* Quantity and Price Row - Always Visible */}
                              <div className="flex items-center gap-3 py-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">{t('qty')}:</span>
                                  <Input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => {
                                      const updatedItems = items.map(i => 
                                        i.id === item.id ? {...i, quantity: parseInt(e.target.value) || 1, totalPrice: (parseInt(e.target.value) || 1) * i.unitPrice} : i
                                      );
                                      updateItemsWithShipping(updatedItems);
                                    }}
                                    onFocus={(e) => e.target.select()}
                                    className="h-8 w-16 text-sm text-center font-semibold border-2 border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-400 focus:ring-2 focus:ring-blue-300/30 dark:focus:ring-blue-400/30 rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    min="1"
                                  />
                                </div>
                              
                                <div className="ml-auto text-right">
                                  <div className="text-sm font-bold text-purple-700 dark:text-purple-300">
                                    {item.totalPrice.toFixed(2)} {purchaseCurrency}
                                  </div>
                                  <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                    +ship: {item.costWithShipping.toFixed(2)} {purchaseCurrency}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Collapsible Content - Extended Details */}
                              <CollapsibleContent className="space-y-3 pt-3">
                                {/* Gradient Section Divider */}
                                <div className="h-px bg-slate-200 dark:bg-slate-700 rounded-full" />
                                
                                {/* SKU and Category */}
                                <div className="flex items-center gap-2 text-sm flex-wrap">
                                  {item.sku && (
                                    <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium", accentColors.selectedBg, accentColors.textAccent)}>
                                      <Barcode className="h-3 w-3 inline mr-1" />
                                      {item.sku}
                                    </span>
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
                                    <SelectTrigger className="h-7 w-auto border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 focus:ring-2 focus:ring-blue-300/30 dark:focus:ring-blue-400/30 text-sm px-2.5 rounded-full">
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
                                <div className="flex items-center gap-2 p-2 bg-slate-100/50 dark:bg-slate-800/50 rounded-lg">
                                  <span className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                                    <DollarSign className="h-4 w-4 inline" />
                                    {t('price')}:
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="number"
                                      value={item.unitPrice}
                                      onChange={(e) => {
                                        const newPrice = parseDecimal(e.target.value);
                                        const updatedItems = items.map(i => 
                                          i.id === item.id ? {...i, unitPrice: newPrice, totalPrice: i.quantity * newPrice} : i
                                        );
                                        updateItemsWithShipping(updatedItems);
                                      }}
                                      onKeyDown={handleDecimalKeyDown}
                                      onFocus={(e) => e.target.select()}
                                      className="h-8 w-24 text-sm text-right font-semibold border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-900 hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-400 focus:ring-2 focus:ring-blue-300/30 dark:focus:ring-blue-400/30 rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      step="0.01"
                                      min="0"
                                    />
                                    <span className="text-xs font-medium text-purple-600 dark:text-purple-400">{purchaseCurrency}</span>
                                  </div>
                                </div>
                                
                                {/* Weight & Dimensions Row */}
                                <div className="flex items-center gap-3 flex-wrap p-2 bg-slate-100/50 dark:bg-slate-800/50 rounded-lg">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                                      <Scale className="h-4 w-4 inline mr-0.5" />
                                      {t('weight')}:
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <Input
                                        type="number"
                                        value={item.weight}
                                        onChange={(e) => {
                                          const updatedItems = items.map(i => 
                                            i.id === item.id ? {...i, weight: parseDecimal(e.target.value)} : i
                                          );
                                          setItems(updatedItems);
                                        }}
                                        onKeyDown={handleDecimalKeyDown}
                                        onFocus={(e) => e.target.select()}
                                        className="h-8 w-16 text-sm text-right font-medium border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-900 hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-400 focus:ring-2 focus:ring-blue-300/30 dark:focus:ring-blue-400/30 rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        step="0.01"
                                        min="0"
                                      />
                                      <Select
                                        value={item.weightUnit || 'kg'}
                                        onValueChange={(value: 'mg' | 'g' | 'kg' | 'oz' | 'lb') => {
                                          const updatedItems = items.map(i => 
                                            i.id === item.id ? {...i, weightUnit: value} : i
                                          );
                                          setItems(updatedItems);
                                        }}
                                      >
                                        <SelectTrigger className="h-8 w-16 text-xs border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-900 px-2 rounded-lg">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="mg">mg</SelectItem>
                                          <SelectItem value="g">g</SelectItem>
                                          <SelectItem value="kg">kg</SelectItem>
                                          <SelectItem value="oz">oz</SelectItem>
                                          <SelectItem value="lb">lb</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    {item.weight > 0 && item.quantity > 1 && (
                                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                        (= {(item.weight * item.quantity).toFixed(2)} {item.weightUnit || 'kg'} total)
                                      </span>
                                    )}
                                  </div>
                                </div>
                            
                                {/* Dimensions */}
                                {item.dimensions && (
                                  <div className={cn("text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-1.5", accentColors.selectedBg, accentColors.textAccent)}>
                                    <MapPin className="h-3.5 w-3.5" />
                                    {t('dimensions')}: {item.dimensions}
                                  </div>
                                )}
                                
                                {/* Notes */}
                                {item.notes && (
                                  <div className={cn("text-xs text-gray-600 dark:text-gray-400 bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 p-3 rounded-lg border-l-3", accentColors.borderAccent)}>
                                    {item.notes}
                                  </div>
                                )}
                                
                                {/* Nested Variants */}
                                {item.hasVariants && item.variantAllocations && item.variantAllocations.length > 0 && (
                                  <div className={cn("mt-3 border-l-3 pl-3 space-y-1.5 p-2 rounded-r-lg", accentColors.borderAccent, accentColors.selectedBg)}>
                                    <div className={cn("text-xs font-semibold flex items-center gap-1.5", accentColors.textAccent)}>
                                      <Package className={cn("h-3.5 w-3.5", accentColors.textAccent)} />
                                      {t('includedVariants', { count: item.variantAllocations.length })}
                                    </div>
                                    {item.variantAllocations.map((variant, vIdx) => (
                                      <div key={variant.variantId || vIdx} className={cn("flex items-center justify-between text-xs bg-white/60 dark:bg-gray-900/60 px-3 py-2 rounded-lg border border-slate-200/50 dark:border-slate-700/30")}>
                                        <span className="font-medium text-gray-800 dark:text-gray-200">{variant.variantName}</span>
                                        <div className={cn("flex items-center gap-2 font-medium", accentColors.textAccent)}>
                                          <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{t('qty')}: {variant.quantity}</span>
                                          <span className="bg-purple-100 dark:bg-purple-900/40 px-1.5 py-0.5 rounded">{variant.unitPrice.toFixed(2)} {purchaseCurrency}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </CollapsibleContent>
                            </div>
                          </div>
                        </div>
                      </Collapsible>
                    ))}
                    
                    {/* Mobile Totals */}
                    <div className={cn("p-4", accentColors.selectedBg)}>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-400 font-medium">{t('totalItems')}:</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">{totalQuantity}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className={cn("font-medium", accentColors.textAccent)}>{t('subtotal')}:</span>
                          <span className={cn("font-bold", accentColors.textAccent)}>{subtotal.toFixed(2)} {purchaseCurrency}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-purple-600 dark:text-purple-400 font-medium">{t('shipping')}:</span>
                          <span className="font-bold text-purple-700 dark:text-purple-300">{shippingCost.toFixed(2)} {purchaseCurrency}</span>
                        </div>
                        <div className="h-px bg-slate-200 dark:bg-slate-700 my-3" />
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">{t('totalWithShipping')}:</span>
                          <span className="font-bold text-lg bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">{grandTotalInPurchaseCurrency.toFixed(2)} {purchaseCurrency}</span>
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
                        <TableHead className="w-[80px] text-center">{t('qty')}</TableHead>
                        <TableHead className="w-[120px] text-right">{t('unitPrice')}</TableHead>
                        <TableHead className="w-[140px] text-right">{t('costWithShipping')}</TableHead>
                        <TableHead className="w-[120px] text-right">{t('total')}</TableHead>
                        <TableHead className="w-[48px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, index) => (
                        <Fragment key={item.id}>
                        <TableRow 
                          className={cn(
                            "hover:bg-muted/50 transition-colors",
                            index % 2 === 1 && "bg-muted/20",
                            selectedItems.includes(item.id) && "bg-primary/5",
                            item.hasVariants && item.variantAllocations && item.variantAllocations.length > 0 && "border-b-0"
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
                          
                          {/* Image Column - Clickable */}
                          <TableCell className="p-2">
                            <div 
                              className="w-12 h-12 rounded-md border bg-muted flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary hover:bg-muted/80 transition-all group relative"
                              onClick={() => {
                                setEditingItemImageId(item.id);
                                // Create a temporary input for this specific item
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = 'image/*';
                                input.onchange = (e) => {
                                  const file = (e.target as HTMLInputElement).files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = () => {
                                      const updatedItems = items.map(i => 
                                        i.id === item.id ? {...i, imageUrl: reader.result as string} : i
                                      );
                                      setItems(updatedItems);
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                };
                                input.click();
                              }}
                              title={t('clickToChangeImage')}
                            >
                              {item.imageUrl ? (
                                <img 
                                  src={item.imageUrl} 
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Package className="h-5 w-5 text-muted-foreground" />
                              )}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <ImageIcon className="h-4 w-4 text-white" />
                              </div>
                            </div>
                          </TableCell>
                          
                          {/* Item Details */}
                          <TableCell className="font-medium">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Input
                                  value={item.name}
                                  onChange={(e) => {
                                    const updatedItems = items.map(i => 
                                      i.id === item.id ? {...i, name: e.target.value} : i
                                    );
                                    setItems(updatedItems);
                                  }}
                                  onBlur={(e) => { e.target.scrollLeft = e.target.scrollWidth; }}
                                  className="h-7 text-sm font-medium border-0 bg-transparent hover:bg-muted hover:border hover:border-input/50 focus:bg-background focus:border-input focus:ring-2 focus:ring-primary/20 px-2 rounded transition-all flex-1"
                                  placeholder={t('itemName')}
                                />
                                {item.hasVariants && item.variantAllocations && item.variantAllocations.length > 0 && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className={cn(
                                      "h-6 px-2 text-xs shrink-0",
                                      expandedCards.includes(item.id) && "bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700"
                                    )}
                                    onClick={() => toggleCardExpand(item.id)}
                                  >
                                    {expandedCards.includes(item.id) ? (
                                      <ChevronUp className="h-3 w-3 mr-1" />
                                    ) : (
                                      <ChevronDown className="h-3 w-3 mr-1" />
                                    )}
                                    {item.variantAllocations.length} {t('variants')}
                                  </Button>
                                )}
                              </div>
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
                              onFocus={(e) => e.target.select()}
                              className="h-7 w-16 mx-auto text-sm text-center border-0 bg-transparent hover:bg-muted hover:border hover:border-input/50 focus:bg-background focus:border-input focus:ring-2 focus:ring-primary/20 rounded transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                                  const newPrice = parseDecimal(e.target.value);
                                  const updatedItems = items.map(i => 
                                    i.id === item.id ? {...i, unitPrice: newPrice, totalPrice: i.quantity * newPrice} : i
                                  );
                                  updateItemsWithShipping(updatedItems);
                                }}
                                onKeyDown={handleDecimalKeyDown}
                                onFocus={(e) => e.target.select()}
                                className="h-7 w-20 text-sm text-right border-0 bg-transparent hover:bg-muted focus:bg-background focus:border-input [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                step="0.01"
                                min="0"
                              />
                              <span className="text-xs text-muted-foreground">{purchaseCurrency}</span>
                            </div>
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
                          
                          {/* Total */}
                          <TableCell className="text-right">
                            <span className="font-medium text-sm">
                              {item.totalPrice.toFixed(2)} {purchaseCurrency}
                            </span>
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
                        {/* Variant Rows - Expanded as full table rows */}
                        {item.hasVariants && item.variantAllocations && item.variantAllocations.length > 0 && expandedCards.includes(item.id) && (
                          item.variantAllocations.map((variant, vIdx) => {
                            const variantTotal = variant.quantity * variant.unitPrice;
                            // Calculate shipping per unit from parent item (costWithShipping - unitPrice = shipping per unit)
                            const shippingPerUnit = item.costWithShipping - item.unitPrice;
                            // Variant cost with shipping = variant unit price + shipping per unit
                            const variantCostWithShipping = variant.unitPrice + shippingPerUnit;
                            const selectedCurrency = itemCurrencyDisplay[item.id] || purchaseCurrency;
                            const rate = exchangeRates[selectedCurrency] / exchangeRates[purchaseCurrency];
                            const convertedCost = variantCostWithShipping * rate;
                            
                            return (
                              <TableRow 
                                key={`${item.id}-variant-${variant.variantId || vIdx}`}
                                className="bg-purple-50/50 dark:bg-purple-950/20 !border-l-4 !border-l-purple-400 dark:!border-l-purple-600"
                              >
                                {/* Empty checkbox column */}
                                <TableCell className="p-2"></TableCell>
                                
                                {/* Empty image column with indent indicator */}
                                <TableCell className="p-2">
                                  <div className="w-12 h-8 flex items-center justify-center text-purple-500">
                                    <span className="text-lg">↳</span>
                                  </div>
                                </TableCell>
                                
                                {/* Variant Name */}
                                <TableCell className="font-medium">
                                  <div className="pl-2">
                                    <span className="text-sm text-purple-700 dark:text-purple-300">{variant.variantName}</span>
                                  </div>
                                </TableCell>
                                
                                {/* Variant Quantity */}
                                <TableCell className="text-center">
                                  <span className="text-sm font-medium">{variant.quantity}</span>
                                </TableCell>
                                
                                {/* Variant Unit Price */}
                                <TableCell className="text-right">
                                  <span className="text-sm">{variant.unitPrice.toFixed(2)} {purchaseCurrency}</span>
                                </TableCell>
                                
                                {/* Variant Cost with Shipping (proportional) */}
                                <TableCell className="text-right">
                                  <span className="text-green-600 text-sm">
                                    {convertedCost.toFixed(2)} {selectedCurrency}
                                  </span>
                                </TableCell>
                                
                                {/* Variant Total */}
                                <TableCell className="text-right">
                                  <span className="text-sm font-medium">{variantTotal.toFixed(2)} {purchaseCurrency}</span>
                                </TableCell>
                                
                                {/* Empty actions column */}
                                <TableCell className="p-2"></TableCell>
                              </TableRow>
                            );
                          })
                        )}
                        </Fragment>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={4} className="font-bold">{t('totals')}</TableCell>
                        <TableCell className="text-center font-bold">{totalQuantity}</TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-right font-bold text-green-600">
                          {grandTotalInPurchaseCurrency.toFixed(2)} {purchaseCurrency}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {subtotal.toFixed(2)} {purchaseCurrency}
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
          <Card className={cn("shadow-sm border-0 ring-1 overflow-hidden", accentColors.border)}>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", accentColors.selectedBg)}>
                  <Clock className={cn("h-5 w-5", accentColors.textAccent)} />
                </div>
                <div>
                  <CardTitle className="text-foreground">{t('orderStatus')}</CardTitle>
                </div>
              </div>
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
          <Card className={cn("shadow-sm border-0 ring-1 overflow-hidden", accentColors.border)}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", accentColors.selectedBg)}>
                    <Calculator className={cn("h-5 w-5", accentColors.textAccent)} />
                  </div>
                  <div>
                    <CardTitle className="text-foreground">{t('orderSummary')}</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      {purchaseCurrency} → {paymentCurrency}
                    </CardDescription>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
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
                    <span className="text-xs text-muted-foreground">{currencySymbol}{grandTotalInPurchaseCurrency.toFixed(2)}</span>
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
                {grandTotalInPaymentCurrency > 0 && (
                  <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-medium text-blue-800 dark:text-blue-200">{t('paymentProgress')}</span>
                      <span className={cn(
                        "text-xs font-semibold",
                        totalPaid >= grandTotalInPaymentCurrency ? "text-green-600 dark:text-green-400" : 
                        totalPaid > 0 ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400"
                      )}>
                        {t('percentPaid', { percent: Math.min(100, Math.round((totalPaid / grandTotalInPaymentCurrency) * 100)) })}
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(100, (totalPaid / grandTotalInPaymentCurrency) * 100)} 
                      className={cn(
                        "h-2",
                        totalPaid >= grandTotalInPaymentCurrency ? "[&>div]:bg-green-500" : 
                        totalPaid > 0 ? "[&>div]:bg-blue-500" : "[&>div]:bg-amber-500"
                      )}
                      data-testid="progress-payment"
                    />
                    {remainingBalance > 0 && (
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-blue-700 dark:text-blue-300">{t('remainingBalance')}</span>
                        <span className="text-xs font-medium text-blue-800 dark:text-blue-200">
                          {getCurrencySymbol(paymentCurrency)}{remainingBalance.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Landed Cost Breakdown */}
              {totalQuantity > 0 && grandTotalInPurchaseCurrency > 0 && (
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
                          style={{ width: `${grandTotalInPurchaseCurrency > 0 ? (subtotal / grandTotalInPurchaseCurrency) * 100 : 100}%` }}
                        />
                        <div 
                          className="bg-pink-400 dark:bg-pink-500 transition-all"
                          style={{ width: `${grandTotalInPurchaseCurrency > 0 ? (shippingInPurchaseCurrency / grandTotalInPurchaseCurrency) * 100 : 0}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center mt-2 text-xs">
                        <span className="flex items-center gap-1 text-purple-700 dark:text-purple-300">
                          <span className="h-2 w-2 rounded-full bg-purple-500" />
                          {t('productCostPercent', { percent: grandTotalInPurchaseCurrency > 0 ? Math.round((subtotal / grandTotalInPurchaseCurrency) * 100) : 100 })}
                        </span>
                        <span className="flex items-center gap-1 text-pink-600 dark:text-pink-400">
                          <span className="h-2 w-2 rounded-full bg-pink-400" />
                          {t('shippingCostPercent', { percent: grandTotalInPurchaseCurrency > 0 ? Math.round((shippingInPurchaseCurrency / grandTotalInPurchaseCurrency) * 100) : 0 })}
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
          <Card className={cn("shadow-sm border-0 ring-1 overflow-hidden", accentColors.border)} data-testid="card-currency-comparison">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", accentColors.selectedBg)}>
                  <DollarSign className={cn("h-5 w-5", accentColors.textAccent)} />
                </div>
                <div>
                  <CardTitle className="text-foreground">{t('currencyComparison')}</CardTitle>
                </div>
              </div>
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
                    {formatCurrency(grandTotalUSD, 'USD')}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Ship: {formatCurrency(shippingCostUSD, 'USD')}
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
                    {formatCurrency(convertFromUSD(grandTotalUSD, 'EUR'), 'EUR')}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Ship: {formatCurrency(convertFromUSD(shippingCostUSD, 'EUR'), 'EUR')}
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
                    {formatCurrency(convertFromUSD(grandTotalUSD, 'CZK'), 'CZK')}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Ship: {formatCurrency(convertFromUSD(shippingCostUSD, 'CZK'), 'CZK')}
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

      {/* Select Existing Variants Dialog */}
      <Dialog open={existingVariantsDialogOpen} onOpenChange={setExistingVariantsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('selectExistingVariants')}</DialogTitle>
            <DialogDescription>
              {t('selectVariantsToAdd', { name: selectedProduct?.name || currentItem.name })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Quick Entry Section */}
            <div className="space-y-2 border rounded-lg p-3 bg-muted/30">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">{t('quickEntry')}</Label>
                <span className="text-xs text-muted-foreground">{t('quickEntryHelp')}</span>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder={t('quickEntryPlaceholder')}
                  className="flex-1 font-mono text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const input = (e.target as HTMLInputElement).value;
                      if (!input.trim()) return;
                      
                      const newQuantities: {[key: string]: number} = {};
                      const newSelections: string[] = [...selectedExistingVariants];
                      
                      const segments = input.split(',').map(s => s.trim()).filter(Boolean);
                      for (const segment of segments) {
                        const match = segment.match(/^(\d+)\s*(?:[-–]\s*(\d+)\s*(?:pcs|lo|ks|pc)?)?$/i);
                        if (match) {
                          const variantNumber = match[1];
                          const quantity = match[2] ? parseInt(match[2]) : 1;
                          
                          const variant = existingVariants.find(v => {
                            const name = v.name?.toString() || '';
                            const barcode = v.barcode?.toString() || '';
                            const nameNumbers = name.match(/\d+/g);
                            return (
                              name === variantNumber ||
                              barcode === variantNumber ||
                              (nameNumbers && nameNumbers.includes(variantNumber))
                            );
                          });
                          
                          if (variant) {
                            newQuantities[variant.id] = (newQuantities[variant.id] || 0) + quantity;
                            if (!newSelections.includes(variant.id)) {
                              newSelections.push(variant.id);
                            }
                          }
                        }
                      }
                      
                      if (Object.keys(newQuantities).length > 0) {
                        setExistingVariantQuantities(prev => ({ ...prev, ...newQuantities }));
                        setSelectedExistingVariants(newSelections);
                        (e.target as HTMLInputElement).value = '';
                        toast({
                          title: t('success'),
                          description: t('variantsAddedFromQuickEntry', { count: Object.keys(newQuantities).length }),
                        });
                      }
                    }
                  }}
                  data-testid="input-quick-variant-entry"
                />
              </div>
            </div>
            
            {/* Set Quantity for All */}
            <div className="flex items-center gap-3 border rounded-lg p-3 bg-muted/30">
              <Label className="text-sm font-medium whitespace-nowrap">{t('setQuantityForAll')}</Label>
              <Input
                type="number"
                placeholder="1"
                className="w-20 h-8 text-center"
                min="1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const qty = parseInt((e.target as HTMLInputElement).value) || 1;
                    const allQuantities: {[key: string]: number} = {};
                    existingVariants.forEach(v => {
                      allQuantities[v.id] = qty;
                    });
                    setExistingVariantQuantities(allQuantities);
                    setSelectedExistingVariants(existingVariants.map(v => v.id));
                    toast({
                      title: t('success'),
                      description: t('quantitySetForAll', { qty, count: existingVariants.length }),
                    });
                  }
                }}
                data-testid="input-quantity-for-all"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const input = document.querySelector('[data-testid="input-quantity-for-all"]') as HTMLInputElement;
                  const qty = parseInt(input?.value) || 1;
                  const allQuantities: {[key: string]: number} = {};
                  existingVariants.forEach(v => {
                    allQuantities[v.id] = qty;
                  });
                  setExistingVariantQuantities(allQuantities);
                  setSelectedExistingVariants(existingVariants.map(v => v.id));
                  toast({
                    title: t('success'),
                    description: t('quantitySetForAll', { qty, count: existingVariants.length }),
                  });
                }}
                data-testid="button-apply-quantity-all"
              >
                {t('applyToAll')}
              </Button>
            </div>
            
            {/* Select All */}
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={selectedExistingVariants.length === existingVariants.length && existingVariants.length > 0}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedExistingVariants(existingVariants.map(v => v.id));
                    } else {
                      setSelectedExistingVariants([]);
                    }
                  }}
                />
                <span className="text-sm font-medium">
                  {selectedExistingVariants.length > 0 
                    ? t('selectedCount', { count: selectedExistingVariants.length })
                    : t('selectAll')}
                </span>
              </div>
              <span className="text-sm text-muted-foreground">
                {existingVariants.length} {t('variantsAvailable')}
              </span>
            </div>
            
            {/* Variants List */}
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {existingVariants.map((variant) => (
                <div 
                  key={variant.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                    selectedExistingVariants.includes(variant.id) 
                      ? "bg-primary/10 border-primary" 
                      : "hover:bg-muted/50"
                  )}
                >
                  <Checkbox
                    checked={selectedExistingVariants.includes(variant.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedExistingVariants([...selectedExistingVariants, variant.id]);
                        if (!existingVariantQuantities[variant.id]) {
                          setExistingVariantQuantities(prev => ({ ...prev, [variant.id]: 1 }));
                        }
                      } else {
                        setSelectedExistingVariants(selectedExistingVariants.filter(id => id !== variant.id));
                      }
                    }}
                    data-testid={`checkbox-existing-variant-${variant.id}`}
                  />
                  <div 
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => {
                      if (selectedExistingVariants.includes(variant.id)) {
                        setSelectedExistingVariants(selectedExistingVariants.filter(id => id !== variant.id));
                      } else {
                        setSelectedExistingVariants([...selectedExistingVariants, variant.id]);
                        if (!existingVariantQuantities[variant.id]) {
                          setExistingVariantQuantities(prev => ({ ...prev, [variant.id]: 1 }));
                        }
                      }
                    }}
                  >
                    <div className="font-medium text-sm">{variant.name}</div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                      {variant.sku && (
                        <span className="bg-muted px-1.5 py-0.5 rounded">
                          {variant.sku}
                        </span>
                      )}
                      {variant.barcode && (
                        <span className="flex items-center gap-1">
                          <Barcode className="h-3 w-3" />
                          {variant.barcode}
                        </span>
                      )}
                      {variant.locationCode && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {variant.locationCode}
                        </span>
                      )}
                      <span className={cn(
                        "px-1.5 py-0.5 rounded",
                        (variant.quantity || 0) > 10 ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" :
                        (variant.quantity || 0) > 0 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" :
                        "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                      )}>
                        {t('inStock')}: {variant.quantity || 0}
                      </span>
                    </div>
                  </div>
                  
                  {/* Quantity Input */}
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">{t('qty')}:</Label>
                    <Input
                      type="number"
                      value={existingVariantQuantities[variant.id] || 1}
                      onChange={(e) => {
                        const qty = parseInt(e.target.value) || 1;
                        setExistingVariantQuantities(prev => ({ ...prev, [variant.id]: qty }));
                        if (!selectedExistingVariants.includes(variant.id) && qty > 0) {
                          setSelectedExistingVariants([...selectedExistingVariants, variant.id]);
                        }
                      }}
                      onFocus={(e) => e.target.select()}
                      onClick={(e) => e.stopPropagation()}
                      className="h-7 w-16 text-center text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      min="1"
                      data-testid={`input-existing-variant-qty-${variant.id}`}
                    />
                  </div>
                  
                  {(variant.importCostUsd || variant.importCostEur || variant.importCostCzk) && (
                    <div className="text-right">
                      <div className="text-sm font-medium text-green-600">
                        {variant.importCostUsd && `$${parseFloat(variant.importCostUsd).toFixed(2)}`}
                        {!variant.importCostUsd && variant.importCostEur && `€${parseFloat(variant.importCostEur).toFixed(2)}`}
                        {!variant.importCostUsd && !variant.importCostEur && variant.importCostCzk && `${parseFloat(variant.importCostCzk).toFixed(0)} CZK`}
                      </div>
                      <div className="text-xs text-muted-foreground">{t('lastCost')}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setExistingVariantsDialogOpen(false);
              setSelectedExistingVariants([]);
            }}>
              {t('cancel')}
            </Button>
            <Button 
              onClick={addExistingVariantsToList}
              disabled={selectedExistingVariants.length === 0}
            >
              <Plus className="h-4 w-4 mr-1" />
              {t('addSelected')} ({selectedExistingVariants.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Single Variant Dialog */}
      <Dialog open={variantDialogOpen} onOpenChange={setVariantDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('addProductVariant')}</DialogTitle>
            <DialogDescription>
              {t('addVariantFor', { name: currentItem.name })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Variant Image Upload */}
            <div className="flex justify-center">
              <div 
                className="w-24 h-24 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-muted/40 transition-all overflow-hidden"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => {
                        setNewVariant({...newVariant, imageUrl: reader.result as string});
                      };
                      reader.readAsDataURL(file);
                    }
                  };
                  input.click();
                }}
                data-testid="variant-image-upload"
              >
                {newVariant.imageUrl ? (
                  <img src={newVariant.imageUrl} alt="Variant" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <ImageIcon className="h-6 w-6 text-muted-foreground mb-1" />
                    <span className="text-xs text-muted-foreground">{t('variantImage')}</span>
                  </>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>{t('variantName')} *</Label>
              <Input
                value={newVariant.name}
                onChange={(e) => setNewVariant({...newVariant, name: e.target.value})}
                placeholder={t('variantNameExample')}
                data-testid="input-new-variant-name"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('sku')}</Label>
              <Input
                value={newVariant.sku}
                onChange={(e) => setNewVariant({...newVariant, sku: e.target.value})}
                placeholder={t('optionalSKU')}
                data-testid="input-new-variant-sku"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('quantity')}</Label>
                <Input
                  type="number"
                  value={newVariant.quantity}
                  onChange={(e) => setNewVariant({...newVariant, quantity: parseInt(e.target.value) || 1})}
                  onFocus={(e) => e.target.select()}
                  min="1"
                  data-testid="input-new-variant-qty"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('unitPrice')}</Label>
                <DecimalInput
                  value={newVariant.unitPrice}
                  onChange={(val) => setNewVariant({...newVariant, unitPrice: val})}
                  min="0"
                  data-testid="input-new-variant-price"
                />
              </div>
            </div>
            
            {/* Weight with unit (optional - inherits from parent if empty) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                {t('weight')}
                <span className="text-xs text-muted-foreground">({t('optional')})</span>
              </Label>
              <div className="flex gap-2">
                <DecimalInput
                  value={newVariant.weight ?? ''}
                  onChange={(val) => setNewVariant({...newVariant, weight: val || undefined})}
                  placeholder={t('inheritsFromParent')}
                  className="flex-1"
                  min="0"
                  data-testid="input-new-variant-weight"
                />
                <Select
                  value={newVariant.weightUnit || 'kg'}
                  onValueChange={(value) => setNewVariant({...newVariant, weightUnit: value})}
                >
                  <SelectTrigger className="w-[70px]" data-testid="select-new-variant-weight-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mg">mg</SelectItem>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="kg">kg</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Dimensions with unit (optional - inherits from parent if empty) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                {t('dimensions')}
                <span className="text-xs text-muted-foreground">({t('optional')})</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  value={newVariant.dimensions || ''}
                  onChange={(e) => setNewVariant({...newVariant, dimensions: e.target.value || undefined})}
                  placeholder={t('dimensionsPlaceholder')}
                  className="flex-1"
                  data-testid="input-new-variant-dimensions"
                />
                <Select
                  value={newVariant.dimensionsUnit || 'cm'}
                  onValueChange={(value) => setNewVariant({...newVariant, dimensionsUnit: value})}
                >
                  <SelectTrigger className="w-[70px]" data-testid="select-new-variant-dimensions-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mm">mm</SelectItem>
                    <SelectItem value="cm">cm</SelectItem>
                    <SelectItem value="m">m</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVariantDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={addVariant} disabled={!newVariant.name.trim()}>
              {t('addVariant')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Series Dialog */}
      <Dialog open={seriesDialogOpen} onOpenChange={setSeriesDialogOpen}>
        <DialogContent className="max-w-md">
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
                data-testid="input-series-pattern"
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
                  onFocus={(e) => e.target.select()}
                  min="1"
                  data-testid="input-series-quantity"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('unitPriceLabel')}</Label>
                <DecimalInput
                  value={seriesUnitPrice}
                  onChange={(val) => setSeriesUnitPrice(val)}
                  min="0"
                  data-testid="input-series-unit-price"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
              {t('seriesInheritsParent')}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSeriesDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={addVariantSeries} disabled={!seriesInput.trim()}>
              {t('createSeries')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Quick Selection Dialog */}
      <Dialog open={quickSelectDialogOpen} onOpenChange={setQuickSelectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('quickSelection')}</DialogTitle>
            <DialogDescription>
              {t('quickSelectionDescription', { count: variants.length })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('variantPattern')}</Label>
              <Input
                value={quickSelectPattern}
                onChange={(e) => setQuickSelectPattern(e.target.value)}
                placeholder="4,5,6,7,33,67 or 20-60"
                data-testid="input-quick-select-pattern"
              />
              <p className="text-xs text-muted-foreground">
                {t('patternHelp')}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('quantityPerVariant')}</Label>
                <Input
                  type="number"
                  value={quickSelectQuantity}
                  onChange={(e) => setQuickSelectQuantity(parseInt(e.target.value) || 1)}
                  onFocus={(e) => e.target.select()}
                  min="1"
                  data-testid="input-quick-select-quantity"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('unitPriceLabel')}</Label>
                <DecimalInput
                  value={quickSelectUnitPrice}
                  onChange={(val) => setQuickSelectUnitPrice(val)}
                  min="0"
                  data-testid="input-quick-select-unit-price"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
              {quickSelectPattern.trim() 
                ? t('quickSelectionPatternHelp', { count: parseQuickSelectPattern(quickSelectPattern).length })
                : t('quickSelectionHelp')}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setQuickSelectDialogOpen(false);
              setQuickSelectPattern("");
            }}>
              {t('cancel')}
            </Button>
            <Button onClick={applyQuickSelection} disabled={variants.length === 0}>
              <Zap className="h-4 w-4 mr-2" />
              {quickSelectPattern.trim() 
                ? t('applyToSelected', { count: parseQuickSelectPattern(quickSelectPattern).length })
                : t('applyToAll', { count: variants.length })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Paste Barcode List Dialog */}
      <Dialog open={barcodePasteDialogOpen} onOpenChange={setBarcodePasteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('pasteBarcodeList')}</DialogTitle>
            <DialogDescription>
              {t('pasteBarcodeListDescription', { count: variants.length })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={barcodePasteText}
              onChange={(e) => setBarcodePasteText(e.target.value)}
              placeholder={t('pasteBarcodeListPlaceholder')}
              className="min-h-[200px] font-mono text-sm"
              data-testid="textarea-paste-barcodes"
            />
            <p className="text-xs text-muted-foreground">
              {t('barcodesInList', { count: barcodePasteText.split('\n').filter(b => b.trim()).length })}
            </p>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setBarcodePasteDialogOpen(false);
                setBarcodePasteText("");
              }}
            >
              {t('cancel')}
            </Button>
            <Button 
              onClick={applyBarcodesToVariants}
              disabled={!barcodePasteText.trim()}
              data-testid="button-apply-barcodes"
            >
              <ClipboardPaste className="h-4 w-4 mr-2" />
              {t('applyBarcodes')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Quick Fill List Dialog */}
      <Dialog open={quickFillDialogOpen} onOpenChange={setQuickFillDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {quickFillField === 'quantity' ? t('pasteQtyList') : t('pasteCostList')}
            </DialogTitle>
            <DialogDescription>
              {t('quickFillListDescription', { 
                field: quickFillField === 'quantity' ? t('qty') : t('cost'),
                count: selectedVariants.length > 0 ? selectedVariants.length : variants.length 
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={quickFillListText}
              onChange={(e) => setQuickFillListText(e.target.value)}
              placeholder={quickFillField === 'quantity' 
                ? "23, 12, 5, 10, 8, 15\n50\n25" 
                : "1.50, 2.00, 0.99, 3.50\n2.25\n1.75"}
              className="min-h-[150px] font-mono text-sm"
              data-testid="textarea-quick-fill-list"
            />
            <p className="text-xs text-muted-foreground">
              {t('valuesInList', { 
                count: quickFillListText.split(/[,\n\t]/).filter(v => v.trim()).length 
              })}
            </p>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setQuickFillDialogOpen(false);
                setQuickFillListText("");
              }}
            >
              {t('cancel')}
            </Button>
            <Button 
              onClick={applyListToSelectedVariants}
              disabled={!quickFillListText.trim()}
              data-testid="button-apply-quick-fill-list"
            >
              <ClipboardList className="h-4 w-4 mr-2" />
              {t('applyValues')}
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