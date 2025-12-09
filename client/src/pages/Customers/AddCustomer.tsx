import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Plus, Trash2, Edit2, Check, X, Loader2, CheckCircle, XCircle, Globe, Building, MapPin, FileText, Truck, ChevronsUpDown, Pin, AlertCircle, Copy, Receipt, ChevronDown } from "lucide-react";
import { europeanCountries, euCountryCodes, getCountryFlag } from "@/lib/countries";
import type { Customer, CustomerShippingAddress, CustomerBillingAddress } from "@shared/schema";
import { cn } from "@/lib/utils";

const availableCountries = [
  ...europeanCountries,
  { code: 'VN', name: 'Vietnam' },
  { code: 'Other', name: 'Other' }
];

const createCustomerFormSchema = (t: (key: string) => string) => z.object({
  name: z.string().min(1, t('customers:nameRequired')),
  country: z.string().optional(),
  preferredCurrency: z.enum(['CZK', 'EUR']).default('EUR'),
  facebookName: z.string().optional(),
  facebookUrl: z.string().optional(),
  profilePictureUrl: z.string().optional(),
  billingCompany: z.string().optional(),
  billingFirstName: z.string().optional(),
  billingLastName: z.string().optional(),
  billingEmail: z.string().email(t('customers:invalidEmail')).optional().or(z.literal("")),
  billingTel: z.string().optional(),
  billingStreet: z.string().optional(),
  billingStreetNumber: z.string().optional(),
  billingCity: z.string().optional(),
  billingZipCode: z.string().optional(),
  billingCountry: z.string().optional(),
  ico: z.string().optional(),
  dic: z.string().optional(),
  vatNumber: z.string().optional(),
  vatValid: z.boolean().optional(),
  vatCompanyName: z.string().optional(),
  vatCompanyAddress: z.string().optional(),
});

const createShippingAddressSchema = (t: (key: string) => string) => z.object({
  id: z.string().optional(),
  label: z.string().optional(),
  firstName: z.string().min(1, t('customers:firstNameRequired')),
  lastName: z.string().min(1, t('customers:lastNameRequired')),
  company: z.string().optional(),
  email: z.string().email(t('customers:invalidEmail')).optional().or(z.literal("")),
  tel: z.string().optional(),
  street: z.string().min(1, t('customers:streetRequired')),
  streetNumber: z.string().optional(),
  city: z.string().min(1, t('customers:cityRequired')),
  zipCode: z.string().min(1, t('customers:zipCodeRequired')),
  country: z.string().min(1, t('customers:countryRequired')),
  isPrimary: z.boolean().default(false),
});

const createBillingAddressSchema = (t: (key: string) => string) => z.object({
  id: z.string().optional(),
  label: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  company: z.string().optional(),
  email: z.string().email(t('customers:invalidEmail')).optional().or(z.literal("")),
  tel: z.string().optional(),
  street: z.string().optional(),
  streetNumber: z.string().optional(),
  city: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  vatId: z.string().optional(),
  ico: z.string().optional(),
  isPrimary: z.boolean().default(false),
});

type CustomerFormData = z.infer<ReturnType<typeof createCustomerFormSchema>>;
type ShippingAddressFormData = z.infer<ReturnType<typeof createShippingAddressSchema>>;
type BillingAddressFormData = z.infer<ReturnType<typeof createBillingAddressSchema>>;

interface AddressAutocompleteResult {
  displayName: string;
  street: string;
  streetNumber: string;
  city: string;
  zipCode: string;
  country: string;
}

interface AresLookupResult {
  companyName: string;
  street: string;
  streetNumber: string;
  city: string;
  zipCode: string;
  country: string;
  dic: string;
}

interface VatValidationResult {
  valid: boolean;
  companyName?: string;
  companyAddress?: string;
  error?: string;
}

const DEFAULT_PINNED_COUNTRIES = ['CZ', 'DE', 'SK', 'PL', 'AT', 'VN'];

