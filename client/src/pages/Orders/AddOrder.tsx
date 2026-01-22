import { useState, useEffect, useMemo, useRef, useCallback, Fragment } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { useTranslation } from 'react-i18next';
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { FixedSizeList as List } from "react-window";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DecimalInput } from "@/components/ui/decimal-input";
import { handleDecimalKeyDown, parseDecimal } from "@/lib/utils";
import { MathInput } from "@/components/ui/math-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { fuzzySearch } from "@/lib/fuzzySearch";
import { getCurrencyByCountry, convertCurrency, type Currency } from "@/lib/currencyUtils";
import { useLocalization } from "@/contexts/LocalizationContext";
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
  Minus,
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
  ChevronRight,
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
  Check,
  TicketCheck,
  Link2,
  AlertTriangle,
  UserCheck,
  Cloud
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
import { PPLSmartPopup } from "@/components/PPLSmartPopup";
import { useRealTimeOrder } from "@/hooks/useSocket";
import { RealTimeViewers, LockOverlay } from "@/components/RealTimeViewers";
import { normalizeFirstName, normalizeLastName, normalizeFullName } from '@shared/utils/nameNormalizer';
import { parseAddressLine, shouldFetchAddressDetails, mergeAddressData } from '@shared/utils/addressParser';
import { normalizeCountryForStorage, getLocalizedCountryName, countryToIso, getCountryFlag } from '@shared/utils/countryNormalizer';

// Helper function to normalize carrier names for backward compatibility
const normalizeCarrier = (value: string): string => {
  const map: Record<string, string> = {
    'PPL': 'PPL CZ',
    'GLS': 'GLS DE',
    'DHL': 'DHL DE',
    'PPL CZ': 'PPL CZ',
    'PPL CZ SMART': 'PPL CZ SMART', // Preserve SMART shipments
    'GLS DE': 'GLS DE',
    'DHL DE': 'DHL DE',
    'DPD': 'DPD',
  };
  return map[value] || value;
};

