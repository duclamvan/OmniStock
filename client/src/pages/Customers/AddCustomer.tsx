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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Plus, Trash2, Edit2, Check, X, Loader2, CheckCircle, XCircle, Globe, Building, MapPin, FileText, Truck, ChevronsUpDown, Pin, AlertCircle } from "lucide-react";
import { europeanCountries, euCountryCodes, getCountryFlag } from "@/lib/countries";
import type { Customer, CustomerShippingAddress } from "@shared/schema";
import { cn } from "@/lib/utils";

const availableCountries = [
  ...europeanCountries,
  { code: 'VN', name: 'Vietnam' },
  { code: 'Other', name: 'Other' }
];

const customerFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  country: z.string().min(1, "Country is required"),
  facebookName: z.string().optional(),
  facebookUrl: z.string().optional(),
  profilePictureUrl: z.string().optional(),
  billingCompany: z.string().optional(),
  billingFirstName: z.string().min(1, "First name is required"),
  billingLastName: z.string().min(1, "Last name is required"),
  billingEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  billingTel: z.string().optional(),
  billingStreet: z.string().optional(),
  billingStreetNumber: z.string().optional(),
  billingCity: z.string().optional(),
  billingZipCode: z.string().optional(),
  billingCountry: z.string().optional(),
  billingState: z.string().optional(),
  ico: z.string().optional(),
  dic: z.string().optional(),
  vatNumber: z.string().optional(),
  vatValid: z.boolean().optional(),
  vatCompanyName: z.string().optional(),
  vatCompanyAddress: z.string().optional(),
});