export default function AddCustomer() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const params = useParams();
  const customerId = params.id; // UUID string, not an integer
  const isEditMode = !!customerId;
  const { toast } = useToast();

  const [openCountryCombobox, setOpenCountryCombobox] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState("");
  
  const [pinnedCountries, setPinnedCountries] = useState<string[]>(() => {
    const stored = localStorage.getItem('pinnedCountries');
    return stored ? JSON.parse(stored) : DEFAULT_PINNED_COUNTRIES;
  });

  const [billingAddressQuery, setBillingAddressQuery] = useState("");
  const [billingAddressSuggestions, setBillingAddressSuggestions] = useState<AddressAutocompleteResult[]>([]);
  const [showBillingDropdown, setShowBillingDropdown] = useState(false);
  const [isLoadingBillingAutocomplete, setIsLoadingBillingAutocomplete] = useState(false);

  const [isLoadingAres, setIsLoadingAres] = useState(false);
  const [isValidatingVat, setIsValidatingVat] = useState(false);
  const [vatValidationResult, setVatValidationResult] = useState<VatValidationResult | null>(null);

  const [extractedFacebookId, setExtractedFacebookId] = useState<string>('');
  const [duplicateCustomer, setDuplicateCustomer] = useState<Customer | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  
  // Track the latest Facebook ID being checked for duplicates
  const latestDuplicateCheckRef = useRef<string>('');
  const shippingCountryDropdownRef = useRef<HTMLDivElement>(null);
  const billingCountryDropdownRef = useRef<HTMLDivElement>(null);

  const [shippingAddresses, setShippingAddresses] = useState<ShippingAddressFormData[]>([]);
  const [isAddingShipping, setIsAddingShipping] = useState(false);
  const [editingShippingIndex, setEditingShippingIndex] = useState<number | null>(null);
  const [shippingAddressQuery, setShippingAddressQuery] = useState("");
  const [shippingAddressSuggestions, setShippingAddressSuggestions] = useState<AddressAutocompleteResult[]>([]);
  const [showShippingDropdown, setShowShippingDropdown] = useState(false);
  const [isLoadingShippingAutocomplete, setIsLoadingShippingAutocomplete] = useState(false);

  const [shippingCountryQuery, setShippingCountryQuery] = useState("");
  const [showShippingCountryDropdown, setShowShippingCountryDropdown] = useState(false);

  const [rawShippingAddress, setRawShippingAddress] = useState("");
  const [rawBillingAddress, setRawBillingAddress] = useState("");
  const [isLabelManuallyEdited, setIsLabelManuallyEdited] = useState(false);
  const [isNameManuallyEdited, setIsNameManuallyEdited] = useState(false);

  // Billing addresses state (multiple addresses)
  const [billingAddresses, setBillingAddresses] = useState<BillingAddressFormData[]>([]);
  const [isAddingBilling, setIsAddingBilling] = useState(false);
  const [editingBillingIndex, setEditingBillingIndex] = useState<number | null>(null);
  const [billingAddressQueryAutocomplete, setBillingAddressQueryAutocomplete] = useState("");
  const [billingAddressSuggestionsAutocomplete, setBillingAddressSuggestionsAutocomplete] = useState<AddressAutocompleteResult[]>([]);
  const [showBillingAutocompleteDropdown, setShowBillingAutocompleteDropdown] = useState(false);
  const [isLoadingBillingAddressAutocomplete, setIsLoadingBillingAddressAutocomplete] = useState(false);
  const [billingCountryQuery, setBillingCountryQuery] = useState("");
  const [showBillingCountryDropdown, setShowBillingCountryDropdown] = useState(false);
  const [rawBillingAddressForm, setRawBillingAddressForm] = useState("");
  const [isBillingLabelManuallyEdited, setIsBillingLabelManuallyEdited] = useState(false);
  const [deletingBillingAddressId, setDeletingBillingAddressId] = useState<string | null>(null);
  const [deleteBillingIndex, setDeleteBillingIndex] = useState<number | null>(null);

  // Track Smart Paste confidence highlighting
  const [shippingFieldConfidence, setShippingFieldConfidence] = useState<Record<string, string>>({});
  const [billingFieldConfidence, setBillingFieldConfidence] = useState<Record<string, string>>({});
  const [billingAddressFieldConfidence, setBillingAddressFieldConfidence] = useState<Record<string, string>>({});

  // Collapsible sections state with localStorage persistence
  const [customerDetailsOpen, setCustomerDetailsOpen] = useState<boolean>(() => {
    const stored = localStorage.getItem('customerDetailsOpen');
    return stored !== null ? JSON.parse(stored) : true;
  });
  const [shippingAddressesOpen, setShippingAddressesOpen] = useState<boolean>(() => {
    const stored = localStorage.getItem('shippingAddressesOpen');
    return stored !== null ? JSON.parse(stored) : true;
  });
  const [billingAddressesOpen, setBillingAddressesOpen] = useState<boolean>(() => {
    const stored = localStorage.getItem('billingAddressesOpen');
    return stored !== null ? JSON.parse(stored) : true;
  });
  const [taxInfoOpen, setTaxInfoOpen] = useState<boolean>(() => {
    const stored = localStorage.getItem('taxInfoOpen');
    return stored !== null ? JSON.parse(stored) : true;
  });

  // Save collapsible states to localStorage when they change
  useEffect(() => {
    localStorage.setItem('customerDetailsOpen', JSON.stringify(customerDetailsOpen));
  }, [customerDetailsOpen]);

  useEffect(() => {
    localStorage.setItem('shippingAddressesOpen', JSON.stringify(shippingAddressesOpen));
  }, [shippingAddressesOpen]);

  useEffect(() => {
    localStorage.setItem('billingAddressesOpen', JSON.stringify(billingAddressesOpen));
  }, [billingAddressesOpen]);

  useEffect(() => {
    localStorage.setItem('taxInfoOpen', JSON.stringify(taxInfoOpen));
  }, [taxInfoOpen]);

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(createCustomerFormSchema(t)),
    defaultValues: {
      name: "",
      country: "",
      preferredCurrency: "EUR",
      facebookName: "",
      facebookUrl: "",
      profilePictureUrl: "",
      billingFirstName: "",
      billingLastName: "",
      billingCompany: "",
      billingEmail: "",
      billingTel: "",
      billingStreet: "",
      billingStreetNumber: "",
      billingCity: "",
      billingZipCode: "",
      billingCountry: "",
      ico: "",
      dic: "",
      vatNumber: "",
      vatValid: false,
      vatCompanyName: "",
      vatCompanyAddress: "",
    },
  });

  const shippingForm = useForm<ShippingAddressFormData>({
    resolver: zodResolver(createShippingAddressSchema(t)),
    defaultValues: {
      label: "",
      firstName: "",
      lastName: "",
      company: "",
      email: "",
      tel: "",
      street: "",
      streetNumber: "",
      city: "",
      zipCode: "",
      country: "",
      isPrimary: false,
    },
  });

  const billingAddressForm = useForm<BillingAddressFormData>({
    resolver: zodResolver(createBillingAddressSchema(t)),
    defaultValues: {
      id: undefined,
      label: "",
      firstName: "",
      lastName: "",
      company: "",
      email: "",
      tel: "",
      street: "",
      streetNumber: "",
      city: "",
      zipCode: "",
      country: "",
      vatId: "",
      ico: "",
      isPrimary: false,
    },
  });

  const { data: existingCustomer, isLoading: isLoadingCustomer} = useQuery<Customer>({
    queryKey: ['/api/customers', customerId],
    enabled: isEditMode,
  });

  const { data: existingShippingAddresses } = useQuery<CustomerShippingAddress[]>({
    queryKey: ['/api/customers', customerId, 'shipping-addresses'],
    enabled: isEditMode,
  });

  const { data: existingBillingAddresses } = useQuery<CustomerBillingAddress[]>({
    queryKey: ['/api/customers', customerId, 'billing-addresses'],
    enabled: isEditMode,
  });

  useEffect(() => {
    if (existingCustomer && isEditMode) {
      form.reset({
        name: existingCustomer.name || "",
        country: getCountryCode(existingCustomer.country || ""),
        preferredCurrency: (existingCustomer as any).preferredCurrency || "EUR",
        facebookName: existingCustomer.facebookName || "",
        facebookUrl: existingCustomer.facebookUrl || "",
        profilePictureUrl: existingCustomer.profilePictureUrl || "",
        billingFirstName: existingCustomer.billingFirstName || "",
        billingLastName: existingCustomer.billingLastName || "",
        billingCompany: existingCustomer.billingCompany || "",
        billingEmail: existingCustomer.billingEmail || "",
        billingTel: existingCustomer.billingTel || "",
        billingStreet: existingCustomer.billingStreet || "",
        billingStreetNumber: existingCustomer.billingStreetNumber || "",
        billingCity: existingCustomer.billingCity || "",
        billingZipCode: existingCustomer.billingZipCode || "",
        billingCountry: existingCustomer.billingCountry || "",
        ico: existingCustomer.ico || "",
        dic: existingCustomer.dic || "",
        vatNumber: existingCustomer.vatNumber || "",
        vatValid: existingCustomer.vatValid || false,
        vatCompanyName: existingCustomer.vatCompanyName || "",
        vatCompanyAddress: existingCustomer.vatCompanyAddress || "",
      });
      if (existingCustomer.vatValid !== null && existingCustomer.vatValid !== undefined) {
        setVatValidationResult({
          valid: existingCustomer.vatValid,
          companyName: existingCustomer.vatCompanyName || undefined,
          companyAddress: existingCustomer.vatCompanyAddress || undefined,
        });
      }
      // Extract Facebook ID from existing customer's URL
      if (existingCustomer.facebookUrl) {
        const extractedId = extractFacebookId(existingCustomer.facebookUrl);
        setExtractedFacebookId(extractedId);
      }
    }
  }, [existingCustomer, isEditMode, form]);

  useEffect(() => {
    if (existingShippingAddresses) {
      setShippingAddresses(existingShippingAddresses.map(addr => ({
        id: addr.id,
        label: addr.label || "",
        firstName: addr.firstName || "",
        lastName: addr.lastName || "",
        company: addr.company || "",
        email: addr.email || "",
        tel: addr.tel || "",
        street: addr.street || "",
        streetNumber: addr.streetNumber || "",
        city: addr.city || "",
        zipCode: addr.zipCode || "",
        country: addr.country || "",
        isPrimary: addr.isPrimary || false,
      })));
    }
  }, [existingShippingAddresses]);

  useEffect(() => {
    if (existingBillingAddresses) {
      setBillingAddresses(existingBillingAddresses.map(addr => ({
        id: addr.id,
        label: addr.label || "",
        firstName: addr.firstName || "",
        lastName: addr.lastName || "",
        company: addr.company || "",
        email: addr.email || "",
        tel: addr.tel || "",
        street: addr.street || "",
        streetNumber: addr.streetNumber || "",
        city: addr.city || "",
        zipCode: addr.zipCode || "",
        country: addr.country || "",
        isPrimary: addr.isPrimary || false,
      })));
    }
  }, [existingBillingAddresses]);

  const selectedCountry = form.watch('country');
  const nameValue = form.watch('name');
  const facebookNameValue = form.watch('facebookName');
  const facebookUrlValue = form.watch('facebookUrl');

  // Helper function to get phone country code from country name
  const getPhoneCountryCode = (countryName: string): string => {
    const countryCodeMap: { [key: string]: string } = {
      'Czech Republic': '+420',
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

  // Helper function to convert country name to country code
  const getCountryCode = (countryNameOrCode: string): string => {
    if (!countryNameOrCode) return '';
    
    // Check if it's already a country code (2-3 letters uppercase)
    if (countryNameOrCode.length <= 3 && countryNameOrCode === countryNameOrCode.toUpperCase()) {
      return countryNameOrCode;
    }
    
    // Try to find the country by name
    const country = availableCountries.find(
      c => c.name.toLowerCase() === countryNameOrCode.toLowerCase()
    );
    
    return country ? country.code : countryNameOrCode;
  };

  useEffect(() => {
    if (selectedCountry && !isEditMode) {
      form.setValue('billingCountry', selectedCountry);
    }
  }, [selectedCountry, isEditMode, form]);

  // Auto-sync Facebook name to Name field (unless manually edited)
  useEffect(() => {
    // Skip if in edit mode (don't override existing customer names)
    if (isEditMode) return;
    
    // Skip if name has been manually edited
    if (isNameManuallyEdited) return;
    
    // Skip if there's no Facebook name
    if (!facebookNameValue || !facebookNameValue.trim()) return;
    
    // Sync Facebook name to Name field
    form.setValue('name', facebookNameValue);
  }, [facebookNameValue, isNameManuallyEdited, isEditMode, form]);

  // Auto-generate shipping address label
  const shippingFirstName = shippingForm.watch('firstName');
  const shippingLastName = shippingForm.watch('lastName');
  const shippingCompany = shippingForm.watch('company');
  const shippingStreet = shippingForm.watch('street');
  const shippingStreetNumber = shippingForm.watch('streetNumber');
  const shippingCity = shippingForm.watch('city');
  
  useEffect(() => {
    // Only auto-generate if label hasn't been manually edited
    if (isLabelManuallyEdited) return;
    
    const parts: string[] = [];
    
    // Add name or company
    if (shippingCompany?.trim()) {
      parts.push(shippingCompany.trim());
    } else if (shippingFirstName?.trim() || shippingLastName?.trim()) {
      const fullName = [shippingFirstName?.trim(), shippingLastName?.trim()].filter(Boolean).join(' ');
      if (fullName) parts.push(fullName);
    }
    
    // Add street address if available
    if (shippingStreet?.trim()) {
      const streetPart = [shippingStreet.trim(), shippingStreetNumber?.trim()].filter(Boolean).join(' ');
      if (streetPart) parts.push(streetPart);
    }
    
    // Add city
    if (shippingCity?.trim()) {
      parts.push(shippingCity.trim());
    }
    
    // Generate label with address count
    let generatedLabel = parts.join(', ');
    
    // Add address count suffix if there are multiple addresses
    const addressCount = shippingAddresses.length + 1; // +1 for the current one being added
    if (generatedLabel) {
      generatedLabel = `${generatedLabel} (#${addressCount})`;
    } else {
      // If no details available, use a simple format
      generatedLabel = t('customers:addressNumber', { count: addressCount });
    }
    
    if (generatedLabel) {
      shippingForm.setValue('label', generatedLabel);
    }
  }, [
    shippingFirstName, 
    shippingLastName, 
    shippingCompany, 
    shippingStreet, 
    shippingStreetNumber, 
    shippingCity,
    isLabelManuallyEdited,
    shippingForm,
    shippingAddresses.length
  ]);

  // Auto-generate billing address label
  const billingFirstName = billingAddressForm.watch('firstName');
  const billingLastName = billingAddressForm.watch('lastName');
  const billingCompany = billingAddressForm.watch('company');
  const billingStreet = billingAddressForm.watch('street');
  const billingStreetNumber = billingAddressForm.watch('streetNumber');
  const billingCity = billingAddressForm.watch('city');
  
  useEffect(() => {
    if (isBillingLabelManuallyEdited) return;
    
    const parts: string[] = [];
    
    if (billingCompany?.trim()) {
      parts.push(billingCompany.trim());
    } else if (billingFirstName?.trim() || billingLastName?.trim()) {
      const fullName = [billingFirstName?.trim(), billingLastName?.trim()].filter(Boolean).join(' ');
      if (fullName) parts.push(fullName);
    }
    
    if (billingStreet?.trim()) {
      const streetPart = [billingStreet.trim(), billingStreetNumber?.trim()].filter(Boolean).join(' ');
      if (streetPart) parts.push(streetPart);
    }
    
    if (billingCity?.trim()) {
      parts.push(billingCity.trim());
    }
    
    let generatedLabel = parts.join(', ');
    
    const addressCount = billingAddresses.length + 1;
    if (generatedLabel) {
      generatedLabel = `${generatedLabel} (#${addressCount})`;
    } else {
      generatedLabel = t('customers:addressNumber', { count: addressCount });
    }
    
    if (generatedLabel) {
      billingAddressForm.setValue('label', generatedLabel);
    }
  }, [
    billingFirstName, 
    billingLastName, 
    billingCompany, 
    billingStreet, 
    billingStreetNumber, 
    billingCity,
    isBillingLabelManuallyEdited,
    billingAddressForm,
    billingAddresses.length
  ]);

  // Auto-format shipping phone number when country changes
  const shippingCountry = shippingForm.watch('country');
  const shippingTel = shippingForm.watch('tel');
  
  useEffect(() => {
    if (!shippingTel || !shippingCountry) return;
    
    const countryCode = getPhoneCountryCode(shippingCountry);
    if (!countryCode) return;
    
    // Only format if doesn't already start with +
    if (!shippingTel.startsWith('+')) {
      const formatted = formatPhoneNumber(shippingTel, countryCode);
      if (formatted !== shippingTel) {
        shippingForm.setValue('tel', formatted);
      }
    }
  }, [shippingCountry, shippingForm]);

  // Auto-format billing phone number when country changes
  const billingCountry = billingAddressForm.watch('country');
  const billingTel = billingAddressForm.watch('tel');
  
  useEffect(() => {
    if (!billingTel || !billingCountry) return;
    
    const countryCode = getPhoneCountryCode(billingCountry);
    if (!countryCode) return;
    
    // Only format if doesn't already start with +
    if (!billingTel.startsWith('+')) {
      const formatted = formatPhoneNumber(billingTel, countryCode);
      if (formatted !== billingTel) {
        billingAddressForm.setValue('tel', formatted);
      }
    }
  }, [billingCountry, billingAddressForm]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shippingCountryDropdownRef.current && !shippingCountryDropdownRef.current.contains(event.target as Node)) {
        setShowShippingCountryDropdown(false);
      }
      if (billingCountryDropdownRef.current && !billingCountryDropdownRef.current.contains(event.target as Node)) {
        setShowBillingCountryDropdown(false);
      }
    };

    if (showShippingCountryDropdown || showBillingCountryDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showShippingCountryDropdown, showBillingCountryDropdown]);

  const debounce = <T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): ((...args: Parameters<T>) => void) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  };

  const fetchAddressAutocomplete = async (query: string): Promise<AddressAutocompleteResult[]> => {
    if (query.length < 3) return [];
    try {
      const response = await fetch(`/api/addresses/autocomplete?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Failed to fetch addresses');
      return await response.json();
    } catch (error) {
      console.error('Error fetching address autocomplete:', error);
      return [];
    }
  };

  const searchBillingAddress = useCallback(
    debounce(async (query: string) => {
      if (query.length < 3) {
        setBillingAddressSuggestions([]);
        setShowBillingDropdown(false);
        return;
      }
      setIsLoadingBillingAutocomplete(true);
      setShowBillingDropdown(true);
      const results = await fetchAddressAutocomplete(query);
      setBillingAddressSuggestions(results);
      setIsLoadingBillingAutocomplete(false);
    }, 300),
    []
  );

  const searchShippingAddress = useCallback(
    debounce(async (query: string) => {
      if (query.length < 3) {
        setShippingAddressSuggestions([]);
        setShowShippingDropdown(false);
        return;
      }
      setIsLoadingShippingAutocomplete(true);
      setShowShippingDropdown(true);
      const results = await fetchAddressAutocomplete(query);
      setShippingAddressSuggestions(results);
      setIsLoadingShippingAutocomplete(false);
    }, 300),
    []
  );

  const selectBillingAddress = (suggestion: AddressAutocompleteResult) => {
    form.setValue('billingStreet', suggestion.street);
    form.setValue('billingStreetNumber', suggestion.streetNumber);
    form.setValue('billingCity', suggestion.city);
    form.setValue('billingZipCode', suggestion.zipCode);
    form.setValue('billingCountry', suggestion.country);
    setBillingAddressQuery(suggestion.displayName);
    setShowBillingDropdown(false);
  };

  const selectShippingAddress = (suggestion: AddressAutocompleteResult) => {
    // Reset manual edit flag so label auto-generates from autocomplete data
    setIsLabelManuallyEdited(false);
    
    shippingForm.setValue('street', suggestion.street);
    shippingForm.setValue('streetNumber', suggestion.streetNumber);
    shippingForm.setValue('city', suggestion.city);
    shippingForm.setValue('zipCode', suggestion.zipCode);
    shippingForm.setValue('country', suggestion.country);
    setShippingAddressQuery(suggestion.displayName);
    setShowShippingDropdown(false);
  };

  const searchBillingAddressForm = useCallback(
    debounce(async (query: string) => {
      if (query.length < 3) {
        setBillingAddressSuggestionsAutocomplete([]);
        setShowBillingAutocompleteDropdown(false);
        return;
      }
      setIsLoadingBillingAddressAutocomplete(true);
      setShowBillingAutocompleteDropdown(true);
      const results = await fetchAddressAutocomplete(query);
      setBillingAddressSuggestionsAutocomplete(results);
      setIsLoadingBillingAddressAutocomplete(false);
    }, 300),
    []
  );

  const selectBillingAddressForm = (suggestion: AddressAutocompleteResult) => {
    setIsBillingLabelManuallyEdited(false);
    
    billingAddressForm.setValue('street', suggestion.street);
    billingAddressForm.setValue('streetNumber', suggestion.streetNumber);
    billingAddressForm.setValue('city', suggestion.city);
    billingAddressForm.setValue('zipCode', suggestion.zipCode);
    billingAddressForm.setValue('country', suggestion.country);
    setBillingAddressQueryAutocomplete(suggestion.displayName);
    setShowBillingAutocompleteDropdown(false);
  };

  const handleAresLookup = async (ico: string) => {
    if (!ico || ico.length < 8) return;
    setIsLoadingAres(true);
    try {
      const response = await fetch(`/api/tax/ares-lookup?ico=${encodeURIComponent(ico)}`);
      if (!response.ok) {
        if (response.status === 404) {
          toast({
            title: t('customers:error'),
            description: t('customers:failedToParseAddress'),
            variant: "destructive",
          });
        }
        throw new Error('Failed to fetch ARES data');
      }
      const data: AresLookupResult = await response.json();
      form.setValue('billingCompany', data.companyName);
      form.setValue('billingStreet', data.street);
      form.setValue('billingStreetNumber', data.streetNumber);
      form.setValue('billingCity', data.city);
      form.setValue('billingZipCode', data.zipCode);
      form.setValue('billingCountry', data.country);
      form.setValue('dic', data.dic);
      toast({
        title: t('customers:success'),
        description: t('customers:autoFilledFromAres'),
      });
    } catch (error) {
      console.error('Error fetching ARES data:', error);
    } finally {
      setIsLoadingAres(false);
    }
  };

  const extractFacebookId = (url: string): string => {
    if (!url) return '';
    
    try {
      // Parse the URL to validate domain
      const parsedUrl = new URL(url);
      
      // Validate that it's actually a Facebook domain
      const allowedDomains = ['facebook.com', 'www.facebook.com', 'm.facebook.com', 'mbasic.facebook.com'];
      if (!allowedDomains.includes(parsedUrl.hostname.toLowerCase())) {
        return '';
      }
      
      // Pattern 1: profile.php?id=NUMERIC_ID
      // Only accept numeric IDs
      if (parsedUrl.pathname === '/profile.php') {
        const id = parsedUrl.searchParams.get('id');
        if (id && /^\d+$/.test(id)) {
          return id;
        }
        return '';
      }
      
      // Pattern 2: facebook.com/username
      // Extract username from pathname
      const pathname = parsedUrl.pathname;
      const usernameMatch = pathname.match(/^\/([^/?#]+)/);
      
      if (usernameMatch) {
        const username = usernameMatch[1];
        
        // List of Facebook system/reserved pages to exclude
        const systemPages = [
          'profile.php', 'help', 'about', 'privacy', 'terms', 'settings', 
          'pages', 'groups', 'events', 'marketplace', 'watch', 'gaming',
          'messages', 'notifications', 'login', 'logout', 'recover', 'home'
        ];
        
        // Check if it's a system page
        if (systemPages.includes(username.toLowerCase())) {
          return '';
        }
        
        // Validate username pattern (letters, numbers, dots, underscores, hyphens)
        // Must be at least 2 characters long
        if (/^[a-zA-Z0-9._-]{2,}$/.test(username)) {
          return username;
        }
      }
      
      return '';
    } catch (error) {
      // Invalid URL format
      return '';
    }
  };

  const checkDuplicateCustomer = useCallback(
    debounce(async (facebookId: string) => {
      // Update the latest request ID
      latestDuplicateCheckRef.current = facebookId;
      
      if (!facebookId || facebookId.length < 2 || isEditMode) {
        setDuplicateCustomer(null);
        setIsCheckingDuplicate(false);
        return;
      }
      
      // Track the current request ID to guard against stale responses
      const requestId = facebookId;
      
      try {
        setIsCheckingDuplicate(true);
        
        const response = await fetch(`/api/customers/check-duplicate/${encodeURIComponent(facebookId)}`);
        if (!response.ok) {
          throw new Error('Failed to check duplicate');
        }
        const data = await response.json();
        
        // Only update state if this is still the latest request
        if (requestId === latestDuplicateCheckRef.current) {
          if (data.exists && data.customer) {
            setDuplicateCustomer(data.customer);
          } else {
            setDuplicateCustomer(null);
          }
        }
      } catch (error) {
        console.error('Error checking duplicate customer:', error);
        // Only clear duplicate if this was the latest request
        if (requestId === latestDuplicateCheckRef.current) {
          setDuplicateCustomer(null);
        }
      } finally {
        // Only clear loading if this was the latest request
        if (requestId === latestDuplicateCheckRef.current) {
          setIsCheckingDuplicate(false);
        }
      }
    }, 500),
    [isEditMode]
  );

  const handleVatValidation = async (vatNumber: string, countryCode: string) => {
    if (!vatNumber || !countryCode) {
      setVatValidationResult(null);
      return;
    }
    setIsValidatingVat(true);
    try {
      const response = await apiRequest('POST', '/api/tax/validate-vat', {
        vatNumber,
        countryCode,
      });
      const data: VatValidationResult = await response.json();
      setVatValidationResult(data);
      form.setValue('vatValid', data.valid);
      if (data.companyName) {
        form.setValue('vatCompanyName', data.companyName);
      }
      if (data.companyAddress) {
        form.setValue('vatCompanyAddress', data.companyAddress);
      }
    } catch (error) {
      console.error('Error validating VAT:', error);
      setVatValidationResult({ valid: false, error: 'Validation failed' });
    } finally {
      setIsValidatingVat(false);
    }
  };

  const handleAddShippingAddress = () => {
    setIsAddingShipping(true);
    setIsLabelManuallyEdited(false); // Reset manual edit flag for new address
    
    // Clear country query to show pre-filled value
    setShippingCountryQuery("");
    setShowShippingCountryDropdown(false);
    
    // Auto-select country based on main customer country
    const mainCountryCode = form.getValues('country');
    const mainCountryName = mainCountryCode 
      ? availableCountries.find(c => c.code === mainCountryCode)?.name || ''
      : '';
    
    shippingForm.reset({
      label: "",
      firstName: form.getValues('billingFirstName') || "",
      lastName: form.getValues('billingLastName') || "",
      company: form.getValues('billingCompany') || "",
      email: form.getValues('billingEmail') || "",
      tel: form.getValues('billingTel') || "",
      street: "",
      streetNumber: "",
      city: "",
      zipCode: "",
      country: mainCountryName || form.getValues('billingCountry') || "",
      isPrimary: shippingAddresses.length === 0,
    });
  };

  const handleSaveShippingAddress = async (data: ShippingAddressFormData) => {
    if (isEditMode && customerId) {
      // In edit mode, save directly to database
      try {
        const shippingData = {
          customerId: customerId,
          ...data,
        };
        
        if (editingShippingIndex !== null && shippingAddresses[editingShippingIndex]?.id) {
          // Update existing address
          const addressId = shippingAddresses[editingShippingIndex].id;
          await apiRequest('PATCH', `/api/shipping-addresses/${addressId}`, shippingData);
          toast({
            title: t('customers:success'),
            description: t('customers:shippingAddressUpdatedSuccessfully'),
          });
        } else {
          // Create new address
          await apiRequest('POST', `/api/customers/${customerId}/shipping-addresses`, shippingData);
          toast({
            title: t('customers:success'),
            description: t('customers:shippingAddressAddedSuccessfully'),
          });
        }
        
        // Refresh the addresses from the server
        queryClient.invalidateQueries({ queryKey: ['/api/customers', customerId, 'shipping-addresses'] });
        
        setIsAddingShipping(false);
        setEditingShippingIndex(null);
        setIsLabelManuallyEdited(false);
        shippingForm.reset();
      } catch (error: any) {
        toast({
          title: t('customers:error'),
          description: error.message || t('customers:failedToSaveShippingAddress'),
          variant: "destructive",
        });
      }
    } else {
      // In add mode, just update local state
      if (editingShippingIndex !== null) {
        const updated = [...shippingAddresses];
        updated[editingShippingIndex] = data;
        setShippingAddresses(updated);
        setEditingShippingIndex(null);
      } else {
        setShippingAddresses([...shippingAddresses, data]);
      }
      
      // Auto-populate main country if empty and shipping address has a country
      if (!form.getValues('country') && data.country) {
        const countryCode = europeanCountries.find(c => c.name.toLowerCase() === data.country.toLowerCase())?.code;
        if (countryCode) {
          form.setValue('country', countryCode);
        }
      }
      
      setIsAddingShipping(false);
      setIsLabelManuallyEdited(false); // Reset for next address
      shippingForm.reset();
    }
  };

  const handleEditShippingAddress = (index: number) => {
    // Toggle: if already editing this address, close it
    if (editingShippingIndex === index && isAddingShipping) {
      setIsAddingShipping(false);
      setEditingShippingIndex(null);
      setIsLabelManuallyEdited(false);
      shippingForm.reset();
      return;
    }
    
    setEditingShippingIndex(index);
    setIsLabelManuallyEdited(true); // Preserve existing label when editing
    
    // Clear country query to show pre-filled value
    setShippingCountryQuery("");
    setShowShippingCountryDropdown(false);
    
    shippingForm.reset(shippingAddresses[index]);
    setIsAddingShipping(true);
  };

  const handleDeleteShippingAddress = (index: number) => {
    const updated = shippingAddresses.filter((_, i) => i !== index);
    if (shippingAddresses[index].isPrimary && updated.length > 0) {
      updated[0].isPrimary = true;
    }
    setShippingAddresses(updated);
  };

  const handleSetPrimary = (index: number) => {
    const updated = shippingAddresses.map((addr, i) => ({
      ...addr,
      isPrimary: i === index,
    }));
    setShippingAddresses(updated);
  };

  // Billing address handlers
  const handleAddBillingAddress = () => {
    setIsAddingBilling(true);
    setIsBillingLabelManuallyEdited(false);
    
    setBillingCountryQuery("");
    setShowBillingCountryDropdown(false);
    
    const mainCountryCode = form.getValues('country');
    const mainCountryName = mainCountryCode 
      ? availableCountries.find(c => c.code === mainCountryCode)?.name || ''
      : '';
    
    billingAddressForm.reset({
      label: "",
      firstName: form.getValues('billingFirstName') || "",
      lastName: form.getValues('billingLastName') || "",
      company: form.getValues('billingCompany') || "",
      email: form.getValues('billingEmail') || "",
      tel: form.getValues('billingTel') || "",
      street: "",
      streetNumber: "",
      city: "",
      zipCode: "",
      country: mainCountryName || form.getValues('billingCountry') || "",
      isPrimary: billingAddresses.length === 0,
    });
  };

  const handleSaveBillingAddress = async (data: BillingAddressFormData) => {
    if (isEditMode && customerId) {
      // In edit mode, save directly to database
      try {
        const billingData = {
          customerId: customerId,
          ...data,
        };
        
        if (editingBillingIndex !== null && billingAddresses[editingBillingIndex]?.id) {
          // Update existing address
          const addressId = billingAddresses[editingBillingIndex].id;
          await apiRequest('PATCH', `/api/billing-addresses/${addressId}`, billingData);
          toast({
            title: t('customers:success'),
            description: t('customers:billingAddressUpdatedSuccessfully'),
          });
        } else {
          // Create new address
          await apiRequest('POST', `/api/customers/${customerId}/billing-addresses`, billingData);
          toast({
            title: t('customers:success'),
            description: t('customers:billingAddressAddedSuccessfully'),
          });
        }
        
        // Refresh the addresses from the server
        queryClient.invalidateQueries({ queryKey: ['/api/customers', customerId, 'billing-addresses'] });
        
        setIsAddingBilling(false);
        setEditingBillingIndex(null);
        setIsBillingLabelManuallyEdited(false);
        billingAddressForm.reset();
      } catch (error: any) {
        toast({
          title: t('customers:error'),
          description: error.message || t('customers:failedToSaveBillingAddress'),
          variant: "destructive",
        });
      }
    } else {
      // In add mode, just update local state
      if (editingBillingIndex !== null) {
        const updated = [...billingAddresses];
        updated[editingBillingIndex] = data;
        setBillingAddresses(updated);
        setEditingBillingIndex(null);
      } else {
        setBillingAddresses([...billingAddresses, data]);
      }
      
      setIsAddingBilling(false);
      setIsBillingLabelManuallyEdited(false);
      billingAddressForm.reset();
    }
  };

  const handleEditBillingAddress = (index: number) => {
    // Toggle: if already editing this address, close it
    if (editingBillingIndex === index && isAddingBilling) {
      setIsAddingBilling(false);
      setEditingBillingIndex(null);
      setIsBillingLabelManuallyEdited(false);
      billingAddressForm.reset();
      return;
    }
    
    setEditingBillingIndex(index);
    setIsBillingLabelManuallyEdited(true);
    
    setBillingCountryQuery("");
    setShowBillingCountryDropdown(false);
    
    billingAddressForm.reset(billingAddresses[index]);
    setIsAddingBilling(true);
  };

  const handleDeleteBillingAddress = (index: number) => {
    const updated = billingAddresses.filter((_, i) => i !== index);
    if (billingAddresses[index].isPrimary && updated.length > 0) {
      updated[0].isPrimary = true;
    }
    setBillingAddresses(updated);
  };

  const confirmDeleteBillingAddress = () => {
    if (deleteBillingIndex !== null) {
      handleDeleteBillingAddress(deleteBillingIndex);
      setDeleteBillingIndex(null);
    }
  };

  const handleSetBillingPrimary = (index: number) => {
    const updated = billingAddresses.map((addr, i) => ({
      ...addr,
      isPrimary: i === index,
    }));
    setBillingAddresses(updated);
  };

  const capitalizeWords = (str: string) => {
    return str.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  // Remove Vietnamese diacritics and convert to plain English letters
  const removeVietnameseDiacritics = (str: string): string => {
    const diacriticsMap: Record<string, string> = {
      'à': 'a', 'á': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
      'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
      'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
      'è': 'e', 'é': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
      'ê': 'e', 'ề': 'e', 'ế': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
      'ì': 'i', 'í': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
      'ò': 'o', 'ó': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
      'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
      'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
      'ù': 'u', 'ú': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
      'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
      'ỳ': 'y', 'ý': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
      'đ': 'd', 'Đ': 'D',
      'À': 'A', 'Á': 'A', 'Ả': 'A', 'Ã': 'A', 'Ạ': 'A',
      'Ă': 'A', 'Ằ': 'A', 'Ắ': 'A', 'Ẳ': 'A', 'Ẵ': 'A', 'Ặ': 'A',
      'Â': 'A', 'Ầ': 'A', 'Ấ': 'A', 'Ẩ': 'A', 'Ẫ': 'A', 'Ậ': 'A',
      'È': 'E', 'É': 'E', 'Ẻ': 'E', 'Ẽ': 'E', 'Ẹ': 'E',
      'Ê': 'E', 'Ề': 'E', 'Ế': 'E', 'Ể': 'E', 'Ễ': 'E', 'Ệ': 'E',
      'Ì': 'I', 'Í': 'I', 'Ỉ': 'I', 'Ĩ': 'I', 'Ị': 'I',
      'Ò': 'O', 'Ó': 'O', 'Ỏ': 'O', 'Õ': 'O', 'Ọ': 'O',
      'Ô': 'O', 'Ồ': 'O', 'Ố': 'O', 'Ổ': 'O', 'Ỗ': 'O', 'Ộ': 'O',
      'Ơ': 'O', 'Ờ': 'O', 'Ớ': 'O', 'Ở': 'O', 'Ỡ': 'O', 'Ợ': 'O',
      'Ù': 'U', 'Ú': 'U', 'Ủ': 'U', 'Ũ': 'U', 'Ụ': 'U',
      'Ư': 'U', 'Ừ': 'U', 'Ứ': 'U', 'Ử': 'U', 'Ữ': 'U', 'Ự': 'U',
      'Ỳ': 'Y', 'Ý': 'Y', 'Ỷ': 'Y', 'Ỹ': 'Y', 'Ỵ': 'Y',
    };
    
    return str.split('').map(char => diacriticsMap[char] || char).join('');
  };

  // Get CSS class for field based on confidence level (color psychology)
  const getConfidenceClass = (fieldName: string, confidenceMap: Record<string, string>) => {
    const confidence = confidenceMap[fieldName];
    if (!confidence) return '';
    
    switch (confidence.toLowerCase()) {
      case 'high':
        return 'bg-green-50 border-green-300 focus:border-green-500'; // Green = trust, accuracy
      case 'medium':
        return 'bg-amber-50 border-amber-300 focus:border-amber-500'; // Amber = caution, review
      case 'low':
        return 'bg-red-50 border-red-300 focus:border-red-500'; // Red = warning, verify
      default:
        return '';
    }
  };

  // Helper function to find country code from country name
  const findCountryCode = (countryName: string): string | null => {
    if (!countryName) return null;
    
    const normalizedName = countryName.toLowerCase().trim();
    const country = availableCountries.find(
      c => c.name.toLowerCase() === normalizedName || 
           c.code.toLowerCase() === normalizedName
    );
    
    return country ? country.code : null;
  };

  const parseShippingAddressMutation = useMutation({
    mutationFn: async (rawAddress: string) => {
      const res = await apiRequest('POST', '/api/addresses/parse', { rawAddress });
      return res.json();
    },
    onSuccess: (data: { fields: any; confidence: string }) => {
      const { fields } = data;
      
      // Reset manual edit flag so label auto-generates from Smart Paste data
      setIsLabelManuallyEdited(false);
      
      // Track which fields were filled and their confidence
      const filledFields: Record<string, string> = {};
      
      // Apply Vietnamese name detection and correction locally
      let firstName = fields.firstName || '';
      let lastName = fields.lastName || '';
      let company = fields.company || '';
      
      // If no personal name but there's a company/salon name, use it for names
      if (!firstName && !lastName && company) {
        const companyWords = company.trim().split(/\s+/);
        
        if (companyWords.length === 1) {
          // Single word salon name - duplicate to all fields
          firstName = company;
          lastName = company;
        } else {
          // Multiple words - split like Vietnamese name (first word = last name, rest = first name)
          lastName = companyWords[0];
          firstName = companyWords.slice(1).join(' ');
        }
      } else if (firstName || lastName) {
        // Apply Vietnamese name detection for actual names
        const corrected = detectAndCorrectVietnameseName(firstName, lastName);
        firstName = corrected.firstName;
        lastName = corrected.lastName;
      }
      
      // Remove Vietnamese diacritics, capitalize, and track filled fields
      if (firstName) {
        const cleanFirstName = removeVietnameseDiacritics(firstName);
        shippingForm.setValue('firstName', capitalizeWords(cleanFirstName));
        filledFields.firstName = data.confidence;
      }
      if (lastName) {
        const cleanLastName = removeVietnameseDiacritics(lastName);
        shippingForm.setValue('lastName', capitalizeWords(cleanLastName));
        filledFields.lastName = data.confidence;
      }
      if (company) {
        const cleanCompany = removeVietnameseDiacritics(company);
        shippingForm.setValue('company', cleanCompany);
        filledFields.company = data.confidence;
      }
      if (fields.email) {
        shippingForm.setValue('email', fields.email);
        filledFields.email = data.confidence;
      }
      
      // Use Nominatim-validated address values, capitalize and format properly
      if (fields.street) {
        shippingForm.setValue('street', capitalizeWords(fields.street));
        filledFields.street = data.confidence;
      }
      if (fields.streetNumber) {
        shippingForm.setValue('streetNumber', fields.streetNumber.toUpperCase());
        filledFields.streetNumber = data.confidence;
      }
      if (fields.city) {
        shippingForm.setValue('city', capitalizeWords(fields.city));
        filledFields.city = data.confidence;
      }
      if (fields.zipCode) {
        shippingForm.setValue('zipCode', fields.zipCode.toUpperCase());
        filledFields.zipCode = data.confidence;
      }
      if (fields.country) {
        shippingForm.setValue('country', capitalizeWords(fields.country));
        filledFields.country = data.confidence;
        
        // Auto-select main country dropdown if not already set
        const currentCountry = form.getValues('country');
        if (!currentCountry) {
          const countryCode = findCountryCode(fields.country);
          if (countryCode) {
            form.setValue('country', countryCode);
          }
        }
      }
      
      // Format phone number with country code after country is set
      if (fields.phone && fields.country) {
        const countryCode = getPhoneCountryCode(capitalizeWords(fields.country));
        if (countryCode) {
          const formatted = formatPhoneNumber(fields.phone, countryCode);
          shippingForm.setValue('tel', formatted);
          filledFields.tel = data.confidence;
        } else {
          shippingForm.setValue('tel', fields.phone);
          filledFields.tel = data.confidence;
        }
      } else if (fields.phone) {
        shippingForm.setValue('tel', fields.phone);
        filledFields.tel = data.confidence;
      }
      
      // Update confidence tracking
      setShippingFieldConfidence(filledFields);
      
      toast({
        title: t('customers:addressParsed'),
        description: t('customers:successfullyParsedAddressWithConfidence', { confidence: data.confidence }),
      });
      setRawShippingAddress("");
    },
    onError: (error: any) => {
      toast({
        title: t('customers:parseFailed'),
        description: error.message || t('customers:failedToParseAddress'),
        variant: "destructive",
      });
    },
  });

  // Vietnamese name detection - runs locally on device
  const detectAndCorrectVietnameseName = (firstName: string, lastName: string): { firstName: string; lastName: string } => {
    // Common Vietnamese family names (always first word in Vietnamese convention)
    const vietnameseFamilyNames = [
      'Nguyễn', 'Nguyen', 'Trần', 'Tran', 'Lê', 'Le', 'Phạm', 'Pham', 'Hoàng', 'Hoang',
      'Phan', 'Vũ', 'Vu', 'Đặng', 'Dang', 'Bùi', 'Bui', 'Đỗ', 'Do', 'Hồ', 'Ho',
      'Ngô', 'Ngo', 'Dương', 'Duong', 'Lý', 'Ly', 'Mai', 'Võ', 'Vo', 'Đinh', 'Dinh',
      'Tô', 'To', 'Trương', 'Truong', 'Đoàn', 'Doan', 'Huỳnh', 'Huynh', 'Chu', 'Cao',
      'Thái', 'Thai', 'Tạ', 'Ta', 'Thạch', 'Thach', 'Lưu', 'Luu', 'Kiều', 'Kieu',
      'Phùng', 'Phung', 'Từ', 'Tu', 'Quách', 'Quach', 'Trịnh', 'Trinh', 'Văn', 'Van'
    ];

    // Vietnamese diacritics pattern
    const vietnameseDiacriticsPattern = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđĐ]/i;

    const firstNameTrimmed = firstName.trim();
    const lastNameTrimmed = lastName.trim();

    // Check if this appears to be Vietnamese naming
    const hasVietnameseDiacritics = 
      vietnameseDiacriticsPattern.test(firstNameTrimmed) || 
      vietnameseDiacriticsPattern.test(lastNameTrimmed);

    // Check if the "first name" (in Western order) matches a Vietnamese family name
    const firstNameIsVietnameseFamilyName = vietnameseFamilyNames.some(
      familyName => firstNameTrimmed.toLowerCase().startsWith(familyName.toLowerCase())
    );

    // If we detect Vietnamese naming pattern: swap to correct order
    // In Vietnamese: Family name comes FIRST, so if AI put it in "firstName", we need to swap
    if (hasVietnameseDiacritics && firstNameIsVietnameseFamilyName) {
      // AI incorrectly put Vietnamese family name in firstName
      // Correct: lastName = first word (family name), firstName = rest (given name)
      const words = firstNameTrimmed.split(/\s+/);
      return {
        lastName: words[0], // Family name (first word)
        firstName: words.slice(1).join(' ') || lastNameTrimmed // Given name (rest)
      };
    }

    // Check if lastName contains Vietnamese family name at the beginning
    const lastNameIsVietnameseFamilyName = vietnameseFamilyNames.some(
      familyName => lastNameTrimmed.toLowerCase().startsWith(familyName.toLowerCase())
    );

    // If family name is already in lastName and we have Vietnamese diacritics
    if (hasVietnameseDiacritics && lastNameIsVietnameseFamilyName) {
      // Already in correct Vietnamese format
      return { firstName: firstNameTrimmed, lastName: lastNameTrimmed };
    }

    // No Vietnamese pattern detected - return as is
    return { firstName: firstNameTrimmed, lastName: lastNameTrimmed };
  };

  const parseBillingAddressMutation = useMutation({
    mutationFn: async (rawAddress: string) => {
      const res = await apiRequest('POST', '/api/addresses/parse', { rawAddress });
      return res.json();
    },
    onSuccess: (data: { fields: any; confidence: string }) => {
      const { fields } = data;
      
      // Track which fields were filled and their confidence
      const filledFields: Record<string, string> = {};
      
      // Apply Vietnamese name detection and correction locally
      let firstName = fields.firstName || '';
      let lastName = fields.lastName || '';
      let company = fields.company || '';
      
      // If no personal name but there's a company/salon name, use it for names
      if (!firstName && !lastName && company) {
        const companyWords = company.trim().split(/\s+/);
        
        if (companyWords.length === 1) {
          // Single word salon name - duplicate to all fields
          firstName = company;
          lastName = company;
        } else {
          // Multiple words - split like Vietnamese name (first word = last name, rest = first name)
          lastName = companyWords[0];
          firstName = companyWords.slice(1).join(' ');
        }
      } else if (firstName || lastName) {
        // Apply Vietnamese name detection for actual names
        const corrected = detectAndCorrectVietnameseName(firstName, lastName);
        firstName = corrected.firstName;
        lastName = corrected.lastName;
      }
      
      // Remove Vietnamese diacritics, capitalize, and track filled fields
      if (firstName) {
        const cleanFirstName = removeVietnameseDiacritics(firstName);
        form.setValue('billingFirstName', capitalizeWords(cleanFirstName));
        filledFields.billingFirstName = data.confidence;
      }
      if (lastName) {
        const cleanLastName = removeVietnameseDiacritics(lastName);
        form.setValue('billingLastName', capitalizeWords(cleanLastName));
        filledFields.billingLastName = data.confidence;
      }
      if (company) {
        const cleanCompany = removeVietnameseDiacritics(company);
        form.setValue('billingCompany', cleanCompany);
        filledFields.billingCompany = data.confidence;
      }
      if (fields.email) {
        form.setValue('billingEmail', fields.email);
        filledFields.billingEmail = data.confidence;
      }
      
      // Use Nominatim-validated address values, capitalize and format properly
      if (fields.street) {
        form.setValue('billingStreet', capitalizeWords(fields.street));
        filledFields.billingStreet = data.confidence;
      }
      if (fields.streetNumber) {
        form.setValue('billingStreetNumber', fields.streetNumber.toUpperCase());
        filledFields.billingStreetNumber = data.confidence;
      }
      if (fields.city) {
        form.setValue('billingCity', capitalizeWords(fields.city));
        filledFields.billingCity = data.confidence;
      }
      if (fields.zipCode) {
        form.setValue('billingZipCode', fields.zipCode.toUpperCase());
        filledFields.billingZipCode = data.confidence;
      }
      if (fields.country) {
        form.setValue('billingCountry', capitalizeWords(fields.country));
        filledFields.billingCountry = data.confidence;
        
        // Auto-select main country dropdown if not already set
        const currentCountry = form.getValues('country');
        if (!currentCountry) {
          const countryCode = findCountryCode(fields.country);
          if (countryCode) {
            form.setValue('country', countryCode);
          }
        }
      }
      
      // Format phone number with country code after country is set
      if (fields.phone && fields.country) {
        const countryCode = getPhoneCountryCode(capitalizeWords(fields.country));
        if (countryCode) {
          const formatted = formatPhoneNumber(fields.phone, countryCode);
          form.setValue('billingTel', formatted);
          filledFields.billingTel = data.confidence;
        } else {
          form.setValue('billingTel', fields.phone);
          filledFields.billingTel = data.confidence;
        }
      } else if (fields.phone) {
        form.setValue('billingTel', fields.phone);
        filledFields.billingTel = data.confidence;
      }
      
      // Update confidence tracking
      setBillingFieldConfidence(filledFields);
      
      toast({
        title: t('customers:addressParsed'),
        description: t('customers:successfullyParsedAddressWithConfidence', { confidence: data.confidence }),
      });
      setRawBillingAddress("");
    },
    onError: (error: any) => {
      toast({
        title: t('customers:parseFailed'),
        description: error.message || t('customers:failedToParseAddress'),
        variant: "destructive",
      });
    },
  });

  const parseBillingAddressFormMutation = useMutation({
    mutationFn: async (rawAddress: string) => {
      const res = await apiRequest('POST', '/api/addresses/parse', { rawAddress });
      return res.json();
    },
    onSuccess: (data: { fields: any; confidence: string }) => {
      const { fields } = data;
      
      const filledFields: Record<string, string> = {};
      
      let firstName = fields.firstName || '';
      let lastName = fields.lastName || '';
      let company = fields.company || '';
      
      if (!firstName && !lastName && company) {
        const companyWords = company.trim().split(/\s+/);
        
        if (companyWords.length === 1) {
          firstName = company;
          lastName = company;
        } else {
          lastName = companyWords[0];
          firstName = companyWords.slice(1).join(' ');
        }
      } else if (firstName || lastName) {
        const corrected = detectAndCorrectVietnameseName(firstName, lastName);
        firstName = corrected.firstName;
        lastName = corrected.lastName;
      }
      
      if (firstName) {
        const cleanFirstName = removeVietnameseDiacritics(firstName);
        billingAddressForm.setValue('firstName', capitalizeWords(cleanFirstName));
        filledFields.firstName = data.confidence;
      }
      if (lastName) {
        const cleanLastName = removeVietnameseDiacritics(lastName);
        billingAddressForm.setValue('lastName', capitalizeWords(cleanLastName));
        filledFields.lastName = data.confidence;
      }
      if (company) {
        const cleanCompany = removeVietnameseDiacritics(company);
        billingAddressForm.setValue('company', cleanCompany);
        filledFields.company = data.confidence;
      }
      if (fields.email) {
        billingAddressForm.setValue('email', fields.email);
        filledFields.email = data.confidence;
      }
      
      if (fields.street) {
        billingAddressForm.setValue('street', capitalizeWords(fields.street));
        filledFields.street = data.confidence;
      }
      if (fields.streetNumber) {
        billingAddressForm.setValue('streetNumber', fields.streetNumber.toUpperCase());
        filledFields.streetNumber = data.confidence;
      }
      if (fields.city) {
        billingAddressForm.setValue('city', capitalizeWords(fields.city));
        filledFields.city = data.confidence;
      }
      if (fields.zipCode) {
        billingAddressForm.setValue('zipCode', fields.zipCode.toUpperCase());
        filledFields.zipCode = data.confidence;
      }
      if (fields.country) {
        billingAddressForm.setValue('country', capitalizeWords(fields.country));
        filledFields.country = data.confidence;
      }
      
      // Format phone number with country code after country is set
      if (fields.phone && fields.country) {
        const countryCode = getPhoneCountryCode(capitalizeWords(fields.country));
        if (countryCode) {
          const formatted = formatPhoneNumber(fields.phone, countryCode);
          billingAddressForm.setValue('tel', formatted);
          filledFields.tel = data.confidence;
        } else {
          billingAddressForm.setValue('tel', fields.phone);
          filledFields.tel = data.confidence;
        }
      } else if (fields.phone) {
        billingAddressForm.setValue('tel', fields.phone);
        filledFields.tel = data.confidence;
      }
      
      setBillingAddressFieldConfidence(filledFields);
      
      toast({
        title: t('customers:addressParsed'),
        description: t('customers:successfullyParsedAddressWithConfidence', { confidence: data.confidence }),
      });
      setRawBillingAddressForm("");
    },
    onError: (error: any) => {
      toast({
        title: t('customers:parseFailed'),
        description: error.message || t('customers:failedToParseAddress'),
        variant: "destructive",
      });
    },
  });

  const createOrUpdateCustomerMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      let response;
      if (isEditMode) {
        response = await apiRequest('PATCH', `/api/customers/${customerId}`, data);
      } else {
        response = await apiRequest('POST', '/api/customers', data);
      }
      return response.json();
    },
    onSuccess: async (customer: Customer) => {
      for (const shippingAddr of shippingAddresses) {
        const shippingData = {
          customerId: customer.id,
          ...shippingAddr,
        };
        if (shippingAddr.id && isEditMode) {
          await apiRequest('PATCH', `/api/shipping-addresses/${shippingAddr.id}`, shippingData);
        } else {
          await apiRequest('POST', `/api/customers/${customer.id}/shipping-addresses`, shippingData);
        }
      }
      
      for (const billingAddr of billingAddresses) {
        const billingData = {
          customerId: customer.id,
          ...billingAddr,
        };
        if (billingAddr.id && isEditMode) {
          await apiRequest('PATCH', `/api/billing-addresses/${billingAddr.id}`, billingData);
        } else {
          await apiRequest('POST', `/api/customers/${customer.id}/billing-addresses`, billingData);
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      toast({
        title: t('customers:success'),
        description: isEditMode ? t('customers:customerUpdated') : t('customers:customerCreated'),
      });
      navigate('/customers');
    },
    onError: (error: any) => {
      toast({
        title: t('customers:error'),
        description: error.message || (isEditMode ? t('customers:failedToUpdateCustomer') : t('customers:failedToCreateCustomer')),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CustomerFormData) => {
    createOrUpdateCustomerMutation.mutate(data);
  };

  const isCzech = selectedCountry === 'CZ';
  const isEU = selectedCountry ? euCountryCodes.includes(selectedCountry) : false;

  const togglePinCountry = (countryCode: string) => {
    const newPinned = pinnedCountries.includes(countryCode)
      ? pinnedCountries.filter(code => code !== countryCode)
      : [...pinnedCountries, countryCode];
    setPinnedCountries(newPinned);
    localStorage.setItem('pinnedCountries', JSON.stringify(newPinned));
  };

  const filteredCountries = availableCountries.filter(country =>
    country.name.toLowerCase().includes(countrySearchQuery.toLowerCase()) ||
    country.code.toLowerCase().includes(countrySearchQuery.toLowerCase())
  );

  const pinnedFilteredCountries = filteredCountries.filter(country => 
    pinnedCountries.includes(country.code)
  );
  
  const unpinnedFilteredCountries = filteredCountries.filter(country => 
    !pinnedCountries.includes(country.code)
  );

  const selectedCountryData = availableCountries.find(c => c.code === selectedCountry);

  if (isLoadingCustomer) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-8 p-2 sm:p-4 md:p-6 overflow-x-hidden">
      <div className="flex items-center gap-2 sm:gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.history.back()}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">{t('common:back')}</span>
        </Button>
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100">
          {isEditMode ? t('customers:editCustomer') : t('customers:addCustomer')}
        </h1>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <Collapsible open={customerDetailsOpen} onOpenChange={setCustomerDetailsOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <div className="flex items-center justify-between w-full">
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-blue-500" />
                    {t('customers:locationBusinessInfo')}
                  </CardTitle>
                  <ChevronDown className={cn("h-5 w-5 text-slate-500 dark:text-slate-400 transition-transform duration-200", customerDetailsOpen ? "rotate-0" : "-rotate-90")} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
            <div className="space-y-4">
                <div>
                  <Label htmlFor="facebookUrl" className="text-base font-semibold">{t('customers:facebookUrl')}</Label>
                  <Input
                    id="facebookUrl"
                    {...form.register('facebookUrl')}
                    placeholder={t('customers:facebookUrlPlaceholder')}
                    className="text-base"
                    data-testid="input-facebookUrl"
                    onChange={(e) => {
                      form.register('facebookUrl').onChange(e);
                      const extractedId = extractFacebookId(e.target.value);
                      setExtractedFacebookId(extractedId);
                      checkDuplicateCustomer(extractedId);
                    }}
                  />
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t('customers:pasteFacebookUrlHint')}</p>
                    {extractedFacebookId && (
                      <>
                        <span className="text-xs text-slate-400">•</span>
                        <p className="text-xs text-slate-600 font-medium">ID: {extractedFacebookId}</p>
                      </>
                    )}
                    {isCheckingDuplicate && (
                      <Loader2 className="h-3 w-3 animate-spin text-slate-400" data-testid="loader-duplicate-check" />
                    )}
                  </div>
                  
                  {duplicateCustomer && !isEditMode && (
                    <div className="mt-3 p-4 bg-amber-50 border-2 border-amber-300 rounded-lg shadow-sm" data-testid="alert-duplicate-customer">
                      <div className="flex items-start gap-3 mb-3">
                        <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-base font-bold text-amber-900">{t('customers:customerAlreadyExists')}</p>
                          <p className="text-sm text-amber-700 mt-0.5">
                            {t('customers:customerWithFacebookIdExistsInDatabase', { facebookId: extractedFacebookId })}
                          </p>
                        </div>
                      </div>
                      
                      {/* Customer Info Card */}
                      <div className="bg-white border border-amber-200 rounded-md p-4 mt-3">
                        <div className="flex items-start gap-3">
                          {duplicateCustomer.profilePictureUrl && (
                            <img 
                              src={duplicateCustomer.profilePictureUrl} 
                              alt={duplicateCustomer.name}
                              className="w-16 h-16 rounded-full object-cover border-2 border-slate-200"
                              data-testid="img-duplicate-customer-avatar"
                            />
                          )}
                          <div className="flex-1 space-y-2">
                            <div>
                              <p className="text-lg font-bold text-slate-900" data-testid="text-duplicate-customer-name">
                                {duplicateCustomer.name}
                              </p>
                              {duplicateCustomer.facebookName && (
                                <p className="text-sm text-slate-600">
                                  Facebook: {duplicateCustomer.facebookName}
                                </p>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                              {duplicateCustomer.billingEmail && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-500 dark:text-slate-400">{t('customers:emailLabel')}</span>
                                  <span className="font-medium text-slate-900 dark:text-slate-100">{duplicateCustomer.billingEmail}</span>
                                </div>
                              )}
                              {duplicateCustomer.billingTel && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-500 dark:text-slate-400">{t('customers:phoneLabel')}</span>
                                  <span className="font-medium text-slate-900 dark:text-slate-100">{duplicateCustomer.billingTel}</span>
                                </div>
                              )}
                              {duplicateCustomer.country && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-500 dark:text-slate-400">{t('customers:countryLabel')}</span>
                                  <span className="font-medium text-slate-900">
                                    {getCountryFlag(duplicateCustomer.country)} {europeanCountries.find(c => c.code === duplicateCustomer.country)?.name || duplicateCustomer.country}
                                  </span>
                                </div>
                              )}
                              {duplicateCustomer.preferredCurrency && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-500 dark:text-slate-400">{t('customers:currencyLabel')}</span>
                                  <Badge variant="outline" className="font-medium">
                                    {duplicateCustomer.preferredCurrency}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <Button
                        type="button"
                        variant="default"
                        className="w-full mt-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                        onClick={() => navigate(`/customers/${duplicateCustomer.id}/edit`)}
                        data-testid="button-go-to-existing-customer"
                      >
                        {t('customers:goToCustomerProfile', { name: duplicateCustomer.name })}
                      </Button>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="facebookName" className="text-base font-semibold">{t('customers:facebookName')}</Label>
                  <Input
                    id="facebookName"
                    {...form.register('facebookName')}
                    placeholder={t('customers:facebookDisplayNamePlaceholder')}
                    className="text-base"
                    data-testid="input-facebookName"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('customers:facebookNameOptionalHint')}</p>
                </div>

                <div>
                  <Label htmlFor="name" className="text-base font-semibold">{t('customers:nameRequiredLabel')}</Label>
                  <Input
                    id="name"
                    {...form.register('name', {
                      onChange: () => setIsNameManuallyEdited(true)
                    })}
                    placeholder={t('customers:customerDisplayNamePlaceholder')}
                    className="text-base"
                    data-testid="input-name"
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.name.message}</p>
                  )}
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('customers:autoSyncsFacebookName')}</p>
                </div>

                <div>
                  <Label htmlFor="country" className="text-base font-semibold">{t('customers:countryLocation')}</Label>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">{t('customers:selectPrimaryCountryHint')}</p>
                  <Popover open={openCountryCombobox} onOpenChange={setOpenCountryCombobox}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openCountryCombobox}
                        className="w-full justify-between"
                        data-testid="button-country-selector"
                      >
                        {selectedCountryData ? (
                          <span className="flex items-center gap-2">
                            <span className="text-2xl">{getCountryFlag(selectedCountryData.code)}</span>
                            {selectedCountryData.name}
                          </span>
                        ) : (
                          t('customers:searchCountryPlaceholder')
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput 
                          placeholder={t('customers:searchCountryPlaceholder')} 
                          value={countrySearchQuery}
                          onValueChange={setCountrySearchQuery}
                          data-testid="input-country-search"
                        />
                        <CommandList>
                          <CommandEmpty>{t('customers:noCountryFound')}</CommandEmpty>
                          
                          {pinnedFilteredCountries.length > 0 && (
                            <CommandGroup heading={t('customers:pinnedCountries')}>
                              {pinnedFilteredCountries.map((country) => (
                                <CommandItem
                                  key={country.code}
                                  value={country.code}
                                  onSelect={() => {
                                    form.setValue('country', country.code);
                                    
                                    // Auto-populate shipping country if shipping form is open and country is empty
                                    if (isAddingShipping && !shippingForm.getValues('country')) {
                                      shippingForm.setValue('country', country.name);
                                    }
                                    
                                    setOpenCountryCombobox(false);
                                    setCountrySearchQuery("");
                                  }}
                                  data-testid={`option-country-${country.code}`}
                                  className="flex items-center justify-between group"
                                >
                                  <div className="flex items-center flex-1">
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedCountry === country.code ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <span className="text-xl mr-2">{getCountryFlag(country.code)}</span>
                                    {country.name}
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      togglePinCountry(country.code);
                                    }}
                                    data-testid={`button-unpin-${country.code}`}
                                  >
                                    <Pin className="h-3 w-3 fill-current text-blue-600" />
                                  </Button>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                          
                          {unpinnedFilteredCountries.length > 0 && (
                            <CommandGroup heading={pinnedFilteredCountries.length > 0 ? t('customers:allCountries') : undefined}>
                              {unpinnedFilteredCountries.map((country) => (
                                <CommandItem
                                  key={country.code}
                                  value={country.code}
                                  onSelect={() => {
                                    form.setValue('country', country.code);
                                    
                                    // Auto-populate shipping country if shipping form is open and country is empty
                                    if (isAddingShipping && !shippingForm.getValues('country')) {
                                      shippingForm.setValue('country', country.name);
                                    }
                                    
                                    setOpenCountryCombobox(false);
                                    setCountrySearchQuery("");
                                  }}
                                  data-testid={`option-country-${country.code}`}
                                  className="flex items-center justify-between group"
                                >
                                  <div className="flex items-center flex-1">
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedCountry === country.code ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <span className="text-xl mr-2">{getCountryFlag(country.code)}</span>
                                    {country.name}
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      togglePinCountry(country.code);
                                    }}
                                    data-testid={`button-pin-${country.code}`}
                                  >
                                    <Pin className="h-3 w-3 text-slate-400" />
                                  </Button>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {form.formState.errors.country && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.country.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="preferredCurrency" className="text-base font-semibold">{t('customers:preferredCurrency')}</Label>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">{t('customers:defaultCurrencyForOrders')}</p>
                  <Select
                    value={form.watch('preferredCurrency')}
                    onValueChange={(value: 'CZK' | 'EUR') => form.setValue('preferredCurrency', value)}
                  >
                    <SelectTrigger className="w-full" data-testid="select-preferredCurrency">
                      <SelectValue placeholder={t('customers:selectCurrency')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR" data-testid="option-currency-EUR">{t('customers:currencyEurWithName')}</SelectItem>
                      <SelectItem value="CZK" data-testid="option-currency-CZK">{t('customers:currencyCzkWithName')}</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.preferredCurrency && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.preferredCurrency.message}</p>
                  )}
                </div>
              </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        <Card>
          <Collapsible open={shippingAddressesOpen} onOpenChange={setShippingAddressesOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <div className="flex items-center justify-between w-full">
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-orange-500" />
                    {t('customers:shippingAddresses')}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {!isAddingShipping && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddShippingAddress();
                        }}
                        data-testid="button-addShipping"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {t('customers:addShippingAddress')}
                      </Button>
                    )}
                    <ChevronDown className={cn("h-5 w-5 text-slate-500 dark:text-slate-400 transition-transform duration-200", shippingAddressesOpen ? "rotate-0" : "-rotate-90")} />
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
            {shippingAddresses.map((addr, index) => (
              <div key={index} className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-800">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{addr.label}</h4>
                    {addr.isPrimary && (
                      <Badge variant="default" data-testid={`badge-primary-${index}`}>{t('customers:primary')}</Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!addr.isPrimary && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetPrimary(index)}
                        data-testid={`button-setPrimary-${index}`}
                      >
                        {t('customers:setPrimary')}
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditShippingAddress(index)}
                      data-testid={`button-editShipping-${index}`}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteShippingAddress(index)}
                      data-testid={`button-deleteShipping-${index}`}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400" data-testid={`text-shippingAddress-${index}`}>
                  {addr.company && <p className="font-medium">{addr.company}</p>}
                  <p>{addr.firstName} {addr.lastName}</p>
                  {addr.street && <p>{addr.street} {addr.streetNumber}</p>}
                  {addr.city && <p>{addr.zipCode} {addr.city}</p>}
                  {addr.country && <p>{addr.country}</p>}
                  {addr.tel && <p>{t('customers:telLabel')} {addr.tel}</p>}
                  {addr.email && <p>{t('customers:emailLabel')} {addr.email}</p>}
                </div>
              </div>
            ))}

            {isAddingShipping && (
              <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-800">
                <h4 className="font-semibold mb-4">
                  {editingShippingIndex !== null ? t('customers:editShippingAddress') : t('customers:addShippingAddressForm')}
                </h4>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="shippingLabel">{t('customers:label')}</Label>
                    <Input
                      id="shippingLabel"
                      {...shippingForm.register('label', {
                        onChange: () => setIsLabelManuallyEdited(true)
                      })}
                      placeholder={t('customers:autoGeneratedFromAddress')}
                      data-testid="input-shippingLabel"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('customers:autoGeneratedEditable')}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rawShippingAddress">{t('customers:smartPaste')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('customers:smartPasteDescription')}
                    </p>
                    <div className="flex gap-2">
                      <Textarea
                        id="rawShippingAddress"
                        value={rawShippingAddress}
                        onChange={(e) => setRawShippingAddress(e.target.value)}
                        placeholder={t('customers:addressExamplePlaceholder')}
                        className="min-h-[100px]"
                        data-testid="textarea-rawShippingAddress"
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={() => parseShippingAddressMutation.mutate(rawShippingAddress)}
                      disabled={!rawShippingAddress.trim() || parseShippingAddressMutation.isPending}
                      className="w-full"
                      data-testid="button-parseShippingAddress"
                    >
                      {parseShippingAddressMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {t('customers:parsing')}
                        </>
                      ) : (
                        t('customers:parseFill')
                      )}
                    </Button>
                  </div>

                  <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t-2 border-slate-300 dark:border-slate-600" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-slate-50 dark:bg-slate-800 px-2 text-slate-500 dark:text-slate-400 font-semibold">{t('customers:addressDetails')}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="shippingFirstName">{t('customers:firstNameRequiredLabel')}</Label>
                      <Input
                        id="shippingFirstName"
                        {...shippingForm.register('firstName')}
                        placeholder={t('customers:firstNamePlaceholder')}
                        className={cn(
                          getConfidenceClass('firstName', shippingFieldConfidence),
                          shippingForm.formState.errors.firstName && "border-red-500"
                        )}
                        data-testid="input-shippingFirstName"
                      />
                      {shippingForm.formState.errors.firstName && (
                        <p className="text-sm text-red-500 mt-1">
                          {shippingForm.formState.errors.firstName.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="shippingLastName">{t('customers:lastNameRequiredLabel')}</Label>
                      <Input
                        id="shippingLastName"
                        {...shippingForm.register('lastName')}
                        placeholder={t('customers:lastNamePlaceholder')}
                        className={cn(
                          getConfidenceClass('lastName', shippingFieldConfidence),
                          shippingForm.formState.errors.lastName && "border-red-500"
                        )}
                        data-testid="input-shippingLastName"
                      />
                      {shippingForm.formState.errors.lastName && (
                        <p className="text-sm text-red-500 mt-1">
                          {shippingForm.formState.errors.lastName.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="shippingCompany">{t('customers:company')}</Label>
                    <Input
                      id="shippingCompany"
                      {...shippingForm.register('company')}
                      placeholder={t('customers:companyNamePlaceholder')}
                      className={cn(getConfidenceClass('company', shippingFieldConfidence))}
                      data-testid="input-shippingCompany"
                    />
                  </div>

                  <Separator className="my-6" />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="shippingEmail">{t('customers:email')}</Label>
                      <Input
                        id="shippingEmail"
                        type="email"
                        {...shippingForm.register('email')}
                        placeholder={t('customers:emailPlaceholder')}
                        className={cn(getConfidenceClass('email', shippingFieldConfidence))}
                        data-testid="input-shippingEmail"
                      />
                    </div>
                    <div>
                      <Label htmlFor="shippingTel">{t('customers:tel')}</Label>
                      <Input
                        id="shippingTel"
                        {...shippingForm.register('tel', {
                          onChange: (e) => {
                            const currentCountry = shippingForm.watch('country');
                            const countryCode = getPhoneCountryCode(currentCountry);
                            if (countryCode) {
                              const formatted = formatPhoneNumber(e.target.value, countryCode);
                              shippingForm.setValue('tel', formatted);
                            }
                          },
                          onBlur: (e) => {
                            const currentCountry = shippingForm.watch('country');
                            const countryCode = getPhoneCountryCode(currentCountry);
                            if (countryCode && e.target.value) {
                              const formatted = formatPhoneNumber(e.target.value, countryCode);
                              shippingForm.setValue('tel', formatted);
                            }
                          }
                        })}
                        placeholder={t('customers:phonePlaceholder')}
                        className={cn(getConfidenceClass('tel', shippingFieldConfidence))}
                        data-testid="input-shippingTel"
                      />
                    </div>
                  </div>

                  <Separator className="my-6" />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <Label htmlFor="shippingStreet">{t('customers:street')}</Label>
                      <Input
                        id="shippingStreet"
                        {...shippingForm.register('street')}
                        placeholder={t('customers:streetNamePlaceholder')}
                        className={cn(getConfidenceClass('street', shippingFieldConfidence))}
                        data-testid="input-shippingStreet"
                      />
                    </div>
                    <div>
                      <Label htmlFor="shippingStreetNumber">{t('customers:number')}</Label>
                      <Input
                        id="shippingStreetNumber"
                        {...shippingForm.register('streetNumber')}
                        placeholder={t('customers:streetNumberPlaceholder')}
                        className={cn(getConfidenceClass('streetNumber', shippingFieldConfidence))}
                        data-testid="input-shippingStreetNumber"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="shippingZipCode">{t('customers:zipCode')}</Label>
                      <Input
                        id="shippingZipCode"
                        {...shippingForm.register('zipCode')}
                        placeholder={t('customers:postalCodePlaceholder')}
                        className={cn(getConfidenceClass('zipCode', shippingFieldConfidence))}
                        data-testid="input-shippingZipCode"
                      />
                    </div>
                    <div>
                      <Label htmlFor="shippingCity">{t('customers:city')}</Label>
                      <Input
                        id="shippingCity"
                        {...shippingForm.register('city')}
                        placeholder={t('customers:cityPlaceholder')}
                        className={cn(getConfidenceClass('city', shippingFieldConfidence))}
                        data-testid="input-shippingCity"
                      />
                    </div>
                    <div>
                      <Label htmlFor="shippingCountry">{t('customers:country')}</Label>
                      <div className="relative" ref={shippingCountryDropdownRef}>
                        <Input
                          id="shippingCountry"
                          value={shippingCountryQuery || shippingForm.watch('country') || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            setShippingCountryQuery(value);
                            setShowShippingCountryDropdown(true);
                            if (!value) {
                              shippingForm.setValue('country', '');
                            }
                          }}
                          onFocus={() => setShowShippingCountryDropdown(true)}
                          placeholder={t('customers:typeToSearchCountries')}
                          className={cn(getConfidenceClass('country', shippingFieldConfidence))}
                          data-testid="input-shippingCountry"
                        />
                        {(shippingCountryQuery || shippingForm.watch('country')) && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1 h-8 w-8 p-0"
                            onClick={() => {
                              setShippingCountryQuery("");
                              shippingForm.setValue('country', '');
                              setShowShippingCountryDropdown(false);
                            }}
                            data-testid="button-clearShippingCountry"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                        {showShippingCountryDropdown && (
                          <div className="absolute top-full left-0 right-0 mt-1 border rounded-md shadow-lg bg-white dark:bg-slate-800 max-h-64 overflow-y-auto z-50">
                            {europeanCountries
                              .filter(country => 
                                country.name.toLowerCase().includes((shippingCountryQuery || '').toLowerCase())
                              )
                              .map((country) => (
                                <div
                                  key={country.code}
                                  className="p-3 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer border-b last:border-b-0 transition-colors flex items-center gap-2"
                                  onClick={() => {
                                    shippingForm.setValue('country', country.name);
                                    setShippingCountryQuery('');
                                    setShowShippingCountryDropdown(false);
                                  }}
                                  data-testid={`button-shippingCountry-${country.code}`}
                                >
                                  <span className="text-xl">{getCountryFlag(country.code)}</span>
                                  <span>{country.name}</span>
                                </div>
                              ))}
                            {europeanCountries.filter(country => 
                              country.name.toLowerCase().includes((shippingCountryQuery || '').toLowerCase())
                            ).length === 0 && (
                              <div className="p-4 text-center text-slate-500 dark:text-slate-400">{t('customers:noCountriesFound')}</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsAddingShipping(false);
                        setEditingShippingIndex(null);
                        setIsLabelManuallyEdited(false);
                        shippingForm.reset();
                      }}
                      data-testid="button-cancelShipping"
                    >
                      <X className="h-4 w-4 mr-2" />
                      {t('customers:cancel')}
                    </Button>
                    <Button
                      type="button"
                      onClick={shippingForm.handleSubmit(
                        handleSaveShippingAddress,
                        (errors) => {
                          const errorMessages = Object.values(errors)
                            .map(error => error?.message)
                            .filter(Boolean)
                            .join(', ');
                          toast({
                            title: t('customers:validationError'),
                            description: errorMessages || t('customers:fillInRequiredFields'),
                            variant: "destructive",
                          });
                        }
                      )}
                      data-testid="button-saveShipping"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      {t('customers:saveAddress')}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {shippingAddresses.length === 0 && !isAddingShipping && (
              <p className="text-center text-slate-500 dark:text-slate-400 py-8">{t('customers:noShippingAddresses')}</p>
            )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        <Card>
          <Collapsible open={billingAddressesOpen} onOpenChange={setBillingAddressesOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <div className="flex items-center justify-between w-full">
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-blue-500" />
                    {t('customers:billingAddresses')}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {!isAddingBilling && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddBillingAddress();
                        }}
                        data-testid="button-addBilling"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {t('customers:addBillingAddress')}
                      </Button>
                    )}
                    <ChevronDown className={cn("h-5 w-5 text-slate-500 dark:text-slate-400 transition-transform duration-200", billingAddressesOpen ? "rotate-0" : "-rotate-90")} />
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
            {billingAddresses.map((addr, index) => (
              <div key={index} className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-800">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{addr.label}</h4>
                    {addr.isPrimary && (
                      <Badge variant="default" data-testid={`badge-billingPrimary-${index}`}>{t('customers:primary')}</Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!addr.isPrimary && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetBillingPrimary(index)}
                        data-testid={`button-setBillingPrimary-${index}`}
                      >
                        {t('customers:setPrimary')}
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditBillingAddress(index)}
                      data-testid={`button-editBilling-${index}`}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteBillingIndex(index)}
                      data-testid={`button-deleteBilling-${index}`}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400" data-testid={`text-billingAddress-${index}`}>
                  {addr.company && <p className="font-medium">{addr.company}</p>}
                  <p>{addr.firstName} {addr.lastName}</p>
                  {addr.street && <p>{addr.street} {addr.streetNumber}</p>}
                  {addr.city && <p>{addr.zipCode} {addr.city}</p>}
                  {addr.country && <p>{addr.country}</p>}
                  {addr.tel && <p>{t('customers:telLabel')} {addr.tel}</p>}
                  {addr.email && <p>{t('customers:emailLabel')} {addr.email}</p>}
                  {addr.ico && <p>{t('customers:icoLabel')} {addr.ico}</p>}
                  {addr.vatId && <p>{t('customers:vatIdLabel')} {addr.vatId}</p>}
                </div>
              </div>
            ))}

            {isAddingBilling && (
              <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold">
                    {editingBillingIndex !== null ? t('customers:editBillingAddress') : t('customers:addBillingAddressTitle')}
                  </h4>
                  {shippingAddresses.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const primaryAddress = shippingAddresses.find(addr => addr.isPrimary) || shippingAddresses[0];
                        if (primaryAddress) {
                          billingAddressForm.setValue('firstName', primaryAddress.firstName);
                          billingAddressForm.setValue('lastName', primaryAddress.lastName);
                          billingAddressForm.setValue('company', primaryAddress.company || '');
                          billingAddressForm.setValue('email', primaryAddress.email || '');
                          billingAddressForm.setValue('tel', primaryAddress.tel || '');
                          billingAddressForm.setValue('street', primaryAddress.street || '');
                          billingAddressForm.setValue('streetNumber', primaryAddress.streetNumber || '');
                          billingAddressForm.setValue('city', primaryAddress.city || '');
                          billingAddressForm.setValue('zipCode', primaryAddress.zipCode || '');
                          billingAddressForm.setValue('country', primaryAddress.country || '');
                          toast({
                            title: t('customers:addressCopied'),
                            description: t('customers:shippingAddressCopiedToBilling'),
                          });
                        }
                      }}
                      data-testid="button-copy-shipping-to-billing"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      {t('customers:copyFromShipping')}
                    </Button>
                  )}
                </div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="billingLabel">{t('customers:label')}</Label>
                    <Input
                      id="billingLabel"
                      {...billingAddressForm.register('label', {
                        onChange: () => setIsBillingLabelManuallyEdited(true)
                      })}
                      placeholder={t('customers:autoGeneratedFromAddress')}
                      data-testid="input-billingLabel"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('customers:autoGeneratedEditable')}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rawBillingAddressForm">{t('customers:smartPaste')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('customers:smartPasteDescription')}
                    </p>
                    <div className="flex gap-2">
                      <Textarea
                        id="rawBillingAddressForm"
                        value={rawBillingAddressForm}
                        onChange={(e) => setRawBillingAddressForm(e.target.value)}
                        placeholder={t('customers:addressExamplePlaceholder')}
                        className="min-h-[100px]"
                        data-testid="textarea-rawBillingAddressForm"
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={() => parseBillingAddressFormMutation.mutate(rawBillingAddressForm)}
                      disabled={!rawBillingAddressForm.trim() || parseBillingAddressFormMutation.isPending}
                      className="w-full"
                      data-testid="button-parseBillingAddressForm"
                    >
                      {parseBillingAddressFormMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {t('customers:parsing')}
                        </>
                      ) : (
                        t('customers:parseFill')
                      )}
                    </Button>
                  </div>

                  <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t-2 border-slate-300 dark:border-slate-600" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-slate-50 dark:bg-slate-800 px-2 text-slate-500 dark:text-slate-400 font-semibold">{t('customers:addressDetails')}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="billingFirstName">{t('customers:firstName')}</Label>
                      <Input
                        id="billingFirstName"
                        {...billingAddressForm.register('firstName')}
                        placeholder={t('customers:firstNamePlaceholder')}
                        className={cn(getConfidenceClass('firstName', billingAddressFieldConfidence))}
                        data-testid="input-billingFirstName"
                      />
                    </div>
                    <div>
                      <Label htmlFor="billingLastName">{t('customers:lastName')}</Label>
                      <Input
                        id="billingLastName"
                        {...billingAddressForm.register('lastName')}
                        placeholder={t('customers:lastNamePlaceholder')}
                        className={cn(getConfidenceClass('lastName', billingAddressFieldConfidence))}
                        data-testid="input-billingLastName"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="billingCompany">{t('customers:company')}</Label>
                    <Input
                      id="billingCompany"
                      {...billingAddressForm.register('company')}
                      placeholder={t('customers:companyNamePlaceholder')}
                      className={cn(getConfidenceClass('company', billingAddressFieldConfidence))}
                      data-testid="input-billingCompany"
                    />
                  </div>

                  <Separator className="my-6" />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="billingEmail">{t('customers:email')}</Label>
                      <Input
                        id="billingEmail"
                        type="email"
                        {...billingAddressForm.register('email')}
                        placeholder={t('customers:emailPlaceholder')}
                        className={cn(getConfidenceClass('email', billingAddressFieldConfidence))}
                        data-testid="input-billingEmail"
                      />
                    </div>
                    <div>
                      <Label htmlFor="billingTel">{t('customers:tel')}</Label>
                      <Input
                        id="billingTel"
                        {...billingAddressForm.register('tel', {
                          onChange: (e) => {
                            const currentCountry = billingAddressForm.watch('country');
                            if (currentCountry) {
                              const countryCode = getPhoneCountryCode(currentCountry);
                              if (countryCode) {
                                const formatted = formatPhoneNumber(e.target.value, countryCode);
                                billingAddressForm.setValue('tel', formatted);
                              }
                            }
                          },
                          onBlur: (e) => {
                            const currentCountry = billingAddressForm.watch('country');
                            if (currentCountry) {
                              const countryCode = getPhoneCountryCode(currentCountry);
                              if (countryCode && e.target.value) {
                                const formatted = formatPhoneNumber(e.target.value, countryCode);
                                billingAddressForm.setValue('tel', formatted);
                              }
                            }
                          }
                        })}
                        placeholder={t('customers:phonePlaceholder')}
                        className={cn(getConfidenceClass('tel', billingAddressFieldConfidence))}
                        data-testid="input-billingTel"
                      />
                    </div>
                  </div>

                  <Separator className="my-6" />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <Label htmlFor="billingStreet">{t('customers:street')}</Label>
                      <Input
                        id="billingStreet"
                        {...billingAddressForm.register('street')}
                        placeholder={t('customers:streetNamePlaceholder')}
                        className={cn(getConfidenceClass('street', billingAddressFieldConfidence))}
                        data-testid="input-billingStreet"
                      />
                    </div>
                    <div>
                      <Label htmlFor="billingStreetNumber">{t('customers:number')}</Label>
                      <Input
                        id="billingStreetNumber"
                        {...billingAddressForm.register('streetNumber')}
                        placeholder={t('customers:streetNumberPlaceholder')}
                        className={cn(getConfidenceClass('streetNumber', billingAddressFieldConfidence))}
                        data-testid="input-billingStreetNumber"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="billingZipCode">{t('customers:zipCode')}</Label>
                      <Input
                        id="billingZipCode"
                        {...billingAddressForm.register('zipCode')}
                        placeholder={t('customers:postalCodePlaceholder')}
                        className={cn(getConfidenceClass('zipCode', billingAddressFieldConfidence))}
                        data-testid="input-billingZipCode"
                      />
                    </div>
                    <div>
                      <Label htmlFor="billingCity">{t('customers:city')}</Label>
                      <Input
                        id="billingCity"
                        {...billingAddressForm.register('city')}
                        placeholder={t('customers:cityPlaceholder')}
                        className={cn(getConfidenceClass('city', billingAddressFieldConfidence))}
                        data-testid="input-billingCity"
                      />
                    </div>
                    <div>
                      <Label htmlFor="billingCountry">{t('customers:country')}</Label>
                      <div className="relative" ref={billingCountryDropdownRef}>
                        <Input
                          id="billingCountry"
                          value={billingCountryQuery || billingAddressForm.watch('country') || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            setBillingCountryQuery(value);
                            setShowBillingCountryDropdown(true);
                            if (!value) {
                              billingAddressForm.setValue('country', '');
                            }
                          }}
                          onFocus={() => setShowBillingCountryDropdown(true)}
                          placeholder={t('customers:typeToSearchCountries')}
                          className={cn(getConfidenceClass('country', billingAddressFieldConfidence))}
                          data-testid="input-billingCountry"
                        />
                        {(billingCountryQuery || billingAddressForm.watch('country')) && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1 h-8 w-8 p-0"
                            onClick={() => {
                              setBillingCountryQuery("");
                              billingAddressForm.setValue('country', '');
                              setShowBillingCountryDropdown(false);
                            }}
                            data-testid="button-clearBillingCountry"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                        {showBillingCountryDropdown && (
                          <div className="absolute top-full left-0 right-0 mt-1 border rounded-md shadow-lg bg-white dark:bg-slate-800 max-h-64 overflow-y-auto z-50">
                            {europeanCountries
                              .filter(country => 
                                country.name.toLowerCase().includes((billingCountryQuery || '').toLowerCase())
                              )
                              .map((country) => (
                                <div
                                  key={country.code}
                                  className="p-3 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer border-b last:border-b-0 transition-colors flex items-center gap-2"
                                  onClick={() => {
                                    billingAddressForm.setValue('country', country.name);
                                    setBillingCountryQuery('');
                                    setShowBillingCountryDropdown(false);
                                  }}
                                  data-testid={`button-billingCountry-${country.code}`}
                                >
                                  <span className="text-xl">{getCountryFlag(country.code)}</span>
                                  <span>{country.name}</span>
                                </div>
                              ))}
                            {europeanCountries.filter(country => 
                              country.name.toLowerCase().includes((billingCountryQuery || '').toLowerCase())
                            ).length === 0 && (
                              <div className="p-4 text-center text-slate-500 dark:text-slate-400">{t('customers:noCountriesFound')}</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <Separator className="my-6" />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {billingAddressForm.watch('country') === 'Czech Republic' && (
                      <div>
                        <Label htmlFor="billingIco">{t('customers:ico')}</Label>
                        <Input
                          id="billingIco"
                          {...billingAddressForm.register('ico')}
                          placeholder={t('customers:icoPlaceholder')}
                          data-testid="input-billingIco"
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('customers:czechCompanyRegistrationHint')}</p>
                      </div>
                    )}
                    <div className={billingAddressForm.watch('country') === 'Czech Republic' ? '' : 'md:col-span-2'}>
                      <Label htmlFor="billingVatId">{t('customers:vatId')}</Label>
                      <Input
                        id="billingVatId"
                        {...billingAddressForm.register('vatId')}
                        placeholder={t('customers:vatNumberExamplePlaceholder')}
                        data-testid="input-billingVatId"
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('customers:companyVatIdHint')}</p>
                    </div>
                  </div>

                  <Separator className="my-6" />

                  <div className="flex items-center space-x-2">
                    <input
                      id="billingIsPrimary"
                      type="checkbox"
                      {...billingAddressForm.register('isPrimary')}
                      className="rounded border-gray-300"
                      data-testid="checkbox-billingIsPrimary"
                    />
                    <Label htmlFor="billingIsPrimary">{t('customers:setAsPrimaryBillingAddress')}</Label>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsAddingBilling(false);
                        setEditingBillingIndex(null);
                        setIsBillingLabelManuallyEdited(false);
                        billingAddressForm.reset();
                      }}
                      data-testid="button-cancelBilling"
                    >
                      <X className="h-4 w-4 mr-2" />
                      {t('customers:cancel')}
                    </Button>
                    <Button
                      type="button"
                      onClick={billingAddressForm.handleSubmit(handleSaveBillingAddress)}
                      data-testid="button-saveBilling"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      {t('customers:saveAddress')}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {billingAddresses.length === 0 && !isAddingBilling && (
              <p className="text-center text-slate-500 dark:text-slate-400 py-8">{t('customers:noBillingAddresses')}</p>
            )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {(isCzech || isEU) && (
          <Card>
            <Collapsible open={taxInfoOpen} onOpenChange={setTaxInfoOpen}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  <div className="flex items-center justify-between w-full">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-purple-500" />
                      {t('customers:taxBusinessInformation')}
                    </CardTitle>
                    <ChevronDown className={cn("h-5 w-5 text-slate-500 dark:text-slate-400 transition-transform duration-200", taxInfoOpen ? "rotate-0" : "-rotate-90")} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
              {isCzech && (
                <div className="space-y-4 pb-4 border-b">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <span className="text-2xl">🇨🇿</span>
                    {t('customers:czechCompanyInformation')}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="ico">{t('customers:ico')}</Label>
                      <div className="flex gap-2">
                        <Input
                          id="ico"
                          {...form.register('ico')}
                          placeholder={t('customers:icoPlaceholder')}
                          onBlur={(e) => handleAresLookup(e.target.value)}
                          data-testid="input-ico"
                        />
                        {isLoadingAres && <Loader2 className="h-5 w-5 animate-spin mt-2" data-testid="loader-ares" />}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('customers:enterIcoToAutofill')}</p>
                    </div>
                    <div>
                      <Label htmlFor="dic">{t('customers:dic')}</Label>
                      <Input
                        id="dic"
                        {...form.register('dic')}
                        placeholder={t('customers:vatNumberCzPlaceholder')}
                        readOnly
                        className="bg-slate-50 dark:bg-slate-800"
                        data-testid="input-dic"
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('customers:autoFilledFromAres')}</p>
                    </div>
                  </div>
                </div>
              )}

              {isEU && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <span className="text-2xl">🇪🇺</span>
                    {t('customers:vatInformation')}
                  </h4>
                  <div>
                    <Label htmlFor="vatNumber">{t('customers:vatNumber')}</Label>
                    <div className="flex gap-2 items-start">
                      <div className="flex-1">
                        <Input
                          id="vatNumber"
                          {...form.register('vatNumber')}
                          placeholder={t('customers:enterVatNumber')}
                          onBlur={(e) => {
                            const vatNumber = e.target.value;
                            const country = selectedCountry;
                            if (vatNumber && country) {
                              handleVatValidation(vatNumber, country);
                            }
                          }}
                          data-testid="input-vatNumber"
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('customers:willBeValidatedVies')}</p>
                      </div>
                      {isValidatingVat && (
                        <Loader2 className="h-5 w-5 animate-spin mt-2" data-testid="loader-vat" />
                      )}
                      {!isValidatingVat && vatValidationResult && (
                        <div className="flex items-center gap-2 mt-2">
                          {vatValidationResult.valid ? (
                            <>
                              <CheckCircle className="h-5 w-5 text-green-500" data-testid="icon-vatValid" />
                              <Badge variant="default" className="bg-green-500" data-testid="badge-vatValid">{t('customers:valid')}</Badge>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-5 w-5 text-red-500" data-testid="icon-vatInvalid" />
                              <Badge variant="destructive" data-testid="badge-vatInvalid">{t('customers:invalid')}</Badge>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    {vatValidationResult?.companyName && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-2" data-testid="text-vatCompanyName">
                        {t('customers:companyLabel')} {vatValidationResult.companyName}
                      </p>
                    )}
                    {vatValidationResult?.error && (
                      <p className="text-sm text-red-500 mt-2">{vatValidationResult.error}</p>
                    )}
                  </div>
                </div>
              )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/customers')}
            className="w-full sm:w-auto"
            data-testid="button-cancel"
          >
            {t('customers:cancel')}
          </Button>
          <Button
            type="submit"
            disabled={createOrUpdateCustomerMutation.isPending}
            className="w-full sm:w-auto"
            data-testid="button-submit"
          >
            {createOrUpdateCustomerMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isEditMode ? t('customers:updating') : t('customers:creating')}
              </>
            ) : (
              isEditMode ? t('customers:updateCustomer') : t('customers:createCustomer')
            )}
          </Button>
        </div>
      </form>

      <AlertDialog open={deleteBillingIndex !== null} onOpenChange={() => setDeleteBillingIndex(null)}>
        <AlertDialogContent className="max-w-[95vw] sm:max-w-lg" data-testid="dialog-deleteBillingConfirm">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('customers:deleteBillingAddress')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('customers:confirmDeleteBillingAddress')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancelDeleteBilling">{t('customers:cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteBillingAddress}
              className="bg-red-500 hover:bg-red-600"
              data-testid="button-confirmDeleteBilling"
            >
              {t('customers:delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
