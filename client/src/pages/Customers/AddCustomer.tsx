import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, X } from "lucide-react";

const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  facebookName: z.string().optional(),
  facebookUrl: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  company: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  type: z.enum(["regular", "vip", "wholesale"]).default("regular"),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface AddressSuggestion {
  formatted: string;
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

export default function AddCustomer() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [addressAutocomplete, setAddressAutocomplete] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);

  // We'll use real geocoding API instead of mock addresses
  const fetchRealAddresses = async (query: string): Promise<AddressSuggestion[]> => {
    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch addresses');
      }
      const data = await response.json();
      
      // Transform the response to match our AddressSuggestion interface
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



  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      facebookName: "",
      facebookUrl: "",
      email: "",
      phone: "",
      company: "",
      address: "",
      city: "",
      zipCode: "",
      country: "",
      type: "regular",
    },
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      return apiRequest('POST', '/api/customers', data);
    },
    onSuccess: (newCustomer) => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      toast({
        title: "Success",
        description: "Customer created successfully",
      });
      navigate('/customers');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create customer",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CustomerFormData) => {
    createCustomerMutation.mutate(data);
  };

  // Address search using real geocoding API
  const searchAddresses = async (query: string) => {
    if (query.length < 2) {
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

  const selectAddress = (suggestion: AddressSuggestion) => {
    form.setValue('address', suggestion.street || '');
    form.setValue('city', suggestion.city || '');
    form.setValue('zipCode', suggestion.zipCode || '');
    form.setValue('country', suggestion.country || '');
    
    setAddressAutocomplete(suggestion.formatted);
    setShowAddressDropdown(false);
    setAddressSuggestions([]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/customers')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold text-slate-900">Add New Customer</h1>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Customer Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="customerName">Customer Name *</Label>
                <Input
                  id="customerName"
                  {...form.register('name', {
                    onChange: (e) => {
                      // Also update Facebook Name when Customer Name changes
                      const currentFacebookName = form.getValues('facebookName');
                      if (!currentFacebookName || currentFacebookName === '') {
                        form.setValue('facebookName', e.target.value);
                      }
                    }
                  })}
                  placeholder="Type here"
                  required
                />
              </div>
              <div>
                <Label htmlFor="facebookName">Facebook Name</Label>
                <Input
                  id="facebookName"
                  {...form.register('facebookName')}
                  placeholder="Type here"
                />
              </div>
              <div>
                <Label htmlFor="facebookUrl">Facebook URL</Label>
                <Input
                  id="facebookUrl"
                  {...form.register('facebookUrl')}
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
                  {...form.register('email')}
                  placeholder="name@example.com"
                />
              </div>
              <div>
                <Label htmlFor="customerPhone">Phone</Label>
                <Input
                  id="customerPhone"
                  {...form.register('phone')}
                  placeholder="+1234567890"
                />
              </div>
              <div>
                <Label htmlFor="customerCompany">Company</Label>
                <Input
                  id="customerCompany"
                  {...form.register('company')}
                  placeholder="Company name"
                />
              </div>
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
                    if (addressAutocomplete.length >= 2) {
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
                            className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 transition-colors"
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
            <div className="space-y-4">
              <div>
                <Label htmlFor="shippingAddress">Shipping Address</Label>
                <Input
                  id="shippingAddress"
                  {...form.register('address')}
                  placeholder="Street address"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    {...form.register('city')}
                    placeholder="Type here"
                  />
                </div>
                <div>
                  <Label htmlFor="zipCode">ZIP Code</Label>
                  <Input
                    id="zipCode"
                    {...form.register('zipCode')}
                    placeholder="12345"
                  />
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    {...form.register('country')}
                    placeholder="Type here"
                  />
                </div>
              </div>
            </div>
            
            {/* Customer Type */}
            <div>
              <Label htmlFor="customerType">Customer Type</Label>
              <Select
                value={form.watch('type')}
                onValueChange={(value: any) => form.setValue('type', value)}
              >
                <SelectTrigger id="customerType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                  <SelectItem value="wholesale">Wholesale</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={() => navigate('/customers')}>
            Cancel
          </Button>
          <Button type="submit" disabled={createCustomerMutation.isPending}>
            {createCustomerMutation.isPending ? 'Creating...' : 'Create Customer'}
          </Button>
        </div>
      </form>
    </div>
  );
}