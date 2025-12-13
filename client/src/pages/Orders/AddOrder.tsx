import { useState, useEffect, useMemo, useRef, useCallback, Fragment } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { useTranslation } from 'react-i18next';
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { FixedSizeList as List } from "react-window";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MathInput } from "@/components/ui/math-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { fuzzySearch } from "@/lib/fuzzySearch";
import { formatCurrency, getCurrencyByCountry } from "@/lib/currencyUtils";
import { isUnauthorizedError } from "@/lib/authUtils";
import { calculateShippingCost } from "@/lib/shippingCosts";
import { useOrderDefaults, useFinancialDefaults } from "@/hooks/useAppSettings";
import { useSettings } from "@/contexts/SettingsContext";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import OrderDocumentSelector from "@/components/OrderDocumentSelector";
import { ShippingAddressModal } from "@/components/ShippingAddressModal";
import { CustomerBadges } from '@/components/CustomerBadges';
import { 
  Plus, 
  Search, 
  Trash2, 
  ShoppingCart, 
  X, 
  CheckCircle,
  ArrowLeft,
  Save,
  User,
  UserPlus,
  Package,
  Truck,
  CreditCard,
  Banknote,
  FileText,
  AlertCircle,
  MapPin,
  Phone,
  Mail,
  Building,
  Hash,
  Calculator,
  Percent,
  Copy,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  ArrowUpCircle,
  MessageSquare,
  Box,
  Weight,
  Loader2,
  Upload,
  Download,
  Pencil,
  Wrench,
  Star,
  Award,
  Clock,
  Settings,
  MoreVertical,
  Globe,
  Store,
  ShoppingBag,
  Building2,
  Gift,
  Eye,
  EyeOff,
  Check
} from "lucide-react";
import { SiFacebook } from "react-icons/si";
import MarginPill from "@/components/orders/MarginPill";
import { AICartonPackingPanel } from "@/components/orders/AICartonPackingPanel";
import { usePackingOptimization } from "@/hooks/usePackingOptimization";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Helper function to normalize carrier names for backward compatibility
const normalizeCarrier = (value: string): string => {
  const map: Record<string, string> = {
    'PPL': 'PPL CZ',
    'GLS': 'GLS DE',
    'DHL': 'DHL DE',
    'PPL CZ': 'PPL CZ',
    'GLS DE': 'GLS DE',
    'DHL DE': 'DHL DE',
  };
  return map[value] || value;
};