const shippingAddressSchema = z.object({
  id: z.number().optional(),
  label: z.string().min(1, "Label is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  company: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  tel: z.string().optional(),
  street: z.string().optional(),
  streetNumber: z.string().optional(),
  city: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  state: z.string().optional(),
  isPrimary: z.boolean().default(false),
});

type CustomerFormData = z.infer<typeof customerFormSchema>;
type ShippingAddressFormData = z.infer<typeof shippingAddressSchema>;

interface AddressAutocompleteResult {
  displayName: string;
  street: string;
  streetNumber: string;
  city: string;
  zipCode: string;
  country: string;
  state: string;
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
  const customerId = params.id ? parseInt(params.id) : undefined;
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

  const [shippingAddresses, setShippingAddresses] = useState<ShippingAddressFormData[]>([]);
  const [isAddingShipping, setIsAddingShipping] = useState(false);
  const [editingShippingIndex, setEditingShippingIndex] = useState<number | null>(null);
  const [shippingAddressQuery, setShippingAddressQuery] = useState("");
  const [shippingAddressSuggestions, setShippingAddressSuggestions] = useState<AddressAutocompleteResult[]>([]);
  const [showShippingDropdown, setShowShippingDropdown] = useState(false);
  const [isLoadingShippingAutocomplete, setIsLoadingShippingAutocomplete] = useState(false);

  const [rawShippingAddress, setRawShippingAddress] = useState("");
  const [rawBillingAddress, setRawBillingAddress] = useState("");

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: "",
      country: "",
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
      billingState: "",
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
      state: "",
      isPrimary: false,
    },
  });

  const { data: existingCustomer, isLoading: isLoadingCustomer } = useQuery<Customer>({
    queryKey: ['/api/customers', customerId],
    enabled: isEditMode,
  });

  const { data: existingShippingAddresses } = useQuery<CustomerShippingAddress[]>({
    queryKey: ['/api/customers', customerId, 'shipping-addresses'],
    enabled: isEditMode,
  });

  useEffect(() => {
    if (existingCustomer && isEditMode) {
      form.reset({
        name: existingCustomer.name || "",
        country: existingCustomer.country || "",
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
        billingState: existingCustomer.billingState || "",
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
        state: addr.state || "",
        isPrimary: addr.isPrimary || false,
      })));
    }
  }, [existingShippingAddresses]);

  const selectedCountry = form.watch('country');
  const nameValue = form.watch('name');
  const facebookNameValue = form.watch('facebookName');
  const facebookUrlValue = form.watch('facebookUrl');

  useEffect(() => {
    if (selectedCountry && !isEditMode) {
      form.setValue('billingCountry', selectedCountry);
    }
  }, [selectedCountry, isEditMode, form]);

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
    form.setValue('billingState', suggestion.state);
    setBillingAddressQuery(suggestion.displayName);
    setShowBillingDropdown(false);
  };

  const selectShippingAddress = (suggestion: AddressAutocompleteResult) => {
    shippingForm.setValue('street', suggestion.street);
    shippingForm.setValue('streetNumber', suggestion.streetNumber);
    shippingForm.setValue('city', suggestion.city);
    shippingForm.setValue('zipCode', suggestion.zipCode);
    shippingForm.setValue('country', suggestion.country);
    shippingForm.setValue('state', suggestion.state);
    setShippingAddressQuery(suggestion.displayName);
    setShowShippingDropdown(false);
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
      country: form.getValues('billingCountry') || "",
      state: "",
      isPrimary: shippingAddresses.length === 0,
    });
  };

  const handleSaveShippingAddress = (data: ShippingAddressFormData) => {
    if (editingShippingIndex !== null) {
      const updated = [...shippingAddresses];
      updated[editingShippingIndex] = data;
      setShippingAddresses(updated);
      setEditingShippingIndex(null);
    } else {
      setShippingAddresses([...shippingAddresses, data]);
    }
    setIsAddingShipping(false);
    shippingForm.reset();
  };

  const handleEditShippingAddress = (index: number) => {
    setEditingShippingIndex(index);
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

  const capitalizeWords = (str: string) => {
    return str.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const parseShippingAddressMutation = useMutation({
    mutationFn: async (rawAddress: string) => {
      const res = await apiRequest('POST', '/api/addresses/parse', { rawAddress });
      return res.json();
    },
    onSuccess: (data: { fields: any; confidence: string }) => {
      const { fields } = data;
      
      // Capitalize names
      if (fields.firstName) shippingForm.setValue('firstName', capitalizeWords(fields.firstName));
      if (fields.lastName) shippingForm.setValue('lastName', capitalizeWords(fields.lastName));
      if (fields.company) shippingForm.setValue('company', fields.company);
      if (fields.email) shippingForm.setValue('email', fields.email);
      if (fields.phone) shippingForm.setValue('tel', fields.phone);
      
      // Use Nominatim-corrected address values (already properly formatted by backend with diacritics)
      if (fields.street) shippingForm.setValue('street', fields.street);
      if (fields.streetNumber) shippingForm.setValue('streetNumber', fields.streetNumber);
      if (fields.city) shippingForm.setValue('city', fields.city);
      if (fields.zipCode) shippingForm.setValue('zipCode', fields.zipCode);
      if (fields.country) shippingForm.setValue('country', fields.country);
      if (fields.state) shippingForm.setValue('state', fields.state);
      
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

  const parseBillingAddressMutation = useMutation({
    mutationFn: async (rawAddress: string) => {
      const res = await apiRequest('POST', '/api/addresses/parse', { rawAddress });
      return res.json();
    },
    onSuccess: (data: { fields: any; confidence: string }) => {
      const { fields } = data;
      
      // Capitalize names
      if (fields.firstName) form.setValue('billingFirstName', capitalizeWords(fields.firstName));
      if (fields.lastName) form.setValue('billingLastName', capitalizeWords(fields.lastName));
      if (fields.company) {
        form.setValue('billingCompany', fields.company);
        // If business name exists, also use it as the customer name
        if (!form.getValues('name')) {
          form.setValue('name', fields.company);
        }
      }
      if (fields.email) form.setValue('billingEmail', fields.email);
      if (fields.phone) form.setValue('billingTel', fields.phone);
      
      // Use Nominatim-corrected address values (already properly formatted by backend with diacritics)
      if (fields.street) form.setValue('billingStreet', fields.street);
      if (fields.streetNumber) form.setValue('billingStreetNumber', fields.streetNumber);
      if (fields.city) form.setValue('billingCity', fields.city);
      if (fields.zipCode) form.setValue('billingZipCode', fields.zipCode);
      if (fields.country) form.setValue('billingCountry', fields.country);
      if (fields.state) form.setValue('billingState', fields.state);
      
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
          onClick={() => navigate('/customers')}
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
                    }}
                  />
                  <p className="text-xs text-slate-500 mt-1">Paste Facebook profile URL to auto-fill ID</p>
                </div>

                <div>
                  <Label htmlFor="facebookId" className="text-base font-semibold">Facebook ID</Label>
                  <div className="relative">
                    <Input
                      id="facebookId"
                      value={extractedFacebookId || ''}
                      onChange={(e) => {
                        const newId = e.target.value;
                        setExtractedFacebookId(newId);
                        checkDuplicateCustomer(newId);
                      }}
                      placeholder="Numeric ID or username"
                      className="text-base"
                      data-testid="input-facebookId"
                    />
                    {isCheckingDuplicate && (
                      <Loader2 className="absolute right-3 top-3 h-5 w-5 animate-spin text-slate-400" data-testid="loader-duplicate-check" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Auto-extracted from URL or enter manually</p>
                  
                  {duplicateCustomer && !isEditMode && (
                    <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md" data-testid="alert-duplicate-customer">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-amber-900">Customer Already Exists</p>
                          <p className="text-sm text-amber-700 mt-1">
                            A customer with Facebook ID "{extractedFacebookId}" already exists: <strong>{duplicateCustomer.name}</strong>
                          </p>
                          <Button
                            type="button"
                            variant="link"
                            className="h-auto p-0 text-amber-700 hover:text-amber-900 font-semibold mt-2"
                            onClick={() => navigate(`/customers/${duplicateCustomer.id}/edit`)}
                            data-testid="button-go-to-existing-customer"
                          >
                            Go to {duplicateCustomer.name}'s profile →
                          </Button>
                        </div>
                      </div>
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
                    {...form.register('name')}
                    placeholder="Customer's display name"
                    className="text-base"
                    data-testid="input-name"
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.name.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="country" className="text-base font-semibold">Country / Location *</Label>
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
                    <Label htmlFor="shippingLabel">Label / Name *</Label>
                    <Input
                      id="shippingLabel"
                      {...shippingForm.register('label')}
                      placeholder="e.g., Main Office, Warehouse"
                      data-testid="input-shippingLabel"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rawShippingAddress">Smart Paste</Label>
                    <p className="text-sm text-muted-foreground">
                      Paste any address info (name, company, email, phone, address) and we'll split it automatically
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

                  <div className="space-y-2">
                    <Label htmlFor="shippingAddressAutocomplete">Search Address</Label>
                    <div className="relative">
                      <Input
                        id="shippingAddressAutocomplete"
                        value={shippingAddressQuery}
                        onChange={(e) => {
                          setShippingAddressQuery(e.target.value);
                          searchShippingAddress(e.target.value);
                        }}
                        placeholder="Start typing to search..."
                        data-testid="input-shippingAddressAutocomplete"
                      />
                      {shippingAddressQuery && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1 h-8 w-8 p-0"
                          onClick={() => {
                            setShippingAddressQuery("");
                            setShippingAddressSuggestions([]);
                            setShowShippingDropdown(false);
                          }}
                          data-testid="button-clearShippingAutocomplete"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      {showShippingDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 border rounded-md shadow-lg bg-white max-h-72 overflow-y-auto z-50">
                          {isLoadingShippingAutocomplete ? (
                            <div className="p-4 text-center" data-testid="text-shippingAutocompleteLoading">
                              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                            </div>
                          ) : shippingAddressSuggestions.length > 0 ? (
                            shippingAddressSuggestions.map((suggestion, index) => (
                              <div
                                key={index}
                                className="p-3 hover:bg-slate-100 cursor-pointer border-b last:border-b-0 transition-colors"
                                onClick={() => selectShippingAddress(suggestion)}
                                data-testid={`button-shippingAddressSuggestion-${index}`}
                              >
                                {suggestion.displayName}
                              </div>
                            ))
                          ) : (
                            <div className="p-4 text-center text-slate-500">No addresses found</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="shippingFirstName">First Name *</Label>
                      <Input
                        id="shippingFirstName"
                        {...shippingForm.register('firstName')}
                        placeholder="First name"
                        data-testid="input-shippingFirstName"
                      />
                    </div>
                    <div>
                      <Label htmlFor="shippingLastName">Last Name *</Label>
                      <Input
                        id="shippingLastName"
                        {...shippingForm.register('lastName')}
                        placeholder="Last name"
                        data-testid="input-shippingLastName"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="shippingCompany">Company</Label>
                    <Input
                      id="shippingCompany"
                      {...shippingForm.register('company')}
                      placeholder="Company name"
                      data-testid="input-shippingCompany"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="shippingEmail">Email</Label>
                      <Input
                        id="shippingEmail"
                        type="email"
                        {...shippingForm.register('email')}
                        placeholder="email@example.com"
                        data-testid="input-shippingEmail"
                      />
                    </div>
                    <div>
                      <Label htmlFor="shippingTel">Phone</Label>
                      <Input
                        id="shippingTel"
                        {...shippingForm.register('tel')}
                        placeholder="+420 123 456 789"
                        data-testid="input-shippingTel"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <Label htmlFor="shippingStreet">Street</Label>
                      <Input
                        id="shippingStreet"
                        {...shippingForm.register('street')}
                        placeholder="Street name"
                        data-testid="input-shippingStreet"
                      />
                    </div>
                    <div>
                      <Label htmlFor="shippingStreetNumber">Number</Label>
                      <Input
                        id="shippingStreetNumber"
                        {...shippingForm.register('streetNumber')}
                        placeholder="123"
                        data-testid="input-shippingStreetNumber"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="shippingCity">City</Label>
                      <Input
                        id="shippingCity"
                        {...shippingForm.register('city')}
                        placeholder="City"
                        data-testid="input-shippingCity"
                      />
                    </div>
                    <div>
                      <Label htmlFor="shippingZipCode">Postal Code</Label>
                      <Input
                        id="shippingZipCode"
                        {...shippingForm.register('zipCode')}
                        placeholder="12345"
                        data-testid="input-shippingZipCode"
                      />
                    </div>
                    <div>
                      <Label htmlFor="shippingCountry">Country</Label>
                      <Input
                        id="shippingCountry"
                        {...shippingForm.register('country')}
                        placeholder="Country"
                        data-testid="input-shippingCountry"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsAddingShipping(false);
                        setEditingShippingIndex(null);
                        shippingForm.reset();
                      }}
                      data-testid="button-cancelShipping"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={shippingForm.handleSubmit(handleSaveShippingAddress)}
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-green-500" />
              Billing Address
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rawBillingAddress">Smart Paste</Label>
              <p className="text-sm text-muted-foreground">
                Paste any address info (name, company, email, phone, address) and we'll split it automatically
              </p>
              <div className="flex gap-2">
                <Textarea
                  id="rawBillingAddress"
                  value={rawBillingAddress}
                  onChange={(e) => setRawBillingAddress(e.target.value)}
                  placeholder="e.g., John Doe, ABC Company, john@example.com, +420123456789, Main Street 123, Prague 110 00, Czech Republic"
                  className="min-h-[100px]"
                  data-testid="textarea-rawBillingAddress"
                />
              </div>
              <Button
                type="button"
                onClick={() => parseBillingAddressMutation.mutate(rawBillingAddress)}
                disabled={!rawBillingAddress.trim() || parseBillingAddressMutation.isPending}
                className="w-full"
                data-testid="button-parseBillingAddress"
              >
                {parseBillingAddressMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Parsing...
                  </>
                ) : (
                  'Parse & Fill'
                )}
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="billingAddressAutocomplete" className="text-base font-semibold">Quick Address Lookup</Label>
              <p className="text-sm text-slate-500 mb-2">Start typing to search and autocomplete address</p>
              <div className="relative">
                <Input
                  id="billingAddressAutocomplete"
                  value={billingAddressQuery}
                  onChange={(e) => {
                    setBillingAddressQuery(e.target.value);
                    searchBillingAddress(e.target.value);
                  }}
                  placeholder="Type address to search..."
                  className="text-base"
                  data-testid="input-billingAddressAutocomplete"
                />
                {billingAddressQuery && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-8 w-8 p-0"
                    onClick={() => {
                      setBillingAddressQuery("");
                      setBillingAddressSuggestions([]);
                      setShowBillingDropdown(false);
                    }}
                    data-testid="button-clearBillingAutocomplete"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                {showBillingDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 border rounded-md shadow-lg bg-white max-h-72 overflow-y-auto z-50">
                    {isLoadingBillingAutocomplete ? (
                      <div className="p-4 text-center" data-testid="text-billingAutocompleteLoading">
                        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                      </div>
                    ) : billingAddressSuggestions.length > 0 ? (
                      billingAddressSuggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className="p-3 hover:bg-slate-100 cursor-pointer border-b last:border-b-0 transition-colors"
                          onClick={() => selectBillingAddress(suggestion)}
                          data-testid={`button-billingAddressSuggestion-${index}`}
                        >
                          {suggestion.displayName}
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-slate-500">No addresses found</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-semibold mb-3">Or enter manually:</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label htmlFor="billingFirstName">First Name *</Label>
                  <Input
                    id="billingFirstName"
                    {...form.register('billingFirstName')}
                    placeholder="Jan"
                    data-testid="input-billingFirstName"
                  />
                  {form.formState.errors.billingFirstName && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.billingFirstName.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="billingLastName">Last Name *</Label>
                  <Input
                    id="billingLastName"
                    {...form.register('billingLastName')}
                    placeholder="Novák"
                    data-testid="input-billingLastName"
                  />
                  {form.formState.errors.billingLastName && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.billingLastName.message}</p>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <Label htmlFor="billingCompany">Company Name</Label>
                <Input
                  id="billingCompany"
                  {...form.register('billingCompany')}
                  placeholder="Nail Salon Prague s.r.o."
                  data-testid="input-billingCompany"
                />
                <p className="text-xs text-slate-500 mt-1">Leave empty for individual customers</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="billingStreet">Street Address</Label>
                  <Input
                    id="billingStreet"
                    {...form.register('billingStreet')}
                    placeholder="Main Street"
                    data-testid="input-billingStreet"
                  />
                </div>
                <div>
                  <Label htmlFor="billingStreetNumber">Number</Label>
                  <Input
                    id="billingStreetNumber"
                    {...form.register('billingStreetNumber')}
                    placeholder="123"
                    data-testid="input-billingStreetNumber"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div>
                  <Label htmlFor="billingCity">City</Label>
                  <Input
                    id="billingCity"
                    {...form.register('billingCity')}
                    placeholder="Prague"
                    data-testid="input-billingCity"
                  />
                </div>
                <div>
                  <Label htmlFor="billingZipCode">Postal Code</Label>
                  <Input
                    id="billingZipCode"
                    {...form.register('billingZipCode')}
                    placeholder="110 00"
                    data-testid="input-billingZipCode"
                  />
                </div>
                <div>
                  <Label htmlFor="billingCountry">Country</Label>
                  <Input
                    id="billingCountry"
                    {...form.register('billingCountry')}
                    placeholder="Czech Republic"
                    readOnly
                    className="bg-slate-50"
                    data-testid="input-billingCountry"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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
    </div>
  );
}
