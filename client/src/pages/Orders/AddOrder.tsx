import { useState, useEffect, useMemo, useRef, useCallback, Fragment } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
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
import { getCustomerBadges } from "@/lib/customerBadges";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
  Pencil,
  Wrench,
  Star,
  Award,
  Clock,
  Settings,
  MoreVertical
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

const addOrderSchema = z.object({
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
  variantId?: string;
  variantName?: string;
  bundleId?: string;
  productName: string;
  sku: string;
  quantity: number;
  price: number;
  discount: number;
  tax: number;
  total: number;
  landingCost?: number | null;
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

export default function AddOrder() {
  const [, setLocation] = useLocation();
  const [showTaxInvoice, setShowTaxInvoice] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const { toast } = useToast();
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
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

  // Shipping notes state
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

  const form = useForm<z.infer<typeof addOrderSchema>>({
    resolver: zodResolver(addOrderSchema),
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

  // Auto-fill order location based on device type or stored preference
  useEffect(() => {
    const currentLocation = form.getValues('orderLocation');
    if (!currentLocation) {
      // Check for stored device location (for POS devices)
      const storedDeviceLocation = localStorage.getItem('deviceLocation');
      const storedWarehouse = localStorage.getItem('warehouseName');
      
      if (storedDeviceLocation) {
        // Use stored device location (e.g., "Prague POS Terminal", "Main Store - Device 1")
        form.setValue('orderLocation', storedDeviceLocation);
      } else if (storedWarehouse) {
        // Use warehouse name if available
        form.setValue('orderLocation', storedWarehouse);
      } else {
        // Default to "Online" for web orders
        form.setValue('orderLocation', 'Online');
      }
    }
  }, []);

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
    mutationFn: async ({ addressId, addressData }: { addressId: string; addressData: any }) => {
      const response = await apiRequest('PATCH', `/api/shipping-addresses/${addressId}`, addressData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers', selectedCustomer?.id, 'shipping-addresses'] });
      setShowShippingModal(false);
      setEditingAddress(null);
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
  const watchedShippingMethod = form.watch('shippingMethod');
  const watchedCurrency = form.watch('currency');

  useEffect(() => {
    if (!watchedShippingMethod || !selectedCustomer?.country) return;

    const calculatedCost = calculateShippingCost(
      watchedShippingMethod,
      selectedCustomer.country,
      watchedCurrency
    );

    form.setValue('actualShippingCost', calculatedCost);
    form.setValue('shippingCost', calculatedCost); // Also set shipping cost for display
  }, [watchedShippingMethod, selectedCustomer?.country, watchedCurrency, form]);

  // Auto-sync dobírka amount and currency when PPL + COD is selected
  const watchedPaymentMethod = form.watch('paymentMethod');
  
  useEffect(() => {
    // Only autofill if PPL shipping and COD payment are selected
    if (watchedShippingMethod === 'PPL' && watchedPaymentMethod === 'COD') {
      // Always sync dobírka amount to match grand total
      const grandTotal = calculateGrandTotal();
      form.setValue('dobirkaAmount', parseFloat(grandTotal.toFixed(2)));
      
      // Always sync currency to match order currency (only if it's a supported COD currency)
      if (watchedCurrency === 'CZK' || watchedCurrency === 'EUR' || watchedCurrency === 'USD') {
        form.setValue('dobirkaCurrency', watchedCurrency);
      }
    }
  }, [watchedShippingMethod, watchedPaymentMethod, watchedCurrency, form, orderItems, form.watch('shippingCost'), form.watch('discountValue'), form.watch('discountType'), form.watch('taxRate'), showTaxInvoice]);

  // Auto-fill currency from customer preference
  useEffect(() => {
    if (!selectedCustomer) return;
    
    // Auto-fill currency from customer preference
    if (selectedCustomer.preferredCurrency) {
      form.setValue('currency', selectedCustomer.preferredCurrency);
    }
  }, [selectedCustomer, form]);

  const createOrderMutation = useMutation({
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

      console.log('Creating order with customerId:', data.customerId);

      // Include selected document IDs with the order
      const orderData = {
        ...data,
        selectedDocumentIds: selectedDocumentIds.length > 0 ? selectedDocumentIds : undefined
      };

      const response = await apiRequest('POST', '/api/orders', orderData);
      const createdOrder = await response.json();
      return createdOrder;
    },
    onSuccess: (createdOrder) => {
      // Invalidate all order-related caches for real-time updates across the app
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders/pick-pack'] }); // Real-time Pick & Pack sync
      queryClient.invalidateQueries({ queryKey: ['/api/orders/pick-pack/predictions'] }); // Update predictions
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      
      // Set the order ID so packing optimization can be run
      setOrderId(createdOrder.id);
      
      toast({
        title: "Success",
        description: "Order created successfully. You can now run AI packing optimization.",
      });
    },
    onError: (error) => {
      console.error("Order creation error:", error);
      toast({
        title: "Error",
        description: "Failed to create order",
        variant: "destructive",
      });
    },
  });

  // Packing optimization wrapper function with country mapping and auto-fill
  const runPackingOptimization = () => {
    if (orderItems.length === 0) {
      toast({
        title: "Error",
        description: "Please add items to the order first",
        variant: "destructive",
      });
      return;
    }

    const items = orderItems.map(item => ({
      productId: item.productId || '',
      productName: item.productName,
      sku: item.sku,
      quantity: item.quantity,
      price: item.price
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

  // Auto-fill shipping costs when packing plan updates
  useEffect(() => {
    if (packingPlan?.estimatedShippingCost !== undefined && packingPlan?.estimatedShippingCost !== null) {
      form.setValue('shippingCost', packingPlan.estimatedShippingCost);
      form.setValue('actualShippingCost', packingPlan.estimatedShippingCost);
    }
  }, [packingPlan, form]);

  const addProductToOrder = async (product: any) => {
    // Check if this is a service
    if (product.isService) {
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
    } else {
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
      // Handle regular product
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
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity: 1,
          price: productPrice,
          discount: 0,
          tax: 0,
          total: productPrice,
          landingCost: product.landingCost || product.latestLandingCost || null,
          image: product.image || null,
        };
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
    
    for (const [variantId, quantity] of variantsToAdd) {
      const variant = productVariants.find(v => v.id === variantId);
      if (!variant) continue;
      
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
    }
    
    toast({
      title: "Success",
      description: `Added ${variantsToAdd.length} variant(s) to order`,
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

  const onSubmit = (data: z.infer<typeof addOrderSchema>) => {
    if (orderItems.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one item to the order",
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
      dobirkaAmount: data.dobirkaAmount && data.dobirkaAmount > 0 ? data.dobirkaAmount.toString() : null,
      dobirkaCurrency: data.dobirkaAmount && data.dobirkaAmount > 0 ? (data.dobirkaCurrency || 'CZK') : null,
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
      })),
      includedDocuments: {
        uploadedFiles: uploadedFiles.map(f => ({ name: f.name, size: f.size })),
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
        const freqA = productFrequency[a.id] || 0;
        const freqB = productFrequency[b.id] || 0;
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
      const frequency = productFrequency[result.item.id] || 0;
      const frequencyBonus = Math.min(frequency * 0.5, 10); // Up to 10 points bonus
      return {
        ...result,
        score: result.score + frequencyBonus,
      };
    });

    // Sort by adjusted score and return top 8
    scoredResults.sort((a, b) => b.score - a.score);
    return scoredResults.slice(0, 8).map(r => r.item);
  }, [allProducts, allServices, allBundles, debouncedProductSearch, productFrequency]);

  // Filter customers with Vietnamese search (memoized for performance)
  const filteredCustomers = useMemo(() => {
    if (!Array.isArray(allCustomers) || !debouncedCustomerSearch || debouncedCustomerSearch.length < 2) return [];

    const results = fuzzySearch(allCustomers, debouncedCustomerSearch, {
      fields: ['name', 'facebookName', 'email', 'phone', 'company'],
      threshold: 0.2, // Lower threshold for more results
      fuzzy: true,
      vietnameseNormalization: true,
    });

    // Limit to top 8 results
    return results.slice(0, 8).map(r => r.item);
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
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Create New Order</h1>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">Add products and configure details</p>
              </div>
            </div>
            <Badge variant="outline" className="text-green-600 border-green-600 w-fit">
              <Plus className="h-3 w-3 mr-1" />
              New Order
            </Badge>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-4 sm:space-y-6">
            {/* Mobile-Only Settings (at top) */}
            <div className="lg:hidden space-y-4">
              {/* Order Location */}
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

              {/* Order Settings */}
              <Card className="shadow-sm">
                <CardHeader className="p-3 border-b">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Settings className="h-4 w-4 text-blue-600" />
                    Order Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-3">
                  <div>
                    <Label htmlFor="currency-mobile" className="text-xs">Currency</Label>
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
                    <Label htmlFor="priority-mobile" className="text-xs">Priority</Label>
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
                      <Label htmlFor="orderStatus-mobile" className="text-xs">Order Status</Label>
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
                      <Label htmlFor="paymentStatus-mobile" className="text-xs">Payment Status</Label>
                      <Select value={form.watch('paymentStatus')} onValueChange={(value) => form.setValue('paymentStatus', value as any)}>
                        <SelectTrigger className="mt-1 h-9">
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
            </div>

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
                        // Set customerId in form
                        form.setValue('customerId', customer.id);
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
                              <span className="text-xl">
                                {getCountryFlag(selectedCustomer.country)}
                              </span>
                            )}
                            <h3 className="text-sm font-semibold text-slate-900">
                              {selectedCustomer.name}
                            </h3>
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          </div>
                          
                          {/* Badges */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {getCustomerBadges(selectedCustomer).map((badge, index) => (
                              <Badge 
                                key={index} 
                                variant={badge.variant} 
                                className={badge.className}
                                data-testid={`badge-${badge.label.toLowerCase().replace(/\s+/g, '-')}`}
                              >
                                {badge.icon && <badge.icon className="h-3 w-3 mr-1" />}
                                {badge.label}
                              </Badge>
                            ))}
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
                          <div className="flex items-center gap-2 text-sm text-slate-700">
                            <Phone className="h-4 w-4 text-slate-500" />
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
                          <div className="flex items-center gap-2 text-sm text-slate-700">
                            <MapPin className="h-4 w-4 text-slate-500" />
                            <span>
                              {[selectedCustomer.city, selectedCustomer.country].filter(Boolean).join(', ')}
                            </span>
                          </div>
                        )}
                        
                        {/* Company */}
                        {selectedCustomer.company && (
                          <div className="flex items-center gap-2 text-sm text-slate-700">
                            <Building className="h-4 w-4 text-slate-500" />
                            <span className="truncate">{selectedCustomer.company}</span>
                          </div>
                        )}
                      </div>

                      {/* Stats Row - Only show for existing customers with data */}
                      {!selectedCustomer.needsSaving && !selectedCustomer.isTemporary && (
                        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-200">
                          {selectedCustomer.totalOrders > 0 && (
                            <div className="flex items-center gap-1.5">
                              <Package className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium text-slate-900">
                                {selectedCustomer.totalOrders}
                              </span>
                              <span className="text-xs text-slate-500">orders</span>
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
                                      title: "Copied!",
                                      description: "Address copied to clipboard",
                                    });
                                  }}
                                  data-testid={`button-copy-address-${address.id}`}
                                  title="Copy address"
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
                                    title="Edit address"
                                  >
                                    <Pencil className="h-4 w-4 text-slate-600" />
                                  </Button>
                                )}
                              </div>
                            </div>

                            {/* Contact Details */}
                            <div 
                              className="px-4 pb-4 pt-0 space-y-2 cursor-pointer select-none"
                              onClick={() => {
                                if (selectedShippingAddress?.id === address.id) {
                                  setSelectedShippingAddress(null);
                                } else {
                                  setSelectedShippingAddress(address);
                                }
                              }}
                            >

                              {(address.tel || address.email) && (
                                <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                                  {address.tel && (
                                    <div className="flex items-center gap-2">
                                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                                      <span className="text-sm text-slate-600">{address.tel}</span>
                                    </div>
                                  )}
                                  {address.email && (
                                    <div className="flex items-center gap-2">
                                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                                      <span className="text-sm text-slate-600">{address.email}</span>
                                    </div>
                                  )}
                                </div>
                              )}
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
                    <div className="relative">
                      <Input
                        id="facebookName"
                        value={newCustomer.facebookName || ""}
                        onChange={(e) => {
                          console.log('Facebook Name changed to:', e.target.value);
                          setNewCustomer({ ...newCustomer, facebookName: e.target.value });
                        }}
                        placeholder="Facebook display name"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1 h-8 w-8 p-0"
                        onClick={() => {
                          if (newCustomer.name) {
                            setNewCustomer({ ...newCustomer, facebookName: newCustomer.name });
                            toast({
                              title: "Name copied",
                              description: "Customer name copied to Facebook Name",
                            });
                          }
                        }}
                        disabled={!newCustomer.name}
                        title="Copy customer name"
                        data-testid="button-copy-facebook-name"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="facebookUrl">Facebook URL</Label>
                    <div className="relative">
                      <Input
                        id="facebookUrl"
                        value={newCustomer.facebookUrl}
                        onChange={(e) => setNewCustomer({ ...newCustomer, facebookUrl: e.target.value })}
                        placeholder="Place URL or Type"
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
                              title: "Name copied",
                              description: "Customer name copied to Facebook URL",
                            });
                          }
                        }}
                        disabled={!newCustomer.name}
                        title="Copy customer name"
                        data-testid="button-copy-facebook-url"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
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

                <Separator className="my-6" />

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

                <Separator className="my-6" />

                {/* Additional Details */}
                <div className="space-y-2">
                  <Label>Additional Details</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={newCustomer.firstName || ""}
                        onChange={(e) => setNewCustomer({ ...newCustomer, firstName: e.target.value })}
                        placeholder="First name"
                        data-testid="input-firstName"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={newCustomer.lastName || ""}
                        onChange={(e) => setNewCustomer({ ...newCustomer, lastName: e.target.value })}
                        placeholder="Last name"
                        data-testid="input-lastName"
                      />
                    </div>
                    <div>
                      <Label htmlFor="pickupPoint">Pickup Point</Label>
                      <Input
                        id="pickupPoint"
                        value={newCustomer.pickupPoint || ""}
                        onChange={(e) => setNewCustomer({ ...newCustomer, pickupPoint: e.target.value })}
                        placeholder="Branch or pickup location"
                        data-testid="input-pickupPoint"
                      />
                    </div>
                    <div>
                      <Label htmlFor="customerEmail">Email</Label>
                      <div className="relative">
                        <Input
                          id="customerEmail"
                          type="email"
                          value={newCustomer.email}
                          onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                          placeholder="email@example.com"
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
                              title: "Default email pasted",
                              description: "davienails999@gmail.com",
                            });
                          }}
                          title="Paste default email"
                          data-testid="button-paste-default-email"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="my-6" />

                {/* Contact Information - Phone */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customerPhone">Phone</Label>
                    <Input
                      id="customerPhone"
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                      placeholder="Type here"
                      data-testid="input-customerPhone"
                    />
                  </div>
                </div>

                <Separator className="my-6" />

                <div>
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={newCustomer.company}
                    onChange={(e) => setNewCustomer({ ...newCustomer, company: e.target.value })}
                    placeholder="Type here"
                  />
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
              Add Products
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-1">Search and add products to order</CardDescription>
          </CardHeader>
          <CardContent className="sticky top-0 z-40 p-3 space-y-3 bg-white dark:bg-slate-950 shadow-sm backdrop-blur-sm">
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
                <div className="absolute top-full left-0 right-0 mt-1 border rounded-md shadow-lg bg-white max-h-64 overflow-y-auto z-50">
                  <div className="p-2 bg-slate-50 border-b text-xs text-slate-600 sticky top-0 z-10">
                    {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found - Use ↑↓ arrows to navigate
                  </div>
                  {filteredProducts.map((product: any, index: number) => {
                    const frequency = productFrequency[product.id] || 0;
                    const isService = product.isService;
                    const isBundle = product.isBundle;
                    const isBestMatch = index === 0 && debouncedProductSearch.length >= 2;
                    const isKeyboardSelected = index === selectedProductIndex;
                    
                    return (
                      <button
                        type="button"
                        key={product.id}
                        className={`w-full p-3 cursor-pointer border-b last:border-b-0 transition-colors text-left ${
                          isKeyboardSelected ? 'bg-blue-50 ring-2 ring-inset ring-blue-500' : 'hover:bg-blue-50'
                        } ${
                          isBestMatch ? 'bg-blue-100 border-l-4 border-l-blue-500' : ''
                        }`}
                        onClick={() => {
                          addProductToOrder(product);
                          setSelectedProductIndex(0);
                        }}
                        data-testid={`${isService ? 'service' : isBundle ? 'bundle' : 'product'}-item-${product.id}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1">
                            {/* Product Image */}
                            {!isService && !isBundle && (
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
                            )}
                            {/* Service/Bundle Icon */}
                            {(isService || isBundle) && (
                              <div className="w-12 h-12 flex-shrink-0 rounded bg-slate-100 border border-slate-200 flex items-center justify-center">
                                {isService && <Wrench className="h-6 w-6 text-orange-500" />}
                                {isBundle && <Box className="h-6 w-6 text-purple-500" />}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="font-medium text-slate-900">{product.name}</div>
                              {isBestMatch && (
                                <Badge variant="default" className="text-xs px-1.5 py-0 bg-blue-600">
                                  Best Match
                                </Badge>
                              )}
                              {isService && (
                                <Badge variant="outline" className="text-xs px-1.5 py-0 border-orange-500 text-orange-600">
                                  Service
                                </Badge>
                              )}
                              {isBundle && (
                                <Badge variant="outline" className="text-xs px-1.5 py-0 border-purple-500 text-purple-600">
                                  Bundle
                                </Badge>
                              )}
                              {!isService && !isBundle && frequency > 0 && (
                                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                  {frequency}x
                                </Badge>
                              )}
                            </div>
                            {!isService && !isBundle && (
                              <div className="text-sm text-slate-500">SKU: {product.sku}</div>
                            )}
                            {isService && product.description && (
                              <div className="text-sm text-slate-500">{product.description}</div>
                            )}
                            {isBundle && product.description && (
                              <div className="text-sm text-slate-500">{product.description}</div>
                            )}
                            </div>
                          </div>
                          <div className="text-right ml-4 flex-shrink-0">
                            <div className="font-medium text-slate-900">
                              {isService ? (
                                formatCurrency(parseFloat(product.totalCost || '0'), 'EUR')
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
                            {!isService && (
                              <>
                                <div className="text-sm text-slate-500">
                                  Stock: {isBundle ? (product.availableStock ?? 0) : (product.quantity || 0)}
                                </div>
                                {!isBundle && product.warehouseName && (
                                  <div className="text-xs text-slate-400">{product.warehouseName}</div>
                                )}
                              </>
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
                                    {item.serviceId && <Wrench className="h-4 w-4 text-orange-500" />}
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
                                  <Input
                                    placeholder="Add note (optional)"
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
                                      // Enter: Save and go back to product search for next item
                                      productSearchRef.current?.focus();
                                    } else if (e.key === 'Tab') {
                                      e.preventDefault();
                                      // Tab: Go to shipping cost
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
                                      // Move to next row's quantity input
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
                                        // Move to next row's quantity input
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
                                      // Move to next row's quantity input
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
                              <TableCell colSpan={showVatColumn && showDiscountColumn ? 7 : showVatColumn || showDiscountColumn ? 6 : 5} className="py-2 px-3">
                                <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-3">
                                  <Package className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1">Shipping Notes</p>
                                    <p className="text-sm text-amber-900 dark:text-amber-200">{item.notes}</p>
                                  </div>
                                </div>
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
                    <Label htmlFor="dobirkaAmount" className="flex items-center gap-2">
                      <Banknote className="w-4 h-4" />
                      Dobírka Amount (COD)
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...form.register('dobirkaAmount', { valueAsNumber: true })}
                      data-testid="input-dobirka-amount"
                    />
                    <p className="text-xs text-gray-500 mt-1">Cash on delivery amount (optional)</p>
                  </div>

                  <div>
                    <Label htmlFor="dobirkaCurrency">Dobírka Currency</Label>
                    <Select 
                      value={form.watch('dobirkaCurrency') || 'CZK'}
                      onValueChange={(value) => form.setValue('dobirkaCurrency', value as any)}
                    >
                      <SelectTrigger data-testid="select-dobirka-currency">
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
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                {...form.register('notes')}
                placeholder="Additional order notes..."
              />
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
                    <FileText className="h-4 w-4 text-blue-600" />
                    <h3 className="text-sm font-semibold text-blue-900">Tax Invoice Information</h3>
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

        {/* AI Carton Packing Optimization Panel */}
        <AICartonPackingPanel
          packingPlan={packingPlan}
          onRunOptimization={runPackingOptimization}
          isLoading={isPackingOptimizationLoading}
          currency={form.watch('currency')}
          orderItems={orderItems}
        />

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
                                  <div className="h-2 w-2 bg-orange-500 rounded-full" />
                                  Pending
                                </div>
                              </SelectItem>
                              <SelectItem value="to_fulfill">
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-2 bg-blue-500 rounded-full" />
                                  To Fulfill
                                </div>
                              </SelectItem>
                              <SelectItem value="shipped">
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-2 bg-green-500 rounded-full" />
                                  Shipped
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
                    <CardHeader className="p-3 border-b">
                      <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                        <Calculator className="h-4 w-4 text-blue-600" />
                        Order Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 space-y-3">
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
                        <>
                          <div className="pb-3 mb-3 border-b">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium flex items-center gap-1">
                                <TrendingUp className="h-4 w-4 text-green-600" />
                                Margin Analysis
                              </span>
                              <MarginPill
                                sellingPrice={totalSellingPrice}
                                landingCost={totalLandingCost}
                                currency={form.watch('currency')}
                                showIcon={true}
                                showProfit={true}
                              />
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-500">Total Cost:</span>
                                <span>{formatCurrency(totalLandingCost, form.watch('currency'))}</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-500">Total Profit:</span>
                                <span className={totalProfit >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                                  {formatCurrency(totalProfit, form.watch('currency'))}
                                </span>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : null;
                    })()}

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium">{formatCurrency(calculateSubtotal(), form.watch('currency'))}</span>
                      </div>
                      {showTaxInvoice && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Tax ({form.watch('taxRate') || 0}%):</span>
                          <span className="font-medium">{formatCurrency(calculateTax(), form.watch('currency'))}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Shipping:</span>
                        <span className="font-medium">{formatCurrency(Number(form.watch('shippingCost')) || 0, form.watch('currency'))}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          Discount{form.watch('discountType') === 'rate' && ` (${form.watch('discountValue') || 0}%)`}:
                        </span>
                        <span className="font-medium text-green-600">
                          -{formatCurrency(
                            form.watch('discountType') === 'rate' 
                              ? (calculateSubtotal() * (Number(form.watch('discountValue')) || 0)) / 100
                              : Number(form.watch('discountValue')) || 0, 
                            form.watch('currency')
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="border-t pt-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold">Grand Total:</span>
                        <div className="flex items-center gap-1">
                          <Input
                            id="grandTotal"
                            type="number"
                            step="0.01"
                            placeholder="Click to enter"
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
                                  title: "Total Adjusted",
                                  description: `Discount set to ${formatCurrency(Math.max(0, neededDiscount), form.watch('currency'))}`,
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
                                  title: "Total Rounded Up",
                                  description: `Adjustment: ${formatCurrency(difference, form.watch('currency'))}`,
                                });
                              } else {
                                toast({
                                  title: "Already Rounded",
                                  description: "Total is already a whole number",
                                });
                              }
                            }}
                            className="h-8 px-2"
                            data-testid="button-round-up"
                          >
                            <TrendingUp className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">Click to edit or Round Up</p>
                    </div>

                    <div className="pt-3 space-y-2">
                      {orderId ? (
                        <>
                          <Button 
                            type="button" 
                            className="w-full" 
                            size="lg" 
                            onClick={() => setLocation(`/orders/${orderId}`)}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            View Order
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            className="w-full" 
                            onClick={() => setLocation('/orders')}
                          >
                            Back to Orders
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button ref={submitButtonRef} type="submit" className="w-full" size="lg" disabled={createOrderMutation.isPending || orderItems.length === 0} data-testid="button-create-order">
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            {createOrderMutation.isPending ? 'Creating...' : 'Create Order'}
                          </Button>
                          <Button type="button" variant="outline" className="w-full" onClick={() => setLocation('/orders')} data-testid="button-save-draft">
                            <Save className="h-4 w-4 mr-2" />
                            Save Draft
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
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-3">
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
                  <div className="pb-3 mb-3 border-b">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Margin</span>
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

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(calculateSubtotal(), form.watch('currency'))}</span>
                </div>
                {showTaxInvoice && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax ({form.watch('taxRate') || 0}%):</span>
                    <span className="font-medium">{formatCurrency(calculateTax(), form.watch('currency'))}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping:</span>
                  <span className="font-medium">{formatCurrency(Number(form.watch('shippingCost')) || 0, form.watch('currency'))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Discount{form.watch('discountType') === 'rate' && ` (${form.watch('discountValue') || 0}%)`}:
                  </span>
                  <span className="font-medium text-green-600">
                    -{formatCurrency(
                      form.watch('discountType') === 'rate' 
                        ? (calculateSubtotal() * (Number(form.watch('discountValue')) || 0)) / 100
                        : Number(form.watch('discountValue')) || 0, 
                      form.watch('currency')
                    )}
                  </span>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">Grand Total:</span>
                  <div className="flex items-center gap-1">
                    <Input
                      id="grandTotalMobile"
                      type="number"
                      step="0.01"
                      placeholder="Click to enter"
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
                            title: "Total Adjusted",
                            description: `Discount set to ${formatCurrency(Math.max(0, neededDiscount), form.watch('currency'))}`,
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
                            title: "Total Rounded Up",
                            description: `Adjustment: ${formatCurrency(difference, form.watch('currency'))}`,
                          });
                        } else {
                          toast({
                            title: "Already Rounded",
                            description: "Total is already a whole number",
                          });
                        }
                      }}
                      className="h-8 px-2"
                    >
                      <TrendingUp className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-gray-500">Click to edit or Round Up</p>
              </div>

              <div className="pt-3 space-y-2">
                {orderId ? (
                  <>
                    <Button 
                      type="button" 
                      className="w-full" 
                      size="lg" 
                      onClick={() => setLocation(`/orders/${orderId}`)}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      View Order
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full" 
                      onClick={() => setLocation('/orders')}
                    >
                      Back to Orders
                    </Button>
                  </>
                ) : (
                  <>
                    <Button type="submit" className="w-full" size="lg" disabled={createOrderMutation.isPending || orderItems.length === 0} data-testid="button-create-order-mobile">
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      {createOrderMutation.isPending ? 'Creating...' : 'Create Order'}
                    </Button>
                    <Button type="button" variant="outline" className="w-full" onClick={() => setLocation('/orders')} data-testid="button-save-draft-mobile">
                      <Save className="h-4 w-4 mr-2" />
                      Save Draft
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
              <DialogTitle>Select Product Variants</DialogTitle>
              <DialogDescription>
                Choose variants and quantities for: <span className="font-semibold">{selectedProductForVariant?.name}</span>
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Variant Name</TableHead>
                    <TableHead>Barcode</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right w-[120px]">Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productVariants.map((variant, index) => (
                    <TableRow key={variant.id}>
                      <TableCell className="font-medium">{variant.name}</TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">{variant.barcode || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={variant.quantity > 10 ? "default" : variant.quantity > 0 ? "outline" : "destructive"}>
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
                          className="text-right"
                          data-testid={`input-variant-quantity-${variant.id}`}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <DialogFooter className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowVariantDialog(false);
                  setSelectedProductForVariant(null);
                  setProductVariants([]);
                  setVariantQuantities({});
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={addVariantsToOrder}
                data-testid="button-add-variants"
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
                  title: "Success",
                  description: "Address saved (will be created with customer)",
                });
              } else {
                // For existing customers, save immediately
                createShippingAddressMutation.mutate(address);
              }
            }
          }}
          editingAddress={editingAddress}
          existingAddresses={Array.isArray(shippingAddresses) ? shippingAddresses : []}
          title={editingAddress ? "Edit Shipping Address" : "Add Shipping Address"}
          description={editingAddress ? "Update the shipping address details" : "Enter the new shipping address details"}
        />
      </div>
    </div>
  );
}