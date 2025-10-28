import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Plus, Trash2, Edit2, Check, X, Loader2, CheckCircle, XCircle, Globe, Building, MapPin, FileText, Truck, ChevronsUpDown, Pin, AlertCircle, Copy, Receipt } from "lucide-react";
import { europeanCountries, euCountryCodes, getCountryFlag } from "@/lib/countries";
import type { Customer, CustomerShippingAddress, CustomerBillingAddress } from "@shared/schema";
import { cn } from "@/lib/utils";

const availableCountries = [
  ...europeanCountries,
  { code: 'VN', name: 'Vietnam' },
  { code: 'Other', name: 'Other' }
];

const customerFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  country: z.string().optional(),
  preferredCurrency: z.enum(['CZK', 'EUR']).default('EUR'),
  facebookName: z.string().optional(),
  facebookUrl: z.string().optional(),
  profilePictureUrl: z.string().optional(),
  billingCompany: z.string().optional(),
  billingFirstName: z.string().optional(),
  billingLastName: z.string().optional(),
  billingEmail: z.string().email("Invalid email").optional().or(z.literal("")),
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

const shippingAddressSchema = z.object({
  id: z.string().optional(),
  label: z.string().optional(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  company: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  tel: z.string().optional(),
  street: z.string().min(1, "Street is required"),
  streetNumber: z.string().optional(),
  city: z.string().min(1, "City is required"),
  zipCode: z.string().min(1, "Zip code is required"),
  country: z.string().min(1, "Country is required"),
  isPrimary: z.boolean().default(false),
});

const billingAddressSchema = z.object({
  id: z.string().optional(),
  label: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  company: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
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

type CustomerFormData = z.infer<typeof customerFormSchema>;
type ShippingAddressFormData = z.infer<typeof shippingAddressSchema>;
type BillingAddressFormData = z.infer<typeof billingAddressSchema>;

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

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
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
    resolver: zodResolver(shippingAddressSchema),
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
    resolver: zodResolver(billingAddressSchema),
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
    if (!phone || !countryCode) return phone;
    
    // Remove all spaces and special chars except + and digits
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // Handle "00" prefix (international format) - convert to "+"
    if (cleaned.startsWith('00')) {
      cleaned = '+' + cleaned.substring(2);
    }
    
    // If already has proper + at start with country code, return cleaned version
    if (cleaned.startsWith('+')) {
      return cleaned;
    }
    
    // Remove country code digits if present (e.g., 420 → +420)
    const codeDigits = countryCode.replace('+', '');
    if (cleaned.startsWith(codeDigits)) {
      cleaned = cleaned.substring(codeDigits.length);
    }
    
    // Add country code prefix with no spaces
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
      generatedLabel = `Address #${addressCount}`;
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
      generatedLabel = `Address #${addressCount}`;
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
    shippingForm.setValue('state', suggestion.state);
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
    billingAddressForm.setValue('state', suggestion.state);
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
            title: "Not Found",
            description: "Company not found in ARES registry",
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
        title: "Success",
        description: "Company data loaded from ARES",
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
      const data: VatValidationResult = response as VatValidationResult;
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
            title: "Success",
            description: "Shipping address updated successfully",
          });
        } else {
          // Create new address
          await apiRequest('POST', `/api/customers/${customerId}/shipping-addresses`, shippingData);
          toast({
            title: "Success",
            description: "Shipping address added successfully",
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
          title: "Error",
          description: error.message || "Failed to save shipping address",
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
            title: "Success",
            description: "Billing address updated successfully",
          });
        } else {
          // Create new address
          await apiRequest('POST', `/api/customers/${customerId}/billing-addresses`, billingData);
          toast({
            title: "Success",
            description: "Billing address added successfully",
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
          title: "Error",
          description: error.message || "Failed to save billing address",
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
      if (fields.phone) {
        shippingForm.setValue('tel', fields.phone);
        filledFields.tel = data.confidence;
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
      if (fields.state) {
        shippingForm.setValue('state', capitalizeWords(fields.state));
        filledFields.state = data.confidence;
      }
      
      // Update confidence tracking
      setShippingFieldConfidence(filledFields);
      
      toast({
        title: "Address Parsed",
        description: `Successfully parsed address with ${data.confidence} confidence`,
      });
      setRawShippingAddress("");
    },
    onError: (error: any) => {
      toast({
        title: "Parse Failed",
        description: error.message || "Failed to parse address",
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
        // If business name exists, also use it as the customer name
        if (!form.getValues('name')) {
          form.setValue('name', cleanCompany);
        }
      }
      if (fields.email) {
        form.setValue('billingEmail', fields.email);
        filledFields.billingEmail = data.confidence;
      }
      if (fields.phone) {
        form.setValue('billingTel', fields.phone);
        filledFields.billingTel = data.confidence;
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
      
      // Update confidence tracking
      setBillingFieldConfidence(filledFields);
      
      toast({
        title: "Address Parsed",
        description: `Successfully parsed address with ${data.confidence} confidence`,
      });
      setRawBillingAddress("");
    },
    onError: (error: any) => {
      toast({
        title: "Parse Failed",
        description: error.message || "Failed to parse address",
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
      if (fields.phone) {
        billingAddressForm.setValue('tel', fields.phone);
        filledFields.tel = data.confidence;
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
      if (fields.state) {
        billingAddressForm.setValue('state', capitalizeWords(fields.state));
        filledFields.state = data.confidence;
      }
      
      setBillingAddressFieldConfidence(filledFields);
      
      toast({
        title: "Address Parsed",
        description: `Successfully parsed address with ${data.confidence} confidence`,
      });
      setRawBillingAddressForm("");
    },
    onError: (error: any) => {
      toast({
        title: "Parse Failed",
        description: error.message || "Failed to parse address",
        variant: "destructive",
      });
    },
  });

  const createOrUpdateCustomerMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      if (isEditMode) {
        return apiRequest('PATCH', `/api/customers/${customerId}`, data);
      }
      return apiRequest('POST', '/api/customers', data);
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
        title: "Success",
        description: isEditMode ? "Customer updated successfully" : "Customer created successfully",
      });
      navigate('/customers');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${isEditMode ? 'update' : 'create'} customer`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CustomerFormData) => {
    createOrUpdateCustomerMutation.mutate(data);
  };

  const isCzech = selectedCountry === 'CZ';
  const isEU = euCountryCodes.includes(selectedCountry);

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
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.history.back()}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold text-slate-900">
          {isEditMode ? 'Edit Customer' : 'Add New Customer'}
        </h1>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-500" />
              Location & Business Info
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
                <div>
                  <Label htmlFor="facebookUrl" className="text-base font-semibold">Facebook URL</Label>
                  <Input
                    id="facebookUrl"
                    {...form.register('facebookUrl')}
                    placeholder="https://www.facebook.com/username"
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
                    <p className="text-xs text-slate-500">Paste Facebook profile URL to auto-fill ID</p>
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
                          <p className="text-base font-bold text-amber-900">Customer Already Exists</p>
                          <p className="text-sm text-amber-700 mt-0.5">
                            A customer with Facebook ID "{extractedFacebookId}" already exists in the database
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
                                  <span className="text-slate-500">Email:</span>
                                  <span className="font-medium text-slate-900">{duplicateCustomer.billingEmail}</span>
                                </div>
                              )}
                              {duplicateCustomer.billingTel && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-500">Phone:</span>
                                  <span className="font-medium text-slate-900">{duplicateCustomer.billingTel}</span>
                                </div>
                              )}
                              {duplicateCustomer.country && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-500">Country:</span>
                                  <span className="font-medium text-slate-900">
                                    {getCountryFlag(duplicateCustomer.country)} {europeanCountries.find(c => c.code === duplicateCustomer.country)?.name || duplicateCustomer.country}
                                  </span>
                                </div>
                              )}
                              {duplicateCustomer.preferredCurrency && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-500">Currency:</span>
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
                        Go to {duplicateCustomer.name}'s Profile →
                      </Button>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="facebookName" className="text-base font-semibold">Facebook Name</Label>
                  <Input
                    id="facebookName"
                    {...form.register('facebookName')}
                    placeholder="Customer's Facebook display name"
                    className="text-base"
                    data-testid="input-facebookName"
                  />
                  <p className="text-xs text-slate-500 mt-1">Optional: Customer's name as shown on Facebook</p>
                </div>

                <div>
                  <Label htmlFor="name" className="text-base font-semibold">Name *</Label>
                  <Input
                    id="name"
                    {...form.register('name', {
                      onChange: () => setIsNameManuallyEdited(true)
                    })}
                    placeholder="Customer's display name"
                    className="text-base"
                    data-testid="input-name"
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.name.message}</p>
                  )}
                  <p className="text-xs text-slate-500 mt-1">Auto-syncs with Facebook name (editable)</p>
                </div>

                <div>
                  <Label htmlFor="country" className="text-base font-semibold">Country / Location</Label>
                  <p className="text-sm text-slate-500 mb-2">Select the primary country where this customer operates</p>
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
                          "Select country..."
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput 
                          placeholder="Search country..." 
                          value={countrySearchQuery}
                          onValueChange={setCountrySearchQuery}
                          data-testid="input-country-search"
                        />
                        <CommandList>
                          <CommandEmpty>No country found.</CommandEmpty>
                          
                          {pinnedFilteredCountries.length > 0 && (
                            <CommandGroup heading="Pinned Countries">
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
                            <CommandGroup heading={pinnedFilteredCountries.length > 0 ? "All Countries" : undefined}>
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
                  <Label htmlFor="preferredCurrency" className="text-base font-semibold">Preferred Currency</Label>
                  <p className="text-sm text-slate-500 mb-2">Choose the default currency for this customer's orders (CZK or EUR)</p>
                  <Select
                    value={form.watch('preferredCurrency')}
                    onValueChange={(value: 'CZK' | 'EUR') => form.setValue('preferredCurrency', value)}
                  >
                    <SelectTrigger className="w-full" data-testid="select-preferredCurrency">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR" data-testid="option-currency-EUR">EUR (Euro)</SelectItem>
                      <SelectItem value="CZK" data-testid="option-currency-CZK">CZK (Czech Koruna)</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.preferredCurrency && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.preferredCurrency.message}</p>
                  )}
                </div>
              </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-orange-500" />
                Shipping Addresses
              </span>
              {!isAddingShipping && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddShippingAddress}
                  data-testid="button-addShipping"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Shipping Address
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {shippingAddresses.map((addr, index) => (
              <div key={index} className="p-4 border rounded-lg bg-slate-50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{addr.label}</h4>
                    {addr.isPrimary && (
                      <Badge variant="default" data-testid={`badge-primary-${index}`}>Primary</Badge>
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
                        Set Primary
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
                <div className="text-sm text-slate-600" data-testid={`text-shippingAddress-${index}`}>
                  {addr.company && <p className="font-medium">{addr.company}</p>}
                  <p>{addr.firstName} {addr.lastName}</p>
                  {addr.street && <p>{addr.street} {addr.streetNumber}</p>}
                  {addr.city && <p>{addr.zipCode} {addr.city}</p>}
                  {addr.country && <p>{addr.country}</p>}
                  {addr.tel && <p>Tel: {addr.tel}</p>}
                  {addr.email && <p>Email: {addr.email}</p>}
                </div>
              </div>
            ))}

            {isAddingShipping && (
              <div className="p-4 border rounded-lg bg-slate-50">
                <h4 className="font-semibold mb-4">
                  {editingShippingIndex !== null ? 'Edit' : 'Add'} Shipping Address
                </h4>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="shippingLabel">Label</Label>
                    <Input
                      id="shippingLabel"
                      {...shippingForm.register('label', {
                        onChange: () => setIsLabelManuallyEdited(true)
                      })}
                      placeholder="Auto-generated from address..."
                      data-testid="input-shippingLabel"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Auto-generated from address fields (editable)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rawShippingAddress">Smart Paste</Label>
                    <p className="text-sm text-muted-foreground">
                      Paste any address info (name, company, email, phone, address) - auto-detects Vietnamese names, converts to English letters, and validates addresses
                    </p>
                    <div className="flex gap-2">
                      <Textarea
                        id="rawShippingAddress"
                        value={rawShippingAddress}
                        onChange={(e) => setRawShippingAddress(e.target.value)}
                        placeholder="e.g., John Doe, ABC Company, john@example.com, +420123456789, Main Street 123, Prague 110 00, Czech Republic"
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
                          Parsing...
                        </>
                      ) : (
                        'Parse & Fill'
                      )}
                    </Button>
                  </div>

                  <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t-2 border-slate-300" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-slate-50 px-2 text-slate-500 font-semibold">Address Details</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="shippingFirstName">First Name *</Label>
                      <Input
                        id="shippingFirstName"
                        {...shippingForm.register('firstName')}
                        placeholder="First name"
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
                      <Label htmlFor="shippingLastName">Last Name *</Label>
                      <Input
                        id="shippingLastName"
                        {...shippingForm.register('lastName')}
                        placeholder="Last name"
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
                    <Label htmlFor="shippingCompany">Company</Label>
                    <Input
                      id="shippingCompany"
                      {...shippingForm.register('company')}
                      placeholder="Company name"
                      className={cn(getConfidenceClass('company', shippingFieldConfidence))}
                      data-testid="input-shippingCompany"
                    />
                  </div>

                  <Separator className="my-6" />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="shippingEmail">Email</Label>
                      <Input
                        id="shippingEmail"
                        type="email"
                        {...shippingForm.register('email')}
                        placeholder="email@example.com"
                        className={cn(getConfidenceClass('email', shippingFieldConfidence))}
                        data-testid="input-shippingEmail"
                      />
                    </div>
                    <div>
                      <Label htmlFor="shippingTel">Phone</Label>
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
                          }
                        })}
                        placeholder="+420123456789"
                        className={cn(getConfidenceClass('tel', shippingFieldConfidence))}
                        data-testid="input-shippingTel"
                      />
                    </div>
                  </div>

                  <Separator className="my-6" />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <Label htmlFor="shippingStreet">Street</Label>
                      <Input
                        id="shippingStreet"
                        {...shippingForm.register('street')}
                        placeholder="Street name"
                        className={cn(getConfidenceClass('street', shippingFieldConfidence))}
                        data-testid="input-shippingStreet"
                      />
                    </div>
                    <div>
                      <Label htmlFor="shippingStreetNumber">Number</Label>
                      <Input
                        id="shippingStreetNumber"
                        {...shippingForm.register('streetNumber')}
                        placeholder="123"
                        className={cn(getConfidenceClass('streetNumber', shippingFieldConfidence))}
                        data-testid="input-shippingStreetNumber"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="shippingZipCode">Postal Code</Label>
                      <Input
                        id="shippingZipCode"
                        {...shippingForm.register('zipCode')}
                        placeholder="110 00"
                        className={cn(getConfidenceClass('zipCode', shippingFieldConfidence))}
                        data-testid="input-shippingZipCode"
                      />
                    </div>
                    <div>
                      <Label htmlFor="shippingCity">City</Label>
                      <Input
                        id="shippingCity"
                        {...shippingForm.register('city')}
                        placeholder="Prague"
                        className={cn(getConfidenceClass('city', shippingFieldConfidence))}
                        data-testid="input-shippingCity"
                      />
                    </div>
                    <div>
                      <Label htmlFor="shippingCountry">Country</Label>
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
                          placeholder="Type to search countries..."
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
                          <div className="absolute top-full left-0 right-0 mt-1 border rounded-md shadow-lg bg-white max-h-64 overflow-y-auto z-50">
                            {europeanCountries
                              .filter(country => 
                                country.name.toLowerCase().includes((shippingCountryQuery || '').toLowerCase())
                              )
                              .map((country) => (
                                <div
                                  key={country.code}
                                  className="p-3 hover:bg-slate-100 cursor-pointer border-b last:border-b-0 transition-colors flex items-center gap-2"
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
                              <div className="p-4 text-center text-slate-500">No countries found</div>
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
                      Cancel
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
                            title: "Validation Error",
                            description: errorMessages || "Please fill in all required fields (First Name, Last Name)",
                            variant: "destructive",
                          });
                        }
                      )}
                      data-testid="button-saveShipping"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Save Address
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {shippingAddresses.length === 0 && !isAddingShipping && (
              <p className="text-center text-slate-500 py-8">No shipping addresses added yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-blue-500" />
                Billing Addresses
              </span>
              {!isAddingBilling && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddBillingAddress}
                  data-testid="button-addBilling"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Billing Address
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {billingAddresses.map((addr, index) => (
              <div key={index} className="p-4 border rounded-lg bg-slate-50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{addr.label}</h4>
                    {addr.isPrimary && (
                      <Badge variant="default" data-testid={`badge-billingPrimary-${index}`}>Primary</Badge>
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
                        Set Primary
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
                <div className="text-sm text-slate-600" data-testid={`text-billingAddress-${index}`}>
                  {addr.company && <p className="font-medium">{addr.company}</p>}
                  <p>{addr.firstName} {addr.lastName}</p>
                  {addr.street && <p>{addr.street} {addr.streetNumber}</p>}
                  {addr.city && <p>{addr.zipCode} {addr.city}</p>}
                  {addr.country && <p>{addr.country}</p>}
                  {addr.tel && <p>Tel: {addr.tel}</p>}
                  {addr.email && <p>Email: {addr.email}</p>}
                  {addr.ico && <p>IČO: {addr.ico}</p>}
                  {addr.vatId && <p>VAT ID: {addr.vatId}</p>}
                </div>
              </div>
            ))}

            {isAddingBilling && (
              <div className="p-4 border rounded-lg bg-slate-50">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold">
                    {editingBillingIndex !== null ? 'Edit' : 'Add'} Billing Address
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
                          billingAddressForm.setValue('state', primaryAddress.state || '');
                          toast({
                            title: "Address Copied",
                            description: "Shipping address has been copied to billing address",
                          });
                        }
                      }}
                      data-testid="button-copy-shipping-to-billing"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy from Shipping
                    </Button>
                  )}
                </div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="billingLabel">Label</Label>
                    <Input
                      id="billingLabel"
                      {...billingAddressForm.register('label', {
                        onChange: () => setIsBillingLabelManuallyEdited(true)
                      })}
                      placeholder="Auto-generated from address..."
                      data-testid="input-billingLabel"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Auto-generated from address fields (editable)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rawBillingAddressForm">Smart Paste</Label>
                    <p className="text-sm text-muted-foreground">
                      Paste any address info (name, company, email, phone, address) - auto-detects Vietnamese names, converts to English letters, and validates addresses
                    </p>
                    <div className="flex gap-2">
                      <Textarea
                        id="rawBillingAddressForm"
                        value={rawBillingAddressForm}
                        onChange={(e) => setRawBillingAddressForm(e.target.value)}
                        placeholder="e.g., John Doe, ABC Company, john@example.com, +420123456789, Main Street 123, Prague 110 00, Czech Republic"
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
                          Parsing...
                        </>
                      ) : (
                        'Parse & Fill'
                      )}
                    </Button>
                  </div>

                  <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t-2 border-slate-300" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-slate-50 px-2 text-slate-500 font-semibold">Address Details</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="billingFirstName">First Name</Label>
                      <Input
                        id="billingFirstName"
                        {...billingAddressForm.register('firstName')}
                        placeholder="First name"
                        className={cn(getConfidenceClass('firstName', billingAddressFieldConfidence))}
                        data-testid="input-billingFirstName"
                      />
                    </div>
                    <div>
                      <Label htmlFor="billingLastName">Last Name</Label>
                      <Input
                        id="billingLastName"
                        {...billingAddressForm.register('lastName')}
                        placeholder="Last name"
                        className={cn(getConfidenceClass('lastName', billingAddressFieldConfidence))}
                        data-testid="input-billingLastName"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="billingCompany">Company</Label>
                    <Input
                      id="billingCompany"
                      {...billingAddressForm.register('company')}
                      placeholder="Company name"
                      className={cn(getConfidenceClass('company', billingAddressFieldConfidence))}
                      data-testid="input-billingCompany"
                    />
                  </div>

                  <Separator className="my-6" />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="billingEmail">Email</Label>
                      <Input
                        id="billingEmail"
                        type="email"
                        {...billingAddressForm.register('email')}
                        placeholder="email@example.com"
                        className={cn(getConfidenceClass('email', billingAddressFieldConfidence))}
                        data-testid="input-billingEmail"
                      />
                    </div>
                    <div>
                      <Label htmlFor="billingTel">Phone</Label>
                      <Input
                        id="billingTel"
                        {...billingAddressForm.register('tel', {
                          onChange: (e) => {
                            const currentCountry = billingAddressForm.watch('country');
                            const countryCode = getPhoneCountryCode(currentCountry);
                            if (countryCode) {
                              const formatted = formatPhoneNumber(e.target.value, countryCode);
                              billingAddressForm.setValue('tel', formatted);
                            }
                          }
                        })}
                        placeholder="+420123456789"
                        className={cn(getConfidenceClass('tel', billingAddressFieldConfidence))}
                        data-testid="input-billingTel"
                      />
                    </div>
                  </div>

                  <Separator className="my-6" />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <Label htmlFor="billingStreet">Street</Label>
                      <Input
                        id="billingStreet"
                        {...billingAddressForm.register('street')}
                        placeholder="Street name"
                        className={cn(getConfidenceClass('street', billingAddressFieldConfidence))}
                        data-testid="input-billingStreet"
                      />
                    </div>
                    <div>
                      <Label htmlFor="billingStreetNumber">Number</Label>
                      <Input
                        id="billingStreetNumber"
                        {...billingAddressForm.register('streetNumber')}
                        placeholder="123"
                        className={cn(getConfidenceClass('streetNumber', billingAddressFieldConfidence))}
                        data-testid="input-billingStreetNumber"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="billingZipCode">Postal Code</Label>
                      <Input
                        id="billingZipCode"
                        {...billingAddressForm.register('zipCode')}
                        placeholder="110 00"
                        className={cn(getConfidenceClass('zipCode', billingAddressFieldConfidence))}
                        data-testid="input-billingZipCode"
                      />
                    </div>
                    <div>
                      <Label htmlFor="billingCity">City</Label>
                      <Input
                        id="billingCity"
                        {...billingAddressForm.register('city')}
                        placeholder="Prague"
                        className={cn(getConfidenceClass('city', billingAddressFieldConfidence))}
                        data-testid="input-billingCity"
                      />
                    </div>
                    <div>
                      <Label htmlFor="billingCountry">Country</Label>
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
                          placeholder="Type to search countries..."
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
                          <div className="absolute top-full left-0 right-0 mt-1 border rounded-md shadow-lg bg-white max-h-64 overflow-y-auto z-50">
                            {europeanCountries
                              .filter(country => 
                                country.name.toLowerCase().includes((billingCountryQuery || '').toLowerCase())
                              )
                              .map((country) => (
                                <div
                                  key={country.code}
                                  className="p-3 hover:bg-slate-100 cursor-pointer border-b last:border-b-0 transition-colors flex items-center gap-2"
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
                              <div className="p-4 text-center text-slate-500">No countries found</div>
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
                        <Label htmlFor="billingIco">IČO (Company ID)</Label>
                        <Input
                          id="billingIco"
                          {...billingAddressForm.register('ico')}
                          placeholder="12345678"
                          data-testid="input-billingIco"
                        />
                        <p className="text-xs text-slate-500 mt-1">Czech company registration number</p>
                      </div>
                    )}
                    <div className={billingAddressForm.watch('country') === 'Czech Republic' ? '' : 'md:col-span-2'}>
                      <Label htmlFor="billingVatId">VAT ID</Label>
                      <Input
                        id="billingVatId"
                        {...billingAddressForm.register('vatId')}
                        placeholder="e.g., DE123456789"
                        data-testid="input-billingVatId"
                      />
                      <p className="text-xs text-slate-500 mt-1">Company VAT identification number</p>
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
                    <Label htmlFor="billingIsPrimary">Set as primary billing address</Label>
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
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={billingAddressForm.handleSubmit(handleSaveBillingAddress)}
                      data-testid="button-saveBilling"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Save Address
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {billingAddresses.length === 0 && !isAddingBilling && (
              <p className="text-center text-slate-500 py-8">No billing addresses added yet</p>
            )}
          </CardContent>
        </Card>

        {(isCzech || isEU) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-500" />
                Tax & Business Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isCzech && (
                <div className="space-y-4 pb-4 border-b">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <span className="text-2xl">🇨🇿</span>
                    Czech Company Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="ico">IČO (Company ID)</Label>
                      <div className="flex gap-2">
                        <Input
                          id="ico"
                          {...form.register('ico')}
                          placeholder="12345678"
                          onBlur={(e) => handleAresLookup(e.target.value)}
                          data-testid="input-ico"
                        />
                        {isLoadingAres && <Loader2 className="h-5 w-5 animate-spin mt-2" data-testid="loader-ares" />}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Enter IČO to auto-fill company details from ARES</p>
                    </div>
                    <div>
                      <Label htmlFor="dic">DIČ (Tax ID)</Label>
                      <Input
                        id="dic"
                        {...form.register('dic')}
                        placeholder="CZ12345678"
                        readOnly
                        className="bg-slate-50"
                        data-testid="input-dic"
                      />
                      <p className="text-xs text-slate-500 mt-1">Auto-filled from ARES</p>
                    </div>
                  </div>
                </div>
              )}

              {isEU && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <span className="text-2xl">🇪🇺</span>
                    VAT Information
                  </h4>
                  <div>
                    <Label htmlFor="vatNumber">VAT Number</Label>
                    <div className="flex gap-2 items-start">
                      <div className="flex-1">
                        <Input
                          id="vatNumber"
                          {...form.register('vatNumber')}
                          placeholder="Enter VAT number"
                          onBlur={(e) => {
                            const vatNumber = e.target.value;
                            const country = selectedCountry;
                            if (vatNumber && country) {
                              handleVatValidation(vatNumber, country);
                            }
                          }}
                          data-testid="input-vatNumber"
                        />
                        <p className="text-xs text-slate-500 mt-1">Will be validated using EU VIES system</p>
                      </div>
                      {isValidatingVat && (
                        <Loader2 className="h-5 w-5 animate-spin mt-2" data-testid="loader-vat" />
                      )}
                      {!isValidatingVat && vatValidationResult && (
                        <div className="flex items-center gap-2 mt-2">
                          {vatValidationResult.valid ? (
                            <>
                              <CheckCircle className="h-5 w-5 text-green-500" data-testid="icon-vatValid" />
                              <Badge variant="default" className="bg-green-500" data-testid="badge-vatValid">Valid</Badge>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-5 w-5 text-red-500" data-testid="icon-vatInvalid" />
                              <Badge variant="destructive" data-testid="badge-vatInvalid">Invalid</Badge>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    {vatValidationResult?.companyName && (
                      <p className="text-sm text-slate-600 mt-2" data-testid="text-vatCompanyName">
                        Company: {vatValidationResult.companyName}
                      </p>
                    )}
                    {vatValidationResult?.error && (
                      <p className="text-sm text-red-500 mt-2">{vatValidationResult.error}</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/customers')}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createOrUpdateCustomerMutation.isPending}
            data-testid="button-submit"
          >
            {createOrUpdateCustomerMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isEditMode ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              isEditMode ? 'Update Customer' : 'Create Customer'
            )}
          </Button>
        </div>
      </form>

      <AlertDialog open={deleteBillingIndex !== null} onOpenChange={() => setDeleteBillingIndex(null)}>
        <AlertDialogContent data-testid="dialog-deleteBillingConfirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Billing Address</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this billing address? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancelDeleteBilling">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteBillingAddress}
              className="bg-red-500 hover:bg-red-600"
              data-testid="button-confirmDeleteBilling"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
