import { useState, useEffect, useMemo, useRef, Fragment } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FixedSizeList as List } from "react-window";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { fuzzySearch } from "@/lib/fuzzySearch";
import { formatCurrency } from "@/lib/currencyUtils";
import { isUnauthorizedError } from "@/lib/authUtils";
import { calculateShippingCost } from "@/lib/shippingCosts";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import OrderDocumentSelector from "@/components/OrderDocumentSelector";
import { ShippingAddressModal } from "@/components/ShippingAddressModal";
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
  MessageSquare,
  Box,
  Weight,
  Loader2,
  Upload,
  Download,
  Settings,
  Clock,
  Pencil,
  Star,
  MoreVertical,
  StickyNote
} from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Quick note templates for autofill
const QUICK_NOTE_TEMPLATES = [
  "Handle with care - fragile item",
  "Keep upright during transport",
  "Pack with anti-static materials",
  "Double box required",
  "Separate from other items",
  "Do not stack",
  "Temperature sensitive - keep cool",
  "Requires signature on delivery",
];

const editOrderSchema = z.object({
  customerId: z.string().optional(),
  orderType: z.enum(['pos', 'ord', 'web', 'tel']).default('ord'),
  currency: z.enum(['CZK', 'EUR', 'USD', 'VND', 'CNY']),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  orderStatus: z.enum(['pending', 'to_fulfill', 'shipped']).default('pending'),
  paymentStatus: z.enum(['pending', 'paid', 'pay_later']).default('pending'),
  shippingMethod: z.enum(['GLS', 'PPL', 'DHL', 'DPD']).optional(),
  paymentMethod: z.enum(['Bank Transfer', 'PayPal', 'COD', 'Cash']).optional(),
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
  dobirkaAmount: z.coerce.number().min(0).optional().nullable(),
  dobirkaCurrency: z.enum(['CZK', 'EUR', 'USD']).optional().nullable(),
  notes: z.string().optional(),
  orderLocation: z.string().optional(),
});

interface OrderItem {
  id: string;
  productId?: string;
  serviceId?: string;
  productName: string;
  sku: string;
  quantity: number;
  price: number;
  discount: number;
  tax: number;
  total: number;
  landingCost?: number | null;
  variantId?: string | null;
  variantName?: string | null;
  bundleId?: string | null;
  image?: string | null;
  notes?: string | null;
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

export default function EditOrder() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [showTaxInvoice, setShowTaxInvoice] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [roundingAdjustment, setRoundingAdjustment] = useState(0);
  const { toast } = useToast();
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  
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
  const [addressToDelete, setAddressToDelete] = useState<any>(null);
  