// Helper function to extract Facebook ID or username from URL
const extractFacebookId = (input: string): string | null => {
  if (!input) return null;
  
  // Check if input looks like a Facebook URL
  const facebookUrlPattern = /(?:https?:\/\/)?(?:www\.|m\.)?facebook\.com\//i;
  if (!facebookUrlPattern.test(input)) return null;
  
  try {
    // Pattern 1: profile.php?id=12345
    const numericIdMatch = input.match(/profile\.php\?id=(\d+)/);
    if (numericIdMatch) {
      return numericIdMatch[1];
    }
    
    // Pattern 2: facebook.com/username or facebook.com/pages/name/id
    const usernameMatch = input.match(/facebook\.com\/([^/?&#]+)/);
    if (usernameMatch && usernameMatch[1]) {
      const username = usernameMatch[1];
      // Exclude common paths that aren't usernames
      const excludedPaths = ['profile.php', 'pages', 'groups', 'events', 'marketplace', 'watch', 'gaming'];
      if (!excludedPaths.includes(username.toLowerCase())) {
        return username;
      }
    }
  } catch (error) {
    console.error('Error extracting Facebook ID:', error);
  }
  
  return null;
};

const addOrderSchema = z.object({
  customerId: z.string().optional(),
  orderType: z.enum(['pos', 'ord', 'web', 'tel']).default('ord'),
  currency: z.enum(['CZK', 'EUR', 'USD', 'VND', 'CNY']),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  orderStatus: z.enum(['pending', 'to_fulfill', 'shipped']).default('pending'),
  paymentStatus: z.enum(['pending', 'paid', 'pay_later']).default('pending'),
  shippingMethod: z.enum(['PPL', 'PPL CZ', 'GLS', 'GLS DE', 'DHL', 'DHL DE', 'DPD']).transform(normalizeCarrier).optional(),
  paymentMethod: z.enum(['Bank Transfer', 'PayPal', 'COD', 'Cash', 'Transfer'], {
    errorMap: () => ({ message: 'Please select a valid payment method: Bank Transfer, PayPal, COD, or Cash' })
  }).transform(val => val === 'Transfer' ? 'Bank Transfer' : val).optional(),
  discountType: z.enum(['flat', 'rate']).default('flat'),
  discountValue: z.coerce.number().min(0).default(0),
  // Tax Invoice fields
  taxInvoiceEnabled: z.boolean().default(false),
  // CZK fields
  ico: z.string().optional(),
  dic: z.string().optional(),
  nameAndAddress: z.string().optional(),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  // EUR fields
  vatId: z.string().optional(),
  country: z.string().optional(),
  shippingCost: z.coerce.number().min(0).default(0),
  actualShippingCost: z.coerce.number().min(0).default(0),
  adjustment: z.coerce.number().default(0),
  // Dobírka (Cash on Delivery) fields
  codAmount: z.coerce.number().min(0).optional().nullable(),
  codCurrency: z.enum(['CZK', 'EUR', 'USD']).optional().nullable(),
  notes: z.string().optional(),
  saleType: z.enum(['retail', 'wholesale']).default('retail'),
});

interface OrderItem {
  id: string;
  productId?: string;
  serviceId?: string;
  variantId?: string;
  variantName?: string;
  bundleId?: string;
  productName: string;
  sku: string;
  quantity: number;
  price: number;
  discount: number;
  discountPercentage: number;
  tax: number;
  total: number;
  landingCost?: number | null;
  image?: string | null;
  notes?: string | null;
  appliedDiscountId?: number | null;
  appliedDiscountLabel?: string | null;
  appliedDiscountType?: string | null;
  appliedDiscountScope?: string | null;
  freeItemsCount?: number;
  buyXGetYBuyQty?: number;
  buyXGetYGetQty?: number;
  categoryId?: string | null;
  isFreeItem?: boolean;
  originalPrice?: number;
  isServicePart?: boolean;
  isBulkCarton?: boolean;
  bulkUnitName?: string;
  bulkUnitQty?: number;
}

interface BuyXGetYAllocation {
  discountId: number;
  discountName: string;
  categoryId: string | null;
  categoryName?: string;
  buyQty: number;
  getQty: number;
  totalPaidItems: number;
  freeItemsEarned: number;
  freeItemsAssigned: number;
  remainingFreeSlots: number;
}

// Helper function to get country flag emoji
const getCountryFlag = (country: string | null | undefined): string => {
  if (!country) return '';
  
  const normalizedCountry = country.toLowerCase();
  
  const countryFlagMap: Record<string, string> = {
    'czechia': '🇨🇿',
    'czech republic': '🇨🇿',
    'česko': '🇨🇿',
    'česká republika': '🇨🇿',
    'cesko': '🇨🇿',
    'ceska republika': '🇨🇿',
    'germany': '🇩🇪',
    'deutschland': '🇩🇪',
    'německo': '🇩🇪',
    'nemecko': '🇩🇪',
    'austria': '🇦🇹',
    'österreich': '🇦🇹',
    'osterreich': '🇦🇹',
    'rakousko': '🇦🇹',
    'vietnam': '🇻🇳',
    'viet nam': '🇻🇳',
    'poland': '🇵🇱',
    'polska': '🇵🇱',
    'polsko': '🇵🇱',
    'slovakia': '🇸🇰',
    'slovensko': '🇸🇰',
    'hungary': '🇭🇺',
    'magyarország': '🇭🇺',
    'magyarorszag': '🇭🇺',
    'maďarsko': '🇭🇺',
    'madarsko': '🇭🇺',
    'united states': '🇺🇸',
    'usa': '🇺🇸',
    'us': '🇺🇸',
    'united kingdom': '🇬🇧',
    'uk': '🇬🇧',
    'britain': '🇬🇧',
    'great britain': '🇬🇧',
    'france': '🇫🇷',
    'francie': '🇫🇷',
    'frankreich': '🇫🇷',
    'italy': '🇮🇹',
    'italia': '🇮🇹',
    'itálie': '🇮🇹',
    'italie': '🇮🇹',
    'spain': '🇪🇸',
    'españa': '🇪🇸',
    'espana': '🇪🇸',
    'španělsko': '🇪🇸',
    'spanelsko': '🇪🇸',
    'netherlands': '🇳🇱',
    'holland': '🇳🇱',
    'niederlande': '🇳🇱',
    'nizozemsko': '🇳🇱',
    'belgium': '🇧🇪',
    'belgië': '🇧🇪',
    'belgie': '🇧🇪',
    'belgien': '🇧🇪',
    'switzerland': '🇨🇭',
    'schweiz': '🇨🇭',
    'suisse': '🇨🇭',
    'svizzera': '🇨🇭',
    'švýcarsko': '🇨🇭',
    'svycarsko': '🇨🇭',
    'china': '🇨🇳',
    'čína': '🇨🇳',
    'cina': '🇨🇳',
    'russia': '🇷🇺',
    'rusko': '🇷🇺',
    'russland': '🇷🇺',
    'denmark': '🇩🇰',
    'dánsko': '🇩🇰',
    'dansko': '🇩🇰',
    'dänemark': '🇩🇰',
    'sweden': '🇸🇪',
    'švédsko': '🇸🇪',
    'svedsko': '🇸🇪',
    'schweden': '🇸🇪',
    'norway': '🇳🇴',
    'norsko': '🇳🇴',
    'norwegen': '🇳🇴',
    'finland': '🇫🇮',
    'finsko': '🇫🇮',
    'finnland': '🇫🇮',
    'portugal': '🇵🇹',
    'portugalsko': '🇵🇹',
    'greece': '🇬🇷',
    'řecko': '🇬🇷',
    'recko': '🇬🇷',
    'griechenland': '🇬🇷',
    'croatia': '🇭🇷',
    'chorvatsko': '🇭🇷',
    'kroatien': '🇭🇷',
    'romania': '🇷🇴',
    'rumunsko': '🇷🇴',
    'rumänien': '🇷🇴',
    'bulgaria': '🇧🇬',
    'bulharsko': '🇧🇬',
    'bulgarien': '🇧🇬',
  };
  
  return countryFlagMap[normalizedCountry] || '🌍';
};

export default function AddOrder() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation(['orders', 'common']);
  const [showTaxInvoice, setShowTaxInvoice] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const { toast } = useToast();
  const { user, canViewProfit, canViewMargin, canViewImportCost } = useAuth();
  const canAccessFinancialData = canViewProfit || canViewMargin;
  const { defaultCurrency, defaultPaymentMethod, defaultCarrier, enableCod } = useOrderDefaults();
  const { generalSettings, financialHelpers, shippingSettings } = useSettings();
  const aiCartonPackingEnabled = generalSettings?.enableAiCartonPacking ?? true;
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [buyXGetYAllocations, setBuyXGetYAllocations] = useState<BuyXGetYAllocation[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedProductIndex, setSelectedProductIndex] = useState(0);
  
  const productSearchRef = useRef<HTMLInputElement>(null);
  const customerSearchRef = useRef<HTMLInputElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const [barcodeScanMode, setBarcodeScanMode] = useState(false);
  const [debouncedProductSearch, setDebouncedProductSearch] = useState("");
  const [debouncedCustomerSearch, setDebouncedCustomerSearch] = useState("");
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [selectedShippingAddress, setSelectedShippingAddress] = useState<any>(null);
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any>(null);
  
  // Variant/Bundle selection state
  const [showVariantDialog, setShowVariantDialog] = useState(false);
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<any>(null);
  const [productVariants, setProductVariants] = useState<any[]>([]);
  const [variantQuantities, setVariantQuantities] = useState<{[key: string]: number}>({});
  const [quickVariantInput, setQuickVariantInput] = useState("");
  
  // Parse quick variant input like "23, 43-5, 67-2" or "23, 43 - 5 pcs, 67 - 2"
  const parseQuickVariantInput = useCallback((input: string) => {
    if (!input.trim() || productVariants.length === 0) return;
    
    const newQuantities: {[key: string]: number} = {};
    
    // Split by comma and process each segment
    const segments = input.split(',').map(s => s.trim()).filter(Boolean);
    
    for (const segment of segments) {
      // Match patterns like: "23", "23-5", "23 - 5", "23 - 5pcs", "23 - 5 lo", "23-5pcs"
      const match = segment.match(/^(\d+)\s*(?:[-–]\s*(\d+)\s*(?:pcs|lo|ks|pc)?)?$/i);
      
      if (match) {
        const variantNumber = match[1];
        const quantity = match[2] ? parseInt(match[2]) : 1;
        
        // Find variant by matching number in name (e.g., "Color 23" matches "23")
        // Or by exact name match, or by barcode
        const variant = productVariants.find(v => {
          const name = v.name?.toString() || '';
          const barcode = v.barcode?.toString() || '';
          // Extract numbers from variant name
          const nameNumbers = name.match(/\d+/g);
          return (
            name === variantNumber ||
            barcode === variantNumber ||
            (nameNumbers && nameNumbers.includes(variantNumber))
          );
        });
        
        if (variant) {
          newQuantities[variant.id] = (newQuantities[variant.id] || 0) + quantity;
        }
      }
    }
    
    if (Object.keys(newQuantities).length > 0) {
      setVariantQuantities(prev => ({ ...prev, ...newQuantities }));
      setQuickVariantInput("");
    }
  }, [productVariants]);
  
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    facebookName: "",
    facebookUrl: "",
    email: "",
    phone: "",
    street: "",
    streetNumber: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
    company: "",
    firstName: "",
    lastName: "",
    pickupPoint: "",
    type: "regular"
  });
  
  // Track if Facebook Name has been manually edited
  const [facebookNameManuallyEdited, setFacebookNameManuallyEdited] = useState(false);
  
  const [rawNewCustomerAddress, setRawNewCustomerAddress] = useState("");

  const [addressAutocomplete, setAddressAutocomplete] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);

  // Shipping address autocomplete (separate from customer form)

  // Quick customer form states
  const [quickCustomerType, setQuickCustomerType] = useState<'quick' | 'tel' | 'msg' | 'custom' | null>(null);
  const [quickCustomerName, setQuickCustomerName] = useState("");
  const [quickCustomerPhone, setQuickCustomerPhone] = useState("");
  const [quickCustomerSocialApp, setQuickCustomerSocialApp] = useState<'viber' | 'whatsapp' | 'zalo' | 'email'>('whatsapp');

  // Order ID state
  const [orderId, setOrderId] = useState<string | null>(null);
  
  // Track if changes were made after order creation
  const [hasChangesAfterSave, setHasChangesAfterSave] = useState(false);
  
  // Ref to track saved order items for change detection
  const savedOrderItemsRef = useRef<string>('');
  
  // Helper to mark changes after save
  const markChangesAfterSave = useCallback(() => {
    if (orderId) {
      setHasChangesAfterSave(true);
    }
  }, [orderId]);
  
  // Ref to track customer creation in progress to prevent duplicates
  const customerCreationInProgress = useRef<Promise<string | null> | null>(null);
  const createdCustomerIdRef = useRef<string | null>(null);
  
  // Reset customer creation refs when selected customer changes
  useEffect(() => {
    createdCustomerIdRef.current = null;
    customerCreationInProgress.current = null;
  }, [selectedCustomer?.id, selectedCustomer?.name, selectedCustomer?.phone]);

  // Shipping notes state
  const [editingNoteItemId, setEditingNoteItemId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  // Packing optimization hook
  const { 
    packingPlan, 
    setPackingPlan, 
    runPackingOptimization: runOptimization,
    savePackingPlanMutation,
    isLoading: isPackingOptimizationLoading 
  } = usePackingOptimization(orderId ?? undefined, aiCartonPackingEnabled);

  // Clear AI packing data when AI is disabled (redundant safety layer)
  useEffect(() => {
    if (!aiCartonPackingEnabled && packingPlan) {
      setPackingPlan(null);
    }
  }, [aiCartonPackingEnabled, packingPlan, setPackingPlan]);

  // File upload state
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  // Column visibility toggles
  const [showVatColumn, setShowVatColumn] = useState(false);
  const [showDiscountColumn, setShowDiscountColumn] = useState(false);
  const [showCostInfo, setShowCostInfo] = useState(false);
  const [showProfitInfo, setShowProfitInfo] = useState(false);

  // Out-of-stock warning dialog state
  const [outOfStockDialogOpen, setOutOfStockDialogOpen] = useState(false);
  const [pendingOutOfStockProduct, setPendingOutOfStockProduct] = useState<any>(null);
  const [alwaysAllowOutOfStock, setAlwaysAllowOutOfStock] = useState(() => {
    // Load preference from localStorage
    if (typeof window !== 'undefined') {
      return localStorage.getItem('alwaysAllowOutOfStock') === 'true';
    }
    return false;
  });

  // Auto-enable discount column only for manual discounts (not Buy X Get Y offers)
  useEffect(() => {
    const hasManualDiscounts = orderItems.some(item => 
      item.discountPercentage > 0 || 
      (item.discount > 0 && item.appliedDiscountType !== 'buy_x_get_y') || 
      (item.appliedDiscountLabel && item.appliedDiscountType !== 'buy_x_get_y')
    );
    if (hasManualDiscounts && !showDiscountColumn) {
      setShowDiscountColumn(true);
    }
  }, [orderItems, showDiscountColumn]);

  // Fetch real addresses from geocoding API
  const fetchRealAddresses = async (query: string): Promise<any[]> => {
    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch addresses');
      }
      const data = await response.json();

      // Transform the response to match our format
      return data.map((item: any) => ({
        formatted: item.formatted,
        street: `${item.street} ${item.houseNumber}`.trim() || item.street,
        city: item.city,
        state: item.state,
        zipCode: item.zipCode,
        country: item.country,
      }));
    } catch (error) {
      console.error('Error fetching addresses:', error);
      return [];
    }
  };

  // Remove the old mock addresses array
  const mockAddressDatabase = [
    // Czech Republic addresses
    { 
      formatted: "Dragounská 2545/9A, 350 02 Cheb, Czechia",
      street: "Dragounská 2545/9A",
      city: "Cheb",
      state: "Karlovarský kraj",
      zipCode: "350 02",
      country: "Czechia"
    },
    { 
      formatted: "Dragounská 150, 350 02 Cheb, Czechia",
      street: "Dragounská 150",
      city: "Cheb",
      state: "Karlovarský kraj",
      zipCode: "350 02",
      country: "Czechia"
    },
    {
      formatted: "Palackého náměstí 2, 301 00 Plzeň, Czechia",
      street: "Palackého náměstí 2",
      city: "Plzeň",
      state: "Plzeňský kraj",
      zipCode: "301 00",
      country: "Czechia"
    },
    {
      formatted: "Wenceslas Square 785/36, 110 00 Praha 1, Czechia",
      street: "Wenceslas Square 785/36",
      city: "Praha 1",
      state: "Praha",
      zipCode: "110 00",
      country: "Czechia"
    },
    {
      formatted: "Václavské náměstí 785/36, 110 00 Praha 1, Czechia",
      street: "Václavské náměstí 785/36",
      city: "Praha 1",
      state: "Praha",
      zipCode: "110 00",
      country: "Czechia"
    },
    {
      formatted: "Karlova 1, 110 00 Praha 1, Czechia",
      street: "Karlova 1",
      city: "Praha 1",
      state: "Praha",
      zipCode: "110 00",
      country: "Czechia"
    },
    {
      formatted: "Nerudova 19, 118 00 Praha 1, Czechia",
      street: "Nerudova 19",
      city: "Praha 1",
      state: "Praha",
      zipCode: "118 00",
      country: "Czechia"
    },
    {
      formatted: "Masarykova 28, 602 00 Brno, Czechia",
      street: "Masarykova 28",
      city: "Brno",
      state: "Jihomoravský kraj",
      zipCode: "602 00",
      country: "Czechia"
    },
    {
      formatted: "Náměstí Svobody 1, 602 00 Brno, Czechia",
      street: "Náměstí Svobody 1",
      city: "Brno",
      state: "Jihomoravský kraj",
      zipCode: "602 00",
      country: "Czechia"
    },
    // Germany addresses
    {
      formatted: "Hans-Bredow-Straße 19, 28307 Bremen, Germany",
      street: "Hans-Bredow-Straße 19",
      city: "Bremen",
      state: "Bremen",
      zipCode: "28307",
      country: "Germany"
    },
    {
      formatted: "Alexanderplatz 1, 10178 Berlin, Germany",
      street: "Alexanderplatz 1",
      city: "Berlin",
      state: "Berlin",
      zipCode: "10178",
      country: "Germany"
    },
    // Austria addresses
    {
      formatted: "Stephansplatz 1, 1010 Wien, Austria",
      street: "Stephansplatz 1",
      city: "Wien",
      state: "Wien",
      zipCode: "1010",
      country: "Austria"
    }
  ];

  // Function to search addresses using real geocoding API
  const searchAddresses = async (query: string) => {
    if (!query || query.length < 3) {
      setAddressSuggestions([]);
      setShowAddressDropdown(false);
      return;
    }

    setIsLoadingAddresses(true);
    setShowAddressDropdown(true);

    try {
      const results = await fetchRealAddresses(query);
      setAddressSuggestions(results);
    } catch (error) {
      console.error('Error searching addresses:', error);
      setAddressSuggestions([]);
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  // Function to select an address from suggestions
  const selectAddress = (suggestion: any) => {
    // Split street into street name and number
    const streetParts = suggestion.street.trim().split(/\s+/);
    const lastPart = streetParts[streetParts.length - 1];
    const hasNumber = /\d/.test(lastPart);
    
    const streetName = hasNumber ? streetParts.slice(0, -1).join(' ') : suggestion.street;
    const streetNumber = hasNumber ? lastPart : '';
    
    setNewCustomer(prev => ({
      ...prev,
      street: streetName,
      streetNumber: streetNumber,
      city: suggestion.city,
      state: suggestion.state,
      zipCode: suggestion.zipCode,
      country: suggestion.country,
    }));
    setAddressAutocomplete(suggestion.formatted);
    setShowAddressDropdown(false);
    setAddressSuggestions([]);
  };

  // Helper function to build default values for the form
  const buildDefaultValues = useCallback(() => {
    return {
      orderType: 'ord' as const,
      currency: (defaultCurrency || 'CZK') as any,
      priority: 'medium' as const,
      orderStatus: 'pending' as const,
      paymentStatus: 'pending' as const,
      paymentMethod: (defaultPaymentMethod || 'Bank Transfer') as any,
      shippingMethod: (defaultCarrier || 'GLS DE') as any,
      discountValue: 0,
      taxRate: financialHelpers.getDefaultTaxRate(defaultCurrency || 'CZK') * 100,
      shippingCost: 0,
      actualShippingCost: 0,
      adjustment: 0,
      saleType: 'retail',
    };
  }, [defaultCurrency, defaultPaymentMethod, defaultCarrier, financialHelpers]);

  const form = useForm<z.infer<typeof addOrderSchema>>({
    resolver: zodResolver(addOrderSchema),
    defaultValues: buildDefaultValues(),
  });

  // Track if initial reset has happened
  const hasResetRef = useRef(false);

  // Reset form with proper defaults after settings finish loading (once only)
  useEffect(() => {
    if (!hasResetRef.current && defaultCurrency && defaultPaymentMethod && defaultCarrier) {
      if (import.meta.env.DEV) {
        console.log('[AddOrder] Settings loaded, resetting form with defaults:', {
          defaultCurrency,
          defaultPaymentMethod,
          defaultCarrier,
        });
      }
      form.reset(buildDefaultValues());
      hasResetRef.current = true;
    }
  }, [defaultCurrency, defaultPaymentMethod, defaultCarrier, buildDefaultValues, form]);


  // Debounce search inputs for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedProductSearch(productSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCustomerSearch(customerSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch]);

  // Reset selectedProductIndex when search changes
  useEffect(() => {
    setSelectedProductIndex(0);
  }, [productSearch]);

  // Reset selectedProductIndex when dropdown closes
  useEffect(() => {
    if (!showProductDropdown) {
      setSelectedProductIndex(0);
    }
  }, [showProductDropdown]);

  // Show/hide dropdowns based on search input - Removed length check to show on focus
  // The dropdown will now show all products grouped by category when focused
  useEffect(() => {
    // Don't auto-show dropdown when typing, only when explicitly focused
    // This is now controlled by the onFocus handler
  }, [productSearch]);

  useEffect(() => {
    setShowCustomerDropdown(customerSearch.length >= 2 && !selectedCustomer);
  }, [customerSearch, selectedCustomer]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.customer-search-container')) {
        setShowCustomerDropdown(false);
      }
      if (!target.closest('.product-search-container')) {
        setShowProductDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus customer search on page load for fast keyboard navigation
  useEffect(() => {
    if (customerSearchRef.current) {
      customerSearchRef.current.focus();
    }
  }, []);

  // Auto-show discount section when discount value > 0
  useEffect(() => {
    const discountValue = form.watch('discountValue');
    if (discountValue > 0 && !showDiscount) {
      setShowDiscount(true);
    }
  }, [form.watch('discountValue'), showDiscount]);

  // Track form changes after order creation using form's watch
  useEffect(() => {
    if (!orderId) return;
    
    // Subscribe to all form changes
    const subscription = form.watch(() => {
      setHasChangesAfterSave(true);
    });
    
    return () => subscription.unsubscribe();
  }, [orderId, form]);
  
  // Track order items changes after order creation
  useEffect(() => {
    if (!orderId) return;
    
    const currentItems = JSON.stringify(orderItems);
    if (savedOrderItemsRef.current && currentItems !== savedOrderItemsRef.current) {
      setHasChangesAfterSave(true);
    }
  }, [orderId, orderItems]);

  // Apply customer-specific pricing when customer is selected
  useEffect(() => {
    const applyCustomerPricing = async () => {
      if (!selectedCustomer?.id || orderItems.length === 0) return;
      
      try {
        const response = await fetch(`/api/customers/${selectedCustomer.id}/prices`);
        if (!response.ok) return;
        
        const customerPrices = await response.json();
        if (!customerPrices || customerPrices.length === 0) return;
        
        const today = new Date();
        const selectedCurrency = form.watch('currency') || 'EUR';
        let pricesApplied = 0;
        
        setOrderItems(items => items.map(item => {
          // Skip services and items without productId
          if (item.serviceId || !item.productId) return item;
          
          // Find applicable customer price for this product and currency
          const applicablePrice = customerPrices.find((cp: any) => {
            const validFrom = new Date(cp.validFrom);
            const validTo = cp.validTo ? new Date(cp.validTo) : null;
            
            return cp.productId === item.productId &&
                   cp.currency === selectedCurrency &&
                   cp.isActive &&
                   validFrom <= today &&
                   (!validTo || validTo >= today);
          });
          
          if (applicablePrice) {
            const newPrice = parseFloat(applicablePrice.price);
            pricesApplied++;
            return {
              ...item,
              price: newPrice,
              total: item.quantity * newPrice * (1 - item.discountPercentage / 100) + item.tax,
              hasCustomerPrice: true
            };
          }
          
          return item;
        }));
        
        if (pricesApplied > 0) {
          toast({
            title: t('orders:customerPriceApplied'),
            description: t('orders:customerPricesAppliedCount', { count: pricesApplied }),
          });
        }
      } catch (error) {
        console.error('Error applying customer pricing:', error);
      }
    };
    
    applyCustomerPricing();
  }, [selectedCustomer?.id]);

  // Fetch all products for real-time filtering
  const { data: allProducts } = useQuery({
    queryKey: ['/api/products'],
    staleTime: 5 * 60 * 1000, // 5 minutes - products don't change frequently
  });

  // Fetch all services for real-time filtering
  const { data: allServices } = useQuery({
    queryKey: ['/api/services'],
    staleTime: 5 * 60 * 1000, // 5 minutes - services don't change frequently
  });

  // Fetch all bundles for real-time filtering
  const { data: allBundles } = useQuery({
    queryKey: ['/api/bundles'],
    staleTime: 5 * 60 * 1000, // 5 minutes - bundles don't change frequently
  });

  // Fetch all customers for real-time filtering
  const { data: allCustomers } = useQuery({
    queryKey: ['/api/customers', { includeBadges: true }],
    staleTime: 5 * 60 * 1000, // 5 minutes - customers don't change frequently
  });

  // Fetch all orders to calculate product frequency
  const { data: allOrders } = useQuery({
    queryKey: ['/api/orders'],
    staleTime: 2 * 60 * 1000, // 2 minutes - orders change more frequently
  });

  // Fetch shipping addresses for selected customer
  const { data: shippingAddresses, isLoading: isLoadingShippingAddresses } = useQuery({
    queryKey: ['/api/customers', selectedCustomer?.id, 'shipping-addresses'],
    enabled: !!selectedCustomer?.id,
  });

  // Fetch pending services for selected customer
  const { data: pendingServices, isLoading: isLoadingPendingServices } = useQuery<any[]>({
    queryKey: ['/api/customers', selectedCustomer?.id, 'pending-services'],
    enabled: !!selectedCustomer?.id,
  });

  // Track which pending services have been applied to the order
  const [appliedServiceIds, setAppliedServiceIds] = useState<Set<string>>(new Set());
  
  // Auto-check Service BILL when a service is applied
  const [includeServiceBill, setIncludeServiceBill] = useState(false);

  // Reset applied services when customer changes
  useEffect(() => {
    setAppliedServiceIds(new Set());
    setIncludeServiceBill(false);
  }, [selectedCustomer?.id]);

  // Mutation to create new shipping address
  const createShippingAddressMutation = useMutation({
    mutationFn: async (addressData: any) => {
      const response = await apiRequest('POST', `/api/customers/${selectedCustomer.id}/shipping-addresses`, addressData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers', selectedCustomer?.id, 'shipping-addresses'] });
      setShowShippingModal(false);
      setEditingAddress(null);
      toast({
        title: t('common:success'),
        description: t('orders:shippingAddressCreatedSuccess'),
      });
    },
    onError: (error) => {
      toast({
        title: t('common:error'),
        description: t('orders:shippingAddressCreatedError'),
        variant: "destructive",
      });
    },
  });

  // Mutation to update existing shipping address
  const updateShippingAddressMutation = useMutation({
    mutationFn: async ({ addressId, addressData }: { addressId: string; addressData: any }) => {
      const response = await apiRequest('PATCH', `/api/shipping-addresses/${addressId}`, addressData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers', selectedCustomer?.id, 'shipping-addresses'] });
      setShowShippingModal(false);
      setEditingAddress(null);
      toast({
        title: t('common:success'),
        description: t('orders:shippingAddressUpdatedSuccess'),
      });
    },
    onError: (error) => {
      toast({
        title: t('common:error'),
        description: t('orders:shippingAddressUpdatedError'),
        variant: "destructive",
      });
    },
  });

  // Helper function to get phone country code from country name
  const getPhoneCountryCode = (countryName: string): string => {
    const countryCodeMap: { [key: string]: string } = {
      'Czech Republic': '+420',
      'Czechia': '+420',
      'Germany': '+49',
      'Austria': '+43',
      'Poland': '+48',
      'Slovakia': '+421',
      'Hungary': '+36',
      'France': '+33',
      'Italy': '+39',
      'Spain': '+34',
      'Netherlands': '+31',
      'Belgium': '+32',
      'United Kingdom': '+44',
      'Vietnam': '+84',
    };
    return countryCodeMap[countryName] || '';
  };

  // Helper function to format phone number with country code
  const formatPhoneNumber = (phone: string, countryCode: string): string => {
    if (!phone) return phone;
    if (!countryCode) return phone;
    
    // Remove all spaces and special chars except + and digits
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    if (!cleaned) return phone;
    
    // Handle "00" prefix (international format) - convert to "+"
    if (cleaned.startsWith('00')) {
      cleaned = '+' + cleaned.substring(2);
    }
    
    // If already has proper + at start, just clean and return
    if (cleaned.startsWith('+')) {
      return cleaned;
    }
    
    // Get country code digits (e.g., "420" from "+420")
    const codeDigits = countryCode.replace('+', '');
    
    // Remove country code digits if present at start (e.g., "420776887045" → "776887045")
    if (cleaned.startsWith(codeDigits)) {
      cleaned = cleaned.substring(codeDigits.length);
    }
    
    // Always add country code prefix with no spaces
    return `${countryCode}${cleaned}`;
  };

  // Smart Paste mutation for new customer address
  const parseNewCustomerAddressMutation = useMutation({
    mutationFn: async (rawAddress: string) => {
      const res = await apiRequest('POST', '/api/addresses/parse', { rawAddress });
      return res.json();
    },
    onSuccess: (data: { fields: any; confidence: string }) => {
      const { fields } = data;
      
      // Capitalize names
      const capitalizeWords = (str: string) => str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
      
      // Only update firstName and lastName (fields below Address Search)
      // DO NOT update 'name' field as it appears above Address Search
      if (fields.firstName || fields.lastName) {
        setNewCustomer(prev => ({ 
          ...prev, 
          firstName: fields.firstName ? capitalizeWords(fields.firstName) : prev.firstName,
          lastName: fields.lastName ? capitalizeWords(fields.lastName) : prev.lastName
        }));
      }
      if (fields.company) setNewCustomer(prev => ({ ...prev, company: fields.company }));
      
      // Set email - use parsed email or default to davienails999@gmail.com if not found
      if (fields.email) {
        setNewCustomer(prev => ({ ...prev, email: fields.email }));
      } else {
        setNewCustomer(prev => ({ ...prev, email: "davienails999@gmail.com" }));
      }
      
      // Use Nominatim-corrected address values
      if (fields.street) setNewCustomer(prev => ({ ...prev, street: fields.street }));
      if (fields.streetNumber) setNewCustomer(prev => ({ ...prev, streetNumber: fields.streetNumber }));
      if (fields.city) setNewCustomer(prev => ({ ...prev, city: fields.city }));
      if (fields.zipCode) setNewCustomer(prev => ({ ...prev, zipCode: fields.zipCode }));
      if (fields.country) setNewCustomer(prev => ({ ...prev, country: fields.country }));
      if (fields.state) setNewCustomer(prev => ({ ...prev, state: fields.state }));
      
      // Format phone number with country code after country is set
      if (fields.phone && fields.country) {
        const countryCode = getPhoneCountryCode(capitalizeWords(fields.country));
        if (countryCode) {
          const formatted = formatPhoneNumber(fields.phone, countryCode);
          setNewCustomer(prev => ({ ...prev, phone: formatted }));
        } else {
          setNewCustomer(prev => ({ ...prev, phone: fields.phone }));
        }
      } else if (fields.phone) {
        setNewCustomer(prev => ({ ...prev, phone: fields.phone }));
      }
      
      toast({
        title: t('orders:addressParsed'),
        description: t('orders:addressParsedSuccess', { confidence: data.confidence }),
      });
      setRawNewCustomerAddress("");
    },
    onError: (error: any) => {
      toast({
        title: t('orders:parseFailed'),
        description: error.message || t('orders:addressParseError'),
        variant: "destructive",
      });
    },
  });

  // Update product prices when currency changes
  const selectedCurrency = form.watch('currency');
  useEffect(() => {
    if (!selectedCurrency || orderItems.length === 0 || !allProducts) return;

    setOrderItems(items => 
      items.map(item => {
        const product = Array.isArray(allProducts) ? allProducts.find((p: any) => p.id === item.productId) : null;
        if (!product) return item;

        let newPrice = 0;
        if (selectedCurrency === 'CZK' && product.priceCzk) {
          newPrice = parseFloat(product.priceCzk);
        } else if (selectedCurrency === 'EUR' && product.priceEur) {
          newPrice = parseFloat(product.priceEur);
        } else {
          // Fallback to any available price
          newPrice = parseFloat(product.priceEur || product.priceCzk || '0');
        }

        return {
          ...item,
          price: newPrice,
          total: item.quantity * newPrice - item.discount
        };
      })
    );
  }, [selectedCurrency, allProducts]);

  // Auto-calculate shipping cost when shipping method or customer country changes
  const watchedShippingMethod = form.watch('shippingMethod');
  const watchedCurrency = form.watch('currency');

  // Calculate total weight of order items for weight-based shipping rates
  const calculateOrderWeight = () => {
    return orderItems.reduce((total, item) => {
      const product = Array.isArray(allProducts) ? allProducts.find((p: any) => p.id === item.productId) : null;
      const itemWeight = product?.weight ? parseFloat(product.weight) : 0;
      return total + (itemWeight * item.quantity);
    }, 0);
  };

  // Calculate quantity of a product/variant/bundle already in the current order
  const getQuantityInOrder = useCallback((productId?: string, variantId?: string, bundleId?: string): number => {
    return orderItems.reduce((total, item) => {
      if (bundleId && item.bundleId === bundleId) {
        return total + item.quantity;
      }
      if (productId && item.productId === productId) {
        if (variantId) {
          if (item.variantId === variantId) {
            return total + item.quantity;
          }
        } else if (!item.variantId) {
          return total + item.quantity;
        }
      }
      return total;
    }, 0);
  }, [orderItems]);

  useEffect(() => {
    if (!watchedShippingMethod || !selectedCustomer?.country) return;

    const orderWeight = calculateOrderWeight();
    const pplRates = shippingSettings?.pplShippingRates;
    const paymentMethod = form.getValues('paymentMethod');

    const calculatedCost = calculateShippingCost(
      watchedShippingMethod,
      selectedCustomer.country,
      watchedCurrency,
      { weight: orderWeight, pplRates, paymentMethod }
    );

    form.setValue('actualShippingCost', calculatedCost);
    form.setValue('shippingCost', calculatedCost); // Also set shipping cost for display
  }, [watchedShippingMethod, selectedCustomer?.country, watchedCurrency, orderItems, shippingSettings?.pplShippingRates, form.watch('paymentMethod')]);

  // Auto-sync dobírka/nachnahme amount and currency when PPL CZ/DHL DE + COD is selected
  // Recalculates on EVERY change (currency, items, shipping, discounts, taxes, adjustment)
  const watchedPaymentMethod = form.watch('paymentMethod');
  const watchedDiscountValue = form.watch('discountValue');
  const watchedDiscountType = form.watch('discountType');
  const watchedShippingCostValue = form.watch('shippingCost');
  const watchedTaxRate = form.watch('taxRate');
  const watchedAdjustment = form.watch('adjustment');
  
  useEffect(() => {
    // Only autofill if PPL CZ/DHL DE shipping and COD payment are selected (support both old and new carrier names)
    if ((watchedShippingMethod === 'PPL' || watchedShippingMethod === 'PPL CZ' || watchedShippingMethod === 'DHL' || watchedShippingMethod === 'DHL DE') && watchedPaymentMethod === 'COD') {
      // Always sync COD amount to match grand total
      const grandTotal = calculateGrandTotal();
      form.setValue('codAmount', parseFloat(grandTotal.toFixed(2)));
      
      // Always sync currency to match order currency (only if it's a supported COD currency)
      if (watchedCurrency === 'CZK' || watchedCurrency === 'EUR' || watchedCurrency === 'USD') {
        form.setValue('codCurrency', watchedCurrency);
      }
    }
  }, [
    watchedShippingMethod, 
    watchedPaymentMethod, 
    watchedCurrency, 
    orderItems, 
    showTaxInvoice,
    watchedDiscountValue,
    watchedDiscountType,
    watchedShippingCostValue,
    watchedTaxRate,
    watchedAdjustment
  ]); // Recalculates on any value change including adjustment

  // Helper to convert country name to ISO code
  const getCountryCode = (countryName: string | null | undefined): string | null => {
    if (!countryName) return null;
    const normalized = countryName.toLowerCase().trim();
    const countryMap: Record<string, string> = {
      'czechia': 'CZ', 'czech republic': 'CZ', 'česko': 'CZ', 'česká republika': 'CZ', 'cesko': 'CZ', 'ceska republika': 'CZ', 'cz': 'CZ',
      'germany': 'DE', 'deutschland': 'DE', 'německo': 'DE', 'nemecko': 'DE', 'de': 'DE',
      'austria': 'AT', 'österreich': 'AT', 'osterreich': 'AT', 'rakousko': 'AT', 'at': 'AT',
      'slovakia': 'SK', 'slovensko': 'SK', 'slowakei': 'SK', 'sk': 'SK',
      'poland': 'PL', 'polska': 'PL', 'polsko': 'PL', 'polen': 'PL', 'pl': 'PL',
      'hungary': 'HU', 'magyarország': 'HU', 'magyarorszag': 'HU', 'maďarsko': 'HU', 'madarsko': 'HU', 'ungarn': 'HU', 'hu': 'HU',
      'netherlands': 'NL', 'nederland': 'NL', 'holandsko': 'NL', 'niederlande': 'NL', 'nl': 'NL',
      'belgium': 'BE', 'belgie': 'BE', 'belgien': 'BE', 'be': 'BE',
      'france': 'FR', 'francie': 'FR', 'frankreich': 'FR', 'fr': 'FR',
      'italy': 'IT', 'italia': 'IT', 'itálie': 'IT', 'italie': 'IT', 'italien': 'IT', 'it': 'IT',
      'spain': 'ES', 'españa': 'ES', 'espana': 'ES', 'španělsko': 'ES', 'spanelsko': 'ES', 'spanien': 'ES', 'es': 'ES',
      'portugal': 'PT', 'portugalsko': 'PT', 'pt': 'PT',
      'united kingdom': 'GB', 'uk': 'GB', 'britain': 'GB', 'great britain': 'GB', 'velká británie': 'GB', 'velka britanie': 'GB', 'gb': 'GB',
      'switzerland': 'CH', 'schweiz': 'CH', 'švýcarsko': 'CH', 'svycarsko': 'CH', 'suisse': 'CH', 'ch': 'CH',
      'slovenia': 'SI', 'slovinsko': 'SI', 'slowenien': 'SI', 'si': 'SI',
      'croatia': 'HR', 'chorvatsko': 'HR', 'kroatien': 'HR', 'hrvatska': 'HR', 'hr': 'HR',
      'romania': 'RO', 'rumunsko': 'RO', 'rumänien': 'RO', 'rumanien': 'RO', 'ro': 'RO',
      'bulgaria': 'BG', 'bulharsko': 'BG', 'bulgarien': 'BG', 'bg': 'BG',
    };
    return countryMap[normalized] || normalized.toUpperCase().slice(0, 2);
  };

  // Auto-fill currency from customer preference
  useEffect(() => {
    if (!selectedCustomer) return;
    
    // Auto-fill currency from customer preference
    if (selectedCustomer.preferredCurrency) {
      form.setValue('currency', selectedCustomer.preferredCurrency);
    }
  }, [selectedCustomer]);

  // Auto-select carrier based on customer's country
  useEffect(() => {
    if (!selectedCustomer) return;
    
    // Get the customer's country (from customer record or shipping address)
    const customerCountry = selectedShippingAddress?.country || selectedCustomer.country;
    if (!customerCountry) return;
    
    // Get the country carrier mapping from settings
    const countryCarrierMapping = shippingSettings?.countryCarrierMapping as Record<string, string> | undefined;
    if (!countryCarrierMapping || Object.keys(countryCarrierMapping).length === 0) return;
    
    // Convert country name to ISO code
    const countryCode = getCountryCode(customerCountry);
    if (!countryCode) return;
    
    // Look up the carrier for this country
    const mappedCarrier = countryCarrierMapping[countryCode];
    if (mappedCarrier) {
      form.setValue('shippingMethod', mappedCarrier as any);
      if (import.meta.env.DEV) {
        console.log(`[AddOrder] Auto-selected carrier ${mappedCarrier} for country ${customerCountry} (${countryCode})`);
      }
    }
  }, [selectedCustomer, selectedShippingAddress, shippingSettings?.countryCarrierMapping]);

  // Track previous currency to detect manual tax rate overrides
  const prevCurrencyRef = useRef<string>(watchedCurrency);

  // Auto-update tax rate when currency changes (uses financial settings)
  // Preserves manual overrides
  useEffect(() => {
    if (!showTaxInvoice) return;
    
    const currentCurrency = watchedCurrency;
    const prevCurrency = prevCurrencyRef.current;
    
    // Get tax rates for current and previous currencies
    const newDefaultRate = financialHelpers.getDefaultTaxRate(currentCurrency) * 100;
    const prevDefaultRate = financialHelpers.getDefaultTaxRate(prevCurrency) * 100;
    const currentRate = parseFloat(form.getValues('taxRate')?.toString() || '0');
    
    // Only update if current rate matches the OLD currency's default (within 0.01% tolerance)
    // This means user hasn't manually overridden the rate
    if (Math.abs(currentRate - prevDefaultRate) < 0.01) {
      // Current rate matches old default, so auto-update to new default
      form.setValue('taxRate', newDefaultRate);
    }
    // Otherwise, user has manual override - preserve it
    
    // Update previous currency reference
    prevCurrencyRef.current = currentCurrency;
  }, [watchedCurrency, showTaxInvoice, financialHelpers]);

  const createOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      // Helper function to create customer with deduplication guard
      const createCustomerWithGuard = async (): Promise<string | null> => {
        // If we already have a created customer ID from this submission, reuse it
        if (createdCustomerIdRef.current) {
          console.log('Reusing already created customer ID:', createdCustomerIdRef.current);
          return createdCustomerIdRef.current;
        }
        
        // If customer creation is already in progress, wait for it
        if (customerCreationInProgress.current) {
          console.log('Customer creation already in progress, waiting...');
          return await customerCreationInProgress.current;
        }
        
        // Start new customer creation
        const creationPromise = (async (): Promise<string | null> => {
          console.log('Creating new customer from quick form:', selectedCustomer);
          const customerData: any = {
            name: selectedCustomer.name,
            phone: selectedCustomer.phone || undefined,
            email: selectedCustomer.email || undefined,
            type: selectedCustomer.type || 'regular',
          };

          // Add social media info for Msg customers
          if (selectedCustomer.socialMediaApp) {
            customerData.socialMediaApp = selectedCustomer.socialMediaApp;
          }

          console.log('Sending customer data:', customerData);
          const response = await apiRequest('POST', '/api/customers', customerData);
          const customerResponse = await response.json();
          console.log('Customer API response:', customerResponse);
          console.log('New customer created with ID:', customerResponse?.id);
          
          // Store the created ID for reuse
          createdCustomerIdRef.current = customerResponse?.id;
          return customerResponse?.id;
        })();
        
        customerCreationInProgress.current = creationPromise;
        
        try {
          return await creationPromise;
        } finally {
          customerCreationInProgress.current = null;
        }
      };
      
      // Check if we have a customer that needs to be saved (Tel or Msg types)
      if (selectedCustomer && selectedCustomer.needsSaving) {
        const customerId = await createCustomerWithGuard();
        data.customerId = customerId;

        // Also create shipping address if one was added
        if (selectedShippingAddress && selectedShippingAddress.isNew && customerId) {
          const addressData = {
            customerId: customerId,
            firstName: selectedShippingAddress.firstName,
            lastName: selectedShippingAddress.lastName,
            company: selectedShippingAddress.company || undefined,
            street: selectedShippingAddress.street,
            streetNumber: selectedShippingAddress.streetNumber || undefined,
            city: selectedShippingAddress.city,
            zipCode: selectedShippingAddress.zipCode,
            country: selectedShippingAddress.country,
            tel: selectedShippingAddress.tel || undefined,
            email: selectedShippingAddress.email || undefined,
            label: selectedShippingAddress.label || undefined,
          };
          await apiRequest('POST', `/api/customers/${customerId}/shipping-addresses`, addressData);
        }
      } else if (selectedCustomer && !selectedCustomer.id) {
        // Handle regular new customer creation (from the full customer form)
        // Also use the guard to prevent duplicates
        
        // If we already have a created customer ID from this submission, reuse it
        if (createdCustomerIdRef.current) {
          console.log('Reusing already created customer ID:', createdCustomerIdRef.current);
          data.customerId = createdCustomerIdRef.current;
        } else if (customerCreationInProgress.current) {
          console.log('Customer creation already in progress, waiting...');
          data.customerId = await customerCreationInProgress.current;
        } else {
          console.log('Creating new customer:', selectedCustomer);
          
          const creationPromise = (async (): Promise<string | null> => {
            // Combine street and streetNumber for legacy address field
            const fullAddress = [selectedCustomer.street, selectedCustomer.streetNumber]
              .filter(Boolean)
              .join(' ');
            
            const customerData = {
              name: selectedCustomer.name,
              facebookName: selectedCustomer.facebookName || undefined,
              facebookUrl: selectedCustomer.facebookUrl || undefined,
              email: selectedCustomer.email || undefined,
              phone: selectedCustomer.phone || undefined,
              address: fullAddress || undefined,
              city: selectedCustomer.city || undefined,
              state: selectedCustomer.state || undefined,
              zipCode: selectedCustomer.zipCode || undefined,
              country: selectedCustomer.country || undefined,
              company: selectedCustomer.company || undefined,
              type: selectedCustomer.type || 'regular',
            };
            console.log('Sending customer data:', customerData);
            const response = await apiRequest('POST', '/api/customers', customerData);
            const customerResponse = await response.json();
            console.log('Customer API response:', customerResponse);
            console.log('New customer created with ID:', customerResponse?.id);
            
            // Store the created ID for reuse
            createdCustomerIdRef.current = customerResponse?.id;
            
            // Auto-create shipping address from customer data if address fields are provided
            if (selectedCustomer.street || selectedCustomer.city || selectedCustomer.zipCode) {
              console.log('Auto-creating shipping address for new customer...');
              const addressData = {
                customerId: customerResponse?.id,
                firstName: selectedCustomer.firstName || undefined,
                lastName: selectedCustomer.lastName || undefined,
                company: selectedCustomer.company || undefined,
                street: selectedCustomer.street || '',
                streetNumber: selectedCustomer.streetNumber || undefined,
                city: selectedCustomer.city || '',
                zipCode: selectedCustomer.zipCode || '',
                country: selectedCustomer.country || '',
                tel: selectedCustomer.phone || undefined,
                email: selectedCustomer.email || undefined,
                pickupPoint: selectedCustomer.pickupPoint || undefined,
                label: 'Default Address',
              };
              
              const addressResponse = await apiRequest('POST', `/api/customers/${customerResponse?.id}/shipping-addresses`, addressData);
              const createdAddress = await addressResponse.json();
              console.log('Shipping address created:', createdAddress);
              
              // Link the new shipping address to this order
              data.shippingAddressId = createdAddress?.id;
            }
            
            return customerResponse?.id;
          })();
          
          customerCreationInProgress.current = creationPromise;
          
          try {
            data.customerId = await creationPromise;
          } finally {
            customerCreationInProgress.current = null;
          }
        }
      } else if (selectedCustomer?.id && !selectedCustomer.id.startsWith('temp-')) {
        // Use existing customer's ID (not a temporary one)
        data.customerId = selectedCustomer.id;
      } else if (selectedCustomer && selectedCustomer.isTemporary) {
        // For one-time customers (Quick and Custom), don't save to database
        // Just pass the customer name in the order data
        data.temporaryCustomerName = selectedCustomer.name;
        data.customerId = null;
      }

      console.log('Creating order with customerId:', data.customerId);

      // Convert taxRate from percentage (21) to decimal (0.21) for API
      // The form stores it as percentage for user-friendly display
      const convertedData = {
        ...data,
        taxRate: data.taxRate ? parseFloat(data.taxRate) / 100 : undefined,
      };

      // Include selected document IDs and biller info with the order
      const orderData = {
        ...convertedData,
        selectedDocumentIds: selectedDocumentIds.length > 0 ? selectedDocumentIds : undefined,
        billerId: user?.id, // Automatically add the current user as the biller
      };

      const response = await apiRequest('POST', '/api/orders', orderData);
      const createdOrder = await response.json();
      return createdOrder;
    },
    onSuccess: async (createdOrder) => {
      // Invalidate all order-related caches for real-time updates across the app
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders/pick-pack'] }); // Real-time Pick & Pack sync
      queryClient.invalidateQueries({ queryKey: ['/api/orders/pick-pack/predictions'] }); // Update predictions
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      // Invalidate dashboards for real-time order count updates
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/warehouse'] }); // Warehouse dashboard
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/operations-pulse'] }); // Executive dashboard
      
      // Link applied services to this order
      if (appliedServiceIds.size > 0) {
        for (const serviceId of appliedServiceIds) {
          try {
            await apiRequest('PATCH', `/api/services/${serviceId}`, { 
              orderId: createdOrder.id,
              status: 'completed'
            });
          } catch (error) {
            console.error('Failed to link service to order:', error);
          }
        }
        // Invalidate services cache
        queryClient.invalidateQueries({ queryKey: ['/api/services'] });
        if (selectedCustomer?.id) {
          queryClient.invalidateQueries({ queryKey: ['/api/customers', selectedCustomer.id, 'pending-services'] });
        }
      }
      
      // Set the order ID so packing optimization can be run
      setOrderId(createdOrder.id);
      
      // Save the current order items snapshot for change detection
      savedOrderItemsRef.current = JSON.stringify(orderItems);
      setHasChangesAfterSave(false);
      
      // Save packing plan if one was generated before order creation
      if (packingPlan) {
        savePackingPlanMutation.mutate({ 
          planData: packingPlan, 
          orderIdOverride: createdOrder.id 
        });
      }
      
      toast({
        title: t('common:success'),
        description: packingPlan 
          ? t('orders:orderCreatedWithPacking')
          : t('orders:orderCreatedSuccess'),
      });
    },
    onError: (error) => {
      console.error("Order creation error:", error);
      toast({
        title: t('common:error'),
        description: t('orders:orderCreatedError'),
        variant: "destructive",
      });
    },
  });

  // Packing optimization wrapper function with country mapping and auto-fill
  const runPackingOptimization = () => {
    if (!aiCartonPackingEnabled) {
      return; // No-op when AI is disabled
    }

    if (orderItems.length === 0) {
      toast({
        title: t('common:error'),
        description: t('orders:itemsRequired'),
        variant: "destructive",
      });
      return;
    }

    const items = orderItems.map(item => ({
      productId: item.productId || '',
      productName: item.productName,
      sku: item.sku,
      quantity: item.quantity,
      price: item.price,
      // Discount information for AI optimization
      discount: item.discount,
      discountPercentage: item.discountPercentage,
      appliedDiscountId: item.appliedDiscountId,
      appliedDiscountLabel: item.appliedDiscountLabel,
      appliedDiscountType: item.appliedDiscountType,
      freeItemsCount: item.freeItemsCount,
      buyXGetYBuyQty: item.buyXGetYBuyQty,
      buyXGetYGetQty: item.buyXGetYGetQty
    }));

    // Get shipping country code from customer with comprehensive mapping
    let shippingCountry = 'CZ'; // Fallback if no customer country provided
    if (selectedCustomer?.country) {
      const countryInput = selectedCustomer.country.trim();
      const country = countryInput.toLowerCase();
      
      // Comprehensive country name to ISO code mapping
      const countryMap: Record<string, string> = {
        // Czech variants
        'czechia': 'CZ', 'czech republic': 'CZ', 'česko': 'CZ', 'česká republika': 'CZ', 'cz': 'CZ',
        // Germany variants
        'germany': 'DE', 'deutschland': 'DE', 'německo': 'DE', 'de': 'DE',
        // Austria variants
        'austria': 'AT', 'österreich': 'AT', 'rakousko': 'AT', 'at': 'AT',
        // Slovakia variants
        'slovakia': 'SK', 'slovensko': 'SK', 'slovak republic': 'SK', 'sk': 'SK',
        // Poland variants
        'poland': 'PL', 'polska': 'PL', 'polsko': 'PL', 'pl': 'PL',
        // Hungary variants
        'hungary': 'HU', 'magyarország': 'HU', 'maďarsko': 'HU', 'hu': 'HU',
        // Other European countries
        'france': 'FR', 'francie': 'FR', 'fr': 'FR',
        'italy': 'IT', 'itálie': 'IT', 'italia': 'IT', 'it': 'IT',
        'spain': 'ES', 'españa': 'ES', 'španělsko': 'ES', 'es': 'ES',
        'netherlands': 'NL', 'holland': 'NL', 'nizozemsko': 'NL', 'nl': 'NL',
        'belgium': 'BE', 'belgië': 'BE', 'belgique': 'BE', 'belgie': 'BE', 'be': 'BE',
        'switzerland': 'CH', 'schweiz': 'CH', 'suisse': 'CH', 'švýcarsko': 'CH', 'ch': 'CH',
        'romania': 'RO', 'românia': 'RO', 'rumunsko': 'RO', 'ro': 'RO',
        'bulgaria': 'BG', 'българия': 'BG', 'bulharsko': 'BG', 'bg': 'BG',
        'denmark': 'DK', 'danmark': 'DK', 'dánsko': 'DK', 'dk': 'DK',
        'sweden': 'SE', 'sverige': 'SE', 'švédsko': 'SE', 'se': 'SE',
        'norway': 'NO', 'norge': 'NO', 'norsko': 'NO', 'no': 'NO',
        'finland': 'FI', 'suomi': 'FI', 'finsko': 'FI', 'fi': 'FI',
        'portugal': 'PT', 'portugalsko': 'PT', 'pt': 'PT',
        'greece': 'GR', 'hellas': 'GR', 'řecko': 'GR', 'gr': 'GR',
        'ireland': 'IE', 'éire': 'IE', 'irsko': 'IE', 'ie': 'IE',
        'croatia': 'HR', 'hrvatska': 'HR', 'chorvatsko': 'HR', 'hr': 'HR',
        'slovenia': 'SI', 'slovenija': 'SI', 'slovinsko': 'SI', 'si': 'SI',
        'lithuania': 'LT', 'lietuva': 'LT', 'litva': 'LT', 'lt': 'LT',
        'latvia': 'LV', 'latvija': 'LV', 'lotyšsko': 'LV', 'lv': 'LV',
        'estonia': 'EE', 'eesti': 'EE', 'estonsko': 'EE', 'ee': 'EE',
        'luxembourg': 'LU', 'lëtzebuerg': 'LU', 'lucembursko': 'LU', 'lu': 'LU',
        'malta': 'MT', 'malte': 'MT', 'mt': 'MT',
        'cyprus': 'CY', 'κύπρος': 'CY', 'kypr': 'CY', 'cy': 'CY',
        // Other regions
        'united states': 'US', 'usa': 'US', 'america': 'US', 'spojené státy': 'US', 'us': 'US',
        'united kingdom': 'GB', 'uk': 'GB', 'great britain': 'GB', 'velká británie': 'GB', 'gb': 'GB',
        'canada': 'CA', 'kanada': 'CA', 'ca': 'CA',
        'australia': 'AU', 'austrálie': 'AU', 'au': 'AU',
        'new zealand': 'NZ', 'nový zéland': 'NZ', 'nz': 'NZ',
        'mexico': 'MX', 'mexiko': 'MX', 'mx': 'MX',
        'brazil': 'BR', 'brasil': 'BR', 'brazílie': 'BR', 'br': 'BR',
        'argentina': 'AR', 'ar': 'AR',
        'china': 'CN', 'čína': 'CN', 'cn': 'CN',
        'vietnam': 'VN', 'viet nam': 'VN', 'việt nam': 'VN', 'vn': 'VN',
        'japan': 'JP', '日本': 'JP', 'japonsko': 'JP', 'jp': 'JP',
        'south korea': 'KR', 'korea': 'KR', '한국': 'KR', 'jižní korea': 'KR', 'kr': 'KR',
        'india': 'IN', 'indie': 'IN', 'in': 'IN',
        'singapore': 'SG', 'singapur': 'SG', 'sg': 'SG',
        'thailand': 'TH', 'thajsko': 'TH', 'th': 'TH',
        'malaysia': 'MY', 'malajsie': 'MY', 'my': 'MY',
        'indonesia': 'ID', 'indonésie': 'ID', 'id': 'ID',
        'philippines': 'PH', 'filipíny': 'PH', 'ph': 'PH',
        'south africa': 'ZA', 'jižní afrika': 'ZA', 'za': 'ZA',
        'israel': 'IL', 'izrael': 'IL', 'il': 'IL',
        'turkey': 'TR', 'turecko': 'TR', 'tr': 'TR',
        'uae': 'AE', 'united arab emirates': 'AE', 'ae': 'AE',
        'oman': 'OM', 'om': 'OM',
        'qatar': 'QA', 'katar': 'QA', 'qa': 'QA',
        'kuwait': 'KW', 'kuvajt': 'KW', 'kw': 'KW',
        'saudi arabia': 'SA', 'saúdská arábie': 'SA', 'sa': 'SA',
      };
      
      // Try exact match (handles ISO codes and all mapped country names)
      if (countryMap[country]) {
        shippingCountry = countryMap[country];
      } else {
        // No match found - preserve the customer's original country value
        // If it looks like an ISO code (2 letters), use it uppercased
        if (countryInput.length === 2) {
          shippingCountry = countryInput.toUpperCase();
          console.log(`Packing optimization: Using customer country as ISO code: "${shippingCountry}"`);
        } else {
          // For longer unmapped values, send original to backend for validation
          shippingCountry = countryInput;
          console.warn(`Packing optimization: Unmapped customer country "${countryInput}", sending to backend as-is for validation`);
        }
      }
      
      console.log(`Packing optimization: Mapped customer country "${selectedCustomer.country}" to ISO code "${shippingCountry}"`);
    } else {
      console.log(`Packing optimization: No customer country set, using default "${shippingCountry}"`);
    }

    // Call the shared optimization function
    runOptimization(items, shippingCountry);
  };

  // Manual carton creation handler
  const handleAddManualCarton = async () => {
    if (!aiCartonPackingEnabled) {
      toast({
        title: t('orders:aiPackingDisabled'),
        description: t('orders:aiPackingDisabledDesc'),
        variant: "destructive",
      });
      return;
    }

    if (!orderId) {
      toast({
        title: t('common:error'),
        description: t('orders:saveOrderBeforeCartons'),
        variant: "destructive",
      });
      return;
    }

    try {
      const cartonsResponse = await fetch(`/api/orders/${orderId}/cartons`);
      if (!cartonsResponse.ok) {
        throw new Error('Failed to fetch existing cartons');
      }
      
      const existingCartons = await cartonsResponse.json();
      const nextCartonNumber = existingCartons.length + 1;

      await apiRequest('POST', `/api/orders/${orderId}/cartons`, {
        cartonNumber: nextCartonNumber,
        cartonType: 'non-company',
        source: 'manual',
        weight: null,
        length: null,
        width: null,
        height: null,
        trackingNumber: null,
      });

      queryClient.invalidateQueries({ queryKey: ['/api/orders', orderId, 'cartons'] });
    } catch (error) {
      console.error('Error adding manual carton:', error);
      toast({
        title: t('common:error'),
        description: t('orders:addManualCartonError'),
        variant: "destructive",
      });
    }
  };

  // Auto-fill shipping costs when packing plan updates (only when AI is enabled)
  useEffect(() => {
    if (aiCartonPackingEnabled && packingPlan?.estimatedShippingCost !== undefined && packingPlan?.estimatedShippingCost !== null) {
      form.setValue('shippingCost', packingPlan.estimatedShippingCost);
      form.setValue('actualShippingCost', packingPlan.estimatedShippingCost);
    }
  }, [packingPlan, form, aiCartonPackingEnabled]);

  const addProductToOrder = async (product: any, skipStockCheck: boolean = false) => {
    // Check if this is a service
    if (product.isService) {
      // Always add as a new line (even if service already exists)
      const servicePrice = parseFloat(product.totalCost || '0');
      const newItem: OrderItem = {
        id: Math.random().toString(36).substr(2, 9),
        serviceId: product.id,
        productName: product.name,
        sku: 'SERVICE',
        quantity: 1,
        price: servicePrice,
        discount: 0,
        discountPercentage: 0,
        tax: 0,
        total: servicePrice,
      };
      setOrderItems(items => [...items, newItem]);
      // Auto-focus quantity input for the newly added item
      setTimeout(() => {
        const quantityInput = document.querySelector(`[data-testid="input-quantity-${newItem.id}"]`) as HTMLInputElement;
        quantityInput?.focus();
      }, 100);
    } else {
      // Check stock availability before adding (unless always allowed or explicitly skipped)
      if (!skipStockCheck && !alwaysAllowOutOfStock) {
        const baseStock = product.quantity ?? 0;
        const inOrderQty = getQuantityInOrder(product.id);
        const availableStock = baseStock - inOrderQty;
        
        if (availableStock <= 0) {
          setPendingOutOfStockProduct(product);
          setOutOfStockDialogOpen(true);
          setProductSearch("");
          setShowProductDropdown(false);
          return;
        }
      }
      
      // Check if product has variants
      try {
        const variantsResponse = await fetch(`/api/products/${product.id}/variants`);
        if (variantsResponse.ok) {
          const variants = await variantsResponse.json();
          if (variants && variants.length > 0) {
            // Product has variants - show variant selector
            setSelectedProductForVariant(product);
            setProductVariants(variants);
            setVariantQuantities({});
            setShowVariantDialog(true);
            setProductSearch("");
            setShowProductDropdown(false);
            return;
          }
        }
      } catch (error) {
        console.error('Error fetching variants:', error);
      }
      // Handle regular product - always add as a new line
      // Get the price based on the selected currency
      const selectedCurrency = form.watch('currency') || 'EUR';
      let productPrice = 0;

      // Check for customer-specific pricing if a customer is selected
      if (selectedCustomer?.id) {
        try {
          const response = await fetch(`/api/customers/${selectedCustomer.id}/prices`);
          if (response.ok) {
            const customerPrices = await response.json();
            const today = new Date();

            // Find applicable customer price for this product and currency
            const applicablePrice = customerPrices.find((cp: any) => {
              const validFrom = new Date(cp.validFrom);
              const validTo = cp.validTo ? new Date(cp.validTo) : null;

              return cp.productId === product.id &&
                     cp.currency === selectedCurrency &&
                     cp.isActive &&
                     validFrom <= today &&
                     (!validTo || validTo >= today);
            });

            if (applicablePrice) {
              productPrice = parseFloat(applicablePrice.price);
              toast({
                title: t('orders:customerPriceApplied'),
                description: t('orders:customerPriceAppliedDesc', { price: productPrice, currency: selectedCurrency }),
              });
            }
          }
        } catch (error) {
          console.error('Error fetching customer prices:', error);
        }
      }

      // If no customer price found, use default product price (considering sale type)
      if (productPrice === 0) {
        const currentSaleType = form.watch('saleType') || 'retail';
        
        if (currentSaleType === 'wholesale') {
          // Use bulk/wholesale prices if available
          if (selectedCurrency === 'CZK' && product.bulkPriceCzk) {
            productPrice = parseFloat(product.bulkPriceCzk);
          } else if (selectedCurrency === 'EUR' && product.bulkPriceEur) {
            productPrice = parseFloat(product.bulkPriceEur);
          } else if (product.bulkPriceEur || product.bulkPriceCzk) {
            productPrice = parseFloat(product.bulkPriceEur || product.bulkPriceCzk || '0');
          }
        }
        
        // Fallback to retail prices if no wholesale price or retail mode
        if (productPrice === 0) {
          if (selectedCurrency === 'CZK' && product.priceCzk) {
            productPrice = parseFloat(product.priceCzk);
          } else if (selectedCurrency === 'EUR' && product.priceEur) {
            productPrice = parseFloat(product.priceEur);
          } else {
            // Fallback to any available price if specific currency price is not available
            productPrice = parseFloat(product.priceEur || product.priceCzk || '0');
          }
        }
      }

      // Check if this product's category has available free slots (from Buy X Get Y)
      const productCategoryId = product.categoryId?.toString() || null;
      const availableFreeSlot = findAvailableFreeSlots(productCategoryId);
      
      // If there are available free slots for this category, add as free item
      if (availableFreeSlot && availableFreeSlot.remainingFreeSlots > 0) {
        const newItem: OrderItem = {
          id: Math.random().toString(36).substr(2, 9),
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity: 1,
          price: 0,
          originalPrice: productPrice,
          discount: 0,
          discountPercentage: 0,
          tax: 0,
          total: 0,
          landingCost: product.landingCost || product.latestLandingCost || null,
          image: product.image || null,
          appliedDiscountId: availableFreeSlot.discountId,
          appliedDiscountLabel: availableFreeSlot.discountName,
          appliedDiscountType: 'buy_x_get_y',
          appliedDiscountScope: 'specific_category',
          categoryId: productCategoryId,
          isFreeItem: true,
        };
        
        toast({
          title: t('orders:freeItemAdded'),
          description: `${product.name} ${t('orders:addedAsFreeItem')}`,
        });
        
        setOrderItems(items => [...items, newItem]);
        // Auto-focus quantity input for the newly added free item
        setTimeout(() => {
          const quantityInput = document.querySelector(`[data-testid="input-quantity-${newItem.id}"]`) as HTMLInputElement;
          quantityInput?.focus();
        }, 100);
      } else {
        // Check for applicable discount (non Buy X Get Y)
        const applicableDiscount = findApplicableDiscount(product.id, product.categoryId);
        let discountAmount = 0;
        let discountLabel = '';
        let discountId = null;
        let discountType = null;
        let discountScope = null;
        
        let discountPct = 0;
        
        if (applicableDiscount) {
          // Skip Buy X Get Y discounts - they're handled by the allocation system
          if ((applicableDiscount.type || applicableDiscount.discountType) !== 'buy_x_get_y') {
            const discountResult = calculateDiscountAmount(applicableDiscount, productPrice, 1);
            
            if (applicableDiscount.type === 'percentage') {
              discountPct = parseFloat(applicableDiscount.percentage || '0');
              discountAmount = (productPrice * discountPct) / 100;
            } else {
              discountAmount = discountResult.amount;
            }
            discountLabel = applicableDiscount.name || discountResult.label;
            discountId = applicableDiscount.id;
            discountType = applicableDiscount.type || applicableDiscount.discountType;
            discountScope = applicableDiscount.applicationScope;
          }
        }

        const newItem: OrderItem = {
          id: Math.random().toString(36).substr(2, 9),
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity: 1,
          price: productPrice,
          discount: discountAmount,
          discountPercentage: discountPct,
          tax: 0,
          total: productPrice - discountAmount,
          landingCost: product.landingCost || product.latestLandingCost || null,
          image: product.image || null,
          appliedDiscountId: discountId,
          appliedDiscountLabel: discountLabel || null,
          appliedDiscountType: discountType,
          appliedDiscountScope: discountScope,
          categoryId: productCategoryId,
          isFreeItem: false,
        };
        
        // Show toast if discount was applied
        if (discountAmount > 0) {
          toast({
            title: t('orders:discountApplied'),
            description: `${discountLabel}: -${formatCurrency(discountAmount, form.watch('currency'))}`,
          });
        }
        
        setOrderItems(items => [...items, newItem]);
        // Auto-focus quantity input for the newly added item
        setTimeout(() => {
          const quantityInput = document.querySelector(`[data-testid="input-quantity-${newItem.id}"]`) as HTMLInputElement;
          quantityInput?.focus();
        }, 100);
      }
    }
    setProductSearch("");
    setShowProductDropdown(false);
  };

  const handleOutOfStockConfirm = useCallback((always: boolean) => {
    if (always) {
      setAlwaysAllowOutOfStock(true);
      localStorage.setItem('alwaysAllowOutOfStock', 'true');
    }
    if (pendingOutOfStockProduct) {
      addProductToOrder(pendingOutOfStockProduct, true);
    }
    setOutOfStockDialogOpen(false);
    setPendingOutOfStockProduct(null);
  }, [pendingOutOfStockProduct]);

  const handleOutOfStockCancel = useCallback(() => {
    setOutOfStockDialogOpen(false);
    setPendingOutOfStockProduct(null);
  }, []);

  const addVariantsToOrder = async () => {
    if (!selectedProductForVariant) return;
    
    const selectedCurrency = form.watch('currency') || 'EUR';
    const variantsToAdd = Object.entries(variantQuantities).filter(([_, qty]) => qty > 0);
    
    if (variantsToAdd.length === 0) {
      toast({
        title: t('orders:noVariantsSelected'),
        description: t('orders:noVariantsSelectedDesc'),
        variant: "destructive",
      });
      return;
    }
    
    // Track consumed free slots within this batch to prevent over-allocation
    const consumedFreeSlots: Record<string, number> = {};
    
    for (const [variantId, quantity] of variantsToAdd) {
      const variant = productVariants.find(v => v.id === variantId);
      if (!variant) continue;
      
      // Use product's price since variants don't have their own selling price (considering sale type)
      let productPrice = 0;
      const currentSaleType = form.watch('saleType') || 'retail';
      
      if (currentSaleType === 'wholesale') {
        // Use bulk/wholesale prices if available
        if (selectedCurrency === 'CZK' && selectedProductForVariant.bulkPriceCzk) {
          productPrice = parseFloat(selectedProductForVariant.bulkPriceCzk);
        } else if (selectedCurrency === 'EUR' && selectedProductForVariant.bulkPriceEur) {
          productPrice = parseFloat(selectedProductForVariant.bulkPriceEur);
        } else if (selectedProductForVariant.bulkPriceEur || selectedProductForVariant.bulkPriceCzk) {
          productPrice = parseFloat(selectedProductForVariant.bulkPriceEur || selectedProductForVariant.bulkPriceCzk || '0');
        }
      }
      
      // Fallback to retail prices if no wholesale price or retail mode
      if (productPrice === 0) {
        if (selectedCurrency === 'CZK' && selectedProductForVariant.priceCzk) {
          productPrice = parseFloat(selectedProductForVariant.priceCzk);
        } else if (selectedCurrency === 'EUR' && selectedProductForVariant.priceEur) {
          productPrice = parseFloat(selectedProductForVariant.priceEur);
        } else {
          productPrice = parseFloat(selectedProductForVariant.priceEur || selectedProductForVariant.priceCzk || '0');
        }
      }
      
      // Check if this product's category has available free slots (from Buy X Get Y)
      const productCategoryId = selectedProductForVariant.categoryId?.toString() || null;
      const availableFreeSlot = findAvailableFreeSlots(productCategoryId);
      
      // Calculate effective remaining slots (subtract already consumed in this batch)
      const discountKey = availableFreeSlot ? `${availableFreeSlot.discountId}-${availableFreeSlot.categoryId}` : '';
      const alreadyConsumed = consumedFreeSlots[discountKey] || 0;
      const effectiveRemainingSlots = availableFreeSlot 
        ? Math.max(0, availableFreeSlot.remainingFreeSlots - alreadyConsumed) 
        : 0;
      
      // If there are available free slots for this category, split between free and paid
      if (availableFreeSlot && effectiveRemainingSlots > 0) {
        const freeQty = Math.min(quantity, effectiveRemainingSlots);
        
        // Track consumed slots for this batch
        consumedFreeSlots[discountKey] = alreadyConsumed + freeQty;
        const paidQty = quantity - freeQty;
        
        // Add free item(s)
        if (freeQty > 0) {
          const freeItem: OrderItem = {
            id: Math.random().toString(36).substr(2, 9),
            productId: selectedProductForVariant.id,
            variantId: variant.id,
            variantName: variant.name,
            productName: `${selectedProductForVariant.name} - ${variant.name}`,
            sku: variant.barcode || selectedProductForVariant.sku,
            quantity: freeQty,
            price: 0,
            originalPrice: productPrice,
            discount: 0,
            discountPercentage: 0,
            tax: 0,
            total: 0,
            landingCost: parseFloat(variant.importCostEur || variant.importCostCzk || '0') || null,
            image: variant.photo || selectedProductForVariant.image || null,
            appliedDiscountId: availableFreeSlot.discountId,
            appliedDiscountLabel: availableFreeSlot.discountName,
            appliedDiscountType: 'buy_x_get_y',
            appliedDiscountScope: 'specific_category',
            categoryId: productCategoryId,
            isFreeItem: true,
          };
          
          setOrderItems(items => [...items, freeItem]);
        }
        
        // Add paid item(s) if there's overflow
        if (paidQty > 0) {
          // Check for applicable discount for paid items
          const applicableDiscount = findApplicableDiscount(selectedProductForVariant.id, selectedProductForVariant.categoryId);
          let discountAmount = 0;
          let discountPct = 0;
          let discountLabel = '';
          let discountId = null;
          let discountType = null;
          let discountScope = null;
          
          if (applicableDiscount && (applicableDiscount.type || applicableDiscount.discountType) !== 'buy_x_get_y') {
            const discountResult = calculateDiscountAmount(applicableDiscount, productPrice, paidQty);
            if (applicableDiscount.type === 'percentage') {
              discountPct = parseFloat(applicableDiscount.percentage || '0');
              discountAmount = (productPrice * paidQty * discountPct) / 100;
            } else {
              discountAmount = discountResult.amount;
            }
            discountLabel = applicableDiscount.name || discountResult.label;
            discountId = applicableDiscount.id;
            discountType = applicableDiscount.type || applicableDiscount.discountType;
            discountScope = applicableDiscount.applicationScope;
          }
          
          const paidItem: OrderItem = {
            id: Math.random().toString(36).substr(2, 9),
            productId: selectedProductForVariant.id,
            variantId: variant.id,
            variantName: variant.name,
            productName: `${selectedProductForVariant.name} - ${variant.name}`,
            sku: variant.barcode || selectedProductForVariant.sku,
            quantity: paidQty,
            price: productPrice,
            discount: discountAmount,
            discountPercentage: discountPct,
            tax: 0,
            total: productPrice * paidQty - discountAmount,
            landingCost: parseFloat(variant.importCostEur || variant.importCostCzk || '0') || null,
            image: variant.photo || selectedProductForVariant.image || null,
            appliedDiscountId: discountId,
            appliedDiscountLabel: discountLabel || null,
            appliedDiscountType: discountType,
            appliedDiscountScope: discountScope,
            categoryId: productCategoryId,
            isFreeItem: false,
          };
          
          setOrderItems(items => [...items, paidItem]);
        }
      } else {
        // Check for applicable discount (non Buy X Get Y)
        const applicableDiscount = findApplicableDiscount(selectedProductForVariant.id, selectedProductForVariant.categoryId);
        let discountAmount = 0;
        let discountPct = 0;
        let discountLabel = '';
        let discountId = null;
        let discountType = null;
        let discountScope = null;
        
        if (applicableDiscount) {
          // Skip Buy X Get Y discounts - they're handled by the allocation system
          if ((applicableDiscount.type || applicableDiscount.discountType) !== 'buy_x_get_y') {
            const discountResult = calculateDiscountAmount(applicableDiscount, productPrice, quantity);
            if (applicableDiscount.type === 'percentage') {
              discountPct = parseFloat(applicableDiscount.percentage || '0');
              discountAmount = (productPrice * quantity * discountPct) / 100;
            } else {
              discountAmount = discountResult.amount;
            }
            if (!discountLabel) {
              discountLabel = applicableDiscount.name || discountResult.label;
            }
            discountId = applicableDiscount.id;
            discountType = applicableDiscount.type || applicableDiscount.discountType;
            discountScope = applicableDiscount.applicationScope;
          }
        }

        const newItem: OrderItem = {
          id: Math.random().toString(36).substr(2, 9),
          productId: selectedProductForVariant.id,
          variantId: variant.id,
          variantName: variant.name,
          productName: `${selectedProductForVariant.name} - ${variant.name}`,
          sku: variant.barcode || selectedProductForVariant.sku,
          quantity: quantity,
          price: productPrice,
          discount: discountAmount,
          discountPercentage: discountPct,
          tax: 0,
          total: productPrice * quantity - discountAmount,
          landingCost: parseFloat(variant.importCostEur || variant.importCostCzk || '0') || null,
          image: variant.photo || selectedProductForVariant.image || null,
          appliedDiscountId: discountId,
          appliedDiscountLabel: discountLabel || null,
          appliedDiscountType: discountType,
          appliedDiscountScope: discountScope,
          categoryId: productCategoryId,
          isFreeItem: false,
        };
        
        setOrderItems(items => [...items, newItem]);
      }
    }
    
    toast({
      title: t('common:success'),
      description: t('orders:variantsAddedToOrder', { count: variantsToAdd.length }),
    });
    
    setShowVariantDialog(false);
    setSelectedProductForVariant(null);
    setProductVariants([]);
    setVariantQuantities({});
  };

  // Commit free item quantity - handles split logic on blur/enter/tab
  // This merges overflow into existing paid rows instead of creating duplicates
  const commitFreeItemQuantity = (id: string, newQuantity: number) => {
    const currentItem = orderItems.find(item => item.id === id);
    if (!currentItem?.isFreeItem || !currentItem.categoryId || !currentItem.appliedDiscountId) {
      return; // Not a free item, nothing to do
    }
    
    // Find the allocation for this category/discount
    const allocation = buyXGetYAllocations.find(
      alloc => alloc.categoryId === currentItem.categoryId?.toString() && 
               alloc.discountId === currentItem.appliedDiscountId
    );
    
    if (!allocation) return;
    
    // Calculate max free quantity allowed for this item
    // freeItemsEarned = total free slots from paid items
    // We need to subtract OTHER free items (not this one) to get what's available for this item
    const otherFreeItemsQty = orderItems
      .filter(item => 
        item.isFreeItem && 
        item.id !== id && 
        item.categoryId?.toString() === currentItem.categoryId?.toString() &&
        item.appliedDiscountId === currentItem.appliedDiscountId
      )
      .reduce((sum, item) => sum + item.quantity, 0);
    
    const maxFreeQuantity = Math.max(0, allocation.freeItemsEarned - otherFreeItemsQty);
    
    if (newQuantity <= maxFreeQuantity) {
      // All fits in free slots - just update quantity
      setOrderItems(items =>
        items.map(item => {
          if (item.id === id) {
            return { ...item, quantity: newQuantity, total: 0 };
          }
          return item;
        })
      );
      return;
    }
    
    // Need to split: keep max free in this item, handle remainder as paid
    const freeQuantity = maxFreeQuantity;
    const paidQuantity = newQuantity - maxFreeQuantity;
    const paidPrice = currentItem.originalPrice || currentItem.price || 0;
    
    setOrderItems(items => {
      // First, update the free item quantity
      let updatedItems = items.map(item => {
        if (item.id === id) {
          if (freeQuantity > 0) {
            return { ...item, quantity: freeQuantity, total: 0 };
          } else {
            // No free slots - convert to paid
            return {
              ...item,
              quantity: newQuantity,
              price: paidPrice,
              isFreeItem: false,
              total: newQuantity * paidPrice,
              originalPrice: undefined,
              appliedDiscountId: undefined,
              appliedDiscountLabel: undefined,
              appliedDiscountType: undefined,
              appliedDiscountScope: undefined,
            };
          }
        }
        return item;
      });
      
      // If we have paid quantity to add, check for existing paid item to merge into
      if (paidQuantity > 0 && freeQuantity > 0) {
        // Find existing non-free item with same product/variant
        const existingPaidIndex = updatedItems.findIndex(item => 
          !item.isFreeItem &&
          item.productId === currentItem.productId &&
          item.variantId === currentItem.variantId &&
          item.bundleId === currentItem.bundleId &&
          item.serviceId === currentItem.serviceId &&
          item.id !== id
        );
        
        if (existingPaidIndex !== -1) {
          // Merge into existing paid item
          const existingPaid = updatedItems[existingPaidIndex];
          const newPaidQty = existingPaid.quantity + paidQuantity;
          updatedItems = updatedItems.map((item, idx) => {
            if (idx === existingPaidIndex) {
              const newTotal = (newPaidQty * item.price) - (item.discount || 0);
              return { ...item, quantity: newPaidQty, total: newTotal };
            }
            return item;
          });
        } else {
          // Create new paid item
          const newPaidItem: OrderItem = {
            id: Math.random().toString(36).substr(2, 9),
            productId: currentItem.productId,
            productName: currentItem.productName,
            sku: currentItem.sku,
            variantId: currentItem.variantId,
            variantName: currentItem.variantName,
            quantity: paidQuantity,
            price: paidPrice,
            discount: 0,
            discountPercentage: 0,
            tax: 0,
            total: paidQuantity * paidPrice,
            landingCost: currentItem.landingCost,
            image: currentItem.image,
            categoryId: currentItem.categoryId,
            isFreeItem: false,
          };
          updatedItems = [...updatedItems, newPaidItem];
        }
        
        toast({
          title: t('orders:freeItemLimitReached'),
          description: t('orders:freeItemSplitMessage', { free: freeQuantity, paid: paidQuantity }),
        });
      }
      
      return updatedItems;
    });
  };

  const updateOrderItem = (id: string, field: keyof OrderItem, value: any) => {
    // For free items, just update quantity without split logic
    // Split logic is handled by commitFreeItemQuantity on blur/enter/tab
    
    setOrderItems(items =>
      items.map(item => {
        if (item.id === id) {
          let finalValue = value;
          
          // Stock validation when quantity changes
          if (field === 'quantity' && !item.serviceId) {
            const requestedQty = typeof value === 'number' ? value : parseInt(value || '1');
            
            // Get available stock for this product/variant/bundle
            let baseStock = 0;
            if (item.bundleId) {
              const bundle = Array.isArray(allBundles) ? allBundles.find((b: any) => b.id === item.bundleId) : null;
              baseStock = bundle?.availableStock ?? 0;
            } else if (item.variantId && item.productId) {
              // For variants, look up variant stock from productsWithVariants or use a fallback
              const variants = productsWithVariants[item.productId];
              const variant = variants?.find((v: any) => v.id === item.variantId);
              baseStock = variant?.stockQuantity ?? variant?.quantity ?? 0;
            } else if (item.productId) {
              const product = Array.isArray(allProducts) ? allProducts.find((p: any) => p.id === item.productId) : null;
              baseStock = product?.quantity ?? 0;
            }
            
            // Calculate how much is already in order by OTHER items (not this one)
            const otherItemsQty = items.reduce((total, otherItem) => {
              if (otherItem.id === id) return total; // Skip the current item being edited
              if (item.bundleId && otherItem.bundleId === item.bundleId) {
                return total + otherItem.quantity;
              }
              if (item.productId && otherItem.productId === item.productId) {
                if (item.variantId) {
                  if (otherItem.variantId === item.variantId) {
                    return total + otherItem.quantity;
                  }
                } else if (!otherItem.variantId) {
                  return total + otherItem.quantity;
                }
              }
              return total;
            }, 0);
            
            const availableStock = Math.max(0, baseStock - otherItemsQty);
            
            // Cap quantity to available stock
            if (requestedQty > availableStock && availableStock > 0) {
              finalValue = availableStock;
              toast({
                title: t('orders:quantityReduced'),
                description: t('orders:onlyXInStock', { count: availableStock }),
                variant: "destructive",
              });
            } else if (availableStock <= 0 && requestedQty > item.quantity) {
              // Don't allow increasing if no stock available
              finalValue = item.quantity;
              toast({
                title: t('orders:outOfStock'),
                description: t('orders:noMoreStockAvailable'),
                variant: "destructive",
              });
            }
          }
          
          const updatedItem = { ...item, [field]: finalValue };
          
          // Recalculate discount amount from percentage when quantity or price changes
          if ((field === 'quantity' || field === 'price') && updatedItem.discountPercentage > 0) {
            updatedItem.discount = (updatedItem.price * updatedItem.quantity * updatedItem.discountPercentage) / 100;
          }
          
          // For Buy X Get Y items marked as free, keep them as free regardless of quantity changes
          // The allocation system will handle reassigning free status when items are removed
          
          // When user manually changes discountPercentage, recalculate discount amount
          if (field === 'discountPercentage') {
            const pct = typeof value === 'number' ? value : parseFloat(value || '0');
            updatedItem.discountPercentage = pct;
            updatedItem.discount = (updatedItem.price * updatedItem.quantity * pct) / 100;
          }
          
          if (field === 'quantity' || field === 'price' || field === 'discount' || field === 'discountPercentage') {
            updatedItem.total = (updatedItem.quantity * updatedItem.price) - updatedItem.discount;
          }
          return updatedItem;
        }
        return item;
      })
    );
  };

  const removeOrderItem = (id: string) => {
    setOrderItems(items => items.filter(item => item.id !== id));
  };

  // Apply pending service to order (adds service fee and parts costs as order items)
  const applyPendingService = async (service: any) => {
    // Prevent duplicate application
    if (appliedServiceIds.has(service.id)) {
      toast({
        title: t('orders:serviceAlreadyApplied'),
        description: t('orders:serviceAlreadyAppliedDesc'),
        variant: "destructive",
      });
      return;
    }

    const selectedCurrency = form.watch('currency') || 'EUR';
    const newItems: OrderItem[] = [];

    // Add service fee (labor cost) as an order item
    const serviceFee = parseFloat(service.serviceCost || '0');
    if (serviceFee > 0) {
      newItems.push({
        id: Math.random().toString(36).substr(2, 9),
        serviceId: service.id,
        productName: `${t('orders:serviceFee')}: ${service.name}`,
        sku: 'SERVICE-FEE',
        quantity: 1,
        price: serviceFee,
        discount: 0,
        discountPercentage: 0,
        tax: 0,
        total: serviceFee,
      });
    }

    // Fetch service items (parts) and add them to order
    try {
      const response = await apiRequest('GET', `/api/services/${service.id}/items`);
      if (response.ok) {
        const serviceItems = await response.json();
        for (const item of serviceItems) {
          const itemQuantity = parseInt(item.quantity) || 1;
          
          // Get price from inventory product if available, fallback to service item price
          let unitPrice = parseFloat(item.unitPrice || '0');
          let productImage = null;
          
          // If we have product data from inventory, use its price and image
          if (item.product) {
            productImage = item.product.image || null;
            
            // Get price based on selected currency
            if (selectedCurrency === 'CZK' && item.product.priceCzk) {
              unitPrice = parseFloat(item.product.priceCzk);
            } else if (selectedCurrency === 'EUR' && item.product.priceEur) {
              unitPrice = parseFloat(item.product.priceEur);
            } else if (item.product.priceEur || item.product.priceCzk) {
              unitPrice = parseFloat(item.product.priceEur || item.product.priceCzk || '0');
            }
          }
          
          const lineTotal = unitPrice * itemQuantity;
          newItems.push({
            id: Math.random().toString(36).substr(2, 9),
            productId: item.productId || undefined,
            serviceId: service.id,
            productName: item.productName || t('orders:servicePart'),
            sku: item.sku || 'PART',
            quantity: itemQuantity,
            price: unitPrice,
            discount: 0,
            discountPercentage: 0,
            tax: 0,
            total: lineTotal,
            image: productImage,
            isServicePart: true,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching service items:', error);
    }

    // Add all items to order
    if (newItems.length > 0) {
      setOrderItems(items => [...items, ...newItems]);
      setAppliedServiceIds(prev => new Set([...prev, service.id]));
      // Auto-check Service BILL when a service is applied
      setIncludeServiceBill(true);
      toast({
        title: t('orders:serviceApplied'),
        description: t('orders:serviceAppliedDesc', { name: service.name }),
      });
    }
  };

  // Recalculate all item prices when switching between retail and wholesale
  const recalculatePricesForSaleType = useCallback(async (newSaleType: 'retail' | 'wholesale') => {
    if (orderItems.length === 0) return;
    
    const selectedCurrency = form.watch('currency') || 'EUR';
    const productIds = orderItems.filter(item => item.productId).map(item => item.productId);
    
    if (productIds.length === 0) return;
    
    try {
      // Fetch all products to get their prices
      const response = await fetch('/api/products');
      if (!response.ok) return;
      
      const allProducts = await response.json();
      const productMap = new Map(allProducts.map((p: any) => [p.id, p]));
      
      setOrderItems(items => items.map(item => {
        if (!item.productId) return item; // Skip services
        
        const product = productMap.get(item.productId);
        if (!product) return item;
        
        let newPrice = 0;
        
        if (newSaleType === 'wholesale') {
          // Use bulk/wholesale prices if available
          if (selectedCurrency === 'CZK' && product.bulkPriceCzk) {
            newPrice = parseFloat(product.bulkPriceCzk);
          } else if (selectedCurrency === 'EUR' && product.bulkPriceEur) {
            newPrice = parseFloat(product.bulkPriceEur);
          } else if (product.bulkPriceEur || product.bulkPriceCzk) {
            newPrice = parseFloat(product.bulkPriceEur || product.bulkPriceCzk || '0');
          }
        }
        
        // Fallback to retail prices if no wholesale price or retail mode
        if (newPrice === 0) {
          if (selectedCurrency === 'CZK' && product.priceCzk) {
            newPrice = parseFloat(product.priceCzk);
          } else if (selectedCurrency === 'EUR' && product.priceEur) {
            newPrice = parseFloat(product.priceEur);
          } else {
            newPrice = parseFloat(product.priceEur || product.priceCzk || '0');
          }
        }
        
        return {
          ...item,
          price: newPrice,
          total: (item.quantity * newPrice) - item.discount
        };
      }));
      
      toast({
        title: newSaleType === 'wholesale' ? t('orders:wholesalePricesApplied') : t('orders:retailPricesApplied'),
        description: t('orders:pricesUpdatedForSaleType'),
      });
    } catch (error) {
      console.error('Error recalculating prices:', error);
    }
  }, [orderItems, form, toast, t]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setUploadedFiles(prev => [...prev, ...newFiles]);
      toast({
        title: t('common:success'),
        description: t('orders:filesUploadedSuccessfully', { count: newFiles.length }),
      });
    }
  };

  const removeUploadedFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    toast({
      title: t('orders:fileRemoved'),
      description: t('orders:fileRemovedFromList'),
    });
  };

  // Calculate totals using shared financial helpers
  const totals = useMemo(() => {
    const rawSubtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
    const currency = form.watch('currency') || 'CZK';
    const shippingValue = form.watch('shippingCost');
    const discountValue = form.watch('discountValue');
    const discountType = form.watch('discountType');
    const adjustmentValue = form.watch('adjustment');
    const customTaxRate = form.watch('taxRate');
    const shipping = typeof shippingValue === 'string' ? parseFloat(shippingValue || '0') : (shippingValue || 0);
    const discountAmount = typeof discountValue === 'string' ? parseFloat(discountValue || '0') : (discountValue || 0);
    const adjustment = typeof adjustmentValue === 'string' ? parseFloat(adjustmentValue || '0') : (adjustmentValue || 0);

    // Calculate actual discount based on type
    let actualDiscount = 0;
    if (discountType === 'rate') {
      actualDiscount = (rawSubtotal * discountAmount) / 100;
    } else {
      actualDiscount = discountAmount;
    }

    // Calculate subtotal after discount
    const subtotalAfterDiscount = rawSubtotal - actualDiscount;

    // Use shared financial helpers for tax calculation with custom tax rate support
    const calculated = financialHelpers.calculateOrderTotals(
      subtotalAfterDiscount,
      currency,
      {
        customTaxRate: customTaxRate,
        taxEnabled: showTaxInvoice,
      }
    );

    const totalBeforeStoreCredit = calculated.grandTotal + shipping + adjustment;
    
    // Calculate store credit to apply (up to available credit or order total, whichever is less)
    const availableStoreCredit = selectedCustomer?.storeCredit ? parseFloat(selectedCustomer.storeCredit) : 0;
    const storeCreditApplied = Math.min(availableStoreCredit, Math.max(0, totalBeforeStoreCredit));

    return {
      subtotal: rawSubtotal,
      taxAmount: calculated.taxAmount,
      storeCreditApplied: storeCreditApplied,
      grandTotal: totalBeforeStoreCredit - storeCreditApplied,
    };
  }, [orderItems, form.watch('currency'), form.watch('shippingCost'), form.watch('discountValue'), form.watch('discountType'), form.watch('adjustment'), form.watch('taxRate'), showTaxInvoice, financialHelpers, selectedCustomer]);

  // Legacy helper functions for backward compatibility
  const calculateSubtotal = () => totals.subtotal;
  const calculateTax = () => totals.taxAmount;
  const calculateGrandTotal = () => totals.grandTotal;

  const onSubmit = (data: z.infer<typeof addOrderSchema>) => {
    if (orderItems.length === 0) {
      toast({
        title: t('common:error'),
        description: t('orders:pleaseAddAtLeastOneItem'),
        variant: "destructive",
      });
      return;
    }

    const orderData = {
      ...data,
      // Don't override customerId - it's set in createOrderMutation if a new customer is created
      shippingAddressId: selectedShippingAddress?.id || null,
      subtotal: calculateSubtotal().toFixed(2),
      taxAmount: (showTaxInvoice ? calculateTax() : 0).toFixed(2),
      grandTotal: calculateGrandTotal().toFixed(2),
      discountValue: (data.discountValue || 0).toString(),
      taxRate: (showTaxInvoice ? (data.taxRate || 0) : 0).toString(),
      shippingCost: (data.shippingCost || 0).toString(),
      actualShippingCost: (data.actualShippingCost || 0).toString(),
      adjustment: (data.adjustment || 0).toString(),
      codAmount: data.codAmount && data.codAmount > 0 ? data.codAmount.toString() : null,
      codCurrency: data.codAmount && data.codAmount > 0 ? (data.codCurrency || 'CZK') : null,
      items: orderItems.map(item => ({
        productId: item.productId,
        serviceId: item.serviceId,
        variantId: item.variantId || undefined,
        variantName: item.variantName || undefined,
        bundleId: item.bundleId || undefined,
        productName: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        price: item.price.toFixed(2),
        total: item.total.toFixed(2),
        discount: item.discount?.toFixed(2) || '0.00',
        appliedDiscountId: item.appliedDiscountId || undefined,
        appliedDiscountLabel: item.appliedDiscountLabel || undefined,
        appliedDiscountType: item.appliedDiscountType || undefined,
        appliedDiscountScope: item.appliedDiscountScope || undefined,
        freeItemsCount: item.freeItemsCount || undefined,
        image: item.image || undefined,
        landingCost: item.landingCost?.toString() || undefined,
        notes: item.notes || undefined,
        isServicePart: item.isServicePart || undefined,
      })),
      includedDocuments: {
        uploadedFiles: uploadedFiles.map(f => ({ name: f.name, size: f.size })),
        includeServiceBill: includeServiceBill,
      },
    };

    createOrderMutation.mutate(orderData);
  };

  // Calculate product frequency from order history
  const productFrequency = useMemo(() => {
    if (!Array.isArray(allOrders)) return {};
    
    const frequency: Record<string, number> = {};
    
    allOrders.forEach((order: any) => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          if (item.productId) {
            frequency[item.productId] = (frequency[item.productId] || 0) + (item.quantity || 1);
          }
        });
      }
    });
    
    return frequency;
  }, [allOrders]);

  // Filter products, services, and bundles with enhanced fuzzy search and smart scoring (memoized for performance)
  const filteredProducts = useMemo(() => {
    const searchTerm = debouncedProductSearch;
    const hasSearchTerm = searchTerm && searchTerm.length >= 2;

    if (!hasSearchTerm) {
      // No search term - include all items sorted by frequency
      const allItems = [
        ...(Array.isArray(allProducts) ? allProducts.map((p: any) => ({ ...p, isService: false, isBundle: false })) : []),
        ...(Array.isArray(allServices) ? allServices.map((s: any) => ({ ...s, isService: true, isBundle: false })) : []),
        ...(Array.isArray(allBundles) ? allBundles.map((b: any) => ({ ...b, isService: false, isBundle: true })) : []),
      ];
      // Sort by frequency
      return allItems.sort((a, b) => {
        const freqA = productFrequency[a.originalProductId || a.id] || 0;
        const freqB = productFrequency[b.originalProductId || b.id] || 0;
        return freqB - freqA;
      });
    }

    // Combine all items for search
    const allItems = [
      ...(Array.isArray(allProducts) ? allProducts.map((p: any) => ({ ...p, isService: false, isBundle: false })) : []),
      ...(Array.isArray(allServices) ? allServices.map((s: any) => ({ ...s, isService: true, isBundle: false })) : []),
      ...(Array.isArray(allBundles) ? allBundles.map((b: any) => ({ ...b, isService: false, isBundle: true })) : []),
    ];

    // Use fuzzySearch with custom scoring that includes frequency
    const results = fuzzySearch(allItems, searchTerm, {
      fields: ['name', 'sku', 'description', 'nameCz', 'nameVn'],
      threshold: 0.15, // Lower threshold for better recall
      fuzzy: true,
      vietnameseNormalization: true,
    });

    // Apply frequency bonus to scores
    const scoredResults = results.map(result => {
      const frequency = productFrequency[result.item.originalProductId || result.item.id] || 0;
      const frequencyBonus = Math.min(frequency * 0.5, 10); // Up to 10 points bonus
      return {
        ...result,
        score: result.score + frequencyBonus,
      };
    });

    // Sort by adjusted score and return top 10 (increased to accommodate bulk versions)
    scoredResults.sort((a, b) => b.score - a.score);
    return scoredResults.slice(0, 10).map(r => r.item);
  }, [allProducts, allServices, allBundles, debouncedProductSearch, productFrequency]);

  // Filter customers with Vietnamese search (memoized for performance)
  const filteredCustomers = useMemo(() => {
    if (!Array.isArray(allCustomers) || !debouncedCustomerSearch || debouncedCustomerSearch.length < 2) return [];

    // Check if the search query is a Facebook URL
    const extractedFbId = extractFacebookId(debouncedCustomerSearch);
    
    if (extractedFbId) {
      // Search by facebookId or facebookName directly
      const exactMatches = allCustomers.filter((customer: any) => 
        customer.facebookId === extractedFbId || 
        customer.facebookName?.toLowerCase() === extractedFbId.toLowerCase() ||
        customer.facebookUrl?.includes(extractedFbId)
      );
      
      if (exactMatches.length > 0) {
        return exactMatches;
      }
    }

    const results = fuzzySearch(allCustomers, debouncedCustomerSearch, {
      fields: ['name', 'facebookName', 'email', 'phone', 'company', 'facebookId'],
      threshold: 0.2, // Lower threshold for more results
      fuzzy: true,
      vietnameseNormalization: true,
    });

    // Limit to top 8 results
    return results.slice(0, 8).map(r => r.item);
  }, [allCustomers, debouncedCustomerSearch]);

  // Fetch available discounts (always get fresh data)
  const { data: discounts } = useQuery({
    queryKey: ['/api/discounts'],
    staleTime: 0, // Always fetch fresh discount data
    refetchOnMount: 'always',
  });

  // Calculate Buy X Get Y allocations based on order items and active discounts
  useEffect(() => {
    if (!discounts || !Array.isArray(discounts)) {
      setBuyXGetYAllocations([]);
      return;
    }

    // Find all active Buy X Get Y discounts with category scope
    const buyXGetYDiscounts = discounts.filter((d: any) => {
      // Check status is active
      if (d.status !== 'active') return false;
      // Must be buy_x_get_y type
      if (d.type !== 'buy_x_get_y') return false;
      // Must be category-scoped for this allocation system (accept both 'specific_category' and 'category')
      if (d.applicationScope !== 'specific_category' && d.applicationScope !== 'category') return false;
      // Must have a categoryId
      if (!d.categoryId) return false;
      
      // Check date validity
      const today = new Date();
      const todayUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
      if (d.startDate) {
        const startDate = new Date(d.startDate);
        const startUTC = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate());
        if (todayUTC < startUTC) return false;
      }
      if (d.endDate) {
        const endDate = new Date(d.endDate);
        const endUTC = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());
        if (todayUTC > endUTC) return false;
      }
      
      return true;
    });

    // Calculate allocations for each Buy X Get Y discount
    const allocations: BuyXGetYAllocation[] = buyXGetYDiscounts.map((discount: any) => {
      const categoryId = discount.categoryId?.toString() || null;
      const buyQty = discount.buyQuantity || 1;
      const getQty = discount.getQuantity || 1;
      
      // Count paid items in this category (excluding free items)
      const paidItems = orderItems.filter(item => {
        if (item.isFreeItem) return false;
        if (!item.categoryId) return false;
        return item.categoryId.toString() === categoryId;
      });
      
      const totalPaidItems = paidItems.reduce((sum, item) => sum + item.quantity, 0);
      
      // Calculate free items earned
      const freeItemsEarned = Math.floor(totalPaidItems / buyQty) * getQty;
      
      // Count already assigned free items
      const assignedFreeItems = orderItems.filter(item => {
        if (!item.isFreeItem) return false;
        if (!item.categoryId) return false;
        return item.categoryId.toString() === categoryId && item.appliedDiscountId === discount.id;
      });
      
      const freeItemsAssigned = assignedFreeItems.reduce((sum, item) => sum + item.quantity, 0);
      const remainingFreeSlots = Math.max(0, freeItemsEarned - freeItemsAssigned);

      return {
        discountId: discount.id,
        discountName: discount.name,
        categoryId,
        categoryName: discount.categoryName || 'Category',
        buyQty,
        getQty,
        totalPaidItems,
        freeItemsEarned,
        freeItemsAssigned,
        remainingFreeSlots,
      };
    });

    setBuyXGetYAllocations(allocations);
  }, [orderItems, discounts]);

  // Helper to find available free slots for a category
  const findAvailableFreeSlots = (categoryId: string | null): BuyXGetYAllocation | null => {
    if (!categoryId) return null;
    return buyXGetYAllocations.find(
      alloc => alloc.categoryId === categoryId.toString() && alloc.remainingFreeSlots > 0
    ) || null;
  };

  // Function to find applicable discount for a product
  const findApplicableDiscount = (productId: string, categoryId?: number | null): any | null => {
    if (!discounts || !Array.isArray(discounts)) return null;
    
    // Use UTC date for consistent comparison
    const now = new Date();
    const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    
    // Filter active discounts within date range
    const activeDiscounts = discounts.filter((discount: any) => {
      if (discount.status !== 'active') return false;
      
      // Check date validity using UTC
      if (discount.startDate) {
        const startDate = new Date(discount.startDate);
        const startUTC = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate());
        if (todayUTC < startUTC) return false;
      }
      if (discount.endDate) {
        const endDate = new Date(discount.endDate);
        const endUTC = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());
        if (todayUTC > endUTC) return false;
      }
      
      return true;
    });
    
    // Sort by priority: 
    // 1. Scope: specific_product > selected_products > specific_category > all_products
    // 2. Type: percentage/fixed > buy_x_get_y (percentage/fixed always give immediate discount)
    const scopePriority: Record<string, number> = {
      'specific_product': 1,
      'selected_products': 2,
      'specific_category': 3,
      'all_products': 4,
    };
    
    const typePriority: Record<string, number> = {
      'percentage': 1,
      'fixed': 1,
      'fixed_amount': 1,
      'buy_x_get_y': 2,
    };
    
    const sortedDiscounts = [...activeDiscounts].sort((a: any, b: any) => {
      const scopeA = scopePriority[a.applicationScope] || 5;
      const scopeB = scopePriority[b.applicationScope] || 5;
      if (scopeA !== scopeB) return scopeA - scopeB;
      
      // Within same scope, prioritize percentage/fixed over buy_x_get_y
      const typeA = typePriority[a.type] || 3;
      const typeB = typePriority[b.type] || 3;
      return typeA - typeB;
    });
    
    // Find first matching discount by scope
    for (const discount of sortedDiscounts) {
      const scope = discount.applicationScope || 'all_products';
      
      if (scope === 'specific_product' && discount.productId === productId) {
        return discount;
      } else if (scope === 'selected_products') {
        // Check if product is in selected products list
        const selectedIds = discount.selectedProductIds;
        if (selectedIds && Array.isArray(selectedIds) && selectedIds.includes(productId)) {
          return discount;
        }
      } else if (scope === 'specific_category') {
        // Check category match (compare as strings to handle type differences)
        const discountCategoryId = discount.categoryId ? String(discount.categoryId) : null;
        const productCategoryId = categoryId ? String(categoryId) : null;
        if (discountCategoryId && productCategoryId && discountCategoryId === productCategoryId) {
          return discount;
        }
      } else if (scope === 'all_products') {
        return discount;
      }
    }
    
    return null;
  };

  // Function to calculate discount amount for a product
  const calculateDiscountAmount = (discount: any, price: number, quantity: number): { 
    amount: number; 
    label: string; 
    freeItemsCount?: number;
    buyQty?: number;
    getQty?: number;
  } => {
    const discountType = discount.type || discount.discountType;
    
    if (discountType === 'percentage') {
      const percentage = parseFloat(discount.percentage || '0');
      const amount = (price * quantity * percentage) / 100;
      return { amount, label: `${percentage}% ${t('common:off')}` };
    } else if (discountType === 'fixed' || discountType === 'fixed_amount') {
      const fixedAmount = parseFloat(discount.value || discount.fixedAmount || '0');
      // Fixed amount is applied once per order line, not per unit
      const amount = Math.min(fixedAmount, price * quantity);
      return { amount, label: `${formatCurrency(fixedAmount, form.watch('currency'))} ${t('common:off')}` };
    } else if (discountType === 'buy_x_get_y') {
      // Buy X get Y free calculation: for every X items you pay for, you get Y free
      const buyQty = discount.buyQuantity || 1;
      const getQty = discount.getQuantity || 1;
      // For every buyQty items purchased, customer gets getQty free
      const completeSets = Math.floor(quantity / buyQty);
      const freeItems = completeSets * getQty;
      const amount = freeItems * price;
      return { 
        amount, 
        label: `BUY ${buyQty} GET ${getQty}`,
        freeItemsCount: freeItems,
        buyQty,
        getQty
      };
    }
    
    return { amount: 0, label: '' };
  };


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 overflow-x-hidden">
      <div className="p-3 sm:p-4 lg:p-6 w-full">
        {/* Header - Mobile Optimized */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm mb-4 lg:mb-6 p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.history.back()}
                className="w-fit"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">{t('orders:backToOrders')}</span>
                <span className="sm:hidden">{t('orders:back')}</span>
              </Button>
              <div className="hidden sm:block h-6 w-px bg-gray-200 dark:bg-gray-700" />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">{t('orders:createNewOrder')}</h1>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">{t('orders:addProductsConfigureDetails')}</p>
              </div>
            </div>
            <Badge variant="outline" className="text-green-600 border-green-600 w-fit">
              <Plus className="h-3 w-3 mr-1" />
              {t('orders:newOrder')}
            </Badge>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
          console.error('Order form validation errors:', errors);
          toast({
            title: t('orders:formValidationError'),
            description: t('orders:checkRequiredFields'),
            variant: "destructive",
          });
        })}>
          <div className="space-y-4 sm:space-y-6">
            {/* Mobile-Only Settings (at top) */}
            <div className="lg:hidden space-y-4">
              {/* Order Type (Retail/Wholesale) */}
              <Card className="shadow-sm">
                <CardHeader className="p-3 border-b">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Store className="h-4 w-4 text-blue-600" />
                    {t('orders:saleType')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  <Select 
                    value={form.watch('saleType') || 'retail'} 
                    onValueChange={(value: 'retail' | 'wholesale') => {
                      form.setValue('saleType', value);
                      recalculatePricesForSaleType(value);
                    }}
                  >
                    <SelectTrigger className="h-9" data-testid="select-sale-type-mobile">
                      <SelectValue placeholder={t('orders:selectSaleType')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="retail">
                        <div className="flex items-center gap-2">
                          <ShoppingBag className="h-4 w-4 text-green-600" />
                          {t('orders:retail')}
                        </div>
                      </SelectItem>
                      <SelectItem value="wholesale">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-blue-600" />
                          {t('orders:wholesale')}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* Order Settings */}
              <Card className="shadow-sm">
                <CardHeader className="p-3 border-b">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Settings className="h-4 w-4 text-blue-600" />
                    {t('orders:orderSettings')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-3">
                  <div>
                    <Label htmlFor="currency-mobile" className="text-xs">{t('orders:currency')}</Label>
                    <Select value={form.watch('currency')} onValueChange={(value) => form.setValue('currency', value as any)}>
                      <SelectTrigger className="mt-1 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CZK">CZK</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="VND">VND</SelectItem>
                        <SelectItem value="CNY">CNY</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="priority-mobile" className="text-xs">{t('orders:priority')}</Label>
                    <Select value={form.watch('priority')} onValueChange={(value) => form.setValue('priority', value as any)}>
                      <SelectTrigger className="mt-1 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 bg-gray-500 rounded-full" />
                            {t('orders:low')}
                          </div>
                        </SelectItem>
                        <SelectItem value="medium">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 bg-yellow-500 rounded-full" />
                            {t('orders:medium')}
                          </div>
                        </SelectItem>
                        <SelectItem value="high">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 bg-red-500 rounded-full" />
                            {t('orders:high')}
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Order Status and Payment Status side by side */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="orderStatus-mobile" className="text-xs">{t('orders:orderStatus')}</Label>
                      <Select value={form.watch('orderStatus')} onValueChange={(value) => form.setValue('orderStatus', value as any)}>
                        <SelectTrigger className="mt-1 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 bg-amber-500 rounded-full" />
                              {t('orders:pending')}
                            </div>
                          </SelectItem>
                          <SelectItem value="awaiting_stock">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 bg-orange-500 rounded-full" />
                              {t('orders:awaitingStock')}
                            </div>
                          </SelectItem>
                          <SelectItem value="to_fulfill">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 bg-blue-500 rounded-full" />
                              {t('orders:toFulfill')}
                            </div>
                          </SelectItem>
                          <SelectItem value="ready_to_ship">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 bg-cyan-500 rounded-full" />
                              {t('orders:readyToShip')}
                            </div>
                          </SelectItem>
                          <SelectItem value="shipped">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 bg-purple-500 rounded-full" />
                              {t('orders:shipped')}
                            </div>
                          </SelectItem>
                          <SelectItem value="delivered">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 bg-emerald-500 rounded-full" />
                              {t('orders:delivered')}
                            </div>
                          </SelectItem>
                          <SelectItem value="cancelled">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 bg-red-500 rounded-full" />
                              {t('orders:cancelled')}
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="paymentStatus-mobile" className="text-xs">{t('orders:paymentStatus')}</Label>
                      <Select value={form.watch('paymentStatus')} onValueChange={(value) => form.setValue('paymentStatus', value as any)}>
                        <SelectTrigger className="mt-1 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 bg-orange-500 rounded-full" />
                              {t('orders:pending')}
                            </div>
                          </SelectItem>
                          <SelectItem value="paid">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 bg-green-500 rounded-full" />
                              {t('orders:paid')}
                            </div>
                          </SelectItem>
                          <SelectItem value="pay_later">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 bg-blue-500 rounded-full" />
                              {t('orders:payLater')}
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 2-Column Grid for Desktop - Full Width Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
              
              {/* Left Column - Main Workflow (3/4 width) */}
              <div className="lg:col-span-3 space-y-4 sm:space-y-6">

            {/* Customer Selection - Mobile Optimized */}
            <Card className="shadow-sm">
              <CardHeader className="p-3 border-b">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <User className="h-4 w-4 text-blue-600" />
                  {t('orders:customerDetails')}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-1">{t('orders:searchSelectOrCreateNew')}</CardDescription>
              </CardHeader>
              <CardContent className="p-3 space-y-3">
            {/* Quick Customer Options */}
            {!selectedCustomer && !quickCustomerType && !showNewCustomerForm && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('orders:quickCustomer')}</Label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1.5 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
                    onClick={() => {
                      setShowNewCustomerForm(true);
                      setCustomerSearch("");
                    }}
                    data-testid="button-new-customer"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    {t('orders:newCustomer')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1.5 text-xs"
                    onClick={() => {
                      setQuickCustomerType('quick');
                      setQuickCustomerName("");
                    }}
                    data-testid="button-quick-temp-customer"
                  >
                    <User className="h-3.5 w-3.5" />
                    {t('orders:quickTemp')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1.5 text-xs"
                    onClick={() => {
                      setQuickCustomerType('tel');
                      setQuickCustomerName("");
                      setQuickCustomerPhone("");
                      form.setValue('orderType', 'tel');
                    }}
                    data-testid="button-telephone-customer"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {t('orders:telephoneCustomer')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1.5 text-xs"
                    onClick={() => {
                      setQuickCustomerType('msg');
                      setQuickCustomerName("");
                      setQuickCustomerPhone("");
                      setQuickCustomerSocialApp('whatsapp');
                    }}
                    data-testid="button-messaging-customer"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    {t('orders:messagingCustomer')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1.5 text-xs"
                    onClick={() => {
                      setQuickCustomerType('custom');
                      setQuickCustomerName("");
                    }}
                    data-testid="button-custom-customer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t('orders:customCustomer')}
                  </Button>
                </div>
                <Separator className="my-3" />
              </div>
            )}

            {/* Quick Customer Forms */}
            {quickCustomerType && !selectedCustomer && (
              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-blue-900 dark:text-blue-300">
                    {quickCustomerType === 'quick' && t('orders:quickCustomerOneTime')}
                    {quickCustomerType === 'tel' && t('orders:telephoneOrder')}
                    {quickCustomerType === 'msg' && t('orders:socialMediaCustomer')}
                    {quickCustomerType === 'custom' && t('orders:customCustomerOneTime')}
                  </h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setQuickCustomerType(null);
                      setQuickCustomerName("");
                      setQuickCustomerPhone("");
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Name field - shown for all types */}
                <div>
                  <Label htmlFor="quickCustomerName">{t('orders:name')} *</Label>
                  <Input
                    id="quickCustomerName"
                    value={quickCustomerName}
                    onChange={(e) => setQuickCustomerName(e.target.value)}
                    placeholder={t('orders:enterCustomerName')}
                    data-testid="input-quick-customer-name"
                  />
                </div>

                {/* Phone field - shown for Tel and Msg */}
                {(quickCustomerType === 'tel' || quickCustomerType === 'msg') && (
                  <div>
                    <Label htmlFor="quickCustomerPhone">
                      {quickCustomerType === 'msg' ? t('orders:idPhoneNumber') : t('orders:phone') + ' *'}
                    </Label>
                    <Input
                      id="quickCustomerPhone"
                      value={quickCustomerPhone}
                      onChange={(e) => {
                        // Remove all spaces from input
                        const noSpaces = e.target.value.replace(/\s/g, '');
                        setQuickCustomerPhone(noSpaces);
                      }}
                      placeholder="+420776887045"
                      data-testid="input-quick-customer-phone"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('orders:formatWithoutSpaces')}</p>
                  </div>
                )}

                {/* Social Media App - shown for Msg only */}
                {quickCustomerType === 'msg' && (
                  <div>
                    <Label htmlFor="quickCustomerSocialApp">{t('orders:socialMediaApp')}</Label>
                    <Select 
                      value={quickCustomerSocialApp} 
                      onValueChange={(value: any) => setQuickCustomerSocialApp(value)}
                    >
                      <SelectTrigger data-testid="select-social-app">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viber">{t('orders:viber')}</SelectItem>
                        <SelectItem value="whatsapp">{t('orders:whatsapp')}</SelectItem>
                        <SelectItem value="zalo">{t('orders:zalo')}</SelectItem>
                        <SelectItem value="email">{t('orders:email')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button
                  type="button"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    if (!quickCustomerName.trim()) {
                      toast({
                        title: t('orders:nameRequired'),
                        description: t('orders:nameRequiredDesc'),
                        variant: "destructive"
                      });
                      return;
                    }

                    if ((quickCustomerType === 'tel' || quickCustomerType === 'msg') && !quickCustomerPhone.trim()) {
                      toast({
                        title: t('orders:phoneRequired'),
                        description: t('orders:phoneRequiredDesc'),
                        variant: "destructive"
                      });
                      return;
                    }

                    // Create temporary customer object
                    const tempCustomer = {
                      id: `temp-${quickCustomerType}-${Date.now()}`,
                      name: quickCustomerName,
                      email: quickCustomerType === 'msg' && quickCustomerSocialApp === 'email' ? quickCustomerPhone : "",
                      phone: quickCustomerType === 'tel' || (quickCustomerType === 'msg' && quickCustomerSocialApp !== 'email') ? quickCustomerPhone : "",
                      type: "regular",
                      isTemporary: quickCustomerType === 'quick' || quickCustomerType === 'custom',
                      needsSaving: quickCustomerType === 'tel' || quickCustomerType === 'msg',
                      socialMediaApp: quickCustomerType === 'msg' ? quickCustomerSocialApp : undefined
                    };

                    setSelectedCustomer(tempCustomer);
                    setCustomerSearch(quickCustomerName);
                  }}
                  data-testid="button-confirm-quick-customer"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {t('orders:confirm')}
                </Button>
              </div>
            )}

            {!showNewCustomerForm && (
            <div className="relative customer-search-container">
              <Label htmlFor="customer">{t('orders:searchCustomer')}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  ref={customerSearchRef}
                  placeholder={t('orders:searchCustomerPlaceholder')}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    // Clear selected customer when user starts typing to search for a new one
                    if (selectedCustomer) {
                      setSelectedCustomer(null);
                      form.setValue('customerId', undefined);
                    }
                  }}
                  className="pl-10"
                  onFocus={() => setShowCustomerDropdown(customerSearch.length >= 2 && !selectedCustomer)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setShowCustomerDropdown(false);
                    }
                    // Backspace or Delete: Clear selected customer to allow new search
                    if ((e.key === 'Backspace' || e.key === 'Delete') && selectedCustomer) {
                      setSelectedCustomer(null);
                      form.setValue('customerId', undefined);
                      setShowCustomerDropdown(true);
                    }
                    // Enter: Select first customer from dropdown
                    if (e.key === 'Enter' && filteredCustomers && filteredCustomers.length > 0) {
                      e.preventDefault();
                      const firstCustomer = filteredCustomers[0];
                      if (firstCustomer) {
                        setSelectedCustomer(firstCustomer);
                        setCustomerSearch(firstCustomer.name);
                        setShowCustomerDropdown(false);
                        // Set customerId in form
                        form.setValue('customerId', firstCustomer.id);
                        if (firstCustomer.hasPayLaterBadge) {
                          form.setValue('paymentStatus', 'pay_later');
                        }
                        // Auto-set currency based on customer preference or country
                        const customerCurrency = firstCustomer.preferredCurrency || 
                          (firstCustomer.country ? getCurrencyByCountry(firstCustomer.country) : null);
                        if (customerCurrency) {
                          form.setValue('currency', customerCurrency);
                        }
                        // Auto-focus product search for fast keyboard navigation
                        setTimeout(() => {
                          productSearchRef.current?.focus();
                        }, 100);
                      }
                    }
                  }}
                  data-testid="input-customer-search"
                />
                {selectedCustomer && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-8 w-8 p-0"
                    onClick={() => {
                      setSelectedCustomer(null);
                      setCustomerSearch("");
                      form.setValue('customerId', undefined);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Real-time dropdown for customers */}
              {showCustomerDropdown && filteredCustomers && filteredCustomers.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg bg-white dark:bg-slate-800 max-h-[450px] overflow-y-auto z-50">
                  <div className="p-2 bg-slate-50 dark:bg-slate-700 border-b border-gray-200 dark:border-gray-700 text-xs text-slate-600 dark:text-slate-400 sticky top-0 z-10">
                    {t('orders:customersFound', { count: filteredCustomers.length })}
                  </div>
                  {filteredCustomers.map((customer: any) => (
                    <div
                      key={customer.id}
                      className="p-3 hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer border-b border-gray-200 dark:border-gray-700 last:border-b-0 transition-colors"
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setCustomerSearch(customer.name);
                        setShowCustomerDropdown(false);
                        // Set customerId in form
                        form.setValue('customerId', customer.id);
                        // Auto-set payment status to Pay Later if customer has Pay Later badge
                        if (customer.hasPayLaterBadge) {
                          form.setValue('paymentStatus', 'pay_later');
                        }
                        // Auto-set currency based on customer preference or country
                        const customerCurrency = customer.preferredCurrency || 
                          (customer.country ? getCurrencyByCountry(customer.country) : null);
                        if (customerCurrency) {
                          form.setValue('currency', customerCurrency);
                        }
                        // Auto-focus product search for fast keyboard navigation
                        setTimeout(() => {
                          productSearchRef.current?.focus();
                        }, 100);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-sm font-semibold">
                            {customer.profilePictureUrl ? (
                              <img 
                                src={customer.profilePictureUrl} 
                                alt={customer.name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              customer.name?.charAt(0)?.toUpperCase() || '?'
                            )}
                          </div>
                        </div>
                        
                        {/* Main info */}
                        <div className="flex-1 min-w-0">
                          {/* Name, flag, and badges */}
                          <div className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2 flex-wrap mb-1">
                            <span className="flex items-center gap-1.5">
                              {customer.country && (
                                <span className="text-base">{getCountryFlag(customer.country)}</span>
                              )}
                              <span className="truncate font-semibold">{customer.name}</span>
                            </span>
                            {customer.hasPayLaterBadge && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-yellow-50 border-yellow-300 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-600 dark:text-yellow-400">
                                Pay Later
                              </Badge>
                            )}
                            {customer.type && customer.type !== 'regular' && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 capitalize">
                                {customer.type}
                              </Badge>
                            )}
                          </div>
                          
                          {/* Two-column details */}
                          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
                            {/* Left column */}
                            <div className="space-y-0.5">
                              {/* Company */}
                              {customer.company && (
                                <div className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                  <Building className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{customer.company}</span>
                                </div>
                              )}
                              
                              {/* Location */}
                              {(customer.city || customer.country) && (
                                <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                  <MapPin className="h-3 w-3 shrink-0" />
                                  <span className="truncate">
                                    {[customer.city, customer.country].filter(Boolean).join(', ')}
                                  </span>
                                </div>
                              )}
                              
                              {/* Phone */}
                              {customer.phone && (
                                <div className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                  <Phone className="h-3 w-3 shrink-0" />
                                  <span>{customer.phone}</span>
                                </div>
                              )}
                            </div>
                            
                            {/* Right column */}
                            <div className="space-y-0.5">
                              {/* Email */}
                              {customer.email && (
                                <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                  <Mail className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{customer.email}</span>
                                </div>
                              )}
                              
                              {/* Facebook */}
                              {(customer.facebookName || customer.facebookUrl) && (
                                <div className="text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                  <svg className="h-3 w-3 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                  </svg>
                                  <span className="truncate">{customer.facebookName || 'Facebook'}</span>
                                </div>
                              )}
                              
                              {/* Order stats */}
                              {customer.totalOrders > 0 && (
                                <div className="text-green-600 dark:text-green-400 flex items-center gap-1 font-medium">
                                  <Package className="h-3 w-3 shrink-0" />
                                  <span>{customer.totalOrders} orders</span>
                                  {customer.totalSpent && parseFloat(customer.totalSpent) > 0 && (
                                    <span className="text-slate-400 dark:text-slate-500">•</span>
                                  )}
                                  {customer.totalSpent && parseFloat(customer.totalSpent) > 0 && (
                                    <span>{formatCurrency(parseFloat(customer.totalSpent), customer.preferredCurrency || 'EUR')}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Last order date */}
                          {customer.lastOrderDate && (
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5" />
                              Last order: {new Date(customer.lastOrderDate).toLocaleDateString('cs-CZ')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* No results message with Add new customer button */}
              {showCustomerDropdown && customerSearch.length >= 2 && (!filteredCustomers || filteredCustomers.length === 0) && (
                <div className="absolute top-full left-0 right-0 mt-1 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-slate-800 shadow-lg p-4 text-center text-slate-500 dark:text-slate-400 z-50">
                  <Search className="h-6 w-6 mx-auto mb-2 text-slate-400 dark:text-slate-500" />
                  <div>No customers found for "{customerSearch}"</div>
                  <div className="text-xs mt-1">Try searching by name, email, phone, Facebook name, or paste a Facebook URL</div>
                  
                  {/* Show Facebook URL detected message */}
                  {extractFacebookId(customerSearch) && (
                    <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/30 rounded border border-blue-200 dark:border-blue-700">
                      <div className="flex items-center justify-center gap-1 text-xs text-blue-700 dark:text-blue-300">
                        <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                        Facebook URL detected: <span className="font-semibold">{extractFacebookId(customerSearch)}</span>
                      </div>
                    </div>
                  )}
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      const extractedFbId = extractFacebookId(customerSearch);
                      setShowNewCustomerForm(true);
                      
                      if (extractedFbId) {
                        // Facebook URL was pasted - use it as facebookUrl and facebookId
                        setNewCustomer({ 
                          ...newCustomer, 
                          name: '', // Don't use URL as name
                          facebookName: extractedFbId,
                          facebookUrl: customerSearch.trim(),
                        });
                      } else {
                        // Regular search text - use as name and facebookName
                        setNewCustomer({ 
                          ...newCustomer, 
                          name: customerSearch, 
                          facebookName: customerSearch 
                        });
                      }
                      setShowCustomerDropdown(false);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {extractFacebookId(customerSearch) ? 'Add customer with Facebook' : 'Add new customer'}
                  </Button>
                </div>
              )}
            </div>
            )}

            {selectedCustomer && (
              <Card className="mt-4 border-2 border-green-500 dark:border-green-600 bg-white dark:bg-slate-800">
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    {/* Avatar Section */}
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white shadow-lg">
                        {selectedCustomer.profilePictureUrl ? (
                          <img 
                            src={selectedCustomer.profilePictureUrl} 
                            alt={selectedCustomer.name}
                            className="w-16 h-16 rounded-full object-cover"
                          />
                        ) : (
                          <User className="h-8 w-8" />
                        )}
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div className="flex-1 min-w-0">
                      {/* Name and Badges Row */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            {/* Country Flag */}
                            {selectedCustomer.country && (
                              <span className="text-xl">
                                {getCountryFlag(selectedCustomer.country)}
                              </span>
                            )}
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {selectedCustomer.name}
                            </h3>
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          </div>
                          
                          {/* Customer Badges - Comprehensive badges like in orders table */}
                          {!selectedCustomer.id?.startsWith('temp-') && (
                            <CustomerBadges 
                              badges={selectedCustomer.badges}
                              customer={{
                                type: selectedCustomer.type,
                                totalSpent: selectedCustomer.totalSpent,
                                customerRank: selectedCustomer.customerRank,
                                country: selectedCustomer.country,
                                totalOrders: selectedCustomer.totalOrders,
                                firstOrderDate: selectedCustomer.firstOrderDate,
                                lastOrderDate: selectedCustomer.lastOrderDate,
                                averageOrderValue: selectedCustomer.averageOrderValue,
                              }}
                              currency={form.watch('currency') || 'EUR'}
                            />
                          )}
                          {/* Currency Badge */}
                          {selectedCustomer.preferredCurrency && (
                            <Badge 
                              variant="outline" 
                              className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700"
                              data-testid="badge-currency"
                            >
                              {selectedCustomer.preferredCurrency}
                            </Badge>
                          )}
                        </div>
                        
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedCustomer(null);
                            setCustomerSearch("");
                            setQuickCustomerType(null);
                            setQuickCustomerName("");
                            setQuickCustomerPhone("");
                            form.setValue('customerId', undefined);
                          }}
                          className="flex-shrink-0"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Change
                        </Button>
                      </div>

                      {/* Contact & Location Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mt-3">
                        {/* Contact Info */}
                        {selectedCustomer.phone && (
                          <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                            <Phone className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                            <span>{selectedCustomer.phone}</span>
                            {selectedCustomer.socialMediaApp && (
                              <Badge variant="secondary" className="text-xs">
                                {selectedCustomer.socialMediaApp}
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        {/* Location */}
                        {(selectedCustomer.city || selectedCustomer.country) && (
                          <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                            <MapPin className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                            <span>
                              {[selectedCustomer.city, selectedCustomer.country].filter(Boolean).join(', ')}
                            </span>
                          </div>
                        )}
                        
                        {/* Company */}
                        {selectedCustomer.company && (
                          <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                            <Building className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                            <span className="truncate">{selectedCustomer.company}</span>
                          </div>
                        )}
                      </div>

                      {/* Stats Row - Only show for existing customers with data */}
                      {!selectedCustomer.needsSaving && !selectedCustomer.isTemporary && (
                        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-200 dark:border-gray-700">
                          {selectedCustomer.totalOrders > 0 && (
                            <div className="flex items-center gap-1.5">
                              <Package className="h-4 w-4 text-green-600 dark:text-green-500" />
                              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                {selectedCustomer.totalOrders}
                              </span>
                              <span className="text-xs text-slate-500 dark:text-slate-400">orders</span>
                            </div>
                          )}
                          
                          {selectedCustomer.totalSpent && parseFloat(selectedCustomer.totalSpent) > 0 && (
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium text-slate-900">
                                {formatCurrency(parseFloat(selectedCustomer.totalSpent), selectedCustomer.preferredCurrency || 'EUR')}
                              </span>
                              <span className="text-xs text-slate-500">total</span>
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Shipping Address Section */}
            {selectedCustomer && selectedCustomer.id && (
              <Card className="mt-4" data-testid="card-shipping-address">
                <CardHeader className="p-3 border-b">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <MapPin className="h-4 w-4" />
                    {t('shippingAddress')}
                  </CardTitle>
                  <CardDescription>{t('selectOrAddShippingAddress')}</CardDescription>
                </CardHeader>
                <CardContent className="p-3 space-y-3">
                  {isLoadingShippingAddresses ? (
                    <div className="text-center py-4 text-slate-500">Loading addresses...</div>
                  ) : shippingAddresses && Array.isArray(shippingAddresses) && shippingAddresses.length > 0 ? (
                    <RadioGroup
                      value={selectedShippingAddress?.id || ""}
                      onValueChange={(value) => {
                        if (!value) return; // Don't update if value is empty (deselection handled by onClick)
                        const address = shippingAddresses.find((a: any) => a.id === value);
                        setSelectedShippingAddress(address);
                      }}
                      data-testid="radiogroup-shipping-addresses"
                    >
                      {shippingAddresses.map((address: any) => (
                        <div
                          key={address.id}
                            className={`relative rounded-lg border-2 transition-all ${
                              selectedShippingAddress?.id === address.id
                                ? 'border-teal-500 bg-teal-50/50 shadow-sm'
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                            data-testid={`card-address-${address.id}`}
                          >
                            {/* Header with Radio and Actions */}
                            <div className="flex items-start gap-3 p-4 pb-3">
                              <RadioGroupItem 
                                value={address.id} 
                                id={address.id} 
                                data-testid={`radio-address-${address.id}`}
                                className="mt-1"
                                onClick={() => {
                                  if (selectedShippingAddress?.id === address.id) {
                                    setSelectedShippingAddress(null);
                                  } else {
                                    setSelectedShippingAddress(address);
                                  }
                                }}
                              />
                              <div 
                                className="flex-1 cursor-pointer"
                                onClick={() => {
                                  if (selectedShippingAddress?.id === address.id) {
                                    setSelectedShippingAddress(null);
                                  } else {
                                    setSelectedShippingAddress(address);
                                  }
                                }}
                              >
                                <div className="flex items-start gap-2">
                                  <MapPin className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                  <div className="text-sm text-slate-700 leading-relaxed select-none">
                                    <div className="font-semibold text-slate-900">{address.firstName} {address.lastName}</div>
                                    {address.company && (
                                      <div className="font-medium text-slate-800">{address.company}</div>
                                    )}
                                    <div className="mt-1">{address.street}</div>
                                    <div>{address.city}, {address.zipCode}</div>
                                    <div>{address.country}</div>
                                    {address.tel && (
                                      <div className="flex items-center gap-1.5 mt-1">
                                        <Phone className="h-3 w-3 text-slate-400" />
                                        <span>{address.tel}</span>
                                      </div>
                                    )}
                                    {address.email && (
                                      <div className="flex items-center gap-1.5">
                                        <Mail className="h-3 w-3 text-slate-400" />
                                        <span>{address.email}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 hover:bg-teal-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const fullAddress = `${address.firstName} ${address.lastName}${address.company ? `\n${address.company}` : ''}\n${address.street}\n${address.city}, ${address.zipCode}\n${address.country}${address.tel ? `\nTel: ${address.tel}` : ''}${address.email ? `\nEmail: ${address.email}` : ''}`;
                                    navigator.clipboard.writeText(fullAddress);
                                    toast({
                                      title: t('orders:copied'),
                                      description: t('orders:addressCopiedToClipboard'),
                                    });
                                  }}
                                  data-testid={`button-copy-address-${address.id}`}
                                  title={t('orders:copyAddress')}
                                >
                                  <Copy className="h-4 w-4 text-slate-600" />
                                </Button>
                                {!address.isNew && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 hover:bg-slate-100"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingAddress(address);
                                      setShowShippingModal(true);
                                    }}
                                    data-testid={`button-edit-address-${address.id}`}
                                    title={t('orders:editAddress')}
                                  >
                                    <Pencil className="h-4 w-4 text-slate-600" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                      ))}
                    </RadioGroup>
                  ) : (
                    <div className="text-center py-4 text-slate-500 dark:text-slate-400">
                      {t('orders:noShippingAddressesFound')}
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setEditingAddress(null);
                      setShowShippingModal(true);
                    }}
                    data-testid="button-add-address"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('orders:addNewAddress')}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Pending Services Section */}
            {selectedCustomer && pendingServices && pendingServices.length > 0 && (
              <Card className="mt-4 border-2 border-amber-400 dark:border-amber-500 bg-amber-50/50 dark:bg-amber-900/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Wrench className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                      {t('orders:pendingServices')}
                    </h4>
                    <Badge variant="secondary" className="bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200">
                      {pendingServices.filter(s => !appliedServiceIds.has(s.id)).length} {t('orders:pending')}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                    {t('orders:pendingServicesDescription')}
                  </p>
                  <div className="space-y-2">
                    {pendingServices.map((service) => {
                      const isApplied = appliedServiceIds.has(service.id);
                      return (
                        <div 
                          key={service.id}
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            isApplied 
                              ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700' 
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                          }`}
                          data-testid={`pending-service-${service.id}`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                                {service.name}
                              </span>
                              {isApplied && (
                                <Badge variant="default" className="bg-green-600 dark:bg-green-700 text-white">
                                  <Check className="h-3 w-3 mr-1" />
                                  {t('orders:applied')}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 mt-1">
                              <span>{t('orders:laborFee')}: {formatCurrency(parseFloat(service.serviceCost || '0'), service.currency || 'EUR')}</span>
                              <span>•</span>
                              <span>{t('orders:partsCost')}: {formatCurrency(parseFloat(service.partsCost || '0'), service.currency || 'EUR')}</span>
                              <span>•</span>
                              <span className="font-medium text-amber-600 dark:text-amber-400">
                                {t('common:total')}: {formatCurrency(parseFloat(service.totalCost || '0'), service.currency || 'EUR')}
                              </span>
                            </div>
                            {service.description && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                                {service.description}
                              </p>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant={isApplied ? "outline" : "default"}
                            size="sm"
                            className={`ml-3 min-h-[44px] min-w-[100px] ${
                              isApplied 
                                ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700 cursor-default' 
                                : 'bg-amber-600 hover:bg-amber-700 text-white'
                            }`}
                            onClick={() => !isApplied && applyPendingService(service)}
                            disabled={isApplied}
                            data-testid={`button-apply-service-${service.id}`}
                          >
                            {isApplied ? (
                              <>
                                <Check className="h-4 w-4 mr-1" />
                                {t('orders:applied')}
                              </>
                            ) : (
                              <>
                                <Plus className="h-4 w-4 mr-1" />
                                {t('orders:applyToOrder')}
                              </>
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* New customer form */}
            {showNewCustomerForm && (
              <div className="space-y-4 border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-slate-900 dark:text-slate-100">{t('orders:newCustomerDetails')}</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowNewCustomerForm(false);
                      setAddressAutocomplete("");
                      setRawNewCustomerAddress("");
                      setFacebookNameManuallyEdited(false); // Reset the manual edit flag
                      setNewCustomer({
                        name: "",
                        facebookName: "",
                        facebookUrl: "",
                        email: "",
                        phone: "",
                        street: "",
                        streetNumber: "",
                        city: "",
                        state: "",
                        zipCode: "",
                        country: "",
                        company: "",
                        firstName: "",
                        lastName: "",
                        pickupPoint: "",
                        type: "regular"
                      });
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="customerName">{t('orders:customerNameRequired')}</Label>
                    <Input
                      id="customerName"
                      value={newCustomer.name}
                      onChange={(e) => {
                        const newName = e.target.value;
                        // Update customer name and sync to Facebook name only if not manually edited
                        setNewCustomer(prev => ({
                          ...prev,
                          name: newName,
                          // Only sync to Facebook Name if it hasn't been manually edited
                          facebookName: facebookNameManuallyEdited ? prev.facebookName : newName
                        }));
                      }}
                      placeholder={t('orders:typeHere')}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="facebookName">{t('orders:facebookName')}</Label>
                    <Input
                      id="facebookName"
                      value={newCustomer.facebookName || ""}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        setNewCustomer({ ...newCustomer, facebookName: newValue });
                        // Only mark as manually edited if value differs from Customer Name
                        setFacebookNameManuallyEdited(newValue !== newCustomer.name);
                      }}
                      placeholder={t('orders:syncedWithCustomerName')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="facebookUrl">{t('orders:facebookUrl')}</Label>
                    <div className="relative">
                      <Input
                        id="facebookUrl"
                        value={newCustomer.facebookUrl}
                        onChange={(e) => setNewCustomer({ ...newCustomer, facebookUrl: e.target.value })}
                        placeholder={t('orders:placeUrlOrType')}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1 h-8 w-8 p-0"
                        onClick={() => {
                          if (newCustomer.name) {
                            setNewCustomer({ ...newCustomer, facebookUrl: newCustomer.name });
                            toast({
                              title: t('orders:nameCopied'),
                              description: t('orders:customerNameCopiedToFacebookUrl'),
                            });
                          }
                        }}
                        disabled={!newCustomer.name}
                        title={t('orders:copyCustomerName')}
                        data-testid="button-copy-facebook-url"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Smart Paste */}
                <div className="space-y-2">
                  <Label htmlFor="rawNewCustomerAddress">{t('orders:smartPaste')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('orders:pasteAnyAddressInfo')}
                  </p>
                  <Textarea
                    id="rawNewCustomerAddress"
                    value={rawNewCustomerAddress}
                    onChange={(e) => setRawNewCustomerAddress(e.target.value)}
                    placeholder={t('orders:smartPasteExample')}
                    className="min-h-[80px]"
                  />
                  <Button
                    type="button"
                    onClick={() => parseNewCustomerAddressMutation.mutate(rawNewCustomerAddress)}
                    disabled={!rawNewCustomerAddress.trim() || parseNewCustomerAddressMutation.isPending}
                    className="w-full"
                  >
                    {parseNewCustomerAddressMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t('orders:parsing')}
                      </>
                    ) : (
                      t('orders:parseFill')
                    )}
                  </Button>
                </div>

                {/* Address Autocomplete */}
                <div className="space-y-2">
                  <Label htmlFor="addressAutocomplete">{t('orders:addressSearchOptional')}</Label>
                  <div className="relative">
                    <Input
                      id="addressAutocomplete"
                      value={addressAutocomplete}
                      onChange={(e) => {
                        const value = e.target.value;
                        setAddressAutocomplete(value);
                        searchAddresses(value);
                      }}
                      onFocus={() => {
                        if (addressAutocomplete.length >= 3) {
                          searchAddresses(addressAutocomplete);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setShowAddressDropdown(false);
                        }
                      }}
                      placeholder={t('orders:startTypingAddress')}
                      className="pr-10"
                    />
                    {addressAutocomplete && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1 h-8 w-8 p-0"
                        onClick={() => {
                          setAddressAutocomplete("");
                          setAddressSuggestions([]);
                          setShowAddressDropdown(false);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}

                    {/* Address suggestions dropdown */}
                    {showAddressDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg bg-white dark:bg-slate-800 max-h-72 overflow-y-auto z-50">
                        {isLoadingAddresses ? (
                          <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                            <div className="text-sm">{t('orders:searchingAddresses')}</div>
                          </div>
                        ) : addressSuggestions.length > 0 ? (
                          <>
                            <div className="p-2 bg-slate-50 dark:bg-slate-700 border-b border-gray-200 dark:border-gray-700 text-xs text-slate-600 dark:text-slate-400">
                              {t('orders:addressesFound', { count: addressSuggestions.length })}
                            </div>
                            {addressSuggestions.map((suggestion, index) => (
                              <div
                                key={index}
                                className="p-3 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer border-b last:border-b-0 transition-colors"
                                onClick={() => selectAddress(suggestion)}
                              >
                                <div className="font-medium text-slate-900 dark:text-slate-100">
                                  {suggestion.formatted}
                                </div>
                              </div>
                            ))}
                          </>
                        ) : (
                          <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                            <div className="text-sm">{t('orders:noAddressesFound')}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('orders:searchOfficialAddress')}
                  </p>
                </div>

                <Separator className="my-6" />

                {/* Customer Details Section Header */}
                <div>
                  <Label className="text-base">{t('orders:customerDetails')}</Label>
                </div>

                {/* First Name and Last Name */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Input
                      id="firstName"
                      value={newCustomer.firstName || ""}
                      onChange={(e) => setNewCustomer({ ...newCustomer, firstName: e.target.value })}
                      placeholder={t('orders:firstName')}
                      data-testid="input-firstName"
                    />
                  </div>
                  <div>
                    <Input
                      id="lastName"
                      value={newCustomer.lastName || ""}
                      onChange={(e) => setNewCustomer({ ...newCustomer, lastName: e.target.value })}
                      placeholder={t('orders:lastName')}
                      data-testid="input-lastName"
                    />
                  </div>
                </div>

                {/* Company (optional) */}
                <div>
                  <Input
                    id="company"
                    value={newCustomer.company}
                    onChange={(e) => setNewCustomer({ ...newCustomer, company: e.target.value })}
                    placeholder={t('orders:companyOptional')}
                  />
                </div>

                {/* Address Section Header */}
                <div className="mt-6">
                  <Label className="text-base">{t('orders:address')}</Label>
                </div>

                {/* Street and House Number */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-3">
                    <Input
                      id="street"
                      value={newCustomer.street}
                      onChange={(e) => setNewCustomer({ ...newCustomer, street: e.target.value })}
                      placeholder={t('orders:street')}
                    />
                  </div>
                  <div>
                    <Input
                      id="streetNumber"
                      value={newCustomer.streetNumber}
                      onChange={(e) => setNewCustomer({ ...newCustomer, streetNumber: e.target.value })}
                      placeholder={t('orders:houseNumber')}
                    />
                  </div>
                </div>

                {/* Postal Code and City */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Input
                      id="zipCode"
                      value={newCustomer.zipCode}
                      onChange={(e) => setNewCustomer({ ...newCustomer, zipCode: e.target.value })}
                      placeholder={t('orders:postalCode')}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Input
                      id="city"
                      value={newCustomer.city}
                      onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
                      placeholder={t('orders:city')}
                    />
                  </div>
                </div>

                {/* Email (optional) */}
                <div className="relative">
                  <Input
                    id="customerEmail"
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    placeholder={t('orders:emailOptional')}
                    className="pr-10"
                    data-testid="input-customerEmail"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-8 w-8 p-0"
                    onClick={() => {
                      setNewCustomer({ ...newCustomer, email: "davienails999@gmail.com" });
                      toast({
                        title: t('orders:defaultEmailPasted'),
                        description: "davienails999@gmail.com",
                      });
                    }}
                    title={t('orders:pasteDefaultEmail')}
                    data-testid="button-paste-default-email"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>

                <Separator className="my-6" />

                {/* Additional Fields (Collapsible or Hidden) */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="customerPhone">{t('orders:phone')}</Label>
                    <Input
                      id="customerPhone"
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                      placeholder={t('orders:typeHere')}
                      data-testid="input-customerPhone"
                    />
                  </div>
                  <div>
                    <Label htmlFor="country">{t('orders:country')}</Label>
                    <Input
                      id="country"
                      value={newCustomer.country}
                      onChange={(e) => setNewCustomer({ ...newCustomer, country: e.target.value })}
                      placeholder={t('orders:typeHere')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="pickupPoint">{t('orders:pickupPoint')}</Label>
                    <Input
                      id="pickupPoint"
                      value={newCustomer.pickupPoint || ""}
                      onChange={(e) => setNewCustomer({ ...newCustomer, pickupPoint: e.target.value })}
                      placeholder={t('orders:branchOrPickupLocation')}
                      data-testid="input-pickupPoint"
                    />
                  </div>
                </div>

                {/* Add customer to order button */}
                <Button
                  type="button"
                  className="w-full mt-4"
                  onClick={() => {
                    if (newCustomer.name) {
                      // Set the new customer without an ID - it will be created on save
                      setSelectedCustomer({
                        ...newCustomer,
                        id: undefined // Explicitly set to undefined to trigger creation
                      });
                      setShowNewCustomerForm(false);
                      console.log('New customer selected (no ID yet):', newCustomer);
                    }
                  }}
                >
                  {t('orders:addCustomerToOrder')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Product Selection - Mobile Optimized */}
        <Card className="shadow-sm">
          <CardHeader className="p-3 border-b">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Package className="h-4 w-4 text-blue-600" />
              {t('orders:addProducts')}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-1">{t('orders:searchAddProducts')}</CardDescription>
          </CardHeader>
          <CardContent className="sticky top-0 z-40 p-3 space-y-3 bg-white dark:bg-slate-950 shadow-sm backdrop-blur-sm">
            <div className="relative product-search-container">
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="product">{t('orders:searchProducts')}</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={barcodeScanMode ? "default" : "outline"}
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={() => {
                      setBarcodeScanMode(!barcodeScanMode);
                      toast({
                        title: barcodeScanMode ? t('orders:barcodeScanModeOff') : t('orders:barcodeScanModeOn'),
                        description: barcodeScanMode 
                          ? t('orders:normalModeClearAfterAdd')
                          : t('orders:rapidModeContinueScanning'),
                      });
                    }}
                  >
                    <Package className="h-3 w-3 mr-1" />
                    {barcodeScanMode ? t('orders:scanModeOn') : t('orders:scanModeOff')}
                  </Button>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  ref={productSearchRef}
                  placeholder={t('orders:clickToSeeAllProducts')}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-10"
                  onFocus={() => setShowProductDropdown(true)}
                  onKeyDown={(e) => {
                    const totalProducts = filteredProducts?.length || 0;
                    
                    if (e.key === 'Escape') {
                      setShowProductDropdown(false);
                      setSelectedProductIndex(0);
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      if (totalProducts > 0) {
                        setSelectedProductIndex(prev => (prev + 1) % totalProducts);
                        setShowProductDropdown(true);
                      }
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      if (totalProducts > 0) {
                        setSelectedProductIndex(prev => (prev - 1 + totalProducts) % totalProducts);
                        setShowProductDropdown(true);
                      }
                    } else if (e.key === 'Enter') {
                      e.preventDefault();
                      if (totalProducts > 0) {
                        const selectedProduct = filteredProducts[selectedProductIndex];
                        if (selectedProduct) {
                          addProductToOrder(selectedProduct);
                          if (!barcodeScanMode) {
                            setProductSearch('');
                            setShowProductDropdown(false);
                            setSelectedProductIndex(0);
                          }
                        }
                      }
                    } else if (e.key === 'Tab') {
                      e.preventDefault();
                      // Tab: Go to shipping cost input
                      const shippingCostInput = document.querySelector('[data-testid="input-shipping-cost"]') as HTMLInputElement;
                      shippingCostInput?.focus();
                    }
                  }}
                  data-testid="input-product-search"
                />
                {productSearch && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-8 w-8 p-0"
                    onClick={() => {
                      setProductSearch("");
                      setShowProductDropdown(false);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Real-time dropdown for products - Flat list sorted by relevance */}
              {showProductDropdown && filteredProducts && filteredProducts.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg bg-white dark:bg-slate-800 max-h-[70vh] overflow-y-auto z-50">
                  <div className="px-2 py-1.5 bg-slate-50 dark:bg-slate-700 border-b border-gray-200 dark:border-gray-700 text-xs text-slate-600 dark:text-slate-400 sticky top-0 z-10">
                    {t('orders:productsFoundCount', { count: filteredProducts.length })}
                  </div>
                  {filteredProducts.map((product: any, index: number) => {
                    const frequency = productFrequency[product.originalProductId || product.id] || 0;
                    const isService = product.isService;
                    const isBundle = product.isBundle;
                    const isBestMatch = index === 0 && debouncedProductSearch.length >= 2;
                    const isKeyboardSelected = index === selectedProductIndex;
                    const hasBulkUnits = product.allowBulkSales && product.bulkUnitQty > 1;
                    
                    return (
                      <button
                        type="button"
                        key={product.id}
                        className={`w-full p-2 cursor-pointer border-b border-gray-200 dark:border-gray-700 last:border-b-0 transition-colors text-left ${
                          isKeyboardSelected ? 'bg-blue-50 dark:bg-blue-950 ring-2 ring-inset ring-blue-500' : 'hover:bg-blue-50 dark:hover:bg-slate-700'
                        } ${
                          isBestMatch ? 'bg-blue-100 dark:bg-blue-950 border-l-2 border-l-blue-500' : ''
                        }`}
                        onClick={() => {
                          addProductToOrder(product);
                          setSelectedProductIndex(0);
                          setProductSearch('');
                          setShowProductDropdown(false);
                        }}
                        data-testid={`${isService ? 'service' : isBundle ? 'bundle' : 'product'}-item-${product.id}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {/* Product Image */}
                            {!isService && !isBundle && (
                              <div className="flex-shrink-0 relative">
                                {product.image ? (
                                  <img 
                                    src={product.image} 
                                    alt={product.name}
                                    className="w-10 h-10 object-contain rounded border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-slate-900"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded border flex items-center justify-center bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-gray-700">
                                    <Package className="h-5 w-5 text-slate-300 dark:text-slate-600" />
                                  </div>
                                )}
                              </div>
                            )}
                            {/* Service/Bundle Icon */}
                            {(isService || isBundle) && (
                              <div className="w-10 h-10 flex-shrink-0 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-gray-700 flex items-center justify-center">
                                {isService && <Wrench className="h-5 w-5 text-orange-500" />}
                                {isBundle && <Box className="h-5 w-5 text-purple-500" />}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-1.5 mb-0.5">
                                <div className="font-medium text-sm text-slate-900 dark:text-slate-100 line-clamp-2 flex-1">{product.name}</div>
                              {isBestMatch && (
                                <Badge variant="default" className="text-[10px] px-1 py-0 bg-blue-600 flex-shrink-0">
                                  {t('orders:best')}
                                </Badge>
                              )}
                              {isBulk && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0 border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-900/50 flex-shrink-0">
                                  {product.bulkUnitName}
                                </Badge>
                              )}
                              {isService && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0 border-orange-500 text-orange-600 flex-shrink-0">
                                  {t('orders:service')}
                                </Badge>
                              )}
                              {isBundle && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0 border-purple-500 text-purple-600 flex-shrink-0">
                                  {t('orders:bundle')}
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {isBulk && `${product.bulkUnitQty} pcs per ${product.bulkUnitName}`}
                              {!isService && !isBundle && !isBulk && `SKU: ${product.sku}`}
                              {isService && product.description && product.description}
                              {isBundle && product.description && product.description}
                            </div>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 ml-2">
                            <div className={`font-semibold text-sm ${isBulk ? 'text-amber-700 dark:text-amber-300' : 'text-slate-900 dark:text-slate-100'}`}>
                              {isService ? (
                                formatCurrency(parseFloat(product.totalCost || '0'), 'EUR')
                              ) : isBulk ? (
                                (() => {
                                  const selectedCurrency = form.watch('currency') || 'EUR';
                                  let price = 0;
                                  if (selectedCurrency === 'CZK' && product.bulkPriceCzk) {
                                    price = parseFloat(product.bulkPriceCzk);
                                  } else if (selectedCurrency === 'EUR' && product.bulkPriceEur) {
                                    price = parseFloat(product.bulkPriceEur);
                                  } else {
                                    price = parseFloat(product.bulkPriceEur || product.bulkPriceCzk || product.priceEur || product.priceCzk || '0');
                                  }
                                  return formatCurrency(price, selectedCurrency);
                                })()
                              ) : (
                                (() => {
                                  const selectedCurrency = form.watch('currency') || 'EUR';
                                  let price = 0;
                                  if (selectedCurrency === 'CZK' && product.priceCzk) {
                                    price = parseFloat(product.priceCzk);
                                  } else if (selectedCurrency === 'EUR' && product.priceEur) {
                                    price = parseFloat(product.priceEur);
                                  } else {
                                    // Fallback to any available price
                                    price = parseFloat(product.priceEur || product.priceCzk || '0');
                                  }
                                  return formatCurrency(price, selectedCurrency);
                                })()
                              )}
                            </div>
                            {!isService && !isBulk && (
                              (() => {
                                const baseStock = isBundle ? (product.availableStock ?? 0) : (product.quantity || 0);
                                const inOrder = isBundle 
                                  ? getQuantityInOrder(undefined, undefined, product.id)
                                  : getQuantityInOrder(product.productId || product.id, product.variantId);
                                const availableStock = Math.max(0, baseStock - inOrder);
                                const isLow = availableStock <= 0;
                                return (
                                  <div className={`text-xs ${isLow ? 'text-red-500 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
                                    Stock: {availableStock}{inOrder > 0 && ` (${inOrder} in order)`}
                                  </div>
                                );
                              })()
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* No results message */}
              {showProductDropdown && productSearch.length >= 2 && (!filteredProducts || filteredProducts.length === 0) && (
                <div className="absolute top-full left-0 right-0 mt-1 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-slate-800 shadow-lg p-4 text-center text-slate-500 dark:text-slate-400 z-50">
                  <Search className="h-6 w-6 mx-auto mb-2 text-slate-400 dark:text-slate-500" />
                  <div>{t('orders:noProductsFoundFor', { search: productSearch })}</div>
                  <div className="text-xs mt-1">{t('orders:trySearchingByNameSKU')}</div>
                </div>
              )}
            </div>

          </CardContent>
        </Card>

        {/* Order Items - Mobile Optimized */}
        <Card className="shadow-sm">
          <CardHeader className="p-3 border-b">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <ShoppingCart className="h-4 w-4 text-blue-600" />
                    {t('orders:orderItems')}
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm mt-1">
                    {orderItems.length > 0 ? t('orders:itemsAdded', { count: orderItems.length }) : t('orders:noItemsYet')}
                  </CardDescription>
                </div>
                {/* Admin-only three-dot menu for Cost/Margin columns */}
                {canViewImportCost && orderItems.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 hover:bg-slate-100 dark:hover:bg-slate-800"
                        data-testid="button-order-items-admin-menu"
                      >
                        <MoreVertical className="h-4 w-4 text-slate-500" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem
                        onClick={() => setShowCostInfo(!showCostInfo)}
                        data-testid="menu-toggle-cost-info"
                      >
                        {showCostInfo ? (
                          <Eye className="h-4 w-4 mr-2 text-green-600" />
                        ) : (
                          <EyeOff className="h-4 w-4 mr-2 text-slate-400" />
                        )}
                        {t('orders:showItemCost', 'Show Item Cost')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setShowProfitInfo(!showProfitInfo)}
                        data-testid="menu-toggle-profit-info"
                      >
                        {showProfitInfo ? (
                          <Eye className="h-4 w-4 mr-2 text-green-600" />
                        ) : (
                          <EyeOff className="h-4 w-4 mr-2 text-slate-400" />
                        )}
                        {t('orders:showProfit', 'Show Profit')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              {/* Column Toggles */}
              {orderItems.length > 0 && (
                <div className="flex flex-col gap-2 text-xs">
                  <div className="flex items-center space-x-2" data-testid="toggle-vat-column">
                    <Checkbox
                      id="show-vat"
                      checked={showVatColumn}
                      onCheckedChange={(checked) => setShowVatColumn(checked as boolean)}
                    />
                    <label
                      htmlFor="show-vat"
                      className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {t('orders:vat')}
                    </label>
                  </div>
                  <div className="flex items-center space-x-2" data-testid="toggle-discount-column">
                    <Checkbox
                      id="show-discount"
                      checked={showDiscountColumn}
                      onCheckedChange={(checked) => setShowDiscountColumn(checked as boolean)}
                    />
                    <label
                      htmlFor="show-discount"
                      className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {t('orders:disc')}
                    </label>
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-3">
            {orderItems.length > 0 ? (
              <>
              {/* Desktop Table View - Hidden on Mobile */}
              <div className="hidden md:block overflow-x-auto">
                <div className="inline-block min-w-full align-middle">
                  <div className="overflow-hidden border border-slate-200 dark:border-slate-700 rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                          <TableHead className="font-semibold text-slate-700 dark:text-slate-300">{t('orders:product')}</TableHead>
                          <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-center">{t('orders:qty')}</TableHead>
                          <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-right">{t('orders:price')}</TableHead>
                          {showDiscountColumn && (
                            <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-right">{t('orders:discount')}</TableHead>
                          )}
                          {showVatColumn && (
                            <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-right">{t('orders:vat')}</TableHead>
                          )}
                          <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-center w-20"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orderItems.map((item, index) => (
                          <Fragment key={item.id}>
                          <TableRow 
                            className={item.isFreeItem 
                              ? 'bg-green-50 dark:bg-green-950/30' 
                              : item.isBulkCarton
                              ? 'bg-amber-50 dark:bg-amber-950/30'
                              : (index % 2 === 0 ? 'bg-white dark:bg-slate-950' : 'bg-slate-50/50 dark:bg-slate-900/30')
                            }
                            data-testid={`order-item-${item.id}`}
                          >
                            <TableCell className="py-3">
                              <div className="flex items-start gap-3">
                                {/* Product Image or Gift Icon for free items or Box for bulk */}
                                <div className="flex-shrink-0">
                                  {item.isFreeItem ? (
                                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded border border-green-200 dark:border-green-700 flex items-center justify-center">
                                      <Gift className="h-6 w-6 text-green-600 dark:text-green-400" />
                                    </div>
                                  ) : item.isBulkCarton ? (
                                    <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/50 rounded border border-amber-300 dark:border-amber-700 flex items-center justify-center">
                                      <Box className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                                    </div>
                                  ) : item.image ? (
                                    <img 
                                      src={item.image} 
                                      alt={item.productName}
                                      className="w-12 h-12 object-contain rounded border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-slate-900"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-gray-700 flex items-center justify-center">
                                      <Package className="h-6 w-6 text-slate-300 dark:text-slate-600" />
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex flex-col gap-1 min-w-0">
                                  <div className="flex items-start gap-1">
                                    {item.serviceId && <Wrench className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />}
                                    {item.isBulkCarton ? (
                                      <span className="font-medium text-amber-700 dark:text-amber-300">
                                        {item.bulkUnitName} - {item.productName}
                                      </span>
                                    ) : (
                                      <span className={`font-medium ${item.isFreeItem ? 'text-green-800 dark:text-green-200' : 'text-slate-900 dark:text-slate-100'}`}>
                                        {item.productName}
                                      </span>
                                    )}
                                  </div>
                                  {/* Badges row - separate from product name for better alignment */}
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {item.isFreeItem && (
                                      <Badge className="text-xs px-1.5 py-0 bg-green-100 text-green-700 border-green-300 dark:bg-green-900 dark:text-green-300 dark:border-green-600">
                                        {t('orders:freeItem')}
                                      </Badge>
                                    )}
                                    {item.isBulkCarton && (
                                      <Badge className="text-xs px-1.5 py-0 bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-600">
                                        {item.bulkUnitQty} pcs
                                      </Badge>
                                    )}
                                    {item.variantName && (
                                      <Badge className="text-xs px-1.5 py-0 bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700">
                                        {item.variantName}
                                      </Badge>
                                    )}
                                    {item.bundleId && (
                                      <Badge className="text-xs px-1.5 py-0 bg-purple-100 text-purple-700 border-purple-300">
                                        {t('orders:bundle')}
                                      </Badge>
                                    )}
                                    {item.serviceId && !item.isServicePart && (
                                      <Badge variant="outline" className="text-xs px-1.5 py-0 border-orange-500 text-orange-600">
                                        {t('orders:service')}
                                      </Badge>
                                    )}
                                    {item.isServicePart && (
                                      <Badge className="text-xs px-1.5 py-0 bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/50 dark:text-orange-300 dark:border-orange-600">
                                        {t('orders:serviceParts')}
                                      </Badge>
                                    )}
                                    {item.appliedDiscountLabel && !item.isFreeItem && item.appliedDiscountType !== 'buy_x_get_y' && (
                                      <Badge className="text-xs px-1.5 py-0 bg-green-100 text-green-700 border-green-300">
                                        {t('orders:offer')}: {item.appliedDiscountLabel}
                                      </Badge>
                                    )}
                                  </div>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  {item.serviceId ? t('orders:service') + ' ' + t('orders:item') : item.isBulkCarton ? `SKU: ${item.sku}` : `SKU: ${item.sku}`}
                                </span>
                                {item.serviceId && (
                                  <Input
                                    placeholder={t('orders:addOptionalNote')}
                                    value={item.notes || ''}
                                    onChange={(e) => updateOrderItem(item.id, 'notes', e.target.value)}
                                    className="text-xs h-7 mt-1 bg-purple-50 border-purple-200 text-purple-900 placeholder:text-purple-400"
                                    data-testid={`input-notes-${item.id}`}
                                  />
                                )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center align-middle">
                              <div className="flex justify-center">
                                <MathInput
                                  min={1}
                                  value={item.quantity}
                                  onChange={(val) => updateOrderItem(item.id, 'quantity', val)}
                                  isInteger={true}
                                  className="w-16 h-9 text-center"
                                  data-testid={`input-quantity-${item.id}`}
                                  onBlur={() => {
                                    // For free items, commit the split logic on blur
                                    if (item.isFreeItem) {
                                      commitFreeItemQuantity(item.id, item.quantity);
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      // For free items, commit the split logic on enter
                                      if (item.isFreeItem) {
                                        commitFreeItemQuantity(item.id, item.quantity);
                                      }
                                      productSearchRef.current?.focus();
                                    } else if (e.key === 'Tab') {
                                      e.preventDefault();
                                      // For free items, commit the split logic on tab
                                      if (item.isFreeItem) {
                                        commitFreeItemQuantity(item.id, item.quantity);
                                      }
                                      const shippingCostInput = document.querySelector('[data-testid="input-shipping-cost"]') as HTMLInputElement;
                                      shippingCostInput?.focus();
                                    }
                                  }}
                                />
                              </div>
                            </TableCell>
                            <TableCell className="text-right align-middle">
                              <div className="flex items-center justify-end gap-2">
                                {/* Price input/display */}
                                {item.isFreeItem ? (
                                  <div className="flex flex-col items-end gap-0.5">
                                    <span className="text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(0, form.watch('currency'))}</span>
                                    {item.originalPrice && item.originalPrice > 0 && (
                                      <span className="text-xs text-slate-400 line-through">{formatCurrency(item.originalPrice, form.watch('currency'))}</span>
                                    )}
                                  </div>
                                ) : (
                                  <MathInput
                                    min={0}
                                    step={0.01}
                                    value={item.price}
                                    onChange={(val) => updateOrderItem(item.id, 'price', val)}
                                    className="w-20 h-9 text-right"
                                    data-testid={`input-price-${item.id}`}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === 'Tab') {
                                        e.preventDefault();
                                        const nextInput = showDiscountColumn
                                          ? document.querySelector(`[data-testid="input-discount-${item.id}"]`)
                                          : showVatColumn
                                          ? document.querySelector(`[data-testid="input-vat-${item.id}"]`)
                                          : null;
                                        
                                        if (nextInput) {
                                          (nextInput as HTMLInputElement).focus();
                                        } else {
                                          const currentIndex = orderItems.findIndex(i => i.id === item.id);
                                          if (currentIndex < orderItems.length - 1) {
                                            const nextItem = orderItems[currentIndex + 1];
                                            const nextRowInput = document.querySelector(`[data-testid="input-quantity-${nextItem.id}"]`) as HTMLInputElement;
                                            nextRowInput?.focus();
                                          }
                                        }
                                      }
                                    }}
                                  />
                                )}
                                {/* Cost & Profit column for admin - shown to the right of price */}
                                {(showCostInfo || showProfitInfo) && canViewImportCost && !item.isFreeItem && (
                                  <div className="flex flex-col items-start text-xs leading-tight">
                                    {showCostInfo && item.landingCost && (
                                      <span className="text-slate-500 dark:text-slate-400">
                                        C: {formatCurrency(item.landingCost, form.watch('currency'))}
                                      </span>
                                    )}
                                    {showProfitInfo && item.landingCost && item.price > 0 && (
                                      <span className={`font-medium ${(item.price - item.landingCost) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                        P: {formatCurrency(item.price - item.landingCost, form.watch('currency'))}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            {showDiscountColumn && (
                              <TableCell className="text-right align-middle">
                                <div className="flex justify-end">
                                  <div className="flex items-center gap-1">
                                    <MathInput
                                      min={0}
                                      max={100}
                                      step={1}
                                      value={item.discountPercentage}
                                      onChange={(val) => updateOrderItem(item.id, 'discountPercentage', val)}
                                      className="w-14 h-9 text-right"
                                      data-testid={`input-discount-${item.id}`}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === 'Tab') {
                                          e.preventDefault();
                                          const nextInput = showVatColumn
                                            ? document.querySelector(`[data-testid="input-vat-${item.id}"]`)
                                            : null;
                                          
                                          if (nextInput) {
                                            (nextInput as HTMLInputElement).focus();
                                          } else {
                                            const currentIndex = orderItems.findIndex(i => i.id === item.id);
                                            if (currentIndex < orderItems.length - 1) {
                                              const nextItem = orderItems[currentIndex + 1];
                                              const nextRowInput = document.querySelector(`[data-testid="input-quantity-${nextItem.id}"]`) as HTMLInputElement;
                                              nextRowInput?.focus();
                                            }
                                          }
                                        }
                                      }}
                                    />
                                    <span className="text-sm text-muted-foreground">%</span>
                                  </div>
                                </div>
                              </TableCell>
                            )}
                            {showVatColumn && (
                              <TableCell className="text-right align-middle">
                                <div className="flex justify-end">
                                  <MathInput
                                    min={0}
                                    step={0.01}
                                    value={item.tax}
                                    onChange={(val) => updateOrderItem(item.id, 'tax', val)}
                                    className="w-16 h-9 text-right"
                                    data-testid={`input-vat-${item.id}`}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === 'Tab') {
                                        e.preventDefault();
                                        const currentIndex = orderItems.findIndex(i => i.id === item.id);
                                        if (currentIndex < orderItems.length - 1) {
                                          const nextItem = orderItems[currentIndex + 1];
                                          const nextRowInput = document.querySelector(`[data-testid="input-quantity-${nextItem.id}"]`) as HTMLInputElement;
                                          nextRowInput?.focus();
                                        }
                                      }
                                    }}
                                  />
                                </div>
                              </TableCell>
                            )}
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-9 w-9 p-0 hover:bg-slate-100 dark:hover:bg-slate-800"
                                      data-testid={`button-item-menu-${item.id}`}
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setEditingNoteItemId(item.id);
                                        setEditingNoteText(item.notes || "");
                                      }}
                                      data-testid={`menu-item-edit-note-${item.id}`}
                                    >
                                      <Pencil className="h-4 w-4 mr-2" />
                                      {item.notes ? 'Edit Shipping Notes' : 'Add Shipping Notes'}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeOrderItem(item.id)}
                                  className="h-9 w-9 p-0 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                                  data-testid={`button-remove-${item.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          {/* Shipping Notes Row */}
                          {item.notes && (
                            <TableRow className={index % 2 === 0 ? 'bg-white dark:bg-slate-950' : 'bg-slate-50/50 dark:bg-slate-900/30'}>
                              <TableCell colSpan={4 + (showDiscountColumn ? 1 : 0) + (showVatColumn ? 1 : 0)} className="py-2 px-3">
                                <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-3">
                                  <Package className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1">{t('shippingNotes')}</p>
                                    <p className="text-sm text-amber-900 dark:text-amber-200">{item.notes}</p>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                          </Fragment>
                        ))}
                        {/* Placeholder rows for available free slots (Buy X Get Y) */}
                        {buyXGetYAllocations.filter(alloc => alloc.remainingFreeSlots > 0).map((alloc) => (
                          <TableRow key={`free-slot-${alloc.discountId}`} className="bg-green-50/50 dark:bg-green-950/20 border-2 border-dashed border-green-300 dark:border-green-700">
                            <TableCell className="py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded border-2 border-dashed border-green-300 dark:border-green-700 flex items-center justify-center">
                                  <Gift className="h-6 w-6 text-green-500 dark:text-green-400" />
                                </div>
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-green-700 dark:text-green-300">
                                      {t('orders:freeItemsAvailable', { count: alloc.remainingFreeSlots })}
                                    </span>
                                    <Badge className="text-xs px-1.5 py-0 bg-green-100 text-green-700 border-green-300 dark:bg-green-900 dark:text-green-300 dark:border-green-600">
                                      {alloc.discountName}
                                    </Badge>
                                  </div>
                                  <span className="text-xs text-green-600 dark:text-green-400">
                                    {t('orders:addProductFromCategory', { category: alloc.categoryName })}
                                  </span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center align-middle">
                              <span className="font-semibold text-green-600 dark:text-green-400">{alloc.remainingFreeSlots}</span>
                            </TableCell>
                            <TableCell className="text-right align-middle">
                              <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(0, form.watch('currency'))}</span>
                            </TableCell>
                            {showDiscountColumn && (
                              <TableCell className="text-right align-middle">
                                <span className="text-green-500 dark:text-green-500">-</span>
                              </TableCell>
                            )}
                            {showVatColumn && (
                              <TableCell className="text-right align-middle">
                                <span className="text-green-500 dark:text-green-500">-</span>
                              </TableCell>
                            )}
                            <TableCell></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
              
              {/* Mobile Card View - Visible only on Mobile */}
              <div className="md:hidden space-y-3">
                {orderItems.map((item, index) => (
                  <Card key={item.id} className={`overflow-hidden shadow-sm ${item.isFreeItem 
                    ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/30' 
                    : item.isBulkCarton
                    ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30'
                    : 'border-slate-200 dark:border-gray-700 bg-white dark:bg-slate-800'}`} 
                    data-testid={`mobile-order-item-${item.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3 mb-4">
                        {/* Product Image - Gift icon for free items, Box for bulk */}
                        <div className="flex-shrink-0">
                          {item.isFreeItem ? (
                            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/50 rounded border border-green-200 dark:border-green-700 flex items-center justify-center">
                              <Gift className="h-10 w-10 text-green-600 dark:text-green-400" />
                            </div>
                          ) : item.isBulkCarton ? (
                            <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/50 rounded border border-amber-300 dark:border-amber-700 flex items-center justify-center">
                              <Box className="h-10 w-10 text-amber-600 dark:text-amber-400" />
                            </div>
                          ) : item.image ? (
                            <img 
                              src={item.image} 
                              alt={item.productName}
                              className="w-20 h-20 object-contain rounded border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-slate-900"
                            />
                          ) : (
                            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-gray-700 flex items-center justify-center">
                              <Package className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 mb-1">
                            {item.serviceId && <Wrench className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />}
                            {item.isBulkCarton ? (
                              <h4 className="font-semibold text-base text-amber-700 dark:text-amber-300">
                                {item.bulkUnitName} - {item.productName}
                              </h4>
                            ) : (
                              <h4 className={`font-semibold text-base ${item.isFreeItem ? 'text-green-800 dark:text-green-200' : 'text-slate-900 dark:text-slate-100'}`}>
                                {item.productName}
                              </h4>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1.5 mb-1">
                            {item.isFreeItem && (
                              <Badge className="text-xs px-1.5 py-0 bg-green-100 text-green-700 border-green-300 dark:bg-green-900 dark:text-green-300 dark:border-green-600">
                                {t('orders:freeItem')}
                              </Badge>
                            )}
                            {item.isBulkCarton && (
                              <Badge className="text-xs px-1.5 py-0 bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-600">
                                {item.bulkUnitQty} pcs
                              </Badge>
                            )}
                            {item.variantName && (
                              <Badge className="text-xs px-1.5 py-0 bg-blue-100 text-blue-700 border-blue-300">
                                {item.variantName}
                              </Badge>
                            )}
                            {item.bundleId && (
                              <Badge className="text-xs px-1.5 py-0 bg-purple-100 text-purple-700 border-purple-300">
                                {t('orders:bundle')}
                              </Badge>
                            )}
                            {item.serviceId && !item.isServicePart && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0 border-orange-500 text-orange-600">
                                {t('orders:service')}
                              </Badge>
                            )}
                            {item.isServicePart && (
                              <Badge className="text-xs px-1.5 py-0 bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/50 dark:text-orange-300 dark:border-orange-600">
                                {t('orders:serviceParts')}
                              </Badge>
                            )}
                            {item.appliedDiscountLabel && !item.isFreeItem && item.appliedDiscountType !== 'buy_x_get_y' && (
                              <Badge className="text-xs px-1.5 py-0 bg-green-100 text-green-700 border-green-300">
                                {t('orders:offer')}: {item.appliedDiscountLabel}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {item.serviceId ? t('orders:service') + ' ' + t('orders:item') : `SKU: ${item.sku}`}
                          </p>
                        </div>
                        
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeOrderItem(item.id)}
                          className="h-11 w-11 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 dark:hover:text-red-400 flex-shrink-0"
                          data-testid={`mobile-button-remove-${item.id}`}
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                      
                      {/* Mobile form fields */}
                      <div className="space-y-3">
                        {/* Quantity & Price Row */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor={`mobile-qty-${item.id}`} className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                              Quantity
                            </Label>
                            <MathInput
                              id={`mobile-qty-${item.id}`}
                              min={1}
                              value={item.quantity}
                              onChange={(val) => updateOrderItem(item.id, 'quantity', val)}
                              isInteger={true}
                              className="h-11 text-base"
                              data-testid={`mobile-input-quantity-${item.id}`}
                              onBlur={() => {
                                if (item.isFreeItem) {
                                  commitFreeItemQuantity(item.id, item.quantity);
                                }
                              }}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`mobile-price-${item.id}`} className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                              Price ({form.watch('currency')})
                            </Label>
                            {item.isFreeItem ? (
                              <div className="h-11 flex flex-col justify-center">
                                <span className="text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(0, form.watch('currency'))}</span>
                                {item.originalPrice && item.originalPrice > 0 && (
                                  <span className="text-xs text-slate-400 line-through">{formatCurrency(item.originalPrice, form.watch('currency'))}</span>
                                )}
                              </div>
                            ) : (
                              <MathInput
                                id={`mobile-price-${item.id}`}
                                min={0}
                                step={0.01}
                                value={item.price}
                                onChange={(val) => updateOrderItem(item.id, 'price', val)}
                                className="h-11 text-base"
                                data-testid={`mobile-input-price-${item.id}`}
                              />
                            )}
                          </div>
                        </div>
                        
                        {/* Discount & VAT Row - Conditional */}
                        {(showDiscountColumn || showVatColumn) && (
                          <div className="grid grid-cols-2 gap-3">
                            {showDiscountColumn && (
                              <div>
                                <Label htmlFor={`mobile-discount-${item.id}`} className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                                  {t('orders:discountPercent', 'Discount %')}
                                </Label>
                                <div className="flex items-center gap-2">
                                  <MathInput
                                    id={`mobile-discount-${item.id}`}
                                    min={0}
                                    max={100}
                                    step={1}
                                    value={item.discountPercentage}
                                    onChange={(val) => updateOrderItem(item.id, 'discountPercentage', val)}
                                    className="h-11 text-base flex-1"
                                    data-testid={`mobile-input-discount-${item.id}`}
                                  />
                                  <span className="text-sm text-muted-foreground">%</span>
                                </div>
                                {item.discount > 0 && (
                                  <span className="text-xs text-green-600 dark:text-green-400 mt-1 block">
                                    -{formatCurrency(item.discount, form.watch('currency'))}
                                  </span>
                                )}
                              </div>
                            )}
                            {showVatColumn && (
                              <div>
                                <Label htmlFor={`mobile-vat-${item.id}`} className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                                  VAT ({form.watch('currency')})
                                </Label>
                                <MathInput
                                  id={`mobile-vat-${item.id}`}
                                  min={0}
                                  step={0.01}
                                  value={item.tax}
                                  onChange={(val) => updateOrderItem(item.id, 'tax', val)}
                                  className="h-11 text-base"
                                  data-testid={`mobile-input-vat-${item.id}`}
                                />
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Notes Section */}
                        <div>
                          <Label htmlFor={`mobile-notes-${item.id}`} className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                            <MessageSquare className="h-3.5 w-3.5" />
                            {t('orders:shippingNotesOptional')}
                          </Label>
                          <Textarea
                            id={`mobile-notes-${item.id}`}
                            placeholder={t('orders:addSpecialInstructions')}
                            value={item.notes || ''}
                            onChange={(e) => updateOrderItem(item.id, 'notes', e.target.value)}
                            className="min-h-[80px] text-sm resize-none"
                            data-testid={`mobile-textarea-notes-${item.id}`}
                          />
                        </div>
                        
                        {/* Total Display */}
                        <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-slate-700">
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('orders:itemTotal')}</span>
                          <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                            {formatCurrency(item.total, form.watch('currency'))}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {/* Mobile Placeholder cards for available free slots */}
                {buyXGetYAllocations.filter(alloc => alloc.remainingFreeSlots > 0).map((alloc) => (
                  <Card key={`mobile-free-slot-${alloc.discountId}`} className="overflow-hidden shadow-sm border-2 border-dashed border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-950/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0">
                          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/50 rounded border-2 border-dashed border-green-300 dark:border-green-700 flex items-center justify-center">
                            <Gift className="h-8 w-8 text-green-500 dark:text-green-400" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-green-700 dark:text-green-300 text-base">
                            {t('orders:freeItemsAvailable', { count: alloc.remainingFreeSlots })}
                          </h4>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            <Badge className="text-xs px-1.5 py-0 bg-green-100 text-green-700 border-green-300 dark:bg-green-900 dark:text-green-300 dark:border-green-600">
                              {alloc.discountName}
                            </Badge>
                          </div>
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                            {t('orders:addProductFromCategory', { category: alloc.categoryName })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              </>
            ) : (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/20 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700">
                <ShoppingCart className="mx-auto h-12 w-12 mb-4 text-slate-400 dark:text-slate-600" />
                <p className="font-medium text-slate-700 dark:text-slate-300">{t('orders:noItemsAddedYet')}</p>
                <p className="text-sm mt-1">{t('orders:searchAndSelectProducts')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Carton Packing Optimization Panel */}
        {aiCartonPackingEnabled && (
          <AICartonPackingPanel
            packingPlan={packingPlan}
            onRunOptimization={runPackingOptimization}
            isLoading={isPackingOptimizationLoading}
            currency={form.watch('currency')}
            orderItems={orderItems}
            onAddManualCarton={handleAddManualCarton}
          />
        )}

        {/* Payment Details - Mobile Optimized */}
        <Card className="shadow-sm">
          <CardHeader className="p-3 border-b">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <CreditCard className="h-4 w-4 text-blue-600" />
              {t('orders:paymentDetails')}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-1">{t('orders:configurePricing')}</CardDescription>
          </CardHeader>
          <CardContent className="p-3 space-y-3">
            {/* Shipping & Payment Methods */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label htmlFor="shippingMethod" className="text-sm">{t('orders:shippingMethod')}</Label>
                <Select value={watchedShippingMethod} onValueChange={(value) => form.setValue('shippingMethod', value as any)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={t('orders:selectShipping')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GLS DE">GLS DE</SelectItem>
                    <SelectItem value="PPL CZ">PPL CZ</SelectItem>
                    <SelectItem value="DHL DE">DHL DE</SelectItem>
                    <SelectItem value="DPD">DPD</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="paymentMethod" className="text-sm">{t('orders:paymentMethod')}</Label>
                <Select value={watchedPaymentMethod} onValueChange={(value) => form.setValue('paymentMethod', value as any)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={t('orders:selectPayment')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bank Transfer">{t('orders:bankTransfer')}</SelectItem>
                    <SelectItem value="PayPal">{t('orders:paypal')}</SelectItem>
                    <SelectItem value="COD">{t('orders:cod')}</SelectItem>
                    <SelectItem value="Cash">{t('orders:cash')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator className="my-4" />

            {/* Discount Toggle Button */}
            <div>
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 border-2 border-dashed border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 transition-all duration-300"
                onClick={() => {
                  if (showDiscount) {
                    form.setValue('discountType', 'flat');
                    form.setValue('discountValue', 0);
                  }
                  setShowDiscount(!showDiscount);
                }}
              >
                <Percent className="h-5 w-5 mr-2" />
                {t('orders:addDiscount')}
                {showDiscount ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
              </Button>
            </div>

            {/* Discount Section with smooth transition */}
            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${
              showDiscount ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}>
              {showDiscount && (
                <div className="space-y-4 p-4 border-2 border-blue-100 dark:border-blue-800 rounded-lg bg-blue-50/30 dark:bg-blue-950/30">
                  <div>
                    <Label className="text-sm font-medium">{t('orders:discount')}</Label>
                    <div className="flex gap-2 mt-1">
                      <Select 
                        value={form.watch('discountType')} 
                        onValueChange={(value) => form.setValue('discountType', value as 'flat' | 'rate')}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="flat">{t('orders:amount')}</SelectItem>
                          <SelectItem value="rate">{t('orders:percentage')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder={form.watch('discountType') === 'rate' ? '0-100' : '0'}
                        {...form.register('discountValue', { valueAsNumber: true })}
                        className="flex-1"
                      />
                      {form.watch('discountType') === 'rate' && (
                        <div className="flex items-center px-3 text-gray-500 dark:text-gray-400">
                          <Percent className="h-4 w-4" />
                        </div>
                      )}
                    </div>

                    {/* Quick discount buttons */}
                    <div className="mt-2">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('orders:quickSelect')}</div>
                      <div className="flex flex-wrap gap-1">
                        {form.watch('discountType') === 'rate' && [5, 10, 15, 20, 25].map(amount => (
                          <Button
                            key={amount}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => form.setValue('discountValue', amount)}
                          >
                            {amount}%
                          </Button>
                        ))}
                        {form.watch('discountType') === 'flat' && form.watch('currency') === 'CZK' && [50, 100, 200, 500].map(amount => (
                          <Button
                            key={amount}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => form.setValue('discountValue', amount)}
                          >
                            {amount} CZK
                          </Button>
                        ))}
                        {form.watch('discountType') === 'flat' && form.watch('currency') === 'EUR' && [5, 10, 20, 50].map(amount => (
                          <Button
                            key={amount}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => form.setValue('discountValue', amount)}
                          >
                            {amount} EUR
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Separator className="my-4" />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <Label htmlFor="shippingCost" className="text-sm">{t('orders:shippingCost')}</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...form.register('shippingCost', { valueAsNumber: true })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Tab') {
                      e.preventDefault();
                      // Enter/Tab: Submit the order
                      submitButtonRef.current?.click();
                    }
                  }}
                  className="mt-1"
                  data-testid="input-shipping-cost"
                />
                {/* Quick shipping cost buttons */}
                <div className="mt-2">
                  <div className="text-xs text-gray-500 mb-1">{t('orders:quickSelect')}</div>
                  <div className="flex flex-wrap gap-1">
                    {form.watch('currency') === 'CZK' && [0, 100, 150, 250].map(amount => (
                      <Button
                        key={amount}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => form.setValue('shippingCost', amount)}
                      >
                        {amount} CZK
                      </Button>
                    ))}
                    {form.watch('currency') === 'EUR' && [0, 5, 10, 13, 15, 20].map(amount => (
                      <Button
                        key={amount}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => form.setValue('shippingCost', amount)}
                      >
                        {amount} EUR
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="actualShippingCost" className="text-sm">{t('orders:actualShippingCost')}</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...form.register('actualShippingCost', { valueAsNumber: true })}
                  className="mt-1"
                  data-testid="input-actual-shipping-cost"
                />
                <p className="text-xs text-gray-500 mt-1">{t('orders:realCostFromCarrier')}</p>
              </div>

              <div>
                <Label htmlFor="adjustment" className="text-sm">{t('orders:adjustment')}</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...form.register('adjustment', { valueAsNumber: true })}
                  className="mt-1"
                  data-testid="input-adjustment"
                />
                <p className="text-xs text-gray-500 mt-1">{t('orders:roundingOrOtherAdjustments')}</p>
              </div>
            </div>

            <Separator className="my-4" />

            {/* Dobírka (COD) Section - Only show for PPL CZ/DHL DE + COD (support both old and new carrier names) */}
            {(form.watch('shippingMethod') === 'PPL' || form.watch('shippingMethod') === 'PPL CZ' || form.watch('shippingMethod') === 'DHL' || form.watch('shippingMethod') === 'DHL DE') && form.watch('paymentMethod') === 'COD' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="codAmount">
                      {form.watch('shippingMethod') === 'DHL DE' ? 'Nachnahme (COD)' : 'Dobírka Amount (COD)'}
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...form.register('codAmount', { valueAsNumber: true })}
                      className="mt-1"
                      data-testid="input-dobirka-amount"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('orders:cashOnDeliveryOptional')}</p>
                  </div>

                  <div>
                    <Label htmlFor="codCurrency">{form.watch('shippingMethod') === 'DHL DE' ? 'Nachnahme Currency' : 'Dobírka Currency'}</Label>
                    <Select 
                      value={form.watch('codCurrency') || (form.watch('shippingMethod') === 'DHL DE' ? 'EUR' : 'CZK')}
                      onValueChange={(value) => form.setValue('codCurrency', value as any)}
                    >
                      <SelectTrigger className="mt-1" data-testid="select-dobirka-currency">
                        <SelectValue placeholder={t('orders:selectCurrency')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CZK">CZK</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('orders:currencyForCod')}</p>
                  </div>
                </div>

                <Separator className="my-4" />
              </>
            )}

            <div>
              <Label htmlFor="notes">{t('orders:notes')}</Label>
              <Textarea
                {...form.register('notes')}
                placeholder={t('orders:additionalOrderNotes')}
              />
            </div>

            {/* Tax Invoice Toggle Button */}
            <div className="pt-4 border-t dark:border-gray-700">
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 border-2 border-dashed border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 transition-all duration-300"
                onClick={() => {
                  setShowTaxInvoice(!showTaxInvoice);
                  form.setValue('taxInvoiceEnabled', !showTaxInvoice);
                }}
              >
                <Plus className="h-5 w-5 mr-2" />
                {t('orders:addTaxInvoiceSection')}
                {showTaxInvoice ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
              </Button>
            </div>

            {/* Tax Invoice Section with smooth transition */}
            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${
              showTaxInvoice ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}>
              {showTaxInvoice && (
                <div className="mt-4 p-4 border-2 border-blue-100 dark:border-blue-800 rounded-lg bg-blue-50/30 dark:bg-blue-950/30 space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300">{t('orders:taxInvoiceInformation')}</h3>
                  </div>

                  {form.watch('currency') === 'CZK' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="relative">
                        <Label htmlFor="ico">IČO</Label>
                        <div className="relative">
                          <Input
                            {...form.register('ico')}
                            placeholder={t('orders:companyIdentificationNumber')}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1 h-8 w-8 p-0"
                            onClick={() => navigator.clipboard.readText().then(text => form.setValue('ico', text))}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      <div className="relative">
                        <Label htmlFor="dic">DIČ</Label>
                        <div className="relative">
                          <Input
                            {...form.register('dic')}
                            placeholder={t('orders:taxIdentificationNumber')}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1 h-8 w-8 p-0"
                            onClick={() => navigator.clipboard.readText().then(text => form.setValue('dic', text))}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      <div className="sm:col-span-2 relative">
                        <Label htmlFor="nameAndAddress">{t('orders:nameAndAddress')}</Label>
                        <div className="relative">
                          <Textarea
                            {...form.register('nameAndAddress')}
                            placeholder={t('orders:companyNameAndAddress')}
                            rows={3}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1 h-8 w-8 p-0"
                            onClick={() => navigator.clipboard.readText().then(text => form.setValue('nameAndAddress', text))}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="taxRate">Tax Rate (%)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          max="100"
                          {...form.register('taxRate', { valueAsNumber: true })}
                          placeholder="21"
                        />
                      </div>
                    </div>
                  )}

                  {form.watch('currency') === 'EUR' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="relative">
                        <Label htmlFor="vatId">VAT ID (optional)</Label>
                        <div className="relative">
                          <Input
                            {...form.register('vatId')}
                            placeholder={t('orders:euVatIdNumber')}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1 h-8 w-8 p-0"
                            onClick={() => navigator.clipboard.readText().then(text => form.setValue('vatId', text))}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      <div className="relative">
                        <Label htmlFor="country">Country</Label>
                        <div className="relative">
                          <Input
                            {...form.register('country')}
                            placeholder={t('orders:countryName')}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1 h-8 w-8 p-0"
                            onClick={() => navigator.clipboard.readText().then(text => form.setValue('country', text))}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      <div className="sm:col-span-2 relative">
                        <Label htmlFor="nameAndAddress">{t('orders:nameAndAddress')}</Label>
                        <div className="relative">
                          <Textarea
                            {...form.register('nameAndAddress')}
                            placeholder={t('orders:companyNameAndAddress')}
                            rows={3}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1 h-8 w-8 p-0"
                            onClick={() => navigator.clipboard.readText().then(text => form.setValue('nameAndAddress', text))}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="taxRate">Tax Rate (%)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          max="100"
                          {...form.register('taxRate', { valueAsNumber: true })}
                          placeholder="20"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Document Selection */}
        <OrderDocumentSelector
          orderItems={useMemo(() => 
            orderItems.filter(item => item.productId).map(item => ({
              id: item.id,
              productId: item.productId!,
              productName: item.productName,
              sku: item.sku,
              quantity: item.quantity
            })),
            [orderItems]
          )}
          selectedDocumentIds={selectedDocumentIds}
          onDocumentSelectionChange={useCallback((ids: string[]) => setSelectedDocumentIds(ids), [])}
          customerId={selectedCustomer?.id}
        />

        {/* Files Section */}
        {orderItems.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader className="p-3 border-b">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <FileText className="h-4 w-4 text-blue-600" />
                    {t('orders:filesDocuments')}
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm mt-1">
                    {t('orders:uploadFilesManageDocs')}
                  </CardDescription>
                </div>
                <div>
                  <input
                    type="file"
                    id="file-upload"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    data-testid="input-file-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300"
                    data-testid="button-upload-file"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {t('orders:upload')}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 space-y-3">
              {/* Service BILL Checkbox - Shows when a service is applied */}
              {appliedServiceIds.size > 0 && (
                <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-700 rounded-lg">
                  <Checkbox
                    id="include-service-bill"
                    checked={includeServiceBill}
                    onCheckedChange={(checked) => setIncludeServiceBill(checked === true)}
                    className="border-orange-400 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                    data-testid="checkbox-include-service-bill"
                  />
                  <label
                    htmlFor="include-service-bill"
                    className="text-sm font-medium text-orange-800 dark:text-orange-300 cursor-pointer flex items-center gap-2"
                  >
                    <Wrench className="h-4 w-4" />
                    {t('orders:includeServiceBill')}
                  </label>
                </div>
              )}
              
              {/* Files List Section */}
              <div className="space-y-4">
                {/* Uploaded Files */}
                {uploadedFiles.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      {t('orders:uploadedFiles', { count: uploadedFiles.length })}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {uploadedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-white dark:bg-slate-900/20 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                          data-testid={`uploaded-file-${index}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className="mt-0.5 flex-shrink-0">
                                <FileText className="h-5 w-5 text-blue-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                                  {file.name}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                  {(file.size / 1024).toFixed(2)} KB
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeUploadedFile(index)}
                              className="h-8 w-8 p-0 flex-shrink-0 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                              data-testid={`button-remove-uploaded-${index}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {uploadedFiles.length === 0 && (
                  <div className="text-center py-8 bg-slate-50 dark:bg-slate-900/20 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <FileText className="mx-auto h-12 w-12 mb-3 text-slate-400 dark:text-slate-600" />
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('orders:noFilesYet')}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('orders:uploadFilesOrAddProducts')}</p>
                  </div>
                )}
              </div>

            </CardContent>
          </Card>
        )}
              </div>
              {/* End of Left Column */}

              {/* Right Column - Sticky Sidebar (Desktop only) */}
              <div className="hidden lg:block space-y-4">
                <div className="sticky top-4 space-y-4">
                  
                  {/* Order Type (Retail/Wholesale) - Desktop Only */}
                  <Card className="shadow-sm">
                    <CardHeader className="p-3 border-b">
                      <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                        <Store className="h-4 w-4 text-blue-600" />
                        {t('orders:saleType')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3">
                      <Select 
                        value={form.watch('saleType') || 'retail'} 
                        onValueChange={(value: 'retail' | 'wholesale') => {
                          form.setValue('saleType', value);
                          recalculatePricesForSaleType(value);
                        }}
                      >
                        <SelectTrigger className="h-9" data-testid="select-sale-type">
                          <SelectValue placeholder={t('orders:selectSaleType')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="retail">
                            <div className="flex items-center gap-2">
                              <ShoppingBag className="h-4 w-4 text-green-600" />
                              {t('orders:retail')}
                            </div>
                          </SelectItem>
                          <SelectItem value="wholesale">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-blue-600" />
                              {t('orders:wholesale')}
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {form.watch('saleType') === 'wholesale' && (
                        <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {t('orders:wholesalePricesApplied')}
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Quick Settings Card */}
                  <Card className="shadow-sm">
                    <CardHeader className="p-3 border-b">
                      <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                        <Settings className="h-4 w-4 text-blue-600" />
                        {t('orders:orderSettings')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 space-y-3">
                      <div>
                        <Label htmlFor="currency" className="text-xs">{t('orders:currency')}</Label>
                        <Select value={form.watch('currency')} onValueChange={(value) => form.setValue('currency', value as any)}>
                          <SelectTrigger className="mt-1 h-9" data-testid="select-currency">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CZK">CZK</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="VND">VND</SelectItem>
                            <SelectItem value="CNY">CNY</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="priority" className="text-xs">{t('orders:priority')}</Label>
                        <Select value={form.watch('priority')} onValueChange={(value) => form.setValue('priority', value as any)}>
                          <SelectTrigger className="mt-1 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-2 bg-gray-500 rounded-full" />
                                {t('orders:low')}
                              </div>
                            </SelectItem>
                            <SelectItem value="medium">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-2 bg-yellow-500 rounded-full" />
                                {t('orders:medium')}
                              </div>
                            </SelectItem>
                            <SelectItem value="high">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-2 bg-red-500 rounded-full" />
                                {t('orders:high')}
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Order Status and Payment Status side by side */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor="orderStatus" className="text-xs">{t('orders:orderStatus')}</Label>
                          <Select value={form.watch('orderStatus')} onValueChange={(value) => form.setValue('orderStatus', value as any)}>
                            <SelectTrigger className="mt-1 h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-2 bg-orange-500 rounded-full" />
                                  {t('orders:pending')}
                                </div>
                              </SelectItem>
                              <SelectItem value="to_fulfill">
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-2 bg-blue-500 rounded-full" />
                                  {t('orders:toFulfill')}
                                </div>
                              </SelectItem>
                              <SelectItem value="shipped">
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-2 bg-green-500 rounded-full" />
                                  {t('orders:shipped')}
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="paymentStatus" className="text-xs">{t('orders:paymentStatus')}</Label>
                          <Select value={form.watch('paymentStatus')} onValueChange={(value) => form.setValue('paymentStatus', value as any)}>
                            <SelectTrigger className="mt-1 h-9" data-testid="select-payment-status">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-2 bg-orange-500 rounded-full" />
                                  {t('orders:pending')}
                                </div>
                              </SelectItem>
                              <SelectItem value="paid">
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-2 bg-green-500 rounded-full" />
                                {t('orders:paid')}
                              </div>
                            </SelectItem>
                            <SelectItem value="pay_later">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-2 bg-blue-500 rounded-full" />
                                {t('orders:payLater')}
                              </div>
                            </SelectItem>
                          </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Order Summary - Sticky */}
                  <Card className="shadow-sm">
                    <CardHeader className="p-3 border-b">
                      <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                        <Calculator className="h-4 w-4 text-blue-600" />
                        {t('orders:orderSummary')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 space-y-3">
                    {/* Receipt-Style Item List */}
                    {orderItems.length > 0 && (
                      <div className="pb-3 mb-3 border-b border-dashed">
                        <div className="text-center mb-2">
                          <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">{t('orders:orderItems')}</p>
                        </div>
                        <div className="space-y-1.5 font-mono text-xs">
                          {orderItems.map((item, index) => (
                            <div key={index} className="flex justify-between items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 dark:text-gray-100 truncate" title={item.name}>
                                  {item.name}
                                </p>
                                <p className="text-gray-500 text-[10px]">
                                  {item.quantity} x {formatCurrency(item.price, form.watch('currency'))}
                                </p>
                              </div>
                              <span className="font-medium text-right whitespace-nowrap">
                                {formatCurrency(item.price * item.quantity, form.watch('currency'))}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 pt-2 border-t border-dotted flex justify-between text-xs font-mono">
                          <span className="text-gray-500">{orderItems.length} {t('orders:items')}</span>
                          <span className="font-semibold">{formatCurrency(calculateSubtotal(), form.watch('currency'))}</span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{t('orders:subtotalColon')}</span>
                        <span className="font-medium">{formatCurrency(calculateSubtotal(), form.watch('currency'))}</span>
                      </div>
                      {showTaxInvoice && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">{t('orders:taxWithRate', { rate: form.watch('taxRate') || 0 })}</span>
                          <span className="font-medium">{formatCurrency(calculateTax(), form.watch('currency'))}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{t('orders:shippingColon')}</span>
                        <span className="font-medium">{formatCurrency(Number(form.watch('shippingCost')) || 0, form.watch('currency'))}</span>
                      </div>
                      {(() => {
                        const discountAmount = form.watch('discountType') === 'rate' 
                          ? (calculateSubtotal() * (Number(form.watch('discountValue')) || 0)) / 100
                          : Number(form.watch('discountValue')) || 0;
                        return discountAmount > 0 ? (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">
                              {t('orders:discountLabel')}{form.watch('discountType') === 'rate' && ` (${form.watch('discountValue') || 0}%)`}:
                            </span>
                            <span className="font-medium text-green-600">
                              -{formatCurrency(discountAmount, form.watch('currency'))}
                            </span>
                          </div>
                        ) : null;
                      })()}
                      {totals.storeCreditApplied > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 flex items-center gap-1">
                            <CreditCard className="h-3 w-3" />
                            {t('orders:storeCredit')}:
                          </span>
                          <span className="font-medium text-blue-600">
                            -{formatCurrency(totals.storeCreditApplied, form.watch('currency'))}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="border-t pt-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold">{t('orders:grandTotalLabel')}</span>
                        <div className="flex items-center gap-1">
                          <Input
                            id="grandTotal"
                            type="number"
                            step="0.01"
                            placeholder={t('orders:clickToEnter')}
                            value={calculateGrandTotal().toFixed(2)}
                            onChange={(e) => {
                              const desiredTotal = parseFloat(e.target.value);
                              if (!isNaN(desiredTotal) && desiredTotal > 0) {
                                const subtotal = calculateSubtotal();
                                const tax = showTaxInvoice ? calculateTax() : 0;
                                const shippingValue = form.watch('shippingCost');
                                const shipping = typeof shippingValue === 'string' ? parseFloat(shippingValue || '0') : (shippingValue || 0);
                                const adjustmentValue = form.watch('adjustment');
                                const adjustment = typeof adjustmentValue === 'string' ? parseFloat(adjustmentValue || '0') : (adjustmentValue || 0);
                                
                                const neededDiscount = subtotal + tax + shipping + adjustment - desiredTotal;
                                
                                form.setValue('discountType', 'flat');
                                form.setValue('discountValue', Math.max(0, parseFloat(neededDiscount.toFixed(2))));
                                
                                toast({
                                  title: t('orders:totalAdjusted'),
                                  description: t('orders:discountSetTo', { amount: formatCurrency(Math.max(0, neededDiscount), form.watch('currency')) }),
                                });
                              }
                            }}
                            className="w-32 h-8 text-sm font-bold text-blue-600 text-right"
                            data-testid="input-grand-total"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const currentTotal = calculateGrandTotal();
                              const roundedTotal = Math.ceil(currentTotal);
                              const difference = roundedTotal - currentTotal;
                              
                              if (difference > 0) {
                                form.setValue('adjustment', parseFloat(difference.toFixed(2)));
                                
                                const grandTotalInput = document.getElementById('grandTotal') as HTMLInputElement;
                                if (grandTotalInput) {
                                  grandTotalInput.value = roundedTotal.toFixed(2);
                                }
                                
                                toast({
                                  title: t('orders:totalRoundedUp'),
                                  description: t('orders:adjustmentAmount', { amount: formatCurrency(difference, form.watch('currency')) }),
                                });
                              } else {
                                toast({
                                  title: t('orders:alreadyRounded'),
                                  description: t('orders:totalAlreadyWhole'),
                                });
                              }
                            }}
                            className="h-8 px-2"
                            data-testid="button-round-up"
                          >
                            <ArrowUpCircle className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">{t('orders:clickToEditOrRoundUp')}</p>
                    </div>

                    {/* Collapsible Margin Analysis Section - Desktop */}
                    {canAccessFinancialData && orderItems.length > 0 && (() => {
                      const totalLandingCost = orderItems.reduce((sum, item) => 
                        sum + (item.landingCost || 0) * item.quantity, 0);
                      const totalSellingPrice = orderItems.reduce((sum, item) => 
                        sum + item.price * item.quantity, 0);
                      const totalProfit = totalSellingPrice - totalLandingCost;
                      const avgMargin = totalLandingCost > 0 
                        ? ((totalProfit / totalSellingPrice) * 100).toFixed(1) 
                        : null;

                      return avgMargin !== null ? (
                        <Accordion type="single" collapsible className="mt-3">
                          <AccordionItem value="margin-analysis" className="border border-gray-200 dark:border-gray-700 rounded-lg">
                            <AccordionTrigger className="px-3 py-2 hover:no-underline">
                              <div className="flex items-center justify-between w-full pr-2">
                                <span className="text-sm font-medium flex items-center gap-1">
                                  <TrendingUp className="h-4 w-4 text-green-600" />
                                  {t('orders:marginAnalysis')}
                                </span>
                                <MarginPill
                                  sellingPrice={totalSellingPrice}
                                  landingCost={totalLandingCost}
                                  currency={form.watch('currency')}
                                  showIcon={false}
                                  showProfit={false}
                                />
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-3 pb-3">
                              <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-500">{t('orders:totalCostColon')}</span>
                                  <span>{formatCurrency(totalLandingCost, form.watch('currency'))}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-500">{t('orders:totalProfitColon')}</span>
                                  <span className={totalProfit >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                                    {formatCurrency(totalProfit, form.watch('currency'))}
                                  </span>
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      ) : null;
                    })()}

                    {/* Dev-Only Form Errors Display */}
                    {import.meta.env.DEV && Object.keys(form.formState.errors).length > 0 && (
                      <Accordion type="single" collapsible className="mb-3">
                        <AccordionItem value="form-errors" className="border border-red-200 dark:border-red-800 rounded-lg">
                          <AccordionTrigger className="px-3 py-2 hover:no-underline">
                            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                              <AlertCircle className="h-4 w-4" />
                              <span className="text-sm font-medium">
                                Form Validation Errors ({Object.keys(form.formState.errors).length})
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-3 pb-3">
                            <Alert variant="destructive" className="mb-0">
                              <AlertDescription>
                                <div className="space-y-1 text-xs font-mono">
                                  {Object.entries(form.formState.errors).map(([field, error]) => (
                                    <div key={field} className="flex gap-2">
                                      <span className="font-bold">{field}:</span>
                                      <span>{error?.message?.toString() || 'Invalid value'}</span>
                                    </div>
                                  ))}
                                </div>
                              </AlertDescription>
                            </Alert>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    )}

                    <div className="pt-3 space-y-2">
                      {orderId ? (
                        hasChangesAfterSave ? (
                          <>
                            <Button 
                              type="submit" 
                              className="w-full" 
                              size="lg"
                              disabled={createOrderMutation.isPending}
                            >
                              <Save className="h-4 w-4 mr-2" />
                              {createOrderMutation.isPending ? t('orders:updatingOrder') : t('orders:updateOrder')}
                            </Button>
                            <Button 
                              type="button" 
                              variant="outline" 
                              className="w-full" 
                              onClick={() => setLocation(`/orders/${orderId}`)}
                            >
                              {t('orders:cancelChanges')}
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button 
                              type="button" 
                              className="w-full" 
                              size="lg" 
                              onClick={() => setLocation(`/orders/${orderId}`)}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              {t('orders:viewOrder')}
                            </Button>
                            <Button 
                              type="button" 
                              variant="outline" 
                              className="w-full" 
                              onClick={() => setLocation('/orders')}
                            >
                              {t('orders:backToOrders')}
                            </Button>
                          </>
                        )
                      ) : (
                        <>
                          <Button ref={submitButtonRef} type="submit" className="w-full" size="lg" disabled={createOrderMutation.isPending || orderItems.length === 0} data-testid="button-create-order">
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            {createOrderMutation.isPending ? t('orders:creatingOrder') : t('orders:createOrder')}
                          </Button>
                          <Button type="button" variant="outline" className="w-full" onClick={() => setLocation('/orders')} data-testid="button-save-draft">
                            <Save className="h-4 w-4 mr-2" />
                            {t('orders:saveDraft')}
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            {/* End of Right Column */}
          </div>
          {/* End of Grid */}

          {/* Mobile Order Summary (bottom on mobile) */}
          <Card className="lg:hidden shadow-sm">
            <CardHeader className="p-3 border-b">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Calculator className="h-4 w-4 text-blue-600" />
                {t('orders:orderSummary')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('orders:subtotalColon')}</span>
                  <span className="font-medium">{formatCurrency(calculateSubtotal(), form.watch('currency'))}</span>
                </div>
                {showTaxInvoice && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('orders:taxWithRate', { rate: form.watch('taxRate') || 0 })}</span>
                    <span className="font-medium">{formatCurrency(calculateTax(), form.watch('currency'))}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('orders:shippingColon')}</span>
                  <span className="font-medium">{formatCurrency(Number(form.watch('shippingCost')) || 0, form.watch('currency'))}</span>
                </div>
                {(() => {
                  const discountAmount = form.watch('discountType') === 'rate' 
                    ? (calculateSubtotal() * (Number(form.watch('discountValue')) || 0)) / 100
                    : Number(form.watch('discountValue')) || 0;
                  return discountAmount > 0 ? (
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        {t('orders:discountLabel')}{form.watch('discountType') === 'rate' && ` (${form.watch('discountValue') || 0}%)`}:
                      </span>
                      <span className="font-medium text-green-600">
                        -{formatCurrency(discountAmount, form.watch('currency'))}
                      </span>
                    </div>
                  ) : null;
                })()}
                {totals.storeCreditApplied > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 flex items-center gap-1">
                      <CreditCard className="h-3 w-3" />
                      {t('orders:storeCredit')}:
                    </span>
                    <span className="font-medium text-blue-600">
                      -{formatCurrency(totals.storeCreditApplied, form.watch('currency'))}
                    </span>
                  </div>
                )}
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{t('orders:grandTotalLabel')}</span>
                  <div className="flex items-center gap-1">
                    <Input
                      id="grandTotalMobile"
                      type="number"
                      step="0.01"
                      placeholder={t('orders:clickToEnter')}
                      value={calculateGrandTotal().toFixed(2)}
                      onChange={(e) => {
                        const desiredTotal = parseFloat(e.target.value);
                        if (!isNaN(desiredTotal) && desiredTotal > 0) {
                          const subtotal = calculateSubtotal();
                          const tax = showTaxInvoice ? calculateTax() : 0;
                          const shippingValue = form.watch('shippingCost');
                          const shipping = typeof shippingValue === 'string' ? parseFloat(shippingValue || '0') : (shippingValue || 0);
                          const adjustmentValue = form.watch('adjustment');
                          const adjustment = typeof adjustmentValue === 'string' ? parseFloat(adjustmentValue || '0') : (adjustmentValue || 0);
                          
                          const neededDiscount = subtotal + tax + shipping + adjustment - desiredTotal;
                          
                          form.setValue('discountType', 'flat');
                          form.setValue('discountValue', Math.max(0, parseFloat(neededDiscount.toFixed(2))));
                          
                          toast({
                            title: t('orders:totalAdjusted'),
                            description: t('orders:discountSetTo', { amount: formatCurrency(Math.max(0, neededDiscount), form.watch('currency')) }),
                          });
                        }
                      }}
                      className="w-32 h-8 text-sm font-bold text-blue-600 text-right"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const currentTotal = calculateGrandTotal();
                        const roundedTotal = Math.ceil(currentTotal);
                        const difference = roundedTotal - currentTotal;
                        
                        if (difference > 0) {
                          form.setValue('adjustment', parseFloat(difference.toFixed(2)));
                          
                          const grandTotalInput = document.getElementById('grandTotalMobile') as HTMLInputElement;
                          if (grandTotalInput) {
                            grandTotalInput.value = roundedTotal.toFixed(2);
                          }
                          
                          toast({
                            title: t('orders:totalRoundedUp'),
                            description: t('orders:adjustmentAmount', { amount: formatCurrency(difference, form.watch('currency')) }),
                          });
                        } else {
                          toast({
                            title: t('orders:alreadyRounded'),
                            description: t('orders:totalAlreadyWhole'),
                          });
                        }
                      }}
                      className="h-8 px-2"
                    >
                      <ArrowUpCircle className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-gray-500">{t('orders:clickToEditOrRoundUp')}</p>
              </div>

              {/* Collapsible Margin Analysis Section - Mobile */}
              {canAccessFinancialData && orderItems.length > 0 && (() => {
                const totalLandingCost = orderItems.reduce((sum, item) => 
                  sum + (item.landingCost || 0) * item.quantity, 0);
                const totalSellingPrice = orderItems.reduce((sum, item) => 
                  sum + item.price * item.quantity, 0);
                const totalProfit = totalSellingPrice - totalLandingCost;
                const avgMargin = totalLandingCost > 0 
                  ? ((totalProfit / totalSellingPrice) * 100).toFixed(1) 
                  : null;

                return avgMargin !== null ? (
                  <Accordion type="single" collapsible className="mt-3">
                    <AccordionItem value="margin-analysis-mobile" className="border border-gray-200 dark:border-gray-700 rounded-lg">
                      <AccordionTrigger className="px-3 py-2 hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-2">
                          <span className="text-sm font-medium flex items-center gap-1">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                            {t('orders:marginAnalysis')}
                          </span>
                          <MarginPill
                            sellingPrice={totalSellingPrice}
                            landingCost={totalLandingCost}
                            currency={form.watch('currency')}
                            showIcon={false}
                            showProfit={false}
                          />
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-3 pb-3">
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">{t('orders:totalCostColon')}</span>
                            <span>{formatCurrency(totalLandingCost, form.watch('currency'))}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">{t('orders:totalProfitColon')}</span>
                            <span className={totalProfit >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                              {formatCurrency(totalProfit, form.watch('currency'))}
                            </span>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                ) : null;
              })()}

              <div className="pt-3 space-y-2">
                {orderId ? (
                  hasChangesAfterSave ? (
                    <>
                      <Button 
                        type="submit" 
                        className="w-full" 
                        size="lg"
                        disabled={createOrderMutation.isPending}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {createOrderMutation.isPending ? t('orders:updatingOrder') : t('orders:updateOrder')}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="w-full" 
                        onClick={() => setLocation(`/orders/${orderId}`)}
                      >
                        {t('orders:cancelChanges')}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button 
                        type="button" 
                        className="w-full" 
                        size="lg" 
                        onClick={() => setLocation(`/orders/${orderId}`)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {t('orders:viewOrder')}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="w-full" 
                        onClick={() => setLocation('/orders')}
                      >
                        {t('orders:backToOrders')}
                      </Button>
                    </>
                  )
                ) : (
                  <>
                    <Button type="submit" className="w-full" size="lg" disabled={createOrderMutation.isPending || orderItems.length === 0} data-testid="button-create-order-mobile">
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      {createOrderMutation.isPending ? t('orders:creatingOrder') : t('orders:createOrder')}
                    </Button>
                    <Button type="button" variant="outline" className="w-full" onClick={() => setLocation('/orders')} data-testid="button-save-draft-mobile">
                      <Save className="h-4 w-4 mr-2" />
                      {t('orders:saveDraft')}
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        </form>
        
        {/* Variant Selector Dialog */}
        <Dialog open={showVariantDialog} onOpenChange={setShowVariantDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('orders:selectProductVariants')}</DialogTitle>
              <DialogDescription>
                {t('orders:chooseVariantsFor')} <span className="font-semibold">{selectedProductForVariant?.name}</span>
              </DialogDescription>
            </DialogHeader>
            
            {/* Quick variant input */}
            <div className="space-y-2">
              <Label htmlFor="quick-variant-input" className="text-sm font-medium">
                {t('orders:quickVariantEntry')}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="quick-variant-input"
                  value={quickVariantInput}
                  onChange={(e) => setQuickVariantInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      parseQuickVariantInput(quickVariantInput);
                    }
                  }}
                  placeholder={t('orders:quickVariantPlaceholder')}
                  className="flex-1 font-mono text-sm"
                  data-testid="input-quick-variant"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => parseQuickVariantInput(quickVariantInput)}
                  data-testid="button-apply-quick-variant"
                >
                  {t('orders:apply')}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('orders:quickVariantHint')}
              </p>
            </div>
            
            {/* Header row */}
            <div className="grid grid-cols-[1fr_80px_70px_100px] gap-2 px-3 py-2 bg-muted/50 rounded-t-md text-sm font-medium border-b">
              <div>{t('orders:variantName')}</div>
              <div className="text-right">{t('orders:price')}</div>
              <div className="text-right">{t('orders:stock')}</div>
              <div className="text-right">{t('orders:quantity')}</div>
            </div>
            
            {/* Virtualized variant list for performance with 300+ items */}
            <List
              height={Math.min(400, productVariants.length * 44)}
              itemCount={productVariants.length}
              itemSize={44}
              width="100%"
              className="border rounded-b-md"
            >
              {({ index, style }) => {
                const variant = productVariants[index];
                return (
                  <div 
                    style={style} 
                    className="grid grid-cols-[1fr_80px_70px_100px] gap-2 px-3 items-center border-b last:border-b-0 hover:bg-muted/30"
                  >
                    <div className="font-medium truncate" title={variant.name}>{variant.name}</div>
                    <div className="text-right text-sm">{selectedProductForVariant?.priceCzk ? `${selectedProductForVariant.priceCzk} Kč` : (selectedProductForVariant?.priceEur ? `${selectedProductForVariant.priceEur} €` : '-')}</div>
                    <div className="text-right">
                      <Badge variant={variant.quantity > 10 ? "default" : variant.quantity > 0 ? "outline" : "destructive"} className="text-xs">
                        {variant.quantity}
                      </Badge>
                    </div>
                    <div>
                      <Input
                        type="number"
                        min="0"
                        value={variantQuantities[variant.id] || 0}
                        onChange={(e) => setVariantQuantities(prev => ({
                          ...prev,
                          [variant.id]: Math.max(0, parseInt(e.target.value) || 0)
                        }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const isLastVariant = index === productVariants.length - 1;
                            if (isLastVariant) {
                              addVariantsToOrder();
                            } else {
                              const nextVariant = productVariants[index + 1];
                              const nextInput = document.querySelector(`[data-testid="input-variant-quantity-${nextVariant.id}"]`) as HTMLInputElement;
                              nextInput?.focus();
                              nextInput?.select();
                            }
                          }
                        }}
                        className="text-right h-8 text-sm"
                        data-testid={`input-variant-quantity-${variant.id}`}
                      />
                    </div>
                  </div>
                );
              }}
            </List>
            
            {/* Show count for large lists */}
            {productVariants.length > 20 && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {t('orders:showingVariants', { count: productVariants.length })}
              </p>
            )}
            <DialogFooter className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowVariantDialog(false);
                  setSelectedProductForVariant(null);
                  setProductVariants([]);
                  setVariantQuantities({});
                  setQuickVariantInput("");
                }}
              >
                {t('orders:cancel')}
              </Button>
              <Button
                type="button"
                onClick={addVariantsToOrder}
                data-testid="button-add-variants"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('orders:addSelectedVariants')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Item Note Editor Dialog */}
        <Dialog open={editingNoteItemId !== null} onOpenChange={(open) => {
          if (!open) {
            setEditingNoteItemId(null);
            setEditingNoteText("");
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">{t('orders:shippingNotes')}</DialogTitle>
              <DialogDescription className="text-sm">
                {t('orders:addShippingNotesDescription')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="note-text" className="text-sm">{t('orders:shippingNotes')}</Label>
                <Textarea
                  id="note-text"
                  value={editingNoteText}
                  onChange={(e) => setEditingNoteText(e.target.value)}
                  placeholder={t('orders:typeNoteOrSelectTemplate')}
                  className="mt-1 min-h-[120px]"
                  data-testid="textarea-item-note"
                />
                <div className="mt-3">
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">{t('orders:quickTemplates')}</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Handle with care - fragile item",
                      "Keep upright during transport",
                      "Double box required",
                      "Pack with extra bubble wrap",
                      "Separate from other items",
                      "Do not stack",
                      "Temperature sensitive - keep cool",
                      "Pack with anti-static materials"
                    ].map((template) => (
                      <button
                        key={template}
                        type="button"
                        onClick={() => setEditingNoteText(template)}
                        className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-blue-100 dark:bg-slate-800 dark:hover:bg-blue-900 text-slate-700 dark:text-slate-300 rounded-full border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                      >
                        {template}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingNoteItemId(null);
                  setEditingNoteText("");
                }}
              >
                {t('common:cancel')}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (editingNoteItemId) {
                    updateOrderItem(editingNoteItemId, 'notes', editingNoteText || null);
                    setEditingNoteItemId(null);
                    setEditingNoteText("");
                  }
                }}
                data-testid="button-save-note"
              >
                <Save className="h-4 w-4 mr-2" />
                {t('orders:saveNote')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Out of Stock Warning Dialog */}
        <Dialog open={outOfStockDialogOpen} onOpenChange={setOutOfStockDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('orders:outOfStockWarning')}</DialogTitle>
              <DialogDescription>
                {t('orders:outOfStockWarningDesc', { productName: pendingOutOfStockProduct?.name || '' })}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={handleOutOfStockCancel} data-testid="button-out-of-stock-cancel">
                {t('orders:dontAdd')}
              </Button>
              <Button variant="secondary" onClick={() => handleOutOfStockConfirm(false)} data-testid="button-out-of-stock-add-once">
                {t('orders:yesAdd')}
              </Button>
              <Button onClick={() => handleOutOfStockConfirm(true)} data-testid="button-out-of-stock-always-add">
                {t('orders:yesAlwaysAdd')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Shipping Address Modal */}
        <ShippingAddressModal
          open={showShippingModal}
          onOpenChange={setShowShippingModal}
          onSave={(address) => {
            if (editingAddress) {
              // Update existing address
              updateShippingAddressMutation.mutate({
                addressId: editingAddress.id,
                addressData: address
              });
            } else {
              // Create new address
              if (selectedCustomer?.needsSaving) {
                // For quick customers that need saving, store address temporarily
                const newAddress = {
                  id: `temp-address-${Date.now()}`,
                  ...address,
                  isNew: true,
                };
                setSelectedShippingAddress(newAddress);
                setShowShippingModal(false);
                setEditingAddress(null);
                toast({
                  title: t('common:success'),
                  description: t('orders:addressSavedWithCustomer'),
                });
              } else {
                // For existing customers, save immediately
                createShippingAddressMutation.mutate(address);
              }
            }
          }}
          editingAddress={editingAddress}
          existingAddresses={Array.isArray(shippingAddresses) ? shippingAddresses : []}
          title={editingAddress ? t('orders:editShippingAddress') : t('orders:addShippingAddress')}
          description={editingAddress ? t('orders:updateShippingAddressDetails') : t('orders:enterNewShippingAddressDetails')}
        />
      </div>
    </div>
  );
}