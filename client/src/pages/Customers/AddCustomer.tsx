import { useState, useEffect, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Plus, Trash2, Edit2, Check, X, Loader2, CheckCircle, XCircle } from "lucide-react";
import { europeanCountries, euCountryCodes } from "@/lib/countries";
import type { Customer, CustomerShippingAddress } from "@shared/schema";

const customerFormSchema = z.object({
  billingFirstName: z.string().min(1, "First name is required"),
  billingLastName: z.string().min(1, "Last name is required"),
  billingCompany: z.string().optional(),
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

export default function AddCustomer() {
  const [, navigate] = useLocation();
  const params = useParams();
  const customerId = params.id ? parseInt(params.id) : undefined;
  const isEditMode = !!customerId;
  const { toast } = useToast();

  const [billingAddressQuery, setBillingAddressQuery] = useState("");
  const [billingAddressSuggestions, setBillingAddressSuggestions] = useState<AddressAutocompleteResult[]>([]);
  const [showBillingDropdown, setShowBillingDropdown] = useState(false);
  const [isLoadingBillingAutocomplete, setIsLoadingBillingAutocomplete] = useState(false);

  const [isLoadingAres, setIsLoadingAres] = useState(false);
  const [isValidatingVat, setIsValidatingVat] = useState(false);
  const [vatValidationResult, setVatValidationResult] = useState<VatValidationResult | null>(null);

  const [shippingAddresses, setShippingAddresses] = useState<ShippingAddressFormData[]>([]);
  const [isAddingShipping, setIsAddingShipping] = useState(false);
  const [editingShippingIndex, setEditingShippingIndex] = useState<number | null>(null);
  const [shippingAddressQuery, setShippingAddressQuery] = useState("");
  const [shippingAddressSuggestions, setShippingAddressSuggestions] = useState<AddressAutocompleteResult[]>([]);
  const [showShippingDropdown, setShowShippingDropdown] = useState(false);
  const [isLoadingShippingAutocomplete, setIsLoadingShippingAutocomplete] = useState(false);

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
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
      country: "",
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

  const billingCountry = form.watch('billingCountry');
  const isCzech = billingCountry === 'CZ' || billingCountry === 'Czech Republic';
  const isEU = europeanCountries.some(c => c.name === billingCountry || c.code === billingCountry);

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
            <CardTitle>1. Identity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="billingFirstName">First Name *</Label>
                <Input
                  id="billingFirstName"
                  {...form.register('billingFirstName')}
                  placeholder="John"
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
                  placeholder="Doe"
                  data-testid="input-billingLastName"
                />
                {form.formState.errors.billingLastName && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.billingLastName.message}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="billingCompany">Company</Label>
                <Input
                  id="billingCompany"
                  {...form.register('billingCompany')}
                  placeholder="Company name"
                  data-testid="input-billingCompany"
                />
              </div>
              <div>
                <Label htmlFor="billingEmail">Email</Label>
                <Input
                  id="billingEmail"
                  type="email"
                  {...form.register('billingEmail')}
                  placeholder="name@example.com"
                  data-testid="input-billingEmail"
                />
              </div>
              <div>
                <Label htmlFor="billingTel">Tel</Label>
                <Input
                  id="billingTel"
                  {...form.register('billingTel')}
                  placeholder="+420 123 456 789"
                  data-testid="input-billingTel"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Billing Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="billingAddressAutocomplete">Search Address</Label>
              <div className="relative">
                <Input
                  id="billingAddressAutocomplete"
                  value={billingAddressQuery}
                  onChange={(e) => {
                    setBillingAddressQuery(e.target.value);
                    searchBillingAddress(e.target.value);
                  }}
                  placeholder="Start typing to search..."
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
                          className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="billingStreet">Street Address</Label>
                <Input
                  id="billingStreet"
                  {...form.register('billingStreet')}
                  placeholder="Main Street"
                  data-testid="input-billingStreet"
                />
              </div>
              <div>
                <Label htmlFor="billingStreetNumber">Street Number</Label>
                <Input
                  id="billingStreetNumber"
                  {...form.register('billingStreetNumber')}
                  placeholder="123"
                  data-testid="input-billingStreetNumber"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <Label htmlFor="billingZipCode">ZIP/Postal Code</Label>
                <Input
                  id="billingZipCode"
                  {...form.register('billingZipCode')}
                  placeholder="12000"
                  data-testid="input-billingZipCode"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="billingCountry">Country</Label>
                <Select
                  value={form.watch('billingCountry')}
                  onValueChange={(value) => form.setValue('billingCountry', value)}
                >
                  <SelectTrigger id="billingCountry" data-testid="select-billingCountry">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {europeanCountries.map((country) => (
                      <SelectItem key={country.code} value={country.code} data-testid={`select-country-${country.code}`}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="billingState">State/Region</Label>
                <Input
                  id="billingState"
                  {...form.register('billingState')}
                  placeholder="State or region"
                  data-testid="input-billingState"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>3. Shipping Addresses</CardTitle>
            {!isAddingShipping && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddShippingAddress}
                data-testid="button-addShippingAddress"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Shipping Address
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {shippingAddresses.length > 0 && !isAddingShipping && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {shippingAddresses.map((address, index) => (
                  <Card key={index} className="border-2" data-testid={`card-shippingAddress-${index}`}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold" data-testid={`text-shippingLabel-${index}`}>{address.label}</h4>
                          {address.isPrimary && (
                            <Badge variant="default" data-testid={`badge-primary-${index}`}>Primary</Badge>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditShippingAddress(index)}
                            data-testid={`button-editShipping-${index}`}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteShippingAddress(index)}
                            data-testid={`button-deleteShipping-${index}`}
                          >
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-sm text-slate-600 space-y-1">
                        <p>{address.firstName} {address.lastName}</p>
                        {address.company && <p>{address.company}</p>}
                        <p>{address.street} {address.streetNumber}</p>
                        <p>{address.city} {address.zipCode}</p>
                        <p>{address.country}</p>
                      </div>
                      {!address.isPrimary && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2 w-full"
                          onClick={() => handleSetPrimary(index)}
                          data-testid={`button-setPrimary-${index}`}
                        >
                          Set as Primary
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {isAddingShipping && (
              <div className="space-y-4 border-2 border-dashed p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">
                    {editingShippingIndex !== null ? 'Edit Shipping Address' : 'New Shipping Address'}
                  </h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsAddingShipping(false);
                      setEditingShippingIndex(null);
                      shippingForm.reset();
                    }}
                    data-testid="button-cancelShipping"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div>
                  <Label htmlFor="shippingLabel">Label *</Label>
                  <Input
                    id="shippingLabel"
                    {...shippingForm.register('label')}
                    placeholder="Home, Office, etc."
                    data-testid="input-shippingLabel"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="shippingFirstName">First Name *</Label>
                    <Input
                      id="shippingFirstName"
                      {...shippingForm.register('firstName')}
                      placeholder="John"
                      data-testid="input-shippingFirstName"
                    />
                  </div>
                  <div>
                    <Label htmlFor="shippingLastName">Last Name *</Label>
                    <Input
                      id="shippingLastName"
                      {...shippingForm.register('lastName')}
                      placeholder="Doe"
                      data-testid="input-shippingLastName"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="shippingCompany">Company</Label>
                    <Input
                      id="shippingCompany"
                      {...shippingForm.register('company')}
                      placeholder="Company name"
                      data-testid="input-shippingCompany"
                    />
                  </div>
                  <div>
                    <Label htmlFor="shippingEmail">Email</Label>
                    <Input
                      id="shippingEmail"
                      type="email"
                      {...shippingForm.register('email')}
                      placeholder="name@example.com"
                      data-testid="input-shippingEmail"
                    />
                  </div>
                  <div>
                    <Label htmlFor="shippingTel">Tel</Label>
                    <Input
                      id="shippingTel"
                      {...shippingForm.register('tel')}
                      placeholder="+420 123 456 789"
                      data-testid="input-shippingTel"
                    />
                  </div>
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
                              className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
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
                    <Label htmlFor="shippingStreet">Street Address</Label>
                    <Input
                      id="shippingStreet"
                      {...shippingForm.register('street')}
                      placeholder="Main Street"
                      data-testid="input-shippingStreet"
                    />
                  </div>
                  <div>
                    <Label htmlFor="shippingStreetNumber">Street Number</Label>
                    <Input
                      id="shippingStreetNumber"
                      {...shippingForm.register('streetNumber')}
                      placeholder="123"
                      data-testid="input-shippingStreetNumber"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="shippingCity">City</Label>
                    <Input
                      id="shippingCity"
                      {...shippingForm.register('city')}
                      placeholder="Prague"
                      data-testid="input-shippingCity"
                    />
                  </div>
                  <div>
                    <Label htmlFor="shippingZipCode">ZIP/Postal Code</Label>
                    <Input
                      id="shippingZipCode"
                      {...shippingForm.register('zipCode')}
                      placeholder="12000"
                      data-testid="input-shippingZipCode"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="shippingCountry">Country</Label>
                    <Select
                      value={shippingForm.watch('country')}
                      onValueChange={(value) => shippingForm.setValue('country', value)}
                    >
                      <SelectTrigger id="shippingCountry" data-testid="select-shippingCountry">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {europeanCountries.map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            {country.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="shippingState">State/Region</Label>
                    <Input
                      id="shippingState"
                      {...shippingForm.register('state')}
                      placeholder="State or region"
                      data-testid="input-shippingState"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="shippingIsPrimary"
                    {...shippingForm.register('isPrimary')}
                    className="h-4 w-4"
                    data-testid="checkbox-shippingIsPrimary"
                  />
                  <Label htmlFor="shippingIsPrimary" className="cursor-pointer">Set as Primary Address</Label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAddingShipping(false);
                      setEditingShippingIndex(null);
                      shippingForm.reset();
                    }}
                    data-testid="button-cancelShippingForm"
                  >
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
            )}

            {shippingAddresses.length === 0 && !isAddingShipping && (
              <p className="text-center text-slate-500 py-8">No shipping addresses added yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>4. Tax Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isCzech && (
              <div className="space-y-4 pb-4 border-b">
                <h4 className="font-semibold text-sm">Czech Company Information</h4>
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
                  </div>
                </div>
              </div>
            )}

            {isEU && (
              <div className="space-y-4">
                <h4 className="font-semibold text-sm">VAT Information</h4>
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
                          const country = form.getValues('billingCountry');
                          if (vatNumber && country) {
                            handleVatValidation(vatNumber, country);
                          }
                        }}
                        data-testid="input-vatNumber"
                      />
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

            {!isCzech && !isEU && (
              <p className="text-center text-slate-500 py-4">
                Select a billing country to see tax information fields
              </p>
            )}
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