  // Variant/Bundle selection state
  const [showVariantDialog, setShowVariantDialog] = useState(false);
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<any>(null);
  const [productVariants, setProductVariants] = useState<any[]>([]);
  const [variantQuantities, setVariantQuantities] = useState<{[key: string]: number}>({});
  
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
    type: "regular"
  });
  
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
  
  // Item notes state
  const [editingNoteItemId, setEditingNoteItemId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  // Packing optimization hook
  const { 
    packingPlan, 
    setPackingPlan, 
    runPackingOptimization: runOptimization,
    isLoading: isPackingOptimizationLoading 
  } = usePackingOptimization();

  // File upload state
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  // Column visibility toggles
  const [showVatColumn, setShowVatColumn] = useState(false);
  const [showDiscountColumn, setShowDiscountColumn] = useState(false);

  // Auto-enable discount column if any item has a discount
  useEffect(() => {
    const hasDiscounts = orderItems.some(item => item.discount > 0);
    if (hasDiscounts && !showDiscountColumn) {
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

  const form = useForm<z.infer<typeof editOrderSchema>>({
    resolver: zodResolver(editOrderSchema),
    defaultValues: {
      orderType: 'ord',
      currency: 'EUR',
      priority: 'medium',
      orderStatus: 'pending',
      paymentStatus: 'pending',
      discountValue: 0,
      taxRate: 0,
      shippingCost: 0,
      actualShippingCost: 0,
      adjustment: 0,
      orderLocation: '',
    },
  });

  // Fetch existing order data - force fresh fetch on every mount
  const { data: existingOrder, isLoading: isLoadingOrder, dataUpdatedAt } = useQuery({
    queryKey: ['EDIT_ORDER_ISOLATED', id], // Stable key
    queryFn: async () => {
      console.log('🔵 EditOrder: Loading fresh data from database');
      const response = await fetch(`/api/orders/${id}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch order');
      }
      const data = await response.json();
      console.log('✅ EditOrder: Loaded data, currency =', data.currency, 'shippingCost =', data.shippingCost);
      return data;
    },
    enabled: !!id,
    staleTime: 0, // Always consider stale
    gcTime: 0, // Don't cache at all - always fetch fresh
    refetchOnMount: 'always', // Always refetch when component mounts
    refetchOnWindowFocus: false, // Don't refetch on window focus  
    refetchOnReconnect: false, // Don't refetch on reconnect
    refetchInterval: false, // Don't poll
  });

  // Fetch all products for real-time filtering
  const { data: allProducts } = useQuery({
    queryKey: ['/api/products'],
    staleTime: 5 * 60 * 1000, // 5 minutes - products don't change frequently
  });

  // Fetch all bundles
  const { data: allBundles } = useQuery({
    queryKey: ['/api/bundles'],
    staleTime: 5 * 60 * 1000,
  });

  // Fetch all services for real-time filtering
  const { data: allServices } = useQuery({
    queryKey: ['/api/services'],
    staleTime: 5 * 60 * 1000, // 5 minutes - services don't change frequently
  });

  // Fetch variants for all products (map productId -> variants)
  const { data: productsWithVariants } = useQuery({
    queryKey: ['/api/products-with-variants'],
    queryFn: async () => {
      if (!Array.isArray(allProducts)) return {};
      
      const variantsMap: Record<string, any[]> = {};
      
      // Fetch variants for each product in parallel
      await Promise.all(
        allProducts.slice(0, 50).map(async (product: any) => { // Limit to first 50 products for performance
          try {
            const response = await fetch(`/api/products/${product.id}/variants`);
            if (response.ok) {
              const variants = await response.json();
              if (variants && variants.length > 0) {
                variantsMap[product.id] = variants;
              }
            }
          } catch (error) {
            console.error(`Error fetching variants for product ${product.id}:`, error);
          }
        })
      );
      
      return variantsMap;
    },
    enabled: !!allProducts && Array.isArray(allProducts),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch all customers for real-time filtering
  const { data: allCustomers } = useQuery({
    queryKey: ['/api/customers'],
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

  // Fetch packing plan for this order
  const { data: savedPackingPlan } = useQuery({
    queryKey: ['/api/orders', id, 'packing-plans'],
    enabled: !!id,
  });

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

  // Pre-fill form data when order loads - runs when specific fields change
  useEffect(() => {
    if (!existingOrder) return;
    const order = existingOrder as any;

    console.log('✅ Loading fresh order data into form, currency:', order.currency, 'shippingCost:', order.shippingCost, 'paymentMethod:', order.paymentMethod);

    // Reset form with fresh database data
    form.reset({
      customerId: order.customerId,
      orderType: order.orderType || 'ord',
      currency: order.currency,
      priority: order.priority,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      shippingMethod: order.shippingMethod,
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
      dobirkaAmount: order.dobirkaAmount,
      dobirkaCurrency: order.dobirkaCurrency,
      notes: order.notes,
      orderLocation: order.orderLocation,
    });

    // Set tax invoice and discount visibility
    if (order.taxInvoiceEnabled || order.taxRate > 0) {
      setShowTaxInvoice(true);
    }
    if (order.discountValue > 0) {
      setShowDiscount(true);
    }
  }, [
    // Track dataUpdatedAt to force re-run when fresh data arrives
    dataUpdatedAt,
    existingOrder,
  ]);

  // Pre-fill order items when order loads
  useEffect(() => {
    if (!existingOrder) return;
    const order = existingOrder as any;
    if (!order.items) return;

    console.log('✅ Loading order items:', order.items.length);

    const items: OrderItem[] = order.items.map((item: any) => ({
      id: item.id || `item-${Date.now()}-${Math.random()}`,
      productId: item.productId,
      serviceId: item.serviceId,
      bundleId: item.bundleId,
      productName: item.productName,
      sku: item.sku,
      quantity: item.quantity,
      price: parseFloat(item.price || 0),
      discount: parseFloat(item.discount || 0),
      tax: parseFloat(item.tax || 0),
      total: parseFloat(item.total || 0),
      landingCost: item.landingCost,
      variantId: item.variantId,
      variantName: item.variantName,
      image: item.image,
      notes: item.notes,
    }));

    setOrderItems(items);
  }, [existingOrder?.id, existingOrder?.items?.length]); // Re-run when ID or items change

  // Pre-fill customer when order loads
  useEffect(() => {
    if (!existingOrder || !allCustomers) return;
    const order = existingOrder as any;

    console.log('✅ Loading customer:', order.customerId);

    if (order.customerId) {
      const customer = Array.isArray(allCustomers) 
        ? allCustomers.find((c: any) => c.id === order.customerId)
        : null;
      
      if (customer) {
        setSelectedCustomer(customer);
        setCustomerSearch(customer.name);
        console.log('✅ Customer loaded:', customer.name);
      } else {
        console.log('❌ Customer not found in allCustomers');
      }
    }
  }, [existingOrder?.id, existingOrder?.customerId, allCustomers]); // Added existingOrder?.id

  // Pre-fill shipping address when order loads
  useEffect(() => {
    if (!existingOrder || !shippingAddresses) return;
    const order = existingOrder as any;
    
    if (!Array.isArray(shippingAddresses)) return;
    
    // If order has a saved shipping address, select it
    if (order.shippingAddressId) {
      const address = shippingAddresses.find((addr: any) => addr.id === order.shippingAddressId);
      if (address) {
        setSelectedShippingAddress(address);
      }
    } 
    // If no saved address but only one address exists, auto-select it
    else if (shippingAddresses.length === 1) {
      setSelectedShippingAddress(shippingAddresses[0]);
    }
  }, [existingOrder?.shippingAddressId, shippingAddresses]);

  // Pre-fill selected documents when order loads (ONLY ONCE on initial load)
  const documentsInitialized = useRef(false);
  useEffect(() => {
    if (!existingOrder) {
      documentsInitialized.current = false;
      return;
    }
    
    // Only initialize once per order, don't overwrite on subsequent refetches
    if (documentsInitialized.current && existingOrder.id === documentsInitialized.current) {
      return;
    }
    
    const order = existingOrder as any;
    
    if (order.selectedDocumentIds && Array.isArray(order.selectedDocumentIds)) {
      console.log('✅ Loading selected document IDs:', order.selectedDocumentIds.length);
      setSelectedDocumentIds(order.selectedDocumentIds);
      documentsInitialized.current = order.id; // Mark as initialized for this order
    }
  }, [existingOrder?.id]); // Only run when order ID changes (initial load or different order)

  // Pre-fill uploaded files when order loads (ONLY ONCE on initial load)
  const filesInitialized = useRef(false);
  useEffect(() => {
    if (!existingOrder) {
      filesInitialized.current = false;
      return;
    }
    
    // Only initialize once per order, don't overwrite on subsequent refetches
    if (filesInitialized.current && existingOrder.id === filesInitialized.current) {
      return;
    }
    
    const order = existingOrder as any;
    
    if (order.includedDocuments?.uploadedFiles && Array.isArray(order.includedDocuments.uploadedFiles)) {
      console.log('✅ Loading uploaded files:', order.includedDocuments.uploadedFiles.length);
      // Convert the saved file metadata back to File objects
      const files = order.includedDocuments.uploadedFiles.map((fileData: any) => {
        // Create a mock File object from saved metadata
        const blob = new Blob([], { type: 'application/octet-stream' });
        return new File([blob], fileData.name, { type: 'application/octet-stream' });
      });
      setUploadedFiles(files);
      filesInitialized.current = order.id; // Mark as initialized for this order
    }
  }, [existingOrder?.id]); // Only run when order ID changes (initial load or different order)

  // Pre-fill packing plan when order loads
  useEffect(() => {
    if (!savedPackingPlan) return;
    
    const plan = savedPackingPlan as any;
    
    // Transform the database format to UI format
    setPackingPlan({
      totalCartons: plan.totalCartons,
      totalWeight: parseFloat(plan.totalWeightKg || '0'),
      avgUtilization: parseFloat(plan.avgUtilization || '0'),
      estimatedShippingCost: parseFloat(plan.totalShippingCost || '0'),
      suggestions: plan.suggestions ? JSON.parse(plan.suggestions) : [],
      cartons: plan.cartons || []
    });
  }, [savedPackingPlan]);

  // Auto-update currency based on shipping address country
  // BUT ONLY if we're NOT editing an existing order with a saved currency
  useEffect(() => {
    if (!selectedShippingAddress) return;
    
    // 🔒 CRITICAL FIX: Don't overwrite saved currency from database
    // Only auto-set currency for new orders (no existingOrder.currency)
    if (existingOrder?.currency) {
      console.log('⏭️ Skipping auto-currency - order has saved currency:', existingOrder.currency);
      return; // Existing order already has a saved currency, don't touch it!
    }
    
    const country = selectedShippingAddress.country?.toLowerCase() || '';
    const city = selectedShippingAddress.city?.toLowerCase() || '';
    
    let newCurrency: 'CZK' | 'EUR' = 'EUR'; // Default to EUR
    
    // Germany → EUR
    if (country.includes('germany') || country.includes('deutschland') || country.includes('německo')) {
      newCurrency = 'EUR';
    }
    // Czech Republic
    else if (country.includes('czech') || country.includes('česko') || country.includes('czechia')) {
      // Cheb (near German border) → EUR, otherwise → CZK
      if (city.includes('cheb')) {
        newCurrency = 'EUR';
      } else {
        newCurrency = 'CZK';
      }
    }
    // Other countries → EUR (default)
    
    console.log('✅ Auto-setting currency for new order:', newCurrency);
    form.setValue('currency', newCurrency);
  }, [selectedShippingAddress, existingOrder?.currency]); // Added existingOrder.currency to dependencies

  // Watch discount value changes
  const discountValue = form.watch('discountValue');
  
  // Auto-show discount section when discount value > 0
  useEffect(() => {
    if (discountValue > 0 && !showDiscount) {
      setShowDiscount(true);
    }
  }, [discountValue, showDiscount]);

  // Get unique product IDs from cart items
  const uniqueProductIds = useMemo(() => {
    return Array.from(new Set(orderItems.map(item => item.productId)));
  }, [orderItems]);

  // Fetch product files for all products in the cart
  const { data: productFilesData } = useQuery({
    queryKey: ['/api/products', 'files', uniqueProductIds],
    queryFn: async () => {
      if (uniqueProductIds.length === 0) return {};
      
      const filesMap: Record<string, any[]> = {};
      await Promise.all(
        uniqueProductIds.map(async (productId) => {
          try {
            const response = await fetch(`/api/products/${productId}/files`);
            if (response.ok) {
              const files = await response.json();
              filesMap[productId] = files || [];
            }
          } catch (error) {
            console.error(`Error fetching files for product ${productId}:`, error);
            filesMap[productId] = [];
          }
        })
      );
      return filesMap;
    },
    enabled: uniqueProductIds.length > 0,
  });

  // Mutation to create new shipping address
  const createShippingAddressMutation = useMutation({
    mutationFn: async (addressData: any) => {
      const response = await apiRequest('POST', `/api/customers/${selectedCustomer.id}/shipping-addresses`, addressData);
      return response.json();
    },
    onSuccess: (newAddress) => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers', selectedCustomer?.id, 'shipping-addresses'] });
      setShowShippingModal(false);
      setEditingAddress(null);
      // Automatically select the new address
      if (newAddress) {
        setSelectedShippingAddress(newAddress);
      }
      toast({
        title: "Success",
        description: "Shipping address created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create shipping address",
        variant: "destructive",
      });
    },
  });

  // Mutation to update existing shipping address
  const updateShippingAddressMutation = useMutation({
    mutationFn: async (addressData: any) => {
      const response = await apiRequest('PATCH', `/api/customers/${selectedCustomer.id}/shipping-addresses/${addressData.id}`, addressData);
      return response.json();
    },
    onSuccess: (updatedAddress) => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers', selectedCustomer?.id, 'shipping-addresses'] });
      setShowShippingModal(false);
      setEditingAddress(null);
      // Update the selected address if it was the one being edited
      if (selectedShippingAddress?.id === updatedAddress.id) {
        setSelectedShippingAddress(updatedAddress);
      }
      toast({
        title: "Success",
        description: "Shipping address updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update shipping address",
        variant: "destructive",
      });
    },
  });

  const deleteShippingAddressMutation = useMutation({
    mutationFn: async (addressId: string) => {
      await apiRequest('DELETE', `/api/shipping-addresses/${addressId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers', selectedCustomer?.id, 'shipping-addresses'] });
      // If the deleted address was selected, unselect it
      if (selectedShippingAddress?.id === addressToDelete?.id) {
        setSelectedShippingAddress(null);
      }
      setAddressToDelete(null);
      toast({
        title: "Success",
        description: "Shipping address deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete shipping address",
        variant: "destructive",
      });
    },
  });

  const setPrimaryShippingAddressMutation = useMutation({
    mutationFn: async (addressId: string) => {
      await apiRequest('POST', `/api/customers/${selectedCustomer.id}/shipping-addresses/${addressId}/set-primary`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers', selectedCustomer?.id, 'shipping-addresses'] });
      toast({
        title: "Success",
        description: "Primary address set",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to set primary address",
        variant: "destructive",
      });
    },
  });

  const removePrimaryShippingAddressMutation = useMutation({
    mutationFn: async (addressId: string) => {
      await apiRequest('DELETE', `/api/customers/${selectedCustomer.id}/shipping-addresses/${addressId}/remove-primary`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers', selectedCustomer?.id, 'shipping-addresses'] });
      toast({
        title: "Success",
        description: "Primary address removed",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to remove primary address",
        variant: "destructive",
      });
    },
  });

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
      
      if (fields.firstName || fields.lastName) {
        const fullName = [fields.firstName, fields.lastName].filter(Boolean).map(capitalizeWords).join(' ');
        setNewCustomer(prev => ({ ...prev, name: fullName }));
      }
      if (fields.company) setNewCustomer(prev => ({ ...prev, company: fields.company }));
      if (fields.email) setNewCustomer(prev => ({ ...prev, email: fields.email }));
      if (fields.phone) setNewCustomer(prev => ({ ...prev, phone: fields.phone }));
      
      // Use Nominatim-corrected address values
      if (fields.street) setNewCustomer(prev => ({ ...prev, street: fields.street }));
      if (fields.streetNumber) setNewCustomer(prev => ({ ...prev, streetNumber: fields.streetNumber }));
      if (fields.city) setNewCustomer(prev => ({ ...prev, city: fields.city }));
      if (fields.zipCode) setNewCustomer(prev => ({ ...prev, zipCode: fields.zipCode }));
      if (fields.country) setNewCustomer(prev => ({ ...prev, country: fields.country }));
      if (fields.state) setNewCustomer(prev => ({ ...prev, state: fields.state }));
      
      toast({
        title: "Address Parsed",
        description: `Successfully parsed address with ${data.confidence} confidence`,
      });
      setRawNewCustomerAddress("");
    },
    onError: (error: any) => {
      toast({
        title: "Parse Failed",
        description: error.message || "Failed to parse address",
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
  // BUT ONLY for NEW orders - don't overwrite saved shipping costs
  const watchedShippingMethod = form.watch('shippingMethod');
  const watchedCurrency = form.watch('currency');

  useEffect(() => {
    if (!watchedShippingMethod || !selectedCustomer?.country) return;
    
    // 🔒 CRITICAL FIX: Don't overwrite saved shipping cost from database
    // Only auto-calculate for new orders (no existingOrder.shippingCost)
    if (existingOrder?.shippingCost !== undefined && existingOrder?.shippingCost !== null) {
      console.log('⏭️ Skipping auto-shipping cost - order has saved value:', existingOrder.shippingCost);
      return; // Existing order already has a saved shipping cost, don't touch it!
    }

    const calculatedCost = calculateShippingCost(
      watchedShippingMethod,
      selectedCustomer.country,
      watchedCurrency
    );

    console.log('✅ Auto-calculating shipping cost for new order:', calculatedCost);
    form.setValue('actualShippingCost', calculatedCost);
    form.setValue('shippingCost', calculatedCost); // Also set shipping cost for display
  }, [watchedShippingMethod, selectedCustomer?.country, watchedCurrency, existingOrder?.shippingCost]); // Added existingOrder.shippingCost

  // Auto-sync dobírka amount and currency when PPL + COD is selected
  // Recalculates on EVERY change (currency, items, shipping, discounts, taxes, adjustment)
  const watchedPaymentMethod = form.watch('paymentMethod');
  const watchedDiscountValue = form.watch('discountValue');
  const watchedShippingCost = form.watch('shippingCost');
  const watchedTaxRate = form.watch('taxRate');
  const watchedAdjustment = form.watch('adjustment');
  
  useEffect(() => {
    // Only auto-sync if PPL shipping and COD payment are selected
    if (watchedShippingMethod === 'PPL' && watchedPaymentMethod === 'COD') {
      console.log('✅ Auto-syncing dobírka amount to match grand total');
      // Always sync dobírka amount to match grand total
      const grandTotal = calculateGrandTotal();
      form.setValue('dobirkaAmount', parseFloat(grandTotal.toFixed(2)));
      
      // Always sync currency to match order currency (only if it's a supported COD currency)
      if (watchedCurrency === 'CZK' || watchedCurrency === 'EUR' || watchedCurrency === 'USD') {
        form.setValue('dobirkaCurrency', watchedCurrency);
      }
    }
  }, [
    watchedShippingMethod, 
    watchedPaymentMethod, 
    watchedCurrency, 
    orderItems, 
    showTaxInvoice,
    watchedDiscountValue,
    watchedShippingCost,
    watchedTaxRate,
    watchedAdjustment
  ]); // Recalculates on any value change including adjustment

  // Auto-fill currency from customer preference (only when creating new orders)
  // Note: This is intentionally NOT in EditOrder - we preserve the order's saved currency
  // when editing existing orders, even if the customer changes.

  const updateOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      // Check if we have a customer that needs to be saved (Tel or Msg types)
      if (selectedCustomer && selectedCustomer.needsSaving) {
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
          await apiRequest('POST', `/api/customers/${customerResponse?.id}/shipping-addresses`, addressData);
        }
      } else if (selectedCustomer && !selectedCustomer.id) {
        // Handle regular new customer creation (from the full customer form)
        console.log('Creating new customer:', selectedCustomer);
        
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
        data.customerId = customerResponse?.id;
      } else if (selectedCustomer?.id && !selectedCustomer.id.startsWith('temp-')) {
        // Use existing customer's ID (not a temporary one)
        data.customerId = selectedCustomer.id;
      } else if (selectedCustomer && selectedCustomer.isTemporary) {
        // For one-time customers (Quick and Custom), don't save to database
        // Just pass the customer name in the order data
        data.temporaryCustomerName = selectedCustomer.name;
        data.customerId = null;
      }

      console.log('Updating order with customerId:', data.customerId);

      // Order data already includes selectedDocumentIds from onSubmit
      const orderData = data;

      const response = await apiRequest('PATCH', `/api/orders/${id}`, orderData);
      const updatedOrder = await response.json();
      return updatedOrder;
    },
    onSuccess: async (updatedOrder) => {
      console.log('✅ Order saved successfully, reloading page with fresh data');
      
      // Show success message
      toast({
        title: "Success",
        description: "Order updated successfully",
      });

      // Force a full page reload to bypass all caching
      // This ensures EditOrder loads completely fresh data from the database
      window.location.href = `/orders/${id}`;
    },
    onError: (error) => {
      console.error("Order update error:", error);
      toast({
        title: "Error",
        description: "Failed to update order",
        variant: "destructive",
      });
    },
  });

  // Packing optimization wrapper
  const runPackingOptimization = () => {
    const items = orderItems.map(item => ({
      productId: item.productId || '',
      productName: item.productName,
      sku: item.sku,
      quantity: item.quantity,
      price: item.price
    }));
    runOptimization(items, selectedCustomer?.country || 'CZ');
  };

  const addProductToOrder = async (product: any) => {
    // Check if this is a service
    if (product.isService || product.itemType === 'service') {
      // Check if service already exists in order
      const existingItem = orderItems.find(item => item.serviceId === product.id);

      if (existingItem) {
        setOrderItems(items =>
          items.map(item =>
            item.serviceId === product.id
              ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
              : item
          )
        );
      } else {
        const servicePrice = parseFloat(product.totalCost || '0');
        const newItem: OrderItem = {
          id: Math.random().toString(36).substr(2, 9),
          serviceId: product.id,
          productName: product.name,
          sku: 'SERVICE',
          quantity: 1,
          price: servicePrice,
          discount: 0,
          tax: 0,
          total: servicePrice,
        };
        setOrderItems(items => [...items, newItem]);
        // Auto-focus quantity input for the newly added item
        setTimeout(() => {
          const quantityInput = document.querySelector(`[data-testid="input-quantity-${newItem.id}"]`) as HTMLInputElement;
          quantityInput?.focus();
        }, 100);
      }
      setProductSearch("");
      setShowProductDropdown(false);
      return;
    }
    
    // Check if product has variants (only for parent products, not already-selected variants)
    if (product.itemType !== 'variant') {
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
    }
    
    // Handle regular product or already-selected variant
    const existingItem = orderItems.find(item => item.productId === product.id);

    if (existingItem) {
      setOrderItems(items =>
        items.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
            : item
        )
      );
    } else {
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
                title: "Customer Price Applied",
                description: `Using customer-specific price: ${productPrice} ${selectedCurrency}`,
              });
            }
          }
        } catch (error) {
          console.error('Error fetching customer prices:', error);
        }
      }

      // If no customer price found, use default product price
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

      const newItem: OrderItem = {
        id: Math.random().toString(36).substr(2, 9),
        productId: product.itemType === 'bundle' ? null : (product.itemType === 'variant' ? product.productId : product.id),
        productName: product.itemType === 'variant' ? product.productName : product.name,
        sku: product.sku,
        quantity: 1,
        price: productPrice,
        discount: 0,
        tax: 0,
        total: productPrice,
        landingCost: product.landingCost || product.latestLandingCost || null,
        variantId: product.itemType === 'variant' ? product.variantId : null,
        variantName: product.itemType === 'variant' ? product.variantName : null,
        bundleId: product.itemType === 'bundle' ? product.bundleId : null,
        image: product.image || null,
      };
      setOrderItems(items => [...items, newItem]);
      // Auto-focus quantity input for the newly added item
      setTimeout(() => {
        const quantityInput = document.querySelector(`[data-testid="input-quantity-${newItem.id}"]`) as HTMLInputElement;
        quantityInput?.focus();
      }, 100);
    }
    setProductSearch("");
    setShowProductDropdown(false);
  };

  const addVariantsToOrder = async () => {
    if (!selectedProductForVariant) return;
    
    const selectedCurrency = form.watch('currency') || 'EUR';
    const variantsToAdd = Object.entries(variantQuantities).filter(([_, qty]) => qty > 0);
    
    if (variantsToAdd.length === 0) {
      toast({
        title: "No variants selected",
        description: "Please select at least one variant with quantity > 0",
        variant: "destructive",
      });
      return;
    }
    
    let addedCount = 0;
    let updatedCount = 0;
    
    for (const [variantId, quantity] of variantsToAdd) {
      const variant = productVariants.find(v => v.id === variantId);
      if (!variant) continue;
      
      // Check if this variant already exists in the order
      const existingItem = orderItems.find(
        item => item.productId === selectedProductForVariant.id && item.variantId === variantId
      );
      
      if (existingItem) {
        // Update existing item quantity
        setOrderItems(items =>
          items.map(item =>
            item.id === existingItem.id
              ? {
                  ...item,
                  quantity: item.quantity + quantity,
                  total: (item.quantity + quantity) * item.price
                }
              : item
          )
        );
        updatedCount++;
      } else {
        // Use product's price since variants don't have their own selling price
        let productPrice = 0;
        if (selectedCurrency === 'CZK' && selectedProductForVariant.priceCzk) {
          productPrice = parseFloat(selectedProductForVariant.priceCzk);
        } else if (selectedCurrency === 'EUR' && selectedProductForVariant.priceEur) {
          productPrice = parseFloat(selectedProductForVariant.priceEur);
        } else {
          productPrice = parseFloat(selectedProductForVariant.priceEur || selectedProductForVariant.priceCzk || '0');
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
          discount: 0,
          tax: 0,
          total: productPrice * quantity,
          landingCost: parseFloat(variant.importCostEur || variant.importCostCzk || '0') || null,
          image: variant.photo || selectedProductForVariant.image || null,
        };
        
        setOrderItems(items => [...items, newItem]);
        addedCount++;
      }
    }
    
    // Show appropriate toast message
    const messages = [];
    if (addedCount > 0) messages.push(`${addedCount} variant(s) added`);
    if (updatedCount > 0) messages.push(`${updatedCount} variant(s) updated`);
    
    toast({
      title: "Success",
      description: messages.join(', '),
    });
    
    setShowVariantDialog(false);
    setSelectedProductForVariant(null);
    setProductVariants([]);
    setVariantQuantities({});
  };

  const updateOrderItem = (id: string, field: keyof OrderItem, value: any) => {
    setOrderItems(items =>
      items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          if (field === 'quantity' || field === 'price' || field === 'discount') {
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setUploadedFiles(prev => [...prev, ...newFiles]);
      toast({
        title: "Success",
        description: `${newFiles.length} file(s) uploaded successfully`,
      });
    }
  };

  const removeUploadedFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    toast({
      title: "File removed",
      description: "File has been removed from the upload list",
    });
  };

  const calculateSubtotal = () => {
    return orderItems.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateTax = () => {
    const subtotal = calculateSubtotal();
    const taxRateValue = form.watch('taxRate');
    const taxRate = typeof taxRateValue === 'string' ? parseFloat(taxRateValue || '0') : (taxRateValue || 0);
    return (subtotal * taxRate) / 100;
  };

  const calculateGrandTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = showTaxInvoice ? calculateTax() : 0; // Only include tax if Tax Invoice is enabled
    const shippingValue = form.watch('shippingCost');
    const discountValue = form.watch('discountValue');
    const discountType = form.watch('discountType');
    const adjustmentValue = form.watch('adjustment');
    const shipping = typeof shippingValue === 'string' ? parseFloat(shippingValue || '0') : (shippingValue || 0);
    const discountAmount = typeof discountValue === 'string' ? parseFloat(discountValue || '0') : (discountValue || 0);
    const adjustment = typeof adjustmentValue === 'string' ? parseFloat(adjustmentValue || '0') : (adjustmentValue || 0);

    // Calculate actual discount based on type
    let actualDiscount = 0;
    if (discountType === 'rate') {
      actualDiscount = (subtotal * discountAmount) / 100;
    } else {
      actualDiscount = discountAmount;
    }

    return subtotal + tax + shipping + adjustment - actualDiscount;
  };

  const onSubmit = (data: z.infer<typeof editOrderSchema>) => {
    // Comprehensive validation
    const validationErrors: string[] = [];

    // Check if customer is selected
    if (!selectedCustomer) {
      validationErrors.push("Please select a customer");
    }

    // Check if at least one product is added
    if (orderItems.length === 0) {
      validationErrors.push("Please add at least one product to the order");
    }

    // Check if any product has zero or negative quantity
    const invalidQuantities = orderItems.filter(item => item.quantity <= 0);
    if (invalidQuantities.length > 0) {
      validationErrors.push("All products must have a quantity greater than 0");
    }

    // If there are validation errors, show them and prevent submission
    if (validationErrors.length > 0) {
      toast({
        title: "Cannot Update Order",
        description: (
          <div className="space-y-1">
            <p className="font-medium">Please fix the following issues:</p>
            <ul className="list-disc list-inside space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index} className="text-sm">{error}</li>
              ))}
            </ul>
          </div>
        ),
        variant: "destructive",
      });
      return;
    }

    const orderData = {
      ...data,
      // Don't override customerId - it's set in updateOrderMutation if a new customer is created
      shippingAddressId: selectedShippingAddress?.id || null,
      subtotal: calculateSubtotal().toFixed(2),
      taxAmount: (showTaxInvoice ? calculateTax() : 0).toFixed(2),
      grandTotal: calculateGrandTotal().toFixed(2),
      discountValue: (data.discountValue || 0).toString(),
      taxRate: (showTaxInvoice ? (data.taxRate || 0) : 0).toString(),
      shippingCost: (data.shippingCost || 0).toString(),
      actualShippingCost: (data.actualShippingCost || 0).toString(),
      adjustment: (data.adjustment || 0).toString(),
      dobirkaAmount: data.dobirkaAmount && data.dobirkaAmount > 0 ? data.dobirkaAmount.toString() : null,
      dobirkaCurrency: data.dobirkaAmount && data.dobirkaAmount > 0 ? (data.dobirkaCurrency || 'CZK') : null,
      items: orderItems.map(item => ({
        productId: item.productId || null,
        serviceId: item.serviceId || null,
        productName: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        price: item.price.toFixed(2),
        discount: item.discount.toFixed(2),
        tax: item.tax.toFixed(2),
        total: item.total.toFixed(2),
        variantId: item.variantId || null,
        variantName: item.variantName || null,
        bundleId: item.bundleId || null,
        landingCost: item.landingCost || null,
        notes: item.notes || null,
      })),
      includedDocuments: {
        uploadedFiles: uploadedFiles.map(f => ({ name: f.name, size: f.size })),
      },
      selectedDocumentIds: selectedDocumentIds.length > 0 ? selectedDocumentIds : undefined
    };

    updateOrderMutation.mutate(orderData);
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

  // Filter products with Vietnamese search, grouped by category, ordered by frequency (memoized for performance)
  // Includes bundles and variants
  const filteredProducts = useMemo(() => {
    if (!Array.isArray(allProducts)) return [];

    // Build combined list of products, bundles, and variants
    let allItems: any[] = [];
    
    // Add regular products
    allItems.push(...allProducts.map((p: any) => ({ ...p, itemType: 'product' })));
    
    // Add bundles
    if (Array.isArray(allBundles)) {
      allBundles.forEach((bundle: any) => {
        if (bundle.isActive) {
          allItems.push({
            id: bundle.id,
            name: bundle.name,
            sku: bundle.sku || bundle.bundleId,
            description: bundle.description,
            priceCzk: bundle.priceCzk,
            priceEur: bundle.priceEur,
            categoryName: 'Bundles',
            itemType: 'bundle',
            bundleId: bundle.id,
            availableStock: bundle.availableStock ?? 0,
            image: bundle.imageUrl || null, // Add bundle image
          });
        }
      });
    }
    
    // Add services
    if (Array.isArray(allServices)) {
      allServices.forEach((service: any) => {
        allItems.push({
          id: service.id,
          name: service.name,
          sku: 'SERVICE',
          description: service.description,
          totalCost: service.totalCost,
          categoryName: 'Services',
          itemType: 'service',
          isService: true,
        });
      });
    }
    
    // Add variants
    if (productsWithVariants) {
      Object.entries(productsWithVariants).forEach(([productId, variants]: [string, any]) => {
        const parentProduct = allProducts.find((p: any) => p.id === productId);
        if (parentProduct && Array.isArray(variants)) {
          variants.forEach((variant: any) => {
            allItems.push({
              id: variant.id,
              name: `${parentProduct.name} - ${variant.name}`,
              sku: variant.barcode || parentProduct.sku,
              description: parentProduct.description,
              priceCzk: parentProduct.priceCzk,
              priceEur: parentProduct.priceEur,
              categoryName: parentProduct.categoryName || 'Uncategorized',
              stockQuantity: variant.quantity,
              itemType: 'variant',
              variantId: variant.id,
              variantName: variant.name,
              productId: parentProduct.id,
              productName: parentProduct.name,
            });
          });
        }
      });
    }

    // If there's a search query, filter items
    let items = allItems;
    if (debouncedProductSearch && debouncedProductSearch.length >= 2) {
      const results = fuzzySearch(allItems, debouncedProductSearch, {
        fields: ['name', 'sku', 'description', 'categoryName'],
        threshold: 0.2,
        fuzzy: true,
        vietnameseNormalization: true,
      });
      items = results.map(r => r.item);
    }

    // Group items by category
    const groupedByCategory: Record<string, any[]> = {};
    items.forEach((item: any) => {
      const categoryName = item.categoryName || 'Uncategorized';
      if (!groupedByCategory[categoryName]) {
        groupedByCategory[categoryName] = [];
      }
      groupedByCategory[categoryName].push(item);
    });

    // Sort items within each category by frequency (descending), then alphabetically by name
    Object.keys(groupedByCategory).forEach(categoryName => {
      groupedByCategory[categoryName].sort((a, b) => {
        const freqA = productFrequency[a.productId || a.id] || 0;
        const freqB = productFrequency[b.productId || b.id] || 0;
        
        if (freqB !== freqA) {
          return freqB - freqA; // Higher frequency first
        }
        
        // If same frequency, sort alphabetically
        return a.name.localeCompare(b.name);
      });
    });

    // Convert to array of { category, products } and limit total products
    const categorizedProducts: Array<{ category: string; products: any[] }> = [];
    let totalProductsCount = 0;
    const hasSearchTerm = debouncedProductSearch && debouncedProductSearch.length >= 2;
    const maxTotalProducts = hasSearchTerm ? 30 : Number.MAX_SAFE_INTEGER; // Limit to 30 when searching, show ALL when empty

    // Sort categories alphabetically, but bundles last
    const sortedCategories = Object.keys(groupedByCategory).sort((a, b) => {
      if (a === 'Bundles') return 1;
      if (b === 'Bundles') return -1;
      return a.localeCompare(b);
    });

    for (const categoryName of sortedCategories) {
      const categoryProducts = groupedByCategory[categoryName];
      const remainingSlots = maxTotalProducts - totalProductsCount;
      
      if (remainingSlots <= 0) break;

      const productsToShow = categoryProducts.slice(0, Math.min(categoryProducts.length, remainingSlots));
      
      if (productsToShow.length > 0) {
        categorizedProducts.push({
          category: categoryName,
          products: productsToShow
        });
        totalProductsCount += productsToShow.length;
      }
    }

    return categorizedProducts;
  }, [allProducts, allBundles, productsWithVariants, debouncedProductSearch, productFrequency]);

  // Filter customers with Vietnamese search (memoized for performance)
  const filteredCustomers = useMemo(() => {
    if (!Array.isArray(allCustomers) || !debouncedCustomerSearch || debouncedCustomerSearch.length < 2) return [];

    const results = fuzzySearch(allCustomers, debouncedCustomerSearch, {
      fields: ['name', 'facebookName', 'email', 'phone'],
      threshold: 0.2,
      fuzzy: true,
      vietnameseNormalization: true,
    });

    return results.map(r => r.item).slice(0, 8); // Limit to 8 results for better UX
  }, [allCustomers, debouncedCustomerSearch]);

  // Dummy function for calculateTotals, as it's not provided in the original code snippet
  // This needs to be implemented or removed if not used elsewhere.
  const calculateTotals = () => {
    // This function is called when discountId changes, implying it should recalculate totals.
    // For now, we'll leave it as a placeholder.
    console.log("calculateTotals called");
  };

  // Fetch available discounts (assuming this is needed for the discount dropdown)
  const { data: discounts } = useQuery({
    queryKey: ['/api/discounts'],
  });


  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-3 sm:p-4 lg:p-6 max-w-7xl mx-auto">
        {/* Header - Mobile Optimized */}
        <div className="bg-white rounded-lg shadow-sm mb-4 lg:mb-6 p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.history.back()}
                className="w-fit"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Back to Orders</span>
                <span className="sm:hidden">Back</span>
              </Button>
              <div className="hidden sm:block h-6 w-px bg-gray-200" />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Edit Order</h1>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">Update products and configure details</p>
              </div>
            </div>
            <Badge variant="outline" className="text-blue-600 border-blue-600 w-fit">
              <Save className="h-3 w-3 mr-1" />
              Edit Order
            </Badge>
          </div>
        </div>

        <form id="edit-order-form" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-4 sm:space-y-6">
            {/* Order Location - Mobile Only (at top) */}
            <Card className="lg:hidden shadow-sm">
              <CardHeader className="p-3 border-b">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  Order Location
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <Input
                  placeholder="e.g., Prague Warehouse, Main Office, Customer Pickup"
                  value={form.watch('orderLocation') || ''}
                  onChange={(e) => form.setValue('orderLocation', e.target.value)}
                  data-testid="input-order-location"
                />
              </CardContent>
            </Card>

            {/* 2-Column Grid for Desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              
              {/* Left Column - Main Workflow */}
              <div className="lg:col-span-2 space-y-4 sm:space-y-6">

            {/* Customer Selection - Mobile Optimized */}
            <Card className="shadow-sm">
              <CardHeader className="p-3 border-b">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <User className="h-4 w-4 text-blue-600" />
                  Customer Details
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-1">Search and select or create new</CardDescription>
              </CardHeader>
              <CardContent className="p-3 space-y-3">
            {/* Quick Customer Options */}
            {!selectedCustomer && !quickCustomerType && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Quick Customer</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                    Quick
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
                    Tel
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
                    Msg
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
                    Custom
                  </Button>
                </div>
                <Separator className="my-3" />
              </div>
            )}

            {/* Quick Customer Forms */}
            {quickCustomerType && !selectedCustomer && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-blue-900">
                    {quickCustomerType === 'quick' && 'Quick Customer (One-time)'}
                    {quickCustomerType === 'tel' && 'Telephone Order'}
                    {quickCustomerType === 'msg' && 'Social Media Customer'}
                    {quickCustomerType === 'custom' && 'Custom Customer (One-time)'}
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
                  <Label htmlFor="quickCustomerName">Name *</Label>
                  <Input
                    id="quickCustomerName"
                    value={quickCustomerName}
                    onChange={(e) => setQuickCustomerName(e.target.value)}
                    placeholder="Enter customer name"
                    data-testid="input-quick-customer-name"
                  />
                </div>

                {/* Phone field - shown for Tel and Msg */}
                {(quickCustomerType === 'tel' || quickCustomerType === 'msg') && (
                  <div>
                    <Label htmlFor="quickCustomerPhone">
                      {quickCustomerType === 'msg' ? 'ID/Phone Number *' : 'Phone *'}
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
                    <p className="text-xs text-slate-500 mt-1">Format without spaces (e.g. +420776887045)</p>
                  </div>
                )}

                {/* Social Media App - shown for Msg only */}
                {quickCustomerType === 'msg' && (
                  <div>
                    <Label htmlFor="quickCustomerSocialApp">Social Media App *</Label>
                    <Select 
                      value={quickCustomerSocialApp} 
                      onValueChange={(value: any) => setQuickCustomerSocialApp(value)}
                    >
                      <SelectTrigger data-testid="select-social-app">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viber">Viber</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="zalo">Zalo</SelectItem>
                        <SelectItem value="email">E-mail</SelectItem>
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
                        title: "Name required",
                        description: "Please enter a customer name",
                        variant: "destructive"
                      });
                      return;
                    }

                    if ((quickCustomerType === 'tel' || quickCustomerType === 'msg') && !quickCustomerPhone.trim()) {
                      toast({
                        title: "Phone required",
                        description: "Please enter a phone number",
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
                  Confirm
                </Button>
              </div>
            )}

            <div className="relative customer-search-container">
              <Label htmlFor="customer">Search Customer</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  ref={customerSearchRef}
                  placeholder="Type to search customers (Vietnamese diacritics supported)..."
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    // Clear selected customer when user starts typing to search for a new one
                    if (selectedCustomer) {
                      setSelectedCustomer(null);
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
                        if (firstCustomer.hasPayLaterBadge) {
                          form.setValue('paymentStatus', 'pay_later');
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
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Real-time dropdown for customers */}
              {showCustomerDropdown && filteredCustomers && filteredCustomers.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 border rounded-md shadow-lg bg-white max-h-96 overflow-y-auto z-50">
                  <div className="p-2 bg-slate-50 border-b text-xs text-slate-600 sticky top-0 z-10">
                    {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''} found
                  </div>
                  {filteredCustomers.map((customer: any) => (
                    <div
                      key={customer.id}
                      className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 transition-colors"
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setCustomerSearch(customer.name);
                        setShowCustomerDropdown(false);
                        // Auto-set payment status to Pay Later if customer has Pay Later badge
                        if (customer.hasPayLaterBadge) {
                          form.setValue('paymentStatus', 'pay_later');
                        }
                        // Auto-focus product search for fast keyboard navigation
                        setTimeout(() => {
                          productSearchRef.current?.focus();
                        }, 100);
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        {/* Left side - Main info */}
                        <div className="flex-1 min-w-0">
                          {/* Name, flag, and badges */}
                          <div className="font-medium text-slate-900 flex items-center gap-2 flex-wrap mb-1">
                            <span className="flex items-center gap-1.5">
                              {customer.country && (
                                <span className="text-base">{getCountryFlag(customer.country)}</span>
                              )}
                              <span className="truncate">{customer.name}</span>
                            </span>
                            {customer.hasPayLaterBadge && (
                              <Badge variant="outline" className="text-xs bg-yellow-50 border-yellow-300 text-yellow-700">
                                Pay Later
                              </Badge>
                            )}
                            {customer.type && customer.type !== 'regular' && (
                              <Badge variant="outline" className="text-xs bg-slate-100 border-slate-300 text-slate-600 capitalize">
                                {customer.type}
                              </Badge>
                            )}
                          </div>
                          
                          {/* Company */}
                          {customer.company && (
                            <div className="text-xs text-slate-600 flex items-center gap-1 mb-1">
                              <Building className="h-3 w-3 shrink-0" />
                              <span className="truncate">{customer.company}</span>
                            </div>
                          )}
                          
                          {/* Location */}
                          {(customer.city || customer.country) && (
                            <div className="text-xs text-slate-500 flex items-center gap-1 mb-1">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate">
                                {[customer.city, customer.country].filter(Boolean).join(', ')}
                              </span>
                            </div>
                          )}
                          
                          {/* Facebook name */}
                          {customer.facebookName && customer.facebookName !== customer.name && (
                            <div className="text-xs text-blue-600 flex items-center gap-1">
                              <span className="shrink-0">FB:</span>
                              <span className="truncate">{customer.facebookName}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Right side - Contact info */}
                        <div className="text-right shrink-0">
                          {customer.phone && (
                            <div className="text-xs text-slate-600 mb-1">
                              <Phone className="h-3 w-3 inline mr-1" />
                              {customer.phone}
                            </div>
                          )}
                          {customer.email && (
                            <div className="text-xs text-slate-500 truncate max-w-[200px]">
                              <Mail className="h-3 w-3 inline mr-1" />
                              {customer.email}
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
                <div className="absolute top-full left-0 right-0 mt-1 border rounded-md bg-white shadow-lg p-4 text-center text-slate-500 z-50">
                  <Search className="h-6 w-6 mx-auto mb-2 text-slate-400" />
                  <div>No customers found for "{customerSearch}"</div>
                  <div className="text-xs mt-1">Try searching by name, email, or Facebook name</div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      setShowNewCustomerForm(true);
                      setNewCustomer({ ...newCustomer, name: customerSearch });
                      setShowCustomerDropdown(false);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add new customer
                  </Button>
                </div>
              )}
            </div>

            {/* Selected customer display */}
            {selectedCustomer && (
              <Card className="mt-4 border-2 border-green-500 bg-white">
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
                              <span className="text-xl">{getCountryFlag(selectedCustomer.country)}</span>
                            )}
                            <h3 className="text-sm font-semibold text-slate-900">
                              {selectedCustomer.name}
                            </h3>
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          </div>
                          
                          {/* Badges */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {selectedCustomer.isTemporary && (
                              <Badge variant="outline" className="text-xs bg-purple-50 border-purple-300 text-purple-700">
                                One-time
                              </Badge>
                            )}
                            {selectedCustomer.needsSaving && (
                              <Badge variant="outline" className="text-xs bg-green-50 border-green-300 text-green-700">
                                New Customer
                              </Badge>
                            )}
                            {selectedCustomer.hasPayLaterBadge && (
                              <Badge className="bg-purple-50 text-purple-700 border-purple-300 text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                Pay Later
                              </Badge>
                            )}
                            {selectedCustomer.preferredCurrency && (
                              <Badge variant="outline" className="text-xs bg-slate-50 border-slate-300 text-slate-700">
                                {selectedCustomer.preferredCurrency}
                              </Badge>
                            )}
                            {selectedCustomer.type && selectedCustomer.type !== 'regular' && (
                              <Badge variant="outline" className="text-xs bg-slate-100 border-slate-300 text-slate-700 capitalize">
                                {selectedCustomer.type}
                              </Badge>
                            )}
                          </div>
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
                          <div className="flex items-center gap-2 text-sm text-slate-700">
                            <Phone className="h-4 w-4 text-slate-500" />
                            <span>{selectedCustomer.phone}</span>
                            {selectedCustomer.socialMediaApp && (
                              <Badge variant="secondary" className="text-xs">{selectedCustomer.socialMediaApp}</Badge>
                            )}
                          </div>
                        )}
                        {selectedCustomer.email && (
                          <div className="flex items-center gap-2 text-sm text-slate-700 truncate">
                            <Mail className="h-4 w-4 text-slate-500 shrink-0" />
                            <span className="truncate">{selectedCustomer.email}</span>
                          </div>
                        )}
                        {selectedCustomer.company && (
                          <div className="flex items-center gap-2 text-sm text-slate-700">
                            <Building className="h-4 w-4 text-slate-500" />
                            <span>{selectedCustomer.company}</span>
                          </div>
                        )}
                        {(selectedCustomer.city || selectedCustomer.country) && (
                          <div className="flex items-center gap-2 text-sm text-slate-700">
                            <MapPin className="h-4 w-4 text-slate-500" />
                            <span>{[selectedCustomer.city, selectedCustomer.country].filter(Boolean).join(', ')}</span>
                          </div>
                        )}
                      </div>
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
                    Shipping Address
                  </CardTitle>
                  <CardDescription>Select or add a shipping address for this order</CardDescription>
                </CardHeader>
                <CardContent className="p-3 space-y-3">
                  {isLoadingShippingAddresses ? (
                    <div className="text-center py-4 text-slate-500">Loading addresses...</div>
                  ) : shippingAddresses && Array.isArray(shippingAddresses) && shippingAddresses.length > 0 ? (
                    <RadioGroup
                      value={selectedShippingAddress?.id || ""}
                      onValueChange={(value) => {
                        const address = shippingAddresses.find((a: any) => a.id === value);
                        setSelectedShippingAddress(address);
                      }}
                      data-testid="radiogroup-shipping-addresses"
                    >
                      {shippingAddresses.map((address: any) => (
                        <div
                          key={address.id}
                          className={`rounded-lg border-2 transition-all relative ${
                            selectedShippingAddress?.id === address.id
                              ? 'border-teal-500 bg-teal-50/50 shadow-sm'
                              : address.isPrimary
                              ? 'border-amber-300 bg-amber-50/30'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                          data-testid={`card-address-${address.id}`}
                        >
                          <div className="flex items-start gap-3 p-4">
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
                              <div className="flex items-start gap-3">
                                <MapPin className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                <div className="text-sm text-slate-700 space-y-0.5 select-none flex-1">
                                  {/* Name */}
                                  <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                    {address.firstName} {address.lastName}
                                    {address.isPrimary && (
                                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                    )}
                                  </div>
                                  {/* Company */}
                                  {address.company && (
                                    <div className="font-medium text-slate-800">
                                      {address.company}
                                    </div>
                                  )}
                                  {/* Street and Number */}
                                  <div className="text-slate-700">
                                    {address.street}{address.streetNumber && ` ${address.streetNumber}`}
                                  </div>
                                  {/* Postal Code and City */}
                                  <div className="text-slate-700">
                                    {address.zipCode} {address.city}
                                  </div>
                                  {/* State (if exists) */}
                                  {address.state && (
                                    <div className="text-slate-700">{address.state}</div>
                                  )}
                                  {/* Country */}
                                  <div className="text-slate-700 font-medium">
                                    {address.country}
                                  </div>
                                  {/* Contact Info */}
                                  {(address.tel || address.email) && (
                                    <div className="pt-2 space-y-1 border-t border-slate-200 mt-2">
                                      {address.tel && (
                                        <div className="flex items-center gap-2 text-slate-600">
                                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                                          <span className="text-xs">{address.tel}</span>
                                        </div>
                                      )}
                                      {address.email && (
                                        <div className="flex items-center gap-2 text-slate-600">
                                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                                          <span className="text-xs">{address.email}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            {/* Action buttons */}
                            <div className="flex flex-col gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className={`h-8 w-8 ${address.isPrimary ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (address.isPrimary) {
                                    removePrimaryShippingAddressMutation.mutate(address.id);
                                  } else {
                                    setPrimaryShippingAddressMutation.mutate(address.id);
                                  }
                                }}
                                data-testid={`button-star-address-${address.id}`}
                                title={address.isPrimary ? "Remove from primary" : "Set as primary"}
                              >
                                <Star className={`h-3.5 w-3.5 ${address.isPrimary ? 'fill-amber-500' : ''}`} />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const addressText = [
                                    `${address.firstName} ${address.lastName}`,
                                    address.company,
                                    `${address.street}${address.streetNumber ? ` ${address.streetNumber}` : ''}`,
                                    `${address.zipCode} ${address.city}`,
                                    address.state,
                                    address.country,
                                    address.tel ? `Tel: ${address.tel}` : '',
                                    address.email ? `Email: ${address.email}` : ''
                                  ].filter(Boolean).join('\n');
                                  
                                  navigator.clipboard.writeText(addressText);
                                  toast({
                                    title: "Copied!",
                                    description: "Address copied to clipboard",
                                  });
                                }}
                                data-testid={`button-copy-address-${address.id}`}
                                title="Copy address"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingAddress(address);
                                  setShowShippingModal(true);
                                }}
                                data-testid={`button-edit-address-${address.id}`}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAddressToDelete(address);
                                }}
                                data-testid={`button-delete-address-${address.id}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </RadioGroup>
                  ) : (
                    <div className="text-center py-4 text-slate-500">
                      No shipping addresses found. Add one below.
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
                    Add New Address
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* New customer form */}
            {showNewCustomerForm && (
              <div className="space-y-4 border border-slate-200 bg-slate-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-slate-900">New Customer Details</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowNewCustomerForm(false);
                      setAddressAutocomplete("");
                      setRawNewCustomerAddress("");
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
                    <Label htmlFor="customerName">Customer Name *</Label>
                    <Input
                      id="customerName"
                      value={newCustomer.name}
                      onChange={(e) => {
                        const newName = e.target.value;
                        // Update customer name and also mirror to Facebook name if it's empty or matches the previous name
                        setNewCustomer(prev => ({
                          ...prev,
                          name: newName,
                          // Mirror to Facebook name if it's currently empty or was previously mirroring
                          facebookName: prev.facebookName === prev.name || prev.facebookName === "" ? newName : prev.facebookName
                        }));
                      }}
                      placeholder="Type here"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="facebookName">Facebook Name</Label>
                    <Input
                      id="facebookName"
                      value={newCustomer.facebookName || ""}
                      onChange={(e) => {
                        console.log('Facebook Name changed to:', e.target.value);
                        setNewCustomer({ ...newCustomer, facebookName: e.target.value });
                      }}
                      placeholder="Facebook display name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="facebookUrl">Facebook URL</Label>
                    <Input
                      id="facebookUrl"
                      value={newCustomer.facebookUrl}
                      onChange={(e) => setNewCustomer({ ...newCustomer, facebookUrl: e.target.value })}
                      placeholder="Place URL or Type"
                    />
                  </div>
                </div>

                {/* Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="customerEmail">Email</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={newCustomer.email}
                      onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerPhone">Phone</Label>
                    <Input
                      id="customerPhone"
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                      placeholder="Type here"
                    />
                  </div>
                  <div>
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      value={newCustomer.company}
                      onChange={(e) => setNewCustomer({ ...newCustomer, company: e.target.value })}
                      placeholder="Type here"
                    />
                  </div>
                </div>

                {/* Smart Paste */}
                <div className="space-y-2">
                  <Label htmlFor="rawNewCustomerAddress">Smart Paste</Label>
                  <p className="text-sm text-muted-foreground">
                    Paste any address info and we'll split it automatically
                  </p>
                  <Textarea
                    id="rawNewCustomerAddress"
                    value={rawNewCustomerAddress}
                    onChange={(e) => setRawNewCustomerAddress(e.target.value)}
                    placeholder="e.g., Nguyen anh van, Potocni 1299 vejprty, Bưu điện 43191 vejprty, Sdt 607638460"
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
                        Parsing...
                      </>
                    ) : (
                      'Parse & Fill'
                    )}
                  </Button>
                </div>

                {/* Address Autocomplete */}
                <div className="space-y-2">
                  <Label htmlFor="addressAutocomplete">Address Search (optional)</Label>
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
                      placeholder="Start typing an address..."
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
                      <div className="absolute top-full left-0 right-0 mt-1 border rounded-md shadow-lg bg-white max-h-72 overflow-y-auto z-50">
                        {isLoadingAddresses ? (
                          <div className="p-4 text-center text-slate-500">
                            <div className="text-sm">Searching addresses...</div>
                          </div>
                        ) : addressSuggestions.length > 0 ? (
                          <>
                            <div className="p-2 bg-slate-50 border-b text-xs text-slate-600">
                              {addressSuggestions.length} address{addressSuggestions.length !== 1 ? 'es' : ''} found
                            </div>
                            {addressSuggestions.map((suggestion, index) => (
                              <div
                                key={index}
                                className="p-3 hover:bg-slate-100 cursor-pointer border-b last:border-b-0 transition-colors"
                                onClick={() => selectAddress(suggestion)}
                              >
                                <div className="font-medium text-slate-900">
                                  {suggestion.formatted}
                                </div>
                              </div>
                            ))}
                          </>
                        ) : (
                          <div className="p-4 text-center text-slate-500">
                            <div className="text-sm">No addresses found</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    Search for an official address to auto-fill the fields below
                  </p>
                </div>

                {/* Address Information */}
                <div className="space-y-2">
                  <Label>Shipping Address</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <Input
                        id="street"
                        value={newCustomer.street}
                        onChange={(e) => setNewCustomer({ ...newCustomer, street: e.target.value })}
                        placeholder="Street name"
                      />
                    </div>
                    <div>
                      <Input
                        id="streetNumber"
                        value={newCustomer.streetNumber}
                        onChange={(e) => setNewCustomer({ ...newCustomer, streetNumber: e.target.value })}
                        placeholder="Number"
                      />
                    </div>
                    <div>
                      <Input
                        id="city"
                        value={newCustomer.city}
                        onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
                        placeholder="City"
                      />
                    </div>
                    <div>
                      <Input
                        id="zipCode"
                        value={newCustomer.zipCode}
                        onChange={(e) => setNewCustomer({ ...newCustomer, zipCode: e.target.value })}
                        placeholder="Postal Code"
                      />
                    </div>
                    <div>
                      <Input
                        id="country"
                        value={newCustomer.country}
                        onChange={(e) => setNewCustomer({ ...newCustomer, country: e.target.value })}
                        placeholder="Country"
                      />
                    </div>
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
                  Add Customer to Order
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
              Products
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-1">Search and add products to order</CardDescription>
          </CardHeader>
          <CardContent className="sticky top-0 z-40 p-3 space-y-3 bg-white dark:bg-slate-950 border-b shadow-sm backdrop-blur-sm">
            <div className="relative product-search-container">
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="product">Search Products</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={barcodeScanMode ? "default" : "outline"}
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={() => {
                      setBarcodeScanMode(!barcodeScanMode);
                      toast({
                        title: barcodeScanMode ? "Barcode scan mode OFF" : "Barcode scan mode ON",
                        description: barcodeScanMode 
                          ? "Normal mode: Products clear after adding" 
                          : "Rapid mode: Keep scanning without clearing",
                      });
                    }}
                  >
                    <Package className="h-3 w-3 mr-1" />
                    {barcodeScanMode ? "Scan Mode: ON" : "Scan Mode: OFF"}
                  </Button>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  ref={productSearchRef}
                  placeholder="Click to see all products (Vietnamese diacritics supported)..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-10"
                  onFocus={() => setShowProductDropdown(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setShowProductDropdown(false);
                    }
                    // Enter: Add first product from dropdown
                    if (e.key === 'Enter' && filteredProducts.length > 0) {
                      e.preventDefault();
                      const firstProduct = filteredProducts[0]?.products?.[0];
                      if (firstProduct) {
                        addProductToOrder(firstProduct);
                        if (!barcodeScanMode) {
                          setProductSearch('');
                          setShowProductDropdown(false);
                        }
                      }
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

              {/* Real-time dropdown for products - Grouped by Category */}
              {showProductDropdown && filteredProducts && filteredProducts.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 border rounded-md shadow-lg bg-white max-h-96 overflow-y-auto z-50">
                  <div className="p-2 bg-slate-50 border-b text-xs text-slate-600 sticky top-0 z-10">
                    {(() => {
                      const totalProducts = filteredProducts.reduce((sum, cat) => sum + cat.products.length, 0);
                      return `${totalProducts} product${totalProducts !== 1 ? 's' : ''} found - Click to add`;
                    })()}
                  </div>
                  {filteredProducts.map((categoryGroup) => (
                    <div key={categoryGroup.category} className="border-b last:border-b-0">
                      {/* Category Header */}
                      <div className="bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 sticky top-8 z-10 border-b border-slate-200">
                        {categoryGroup.category}
                      </div>
                      {/* Products in Category */}
                      {categoryGroup.products.map((product: any) => {
                        const frequency = productFrequency[product.productId || product.id] || 0;
                        return (
                          <button
                            type="button"
                            key={product.id}
                            className="w-full p-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 transition-colors text-left"
                            onClick={() => {
                              addProductToOrder(product);
                            }}
                            data-testid={`product-item-${product.id}`}
                          >
                            <div className="flex items-center gap-3">
                              {/* Product Image */}
                              <div className="flex-shrink-0">
                                {product.image ? (
                                  <img 
                                    src={product.image} 
                                    alt={product.name}
                                    className="w-12 h-12 object-contain rounded border border-slate-200 bg-slate-50"
                                  />
                                ) : (
                                  <div className="w-12 h-12 bg-slate-100 rounded border border-slate-200 flex items-center justify-center">
                                    <Package className="h-6 w-6 text-slate-300" />
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="font-medium text-slate-900">{product.name}</div>
                                  {product.itemType === 'bundle' && (
                                    <Badge className="text-xs px-1.5 py-0 bg-purple-100 text-purple-700 border-purple-300">
                                      Bundle
                                    </Badge>
                                  )}
                                  {product.itemType === 'variant' && (
                                    <Badge className="text-xs px-1.5 py-0 bg-blue-100 text-blue-700 border-blue-300">
                                      Variant
                                    </Badge>
                                  )}
                                  {frequency > 0 && (
                                    <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                      {frequency}x
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-sm text-slate-500">SKU: {product.sku}</div>
                                
                                <div className="text-right mt-1">
                                  <div className="font-medium text-slate-900">
                                    {(() => {
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
                                    })()}
                                  </div>
                                  <div className="text-sm text-slate-500">
                                    Stock: {product.itemType === 'bundle' ? (product.availableStock ?? 0) : (product.stockQuantity || product.quantity || 0)}
                                  </div>
                                  {product.warehouseName && (
                                    <div className="text-xs text-slate-400">{product.warehouseName}</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}

              {/* No results message */}
              {showProductDropdown && productSearch.length >= 2 && (!filteredProducts || filteredProducts.length === 0) && (
                <div className="absolute top-full left-0 right-0 mt-1 border rounded-md bg-white shadow-lg p-4 text-center text-slate-500 z-50">
                  <Search className="h-6 w-6 mx-auto mb-2 text-slate-400" />
                  <div>No products found for "{productSearch}"</div>
                  <div className="text-xs mt-1">Try searching by name, SKU, or category</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Order Items - Mobile Optimized */}
        <Card className="shadow-sm">
          <CardHeader className="p-3 border-b">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <ShoppingCart className="h-4 w-4 text-blue-600" />
                  Order Items
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-1">
                  {orderItems.length > 0 ? `${orderItems.length} item${orderItems.length !== 1 ? 's' : ''} added` : 'No items yet'}
                </CardDescription>
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
                      VAT
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
                      Discount
                    </label>
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-3">
            {orderItems.length > 0 ? (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle">
                  <div className="overflow-hidden border border-slate-200 dark:border-slate-700 rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                          <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Product</TableHead>
                          <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-center">Qty</TableHead>
                          <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-right">Price</TableHead>
                          {showDiscountColumn && (
                            <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-right">Discount</TableHead>
                          )}
                          {showVatColumn && (
                            <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-right">VAT</TableHead>
                          )}
                          <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-right">Total</TableHead>
                          <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-center w-20">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orderItems.map((item, index) => (
                          <Fragment key={item.id}>
                          <TableRow 
                            className={index % 2 === 0 ? 'bg-white dark:bg-slate-950' : 'bg-slate-50/50 dark:bg-slate-900/30'}
                            data-testid={`order-item-${item.id}`}
                          >
                            <TableCell className="py-3">
                              <div className="flex items-start gap-3">
                                {/* Product Image */}
                                <div className="flex-shrink-0">
                                  {item.image ? (
                                    <img 
                                      src={item.image} 
                                      alt={item.productName}
                                      className="w-12 h-12 object-contain rounded border border-slate-200 bg-slate-50"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 bg-slate-100 rounded border border-slate-200 flex items-center justify-center">
                                      <Package className="h-6 w-6 text-slate-300" />
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-slate-900 dark:text-slate-100">
                                      {item.productName}
                                    </span>
                                  {item.variantName && (
                                    <Badge className="text-xs px-1.5 py-0 bg-blue-100 text-blue-700 border-blue-300">
                                      {item.variantName}
                                    </Badge>
                                  )}
                                  {item.bundleId && (
                                    <Badge className="text-xs px-1.5 py-0 bg-purple-100 text-purple-700 border-purple-300">
                                      Bundle
                                    </Badge>
                                  )}
                                  {item.serviceId && (
                                    <Badge variant="outline" className="text-xs px-1.5 py-0 border-orange-500 text-orange-600">
                                      Service
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  {item.serviceId ? 'Service Item' : `SKU: ${item.sku}`}
                                </span>
                                {item.serviceId && (
                                  <div className="mt-1 space-y-1">
                                    <Input
                                      placeholder="Add note (optional)"
                                      value={item.notes || ''}
                                      onChange={(e) => updateOrderItem(item.id, 'notes', e.target.value)}
                                      className="text-xs h-7 bg-purple-50 border-purple-200 text-purple-900 placeholder:text-purple-400"
                                      data-testid={`input-notes-${item.id}`}
                                    />
                                    <div className="flex flex-wrap gap-1">
                                      {QUICK_NOTE_TEMPLATES.slice(0, 3).map((template, idx) => (
                                        <Button
                                          key={idx}
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          className="h-5 px-1.5 text-[10px] bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700"
                                          onClick={() => updateOrderItem(item.id, 'notes', template)}
                                        >
                                          {template.split(' - ')[0]}
                                        </Button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center align-middle">
                              <div className="flex justify-center">
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => updateOrderItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                                  className="w-20 h-10 text-center"
                                  data-testid={`input-quantity-${item.id}`}
                                  onFocus={(e) => e.target.select()}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      productSearchRef.current?.focus();
                                    } else if (e.key === 'Tab') {
                                      e.preventDefault();
                                      const shippingCostInput = document.querySelector('[data-testid="input-shipping-cost"]') as HTMLInputElement;
                                      shippingCostInput?.focus();
                                    }
                                  }}
                                />
                              </div>
                            </TableCell>
                            <TableCell className="text-right align-middle">
                              <div className="flex justify-end">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.price}
                                  onChange={(e) => updateOrderItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                                  className="w-28 h-10 text-right"
                                  data-testid={`input-price-${item.id}`}
                                  onFocus={(e) => e.target.select()}
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
                              </div>
                            </TableCell>
                            {showDiscountColumn && (
                              <TableCell className="text-right align-middle">
                                <div className="flex justify-end">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={item.discount}
                                    onChange={(e) => updateOrderItem(item.id, 'discount', parseFloat(e.target.value) || 0)}
                                    className="w-28 h-10 text-right"
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
                                </div>
                              </TableCell>
                            )}
                            {showVatColumn && (
                              <TableCell className="text-right align-middle">
                                <div className="flex justify-end">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={item.tax}
                                    onChange={(e) => updateOrderItem(item.id, 'tax', parseFloat(e.target.value) || 0)}
                                    className="w-28 h-10 text-right"
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
                            <TableCell className="text-right font-semibold text-slate-900 dark:text-slate-100 align-middle">
                              {formatCurrency(item.total, form.watch('currency'))}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-9 w-9 p-0 hover:bg-slate-100 dark:hover:bg-slate-800"
                                      data-testid={`button-more-${item.id}`}
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
                                      data-testid={`menu-item-note-${item.id}`}
                                    >
                                      <StickyNote className="h-4 w-4 mr-2" />
                                      {item.notes ? 'Edit Note' : 'Add Note'}
                                    </DropdownMenuItem>
                                    <DropdownMenuSub>
                                      <DropdownMenuSubTrigger>
                                        <Package className="h-4 w-4 mr-2" />
                                        Quick Fill Note
                                      </DropdownMenuSubTrigger>
                                      <DropdownMenuSubContent>
                                        {QUICK_NOTE_TEMPLATES.map((template, idx) => (
                                          <DropdownMenuItem
                                            key={idx}
                                            onClick={() => {
                                              updateOrderItem(item.id, 'notes', template);
                                              setExpandedNotes(new Set(expandedNotes).add(item.id));
                                            }}
                                            className="text-xs"
                                          >
                                            {template}
                                          </DropdownMenuItem>
                                        ))}
                                      </DropdownMenuSubContent>
                                    </DropdownMenuSub>
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
                          {item.notes && (
                            <TableRow className={index % 2 === 0 ? 'bg-white dark:bg-slate-950' : 'bg-slate-50/50 dark:bg-slate-900/30'}>
                              <TableCell colSpan={6 + (showDiscountColumn ? 1 : 0) + (showVatColumn ? 1 : 0)}>
                                <Collapsible
                                  open={expandedNotes.has(item.id)}
                                  onOpenChange={(open) => {
                                    const newExpanded = new Set(expandedNotes);
                                    if (open) {
                                      newExpanded.add(item.id);
                                    } else {
                                      newExpanded.delete(item.id);
                                    }
                                    setExpandedNotes(newExpanded);
                                  }}
                                >
                                  <CollapsibleTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="w-full justify-start text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                                      data-testid={`button-toggle-note-${item.id}`}
                                    >
                                      <StickyNote className="h-3 w-3 mr-1.5" />
                                      {expandedNotes.has(item.id) ? 'Hide' : 'Show'} Shipping Notes
                                      <ChevronDown className={`h-3 w-3 ml-1 transition-transform ${expandedNotes.has(item.id) ? 'rotate-180' : ''}`} />
                                    </Button>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent className="pt-2">
                                    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-3">
                                      <div className="flex items-start gap-2">
                                        <StickyNote className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                          <p className="text-xs font-semibold text-amber-900 dark:text-amber-100 mb-1">Shipping Notes:</p>
                                          <p className="text-sm text-amber-800 dark:text-amber-200 whitespace-pre-wrap">{item.notes}</p>
                                        </div>
                                      </div>
                                    </div>
                                  </CollapsibleContent>
                                </Collapsible>
                              </TableCell>
                            </TableRow>
                          )}
                          </Fragment>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/20 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700">
                <ShoppingCart className="mx-auto h-12 w-12 mb-4 text-slate-400 dark:text-slate-600" />
                <p className="font-medium text-slate-700 dark:text-slate-300">No items added to order yet</p>
                <p className="text-sm mt-1">Search and select products above to add them</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Document Selection */}
        <OrderDocumentSelector
          orderItems={orderItems.map(item => ({
            id: item.id,
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            quantity: item.quantity
          }))}
          selectedDocumentIds={selectedDocumentIds}
          onDocumentSelectionChange={setSelectedDocumentIds}
          customerId={selectedCustomer?.id}
          existingOrderId={existingOrder?.id}
        />

        {/* AI Carton Packing Optimization Panel */}
        <AICartonPackingPanel
          packingPlan={packingPlan}
          onRunOptimization={runPackingOptimization}
          isLoading={isPackingOptimizationLoading}
          currency={form.watch('currency')}
          orderItems={orderItems}
        />

        {/* Payment Details - Mobile Optimized */}
        <Card className="shadow-sm">
          <CardHeader className="p-3 border-b">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <CreditCard className="h-4 w-4 text-blue-600" />
              Payment Details
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-1">Configure pricing and notes</CardDescription>
          </CardHeader>
          <CardContent className="p-3 space-y-3">
            {/* Shipping & Payment Methods */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label htmlFor="shippingMethod" className="text-sm">Shipping Method</Label>
                <Select value={form.watch('shippingMethod')} onValueChange={(value) => form.setValue('shippingMethod', value as any)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select shipping" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GLS">GLS</SelectItem>
                    <SelectItem value="PPL">PPL</SelectItem>
                    <SelectItem value="DHL">DHL</SelectItem>
                    <SelectItem value="DPD">DPD</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="paymentMethod" className="text-sm">Payment Method</Label>
                <Select value={form.watch('paymentMethod')} onValueChange={(value) => form.setValue('paymentMethod', value as any)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select payment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="PayPal">PayPal</SelectItem>
                    <SelectItem value="COD">COD</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
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
                className="w-full h-12 border-2 border-dashed border-blue-200 hover:border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-600 transition-all duration-300"
                onClick={() => {
                  setShowDiscount(!showDiscount);
                }}
              >
                <Percent className="h-5 w-5 mr-2" />
                Add Discount
                {showDiscount ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
              </Button>
            </div>

            {/* Discount Section with smooth transition */}
            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${
              showDiscount ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}>
              {showDiscount && (
                <div className="space-y-4 p-4 border-2 border-blue-100 rounded-lg bg-blue-50/30">
                  <div>
                    <Label className="text-sm font-medium">Discount</Label>
                    <div className="flex gap-2 mt-1">
                      <Select 
                        value={form.watch('discountType')} 
                        onValueChange={(value) => form.setValue('discountType', value as 'flat' | 'rate')}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="flat">Amount</SelectItem>
                          <SelectItem value="rate">Percentage</SelectItem>
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
                        <div className="flex items-center px-3 text-gray-500">
                          <Percent className="h-4 w-4" />
                        </div>
                      )}
                    </div>

                    {/* Quick discount buttons */}
                    <div className="mt-2">
                      <div className="text-xs text-gray-500 mb-1">Quick select:</div>
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
                <Label htmlFor="shippingCost" className="text-sm">Shipping Cost</Label>
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
                  <div className="text-xs text-gray-500 mb-1">Quick select:</div>
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
                <Label htmlFor="adjustment" className="text-sm">Adjustment</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...form.register('adjustment', { valueAsNumber: true })}
                  className="mt-1"
                  data-testid="input-adjustment"
                />
                <p className="text-xs text-gray-500 mt-1">Rounding or other adjustments</p>
              </div>

              <div className="hidden">
                <Label htmlFor="actualShippingCost" className="text-sm">Actual Shipping Cost</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...form.register('actualShippingCost', { valueAsNumber: true })}
                  className="mt-1"
                />
              </div>
            </div>

            <Separator className="my-4" />

            {/* Dobírka (COD) Section - Only show for PPL + COD */}
            {form.watch('shippingMethod') === 'PPL' && form.watch('paymentMethod') === 'COD' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="dobirkaAmount" className="text-sm flex items-center gap-2">
                      <Banknote className="w-4 h-4" />
                      Dobírka Amount (COD)
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...form.register('dobirkaAmount', { valueAsNumber: true })}
                      className="mt-1"
                      data-testid="input-dobirka-amount"
                    />
                    <p className="text-xs text-gray-500 mt-1">Cash on delivery amount (optional)</p>
                  </div>

                  <div>
                    <Label htmlFor="dobirkaCurrency" className="text-sm flex items-center gap-2">
                      <span className="w-4 h-4"></span>
                      Dobírka Currency
                    </Label>
                    <Select 
                      value={form.watch('dobirkaCurrency') || 'CZK'}
                      onValueChange={(value) => form.setValue('dobirkaCurrency', value as any)}
                    >
                      <SelectTrigger className="mt-1" data-testid="select-dobirka-currency">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CZK">CZK</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">Currency for cash on delivery</p>
                  </div>
                </div>

                <Separator className="my-4" />
              </>
            )}

            <div>
              <Label htmlFor="notes" className="text-sm">Notes</Label>
              <Textarea
                {...form.register('notes')}
                placeholder="Additional order notes..."
                className="mt-1"
              />
            </div>

            <Separator className="my-4" />

            {/* Grand Total Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-4 rounded-lg border-2 border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <Label htmlFor="grandTotal" className="text-sm font-semibold flex items-center gap-2 text-blue-900 dark:text-blue-100">
                    <Calculator className="w-4 h-4" />
                    Grand Total
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="grandTotal"
                      type="number"
                      step="0.01"
                      placeholder="Click to enter desired total"
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
                          
                          // Calculate the discount needed to reach desired total
                          // Formula: subtotal + tax + shipping + adjustment - discount = desiredTotal
                          // So: discount = subtotal + tax + shipping + adjustment - desiredTotal
                          const neededDiscount = subtotal + tax + shipping + adjustment - desiredTotal;
                          
                          // Set discount type to flat and apply the calculated discount
                          form.setValue('discountType', 'flat');
                          form.setValue('discountValue', Math.max(0, parseFloat(neededDiscount.toFixed(2))));
                          
                          toast({
                            title: "Total Adjusted",
                            description: `Discount set to ${formatCurrency(Math.max(0, neededDiscount), form.watch('currency'))} to reach ${formatCurrency(desiredTotal, form.watch('currency'))}`,
                          });
                        }
                      }}
                      className="font-bold text-lg bg-white dark:bg-slate-900 border-blue-300 dark:border-blue-700 cursor-pointer"
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
                          // Add the difference to adjustment field instead of shipping cost
                          form.setValue('adjustment', parseFloat(difference.toFixed(2)));
                          
                          // Update the grand total input to show the new rounded value
                          const grandTotalInput = document.getElementById('grandTotal') as HTMLInputElement;
                          if (grandTotalInput) {
                            grandTotalInput.value = roundedTotal.toFixed(2);
                          }
                          
                          toast({
                            title: "Total Rounded Up",
                            description: `Grand total rounded from ${formatCurrency(currentTotal, form.watch('currency'))} to ${formatCurrency(roundedTotal, form.watch('currency'))}. Adjustment: ${formatCurrency(difference, form.watch('currency'))}`,
                          });
                        } else {
                          toast({
                            title: "Already Rounded",
                            description: "The total is already a whole number",
                          });
                        }
                      }}
                      className="whitespace-nowrap border-blue-300 hover:bg-blue-100 text-blue-700 dark:border-blue-700 dark:hover:bg-blue-900 dark:text-blue-300"
                      data-testid="button-round-up"
                    >
                      <TrendingUp className="w-4 h-4 mr-1" />
                      Round Up
                    </Button>
                  </div>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">Click to type desired total or use Round Up button. Discount will auto-adjust.</p>
                </div>
              </div>
            </div>

            {/* Tax Invoice Toggle Button */}
            <div className="pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 border-2 border-dashed border-blue-200 hover:border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-600 transition-all duration-300"
                onClick={() => {
                  setShowTaxInvoice(!showTaxInvoice);
                  form.setValue('taxInvoiceEnabled', !showTaxInvoice);
                }}
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Tax Invoice Section
                {showTaxInvoice ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
              </Button>
            </div>

            {/* Tax Invoice Section with smooth transition */}
            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${
              showTaxInvoice ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}>
              {showTaxInvoice && (
                <div className="mt-4 p-4 border-2 border-blue-100 rounded-lg bg-blue-50/30 space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold text-blue-900">Tax Invoice Information</h3>
                  </div>

                  {form.watch('currency') === 'CZK' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="relative">
                        <Label htmlFor="ico">IČO</Label>
                        <div className="relative">
                          <Input
                            {...form.register('ico')}
                            placeholder="Company identification number"
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
                            placeholder="Tax identification number"
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
                        <Label htmlFor="nameAndAddress">Jméno a Adresa</Label>
                        <div className="relative">
                          <Textarea
                            {...form.register('nameAndAddress')}
                            placeholder="Company name and address"
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
                            placeholder="EU VAT identification number"
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
                            placeholder="Country name"
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
                        <Label htmlFor="nameAndAddress">Name and Address</Label>
                        <div className="relative">
                          <Textarea
                            {...form.register('nameAndAddress')}
                            placeholder="Company name and address"
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

        {/* Files Section */}
        {orderItems.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader className="p-3 border-b">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <FileText className="h-4 w-4 text-blue-600" />
                    Files & Documents
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm mt-1">
                    Upload files and manage product documents
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
                    Upload
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 space-y-3">
              {/* Files List Section */}
              <div className="space-y-4">
                {/* Uploaded Files */}
                {uploadedFiles.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Uploaded Files ({uploadedFiles.length})
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
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No files yet</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Upload files or add products with files</p>
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
                  
                  {/* Order Location - Desktop Only */}
                  <Card className="shadow-sm">
                    <CardHeader className="p-3 border-b">
                      <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                        <MapPin className="h-4 w-4 text-blue-600" />
                        Order Location
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3">
                      <Input
                        placeholder="e.g., Prague Warehouse, Main Office"
                        value={form.watch('orderLocation') || ''}
                        onChange={(e) => form.setValue('orderLocation', e.target.value)}
                        data-testid="input-order-location"
                      />
                    </CardContent>
                  </Card>

                  {/* Quick Settings Card */}
                  <Card className="shadow-sm">
                    <CardHeader className="p-3 border-b">
                      <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                        <Settings className="h-4 w-4 text-blue-600" />
                        Order Settings
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 space-y-3">
                      <div>
                        <Label htmlFor="currency" className="text-xs">Currency</Label>
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
                        <Label htmlFor="priority" className="text-xs">Priority</Label>
                        <Select value={form.watch('priority')} onValueChange={(value) => form.setValue('priority', value as any)}>
                          <SelectTrigger className="mt-1 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-2 bg-gray-500 rounded-full" />
                                Low
                              </div>
                            </SelectItem>
                            <SelectItem value="medium">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-2 bg-yellow-500 rounded-full" />
                                Medium
                              </div>
                            </SelectItem>
                            <SelectItem value="high">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-2 bg-red-500 rounded-full" />
                                High
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Order Status and Payment Status side by side */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor="orderStatus" className="text-xs">Order Status</Label>
                          <Select value={form.watch('orderStatus')} onValueChange={(value) => form.setValue('orderStatus', value as any)}>
                            <SelectTrigger className="mt-1 h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-2 bg-amber-500 rounded-full" />
                                  Pending
                                </div>
                              </SelectItem>
                              <SelectItem value="awaiting_stock">
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-2 bg-orange-500 rounded-full" />
                                  Awaiting Stock
                                </div>
                              </SelectItem>
                              <SelectItem value="to_fulfill">
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-2 bg-blue-500 rounded-full" />
                                  To Fulfill
                                </div>
                              </SelectItem>
                              <SelectItem value="ready_to_ship">
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-2 bg-cyan-500 rounded-full" />
                                  Ready to Ship
                                </div>
                              </SelectItem>
                              <SelectItem value="shipped">
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-2 bg-purple-500 rounded-full" />
                                  Shipped
                                </div>
                              </SelectItem>
                              <SelectItem value="delivered">
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-2 bg-emerald-500 rounded-full" />
                                  Delivered
                                </div>
                              </SelectItem>
                              <SelectItem value="cancelled">
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-2 bg-red-500 rounded-full" />
                                  Cancelled
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="paymentStatus" className="text-xs">Payment Status</Label>
                          <Select value={form.watch('paymentStatus')} onValueChange={(value) => form.setValue('paymentStatus', value as any)}>
                            <SelectTrigger className="mt-1 h-9" data-testid="select-payment-status">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-2 bg-orange-500 rounded-full" />
                                  Pending
                                </div>
                              </SelectItem>
                              <SelectItem value="paid">
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-2 bg-green-500 rounded-full" />
                                  Paid
                                </div>
                              </SelectItem>
                              <SelectItem value="pay_later">
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-2 bg-blue-500 rounded-full" />
                                  Pay Later
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
                    <CardHeader className="p-3 border-b bg-slate-50 dark:bg-slate-900">
                      <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                        <Calculator className="h-4 w-4 text-blue-600" />
                        Order Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                      {/* Margin Analysis Section */}
                      {orderItems.length > 0 && (() => {
                        const totalLandingCost = orderItems.reduce((sum, item) => 
                          sum + (item.landingCost || 0) * item.quantity, 0);
                        const totalSellingPrice = orderItems.reduce((sum, item) => 
                          sum + item.price * item.quantity, 0);
                        const totalProfit = totalSellingPrice - totalLandingCost;
                        const avgMargin = totalLandingCost > 0 
                          ? ((totalProfit / totalSellingPrice) * 100).toFixed(1) 
                          : null;

                        return avgMargin !== null ? (
                          <div className="pb-3 border-b">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium flex items-center gap-1.5">
                                <TrendingUp className="h-4 w-4 text-green-600" />
                                Margin
                              </span>
                              <MarginPill
                                sellingPrice={totalSellingPrice}
                                landingCost={totalLandingCost}
                                currency={form.watch('currency')}
                                showIcon={false}
                                showProfit={true}
                              />
                            </div>
                          </div>
                        ) : null;
                      })()}

                      {/* Breakdown */}
                      <div className="space-y-2.5">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-400">Subtotal</span>
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {formatCurrency(calculateSubtotal(), form.watch('currency'))}
                          </span>
                        </div>
                        
                        {showTaxInvoice && (
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600 dark:text-slate-400">
                              Tax ({form.watch('taxRate') || 0}%)
                            </span>
                            <span className="font-medium text-slate-900 dark:text-slate-100">
                              {formatCurrency(calculateTax(), form.watch('currency'))}
                            </span>
                          </div>
                        )}
                        
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-400">Shipping</span>
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {formatCurrency(Number(form.watch('shippingCost')) || 0, form.watch('currency'))}
                          </span>
                        </div>
                        
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-400">
                            Discount{form.watch('discountType') === 'rate' && ` (${form.watch('discountValue') || 0}%)`}
                          </span>
                          <span className="font-medium text-green-600 dark:text-green-500">
                            -{formatCurrency(
                              form.watch('discountType') === 'rate' 
                                ? (calculateSubtotal() * (Number(form.watch('discountValue')) || 0)) / 100
                                : Number(form.watch('discountValue')) || 0, 
                              form.watch('currency')
                            )}
                          </span>
                        </div>
                        
                        {roundingAdjustment > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600 dark:text-slate-400">Zaokrouhlení</span>
                            <span className="font-medium text-blue-600 dark:text-blue-500">
                              +{formatCurrency(roundingAdjustment, form.watch('currency'))}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Grand Total */}
                      <div className="pt-3 border-t">
                        <div className="flex justify-between items-center">
                          <span className="text-base font-semibold text-slate-900 dark:text-slate-100">Total</span>
                          <span className="text-xl font-bold text-blue-600 dark:text-blue-500">
                            {formatCurrency(calculateGrandTotal(), form.watch('currency'))}
                          </span>
                        </div>
                      </div>

                      {/* Validation Warning */}
                      {(() => {
                        const missingFields: string[] = [];
                        if (!selectedCustomer) missingFields.push("Customer");
                        if (orderItems.length === 0) missingFields.push("Products");
                        
                        if (missingFields.length > 0) {
                          return (
                            <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md">
                              <div className="flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                                <div className="text-sm text-amber-800 dark:text-amber-200">
                                  <p className="font-medium">Required fields missing:</p>
                                  <p className="text-amber-700 dark:text-amber-300">{missingFields.join(", ")}</p>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* Update Button */}
                      <Button 
                        type="submit" 
                        form="edit-order-form"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white" 
                        size="lg" 
                        disabled={updateOrderMutation.isPending || !selectedCustomer || orderItems.length === 0} 
                        data-testid="button-update-order"
                      >
                        {updateOrderMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Update Order
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
              </div>
            </div>
            {/* End of Right Column */}
          </div>
          {/* End of Grid */}

          {/* Mobile Order Summary (bottom on mobile) */}
          <Card className="lg:hidden shadow-sm">
            <CardHeader className="p-3 border-b bg-slate-50 dark:bg-slate-900">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Calculator className="h-4 w-4 text-blue-600" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* Margin Analysis Section - Mobile */}
              {orderItems.length > 0 && (() => {
                const totalLandingCost = orderItems.reduce((sum, item) => 
                  sum + (item.landingCost || 0) * item.quantity, 0);
                const totalSellingPrice = orderItems.reduce((sum, item) => 
                  sum + item.price * item.quantity, 0);
                const totalProfit = totalSellingPrice - totalLandingCost;
                const avgMargin = totalLandingCost > 0 
                  ? ((totalProfit / totalSellingPrice) * 100).toFixed(1) 
                  : null;

                return avgMargin !== null ? (
                  <div className="pb-3 border-b">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium flex items-center gap-1.5">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        Margin
                      </span>
                      <MarginPill
                        sellingPrice={totalSellingPrice}
                        landingCost={totalLandingCost}
                        currency={form.watch('currency')}
                        showIcon={false}
                        showProfit={true}
                      />
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Breakdown */}
              <div className="space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Subtotal</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {formatCurrency(calculateSubtotal(), form.watch('currency'))}
                  </span>
                </div>
                
                {showTaxInvoice && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">
                      Tax ({form.watch('taxRate') || 0}%)
                    </span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {formatCurrency(calculateTax(), form.watch('currency'))}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Shipping</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {formatCurrency(Number(form.watch('shippingCost')) || 0, form.watch('currency'))}
                  </span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">
                    Discount{form.watch('discountType') === 'rate' && ` (${form.watch('discountValue') || 0}%)`}
                  </span>
                  <span className="font-medium text-green-600 dark:text-green-500">
                    -{formatCurrency(
                      form.watch('discountType') === 'rate' 
                        ? (calculateSubtotal() * (Number(form.watch('discountValue')) || 0)) / 100
                        : Number(form.watch('discountValue')) || 0, 
                      form.watch('currency')
                    )}
                  </span>
                </div>
                
                {roundingAdjustment > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Zaokrouhlení</span>
                    <span className="font-medium text-blue-600 dark:text-blue-500">
                      +{formatCurrency(roundingAdjustment, form.watch('currency'))}
                    </span>
                  </div>
                )}
              </div>

              {/* Grand Total */}
              <div className="pt-3 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-base font-semibold text-slate-900 dark:text-slate-100">Total</span>
                  <span className="text-xl font-bold text-blue-600 dark:text-blue-500">
                    {formatCurrency(calculateGrandTotal(), form.watch('currency'))}
                  </span>
                </div>
              </div>

              {/* Validation Warning - Mobile */}
              {(() => {
                const missingFields: string[] = [];
                if (!selectedCustomer) missingFields.push("Customer");
                if (orderItems.length === 0) missingFields.push("Products");
                
                if (missingFields.length > 0) {
                  return (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-amber-800 dark:text-amber-200">
                          <p className="font-medium">Required fields missing:</p>
                          <p className="text-amber-700 dark:text-amber-300">{missingFields.join(", ")}</p>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Update Button */}
              <Button 
                type="submit" 
                form="edit-order-form"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white" 
                size="lg" 
                disabled={updateOrderMutation.isPending || !selectedCustomer || orderItems.length === 0} 
                data-testid="button-update-order-mobile"
              >
                {updateOrderMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Update Order
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
        </form>
      </div>
      
      {/* Variant Selector Dialog */}
      <Dialog open={showVariantDialog} onOpenChange={setShowVariantDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Select Product Variants</DialogTitle>
            <DialogDescription className="text-sm">
              Choose variants and quantities for: <span className="font-semibold text-slate-900">{selectedProductForVariant?.name}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-semibold">Variant Name</TableHead>
                  <TableHead className="font-semibold">Barcode</TableHead>
                  <TableHead className="text-right font-semibold">Stock</TableHead>
                  <TableHead className="text-right font-semibold w-[140px]">Quantity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productVariants.map((variant, index) => (
                  <TableRow key={variant.id} className="hover:bg-slate-50">
                    <TableCell className="font-medium">{variant.name}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">{variant.barcode || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={variant.quantity > 10 ? "default" : variant.quantity > 0 ? "outline" : "destructive"} className="font-semibold">
                        {variant.quantity}
                      </Badge>
                    </TableCell>
                    <TableCell>
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
                              // On last variant, trigger add variants
                              addVariantsToOrder();
                            } else {
                              // Move to next variant input
                              const nextVariant = productVariants[index + 1];
                              const nextInput = document.querySelector(`[data-testid="input-variant-quantity-${nextVariant.id}"]`) as HTMLInputElement;
                              nextInput?.focus();
                              nextInput?.select();
                            }
                          }
                        }}
                        className="text-right h-10"
                        data-testid={`input-variant-quantity-${variant.id}`}
                        onFocus={(e) => e.target.select()}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowVariantDialog(false);
                setSelectedProductForVariant(null);
                setProductVariants([]);
                setVariantQuantities({});
              }}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={addVariantsToOrder}
              data-testid="button-add-variants"
              className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Selected Variants
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
            <DialogTitle className="text-lg font-semibold">Shipping Notes</DialogTitle>
            <DialogDescription className="text-sm">
              Add shipping notes or special instructions for this item
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="note-text" className="text-sm">Shipping Notes</Label>
              <Textarea
                id="note-text"
                value={editingNoteText}
                onChange={(e) => setEditingNoteText(e.target.value)}
                placeholder="Type your own note or select a predefined one below..."
                className="mt-1 min-h-[120px]"
                data-testid="textarea-item-note"
              />
              <div className="mt-3">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Quick templates:</p>
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
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (editingNoteItemId) {
                  updateOrderItem(editingNoteItemId, 'notes', editingNoteText || null);
                  // Auto-expand the note after saving
                  if (editingNoteText) {
                    setExpandedNotes(new Set(expandedNotes).add(editingNoteItemId));
                  }
                  setEditingNoteItemId(null);
                  setEditingNoteText("");
                }
              }}
              data-testid="button-save-note"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shipping Address Modal */}
      <ShippingAddressModal
        open={showShippingModal}
        onOpenChange={setShowShippingModal}
        onSave={(address) => {
          // For quick customers that need saving, store address temporarily
          if (selectedCustomer?.needsSaving) {
            const newAddress = {
              id: `temp-address-${Date.now()}`,
              ...address,
              isNew: true,
            };
            setSelectedShippingAddress(newAddress);
            setShowShippingModal(false);
            toast({
              title: "Success",
              description: "Address saved (will be created with customer)",
            });
          } else if (editingAddress) {
            // For existing addresses, update them
            updateShippingAddressMutation.mutate(address);
          } else {
            // For new addresses on existing customers, create them
            createShippingAddressMutation.mutate(address);
          }
        }}
        editingAddress={editingAddress}
        existingAddresses={Array.isArray(shippingAddresses) ? shippingAddresses : []}
        title={editingAddress ? "Edit Shipping Address" : "Add Shipping Address"}
        description={editingAddress ? "Update the shipping address details below" : "Enter the new shipping address details below"}
      />

      {/* Delete Address Confirmation Dialog */}
      <AlertDialog open={!!addressToDelete} onOpenChange={(open) => !open && setAddressToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shipping Address?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this shipping address? This action cannot be undone.
            </AlertDialogDescription>
            {addressToDelete && (
              <div className="mt-3 p-3 bg-slate-50 rounded-md text-sm text-slate-900">
                <div className="font-medium">{addressToDelete.firstName} {addressToDelete.lastName}</div>
                {addressToDelete.company && <div>{addressToDelete.company}</div>}
                <div>{addressToDelete.street}{addressToDelete.streetNumber && ` ${addressToDelete.streetNumber}`}</div>
                <div>{addressToDelete.zipCode} {addressToDelete.city}</div>
                <div>{addressToDelete.country}</div>
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (addressToDelete) {
                  deleteShippingAddressMutation.mutate(addressToDelete.id);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Address
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}