// Helper function to extract Facebook ID or username from URL or recognize plain Facebook ID
const extractFacebookId = (input: string): string | null => {
  if (!input) return null;
  
  const trimmed = input.trim();
  
  // Check if input looks like a Facebook URL
  const facebookUrlPattern = /(?:https?:\/\/)?(?:www\.|m\.)?facebook\.com\//i;
  
  if (facebookUrlPattern.test(trimmed)) {
    try {
      // Pattern 1: profile.php?id=12345
      const numericIdMatch = trimmed.match(/profile\.php\?id=(\d+)/);
      if (numericIdMatch) {
        return numericIdMatch[1];
      }
      
      // Pattern 2: facebook.com/username or facebook.com/pages/name/id
      const usernameMatch = trimmed.match(/facebook\.com\/([^/?&#]+)/);
      if (usernameMatch && usernameMatch[1]) {
        const username = usernameMatch[1];
        // Exclude common paths that aren't usernames
        const excludedPaths = ['profile.php', 'pages', 'groups', 'events', 'marketplace', 'watch', 'gaming'];
        if (!excludedPaths.includes(username.toLowerCase())) {
          return username;
        }
      }
    } catch (error) {
      // Silently handle parsing errors
    }
    return null;
  }
  
  // Check if input looks like a plain Facebook ID (not a URL)
  // Facebook IDs with numbers: hien.cao.5855594, 100001234567890
  // Nicknames: hien.cao (no numbers at end - these are just usernames)
  
  // Pattern: alphanumeric with dots, containing numbers (typical FB profile ID)
  // e.g., hien.cao.5855594, nguyen.van.123456, 100001234567890
  const fbIdWithNumbersPattern = /^[a-zA-Z0-9._-]+\d+$/;
  const pureNumericIdPattern = /^\d{10,}$/; // Pure numeric IDs (10+ digits)
  
  if (fbIdWithNumbersPattern.test(trimmed) || pureNumericIdPattern.test(trimmed)) {
    return trimmed;
  }
  
  return null;
};

const addOrderSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  orderType: z.enum(['pos', 'ord', 'web', 'tel']).default('ord'),
  currency: z.enum(['CZK', 'EUR', 'USD', 'VND', 'CNY']),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  orderStatus: z.enum(['pending', 'to_fulfill', 'shipped']).default('pending'),
  paymentStatus: z.enum(['pending', 'paid', 'pay_later']).default('pending'),
  shippingMethod: z.enum(['PPL', 'PPL CZ', 'PPL CZ SMART', 'GLS', 'GLS DE', 'DHL', 'DHL DE', 'DPD', 'Pickup', 'Hand-Delivery']).transform(normalizeCarrier).optional(),
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
  notes: z.string().optional().nullable(),
  saleType: z.enum(['retail', 'wholesale']).default('retail'),
});

interface OrderItem {
  id: string;
  productId?: string;
  serviceId?: string;
  variantId?: string;
  variantName?: string;
  variantSku?: string | null;
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
  availableQuantity?: number;
  stockQuantity?: number;
  // Virtual SKU fields - product deducts from master product's inventory
  isVirtual?: boolean;
  masterProductId?: string | null;
  masterProductName?: string | null;
  inventoryDeductionRatio?: number | null;
  // Product type for UI indicators
  productType?: 'standard' | 'physical_no_quantity' | 'virtual';
  // Deprecated packaging unit fields (kept for backward compatibility)
  bulkUnitName?: string;
  bulkUnitQty?: number;
  priceTier?: 'retail' | 'bulk';
  retailPrice?: number;
  bulkPrice?: number;
  allowBulkSales?: boolean;
}

interface BuyXGetYAllocation {
  discountId: number;
  discountName: string;
  categoryId: string | null;
  categoryName?: string;
  productId: string | null;
  productName?: string;
  isProductScope: boolean;
  buyQty: number;
  getQty: number;
  totalPaidItems: number;
  freeItemsEarned: number;
  freeItemsAssigned: number;
  remainingFreeSlots: number;
}

export default function AddOrder() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const editOrderId = params.id;
  const isEditMode = !!editOrderId;
  const { t } = useTranslation(['orders', 'common']);
  const [showTaxInvoice, setShowTaxInvoice] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const { toast } = useToast();
  const { user, canViewProfit, canViewMargin, canViewImportCost } = useAuth();
  const canAccessFinancialData = canViewProfit || canViewMargin;
  
  // Real-time collaboration - track viewers and locks (only in edit mode)
  const { 
    viewers, 
    lockInfo, 
    isLocked, 
    isCurrentUserLockOwner,
    requestLock, 
    releaseLock 
  } = useRealTimeOrder(isEditMode ? editOrderId : undefined);
  
  const { defaultCurrency, defaultPaymentMethod, defaultCarrier, enableCod } = useOrderDefaults();
  const { generalSettings, financialHelpers, shippingSettings, serviceSettings } = useSettings();
  const { formatCurrency, settings: localizationSettings } = useLocalization();
  const aiCartonPackingEnabled = generalSettings?.enableAiCartonPacking ?? true;
  
  // Grand total editing state - allows free typing in the grand total input
  const [grandTotalInput, setGrandTotalInput] = useState<string>("");
  const [isEditingGrandTotal, setIsEditingGrandTotal] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [buyXGetYAllocations, setBuyXGetYAllocations] = useState<BuyXGetYAllocation[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [applyStoreCredit, setApplyStoreCredit] = useState(true);
  const [storeCreditAmount, setStoreCreditAmount] = useState<number>(0);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedProductIndex, setSelectedProductIndex] = useState(0);
  
  const productSearchRef = useRef<HTMLInputElement>(null);
  const customerSearchRef = useRef<HTMLInputElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  
  // Track previous carrier for smart carrier switching
  const previousCarrierRef = useRef<string | null>(null);
  // Track if user manually edited shipping cost - prevents auto-recalculation
  const shippingCostManuallyEditedRef = useRef<boolean>(false);
  const [barcodeScanMode, setBarcodeScanMode] = useState(false);
  const [debouncedProductSearch, setDebouncedProductSearch] = useState("");
  const [debouncedCustomerSearch, setDebouncedCustomerSearch] = useState("");
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [selectedShippingAddress, setSelectedShippingAddress] = useState<any>(null);
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any>(null);
  
  // PPL SMART pickup location state
  const [selectedPickupLocation, setSelectedPickupLocation] = useState<any>(null);
  const [pickupLocationSearch, setPickupLocationSearch] = useState("");
  const [showPickupLocationDropdown, setShowPickupLocationDropdown] = useState(false);
  const [isLoadingPickupLocations, setIsLoadingPickupLocations] = useState(false);
  const [pickupLocationSuggestions, setPickupLocationSuggestions] = useState<any[]>([]);
  const [showPPLSmartPopup, setShowPPLSmartPopup] = useState(false);
  
  // Hand-Delivery location state
  const [handDeliveryLocation, setHandDeliveryLocation] = useState("");
  
  // Mobile compact view state
  const [expandedMobileNotes, setExpandedMobileNotes] = useState<string | null>(null);
  const [mobileImagePopup, setMobileImagePopup] = useState<{ open: boolean; src: string; alt: string }>({ open: false, src: '', alt: '' });
  
  // Variant/Bundle selection state
  const [showVariantDialog, setShowVariantDialog] = useState(false);
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<any>(null);
  const [productVariants, setProductVariants] = useState<any[]>([]);
  const [variantQuantities, setVariantQuantities] = useState<{[key: string]: number}>({});
  const [quickVariantInput, setQuickVariantInput] = useState("");
  
  // Quick quantity modal state - for fast product addition
  const [showQuickQuantityModal, setShowQuickQuantityModal] = useState(false);
  const [quickQuantityProduct, setQuickQuantityProduct] = useState<any>(null);
  const [quickQuantityValue, setQuickQuantityValue] = useState("1");
  const quickQuantityInputRef = useRef<HTMLInputElement>(null);
  
  // Edit customer dialog state
  const [showEditCustomerDialog, setShowEditCustomerDialog] = useState(false);
  const [editCustomerForm, setEditCustomerForm] = useState({
    name: "",
    phone: "",
    email: "",
    company: "",
    preferredCurrency: "EUR" as "CZK" | "EUR"
  });
  
  // Expanded variant groups state - tracks which parent products are expanded in the order items table
  const [expandedVariantGroups, setExpandedVariantGroups] = useState<Set<string>>(new Set());
  
  // Parse quick variant input - supports:
  // - Single: "23" (1pc of variant 23)
  // - Range: "1-10" (1pc each of variants 1,2,3,...,10)
  // - Quantity: "23x5" or "23*5" (5pcs of variant 23)
  const parseQuickVariantInput = useCallback((input: string) => {
    if (!input.trim() || productVariants.length === 0) return;
    
    const newQuantities: {[key: string]: number} = {};
    
    // Helper to find variant by number
    const findVariantByNumber = (num: string) => {
      return productVariants.find(v => {
        const name = v.name?.toString() || '';
        const barcode = v.barcode?.toString() || '';
        const nameNumbers = name.match(/\d+/g);
        return (
          name === num ||
          barcode === num ||
          (nameNumbers && nameNumbers.includes(num))
        );
      });
    };
    
    // Split by comma and process each segment
    const segments = input.split(',').map(s => s.trim()).filter(Boolean);
    
    for (const segment of segments) {
      // First check for quantity format: "23x5", "23*5", "23 x 5", "23 * 5"
      const qtyMatch = segment.match(/^(\d+)\s*[x*]\s*(\d+)$/i);
      if (qtyMatch) {
        const variantNumber = qtyMatch[1];
        const quantity = parseInt(qtyMatch[2]) || 1;
        const variant = findVariantByNumber(variantNumber);
        if (variant) {
          newQuantities[variant.id] = (newQuantities[variant.id] || 0) + quantity;
        }
        continue;
      }
      
      // Check for range format: "1-10" (range of variants)
      const rangeMatch = segment.match(/^(\d+)\s*[-–]\s*(\d+)$/);
      if (rangeMatch) {
        const startNum = parseInt(rangeMatch[1]);
        const endNum = parseInt(rangeMatch[2]);
        
        // If start < end, treat as range
        if (startNum < endNum) {
          for (let i = startNum; i <= endNum; i++) {
            const variant = findVariantByNumber(String(i));
            if (variant) {
              newQuantities[variant.id] = (newQuantities[variant.id] || 0) + 1;
            }
          }
          continue;
        }
      }
      
      // Single number: "23" (1pc of variant 23)
      const singleMatch = segment.match(/^(\d+)$/);
      if (singleMatch) {
        const variant = findVariantByNumber(singleMatch[1]);
        if (variant) {
          newQuantities[variant.id] = (newQuantities[variant.id] || 0) + 1;
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
    facebookNumericId: "",
    profilePictureUrl: "",
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
  
  // Facebook profile fetching state for new customer form
  const [isFetchingFacebookProfile, setIsFetchingFacebookProfile] = useState(false);
  
  // Track if Facebook Name has been manually edited
  const [facebookNameManuallyEdited, setFacebookNameManuallyEdited] = useState(false);
  
  // Duplicate customer detection for new customer form
  const [duplicateCustomer, setDuplicateCustomer] = useState<any>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  
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
  
  // Stock limit modal for quantity updates
  const [stockLimitModalOpen, setStockLimitModalOpen] = useState(false);
  const [pendingQuantityUpdate, setPendingQuantityUpdate] = useState<{
    itemId: string;
    requestedQty: number;
    availableStock: number;
    productName: string;
  } | null>(null);
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

  // Reset store credit state when customer changes
  useEffect(() => {
    setApplyStoreCredit(false);
    setStoreCreditAmount(0);
  }, [selectedCustomer?.id]);

  // Initialize store credit amount when customer is selected
  useEffect(() => {
    if (selectedCustomer?.storeCredit) {
      const availableCredit = parseFloat(selectedCustomer.storeCredit) || 0;
      if (availableCredit > 0) {
        setStoreCreditAmount(availableCredit);
        setApplyStoreCredit(true);
      } else {
        setStoreCreditAmount(0);
        setApplyStoreCredit(false);
      }
    } else {
      setStoreCreditAmount(0);
      setApplyStoreCredit(false);
    }
  }, [selectedCustomer?.id, selectedCustomer?.storeCredit]);

  // Fetch real addresses from Google Maps API (with Nominatim fallback)
  const fetchRealAddresses = async (query: string): Promise<any[]> => {
    try {
      // Try Google Maps API first for better accuracy
      const googleResponse = await fetch(`/api/addresses/autocomplete-google?q=${encodeURIComponent(query)}`);
      if (googleResponse.ok) {
        const googleData = await googleResponse.json();
        // Check if Google API returned results (not fallback object)
        if (!googleData.fallback && Array.isArray(googleData) && googleData.length > 0) {
          console.log('Using Google Maps API for address autocomplete');
          return googleData.map((item: any) => ({
            formatted: item.displayName || item.name || '', // Google returns displayName
            street: item.street || '',
            streetNumber: item.streetNumber || '',
            city: item.city || '',
            state: '', // Google doesn't return state in our implementation
            zipCode: item.zipCode || '',
            country: item.country || '',
            businessName: item.businessName || null, // Include business name if available
          }));
        }
      }
      
      // Fallback to Nominatim
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch addresses');
      }
      const data = await response.json();

      return data.map((item: any) => ({
        formatted: item.formatted,
        street: item.street || '',
        streetNumber: item.houseNumber || '',
        city: item.city || '',
        state: item.state || '',
        zipCode: item.zipCode || '',
        country: item.country || '',
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
      formatted: "Dragounská 2545/9A, 350 02 Cheb, Czech Republic",
      street: "Dragounská 2545/9A",
      city: "Cheb",
      state: "Karlovarský kraj",
      zipCode: "350 02",
      country: "Czech Republic"
    },
    { 
      formatted: "Dragounská 150, 350 02 Cheb, Czech Republic",
      street: "Dragounská 150",
      city: "Cheb",
      state: "Karlovarský kraj",
      zipCode: "350 02",
      country: "Czech Republic"
    },
    {
      formatted: "Palackého náměstí 2, 301 00 Plzeň, Czech Republic",
      street: "Palackého náměstí 2",
      city: "Plzeň",
      state: "Plzeňský kraj",
      zipCode: "301 00",
      country: "Czech Republic"
    },
    {
      formatted: "Wenceslas Square 785/36, 110 00 Praha 1, Czech Republic",
      street: "Wenceslas Square 785/36",
      city: "Praha 1",
      state: "Praha",
      zipCode: "110 00",
      country: "Czech Republic"
    },
    {
      formatted: "Václavské náměstí 785/36, 110 00 Praha 1, Czech Republic",
      street: "Václavské náměstí 785/36",
      city: "Praha 1",
      state: "Praha",
      zipCode: "110 00",
      country: "Czech Republic"
    },
    {
      formatted: "Karlova 1, 110 00 Praha 1, Czech Republic",
      street: "Karlova 1",
      city: "Praha 1",
      state: "Praha",
      zipCode: "110 00",
      country: "Czech Republic"
    },
    {
      formatted: "Nerudova 19, 118 00 Praha 1, Czech Republic",
      street: "Nerudova 19",
      city: "Praha 1",
      state: "Praha",
      zipCode: "118 00",
      country: "Czech Republic"
    },
    {
      formatted: "Masarykova 28, 602 00 Brno, Czech Republic",
      street: "Masarykova 28",
      city: "Brno",
      state: "Jihomoravský kraj",
      zipCode: "602 00",
      country: "Czech Republic"
    },
    {
      formatted: "Náměstí Svobody 1, 602 00 Brno, Czech Republic",
      street: "Náměstí Svobody 1",
      city: "Brno",
      state: "Jihomoravský kraj",
      zipCode: "602 00",
      country: "Czech Republic"
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

  // Function to select an address from suggestions (Google Maps validated)
  const selectAddress = (suggestion: any) => {
    let streetName = suggestion.street || '';
    let streetNumber = suggestion.streetNumber || '';
    
    // If streetNumber not provided separately, try to extract from street
    if (!streetNumber && streetName) {
      const streetParts = streetName.trim().split(/\s+/);
      const lastPart = streetParts[streetParts.length - 1];
      const hasNumber = /\d/.test(lastPart);
      
      if (hasNumber) {
        streetName = streetParts.slice(0, -1).join(' ');
        streetNumber = lastPart;
      }
    }
    
    // Update all address fields from Google Maps validated data
    setNewCustomer(prev => ({
      ...prev,
      street: streetName,
      streetNumber: streetNumber.toUpperCase().trim(),
      city: suggestion.city || '',
      state: suggestion.state || '',
      zipCode: (suggestion.zipCode || '').trim(),
      country: normalizeCountryForStorage(suggestion.country) || '',
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

  // Fetch all customers for real-time filtering
  const { data: allCustomers } = useQuery({
    queryKey: ['/api/customers', { includeBadges: true }],
    staleTime: 5 * 60 * 1000, // 5 minutes - customers don't change frequently
  });
  
  // Server-side customer search for Facebook URLs and complex searches
  const { data: searchedCustomers, isFetching: isSearchingCustomers } = useQuery({
    queryKey: ['/api/customers', { search: debouncedCustomerSearch }],
    queryFn: async () => {
      const response = await fetch(`/api/customers?search=${encodeURIComponent(debouncedCustomerSearch)}`);
      if (!response.ok) throw new Error('Failed to search customers');
      return response.json();
    },
    enabled: !!debouncedCustomerSearch && debouncedCustomerSearch.length >= 2,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Fetch shipping addresses for selected customer
  const { data: shippingAddresses, isLoading: isLoadingShippingAddresses } = useQuery({
    queryKey: ['/api/customers', selectedCustomer?.id, 'shipping-addresses'],
    enabled: !!selectedCustomer?.id,
  });

  // Fetch existing order for edit mode
  const { data: existingOrder, isLoading: isLoadingOrder } = useQuery({
    queryKey: ['/api/orders', editOrderId, { includeBadges: true }],
    queryFn: async () => {
      const response = await fetch(`/api/orders/${editOrderId}?includeBadges=true`);
      if (!response.ok) throw new Error('Failed to fetch order');
      return response.json();
    },
    enabled: isEditMode,
    staleTime: 30 * 1000,
  });

  // Pre-fill form data when editing existing order
  useEffect(() => {
    if (!existingOrder || !isEditMode) return;
    const order = existingOrder as any;

    console.log('✅ Loading existing order data into form');

    form.reset({
      customerId: order.customerId,
      orderType: order.orderType || 'ord',
      saleType: order.saleType || 'retail',
      currency: order.currency,
      priority: order.priority,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      shippingMethod: order.shippingMethod ? normalizeCarrier(order.shippingMethod) : order.shippingMethod,
      paymentMethod: order.paymentMethod,
      discountType: order.discountType || 'flat',
      discountValue: order.discountValue || 0,
      taxInvoiceEnabled: order.taxInvoiceEnabled || false,
      ico: order.ico,
      dic: order.dic,
      nameAndAddress: order.nameAndAddress,
      taxRate: order.taxRate || 0,
      vatId: order.vatId,
      country: order.country,
      shippingCost: order.shippingCost || 0,
      actualShippingCost: order.actualShippingCost || 0,
      adjustment: order.adjustment || 0,
      codAmount: order.codAmount,
      codCurrency: order.codCurrency,
      notes: order.notes,
    });

    if (order.taxInvoiceEnabled || order.taxRate > 0) {
      setShowTaxInvoice(true);
    }
    if (order.discountValue > 0) {
      setShowDiscount(true);
    }
    
    // Pre-fill pickup location for PPL SMART orders
    if (order.pickupLocationCode) {
      setSelectedPickupLocation({
        code: order.pickupLocationCode,
        name: order.pickupLocationName,
        street: order.pickupLocationAddress?.split(',')[0]?.trim() || '',
        city: order.pickupLocationAddress?.split(',')[1]?.trim()?.split(' ')[0] || '',
        zipCode: order.pickupLocationAddress?.split(',')[1]?.trim()?.split(' ').slice(1).join(' ') || '',
      });
    }

    // Set orderId for the component
    setOrderId(order.id);
  }, [existingOrder, isEditMode, form]);

  // Pre-fill order items when editing existing order
  useEffect(() => {
    if (!existingOrder || !isEditMode) return;
    const order = existingOrder as any;
    if (!order.items) return;

    console.log('✅ Loading order items:', order.items.length);

    const items: OrderItem[] = order.items.map((item: any) => {
      const discountAmount = parseFloat(item.discount || 0);
      const itemPrice = parseFloat(item.price || 0);
      const itemQty = item.quantity || 1;

      // Calculate discountPercentage from stored discount amount if not stored
      let discountPct = parseFloat(item.discountPercentage || 0);
      if (discountPct === 0 && discountAmount > 0 && itemPrice > 0 && itemQty > 0) {
        discountPct = Math.round((discountAmount / (itemPrice * itemQty)) * 100);
      }

      // Generate a simple label if discount exists but no label was stored
      let discountLabel = item.appliedDiscountLabel || null;
      if (!discountLabel && discountAmount > 0 && itemPrice > 0) {
        const pct = Math.round((discountAmount / (itemPrice * itemQty)) * 100);
        if (pct > 0 && pct <= 100) {
          discountLabel = `${pct}%`;
        }
      }

      return {
        id: item.id || `item-${Date.now()}-${Math.random()}`,
        productId: item.productId,
        serviceId: item.serviceId,
        bundleId: item.bundleId,
        productName: item.productName,
        sku: item.sku,
        quantity: itemQty,
        price: itemPrice,
        discount: discountAmount,
        discountPercentage: discountPct,
        tax: parseFloat(item.tax || 0),
        total: parseFloat(item.total || 0),
        landingCost: item.landingCost,
        variantId: item.variantId,
        variantName: item.variantName,
        image: item.image,
        notes: item.notes,
        appliedDiscountId: item.appliedDiscountId || null,
        appliedDiscountLabel: discountLabel,
        appliedDiscountType: item.appliedDiscountType || null,
        appliedDiscountScope: item.appliedDiscountScope || null,
        categoryId: item.categoryId || null,
      };
    });

    setOrderItems(items);
    // Initialize the saved items ref so we can detect future changes
    savedOrderItemsRef.current = JSON.stringify(items);
    // Also initialize address ref
    if (savedShippingAddressRef.current === '') {
      savedShippingAddressRef.current = '__initial__';
    }
  }, [existingOrder?.id, existingOrder?.items?.length, isEditMode]);

  // Pre-fill customer when editing existing order
  useEffect(() => {
    if (!existingOrder || !allCustomers || !isEditMode) return;
    const order = existingOrder as any;

    if (order.customerId) {
      const customer = Array.isArray(allCustomers)
        ? allCustomers.find((c: any) => c.id === order.customerId)
        : null;

      if (customer) {
        setSelectedCustomer(customer);
        setCustomerSearch(customer.name);
      }
    }
  }, [existingOrder?.id, existingOrder?.customerId, allCustomers, isEditMode]);

  // Pre-fill shipping address when editing existing order
  useEffect(() => {
    if (!existingOrder || !shippingAddresses || !isEditMode) return;
    const order = existingOrder as any;

    if (!Array.isArray(shippingAddresses)) return;

    if (order.shippingAddressId) {
      const address = shippingAddresses.find((addr: any) => addr.id === order.shippingAddressId);
      if (address) {
        setSelectedShippingAddress(address);
        // Initialize the saved address ref so we can detect future changes
        savedShippingAddressRef.current = JSON.stringify(address);
      }
    } else if (shippingAddresses.length === 1) {
      setSelectedShippingAddress(shippingAddresses[0]);
      savedShippingAddressRef.current = JSON.stringify(shippingAddresses[0]);
    }
  }, [existingOrder?.shippingAddressId, shippingAddresses, isEditMode]);

  // Pre-fill selected documents when editing
  const documentsInitialized = useRef(false);
  useEffect(() => {
    if (!existingOrder || !isEditMode) return;
    if (documentsInitialized.current) return;

    const order = existingOrder as any;
    if (order.selectedDocumentIds && Array.isArray(order.selectedDocumentIds)) {
      setSelectedDocumentIds(order.selectedDocumentIds);
      documentsInitialized.current = true;
    }
  }, [existingOrder?.id, isEditMode]);

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
  
  // Real-time collaboration: Request lock when editing, release on unmount
  useEffect(() => {
    if (isEditMode && editOrderId) {
      // Request edit lock when entering edit mode
      requestLock('edit');
      
      return () => {
        // Release lock when leaving edit mode
        releaseLock();
      };
    }
  }, [isEditMode, editOrderId, requestLock, releaseLock]);
  
  // Track order items changes after order creation
  useEffect(() => {
    if (!orderId) return;
    
    const currentItems = JSON.stringify(orderItems);
    if (savedOrderItemsRef.current && currentItems !== savedOrderItemsRef.current) {
      setHasChangesAfterSave(true);
    }
  }, [orderId, orderItems]);

  // Track shipping address changes after order creation
  const savedShippingAddressRef = useRef<string>('');
  useEffect(() => {
    if (!orderId) return;
    
    const currentAddress = JSON.stringify(selectedShippingAddress);
    if (savedShippingAddressRef.current && currentAddress !== savedShippingAddressRef.current) {
      setHasChangesAfterSave(true);
    }
    // Also set initial value when order is loaded
    if (!savedShippingAddressRef.current && selectedShippingAddress) {
      savedShippingAddressRef.current = currentAddress;
    }
  }, [orderId, selectedShippingAddress]);

  // Track uploaded files changes after order creation
  useEffect(() => {
    if (!orderId) return;
    if (uploadedFiles.length > 0) {
      setHasChangesAfterSave(true);
    }
  }, [orderId, uploadedFiles.length]);

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

  // Fetch all orders to calculate product frequency
  const { data: allOrders } = useQuery({
    queryKey: ['/api/orders'],
    staleTime: 2 * 60 * 1000, // 2 minutes - orders change more frequently
  });

  // Fetch pending services for selected customer
  const { data: pendingServices, isLoading: isLoadingPendingServices } = useQuery<any[]>({
    queryKey: ['/api/customers', selectedCustomer?.id, 'pending-services'],
    enabled: !!selectedCustomer?.id,
  });

  // Fetch unresolved tickets for selected customer
  const { data: customerTickets } = useQuery<any[]>({
    queryKey: ['/api/tickets', selectedCustomer?.id],
    queryFn: async () => {
      const response = await fetch(`/api/tickets?customerId=${selectedCustomer?.id}`);
      if (!response.ok) throw new Error('Failed to fetch tickets');
      return response.json();
    },
    enabled: !!selectedCustomer?.id && !selectedCustomer.isTemporary && !selectedCustomer.needsSaving,
  });

  // Filter to get only unresolved tickets for the selected customer
  const unresolvedTickets = useMemo(() => {
    if (!customerTickets || !selectedCustomer?.id) return [];
    return customerTickets.filter((ticket: any) => 
      ticket.customerId === selectedCustomer.id &&
      (ticket.status === 'open' || ticket.status === 'in_progress')
    );
  }, [customerTickets, selectedCustomer?.id]);

  // Mutation to resolve tickets quickly
  const resolveTicketMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      return apiRequest('PATCH', `/api/tickets/${ticketId}`, {
        status: 'resolved',
        resolvedAt: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
      toast({
        title: t('orders:ticketResolved'),
        description: t('orders:ticketResolvedDescription'),
      });
    },
    onError: () => {
      toast({
        title: t('common:error'),
        description: t('orders:ticketResolveError'),
        variant: 'destructive'
      });
    }
  });

  // Track which pending services have been applied to the order
  const [appliedServiceIds, setAppliedServiceIds] = useState<Set<string>>(new Set());
  
  // Auto-check Service BILL when a service is applied
  const [includeServiceBill, setIncludeServiceBill] = useState(false);
  
  // Include packing list document (default: no)
  const [includePackingList, setIncludePackingList] = useState(false);

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
    onSuccess: (createdAddress) => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers', selectedCustomer?.id, 'shipping-addresses'] });
      setShowShippingModal(false);
      setEditingAddress(null);
      // Auto-select the newly created address
      if (createdAddress) {
        setSelectedShippingAddress(createdAddress);
      }
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

  // Facebook profile fetch mutation for new customer form
  const fetchFacebookProfileMutation = useMutation({
    mutationFn: async (facebookUrl: string) => {
      const res = await apiRequest('POST', '/api/facebook/profile', { facebookUrl });
      return res.json();
    },
    onSuccess: (data: { name: string | null; profilePictureUrl: string | null; facebookId: string | null; facebookNumericId: string | null; username: string }) => {
      // Update customer name and Facebook data
      if (data.name) {
        setNewCustomer(prev => ({
          ...prev,
          name: data.name!,
          facebookName: data.name!,
          facebookNumericId: data.facebookNumericId || prev.facebookNumericId
        }));
      }
      
      // Update profile picture if returned
      if (data.profilePictureUrl) {
        setNewCustomer(prev => ({ ...prev, profilePictureUrl: data.profilePictureUrl! }));
      }
      
      // Update facebookNumericId if available
      if (data.facebookNumericId) {
        setNewCustomer(prev => ({ ...prev, facebookNumericId: data.facebookNumericId! }));
      }
      
      toast({
        title: t('customers:facebookProfileFetched'),
        description: data.name ? t('customers:foundProfile', { name: data.name }) : t('customers:profileDataRetrieved'),
      });
      setIsFetchingFacebookProfile(false);
    },
    onError: (error: any) => {
      console.error('[Facebook Profile] Error fetching:', error);
      toast({
        title: t('customers:facebookFetchFailed'),
        description: error.message || t('customers:couldNotFetchFacebookProfile'),
        variant: "destructive",
      });
      setIsFetchingFacebookProfile(false);
    },
  });

  // Fetch Facebook profile on blur (when user leaves the input field)
  const handleFacebookUrlBlur = () => {
    const url = newCustomer.facebookUrl;
    if (url && url.includes('facebook.com') && !isFetchingFacebookProfile && !fetchFacebookProfileMutation.isPending) {
      setIsFetchingFacebookProfile(true);
      fetchFacebookProfileMutation.mutate(url);
    }
  };

  // Manual refetch function for new customer form
  const handleRefetchFacebookProfile = () => {
    const url = newCustomer.facebookUrl;
    if (url && url.includes('facebook.com') && !isFetchingFacebookProfile && !fetchFacebookProfileMutation.isPending) {
      setIsFetchingFacebookProfile(true);
      fetchFacebookProfileMutation.mutate(url);
    }
  };

  // Check for duplicate customer when facebookUrl changes
  useEffect(() => {
    const checkDuplicate = async () => {
      const facebookId = extractFacebookId(newCustomer.facebookUrl);
      
      if (!facebookId || facebookId.length < 2) {
        setDuplicateCustomer(null);
        setIsCheckingDuplicate(false);
        return;
      }
      
      setIsCheckingDuplicate(true);
      
      try {
        const response = await fetch(`/api/customers/check-duplicate/${encodeURIComponent(facebookId)}`);
        if (!response.ok) {
          setDuplicateCustomer(null);
          setIsCheckingDuplicate(false);
          return;
        }
        
        const data = await response.json();
        if (data.exists && data.customer) {
          setDuplicateCustomer(data.customer);
        } else {
          setDuplicateCustomer(null);
        }
      } catch (error) {
        console.error('Error checking duplicate customer:', error);
        setDuplicateCustomer(null);
      } finally {
        setIsCheckingDuplicate(false);
      }
    };
    
    // Debounce the check
    const timeoutId = setTimeout(checkDuplicate, 500);
    return () => clearTimeout(timeoutId);
  }, [newCustomer.facebookUrl]);

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
      if (fields.country) setNewCustomer(prev => ({ ...prev, country: normalizeCountryForStorage(fields.country) }));
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
  const watchedPaymentMethod = form.watch('paymentMethod');

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

  // Track previous payment method for detecting changes
  const previousPaymentMethodRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (!watchedShippingMethod) return;

    // If user manually edited shipping cost, don't auto-recalculate
    // Reset the flag when carrier OR payment method changes (user might want new default)
    const previousCarrier = previousCarrierRef.current;
    const carrierChanged = previousCarrier !== watchedShippingMethod;
    const currentPaymentMethod = form.getValues('paymentMethod');
    const paymentMethodChanged = previousPaymentMethodRef.current !== null && previousPaymentMethodRef.current !== currentPaymentMethod;
    
    // Reset manual edit flag when carrier or payment method changes so new default can be applied
    if (carrierChanged || paymentMethodChanged) {
      shippingCostManuallyEditedRef.current = false;
    }
    
    // Update previous payment method ref
    previousPaymentMethodRef.current = currentPaymentMethod;
    
    // If manually edited and neither carrier nor payment changed, skip auto-calculation
    if (shippingCostManuallyEditedRef.current && !carrierChanged && !paymentMethodChanged) {
      return;
    }

    // Pickup and Hand-Delivery methods have no shipping cost
    if (watchedShippingMethod === 'Pickup' || watchedShippingMethod === 'Hand-Delivery') {
      form.setValue('shippingCost', 0);
      form.setValue('actualShippingCost', 0);
      previousCarrierRef.current = watchedShippingMethod;
      return;
    }

    // Helper function to get default price for a carrier (considers COD payment method for dobírka and SMART pickup)
    const getDefaultPriceForCarrier = (carrier: string): number => {
      const paymentMethod = form.getValues('paymentMethod');
      const isCOD = paymentMethod === 'COD';
      const isSmartDelivery = shippingSettings?.pplPackageType === 'SMART';
      
      if ((carrier === 'PPL' || carrier === 'PPL CZ')) {
        // SMART pickup pricing (ParcelShop/ParcelBox/AlzaBox)
        if (isSmartDelivery) {
          if (isCOD && shippingSettings?.pplDefaultShippingPriceSmartWithDobirka && shippingSettings.pplDefaultShippingPriceSmartWithDobirka > 0) {
            return shippingSettings.pplDefaultShippingPriceSmartWithDobirka;
          }
          if (shippingSettings?.pplDefaultShippingPriceSmart && shippingSettings.pplDefaultShippingPriceSmart > 0) {
            return shippingSettings.pplDefaultShippingPriceSmart;
          }
        }
        // Standard home/business delivery pricing
        if (isCOD && shippingSettings?.pplDefaultShippingPriceWithDobirka && shippingSettings.pplDefaultShippingPriceWithDobirka > 0) {
          return shippingSettings.pplDefaultShippingPriceWithDobirka;
        }
        if (shippingSettings?.pplDefaultShippingPrice && shippingSettings.pplDefaultShippingPrice > 0) {
          return shippingSettings.pplDefaultShippingPrice;
        }
      } else if ((carrier === 'GLS' || carrier === 'GLS DE') && shippingSettings?.glsDefaultShippingPrice && shippingSettings.glsDefaultShippingPrice > 0) {
        return shippingSettings.glsDefaultShippingPrice;
      } else if ((carrier === 'DHL' || carrier === 'DHL DE') && shippingSettings?.dhlDefaultShippingPrice && shippingSettings.dhlDefaultShippingPrice > 0) {
        return shippingSettings.dhlDefaultShippingPrice;
      }
      return 0;
    };

    const currentShippingCost = form.getValues('shippingCost') || 0;
    const newCarrierDefaultPrice = getDefaultPriceForCarrier(watchedShippingMethod);

    // Build a map of all carrier defaults to check if current price was auto-applied for any carrier
    // Include regular, dobírka, and SMART prices for PPL
    const allCarrierDefaults: Record<string, number> = {
      'PPL': shippingSettings?.pplDefaultShippingPrice || 0,
      'PPL CZ': shippingSettings?.pplDefaultShippingPrice || 0,
      'PPL_DOBIRKA': shippingSettings?.pplDefaultShippingPriceWithDobirka || 0,
      'PPL_SMART': shippingSettings?.pplDefaultShippingPriceSmart || 0,
      'PPL_SMART_DOBIRKA': shippingSettings?.pplDefaultShippingPriceSmartWithDobirka || 0,
      'GLS': shippingSettings?.glsDefaultShippingPrice || 0,
      'GLS DE': shippingSettings?.glsDefaultShippingPrice || 0,
      'DHL': shippingSettings?.dhlDefaultShippingPrice || 0,
      'DHL DE': shippingSettings?.dhlDefaultShippingPrice || 0,
    };

    // Helper function to check if a price is auto-applied (0 or matches any carrier's default)
    // If it matches any default or is 0, it was auto-applied and should be replaced on carrier change
    // If it doesn't match any default, it was manually entered and should be preserved
    const isAutoAppliedPrice = (cost: number): boolean => {
      if (cost === 0) return true;
      const allDefaults = Object.values(allCarrierDefaults).filter(d => d > 0);
      return allDefaults.some(defaultPrice => cost === defaultPrice);
    };

    // Determine if we should apply the new carrier's default price:
    // 1. We have a valid default to apply (> 0)
    // 2. Current price is auto-applied (0 or matches any carrier's default) - not manually set by user
    const shouldApplyDefault = 
      newCarrierDefaultPrice > 0 && 
      isAutoAppliedPrice(currentShippingCost);

    if (shouldApplyDefault) {
      form.setValue('shippingCost', newCarrierDefaultPrice);
      form.setValue('actualShippingCost', newCarrierDefaultPrice);
      previousCarrierRef.current = watchedShippingMethod;
      
      if (import.meta.env.DEV) {
        console.log(`[AddOrder] Auto-applied shipping default for ${watchedShippingMethod}: ${newCarrierDefaultPrice}`);
      }
      return;
    }

    // Update previous carrier ref even if we didn't apply a default
    if (carrierChanged) {
      previousCarrierRef.current = watchedShippingMethod;
    }

    if (!selectedCustomer?.country) return;

    const orderWeight = calculateOrderWeight();
    const pplRates = shippingSettings?.pplShippingRates;
    const paymentMethod = form.getValues('paymentMethod');

    // Calculate shipping cost (for weight-based rates or country-specific rates)
    const calculatedCost = calculateShippingCost(
      watchedShippingMethod,
      selectedCustomer.shippingCountry,
      watchedCurrency,
      { weight: orderWeight, pplRates, paymentMethod }
    );

    // Priority: Use settings default price if configured, otherwise use calculated cost
    // This ensures the settings default overrides hardcoded fallbacks in calculateShippingCost
    const settingsDefaultPrice = newCarrierDefaultPrice;
    const finalShippingCost = settingsDefaultPrice > 0 ? settingsDefaultPrice : calculatedCost;

    form.setValue('actualShippingCost', calculatedCost);
    form.setValue('shippingCost', finalShippingCost);
  }, [watchedShippingMethod, watchedPaymentMethod, selectedCustomer?.country, watchedCurrency, orderItems, shippingSettings?.pplShippingRates, shippingSettings?.pplDefaultShippingPrice, shippingSettings?.pplDefaultShippingPriceWithDobirka, shippingSettings?.pplDefaultShippingPriceSmart, shippingSettings?.pplDefaultShippingPriceSmartWithDobirka, shippingSettings?.pplPackageType, shippingSettings?.glsDefaultShippingPrice, shippingSettings?.dhlDefaultShippingPrice]);

  // Auto-sync dobírka/nachnahme amount and currency when PPL CZ/DHL DE + COD is selected
  // Recalculates on EVERY change (currency, items, shipping, discounts, taxes, adjustment)
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

  // Auto-fill currency from customer preference (only for new orders, not when editing)
  useEffect(() => {
    if (!selectedCustomer) return;
    
    // Skip auto-fill when editing an existing order - preserve the saved order currency
    if (isEditMode) return;
    
    // Auto-fill currency from customer preference only for new orders
    if (selectedCustomer.preferredCurrency) {
      form.setValue('currency', selectedCustomer.preferredCurrency);
    }
  }, [selectedCustomer, isEditMode]);

  // Auto-select carrier based on customer's country (only for new orders, not when editing)
  useEffect(() => {
    if (!selectedCustomer) return;
    
    // Skip auto-selection when editing an existing order - preserve the saved shipping method
    if (isEditMode) return;
    
    // Get the customer's country (from customer record or shipping address)
    const customerCountry = selectedShippingAddress?.country || selectedCustomer.shippingCountry;
    if (!customerCountry) return;
    
    // Convert country name to ISO code
    const countryCode = getCountryCode(customerCountry);
    if (!countryCode) return;
    
    // Default country-to-carrier mapping (used when no custom mapping is configured)
    const defaultMapping: Record<string, string> = {
      'CZ': 'PPL CZ',
      'DE': 'GLS DE',
      'AT': 'GLS DE',
      'SK': 'PPL CZ',
      'PL': 'GLS DE',
      'HU': 'GLS DE',
      'NL': 'GLS DE',
      'BE': 'GLS DE',
      'FR': 'GLS DE',
      'IT': 'GLS DE',
      'ES': 'GLS DE',
    };
    
    // Get the country carrier mapping from settings, with default fallback
    const countryCarrierMapping = shippingSettings?.countryCarrierMapping as Record<string, string> | undefined;
    const effectiveMapping = (countryCarrierMapping && Object.keys(countryCarrierMapping).length > 0) 
      ? countryCarrierMapping 
      : defaultMapping;
    
    // Look up the carrier for this country (case-insensitive)
    const mappedCarrier = effectiveMapping[countryCode] || 
      effectiveMapping[countryCode.toLowerCase()] ||
      Object.entries(effectiveMapping).find(([key]) => key.toUpperCase() === countryCode.toUpperCase())?.[1] ||
      'GLS DE'; // Final fallback for unknown countries
    
    if (mappedCarrier) {
      form.setValue('shippingMethod', mappedCarrier as any);
      if (import.meta.env.DEV) {
        console.log(`[AddOrder] Auto-selected carrier ${mappedCarrier} for country ${customerCountry} (${countryCode})`);
      }
    }
  }, [selectedCustomer, selectedShippingAddress, shippingSettings?.countryCarrierMapping, isEditMode]);

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
            phone: selectedCustomer.shippingTel || undefined,
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
            const fullAddress = [selectedCustomer.shippingStreet, selectedCustomer.streetNumber]
              .filter(Boolean)
              .join(' ');
            
            const customerData = {
              name: selectedCustomer.name,
              facebookName: selectedCustomer.facebookName || undefined,
              facebookUrl: selectedCustomer.facebookUrl || undefined,
              facebookNumericId: selectedCustomer.facebookNumericId || undefined,
              profilePictureUrl: selectedCustomer.profilePictureUrl || undefined,
              email: selectedCustomer.email || undefined,
              phone: selectedCustomer.shippingTel || undefined,
              address: fullAddress || undefined,
              city: selectedCustomer.shippingCity || undefined,
              state: selectedCustomer.state || undefined,
              zipCode: selectedCustomer.shippingZipCode || undefined,
              country: selectedCustomer.shippingCountry || undefined,
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
            if (selectedCustomer.shippingStreet || selectedCustomer.shippingCity || selectedCustomer.shippingZipCode) {
              console.log('Auto-creating shipping address for new customer...');
              const addressData = {
                customerId: customerResponse?.id,
                firstName: selectedCustomer.firstName || undefined,
                lastName: selectedCustomer.lastName || undefined,
                company: selectedCustomer.company || undefined,
                street: selectedCustomer.shippingStreet || '',
                streetNumber: selectedCustomer.streetNumber || undefined,
                city: selectedCustomer.shippingCity || '',
                zipCode: selectedCustomer.shippingZipCode || '',
                country: selectedCustomer.shippingCountry || '',
                tel: selectedCustomer.shippingTel || undefined,
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
      
      // Update customer's preferred currency based on order currency
      const orderCurrency = form.getValues('currency');
      const customerId = createdOrder.customerId || selectedCustomer?.id;
      if (customerId && orderCurrency) {
        try {
          await apiRequest('PATCH', `/api/customers/${customerId}`, { 
            preferredCurrency: orderCurrency 
          });
          queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
        } catch (err) {
          console.error('Failed to update customer preferred currency:', err);
        }
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

  // Update order mutation (for edit mode)
  const updateOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      // Check if we have a customer that needs to be saved (Tel or Msg types)
      if (selectedCustomer && selectedCustomer.needsSaving) {
        console.log('Creating new customer from quick form:', selectedCustomer);
        const customerData: any = {
          name: selectedCustomer.name,
          phone: selectedCustomer.shippingTel || undefined,
          email: selectedCustomer.email || undefined,
          type: selectedCustomer.type || 'regular',
        };

        if (selectedCustomer.socialMediaApp) {
          customerData.socialMediaApp = selectedCustomer.socialMediaApp;
        }

        const response = await apiRequest('POST', '/api/customers', customerData);
        const customerResponse = await response.json();
        data.customerId = customerResponse?.id;

        // Also create shipping address if one was added
        if (selectedShippingAddress && selectedShippingAddress.isNew) {
          const addressData = {
            customerId: customerResponse?.id,
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
          const addressResponse = await apiRequest('POST', `/api/customers/${customerResponse?.id}/shipping-addresses`, addressData);
          const createdAddress = await addressResponse.json();
          data.shippingAddressId = createdAddress?.id;
        }
      } else if (selectedCustomer && !selectedCustomer.id) {
        // Handle regular new customer creation
        const fullAddress = [selectedCustomer.shippingStreet, selectedCustomer.streetNumber]
          .filter(Boolean)
          .join(' ');
        
        const customerData = {
          name: selectedCustomer.name,
          facebookName: selectedCustomer.facebookName || undefined,
          facebookUrl: selectedCustomer.facebookUrl || undefined,
          profilePictureUrl: selectedCustomer.profilePictureUrl || undefined,
          email: selectedCustomer.email || undefined,
          phone: selectedCustomer.shippingTel || undefined,
          address: fullAddress || undefined,
          city: selectedCustomer.shippingCity || undefined,
          state: selectedCustomer.state || undefined,
          zipCode: selectedCustomer.shippingZipCode || undefined,
          country: selectedCustomer.shippingCountry || undefined,
          company: selectedCustomer.company || undefined,
          type: selectedCustomer.type || 'regular',
        };
        const response = await apiRequest('POST', '/api/customers', customerData);
        const customerResponse = await response.json();
        data.customerId = customerResponse?.id;
      } else if (selectedCustomer?.id && !selectedCustomer.id.startsWith('temp-')) {
        data.customerId = selectedCustomer.id;
        
        // Handle creating new shipping address for existing customer
        if (selectedShippingAddress && selectedShippingAddress.isNew) {
          const addressData = {
            customerId: selectedCustomer.id,
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
          const addressResponse = await apiRequest('POST', `/api/customers/${selectedCustomer.id}/shipping-addresses`, addressData);
          const createdAddress = await addressResponse.json();
          data.shippingAddressId = createdAddress?.id;
        }
      } else if (selectedCustomer && selectedCustomer.isTemporary) {
        data.temporaryCustomerName = selectedCustomer.name;
        data.customerId = null;
      }

      // Convert taxRate from percentage to decimal
      const convertedData = {
        ...data,
        taxRate: data.taxRate ? parseFloat(data.taxRate) / 100 : undefined,
      };

      const response = await apiRequest('PATCH', `/api/orders/${editOrderId}`, convertedData);
      const updatedOrder = await response.json();
      return updatedOrder;
    },
    onSuccess: async () => {
      // Update customer's preferred currency based on order currency
      const orderCurrency = form.getValues('currency');
      const customerId = selectedCustomer?.id;
      if (customerId && orderCurrency) {
        try {
          await apiRequest('PATCH', `/api/customers/${customerId}`, { 
            preferredCurrency: orderCurrency 
          });
          queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
        } catch (err) {
          console.error('Failed to update customer preferred currency:', err);
        }
      }
      
      toast({
        title: t('common:success'),
        description: t('orders:orderUpdatedSuccess'),
      });

      // Navigate to order details page
      window.location.href = `/orders/${editOrderId}`;
    },
    onError: (error) => {
      console.error("Order update error:", error);
      toast({
        title: t('common:error'),
        description: t('orders:failedToUpdateOrder'),
        variant: "destructive",
      });
    },
  });

  // Update customer mutation (for inline editing from order page)
  const updateCustomerMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; phone: string; email: string; company: string; preferredCurrency: string }) => {
      const response = await apiRequest('PATCH', `/api/customers/${data.id}`, {
        name: data.name,
        phone: data.phone || undefined,
        email: data.email || undefined,
        shippingCompany: data.company || undefined,
        preferredCurrency: data.preferredCurrency,
      });
      return response.json();
    },
    onSuccess: (updatedCustomer) => {
      setSelectedCustomer((prev: any) => ({
        ...prev,
        name: updatedCustomer.name,
        phone: updatedCustomer.phone,
        email: updatedCustomer.email,
        shippingTel: updatedCustomer.phone,
        shippingEmail: updatedCustomer.email,
        shippingCompany: updatedCustomer.shippingCompany,
        company: updatedCustomer.shippingCompany,
        preferredCurrency: updatedCustomer.preferredCurrency,
      }));
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      setShowEditCustomerDialog(false);
      toast({
        title: t('common:success'),
        description: t('common:updateSuccess'),
      });
    },
    onError: (error) => {
      console.error("Customer update error:", error);
      toast({
        title: t('common:error'),
        description: t('common:updateFailed'),
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
      const countryInput = selectedCustomer.shippingCountry.trim();
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
      
      console.log(`Packing optimization: Mapped customer country "${selectedCustomer.shippingCountry}" to ISO code "${shippingCountry}"`);
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

  // Auto-fill shipping costs when packing plan updates (only when AI is enabled and not manually edited)
  useEffect(() => {
    // Skip if user manually edited shipping cost
    if (shippingCostManuallyEditedRef.current) return;
    
    if (aiCartonPackingEnabled && packingPlan?.estimatedShippingCost !== undefined && packingPlan?.estimatedShippingCost !== null) {
      const orderCurrency = (form.getValues('currency') || 'EUR') as Currency;
      const shippingCurrency = (packingPlan.shippingCurrency || 'EUR') as Currency;
      
      // Convert shipping cost to order currency if different
      let convertedShippingCost = packingPlan.estimatedShippingCost;
      if (shippingCurrency !== orderCurrency) {
        convertedShippingCost = convertCurrency(packingPlan.estimatedShippingCost, shippingCurrency, orderCurrency);
      }
      
      const finalCost = Math.round(convertedShippingCost * 100) / 100;
      form.setValue('shippingCost', finalCost);
      form.setValue('actualShippingCost', finalCost); // Both fields use order currency for consistency
    }
  }, [packingPlan, form, aiCartonPackingEnabled]);

  // Open quick quantity modal for fast product addition
  const openQuickQuantityModal = (product: any) => {
    setQuickQuantityProduct(product);
    setQuickQuantityValue("1");
    setShowQuickQuantityModal(true);
    setProductSearch("");
    setShowProductDropdown(false);
    // Auto-focus the quantity input after modal opens
    setTimeout(() => {
      quickQuantityInputRef.current?.focus();
      quickQuantityInputRef.current?.select();
    }, 50);
  };

  // Handle confirming the quick quantity and adding product
  const handleQuickQuantityConfirm = async () => {
    if (!quickQuantityProduct) return;
    
    const qty = parseInt(quickQuantityValue) || 1;
    if (qty <= 0) return;
    
    // Add the product with the specified quantity
    await addProductToOrderWithQuantity(quickQuantityProduct, qty);
    
    // Close modal and reset
    setShowQuickQuantityModal(false);
    setQuickQuantityProduct(null);
    setQuickQuantityValue("1");
  };

  // Add product with specific quantity (used by quick quantity modal)
  const addProductToOrderWithQuantity = async (product: any, quantity: number, skipStockCheck: boolean = false) => {
    // For products with variants, always use the variant dialog
    try {
      const variantsResponse = await fetch(`/api/products/${product.id}/variants?_t=${Date.now()}`, {
        cache: 'no-store'
      });
      if (variantsResponse.ok) {
        const variants = await variantsResponse.json();
        if (variants && variants.length > 0) {
          setSelectedProductForVariant(product);
          setProductVariants(variants);
          setVariantQuantities({});
          setShowVariantDialog(true);
          setShowQuickQuantityModal(false);
          return;
        }
      }
    } catch (error) {
      console.error('Error fetching variants:', error);
    }

    // Check if product already exists in order (by productId, not bundleId/variant)
    const existingItemIndex = orderItems.findIndex(item => 
      item.productId === product.id && !item.bundleId && !item.variantId
    );

    if (existingItemIndex >= 0) {
      // Product exists - increment quantity
      setOrderItems(items => 
        items.map((item, idx) => {
          if (idx === existingItemIndex) {
            const newQty = item.quantity + quantity;
            const newTotal = (item.price * newQty) - item.discount + item.tax;
            return { ...item, quantity: newQty, total: newTotal };
          }
          return item;
        })
      );
    } else {
      // Product doesn't exist - use addProductToOrder and pass quantity via a ref
      // Store the desired quantity so we can apply it after the item is added
      pendingQuantityRef.current = quantity;
      await addProductToOrder(product, skipStockCheck);
      pendingQuantityRef.current = 1; // Reset
    }
  };
  
  // Ref to track pending quantity for addProductToOrderWithQuantity
  const pendingQuantityRef = useRef<number>(1);

  const addProductToOrder = async (product: any, skipStockCheck: boolean = false) => {
    // Check if this is a service
    if (product.isService) {
      // Always add as a new line (even if service already exists)
      const selectedCurrency = form.watch('currency') || 'EUR';
      const serviceCurrency = (product.currency || 'EUR') as Currency;
      const rawServicePrice = parseFloat(product.totalCost || '0');
      
      // Try to get the direct currency price from service type settings
      let servicePrice: number;
      const serviceTypeName = product.name?.replace('Service Fee: ', '') || product.name;
      const matchingServiceType = serviceSettings?.serviceTypes?.find(
        (st: any) => st.name === serviceTypeName || st.name === product.name
      );
      
      if (matchingServiceType) {
        // Use the direct currency price from service type settings
        servicePrice = selectedCurrency === 'CZK' 
          ? (matchingServiceType.costCzk || 0)
          : (matchingServiceType.costEur || 0);
      } else {
        // Fall back to converting from the stored service price
        servicePrice = convertCurrency(rawServicePrice, serviceCurrency, selectedCurrency as Currency);
      }
      
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
        // Add cache-busting to get fresh allocation data
        const variantsResponse = await fetch(`/api/products/${product.id}/variants?_t=${Date.now()}`, {
          cache: 'no-store'
        });
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

      // Get current sale type for pricing decisions
      const currentSaleType = form.watch('saleType') || 'retail';
      
      // If no customer price found, use default product price (considering sale type)
      if (productPrice === 0) {
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
        const itemQuantity = pendingQuantityRef.current;
        const newItem: OrderItem = {
          id: Math.random().toString(36).substr(2, 9),
          productId: product.isBundle ? undefined : product.id,
          bundleId: product.isBundle ? product.id : undefined,
          productName: product.name,
          sku: product.sku,
          quantity: itemQuantity,
          price: 0,
          originalPrice: productPrice,
          discount: 0,
          discountPercentage: 0,
          tax: 0,
          total: 0,
          landingCost: null, // Cost is captured server-side with correct currency
          image: product.image || product.imageUrl || null,
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

        // Calculate retail and bulk prices for automatic price tier switching
        let retailPriceValue = 0;
        let bulkPriceValue = 0;
        
        if (selectedCurrency === 'CZK') {
          retailPriceValue = parseFloat(product.priceCzk || '0');
          bulkPriceValue = parseFloat(product.bulkPriceCzk || '0');
        } else if (selectedCurrency === 'EUR') {
          retailPriceValue = parseFloat(product.priceEur || '0');
          bulkPriceValue = parseFloat(product.bulkPriceEur || '0');
        } else {
          retailPriceValue = parseFloat(product.priceEur || product.priceCzk || '0');
          bulkPriceValue = parseFloat(product.bulkPriceEur || product.bulkPriceCzk || '0');
        }
        
        // Determine initial price tier based on current sale type
        const initialPriceTier = currentSaleType === 'wholesale' && bulkPriceValue > 0 ? 'bulk' : 'retail';
        
        // Use pending quantity from quick quantity modal, or default to 1
        const itemQuantity = pendingQuantityRef.current;
        const itemTotal = (productPrice * itemQuantity) - discountAmount;

        const newItem: OrderItem = {
          id: Math.random().toString(36).substr(2, 9),
          productId: product.isBundle ? undefined : product.id,
          bundleId: product.isBundle ? product.id : undefined,
          productName: product.name,
          sku: product.sku,
          quantity: itemQuantity,
          price: productPrice,
          discount: discountAmount,
          discountPercentage: discountPct,
          tax: 0,
          total: itemTotal,
          landingCost: null, // Cost is captured server-side with correct currency
          image: product.image || product.imageUrl || null,
          appliedDiscountId: discountId,
          appliedDiscountLabel: discountLabel || null,
          appliedDiscountType: discountType,
          appliedDiscountScope: discountScope,
          categoryId: productCategoryId,
          isFreeItem: false,
          // Virtual SKU fields
          isVirtual: Boolean(product.isVirtual),
          masterProductId: product.masterProductId || null,
          masterProductName: product.masterProductName || null,
          inventoryDeductionRatio: product.inventoryDeductionRatio ? parseFloat(String(product.inventoryDeductionRatio)) : null,
          // Product type for UI indicators
          productType: product.productType || 'standard',
          // Deprecated packaging unit fields
          bulkUnitQty: product.bulkUnitQty || null,
          bulkUnitName: product.bulkUnitName || null,
          priceTier: initialPriceTier,
          retailPrice: retailPriceValue,
          bulkPrice: bulkPriceValue,
          allowBulkSales: product.allowBulkSales || false,
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

  // Stock limit modal handlers for quantity updates
  const handleStockLimitForceAdd = useCallback(() => {
    if (pendingQuantityUpdate) {
      const { itemId, requestedQty } = pendingQuantityUpdate;
      // Force update with requested quantity, bypassing stock check
      setOrderItems(items =>
        items.map(item => {
          if (item.id === itemId) {
            const updatedItem = { ...item, quantity: requestedQty };
            // Recalculate totals
            if (updatedItem.discountPercentage > 0) {
              updatedItem.discount = (updatedItem.price * updatedItem.quantity * updatedItem.discountPercentage) / 100;
            }
            updatedItem.total = (updatedItem.price * updatedItem.quantity) - updatedItem.discount + updatedItem.tax;
            return updatedItem;
          }
          return item;
        })
      );
      setStockLimitModalOpen(false);
      setPendingQuantityUpdate(null);
    }
  }, [pendingQuantityUpdate]);

  const handleStockLimitFillRemaining = useCallback(() => {
    if (pendingQuantityUpdate) {
      const { itemId, availableStock } = pendingQuantityUpdate;
      if (availableStock > 0) {
        // Set quantity to available stock
        setOrderItems(items =>
          items.map(item => {
            if (item.id === itemId) {
              const updatedItem = { ...item, quantity: availableStock };
              // Recalculate totals
              if (updatedItem.discountPercentage > 0) {
                updatedItem.discount = (updatedItem.price * updatedItem.quantity * updatedItem.discountPercentage) / 100;
              }
              updatedItem.total = (updatedItem.price * updatedItem.quantity) - updatedItem.discount + updatedItem.tax;
              return updatedItem;
            }
            return item;
          })
        );
        toast({
          title: t('orders:quantityAdjusted'),
          description: t('orders:setToRemainingStock', { count: availableStock }),
        });
      }
      setStockLimitModalOpen(false);
      setPendingQuantityUpdate(null);
    }
  }, [pendingQuantityUpdate, t, toast]);

  const handleStockLimitCancel = useCallback(() => {
    setStockLimitModalOpen(false);
    setPendingQuantityUpdate(null);
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
      
      // Get variant's currency-matched import cost for profit calculation
      let variantLandingCost = 0;
      if (selectedCurrency === 'CZK' && variant.importCostCzk) {
        variantLandingCost = parseFloat(variant.importCostCzk);
      } else if (selectedCurrency === 'EUR' && variant.importCostEur) {
        variantLandingCost = parseFloat(variant.importCostEur);
      } else if (selectedCurrency === 'USD' && variant.importCostUsd) {
        variantLandingCost = parseFloat(variant.importCostUsd);
      } else if (selectedCurrency === 'VND' && variant.importCostVnd) {
        variantLandingCost = parseFloat(variant.importCostVnd);
      } else if (selectedCurrency === 'CNY' && variant.importCostCny) {
        variantLandingCost = parseFloat(variant.importCostCny);
      } else {
        // Fallback: use any available cost
        variantLandingCost = parseFloat(variant.importCostCzk || variant.importCostEur || variant.importCostUsd || variant.importCostVnd || variant.importCostCny || '0');
      }
      
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
            variantSku: variant.barcode || variant.sku || null,
            productName: `${selectedProductForVariant.name} - ${variant.name}`,
            sku: variant.barcode || variant.sku || selectedProductForVariant.sku,
            quantity: freeQty,
            price: 0,
            originalPrice: productPrice,
            discount: 0,
            discountPercentage: 0,
            tax: 0,
            total: 0,
            landingCost: variantLandingCost || null,
            image: variant.photo || selectedProductForVariant.image || null,
            appliedDiscountId: availableFreeSlot.discountId,
            appliedDiscountLabel: availableFreeSlot.discountName,
            appliedDiscountType: 'buy_x_get_y',
            appliedDiscountScope: 'specific_category',
            categoryId: productCategoryId,
            isFreeItem: true,
            availableQuantity: variant.availableQuantity ?? variant.quantity ?? 0,
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
            variantSku: variant.barcode || variant.sku || null,
            productName: `${selectedProductForVariant.name} - ${variant.name}`,
            sku: variant.barcode || variant.sku || selectedProductForVariant.sku,
            quantity: paidQty,
            price: productPrice,
            discount: discountAmount,
            discountPercentage: discountPct,
            tax: 0,
            total: productPrice * paidQty - discountAmount,
            landingCost: variantLandingCost || null,
            image: variant.photo || selectedProductForVariant.image || null,
            appliedDiscountId: discountId,
            appliedDiscountLabel: discountLabel || null,
            appliedDiscountType: discountType,
            appliedDiscountScope: discountScope,
            categoryId: productCategoryId,
            isFreeItem: false,
            availableQuantity: variant.availableQuantity ?? variant.quantity ?? 0,
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

        // Calculate retail and bulk prices for automatic price tier switching
        let retailPriceForVariant = 0;
        let bulkPriceForVariant = 0;
        
        if (selectedCurrency === 'CZK') {
          retailPriceForVariant = parseFloat(selectedProductForVariant.priceCzk || '0');
          bulkPriceForVariant = parseFloat(selectedProductForVariant.bulkPriceCzk || '0');
        } else if (selectedCurrency === 'EUR') {
          retailPriceForVariant = parseFloat(selectedProductForVariant.priceEur || '0');
          bulkPriceForVariant = parseFloat(selectedProductForVariant.bulkPriceEur || '0');
        } else {
          retailPriceForVariant = parseFloat(selectedProductForVariant.priceEur || selectedProductForVariant.priceCzk || '0');
          bulkPriceForVariant = parseFloat(selectedProductForVariant.bulkPriceEur || selectedProductForVariant.bulkPriceCzk || '0');
        }
        
        const variantPriceTier = currentSaleType === 'wholesale' && bulkPriceForVariant > 0 ? 'bulk' : 'retail';

        const newItem: OrderItem = {
          id: Math.random().toString(36).substr(2, 9),
          productId: selectedProductForVariant.id,
          variantId: variant.id,
          variantName: variant.name,
          variantSku: variant.barcode || variant.sku || null,
          productName: `${selectedProductForVariant.name} - ${variant.name}`,
          sku: variant.barcode || variant.sku || selectedProductForVariant.sku,
          quantity: quantity,
          price: productPrice,
          discount: discountAmount,
          discountPercentage: discountPct,
          tax: 0,
          total: productPrice * quantity - discountAmount,
          landingCost: variantLandingCost || null,
          image: variant.photo || selectedProductForVariant.image || null,
          appliedDiscountId: discountId,
          appliedDiscountLabel: discountLabel || null,
          appliedDiscountType: discountType,
          appliedDiscountScope: discountScope,
          categoryId: productCategoryId,
          isFreeItem: false,
          bulkUnitQty: selectedProductForVariant.bulkUnitQty || null,
          bulkUnitName: selectedProductForVariant.bulkUnitName || null,
          priceTier: variantPriceTier,
          retailPrice: retailPriceForVariant,
          bulkPrice: bulkPriceForVariant,
          allowBulkSales: selectedProductForVariant.allowBulkSales || false,
          availableQuantity: variant.availableQuantity ?? variant.quantity ?? 0,
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
              // For variants, use item's stored available quantity or product lookup
              baseStock = item.availableQuantity ?? item.stockQuantity ?? 0;
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
            
            // Check if exceeding available stock
            if (requestedQty > availableStock && !alwaysAllowOutOfStock) {
              // Show modal for user to decide
              setPendingQuantityUpdate({
                itemId: id,
                requestedQty,
                availableStock,
                productName: item.productName,
              });
              setStockLimitModalOpen(true);
              // Don't update yet - wait for user decision
              return item;
            }
          }
          
          const updatedItem = { ...item, [field]: finalValue };
          
          // Automatic price tier switching based on quantity threshold (tiered pricing)
          // Works when product has allowBulkSales enabled with bulkUnitQty threshold and prices set
          const hasBulkConfig = updatedItem.allowBulkSales && updatedItem.bulkUnitQty && updatedItem.bulkUnitQty > 0;
          const hasBulkPrice = updatedItem.bulkPrice && updatedItem.bulkPrice > 0;
          const hasRetailPrice = updatedItem.retailPrice && updatedItem.retailPrice > 0;
          
          if (field === 'quantity' && hasBulkConfig && (hasBulkPrice || hasRetailPrice)) {
            const newQuantity = typeof finalValue === 'number' ? finalValue : parseInt(finalValue || '1');
            const bulkThreshold = updatedItem.bulkUnitQty!; // Safe: hasBulkConfig checks this exists
            
            // Switch to bulk price when quantity meets threshold
            if (newQuantity >= bulkThreshold && hasBulkPrice) {
              if (updatedItem.priceTier !== 'bulk') {
                updatedItem.price = updatedItem.bulkPrice!;
                updatedItem.priceTier = 'bulk';
                // Show notification about price tier change (async, non-blocking)
                setTimeout(() => {
                  toast({
                    title: t('orders:bulkPriceApplied'),
                    description: t('orders:bulkPriceAppliedDesc', { 
                      qty: bulkThreshold, 
                      price: formatCurrency(updatedItem.bulkPrice!, form.watch('currency'))
                    }),
                  });
                }, 0);
              }
            }
            // Switch back to retail price when quantity drops below threshold
            else if (newQuantity < bulkThreshold && hasRetailPrice) {
              if (updatedItem.priceTier !== 'retail') {
                updatedItem.price = updatedItem.retailPrice!;
                updatedItem.priceTier = 'retail';
                // Show notification about price tier change (async, non-blocking)
                setTimeout(() => {
                  toast({
                    title: t('orders:retailPriceApplied'),
                    description: t('orders:retailPriceAppliedDesc', { 
                      price: formatCurrency(updatedItem.retailPrice!, form.watch('currency'))
                    }),
                  });
                }, 0);
              }
            }
          }
          
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
    const serviceCurrency = (service.currency || 'EUR') as Currency;
    const newItems: OrderItem[] = [];

    // Add service fee (labor cost) as an order item - convert to order currency if needed
    const rawServiceFee = parseFloat(service.serviceCost || '0');
    const serviceFee = convertCurrency(rawServiceFee, serviceCurrency, selectedCurrency as Currency);
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
    
    // Calculate store credit to apply based on user control
    const availableStoreCredit = selectedCustomer?.storeCredit ? parseFloat(selectedCustomer.storeCredit) : 0;
    // Only apply store credit if user has enabled it, and cap to available credit and order total
    const maxApplicableCredit = Math.min(availableStoreCredit, Math.max(0, totalBeforeStoreCredit));
    const storeCreditAppliedAmount = applyStoreCredit ? Math.min(storeCreditAmount, maxApplicableCredit) : 0;

    return {
      subtotal: rawSubtotal,
      discountAmount: actualDiscount,
      tax: calculated.taxAmount,
      taxAmount: calculated.taxAmount,
      availableStoreCredit: availableStoreCredit,
      maxApplicableCredit: maxApplicableCredit,
      storeCreditApplied: storeCreditAppliedAmount,
      grandTotal: totalBeforeStoreCredit - storeCreditAppliedAmount,
    };
  }, [orderItems, form.watch('currency'), form.watch('shippingCost'), form.watch('discountValue'), form.watch('discountType'), form.watch('adjustment'), form.watch('taxRate'), showTaxInvoice, financialHelpers, selectedCustomer, applyStoreCredit, storeCreditAmount]);

  // Legacy helper functions for backward compatibility
  const calculateSubtotal = () => totals.subtotal;
  const calculateTax = () => totals.taxAmount;
  const calculateGrandTotal = () => totals.grandTotal;

  // Group order items by parent product when there are more than 5 variants
  const VARIANT_GROUP_THRESHOLD = 1; // Group variants when 2+ of same parent (threshold is > 1)
  
  interface VariantGroup {
    parentProductId: string;
    parentProductName: string;
    parentImage: string | null;
    variants: OrderItem[];
    totalQuantity: number;
    totalPrice: number;
    totalLandingCost: number | null;
    averagePrice: number;
  }
  
  const { groupedItems, variantGroups } = useMemo(() => {
    // Group items by parent product ID (only those with variantId)
    const variantsByParent = new Map<string, OrderItem[]>();
    const nonVariantItems: OrderItem[] = [];
    
    orderItems.forEach(item => {
      if (item.variantId && item.productId) {
        const existing = variantsByParent.get(item.productId) || [];
        variantsByParent.set(item.productId, [...existing, item]);
      } else {
        nonVariantItems.push(item);
      }
    });
    
    // Build the grouped items array
    const result: (OrderItem | { isGroupHeader: true; group: VariantGroup })[] = [];
    const groups: VariantGroup[] = [];
    
    // First add non-variant items
    nonVariantItems.forEach(item => result.push(item));
    
    // Then process variant groups
    variantsByParent.forEach((variants, parentProductId) => {
      if (variants.length > VARIANT_GROUP_THRESHOLD) {
        // Create a group header
        const totalQuantity = variants.reduce((sum, v) => sum + v.quantity, 0);
        const totalPrice = variants.reduce((sum, v) => sum + v.total, 0);
        const totalLandingCost = variants.some(v => v.landingCost != null) 
          ? variants.reduce((sum, v) => sum + (v.landingCost || 0) * v.quantity, 0)
          : null;
        
        // Get the base product name (without variant suffix)
        const firstVariant = variants[0];
        const baseProductName = firstVariant.productName.replace(/\s*-\s*[^-]+$/, '');
        
        const group: VariantGroup = {
          parentProductId,
          parentProductName: baseProductName || firstVariant.productName,
          parentImage: firstVariant.image || null,
          variants,
          totalQuantity,
          totalPrice,
          totalLandingCost,
          averagePrice: totalQuantity > 0 ? totalPrice / totalQuantity : 0,
        };
        
        groups.push(group);
        result.push({ isGroupHeader: true, group });
      } else {
        // Add variants individually if less than threshold
        variants.forEach(item => result.push(item));
      }
    });
    
    return { groupedItems: result, variantGroups: groups };
  }, [orderItems]);
  
  // Toggle variant group expansion
  const toggleVariantGroup = useCallback((parentProductId: string) => {
    setExpandedVariantGroups(prev => {
      const next = new Set(prev);
      if (next.has(parentProductId)) {
        next.delete(parentProductId);
      } else {
        next.add(parentProductId);
      }
      return next;
    });
  }, []);
  
  // Remove all variants in a group
  const removeVariantGroup = useCallback((parentProductId: string) => {
    setOrderItems(items => items.filter(item => 
      !(item.variantId && item.productId === parentProductId)
    ));
  }, []);

  // Autofill all variants in a group with the first variant's price
  const autofillVariantGroupPrice = useCallback((parentProductId: string) => {
    setOrderItems(items => {
      // Find all variants for this parent product
      const groupVariants = items.filter(item => 
        item.variantId && item.productId === parentProductId
      );
      
      if (groupVariants.length < 2) return items;
      
      // Get the first variant's price
      const firstVariantPrice = groupVariants[0].price;
      
      // Update all variants with the first variant's price
      return items.map(item => {
        if (item.variantId && item.productId === parentProductId) {
          const total = (firstVariantPrice * item.quantity) - (item.discount || 0);
          return {
            ...item,
            price: firstVariantPrice,
            total
          };
        }
        return item;
      });
    });
  }, []);

  // Autofill all variants in a group with the first variant's quantity
  const autofillVariantGroupQuantity = useCallback((parentProductId: string) => {
    setOrderItems(items => {
      // Find all variants for this parent product
      const groupVariants = items.filter(item => 
        item.variantId && item.productId === parentProductId
      );
      
      if (groupVariants.length < 2) return items;
      
      // Get the first variant's quantity
      const firstVariantQuantity = groupVariants[0].quantity;
      
      // Update all variants with the first variant's quantity
      return items.map(item => {
        if (item.variantId && item.productId === parentProductId) {
          const total = (item.price * firstVariantQuantity) - (item.discount || 0);
          return {
            ...item,
            quantity: firstVariantQuantity,
            total
          };
        }
        return item;
      });
    });
  }, []);

  const onSubmit = async (data: z.infer<typeof addOrderSchema>) => {
    // Upload files first if there are any
    let uploadedFileUrls: { name: string; url: string; size: number }[] = [];
    if (uploadedFiles.length > 0) {
      try {
        const formData = new FormData();
        uploadedFiles.forEach(file => {
          formData.append('files', file);
        });
        
        const response = await fetch('/api/orders/documents/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });
        
        if (response.ok) {
          const result = await response.json();
          uploadedFileUrls = result.uploadedFiles || [];
        } else {
          console.error('Failed to upload documents');
          toast({
            title: t('common:error'),
            description: t('orders:failedToUploadDocuments'),
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Error uploading documents:', error);
      }
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
      ...(applyStoreCredit && totals.storeCreditApplied > 0 ? { storeCreditAdjustment: totals.storeCreditApplied.toString() } : {}),
      // PPL SMART pickup location data
      pickupLocationCode: selectedPickupLocation?.code || null,
      pickupLocationName: selectedPickupLocation?.name || null,
      pickupLocationAddress: selectedPickupLocation 
        ? `${selectedPickupLocation.street}, ${selectedPickupLocation.city} ${selectedPickupLocation.zipCode}`
        : null,
      items: orderItems.map(item => ({
        productId: item.productId,
        serviceId: item.serviceId,
        variantId: item.variantId || undefined,
        variantName: item.variantName || undefined,
        variantSku: item.variantSku || undefined,
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
        isFreeItem: item.isFreeItem || undefined,
      })),
      includedDocuments: {
        uploadedFiles: uploadedFileUrls,
        includeServiceBill: includeServiceBill,
        includePackingList: includePackingList,
      },
    };

    // Use appropriate mutation based on mode
    if (isEditMode) {
      updateOrderMutation.mutate(orderData);
    } else {
      createOrderMutation.mutate(orderData);
    }
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
  // Uses server-side search results as primary source, with client-side filtering as fallback
  const filteredCustomers = useMemo(() => {
    if (!debouncedCustomerSearch || debouncedCustomerSearch.length < 2) return [];

    // Use server-side search results if available (more reliable for Facebook URL matching)
    if (Array.isArray(searchedCustomers) && searchedCustomers.length > 0) {
      return searchedCustomers.slice(0, 8);
    }

    // Fall back to client-side filtering if allCustomers is available
    if (!Array.isArray(allCustomers)) return [];

    // Check if the search query is a Facebook URL
    const extractedFbId = extractFacebookId(debouncedCustomerSearch);
    
    if (extractedFbId) {
      // Search by facebookId, facebookName, or facebookUrl containing the extracted ID
      const exactMatches = allCustomers.filter((customer: any) => {
        if (customer.facebookId === extractedFbId) return true;
        if (customer.facebookName?.toLowerCase() === extractedFbId.toLowerCase()) return true;
        if (customer.facebookUrl && customer.facebookUrl.toLowerCase().includes(extractedFbId.toLowerCase())) return true;
        return false;
      });
      
      if (exactMatches.length > 0) {
        return exactMatches;
      }
    }
    
    // Also try searching by the full URL if no matches found with extracted ID
    if (debouncedCustomerSearch.includes('facebook.com')) {
      const urlMatches = allCustomers.filter((customer: any) => {
        if (!customer.facebookUrl) return false;
        const normalizedSearch = debouncedCustomerSearch.toLowerCase().replace(/\/+$/, '');
        const normalizedUrl = customer.facebookUrl.toLowerCase().replace(/\/+$/, '');
        return normalizedUrl === normalizedSearch || normalizedUrl.includes(normalizedSearch) || normalizedSearch.includes(normalizedUrl);
      });
      
      if (urlMatches.length > 0) {
        return urlMatches;
      }
    }

    const results = fuzzySearch(allCustomers, debouncedCustomerSearch, {
      fields: ['name', 'facebookName', 'email', 'phone', 'company', 'facebookId', 'facebookUrl'],
      threshold: 0.2,
      fuzzy: true,
      vietnameseNormalization: true,
    });

    return results.slice(0, 8).map(r => r.item);
  }, [allCustomers, searchedCustomers, debouncedCustomerSearch]);

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

    // Find all active Buy X Get Y discounts (category-scoped or product-scoped)
    const buyXGetYDiscounts = discounts.filter((d: any) => {
      // Check status is active
      if (d.status !== 'active') return false;
      // Must be buy_x_get_y type
      if (d.type !== 'buy_x_get_y') return false;
      // Must be category-scoped OR product-scoped
      const validScopes = ['specific_category', 'category', 'specific_product'];
      if (!validScopes.includes(d.applicationScope)) return false;
      // Category scope needs categoryId, product scope needs productId
      if ((d.applicationScope === 'specific_category' || d.applicationScope === 'category') && !d.categoryId) return false;
      if (d.applicationScope === 'specific_product' && !d.productId) return false;
      
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
      const productId = discount.productId?.toString() || null;
      const buyQty = discount.buyQuantity || 1;
      const getQty = discount.getQuantity || 1;
      const isProductScope = discount.applicationScope === 'specific_product';
      
      // Count paid items matching the discount scope (excluding free items)
      const paidItems = orderItems.filter(item => {
        if (item.isFreeItem) return false;
        if (isProductScope) {
          // For product-scoped discount, match by productId
          return item.productId === productId;
        } else {
          // For category-scoped discount, match by categoryId
          if (!item.categoryId) return false;
          return item.categoryId.toString() === categoryId;
        }
      });
      
      const totalPaidItems = paidItems.reduce((sum, item) => sum + item.quantity, 0);
      
      // Calculate free items earned
      const freeItemsEarned = Math.floor(totalPaidItems / buyQty) * getQty;
      
      // Count already assigned free items
      const assignedFreeItems = orderItems.filter(item => {
        if (!item.isFreeItem) return false;
        if (isProductScope) {
          return item.productId === productId && item.appliedDiscountId === discount.id;
        } else {
          if (!item.categoryId) return false;
          return item.categoryId.toString() === categoryId && item.appliedDiscountId === discount.id;
        }
      });
      
      const freeItemsAssigned = assignedFreeItems.reduce((sum, item) => sum + item.quantity, 0);
      const remainingFreeSlots = Math.max(0, freeItemsEarned - freeItemsAssigned);

      return {
        discountId: discount.id,
        discountName: discount.name,
        categoryId,
        categoryName: discount.categoryName || 'Category',
        productId,
        productName: discount.productName || 'Product',
        isProductScope,
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
  
  // Update paid items with buy_x_get_y discount info when allocations change
  useEffect(() => {
    if (buyXGetYAllocations.length === 0) return;
    
    setOrderItems(items => {
      let hasChanges = false;
      const updatedItems = items.map(item => {
        // Skip free items (they already have discount info)
        if (item.isFreeItem) return item;
        
        // Find if this item has an active buy_x_get_y allocation (by category OR by product)
        const allocation = buyXGetYAllocations.find(alloc => {
          if (alloc.freeItemsEarned === 0) return false;
          if (alloc.isProductScope) {
            // Product-scoped: match by productId
            return alloc.productId === item.productId;
          } else {
            // Category-scoped: match by categoryId
            if (!item.categoryId) return false;
            return alloc.categoryId === item.categoryId?.toString();
          }
        });
        
        if (allocation) {
          // Check if we need to update this item
          // Only apply label if item quantity >= buyQty (actually contributes to earning free items)
          const qualifiesForLabel = item.quantity >= allocation.buyQty;
          
          if (qualifiesForLabel) {
            if (item.appliedDiscountId !== allocation.discountId || 
                item.appliedDiscountType !== 'buy_x_get_y' ||
                item.appliedDiscountLabel !== allocation.discountName ||
                item.buyXGetYBuyQty !== allocation.buyQty) {
              hasChanges = true;
              return {
                ...item,
                appliedDiscountId: allocation.discountId,
                appliedDiscountType: 'buy_x_get_y',
                appliedDiscountLabel: allocation.discountName,
                appliedDiscountScope: allocation.isProductScope ? 'specific_product' : 'specific_category',
                buyXGetYBuyQty: allocation.buyQty,
                buyXGetYGetQty: allocation.getQty,
              };
            }
          } else {
            // Item doesn't have enough quantity to qualify - clear the label
            if (item.appliedDiscountType === 'buy_x_get_y') {
              hasChanges = true;
              return {
                ...item,
                appliedDiscountId: null,
                appliedDiscountType: null,
                appliedDiscountLabel: null,
                appliedDiscountScope: null,
                buyXGetYBuyQty: undefined,
                buyXGetYGetQty: undefined,
              };
            }
          }
        } else {
          // Remove buy_x_get_y discount info if no longer qualifying
          if (item.appliedDiscountType === 'buy_x_get_y') {
            hasChanges = true;
            return {
              ...item,
              appliedDiscountId: null,
              appliedDiscountType: null,
              appliedDiscountLabel: null,
              appliedDiscountScope: null,
              buyXGetYBuyQty: undefined,
              buyXGetYGetQty: undefined,
            };
          }
        }
        return item;
      });
      
      return hasChanges ? updatedItems : items;
    });
  }, [buyXGetYAllocations]);

  // Auto-manage free items for Buy X Get Y discounts
  // - For PRODUCT-scoped discounts: auto-add using the same product
  // - For CATEGORY-scoped discounts: auto-add using the first matching paid product from that category
  // - Automatically adjusts (adds/removes) free items when paid quantity changes
  useEffect(() => {
    if (buyXGetYAllocations.length === 0) return;
    
    setOrderItems(currentItems => {
      let itemsChanged = false;
      let updatedItems = [...currentItems];
      
      for (const alloc of buyXGetYAllocations) {
        // Find existing free items for this allocation
        const existingFreeItems = updatedItems.filter(item => {
          if (!item.isFreeItem || item.appliedDiscountId !== alloc.discountId) return false;
          if (alloc.isProductScope) {
            return item.productId === alloc.productId;
          } else {
            return item.categoryId?.toString() === alloc.categoryId;
          }
        });
        const currentFreeQty = existingFreeItems.reduce((sum, item) => sum + item.quantity, 0);
        const targetFreeQty = alloc.freeItemsEarned;
        
        if (currentFreeQty < targetFreeQty) {
          // Need to add more free items
          const qtyToAdd = targetFreeQty - currentFreeQty;
          
          // Find a paid item to use as template
          const templateItem = updatedItems.find(item => {
            if (item.isFreeItem) return false;
            if (alloc.isProductScope) {
              return item.productId === alloc.productId;
            } else {
              return item.categoryId?.toString() === alloc.categoryId;
            }
          });
          
          if (templateItem) {
            const freeItem: OrderItem = {
              id: Math.random().toString(36).substr(2, 9),
              productId: templateItem.productId,
              variantId: templateItem.variantId || undefined,
              variantName: templateItem.variantName || undefined,
              variantSku: templateItem.variantSku || undefined,
              productName: templateItem.productName,
              sku: templateItem.sku,
              quantity: qtyToAdd,
              price: 0,
              originalPrice: templateItem.price,
              discount: 0,
              discountPercentage: 0,
              tax: 0,
              total: 0,
              landingCost: templateItem.landingCost || null,
              image: templateItem.image || null,
              appliedDiscountId: alloc.discountId,
              appliedDiscountLabel: alloc.discountName,
              appliedDiscountType: 'buy_x_get_y',
              appliedDiscountScope: alloc.isProductScope ? 'specific_product' : 'specific_category',
              categoryId: templateItem.categoryId,
              isFreeItem: true,
              availableQuantity: templateItem.availableQuantity,
            };
            updatedItems.push(freeItem);
            itemsChanged = true;
          }
        } else if (currentFreeQty > targetFreeQty) {
          // Need to remove excess free items
          let qtyToRemove = currentFreeQty - targetFreeQty;
          
          // Remove from the end (most recently added)
          for (let i = updatedItems.length - 1; i >= 0 && qtyToRemove > 0; i--) {
            const item = updatedItems[i];
            const matchesAllocation = item.isFreeItem && item.appliedDiscountId === alloc.discountId && (
              alloc.isProductScope 
                ? item.productId === alloc.productId 
                : item.categoryId?.toString() === alloc.categoryId
            );
            
            if (matchesAllocation) {
              if (item.quantity <= qtyToRemove) {
                // Remove entire item
                qtyToRemove -= item.quantity;
                updatedItems.splice(i, 1);
                itemsChanged = true;
              } else {
                // Reduce quantity
                updatedItems[i] = { ...item, quantity: item.quantity - qtyToRemove };
                qtyToRemove = 0;
                itemsChanged = true;
              }
            }
          }
        }
      }
      
      return itemsChanged ? updatedItems : currentItems;
    });
  }, [buyXGetYAllocations]);

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
      <div className="p-3 sm:p-4 lg:p-6 pb-24 sm:pb-16 lg:pb-8 w-full">
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
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {isEditMode ? t('orders:editOrder') : t('orders:createNewOrder')}
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">{t('orders:addProductsConfigureDetails')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Real-time viewers indicator (edit mode only) */}
              {isEditMode && (
                <RealTimeViewers 
                  viewers={viewers} 
                  lockInfo={lockInfo} 
                  currentUserId={user?.id}
                  size="sm"
                />
              )}
              <Badge variant="outline" className={isEditMode ? "text-blue-600 border-blue-600 w-fit" : "text-green-600 border-green-600 w-fit"}>
                {isEditMode ? <Pencil className="h-3 w-3 mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                {isEditMode ? t('orders:editOrder') : t('orders:newOrder')}
              </Badge>
            </div>
          </div>
        </div>
        
        {/* Lock overlay when another user is editing */}
        {isEditMode && isLocked && lockInfo && (
          <LockOverlay lockInfo={lockInfo} />
        )}

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
                <Label className="text-xs sm:text-sm font-medium">{t('orders:quickCustomer')}</Label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 sm:gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex items-center justify-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs h-9 sm:h-8 px-1.5 sm:px-3 border-blue-300 text-blue-700 hover:bg-blue-50 min-w-0"
                    onClick={() => {
                      setShowNewCustomerForm(true);
                      setCustomerSearch("");
                    }}
                    data-testid="button-new-customer"
                  >
                    <UserPlus className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{t('orders:newCustomer')}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex items-center justify-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs h-9 sm:h-8 px-1.5 sm:px-3 min-w-0"
                    onClick={() => {
                      setQuickCustomerType('quick');
                      setQuickCustomerName("");
                    }}
                    data-testid="button-quick-temp-customer"
                  >
                    <User className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{t('orders:quickTemp')}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex items-center justify-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs h-9 sm:h-8 px-1.5 sm:px-3 min-w-0"
                    onClick={() => {
                      setQuickCustomerType('tel');
                      setQuickCustomerName("");
                      setQuickCustomerPhone("");
                      form.setValue('orderType', 'tel');
                    }}
                    data-testid="button-telephone-customer"
                  >
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{t('orders:telephoneCustomer')}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex items-center justify-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs h-9 sm:h-8 px-1.5 sm:px-3 min-w-0"
                    onClick={() => {
                      setQuickCustomerType('msg');
                      setQuickCustomerName("");
                      setQuickCustomerPhone("");
                      setQuickCustomerSocialApp('whatsapp');
                    }}
                    data-testid="button-messaging-customer"
                  >
                    <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{t('orders:messagingCustomer')}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex items-center justify-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs h-9 sm:h-8 px-1.5 sm:px-3 min-w-0"
                    onClick={() => {
                      setQuickCustomerType('custom');
                      setQuickCustomerName("");
                    }}
                    data-testid="button-custom-customer"
                  >
                    <Plus className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{t('orders:customCustomer')}</span>
                  </Button>
                </div>
                <Separator className="my-2 sm:my-3" />
              </div>
            )}

            {/* Quick Customer Forms */}
            {quickCustomerType && !selectedCustomer && (
              <div className="p-2.5 sm:p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg space-y-2.5 sm:space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-medium text-sm sm:text-base text-blue-900 dark:text-blue-300">
                    {quickCustomerType === 'quick' && t('orders:quickCustomerOneTime')}
                    {quickCustomerType === 'tel' && t('orders:telephoneOrder')}
                    {quickCustomerType === 'msg' && t('orders:socialMediaCustomer')}
                    {quickCustomerType === 'custom' && t('orders:customCustomerOneTime')}
                  </h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 shrink-0"
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
              
              {/* Customer validation error - inline */}
              {form.formState.errors.customerId && (
                <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {t('orders:fieldError_customerId_required')}
                </p>
              )}

              {/* Real-time dropdown for customers - Improved layout */}
              {showCustomerDropdown && filteredCustomers && filteredCustomers.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl bg-white dark:bg-slate-800 max-h-[400px] sm:max-h-[500px] overflow-y-auto z-50">
                  <div className="px-3 py-2 bg-slate-100 dark:bg-slate-700 border-b border-gray-200 dark:border-gray-600 text-xs text-slate-600 dark:text-slate-300 sticky top-0 z-10 font-medium">
                    {t('orders:customersFound', { count: filteredCustomers.length })}
                  </div>
                  {filteredCustomers.map((customer: any) => (
                    <div
                      key={customer.id}
                      className="p-3 hover:bg-blue-50 dark:hover:bg-slate-700/50 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors"
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setCustomerSearch(customer.name);
                        setShowCustomerDropdown(false);
                        form.setValue('customerId', customer.id);
                        if (customer.hasPayLaterBadge) {
                          form.setValue('paymentStatus', 'pay_later');
                        }
                        const customerCurrency = customer.preferredCurrency || 
                          (customer.shippingCountry ? getCurrencyByCountry(customer.shippingCountry) : null);
                        if (customerCurrency) {
                          form.setValue('currency', customerCurrency);
                        }
                        setTimeout(() => {
                          productSearchRef.current?.focus();
                        }, 100);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar with country flag overlay */}
                        <div className="relative flex-shrink-0">
                          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                            {customer.profilePictureUrl ? (
                              <img 
                                src={customer.profilePictureUrl} 
                                alt={customer.name}
                                className="w-11 h-11 rounded-full object-cover"
                              />
                            ) : (
                              customer.name?.charAt(0)?.toUpperCase() || '?'
                            )}
                          </div>
                          {customer.shippingCountry && (
                            <span className="absolute -bottom-0.5 -right-0.5 text-sm bg-white dark:bg-slate-800 rounded-full p-0.5 shadow-sm">
                              {getCountryFlag(customer.shippingCountry)}
                            </span>
                          )}
                        </div>
                        
                        {/* Customer Info - Clean 3-row layout */}
                        <div className="flex-1 min-w-0">
                          {/* Row 1: Name + User ID + Badges */}
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-semibold text-sm text-slate-900 dark:text-white truncate max-w-[180px]">
                              {customer.name}
                            </span>
                            {(customer.facebookId || customer.facebookName || customer.shippingTel) && (
                              <span className="text-xs text-slate-400 font-normal">
                                ({customer.facebookId || customer.facebookName || (customer.shippingTel?.startsWith('+') ? customer.shippingTel : '+' + customer.shippingTel)})
                              </span>
                            )}
                            {customer.hasPayLaterBadge && (
                              <Badge className="text-[10px] px-1.5 py-0 h-4 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-0">
                                Pay Later
                              </Badge>
                            )}
                            {customer.isVip && (
                              <Badge className="text-[10px] px-1.5 py-0 h-4 bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-0">
                                VIP
                              </Badge>
                            )}
                            {customer.isBlocked && (
                              <Badge className="text-[10px] px-1.5 py-0 h-4 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-0">
                                Blocked
                              </Badge>
                            )}
                            {customer.type && customer.type !== 'regular' && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 capitalize">
                                {customer.type}
                              </Badge>
                            )}
                            {customer.preferredCurrency && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-mono">
                                {customer.preferredCurrency}
                              </Badge>
                            )}
                          </div>
                          
                          {/* Row 2: Company & Location */}
                          <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 mb-1">
                            {customer.company && (
                              <span className="flex items-center gap-1">
                                <Building className="h-3 w-3 text-slate-400" />
                                <span className="truncate max-w-[120px]">{customer.company}</span>
                              </span>
                            )}
                            {(customer.shippingCity || customer.shippingCountry) && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-slate-400" />
                                <span className="truncate max-w-[150px]">
                                  {[customer.shippingCity, customer.shippingCountry].filter(Boolean).join(', ')}
                                </span>
                              </span>
                            )}
                          </div>
                          
                          {/* Row 3: Contact info */}
                          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                            {customer.shippingTel && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {customer.shippingTel}
                              </span>
                            )}
                            {customer.email && (
                              <span className="flex items-center gap-1 truncate max-w-[160px]">
                                <Mail className="h-3 w-3" />
                                {customer.email}
                              </span>
                            )}
                            {(customer.facebookName || customer.facebookUrl) && (
                              <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                </svg>
                                <span className="truncate max-w-[100px]">{customer.facebookName || 'Facebook'}</span>
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Right side: Order Stats */}
                        <div className="flex-shrink-0 text-right min-w-[70px]">
                          {customer.totalOrders > 0 ? (
                            <div className="space-y-0.5">
                              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                                {customer.totalOrders}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                orders
                              </div>
                              {customer.totalSpent && parseFloat(customer.totalSpent) > 0 && (
                                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                  {formatCurrency(parseFloat(customer.totalSpent), customer.preferredCurrency || 'EUR')}
                                </div>
                              )}
                              {customer.lastOrderDate && (
                                <div className="text-[10px] text-slate-400">
                                  {new Date(customer.lastOrderDate).toLocaleDateString('cs-CZ')}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-xs text-slate-400 dark:text-slate-500 italic">
                              New
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Loading state while searching or waiting for debounce */}
              {showCustomerDropdown && customerSearch.length >= 2 && (isSearchingCustomers || customerSearch !== debouncedCustomerSearch) && (!filteredCustomers || filteredCustomers.length === 0) && (
                <div className="absolute top-full left-0 right-0 mt-1 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-slate-800 shadow-lg p-4 text-center z-50">
                  <Loader2 className="h-5 w-5 mx-auto mb-2 animate-spin text-blue-500" />
                  <div className="text-sm text-slate-500 dark:text-slate-400">Searching customers...</div>
                </div>
              )}

              {/* No results message with Add new customer button */}
              {showCustomerDropdown && customerSearch.length >= 2 && !isSearchingCustomers && customerSearch === debouncedCustomerSearch && (!filteredCustomers || filteredCustomers.length === 0) && (
                <div className="absolute top-full left-0 right-0 mt-1 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-slate-800 shadow-lg p-3 sm:p-4 text-center text-slate-500 dark:text-slate-400 z-50">
                  <Search className="h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-1.5 sm:mb-2 text-slate-400 dark:text-slate-500" />
                  <div className="text-sm sm:text-base">No customers found for "{customerSearch}"</div>
                  <div className="text-[10px] sm:text-xs mt-1">Try searching by name, email, phone, Facebook name, or paste a Facebook URL</div>
                  
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
              <Card className="mt-3 sm:mt-4 border-2 border-green-500 dark:border-green-600 bg-white dark:bg-slate-800">
                <CardContent className="p-3 sm:p-6">
                  <div className="flex gap-2.5 sm:gap-4">
                    {/* Avatar Section */}
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white shadow-lg">
                        {selectedCustomer.profilePictureUrl ? (
                          <img 
                            src={selectedCustomer.profilePictureUrl} 
                            alt={selectedCustomer.name}
                            className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover"
                          />
                        ) : (
                          <User className="h-6 w-6 sm:h-8 sm:w-8" />
                        )}
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div className="flex-1 min-w-0">
                      {/* Name and Badges Row */}
                      <div className="flex items-start justify-between gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-0.5 sm:mb-1">
                            {/* Country Flag */}
                            {selectedCustomer.shippingCountry && (
                              <span className="text-base sm:text-xl">
                                {getCountryFlag(selectedCustomer.shippingCountry)}
                              </span>
                            )}
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {selectedCustomer.name}
                            </h3>
                            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 shrink-0" />
                          </div>
                          
                          {/* Customer Badges - Comprehensive badges like in orders table */}
                          {!selectedCustomer.id?.startsWith('temp-') && (
                            <CustomerBadges 
                              badges={selectedCustomer.badges}
                              customer={{
                                type: selectedCustomer.type,
                                totalSpent: selectedCustomer.totalSpent,
                                customerRank: selectedCustomer.customerRank,
                                country: selectedCustomer.shippingCountry,
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
                        
                        <div className="flex items-center gap-1.5">
                          {selectedCustomer.id && !selectedCustomer.id.startsWith('temp-') && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditCustomerForm({
                                  name: selectedCustomer.name || "",
                                  phone: selectedCustomer.shippingTel || selectedCustomer.phone || "",
                                  email: selectedCustomer.shippingEmail || selectedCustomer.email || "",
                                  company: selectedCustomer.shippingCompany || "",
                                  preferredCurrency: selectedCustomer.preferredCurrency || "EUR"
                                });
                                setShowEditCustomerDialog(true);
                              }}
                              className="flex-shrink-0 h-8 w-8 p-0"
                              title={t('customers:editCustomer')}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
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
                            className="flex-shrink-0 h-8 px-2 sm:px-3"
                          >
                            <X className="h-4 w-4 sm:mr-1" />
                            <span className="hidden sm:inline">Change</span>
                          </Button>
                        </div>
                      </div>

                      {/* Contact & Location Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 sm:gap-y-2 mt-2 sm:mt-3">
                        {/* Contact Info */}
                        {selectedCustomer.shippingTel && (
                          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                            <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-500 dark:text-slate-400 shrink-0" />
                            <span className="truncate">{selectedCustomer.shippingTel}</span>
                            {selectedCustomer.socialMediaApp && (
                              <Badge variant="secondary" className="text-[10px] sm:text-xs shrink-0">
                                {selectedCustomer.socialMediaApp}
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        {/* Location */}
                        {(selectedCustomer.shippingCity || selectedCustomer.shippingCountry) && (
                          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                            <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-500 dark:text-slate-400 shrink-0" />
                            <span className="truncate">
                              {[selectedCustomer.shippingCity, selectedCustomer.shippingCountry].filter(Boolean).join(', ')}
                            </span>
                          </div>
                        )}
                        
                        {/* Company */}
                        {selectedCustomer.company && (
                          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                            <Building className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-500 dark:text-slate-400 shrink-0" />
                            <span className="truncate">{selectedCustomer.company}</span>
                          </div>
                        )}
                      </div>

                      {/* Stats Row - Only show for existing customers with data */}
                      {!selectedCustomer.needsSaving && !selectedCustomer.isTemporary && (
                        <div className="flex items-center gap-3 sm:gap-4 mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-slate-200 dark:border-gray-700">
                          {selectedCustomer.totalOrders > 0 && (
                            <div className="flex items-center gap-1 sm:gap-1.5">
                              <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 dark:text-green-500" />
                              <span className="text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100">
                                {selectedCustomer.totalOrders}
                              </span>
                              <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">orders</span>
                            </div>
                          )}
                          
                          {selectedCustomer.totalSpent && parseFloat(selectedCustomer.totalSpent) > 0 && (
                            <div className="flex items-center gap-1 sm:gap-1.5">
                              <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600" />
                              <span className="text-xs sm:text-sm font-medium text-slate-900">
                                {formatCurrency(parseFloat(selectedCustomer.totalSpent), selectedCustomer.preferredCurrency || 'EUR')}
                              </span>
                              <span className="text-[10px] sm:text-xs text-slate-500 hidden sm:inline">total</span>
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
                    {watchedShippingMethod === 'Pickup' ? t('orders:pickup', 'Pickup') : 
                     watchedShippingMethod === 'Hand-Delivery' ? t('orders:handDelivery', 'Hand-Delivery') : 
                     t('shippingAddress')}
                  </CardTitle>
                  <CardDescription>
                    {watchedShippingMethod === 'Pickup' ? t('orders:pickupFromStore', 'Customer will pickup from store') :
                     watchedShippingMethod === 'Hand-Delivery' ? t('orders:deliveryLocationLabel', 'Delivery Location / Salon Name') :
                     t('selectOrAddShippingAddress')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3 space-y-3">
                  {/* Special handling for Pickup */}
                  {watchedShippingMethod === 'Pickup' ? (
                    <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/30 border-2 border-green-200 dark:border-green-800 rounded-lg">
                      <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0">
                        <Package className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="font-medium text-green-800 dark:text-green-200">{t('orders:pickupFromStore', 'Customer will pickup from store')}</p>
                        <p className="text-sm text-green-600 dark:text-green-400">{t('orders:noShippingRequired', 'No shipping address required')}</p>
                      </div>
                    </div>
                  ) : watchedShippingMethod === 'Hand-Delivery' ? (
                    /* Special handling for Hand-Delivery */
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                          <Truck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <p className="text-sm text-blue-700 dark:text-blue-300">{t('orders:handDeliveryInfo', 'Personal delivery to customer location')}</p>
                      </div>
                      <div>
                        <Label className="text-sm">{t('orders:deliveryLocationLabel', 'Delivery Location / Salon Name')}</Label>
                        <Input
                          value={handDeliveryLocation}
                          onChange={(e) => setHandDeliveryLocation(e.target.value)}
                          placeholder={t('orders:deliveryLocationPlaceholder', 'Enter salon name or address...')}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  ) : isLoadingShippingAddresses ? (
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
                                    <div className="mt-1">{address.street}{address.streetNumber ? ` ${address.streetNumber}` : ''}</div>
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
                                    const fullAddress = `${address.firstName} ${address.lastName}${address.company ? `\n${address.company}` : ''}\n${address.street}${address.streetNumber ? ` ${address.streetNumber}` : ''}\n${address.city}, ${address.zipCode}\n${address.country}${address.tel ? `\nTel: ${address.tel}` : ''}${address.email ? `\nEmail: ${address.email}` : ''}`;
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
                          className={`p-3 rounded-lg border ${
                            isApplied 
                              ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700' 
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                          }`}
                          data-testid={`pending-service-${service.id}`}
                        >
                          {/* Service Name & Applied Badge */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="font-medium text-slate-900 dark:text-slate-100">
                              {service.name}
                            </span>
                            {isApplied && (
                              <Badge variant="default" className="bg-green-600 dark:bg-green-700 text-white shrink-0">
                                <Check className="h-3 w-3 mr-1" />
                                {t('orders:applied')}
                              </Badge>
                            )}
                          </div>
                          
                          {/* Cost Breakdown - Grid on mobile */}
                          <div className="grid grid-cols-3 gap-2 text-sm mb-2">
                            <div>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400">{t('orders:laborFee')}</p>
                              <p className="font-medium text-slate-700 dark:text-slate-300">
                                {formatCurrency(parseFloat(service.serviceCost || '0'), service.currency || 'EUR')}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400">{t('orders:partsCost')}</p>
                              <p className="font-medium text-slate-700 dark:text-slate-300">
                                {formatCurrency(parseFloat(service.partsCost || '0'), service.currency || 'EUR')}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400">{t('common:total')}</p>
                              <p className="font-bold text-amber-600 dark:text-amber-400">
                                {formatCurrency(parseFloat(service.totalCost || '0'), service.currency || 'EUR')}
                              </p>
                            </div>
                          </div>
                          
                          {service.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 line-clamp-2">
                              {service.description}
                            </p>
                          )}
                          
                          {/* Action Button - Full width on mobile */}
                          <Button
                            type="button"
                            variant={isApplied ? "outline" : "default"}
                            size="sm"
                            className={`w-full h-10 ${
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

            {/* Unresolved Tickets Section - Information only with quick resolve */}
            {selectedCustomer && !selectedCustomer.isTemporary && !selectedCustomer.needsSaving && unresolvedTickets && unresolvedTickets.length > 0 && (
              <Card className="mt-4 border-2 border-orange-400 dark:border-orange-500 bg-orange-50/50 dark:bg-orange-900/20" data-testid="card-unresolved-tickets">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TicketCheck className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                      {t('common:openTickets')}
                    </h4>
                    <Badge variant="secondary" className="bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200">
                      {unresolvedTickets.length}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                    {t('orders:unresolvedTicketsDescription')}
                  </p>
                  <div className="space-y-2">
                    {unresolvedTickets.map((ticket: any) => (
                      <div 
                        key={ticket.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                        data-testid={`ticket-${ticket.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                              {ticket.ticketId}
                            </span>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                ticket.priority === 'urgent' ? 'border-red-500 text-red-600 dark:text-red-400' :
                                ticket.priority === 'high' ? 'border-orange-500 text-orange-600 dark:text-orange-400' :
                                ticket.priority === 'medium' ? 'border-yellow-500 text-yellow-600 dark:text-yellow-400' :
                                'border-slate-300 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {ticket.priority}
                            </Badge>
                            <Badge 
                              variant="secondary" 
                              className={`text-xs ${
                                ticket.status === 'in_progress' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' :
                                'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {ticket.status === 'in_progress' ? t('orders:inProgress') : t('orders:ticketOpen')}
                            </Badge>
                          </div>
                          <p className="font-medium text-slate-900 dark:text-slate-100 mt-1 truncate">
                            {ticket.title}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                            <span>{ticket.category}</span>
                            {ticket.createdAt && (
                              <>
                                <span>•</span>
                                <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="ml-3 min-h-[44px]"
                          onClick={() => resolveTicketMutation.mutate(ticket.id)}
                          disabled={resolveTicketMutation.isPending}
                          data-testid={`button-resolve-ticket-${ticket.id}`}
                        >
                          {resolveTicketMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              {t('orders:markResolved')}
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
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
                        profilePictureUrl: "",
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

                {/* Facebook URL First - Auto-fills name and profile picture */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="facebookUrl" className="flex items-center gap-2">
                      <SiFacebook className="h-4 w-4 text-blue-600" />
                      {t('orders:facebookUrl')}
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      {t('orders:pasteUrlToAutoFill')}
                    </p>
                    <div className="relative">
                      <Input
                        id="facebookUrl"
                        value={newCustomer.facebookUrl}
                        onChange={(e) => setNewCustomer({ ...newCustomer, facebookUrl: e.target.value })}
                        onBlur={handleFacebookUrlBlur}
                        placeholder={t('orders:placeUrlOrType')}
                        className="pr-10"
                        autoFocus
                      />
                      {(isFetchingFacebookProfile || fetchFacebookProfileMutation.isPending) ? (
                        <div className="absolute right-1 top-1 h-8 w-8 p-0 flex items-center justify-center">
                          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        </div>
                      ) : (
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
                      )}
                    </div>
                    {/* Loading state indicator */}
                    {(isFetchingFacebookProfile || fetchFacebookProfileMutation.isPending) && (
                      <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t('customers:fetchingFacebookProfile')}
                      </div>
                    )}
                    {/* Profile Picture Preview and Refetch Button */}
                    {newCustomer.facebookUrl && !(isFetchingFacebookProfile || fetchFacebookProfileMutation.isPending) && (
                      <div className="flex items-center gap-2 mt-2">
                        {newCustomer.profilePictureUrl ? (
                          <img 
                            src={newCustomer.profilePictureUrl} 
                            alt="Profile" 
                            className="w-10 h-10 rounded-full object-cover border"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleRefetchFacebookProfile}
                          disabled={isFetchingFacebookProfile || fetchFacebookProfileMutation.isPending}
                        >
                          {(isFetchingFacebookProfile || fetchFacebookProfileMutation.isPending) ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              {t('customers:fetching')}
                            </>
                          ) : (
                            <>
                              <SiFacebook className="h-4 w-4 mr-2" />
                              {t('customers:refetchFromFacebook')}
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                    
                    {/* Duplicate Customer Warning */}
                    {duplicateCustomer && (
                      <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-amber-800 dark:text-amber-200 mb-1">
                              Customer already exists
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              {duplicateCustomer.profilePictureUrl ? (
                                <img 
                                  src={duplicateCustomer.profilePictureUrl} 
                                  alt={duplicateCustomer.name}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-amber-200 dark:bg-amber-700 flex items-center justify-center">
                                  <User className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                                </div>
                              )}
                              <div>
                                <div className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                                  {duplicateCustomer.name}
                                </div>
                                {duplicateCustomer.facebookName && (
                                  <div className="text-xs text-slate-500 dark:text-slate-400">
                                    Facebook: {duplicateCustomer.facebookName}
                                  </div>
                                )}
                              </div>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="default"
                              className="bg-amber-600 hover:bg-amber-700 text-white"
                              onClick={() => {
                                // Select this customer instead of creating new
                                setSelectedCustomer(duplicateCustomer);
                                setShowNewCustomerForm(false);
                                setDuplicateCustomer(null);
                                setNewCustomer({
                                  name: "",
                                  facebookName: "",
                                  facebookUrl: "",
                                  profilePictureUrl: "",
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
                                toast({
                                  title: "Customer selected",
                                  description: `Selected existing customer: ${duplicateCustomer.name}`,
                                });
                              }}
                            >
                              <UserCheck className="h-4 w-4 mr-2" />
                              Select Customer
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Checking duplicate indicator */}
                    {isCheckingDuplicate && (
                      <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Checking for existing customer...
                      </div>
                    )}
                  </div>
                </div>

                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      onBlur={(e) => {
                        const normalized = normalizeFullName(e.target.value);
                        if (normalized !== e.target.value) {
                          setNewCustomer(prev => ({
                            ...prev,
                            name: normalized,
                            facebookName: facebookNameManuallyEdited ? prev.facebookName : normalized
                          }));
                        }
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
                      onBlur={(e) => {
                        const normalized = normalizeFirstName(e.target.value);
                        if (normalized !== e.target.value) {
                          setNewCustomer(prev => ({ ...prev, firstName: normalized }));
                        }
                      }}
                      placeholder={t('orders:firstName')}
                      data-testid="input-firstName"
                    />
                  </div>
                  <div>
                    <Input
                      id="lastName"
                      value={newCustomer.lastName || ""}
                      onChange={(e) => setNewCustomer({ ...newCustomer, lastName: e.target.value })}
                      onBlur={(e) => {
                        const normalized = normalizeLastName(e.target.value);
                        if (normalized !== e.target.value) {
                          setNewCustomer(prev => ({ ...prev, lastName: normalized }));
                        }
                      }}
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
                      onBlur={(e) => {
                        const value = e.target.value;
                        if (!value) return;
                        
                        // Check if street contains a number (like "Potůčky 13")
                        const hasNumber = /\d/.test(value);
                        if (hasNumber) {
                          const parsed = parseAddressLine(value);
                          
                          // Update street and streetNumber
                          const updates: Partial<typeof newCustomer> = {
                            street: parsed.street || value,
                            streetNumber: parsed.streetNumber || newCustomer.streetNumber,
                          };
                          
                          // If city is empty but parsed from street (e.g., village name), auto-fill
                          if (!newCustomer.city && parsed.city) {
                            updates.city = parsed.city;
                          }
                          
                          // If zip/country parsed and currently empty, fill them
                          if (!newCustomer.zipCode && parsed.zipCode) {
                            updates.zipCode = parsed.zipCode;
                          }
                          if (!newCustomer.country && parsed.country) {
                            updates.country = parsed.country;
                          }
                          
                          setNewCustomer(prev => ({ ...prev, ...updates }));
                          
                          // Trigger geocoding if needed to fill missing zip/country
                          if (shouldFetchAddressDetails(parsed) && parsed.street) {
                            searchAddresses(`${parsed.street} ${parsed.streetNumber || ''} ${parsed.city || ''}`);
                          }
                        } else {
                          // Keep the street value as-is
                          if (value !== newCustomer.street) {
                            setNewCustomer(prev => ({ ...prev, street: value }));
                          }
                        }
                      }}
                      placeholder={t('orders:street')}
                    />
                  </div>
                  <div>
                    <Input
                      id="streetNumber"
                      value={newCustomer.streetNumber}
                      onChange={(e) => setNewCustomer({ ...newCustomer, streetNumber: e.target.value })}
                      onBlur={(e) => {
                        const normalized = e.target.value.toUpperCase().trim();
                        if (normalized !== e.target.value) {
                          setNewCustomer(prev => ({ ...prev, streetNumber: normalized }));
                        }
                      }}
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
                      onBlur={(e) => {
                        // Keep city value as-is
                        if (e.target.value !== newCustomer.city) {
                          setNewCustomer(prev => ({ ...prev, city: e.target.value }));
                        }
                      }}
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
                      // Map field names to what the mutation expects (shippingTel, shippingStreet, etc.)
                      setSelectedCustomer({
                        ...newCustomer,
                        // Map newCustomer fields to expected field names for the mutation
                        shippingTel: newCustomer.phone,
                        shippingStreet: newCustomer.street,
                        shippingCity: newCustomer.city,
                        shippingZipCode: newCustomer.zipCode,
                        shippingCountry: newCustomer.country,
                        id: undefined, // Explicitly set to undefined to trigger creation
                        // Don't set needsSaving - this allows the full customer creation path to be used
                      });
                      
                      // Set shipping address from the Customer Details form
                      // All address fields from AddOrder page are for shipping, not customer's default address
                      if (newCustomer.street || newCustomer.city || newCustomer.zipCode) {
                        setSelectedShippingAddress({
                          isNew: true,
                          firstName: newCustomer.firstName || '',
                          lastName: newCustomer.lastName || '',
                          company: newCustomer.company || '',
                          street: newCustomer.street || '',
                          streetNumber: newCustomer.streetNumber || '',
                          city: newCustomer.city || '',
                          zipCode: newCustomer.zipCode || '',
                          country: newCustomer.country || '',
                          tel: newCustomer.phone || '',
                          email: newCustomer.email || '',
                          label: 'Shipping Address'
                        });
                      }
                      
                      setShowNewCustomerForm(false);
                      // Set placeholder customerId to pass form validation - will be replaced with real ID in mutation
                      form.setValue('customerId', '__new__');
                      setCustomerSearch(newCustomer.name);
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
          <CardHeader className="p-2.5 md:p-3 border-b">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Package className="h-4 w-4 text-blue-600" />
              {t('orders:addProducts')}
            </CardTitle>
            <CardDescription className="text-xs mt-1 hidden sm:block">{t('orders:searchAddProducts')}</CardDescription>
          </CardHeader>
          <CardContent className="sticky top-0 z-40 p-2.5 md:p-3 space-y-2 md:space-y-3 bg-white dark:bg-slate-950 shadow-sm backdrop-blur-sm">
            <div className="relative product-search-container">
              <div className="flex items-center justify-between mb-1.5 md:mb-2">
                <Label htmlFor="product" className="text-sm">{t('orders:searchProducts')}</Label>
                <div className="flex items-center gap-1.5 md:gap-2">
                  <Button
                    type="button"
                    variant={barcodeScanMode ? "default" : "outline"}
                    size="sm"
                    className="h-7 md:h-6 text-xs px-2 min-w-[44px]"
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
                    <span className="hidden sm:inline">{barcodeScanMode ? t('orders:scanModeOn') : t('orders:scanModeOff')}</span>
                    <span className="sm:hidden">{barcodeScanMode ? 'ON' : 'OFF'}</span>
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
                          // Services and bundles add directly, products show quick quantity modal
                          if (selectedProduct.isService || selectedProduct.isBundle) {
                            addProductToOrder(selectedProduct);
                            if (!barcodeScanMode) {
                              setProductSearch('');
                              setShowProductDropdown(false);
                              setSelectedProductIndex(0);
                            }
                          } else {
                            openQuickQuantityModal(selectedProduct);
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
                <div className="absolute top-full left-0 right-0 mt-1 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg bg-white dark:bg-slate-800 max-h-[60vh] md:max-h-[70vh] overflow-y-auto z-50">
                  <div className="px-2 py-1 md:py-1.5 bg-slate-50 dark:bg-slate-700 border-b border-gray-200 dark:border-gray-700 text-xs text-slate-600 dark:text-slate-400 sticky top-0 z-10">
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
                        className={`w-full p-1.5 md:p-2 cursor-pointer border-b border-gray-200 dark:border-gray-700 last:border-b-0 transition-colors text-left min-h-[44px] ${
                          isKeyboardSelected ? 'bg-blue-50 dark:bg-blue-950 ring-2 ring-inset ring-blue-500' : 'hover:bg-blue-50 dark:hover:bg-slate-700'
                        } ${
                          isBestMatch ? 'bg-blue-100 dark:bg-blue-950 border-l-2 border-l-blue-500' : ''
                        }`}
                        onClick={() => {
                          // Services and bundles add directly, products show quick quantity modal
                          if (product.isService || product.isBundle) {
                            addProductToOrder(product);
                            setSelectedProductIndex(0);
                            setProductSearch('');
                            setShowProductDropdown(false);
                          } else {
                            openQuickQuantityModal(product);
                            setSelectedProductIndex(0);
                          }
                        }}
                        data-testid={`${isService ? 'service' : isBundle ? 'bundle' : 'product'}-item-${product.id}`}
                      >
                        <div className="flex items-center justify-between gap-1.5 md:gap-2">
                          <div className="flex items-center gap-1.5 md:gap-2 flex-1 min-w-0">
                            {/* Product Image - Smaller on mobile */}
                            {!isService && !isBundle && (
                              <div className="flex-shrink-0 relative">
                                {product.image ? (
                                  <img 
                                    src={product.image} 
                                    alt={product.name}
                                    className="w-8 h-8 md:w-10 md:h-10 object-contain rounded border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-slate-900"
                                  />
                                ) : (
                                  <div className="w-8 h-8 md:w-10 md:h-10 rounded border flex items-center justify-center bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-gray-700">
                                    <Package className="h-4 w-4 md:h-5 md:w-5 text-slate-300 dark:text-slate-600" />
                                  </div>
                                )}
                              </div>
                            )}
                            {/* Service Icon - Smaller on mobile */}
                            {isService && (
                              <div className="w-8 h-8 md:w-10 md:h-10 flex-shrink-0 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-gray-700 flex items-center justify-center">
                                <Wrench className="h-4 w-4 md:h-5 md:w-5 text-orange-500" />
                              </div>
                            )}
                            {/* Bundle Image - Show actual image or fallback icon */}
                            {isBundle && (
                              <div className="flex-shrink-0 relative">
                                {product.imageUrl ? (
                                  <img 
                                    src={product.imageUrl} 
                                    alt={product.name}
                                    className="w-8 h-8 md:w-10 md:h-10 object-contain rounded border border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/30"
                                  />
                                ) : (
                                  <div className="w-8 h-8 md:w-10 md:h-10 rounded border flex items-center justify-center bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-700">
                                    <Box className="h-4 w-4 md:h-5 md:w-5 text-purple-500" />
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-1 md:gap-1.5 mb-0.5">
                                <div className="font-medium text-xs md:text-sm text-slate-900 dark:text-slate-100 line-clamp-1 md:line-clamp-2 flex-1">{product.name}</div>
                              {isBestMatch && (
                                <Badge variant="default" className="text-[9px] md:text-[10px] px-1 py-0 bg-blue-600 flex-shrink-0 hidden sm:inline-flex">
                                  {t('orders:best')}
                                </Badge>
                              )}
                              {isService && (
                                <Badge variant="outline" className="text-[9px] md:text-[10px] px-1 py-0 border-orange-500 text-orange-600 flex-shrink-0">
                                  <span className="hidden sm:inline">{t('orders:service')}</span>
                                  <Wrench className="h-2.5 w-2.5 sm:hidden" />
                                </Badge>
                              )}
                              {isBundle && (
                                <Badge variant="outline" className="text-[9px] md:text-[10px] px-1 py-0 border-purple-500 text-purple-600 flex-shrink-0">
                                  <span className="hidden sm:inline">{t('orders:bundle')}</span>
                                  <Box className="h-2.5 w-2.5 sm:hidden" />
                                </Badge>
                              )}
                              {product.productType === 'virtual' && (
                                <Badge variant="outline" className="text-[9px] md:text-[10px] px-1 py-0 border-violet-500 text-violet-600 flex-shrink-0">
                                  <Cloud className="h-2.5 w-2.5 mr-0.5" />
                                  <span className="hidden sm:inline">{t('orders:virtualProduct')}</span>
                                </Badge>
                              )}
                              {product.productType === 'physical_no_quantity' && (
                                <Badge variant="outline" className="text-[9px] md:text-[10px] px-1 py-0 border-blue-500 text-blue-600 flex-shrink-0">
                                  <MapPin className="h-2.5 w-2.5 mr-0.5" />
                                  <span className="hidden sm:inline">{t('orders:noQtyProduct')}</span>
                                </Badge>
                              )}
                            </div>
                            <div className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 truncate">
                              {hasBulkUnits && `${product.bulkUnitQty}/${product.bulkUnitName}`}
                              {!isService && !isBundle && !hasBulkUnits && <span className="hidden sm:inline">SKU: </span>}{!isService && !isBundle && !hasBulkUnits && product.sku}
                              {isService && product.description && <span className="line-clamp-1">{product.description}</span>}
                              {isBundle && product.description && <span className="line-clamp-1">{product.description}</span>}
                            </div>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 ml-1 md:ml-2">
                            <div className="font-semibold text-xs md:text-sm text-slate-900 dark:text-slate-100">
                              {isService ? (
                                formatCurrency(parseFloat(product.totalCost || '0'), product.currency || form.watch('currency') || 'EUR')
                              ) : (
                                (() => {
                                  const selectedCurrency = form.watch('currency') || 'EUR';
                                  let price = 0;
                                  if (selectedCurrency === 'CZK' && product.priceCzk) {
                                    price = parseFloat(product.priceCzk);
                                  } else if (selectedCurrency === 'EUR' && product.priceEur) {
                                    price = parseFloat(product.priceEur);
                                  } else {
                                    price = parseFloat(product.priceEur || product.priceCzk || '0');
                                  }
                                  return formatCurrency(price, selectedCurrency);
                                })()
                              )}
                            </div>
                            {!isService && (
                              (() => {
                                // Check for virtual or physical_no_quantity product types - always show "Always Available"
                                const isNoQtyType = product.productType === 'virtual' || product.productType === 'physical_no_quantity';
                                if (isNoQtyType) {
                                  return (
                                    <div className="text-[10px] md:text-xs text-green-600 dark:text-green-400">
                                      <span className="hidden sm:inline">{t('orders:alwaysAvailable')}</span>
                                      <span className="sm:hidden">∞</span>
                                    </div>
                                  );
                                }
                                
                                // Calculate stock - use availableQuantity which accounts for allocations to other orders
                                const isVirtual = product.masterProductId && product.inventoryDeductionRatio;
                                let baseStock = 0;
                                if (isBundle) {
                                  baseStock = product.availableStock ?? 0;
                                } else if (isVirtual) {
                                  // Virtual product - use availableQuantity from API (already calculated from master)
                                  baseStock = product.availableQuantity ?? product.availableVirtualStock ?? 0;
                                } else {
                                  // Regular product - use availableQuantity from API (accounts for other orders)
                                  baseStock = product.availableQuantity ?? product.quantity ?? 0;
                                }
                                // Subtract quantity already in this order
                                const inOrder = isBundle 
                                  ? getQuantityInOrder(undefined, undefined, product.id)
                                  : getQuantityInOrder(product.productId || product.id, product.variantId);
                                const availableStock = Math.max(0, baseStock - inOrder);
                                const isLow = availableStock <= 0;
                                // Show allocated amount from other orders if any
                                const allocatedToOthers = product.allocatedQuantity ?? 0;
                                return (
                                  <div className={`text-[10px] md:text-xs ${isLow ? 'text-red-500 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
                                    <span className="hidden sm:inline">{isVirtual ? 'V.Stock: ' : 'Stock: '}</span>{availableStock}{allocatedToOthers > 0 && <span className="text-amber-600"> ({allocatedToOthers} pending)</span>}{inOrder > 0 && <span className="hidden md:inline text-blue-600"> +{inOrder} here</span>}
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
                        {groupedItems.map((entry, index) => {
                          if ('isGroupHeader' in entry) {
                            const group = entry.group;
                            const isExpanded = expandedVariantGroups.has(group.parentProductId);
                            return (
                              <Fragment key={`group-${group.parentProductId}`}>
                                {/* Variant Group Header Row */}
                                <TableRow 
                                  className="bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 cursor-pointer"
                                  onClick={() => toggleVariantGroup(group.parentProductId)}
                                  data-testid={`variant-group-${group.parentProductId}`}
                                >
                                  <TableCell className="py-3">
                                    <div className="flex items-start gap-3">
                                      <div className="flex-shrink-0 relative">
                                        {group.parentImage ? (
                                          <img 
                                            src={group.parentImage} 
                                            alt={group.parentProductName}
                                            className="w-12 h-12 object-contain rounded border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900"
                                          />
                                        ) : (
                                          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded border border-blue-200 dark:border-blue-700 flex items-center justify-center">
                                            <Package className="h-6 w-6 text-blue-500 dark:text-blue-400" />
                                          </div>
                                        )}
                                        <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white text-[10px] font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center">
                                          {group.variants.length}
                                        </div>
                                      </div>
                                      <div className="flex flex-col gap-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          {isExpanded ? (
                                            <ChevronDown className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                          ) : (
                                            <ChevronRight className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                          )}
                                          <span className="font-medium text-blue-900 dark:text-blue-100">
                                            {group.parentProductName}
                                          </span>
                                        </div>
                                        {/* Compact variant list: S1, S2x3, S5, ... */}
                                        <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                          {(() => {
                                            // Sort variants by name numerically
                                            const sortedVariants = [...group.variants].sort((a, b) => {
                                              const aNum = parseInt(a.variantName || '') || 999999;
                                              const bNum = parseInt(b.variantName || '') || 999999;
                                              return aNum - bNum;
                                            });
                                            // Format as "S1, S2x3, S5" (show quantity if > 1), skip empty names
                                            return sortedVariants
                                              .filter(v => v.variantName)
                                              .map(v => v.quantity > 1 ? `${v.variantName}×${v.quantity}` : v.variantName)
                                              .join(', ') || `${group.variants.length} items`;
                                          })()}
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                          <Badge className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-600">
                                            {group.variants.length} {t('orders:variants', 'variants')}
                                          </Badge>
                                          <span className="text-[10px] text-blue-500/70 dark:text-blue-400/70">
                                            {isExpanded ? '▼' : '▶'} {isExpanded ? t('orders:clickToCollapse', 'collapse') : t('orders:clickToExpand', 'expand')}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center align-middle">
                                    <span className="font-semibold text-blue-700 dark:text-blue-300">{group.totalQuantity}</span>
                                  </TableCell>
                                  <TableCell className="text-right align-middle">
                                    <div className="flex flex-col items-end gap-0.5">
                                      <span className="font-semibold text-blue-700 dark:text-blue-300">
                                        {formatCurrency(group.totalPrice, form.watch('currency'))}
                                      </span>
                                      <span className="text-xs text-blue-500 dark:text-blue-400">
                                        ~{formatCurrency(group.averagePrice, form.watch('currency'))}/{t('orders:each', 'each')}
                                      </span>
                                    </div>
                                  </TableCell>
                                  {showDiscountColumn && (
                                    <TableCell className="text-right align-middle">
                                      <span className="text-blue-500 dark:text-blue-400">-</span>
                                    </TableCell>
                                  )}
                                  {showVatColumn && (
                                    <TableCell className="text-right align-middle">
                                      <span className="text-blue-500 dark:text-blue-400">-</span>
                                    </TableCell>
                                  )}
                                  <TableCell className="text-center">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeVariantGroup(group.parentProductId);
                                      }}
                                      className="h-9 w-9 p-0 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                                      data-testid={`button-remove-group-${group.parentProductId}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                                {/* Expanded Variant Rows */}
                                {isExpanded && group.variants.map((item, variantIndex) => {
                                  const isLastVariant = variantIndex === group.variants.length - 1;
                                  return (
                                  <Fragment key={item.id}>
                                    <TableRow 
                                      className={`${item.isFreeItem 
                                        ? 'bg-green-50 dark:bg-green-950/30' 
                                        : 'bg-slate-50/50 dark:bg-slate-900/30'} border-l-4 ${isLastVariant ? 'border-l-blue-600 dark:border-l-blue-500 border-b-2 border-b-blue-300 dark:border-b-blue-700' : 'border-l-blue-400 dark:border-l-blue-600'}`}
                                      data-testid={`order-item-${item.id}`}
                                    >
                                      <TableCell className="py-2 pl-8">
                                        <div className="flex items-center gap-2">
                                          <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-1.5">
                                              <Badge className="text-xs px-1.5 py-0 bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700">
                                                {item.variantName}
                                              </Badge>
                                              {item.isFreeItem && (
                                                <Badge className="text-xs px-1.5 py-0 bg-green-100 text-green-700 border-green-300 dark:bg-green-900 dark:text-green-300 dark:border-green-600">
                                                  {t('orders:freeItem')}
                                                </Badge>
                                              )}
                                            </div>
                                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                              {item.sku ? `SKU: ${item.sku}` : ''}
                                            </span>
                                          </div>
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-center align-middle">
                                        <div className="flex items-center justify-center gap-1">
                                          <MathInput
                                            min={1}
                                            value={item.quantity}
                                            onChange={(val) => updateOrderItem(item.id, 'quantity', val)}
                                            isInteger={true}
                                            className="w-14 h-8 text-center text-sm"
                                            data-testid={`input-quantity-${item.id}`}
                                          />
                                          {variantIndex === 0 && group.variants.length > 1 && (
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => autofillVariantGroupQuantity(group.parentProductId)}
                                              className="h-7 w-7 p-0 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950 dark:hover:text-blue-400"
                                              data-testid={`button-autofill-qty-${group.parentProductId}`}
                                              title={t('orders:autofillQuantity', 'Fill all with this quantity')}
                                            >
                                              <Copy className="h-3.5 w-3.5" />
                                            </Button>
                                          )}
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-right align-middle">
                                        <div className="flex items-center justify-end gap-1">
                                          {item.isFreeItem ? (
                                            <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(0, form.watch('currency'))}</span>
                                          ) : (
                                            <MathInput
                                              min={0}
                                              step={0.01}
                                              value={item.price}
                                              onChange={(val) => updateOrderItem(item.id, 'price', val)}
                                              className="w-16 h-8 text-right text-sm"
                                              data-testid={`input-price-${item.id}`}
                                            />
                                          )}
                                          {variantIndex === 0 && group.variants.length > 1 && !item.isFreeItem && (
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => autofillVariantGroupPrice(group.parentProductId)}
                                              className="h-7 w-7 p-0 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950 dark:hover:text-blue-400"
                                              data-testid={`button-autofill-price-${group.parentProductId}`}
                                              title={t('orders:autofillPrice', 'Fill all with this price')}
                                            >
                                              <Copy className="h-3.5 w-3.5" />
                                            </Button>
                                          )}
                                        </div>
                                      </TableCell>
                                      {showDiscountColumn && (
                                        <TableCell className="text-right align-middle">
                                          <div className="flex items-center justify-end gap-1">
                                            <MathInput
                                              min={0}
                                              max={100}
                                              step={1}
                                              value={item.discountPercentage}
                                              onChange={(val) => updateOrderItem(item.id, 'discountPercentage', val)}
                                              className="w-12 h-8 text-right text-sm"
                                              data-testid={`input-discount-${item.id}`}
                                            />
                                            <span className="text-xs text-muted-foreground">%</span>
                                          </div>
                                        </TableCell>
                                      )}
                                      {showVatColumn && (
                                        <TableCell className="text-right align-middle">
                                          <MathInput
                                            min={0}
                                            step={0.01}
                                            value={item.tax}
                                            onChange={(val) => updateOrderItem(item.id, 'tax', val)}
                                            className="w-14 h-8 text-right text-sm"
                                            data-testid={`input-vat-${item.id}`}
                                          />
                                        </TableCell>
                                      )}
                                      <TableCell className="text-center">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => removeOrderItem(item.id)}
                                          className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                                          data-testid={`button-remove-${item.id}`}
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  </Fragment>
                                  );
                                })}
                              </Fragment>
                            );
                          }
                          
                          // Regular item (non-grouped)
                          const item = entry as OrderItem;
                          return (
                          <Fragment key={item.id}>
                          <TableRow 
                            className={item.isFreeItem 
                              ? 'bg-green-50 dark:bg-green-950/30' 
                              : (index % 2 === 0 ? 'bg-white dark:bg-slate-950' : 'bg-slate-50/50 dark:bg-slate-900/30')
                            }
                            data-testid={`order-item-${item.id}`}
                          >
                            <TableCell className="py-3">
                              <div className="flex items-start gap-3">
                                {/* Product Image or Gift Icon for free items */}
                                <div className="flex-shrink-0">
                                  {item.isFreeItem ? (
                                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded border border-green-200 dark:border-green-700 flex items-center justify-center">
                                      <Gift className="h-6 w-6 text-green-600 dark:text-green-400" />
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
                                    <span className={`font-medium ${item.isFreeItem ? 'text-green-800 dark:text-green-200' : 'text-slate-900 dark:text-slate-100'}`}>
                                      {item.productName}
                                    </span>
                                  </div>
                                  {/* Badges row - separate from product name for better alignment */}
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {item.isFreeItem && (
                                      <Badge className="text-xs px-1.5 py-0 bg-green-100 text-green-700 border-green-300 dark:bg-green-900 dark:text-green-300 dark:border-green-600">
                                        {t('orders:freeItem')}
                                      </Badge>
                                    )}
                                    {item.isVirtual && (
                                      <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                                        {t('orders:virtualSku.badge', 'Virtual')}
                                      </span>
                                    )}
                                    {item.productType === 'virtual' && !item.isVirtual && (
                                      <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-violet-400 text-violet-600 dark:text-violet-400">
                                        <Cloud className="h-2.5 w-2.5 mr-0.5" />
                                        {t('orders:virtualProduct')}
                                      </Badge>
                                    )}
                                    {item.productType === 'physical_no_quantity' && (
                                      <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-blue-400 text-blue-600 dark:text-blue-400">
                                        <MapPin className="h-2.5 w-2.5 mr-0.5" />
                                        {t('orders:noQtyProduct')}
                                      </Badge>
                                    )}
                                    {item.priceTier === 'bulk' && (
                                      <Badge className="text-xs px-1.5 py-0 bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900/50 dark:text-indigo-300 dark:border-indigo-600">
                                        <TrendingUp className="h-3 w-3 mr-0.5" />
                                        {t('orders:bulkPriceBadge')}
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
                                    {item.appliedDiscountLabel && !item.isFreeItem && (
                                      <Badge className="text-xs px-1.5 py-0 bg-green-100 text-green-700 border-green-300">
                                        {t('orders:offer')}: {item.appliedDiscountLabel}
                                      </Badge>
                                    )}
                                  </div>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  {item.serviceId ? t('orders:service') + ' ' + t('orders:item') : (item.sku ? `SKU: ${item.sku}` : '')}
                                </span>
                                {item.productType === 'virtual' && (
                                  <span className="text-[10px] text-violet-500 dark:text-violet-400 italic">
                                    {t('orders:virtualAutoComplete')}
                                  </span>
                                )}
                                {item.productType === 'physical_no_quantity' && (
                                  <span className="text-[10px] text-blue-500 dark:text-blue-400 italic">
                                    {t('orders:noQtyNotTracked')}
                                  </span>
                                )}
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
                              <div className="flex flex-col items-center gap-1">
                                <div className="flex items-center gap-1">
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
                          );
                        })}
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
                                    {alloc.isProductScope 
                                      ? t('orders:addSameProductForFree', { product: alloc.productName })
                                      : t('orders:addProductFromCategory', { category: alloc.categoryName })}
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
              
              {/* Order Summary Section - Desktop */}
              <div className="hidden md:block mt-6 pt-4 border-t-2 border-slate-200 dark:border-slate-700">
                <div className="flex justify-end">
                  <div className="w-full max-w-sm space-y-3">
                    {/* Subtotal */}
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600 dark:text-slate-400">{t('orders:subtotalColon')}</span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {formatCurrency(totals.subtotal, form.watch('currency'))}
                      </span>
                    </div>
                    
                    {/* Discount - only show if there's a discount */}
                    {(form.watch('discountValue') || 0) > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-green-600 dark:text-green-400">
                          {t('orders:discount')} {form.watch('discountType') === 'rate' ? `(${form.watch('discountValue')}%)` : ''}
                        </span>
                        <span className="font-medium text-green-600 dark:text-green-400">
                          -{formatCurrency(totals.discountAmount, form.watch('currency'))}
                        </span>
                      </div>
                    )}
                    
                    {/* Shipping */}
                    {(form.watch('shippingCost') || 0) > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-600 dark:text-slate-400">{t('orders:shipping')}</span>
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {formatCurrency(form.watch('shippingCost') || 0, form.watch('currency'))}
                        </span>
                      </div>
                    )}
                    
                    {/* Adjustment - only show if there's an adjustment */}
                    {(form.watch('adjustment') || 0) !== 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-600 dark:text-slate-400">{t('orders:adjustment')}</span>
                        <span className={`font-medium ${(form.watch('adjustment') || 0) >= 0 ? 'text-slate-900 dark:text-slate-100' : 'text-red-600 dark:text-red-400'}`}>
                          {(form.watch('adjustment') || 0) >= 0 ? '+' : ''}{formatCurrency(form.watch('adjustment') || 0, form.watch('currency'))}
                        </span>
                      </div>
                    )}
                    
                    {/* VAT/Tax - only show if tax invoice is enabled */}
                    {showTaxInvoice && (form.watch('taxRate') || 0) > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-600 dark:text-slate-400">
                          {t('orders:vat')} ({form.watch('taxRate')}%)
                        </span>
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {formatCurrency(totals.tax, form.watch('currency'))}
                        </span>
                      </div>
                    )}
                    
                    {/* Grand Total */}
                    <div className="flex justify-between items-center pt-3 border-t-2 border-slate-300 dark:border-slate-600">
                      <span className="text-base font-bold text-slate-900 dark:text-slate-100">{t('orders:grandTotal')}</span>
                      <span className="text-xl font-bold text-primary">
                        {formatCurrency(totals.grandTotal, form.watch('currency'))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Mobile Card View - Visible only on Mobile - Uses groupedItems for variant grouping */}
              <div className="md:hidden space-y-3">
                {groupedItems.map((entry, index) => {
                  // Variant Group Card
                  if ('isGroupHeader' in entry) {
                    const group = entry.group;
                    const isExpanded = expandedVariantGroups.has(group.parentProductId);
                    return (
                      <Card 
                        key={`mobile-group-${group.parentProductId}`}
                        className="overflow-hidden shadow-sm border-blue-200 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/30"
                        data-testid={`mobile-variant-group-${group.parentProductId}`}
                      >
                        <CardContent className="p-2.5">
                          {/* Group Header - Clickable */}
                          <div 
                            className="flex items-start gap-2 cursor-pointer"
                            onClick={() => toggleVariantGroup(group.parentProductId)}
                          >
                            <div className="flex-shrink-0 relative">
                              {group.parentImage ? (
                                <img 
                                  src={group.parentImage} 
                                  alt={group.parentProductName}
                                  className="w-14 h-14 object-contain rounded border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900"
                                />
                              ) : (
                                <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900 rounded border border-blue-200 dark:border-blue-700 flex items-center justify-center">
                                  <Package className="h-7 w-7 text-blue-500 dark:text-blue-400" />
                                </div>
                              )}
                              <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white text-[10px] font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center">
                                {group.variants.length}
                              </div>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                {isExpanded ? <ChevronDown className="h-4 w-4 text-blue-600" /> : <ChevronRight className="h-4 w-4 text-blue-600" />}
                                <h4 className="font-semibold text-sm leading-tight text-blue-900 dark:text-blue-100">
                                  {group.parentProductName}
                                </h4>
                              </div>
                              {/* Compact variant list: S1, S2x3, S5, ... */}
                              <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1 leading-snug">
                                {(() => {
                                  const sortedVariants = [...group.variants].sort((a, b) => {
                                    const aNum = parseInt(a.variantName || '') || 999999;
                                    const bNum = parseInt(b.variantName || '') || 999999;
                                    return aNum - bNum;
                                  });
                                  // Skip empty names, show fallback if all empty
                                  return sortedVariants
                                    .filter(v => v.variantName)
                                    .map(v => v.quantity > 1 ? `${v.variantName}×${v.quantity}` : v.variantName)
                                    .join(', ') || `${group.variants.length} items`;
                                })()}
                              </div>
                              <div className="flex items-center justify-between mt-1.5">
                                <Badge className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700 border-blue-300">
                                  {group.totalQuantity} {t('orders:items')}
                                </Badge>
                                <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                                  {formatCurrency(group.totalPrice, form.watch('currency'))}
                                </span>
                              </div>
                            </div>
                            
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeVariantGroup(group.parentProductId);
                              }}
                              className="h-8 w-8 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 flex-shrink-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          {/* Expanded Variants */}
                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700 space-y-2">
                              {group.variants.map((variantItem) => (
                                <div key={variantItem.id} className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-lg p-2">
                                  <Badge className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 border-blue-300 font-semibold min-w-[40px] text-center">
                                    {variantItem.variantName || '#'}
                                  </Badge>
                                  <MathInput
                                    min={1}
                                    value={variantItem.quantity}
                                    onChange={(val) => updateOrderItem(variantItem.id, 'quantity', val)}
                                    isInteger={true}
                                    className="h-8 w-16 text-sm text-center"
                                  />
                                  <span className="text-xs text-slate-500 flex-1">
                                    × {formatCurrency(variantItem.price, form.watch('currency'))}
                                  </span>
                                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    {formatCurrency(variantItem.total, form.watch('currency'))}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeOrderItem(variantItem.id)}
                                    className="h-7 w-7 text-red-500 hover:bg-red-50"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  }
                  
                  // Regular item (non-grouped)
                  const item = entry as OrderItem;
                  return (
                  <Card key={item.id} className={`overflow-hidden shadow-sm ${item.isFreeItem 
                    ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/30' 
                    : 'border-slate-200 dark:border-gray-700 bg-white dark:bg-slate-800'}`} 
                    data-testid={`mobile-order-item-${item.id}`}
                  >
                    <CardContent className="p-2.5">
                      <div className="flex items-start gap-2 mb-2">
                        {/* Product Image - Compact & Clickable */}
                        <div className="flex-shrink-0">
                          {item.isFreeItem ? (
                            <div className="w-14 h-14 bg-green-100 dark:bg-green-900/50 rounded border border-green-200 dark:border-green-700 flex items-center justify-center">
                              <Gift className="h-7 w-7 text-green-600 dark:text-green-400" />
                            </div>
                          ) : item.image ? (
                            <img 
                              src={item.image} 
                              alt={item.productName}
                              className="w-14 h-14 object-contain rounded border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-slate-900 cursor-pointer active:opacity-80"
                              onClick={() => setMobileImagePopup({ open: true, src: item.image!, alt: item.productName })}
                            />
                          ) : (
                            <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-gray-700 flex items-center justify-center">
                              <Package className="h-7 w-7 text-slate-300 dark:text-slate-600" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-1.5">
                            {item.serviceId && <Wrench className="h-3.5 w-3.5 text-orange-500 flex-shrink-0 mt-0.5" />}
                            <h4 className={`font-semibold text-sm leading-tight line-clamp-2 ${item.isFreeItem ? 'text-green-800 dark:text-green-200' : 'text-slate-900 dark:text-slate-100'}`}>
                              {item.productName}
                            </h4>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.isFreeItem && (
                              <Badge className="text-[10px] px-1 py-0 h-4 bg-green-100 text-green-700 border-green-300 dark:bg-green-900 dark:text-green-300 dark:border-green-600">
                                {t('orders:freeItem')}
                              </Badge>
                            )}
                            {item.isVirtual && (
                              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                                {t('orders:virtualSku.badge', 'Virtual')}
                              </span>
                            )}
                            {item.productType === 'virtual' && !item.isVirtual && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-violet-400 text-violet-600 dark:text-violet-400">
                                <Cloud className="h-2.5 w-2.5 mr-0.5" />
                                {t('orders:virtualProduct')}
                              </Badge>
                            )}
                            {item.productType === 'physical_no_quantity' && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-blue-400 text-blue-600 dark:text-blue-400">
                                <MapPin className="h-2.5 w-2.5 mr-0.5" />
                                {t('orders:noQtyProduct')}
                              </Badge>
                            )}
                            {item.variantName && (
                              <Badge className="text-[10px] px-1 py-0 h-4 bg-blue-100 text-blue-700 border-blue-300">
                                {item.variantName}
                              </Badge>
                            )}
                          </div>
                          {(item.serviceId || item.sku) && (
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {item.serviceId ? t('orders:service') : item.sku}
                            </p>
                          )}
                          {item.productType === 'virtual' && (
                            <p className="text-[9px] text-violet-500 dark:text-violet-400 italic">
                              {t('orders:virtualAutoComplete')}
                            </p>
                          )}
                          {item.productType === 'physical_no_quantity' && (
                            <p className="text-[9px] text-blue-500 dark:text-blue-400 italic">
                              {t('orders:noQtyNotTracked')}
                            </p>
                          )}
                        </div>
                        
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeOrderItem(item.id)}
                          className="h-8 w-8 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 dark:hover:text-red-400 flex-shrink-0 -mr-1"
                          data-testid={`mobile-button-remove-${item.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {/* Compact form fields */}
                      <div className="space-y-2">
                        {/* Quantity, Price & Total in one row */}
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label htmlFor={`mobile-qty-${item.id}`} className="text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                              {t('orders:qty')}
                            </Label>
                            <MathInput
                              id={`mobile-qty-${item.id}`}
                              min={1}
                              value={item.quantity}
                              onChange={(val) => updateOrderItem(item.id, 'quantity', val)}
                              isInteger={true}
                              className="h-9 text-sm"
                              data-testid={`mobile-input-quantity-${item.id}`}
                              onBlur={() => {
                                if (item.isFreeItem) {
                                  commitFreeItemQuantity(item.id, item.quantity);
                                }
                              }}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`mobile-price-${item.id}`} className="text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                              {t('orders:price')}
                            </Label>
                            {item.isFreeItem ? (
                              <div className="h-9 flex items-center">
                                <span className="text-sm font-bold text-green-600 dark:text-green-400">0</span>
                              </div>
                            ) : (
                              <MathInput
                                id={`mobile-price-${item.id}`}
                                min={0}
                                step={0.01}
                                value={item.price}
                                onChange={(val) => updateOrderItem(item.id, 'price', val)}
                                className="h-9 text-sm"
                                data-testid={`mobile-input-price-${item.id}`}
                              />
                            )}
                          </div>
                          <div>
                            <Label className="text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1 block text-right">
                              {t('orders:total')}
                            </Label>
                            <div className="h-9 flex items-center justify-end">
                              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                {formatCurrency(item.total, form.watch('currency'))}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Discount & VAT Row - Conditional */}
                        {(showDiscountColumn || showVatColumn) && (
                          <div className="grid grid-cols-2 gap-2">
                            {showDiscountColumn && (
                              <div>
                                <Label htmlFor={`mobile-discount-${item.id}`} className="text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                                  {t('orders:discountPercent', 'Discount')} %
                                </Label>
                                <div className="flex items-center gap-1">
                                  <MathInput
                                    id={`mobile-discount-${item.id}`}
                                    min={0}
                                    max={100}
                                    step={1}
                                    value={item.discountPercentage}
                                    onChange={(val) => updateOrderItem(item.id, 'discountPercentage', val)}
                                    className="h-9 text-sm flex-1"
                                    data-testid={`mobile-input-discount-${item.id}`}
                                  />
                                  {item.discount > 0 && (
                                    <span className="text-[10px] text-green-600 dark:text-green-400 whitespace-nowrap">
                                      -{formatCurrency(item.discount, form.watch('currency'))}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                            {showVatColumn && (
                              <div>
                                <Label htmlFor={`mobile-vat-${item.id}`} className="text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                                  VAT
                                </Label>
                                <MathInput
                                  id={`mobile-vat-${item.id}`}
                                  min={0}
                                  step={0.01}
                                  value={item.tax}
                                  onChange={(val) => updateOrderItem(item.id, 'tax', val)}
                                  className="h-9 text-sm"
                                  data-testid={`mobile-input-vat-${item.id}`}
                                />
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Collapsible Notes Section */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="w-full h-7 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 justify-start px-1"
                          onClick={() => setExpandedMobileNotes(prev => prev === item.id ? null : item.id)}
                        >
                          <MessageSquare className="h-3 w-3 mr-1.5" />
                          {item.notes ? t('orders:editNotes') : t('orders:addNotes')}
                          {item.notes && <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">1</Badge>}
                          {expandedMobileNotes === item.id ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
                        </Button>
                        
                        {expandedMobileNotes === item.id && (
                          <Textarea
                            id={`mobile-notes-${item.id}`}
                            placeholder={t('orders:addSpecialInstructions')}
                            value={item.notes || ''}
                            onChange={(e) => updateOrderItem(item.id, 'notes', e.target.value)}
                            className="min-h-[60px] text-sm resize-none"
                            data-testid={`mobile-textarea-notes-${item.id}`}
                          />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  );
                })}
                {/* Mobile Placeholder cards for available free slots - Compact */}
                {buyXGetYAllocations.filter(alloc => alloc.remainingFreeSlots > 0).map((alloc) => (
                  <Card key={`mobile-free-slot-${alloc.discountId}`} className="overflow-hidden shadow-sm border-2 border-dashed border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-950/20">
                    <CardContent className="p-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded border-2 border-dashed border-green-300 dark:border-green-700 flex items-center justify-center">
                            <Gift className="h-6 w-6 text-green-500 dark:text-green-400" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-green-700 dark:text-green-300 text-sm">
                            {t('orders:freeItemsAvailable', { count: alloc.remainingFreeSlots })}
                          </h4>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            <Badge className="text-[10px] px-1 py-0 h-4 bg-green-100 text-green-700 border-green-300 dark:bg-green-900 dark:text-green-300 dark:border-green-600">
                              {alloc.discountName}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-green-600 dark:text-green-400 mt-0.5 line-clamp-1">
                            {alloc.isProductScope 
                              ? t('orders:addSameProductForFree', { product: alloc.productName })
                              : t('orders:addProductFromCategory', { category: alloc.categoryName })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {/* Order Summary Section - Mobile - Compact layout */}
                <div className="md:hidden mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                  <div className="space-y-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg p-2.5">
                    {/* Subtotal */}
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-600 dark:text-slate-400">{t('orders:subtotalColon')}</span>
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                        {formatCurrency(totals.subtotal, form.watch('currency'))}
                      </span>
                    </div>
                    
                    {/* Discount - only show if there's a discount */}
                    {(form.watch('discountValue') || 0) > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-green-600 dark:text-green-400">
                          {t('orders:discount')} {form.watch('discountType') === 'rate' ? `(${form.watch('discountValue')}%)` : ''}
                        </span>
                        <span className="text-sm font-medium text-green-600 dark:text-green-400 tabular-nums">
                          -{formatCurrency(totals.discountAmount, form.watch('currency'))}
                        </span>
                      </div>
                    )}
                    
                    {/* Shipping */}
                    {(form.watch('shippingCost') || 0) > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-600 dark:text-slate-400">{t('orders:shipping')}</span>
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                          {formatCurrency(form.watch('shippingCost') || 0, form.watch('currency'))}
                        </span>
                      </div>
                    )}
                    
                    {/* Adjustment - only show if there's an adjustment */}
                    {(form.watch('adjustment') || 0) !== 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-600 dark:text-slate-400">{t('orders:adjustment')}</span>
                        <span className={`text-sm font-medium tabular-nums ${(form.watch('adjustment') || 0) >= 0 ? 'text-slate-900 dark:text-slate-100' : 'text-red-600 dark:text-red-400'}`}>
                          {(form.watch('adjustment') || 0) >= 0 ? '+' : ''}{formatCurrency(form.watch('adjustment') || 0, form.watch('currency'))}
                        </span>
                      </div>
                    )}
                    
                    {/* VAT/Tax - only show if tax invoice is enabled */}
                    {showTaxInvoice && (form.watch('taxRate') || 0) > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                          {t('orders:vat')} ({form.watch('taxRate')}%)
                        </span>
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                          {formatCurrency(totals.tax, form.watch('currency'))}
                        </span>
                      </div>
                    )}
                    
                    {/* Order Subtotal - Emphasized */}
                    <div className="flex justify-between items-center pt-2 mt-1 border-t border-slate-300 dark:border-slate-600">
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{t('orders:orderSubtotal')}</span>
                      <span className="text-lg font-bold text-primary tabular-nums">
                        {formatCurrency(totals.grandTotal, form.watch('currency'))}
                      </span>
                    </div>
                  </div>
                </div>
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
            onResetPacking={() => setPackingPlan(null)}
          />
        )}

        {/* Payment Details - Mobile Optimized */}
        <Card className="shadow-sm">
          <CardHeader className="p-2.5 sm:p-3 border-b">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <CreditCard className="h-4 w-4 text-blue-600" />
              {t('orders:paymentDetails')}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-0.5 sm:mt-1">{t('orders:configurePricing')}</CardDescription>
          </CardHeader>
          <CardContent className="p-2.5 sm:p-3 space-y-2.5 sm:space-y-3">
            {/* Shipping & Payment Methods */}
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <div>
                <Label htmlFor="shippingMethod" className="text-xs sm:text-sm">{t('orders:shippingMethod')}</Label>
                <Select value={watchedShippingMethod} onValueChange={(value) => form.setValue('shippingMethod', value as any)}>
                  <SelectTrigger className="mt-1 h-10 sm:h-9 text-sm">
                    <SelectValue placeholder={t('orders:selectShipping')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GLS DE">GLS DE</SelectItem>
                    <SelectItem value="PPL CZ">PPL CZ</SelectItem>
                    <SelectItem value="PPL CZ SMART">PPL CZ SMART (Výdejní místo)</SelectItem>
                    <SelectItem value="DHL DE">DHL DE</SelectItem>
                    <SelectItem value="DPD">DPD</SelectItem>
                    <SelectItem value="Pickup">{t('orders:pickup', 'Pickup')}</SelectItem>
                    <SelectItem value="Hand-Delivery">{t('orders:handDelivery', 'Hand-Delivery')}</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* PPL SMART Pickup Location Selector with Map Popup */}
                {watchedShippingMethod === 'PPL CZ SMART' && (
                  <div className="mt-2">
                    <Label className="text-xs sm:text-sm flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-orange-500" />
                      {t('orders:pickupLocation', 'Pickup Location')}
                    </Label>
                    
                    {/* Selected Pickup Location Display or Select Button */}
                    {selectedPickupLocation ? (
                      <div className="mt-1.5 p-2.5 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-md">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            <MapPin className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{selectedPickupLocation.name}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                {selectedPickupLocation.street}, {selectedPickupLocation.city} {selectedPickupLocation.zipCode}
                              </div>
                              <div className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">
                                {selectedPickupLocation.accessPointType === 'PARCEL_BOX' || selectedPickupLocation.type === 'ParcelBox' ? 'ParcelBox' : 'ParcelShop'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-100 dark:hover:bg-orange-900/30"
                              onClick={() => setShowPPLSmartPopup(true)}
                              data-testid="button-change-pickup-point"
                            >
                              {t('common:change', 'Change')}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                              onClick={() => setSelectedPickupLocation(null)}
                              data-testid="button-clear-pickup-point"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full mt-1.5 h-10 sm:h-9 border-2 border-dashed border-orange-300 dark:border-orange-700 hover:border-orange-400 dark:hover:border-orange-600 bg-orange-50/50 dark:bg-orange-950/20 hover:bg-orange-100/50 dark:hover:bg-orange-900/30 text-orange-600 dark:text-orange-400"
                        onClick={() => setShowPPLSmartPopup(true)}
                        data-testid="button-select-pickup-point"
                      >
                        <MapPin className="h-4 w-4 mr-2" />
                        {t('orders:selectPickupPointOnMap', 'Select Pickup Point on Map')}
                      </Button>
                    )}
                    
                    {/* PPL Smart Popup Modal */}
                    <PPLSmartPopup
                      open={showPPLSmartPopup}
                      onOpenChange={setShowPPLSmartPopup}
                      onSelectPickupPoint={(point) => {
                        setSelectedPickupLocation(point);
                        setShowPPLSmartPopup(false);
                      }}
                      customerAddress={selectedCustomer?.street || selectedShippingAddress?.street || form.watch('street')}
                      customerCity={selectedCustomer?.city || selectedShippingAddress?.city || form.watch('city')}
                      customerZipCode={selectedCustomer?.zipCode || selectedShippingAddress?.zipCode || form.watch('zipCode')}
                      language={localizationSettings?.language === 'cs' ? 'cs' : 'en'}
                    />
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="paymentMethod" className="text-xs sm:text-sm">{t('orders:paymentMethod')}</Label>
                <Select value={watchedPaymentMethod} onValueChange={(value) => form.setValue('paymentMethod', value as any)}>
                  <SelectTrigger className="mt-1 h-10 sm:h-9 text-sm">
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

            <Separator className="my-2.5 sm:my-4" />

            {/* Discount Toggle Button */}
            <div>
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 sm:h-12 text-sm sm:text-base border-2 border-dashed border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 transition-all duration-300"
                onClick={() => {
                  if (showDiscount) {
                    form.setValue('discountType', 'flat');
                    form.setValue('discountValue', 0);
                  }
                  setShowDiscount(!showDiscount);
                }}
              >
                <Percent className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
                {t('orders:addDiscount')}
                {showDiscount ? <ChevronUp className="h-4 w-4 ml-1.5 sm:ml-2" /> : <ChevronDown className="h-4 w-4 ml-1.5 sm:ml-2" />}
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
                      <DecimalInput
                        min="0"
                        placeholder={form.watch('discountType') === 'rate' ? '0-100' : '0'}
                        value={form.watch('discountValue') || 0}
                        onChange={(value) => form.setValue('discountValue', value)}
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

            <Separator className="my-2.5 sm:my-4" />

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="shippingCost" className="text-xs sm:text-sm">{t('orders:shippingCost')}</Label>
                <DecimalInput
                  value={form.watch('shippingCost') || 0}
                  onChange={(value) => {
                    shippingCostManuallyEditedRef.current = true;
                    form.setValue('shippingCost', value);
                  }}
                  onKeyDown={(e) => {
                    handleDecimalKeyDown(e);
                    if (e.key === 'Enter' || e.key === 'Tab') {
                      e.preventDefault();
                      submitButtonRef.current?.click();
                    }
                  }}
                  className="mt-1 h-10 sm:h-9"
                  data-testid="input-shipping-cost"
                />
                {/* Quick shipping cost buttons */}
                <div className="mt-1.5 sm:mt-2">
                  <div className="text-[10px] sm:text-xs text-gray-500 mb-1">{t('orders:quickSelect')}</div>
                  <div className="flex flex-wrap gap-1">
                    {form.watch('currency') === 'CZK' && [0, 100, 150, 250].map(amount => (
                      <Button
                        key={amount}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 sm:h-7 px-1.5 sm:px-2 text-[10px] sm:text-xs min-w-[44px]"
                        onClick={() => {
                          shippingCostManuallyEditedRef.current = true;
                          form.setValue('shippingCost', amount);
                        }}
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
                        className="h-7 sm:h-7 px-1.5 sm:px-2 text-[10px] sm:text-xs min-w-[44px]"
                        onClick={() => {
                          shippingCostManuallyEditedRef.current = true;
                          form.setValue('shippingCost', amount);
                        }}
                      >
                        {amount} EUR
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="actualShippingCost" className="text-xs sm:text-sm">{t('orders:actualShippingCost')}</Label>
                <DecimalInput
                  value={form.watch('actualShippingCost') || 0}
                  onChange={(value) => form.setValue('actualShippingCost', value)}
                  className="mt-1 h-10 sm:h-9"
                  data-testid="input-actual-shipping-cost"
                />
                <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1 hidden sm:block">{t('orders:realCostFromCarrier')}</p>
              </div>

              <div>
                <Label htmlFor="adjustment" className="text-xs sm:text-sm">{t('orders:adjustment')}</Label>
                <DecimalInput
                  value={form.watch('adjustment') || 0}
                  onChange={(value) => form.setValue('adjustment', value)}
                  className="mt-1 h-10 sm:h-9"
                  data-testid="input-adjustment"
                />
                <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1 hidden sm:block">{t('orders:roundingOrOtherAdjustments')}</p>
              </div>
            </div>

            <Separator className="my-2.5 sm:my-4" />

            {/* Dobírka (COD) Section - Only show for PPL CZ/DHL DE + COD (support both old and new carrier names) */}
            {(form.watch('shippingMethod') === 'PPL' || form.watch('shippingMethod') === 'PPL CZ' || form.watch('shippingMethod') === 'DHL' || form.watch('shippingMethod') === 'DHL DE') && form.watch('paymentMethod') === 'COD' && (
              <>
                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  <div>
                    <Label htmlFor="codAmount" className="text-xs sm:text-sm">
                      {form.watch('shippingMethod') === 'DHL DE' ? 'Nachnahme (COD)' : 'Dobírka Amount (COD)'}
                    </Label>
                    <DecimalInput
                      min="0"
                      placeholder="0.00"
                      value={form.watch('codAmount') || 0}
                      onChange={(value) => form.setValue('codAmount', value)}
                      className="mt-1 h-10 sm:h-9"
                      data-testid="input-dobirka-amount"
                    />
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1">{t('orders:cashOnDeliveryOptional')}</p>
                  </div>

                  <div>
                    <Label htmlFor="codCurrency" className="text-xs sm:text-sm">{t('orders:codCurrency')}</Label>
                    <Select 
                      value={form.watch('codCurrency') || (form.watch('shippingMethod') === 'DHL DE' ? 'EUR' : 'CZK')}
                      onValueChange={(value) => form.setValue('codCurrency', value as any)}
                    >
                      <SelectTrigger className="mt-1 h-10 sm:h-9" data-testid="select-dobirka-currency">
                        <SelectValue placeholder={t('orders:selectCurrency')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CZK">CZK</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1 hidden sm:block">{t('orders:currencyForCod')}</p>
                  </div>
                </div>

                <Separator className="my-2.5 sm:my-4" />
              </>
            )}

            <div>
              <Label htmlFor="notes" className="text-xs sm:text-sm">{t('orders:notes')}</Label>
              <Textarea
                {...form.register('notes')}
                placeholder={t('orders:additionalOrderNotes')}
                className="mt-1 min-h-[80px] sm:min-h-[100px] text-sm"
              />
            </div>

            {/* Tax Invoice Toggle Button */}
            <div className="pt-3 sm:pt-4 border-t dark:border-gray-700">
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 sm:h-12 text-sm sm:text-base border-2 border-dashed border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 transition-all duration-300"
                onClick={() => {
                  setShowTaxInvoice(!showTaxInvoice);
                  form.setValue('taxInvoiceEnabled', !showTaxInvoice);
                }}
              >
                <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
                {t('orders:addTaxInvoiceSection')}
                {showTaxInvoice ? <ChevronUp className="h-4 w-4 ml-1.5 sm:ml-2" /> : <ChevronDown className="h-4 w-4 ml-1.5 sm:ml-2" />}
              </Button>
            </div>

            {/* Tax Invoice Section with smooth transition */}
            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${
              showTaxInvoice ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
            }`}>
              {showTaxInvoice && (
                <div className="mt-3 sm:mt-4 p-2.5 sm:p-4 border-2 border-blue-100 dark:border-blue-800 rounded-lg bg-blue-50/30 dark:bg-blue-950/30 space-y-3 sm:space-y-4">
                  <div className="flex items-center gap-2 mb-2 sm:mb-4">
                    <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-xs sm:text-sm font-semibold text-blue-900 dark:text-blue-300">{t('orders:taxInvoiceInformation')}</h3>
                  </div>

                  {form.watch('currency') === 'CZK' && (
                    <div className="grid grid-cols-2 gap-2 sm:gap-4">
                      <div className="relative">
                        <Label htmlFor="ico" className="text-xs sm:text-sm">IČO</Label>
                        <div className="relative">
                          <Input
                            {...form.register('ico')}
                            placeholder={t('orders:companyIdentificationNumber')}
                            className="h-10 sm:h-9 text-sm pr-9"
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
                        <Label htmlFor="dic" className="text-xs sm:text-sm">DIČ</Label>
                        <div className="relative">
                          <Input
                            {...form.register('dic')}
                            placeholder={t('orders:taxIdentificationNumber')}
                            className="h-10 sm:h-9 text-sm pr-9"
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

                      <div className="col-span-2 relative">
                        <Label htmlFor="nameAndAddress" className="text-xs sm:text-sm">{t('orders:nameAndAddress')}</Label>
                        <div className="relative">
                          <Textarea
                            {...form.register('nameAndAddress')}
                            placeholder={t('orders:companyNameAndAddress')}
                            rows={2}
                            className="min-h-[60px] sm:min-h-[80px] text-sm pr-9"
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
                        <Label htmlFor="taxRate" className="text-xs sm:text-sm">Tax Rate (%)</Label>
                        <DecimalInput
                          max="100"
                          value={form.watch('taxRate') || 0}
                          onChange={(value) => form.setValue('taxRate', value)}
                          placeholder="21"
                          className="h-10 sm:h-9 text-sm"
                        />
                      </div>
                    </div>
                  )}

                  {form.watch('currency') === 'EUR' && (
                    <div className="grid grid-cols-2 gap-2 sm:gap-4">
                      <div className="relative">
                        <Label htmlFor="vatId" className="text-xs sm:text-sm">VAT ID (optional)</Label>
                        <div className="relative">
                          <Input
                            {...form.register('vatId')}
                            placeholder={t('orders:euVatIdNumber')}
                            className="h-10 sm:h-9 text-sm pr-9"
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
                        <Label htmlFor="country" className="text-xs sm:text-sm">Country</Label>
                        <div className="relative">
                          <Input
                            {...form.register('country')}
                            placeholder={t('orders:countryName')}
                            className="h-10 sm:h-9 text-sm pr-9"
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
                        <DecimalInput
                          max="100"
                          value={form.watch('taxRate') || 0}
                          onChange={(value) => form.setValue('taxRate', value)}
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
              {/* Include Packing List Checkbox */}
              <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-700 rounded-lg">
                <Checkbox
                  id="include-packing-list"
                  checked={includePackingList}
                  onCheckedChange={(checked) => setIncludePackingList(checked === true)}
                  className="border-blue-400 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                  data-testid="checkbox-include-packing-list"
                />
                <label
                  htmlFor="include-packing-list"
                  className="text-sm font-medium text-blue-800 dark:text-blue-300 cursor-pointer flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  {t('orders:includePackingList')}
                </label>
              </div>
              
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
                        const adjustmentValue = Number(form.watch('adjustment')) || 0;
                        return adjustmentValue !== 0 ? (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">{t('orders:adjustment')}:</span>
                            <span className={`font-medium ${adjustmentValue >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                              {adjustmentValue >= 0 ? '+' : ''}{formatCurrency(adjustmentValue, form.watch('currency'))}
                            </span>
                          </div>
                        ) : null;
                      })()}
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
                      {totals.availableStoreCredit > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={applyStoreCredit}
                                onChange={(e) => setApplyStoreCredit(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <CreditCard className="h-3 w-3" />
                              {t('orders:applyStoreCredit')}
                            </label>
                            <span className="text-xs text-gray-500">
                              {t('orders:storeCreditAvailable')}: {formatCurrency(totals.availableStoreCredit, form.watch('currency'))}
                            </span>
                          </div>
                          {applyStoreCredit && (
                            <div className="flex items-center justify-between pl-6">
                              <span className="text-sm text-gray-600">{t('orders:storeCreditAdjustment')}:</span>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min={0}
                                  max={selectedCustomer?.storeCredit || 0}
                                  step="0.01"
                                  value={storeCreditAmount}
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value) || 0;
                                    const maxCredit = selectedCustomer?.storeCredit || 0;
                                    setStoreCreditAmount(Math.min(value, maxCredit));
                                  }}
                                  className="w-24 h-7 text-sm text-right"
                                />
                                <span className="font-medium text-blue-600 w-20 text-right">
                                  -{formatCurrency(totals.storeCreditApplied, form.watch('currency'))}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="border-t pt-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold">{t('orders:grandTotalLabel')}</span>
                        <div className="flex items-center gap-1">
                          <Input
                            id="grandTotal"
                            type="text"
                            inputMode="decimal"
                            placeholder={t('orders:clickToEnter')}
                            value={isEditingGrandTotal ? grandTotalInput : (() => {
                              const total = calculateGrandTotal();
                              const currency = form.watch('currency');
                              const useNoDecimals = currency === 'CZK' && localizationSettings.numberFormatNoDecimals;
                              return useNoDecimals ? Math.round(total).toString() : total.toFixed(2);
                            })()}
                            onFocus={(e) => {
                              setIsEditingGrandTotal(true);
                              setGrandTotalInput(e.target.value);
                              e.target.select();
                            }}
                            onChange={(e) => {
                              setGrandTotalInput(e.target.value);
                            }}
                            onBlur={(e) => {
                              setIsEditingGrandTotal(false);
                              const desiredTotal = parseFloat(e.target.value.replace(',', '.'));
                              if (!isNaN(desiredTotal) && desiredTotal > 0) {
                                const subtotal = calculateSubtotal();
                                const tax = showTaxInvoice ? calculateTax() : 0;
                                const shippingValue = form.watch('shippingCost');
                                const shipping = typeof shippingValue === 'string' ? parseFloat(shippingValue || '0') : (shippingValue || 0);
                                const discountAmount = form.watch('discountType') === 'rate' 
                                  ? (subtotal * (Number(form.watch('discountValue')) || 0)) / 100
                                  : Number(form.watch('discountValue')) || 0;
                                
                                // Calculate needed adjustment: desired = subtotal + tax + shipping - discount + adjustment
                                const currentTotalWithoutAdjustment = subtotal + tax + shipping - discountAmount;
                                const neededAdjustment = desiredTotal - currentTotalWithoutAdjustment;
                                
                                form.setValue('adjustment', parseFloat(neededAdjustment.toFixed(2)));
                                
                                toast({
                                  title: t('orders:totalAdjusted'),
                                  description: t('orders:adjustmentAmount', { amount: formatCurrency(neededAdjustment, form.watch('currency')) }),
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

                    {/* Form Errors Summary - Always expanded with human-readable messages */}
                    {Object.keys(form.formState.errors).length > 0 && (
                      <Alert variant="destructive" className="mb-3">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-1 mt-1">
                            {Object.entries(form.formState.errors).map(([field, error]) => {
                              const errorMessage = error?.message?.toString() || '';
                              const isRequired = errorMessage.toLowerCase().includes('required') || errorMessage === '';
                              const errorType = isRequired ? 'required' : 'invalid';
                              const fieldKey = `fieldError_${field}_${errorType}` as const;
                              const humanMessage = t(`orders:${fieldKey}`, { defaultValue: '' }) || 
                                                   t(`orders:fieldError_${errorType}`, { defaultValue: errorMessage || t('orders:invalidValue') });
                              
                              return (
                                <div key={field} className="text-sm">
                                  {humanMessage}
                                </div>
                              );
                            })}
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="pt-2 sm:pt-3 space-y-2">
                      {orderId ? (
                        hasChangesAfterSave ? (
                          <>
                            <Button 
                              type="submit" 
                              className="w-full relative transition-all duration-200 ease-out min-h-[44px] text-sm sm:text-base" 
                              size="lg"
                              disabled={createOrderMutation.isPending}
                              data-testid="button-update-order"
                            >
                              {createOrderMutation.isPending ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4 mr-2" />
                              )}
                              <span className="transition-opacity duration-150">
                                {createOrderMutation.isPending ? t('orders:updatingOrder') : t('orders:updateOrder')}
                              </span>
                              {!createOrderMutation.isPending && (
                                <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5" aria-hidden="true">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
                                </span>
                              )}
                            </Button>
                            <Button 
                              type="button" 
                              variant="outline" 
                              className="w-full min-h-[44px] text-sm sm:text-base" 
                              onClick={() => setLocation(`/orders/${orderId}`)}
                            >
                              {t('orders:cancelChanges')}
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button 
                              type="button" 
                              className="w-full transition-all duration-200 ease-out min-h-[44px] text-sm sm:text-base" 
                              size="lg" 
                              onClick={() => setLocation(`/orders/${orderId}`)}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              {t('orders:viewOrder')}
                            </Button>
                            <Button 
                              type="button" 
                              variant="outline" 
                              className="w-full min-h-[44px] text-sm sm:text-base" 
                              onClick={() => setLocation('/orders')}
                            >
                              {t('orders:backToOrders')}
                            </Button>
                          </>
                        )
                      ) : (
                        <>
                          <Button ref={submitButtonRef} type="submit" className="w-full transition-all duration-200 ease-out min-h-[44px] text-sm sm:text-base" size="lg" disabled={createOrderMutation.isPending || orderItems.length === 0} data-testid="button-create-order">
                            {createOrderMutation.isPending ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <ShoppingCart className="h-4 w-4 mr-2" />
                            )}
                            {createOrderMutation.isPending ? t('orders:creatingOrder') : t('orders:createOrder')}
                          </Button>
                          <Button type="button" variant="outline" className="w-full min-h-[44px] text-sm sm:text-base" onClick={() => setLocation('/orders')} data-testid="button-save-draft">
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
            <CardHeader className="p-2.5 border-b">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Calculator className="h-4 w-4 text-blue-600" />
                {t('orders:orderSummary')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2.5 space-y-2.5">
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
                  const adjustmentValue = Number(form.watch('adjustment')) || 0;
                  return adjustmentValue !== 0 ? (
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('orders:adjustment')}:</span>
                      <span className={`font-medium ${adjustmentValue >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                        {adjustmentValue >= 0 ? '+' : ''}{formatCurrency(adjustmentValue, form.watch('currency'))}
                      </span>
                    </div>
                  ) : null;
                })()}
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
                {totals.availableStoreCredit > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={applyStoreCredit}
                          onChange={(e) => setApplyStoreCredit(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <CreditCard className="h-3 w-3" />
                        {t('orders:applyStoreCredit')}
                      </label>
                      <span className="text-xs text-gray-500">
                        {t('orders:storeCreditAvailable')}: {formatCurrency(totals.availableStoreCredit, form.watch('currency'))}
                      </span>
                    </div>
                    {applyStoreCredit && (
                      <div className="flex items-center justify-between pl-6">
                        <span className="text-sm text-gray-600">{t('orders:storeCreditAdjustment')}:</span>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            max={selectedCustomer?.storeCredit || 0}
                            step="0.01"
                            value={storeCreditAmount}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) || 0;
                              const maxCredit = selectedCustomer?.storeCredit || 0;
                              setStoreCreditAmount(Math.min(value, maxCredit));
                            }}
                            className="w-24 h-7 text-sm text-right"
                          />
                          <span className="font-medium text-blue-600 w-20 text-right">
                            -{formatCurrency(totals.storeCreditApplied, form.watch('currency'))}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <Separator />
              <div className="space-y-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{t('orders:grandTotalLabel')}</span>
                  <div className="flex items-center gap-2">
                    <Input
                      id="grandTotalMobile"
                      type="text"
                      inputMode="decimal"
                      placeholder={t('orders:clickToEnter')}
                      value={isEditingGrandTotal ? grandTotalInput : (() => {
                        const total = calculateGrandTotal();
                        const currency = form.watch('currency');
                        const useNoDecimals = currency === 'CZK' && localizationSettings.numberFormatNoDecimals;
                        return useNoDecimals ? Math.round(total).toString() : total.toFixed(2);
                      })()}
                      onFocus={(e) => {
                        setIsEditingGrandTotal(true);
                        setGrandTotalInput(e.target.value);
                        e.target.select();
                      }}
                      onChange={(e) => {
                        setGrandTotalInput(e.target.value);
                      }}
                      onBlur={(e) => {
                        setIsEditingGrandTotal(false);
                        const desiredTotal = parseFloat(e.target.value.replace(',', '.'));
                        if (!isNaN(desiredTotal) && desiredTotal > 0) {
                          const subtotal = calculateSubtotal();
                          const tax = showTaxInvoice ? calculateTax() : 0;
                          const shippingValue = form.watch('shippingCost');
                          const shipping = typeof shippingValue === 'string' ? parseFloat(shippingValue || '0') : (shippingValue || 0);
                          const discountAmount = form.watch('discountType') === 'rate' 
                            ? (subtotal * (Number(form.watch('discountValue')) || 0)) / 100
                            : Number(form.watch('discountValue')) || 0;
                          
                          // Calculate needed adjustment: desired = subtotal + tax + shipping - discount + adjustment
                          const currentTotalWithoutAdjustment = subtotal + tax + shipping - discountAmount;
                          const neededAdjustment = desiredTotal - currentTotalWithoutAdjustment;
                          
                          form.setValue('adjustment', parseFloat(neededAdjustment.toFixed(2)));
                          
                          toast({
                            title: t('orders:totalAdjusted'),
                            description: t('orders:adjustmentAmount', { amount: formatCurrency(neededAdjustment, form.watch('currency')) }),
                          });
                        }
                      }}
                      className="w-36 h-11 text-xl font-bold text-blue-600 text-right"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="default"
                      onClick={() => {
                        const currentTotal = calculateGrandTotal();
                        const roundedTotal = Math.ceil(currentTotal);
                        const difference = roundedTotal - currentTotal;
                        
                        if (difference > 0) {
                          form.setValue('adjustment', parseFloat(difference.toFixed(2)));
                          
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
                      className="h-11 px-3"
                    >
                      <ArrowUpCircle className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-gray-500">{t('orders:clickToEditOrRoundUp')}</p>
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

              <div className="pt-2 space-y-2">
                {orderId ? (
                  hasChangesAfterSave ? (
                    <>
                      <Button 
                        type="submit" 
                        className="w-full relative transition-all duration-200 ease-out min-h-[48px] text-base font-medium" 
                        size="lg"
                        disabled={createOrderMutation.isPending}
                        data-testid="button-update-order-mobile"
                      >
                        {createOrderMutation.isPending ? (
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-5 w-5 mr-2" />
                        )}
                        <span className="transition-opacity duration-150">
                          {createOrderMutation.isPending ? t('orders:updatingOrder') : t('orders:updateOrder')}
                        </span>
                        {!createOrderMutation.isPending && (
                          <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5" aria-hidden="true">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
                          </span>
                        )}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="w-full min-h-[44px] text-sm" 
                        onClick={() => setLocation(`/orders/${orderId}`)}
                      >
                        {t('orders:cancelChanges')}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button 
                        type="button" 
                        className="w-full transition-all duration-200 ease-out min-h-[48px] text-base font-medium" 
                        size="lg" 
                        onClick={() => setLocation(`/orders/${orderId}`)}
                      >
                        <CheckCircle className="h-5 w-5 mr-2" />
                        {t('orders:viewOrder')}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="w-full min-h-[44px] text-sm" 
                        onClick={() => setLocation('/orders')}
                      >
                        {t('orders:backToOrders')}
                      </Button>
                    </>
                  )
                ) : (
                  <>
                    <Button type="submit" className="w-full transition-all duration-200 ease-out min-h-[48px] text-base font-medium" size="lg" disabled={createOrderMutation.isPending || orderItems.length === 0} data-testid="button-create-order-mobile">
                      {createOrderMutation.isPending ? (
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      ) : (
                        <ShoppingCart className="h-5 w-5 mr-2" />
                      )}
                      {createOrderMutation.isPending ? t('orders:creatingOrder') : t('orders:createOrder')}
                    </Button>
                    <Button type="button" variant="outline" className="w-full min-h-[44px] text-sm" onClick={() => setLocation('/orders')} data-testid="button-save-draft-mobile">
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
        
        {/* Quick Quantity Modal - Beautiful fast entry */}
        <Dialog open={showQuickQuantityModal} onOpenChange={setShowQuickQuantityModal}>
          <DialogContent className="max-w-sm w-[90vw] p-0 overflow-hidden rounded-2xl">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-4 pb-6">
              <DialogHeader>
                <DialogTitle className="text-white text-lg font-bold text-center">
                  {t('orders:addToOrder')}
                </DialogTitle>
              </DialogHeader>
            </div>
            
            <div className="px-5 pb-5 -mt-4">
              {/* Product Card */}
              <div className="bg-white rounded-xl shadow-lg p-4 border border-slate-100">
                <div className="flex items-center gap-3">
                  {quickQuantityProduct?.image ? (
                    <img 
                      src={quickQuantityProduct.image} 
                      alt={quickQuantityProduct?.name}
                      className="w-16 h-16 object-contain rounded-lg border border-slate-200 bg-slate-50 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Package className="h-8 w-8 text-slate-300" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 text-sm leading-tight line-clamp-2">
                      {quickQuantityProduct?.name}
                    </h3>
                    {quickQuantityProduct?.sku && (
                      <p className="text-xs text-slate-500 mt-0.5">{quickQuantityProduct.sku}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-sm font-bold text-emerald-600">
                        {formatCurrency(
                          parseFloat(
                            form.watch('currency') === 'CZK' 
                              ? (quickQuantityProduct?.priceCzk || quickQuantityProduct?.priceEur || '0')
                              : (quickQuantityProduct?.priceEur || quickQuantityProduct?.priceCzk || '0')
                          ),
                          form.watch('currency') || 'EUR'
                        )}
                      </span>
                      {(quickQuantityProduct?.quantity ?? 0) > 0 && (
                        <span className="text-xs text-slate-400">
                          • {quickQuantityProduct?.quantity} {t('common:inStock')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Quantity Input */}
              <div className="mt-5">
                <Label className="text-sm font-medium text-slate-700 mb-2 block">
                  {t('orders:quantity')}
                </Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 rounded-xl text-lg font-bold border-2 hover:bg-slate-100"
                    onClick={() => setQuickQuantityValue(v => String(Math.max(1, parseInt(v) - 1 || 1)))}
                  >
                    −
                  </Button>
                  <Input
                    ref={quickQuantityInputRef}
                    type="number"
                    min="1"
                    value={quickQuantityValue}
                    onChange={(e) => setQuickQuantityValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleQuickQuantityConfirm();
                      }
                    }}
                    className="h-12 text-center text-2xl font-bold rounded-xl border-2 focus:border-emerald-500 focus:ring-emerald-500"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 rounded-xl text-lg font-bold border-2 hover:bg-slate-100"
                    onClick={() => setQuickQuantityValue(v => String((parseInt(v) || 0) + 1))}
                  >
                    +
                  </Button>
                </div>
                
                {/* Quick quantity buttons */}
                <div className="flex gap-2 mt-3">
                  {[5, 10, 20, 50].map(qty => (
                    <Button
                      key={qty}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 rounded-lg text-xs font-semibold hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700"
                      onClick={() => setQuickQuantityValue(String(qty))}
                    >
                      {qty}
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3 mt-5">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-12 rounded-xl font-semibold"
                  onClick={() => {
                    setShowQuickQuantityModal(false);
                    setQuickQuantityProduct(null);
                  }}
                >
                  {t('common:cancel')}
                </Button>
                <Button
                  type="button"
                  className="flex-1 h-12 rounded-xl font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg"
                  onClick={handleQuickQuantityConfirm}
                >
                  <Plus className="h-5 w-5 mr-1.5" />
                  {t('orders:addItems', { count: parseInt(quickQuantityValue) || 1 })}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Variant Selector Dialog - Mobile Optimized */}
        <Dialog open={showVariantDialog} onOpenChange={setShowVariantDialog}>
          <DialogContent className="max-w-2xl w-[95vw] md:w-full max-h-[90vh] overflow-hidden flex flex-col p-3 md:p-6">
            <DialogHeader className="pb-2 md:pb-4">
              <DialogTitle className="text-base md:text-lg">{t('orders:selectProductVariants')}</DialogTitle>
              <DialogDescription className="text-xs md:text-sm line-clamp-1">
                {t('orders:chooseVariantsFor')} <span className="font-semibold">{selectedProductForVariant?.name}</span>
              </DialogDescription>
            </DialogHeader>
            
            {/* Quick variant input */}
            <div className="space-y-1.5 md:space-y-2">
              <Label htmlFor="quick-variant-input" className="text-xs md:text-sm font-medium">
                {t('orders:quickVariantEntry')}
              </Label>
              <div className="flex gap-1.5 md:gap-2">
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
                  className="flex-1 font-mono text-xs md:text-sm h-9 md:h-10"
                  data-testid="input-quick-variant"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-9 md:h-10 px-2.5 md:px-3 min-w-[44px]"
                  onClick={() => parseQuickVariantInput(quickVariantInput)}
                  data-testid="button-apply-quick-variant"
                >
                  <span className="hidden sm:inline">{t('orders:apply')}</span>
                  <Check className="h-4 w-4 sm:hidden" />
                </Button>
              </div>
              <p className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">
                {t('orders:quickVariantHint')}
              </p>
            </div>
            
            {/* Header row - Responsive grid */}
            <div className="grid grid-cols-[1fr_50px_120px] md:grid-cols-[1fr_80px_60px_130px] gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 bg-muted/50 rounded-t-md text-xs md:text-sm font-medium border-b mt-2">
              <div>{t('orders:variantName')}</div>
              <div className="text-right hidden md:block">{t('orders:price')}</div>
              <div className="text-center md:text-right">{t('orders:stock')}</div>
              <div className="text-right">{t('orders:quantity')}</div>
            </div>
            
            {/* Virtualized variant list for performance with 300+ items */}
            <div className="flex-1 overflow-hidden min-h-0">
              <List
                height={Math.min(300, productVariants.length * 44)}
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
                      className="grid grid-cols-[1fr_50px_120px] md:grid-cols-[1fr_80px_60px_130px] gap-1.5 md:gap-2 px-2 md:px-3 items-center border-b last:border-b-0 hover:bg-muted/30"
                    >
                      <div className="font-medium truncate text-xs md:text-sm" title={variant.name}>{variant.name}</div>
                      <div className="text-right text-xs md:text-sm hidden md:block">{selectedProductForVariant?.priceCzk ? `${selectedProductForVariant.priceCzk} Kč` : (selectedProductForVariant?.priceEur ? `${selectedProductForVariant.priceEur} €` : '-')}</div>
                      <div className="text-center md:text-right">
                        <Badge variant={(variant.availableQuantity ?? variant.quantity) > 10 ? "default" : (variant.availableQuantity ?? variant.quantity) > 0 ? "outline" : "destructive"} className="text-[10px] md:text-xs px-1.5">
                          {variant.availableQuantity ?? variant.quantity}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-end gap-1">
                        <Input
                          type="number"
                          min="0"
                          inputMode="numeric"
                          value={variantQuantities[variant.id] || 0}
                          onChange={(e) => setVariantQuantities(prev => ({
                            ...prev,
                            [variant.id]: Math.max(0, parseInt(e.target.value) || 0)
                          }))}
                          onFocus={(e) => e.target.select()}
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
                          className="text-center h-7 w-10 text-xs px-1"
                          data-testid={`input-variant-quantity-${variant.id}`}
                        />
                        <button
                          type="button"
                          onClick={() => setVariantQuantities(prev => ({
                            ...prev,
                            [variant.id]: (prev[variant.id] || 0) + 1
                          }))}
                          className="h-7 px-1.5 text-[10px] font-medium text-primary hover:bg-primary/10 rounded border"
                        >+1</button>
                        <button
                          type="button"
                          onClick={() => setVariantQuantities(prev => ({
                            ...prev,
                            [variant.id]: (prev[variant.id] || 0) + 10
                          }))}
                          className="h-7 px-1 text-[10px] font-medium text-primary hover:bg-primary/10 rounded border"
                        >+10</button>
                      </div>
                    </div>
                  );
                }}
              </List>
            </div>
            
            {/* Show count for large lists */}
            {productVariants.length > 20 && (
              <p className="text-[10px] md:text-xs text-muted-foreground mt-1.5 md:mt-2 text-center">
                {t('orders:showingVariants', { count: productVariants.length })}
              </p>
            )}
            <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2 md:pt-4">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto min-h-[44px]"
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
                className="w-full sm:w-auto min-h-[44px]"
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

        {/* Stock Limit Modal for Quantity Updates */}
        <Dialog open={stockLimitModalOpen} onOpenChange={setStockLimitModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                {t('orders:stockLimitReached', 'Stock Limit Reached')}
              </DialogTitle>
              <DialogDescription className="pt-2">
                {pendingQuantityUpdate?.availableStock === 0 ? (
                  t('orders:noStockAvailableForProduct', {
                    productName: pendingQuantityUpdate?.productName,
                    defaultValue: `"${pendingQuantityUpdate?.productName}" has no stock available.`
                  })
                ) : (
                  t('orders:stockLimitDesc', {
                    productName: pendingQuantityUpdate?.productName,
                    requested: pendingQuantityUpdate?.requestedQty,
                    available: pendingQuantityUpdate?.availableStock,
                    defaultValue: `You requested ${pendingQuantityUpdate?.requestedQty} units of "${pendingQuantityUpdate?.productName}", but only ${pendingQuantityUpdate?.availableStock} are in stock.`
                  })
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4">
              <Button variant="outline" onClick={handleStockLimitCancel} data-testid="button-stock-limit-cancel">
                {t('common:cancel')}
              </Button>
              {pendingQuantityUpdate?.availableStock && pendingQuantityUpdate.availableStock > 0 && (
                <Button variant="secondary" onClick={handleStockLimitFillRemaining} data-testid="button-stock-limit-fill-remaining">
                  <Package className="h-4 w-4 mr-2" />
                  {t('orders:fillRemaining', { count: pendingQuantityUpdate.availableStock, defaultValue: `Fill ${pendingQuantityUpdate.availableStock}` })}
                </Button>
              )}
              <Button variant="destructive" onClick={handleStockLimitForceAdd} data-testid="button-stock-limit-force-add">
                <AlertCircle className="h-4 w-4 mr-2" />
                {t('orders:forceAdd', { count: pendingQuantityUpdate?.requestedQty, defaultValue: `Force Add ${pendingQuantityUpdate?.requestedQty}` })}
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

        {/* Mobile Image Popup with Swipe to Close and Pinch to Zoom */}
        {mobileImagePopup.open && (
          <div 
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center touch-none"
            onClick={() => setMobileImagePopup({ open: false, src: '', alt: '' })}
            onTouchStart={(e) => {
              const target = e.currentTarget as any;
              if (e.touches.length === 2) {
                // Pinch gesture - calculate initial distance
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                const dist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
                target.initialPinchDist = dist;
                target.currentScale = target.currentScale || 1;
                target.isPinching = true;
              } else if (e.touches.length === 1) {
                // Single touch - swipe gesture
                const touch = e.touches[0];
                target.touchStartY = touch.clientY;
                target.touchStartX = touch.clientX;
                target.translateY = 0;
                target.translateX = 0;
                target.isPinching = false;
              }
            }}
            onTouchMove={(e) => {
              const target = e.currentTarget as any;
              const imageEl = target.querySelector('img');
              
              if (e.touches.length === 2 && target.isPinching) {
                // Pinch zoom
                e.preventDefault();
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                const dist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
                const initialDist = target.initialPinchDist || dist;
                const scale = Math.min(Math.max((dist / initialDist) * (target.currentScale || 1), 1), 4);
                
                if (imageEl) {
                  imageEl.style.transform = `scale(${scale})`;
                  imageEl.style.transition = 'none';
                }
                target.pendingScale = scale;
              } else if (e.touches.length === 1 && !target.isPinching) {
                // Swipe to close (only when not zoomed)
                const currentScale = target.currentScale || 1;
                if (currentScale <= 1) {
                  const touch = e.touches[0];
                  const startY = target.touchStartY || 0;
                  const deltaY = touch.clientY - startY;
                  if (deltaY > 0) {
                    target.translateY = deltaY;
                    if (imageEl) {
                      imageEl.style.transform = `translateY(${deltaY}px) scale(${1 - deltaY / 1000})`;
                      imageEl.style.opacity = `${1 - deltaY / 300}`;
                      imageEl.style.transition = 'none';
                    }
                  }
                }
              }
            }}
            onTouchEnd={(e) => {
              const target = e.currentTarget as any;
              const imageEl = target.querySelector('img');
              
              if (target.isPinching && target.pendingScale) {
                // Save the new scale
                target.currentScale = target.pendingScale;
                target.isPinching = false;
                if (imageEl) {
                  imageEl.style.transition = 'transform 0.2s ease-out';
                }
              } else {
                const translateY = target.translateY || 0;
                const currentScale = target.currentScale || 1;
                
                if (translateY > 100 && currentScale <= 1) {
                  setMobileImagePopup({ open: false, src: '', alt: '' });
                } else if (imageEl && currentScale <= 1) {
                  imageEl.style.transform = '';
                  imageEl.style.opacity = '';
                  imageEl.style.transition = 'all 0.2s ease-out';
                }
              }
            }}
          >
            <div className="absolute top-4 right-4 z-10">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70"
                onClick={(e) => {
                  e.stopPropagation();
                  setMobileImagePopup({ open: false, src: '', alt: '' });
                }}
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
            <div className="absolute top-4 left-4 right-16 z-10">
              <p className="text-white text-sm font-medium truncate">{mobileImagePopup.alt}</p>
              <p className="text-white/60 text-xs">{t('orders:pinchToZoom')}</p>
            </div>
            <img 
              src={mobileImagePopup.src} 
              alt={mobileImagePopup.alt}
              className="max-w-[90vw] max-h-[80vh] object-contain rounded-lg select-none"
              style={{ touchAction: 'none' }}
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={(e) => {
                e.stopPropagation();
                const target = e.currentTarget.parentElement as any;
                const currentScale = target?.currentScale || 1;
                const newScale = currentScale > 1 ? 1 : 2;
                target.currentScale = newScale;
                e.currentTarget.style.transform = `scale(${newScale})`;
                e.currentTarget.style.transition = 'transform 0.3s ease-out';
              }}
            />
          </div>
        )}

        {/* Edit Customer Dialog */}
        <Dialog open={showEditCustomerDialog} onOpenChange={setShowEditCustomerDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('customers:editCustomer')}</DialogTitle>
              <DialogDescription>
                {t('orders:editCustomerDescription', 'Update customer details')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-customer-name">{t('common:name')}</Label>
                <Input
                  id="edit-customer-name"
                  value={editCustomerForm.name}
                  onChange={(e) => setEditCustomerForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={t('common:name')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-customer-phone">{t('common:phone')}</Label>
                <Input
                  id="edit-customer-phone"
                  value={editCustomerForm.phone}
                  onChange={(e) => setEditCustomerForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder={t('common:phone')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-customer-email">{t('common:email')}</Label>
                <Input
                  id="edit-customer-email"
                  type="email"
                  value={editCustomerForm.email}
                  onChange={(e) => setEditCustomerForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder={t('common:email')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-customer-company">{t('customers:company')}</Label>
                <Input
                  id="edit-customer-company"
                  value={editCustomerForm.company}
                  onChange={(e) => setEditCustomerForm(prev => ({ ...prev, company: e.target.value }))}
                  placeholder={t('customers:company')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-customer-currency">{t('customers:preferredCurrency')}</Label>
                <Select
                  value={editCustomerForm.preferredCurrency}
                  onValueChange={(value: "CZK" | "EUR") => setEditCustomerForm(prev => ({ ...prev, preferredCurrency: value }))}
                >
                  <SelectTrigger id="edit-customer-currency">
                    <SelectValue placeholder={t('customers:preferredCurrency')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CZK">CZK</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditCustomerDialog(false)}
              >
                {t('common:cancel')}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (selectedCustomer?.id) {
                    updateCustomerMutation.mutate({
                      id: selectedCustomer.id,
                      ...editCustomerForm
                    });
                  }
                }}
                disabled={updateCustomerMutation.isPending}
              >
                {updateCustomerMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('common:updating')}
                  </>
                ) : (
                  t('common:save')
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}