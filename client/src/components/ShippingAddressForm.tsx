import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

interface ShippingAddressFormProps {
  onSave: (address: {
    firstName: string;
    lastName: string;
    company?: string;
    email?: string;
    street: string;
    streetNumber?: string;
    city: string;
    zipCode: string;
    country: string;
    tel?: string;
    label?: string;
  }) => void;
  onCancel: () => void;
  initialData?: {
    firstName?: string;
    lastName?: string;
    company?: string;
    email?: string;
    street?: string;
    streetNumber?: string;
    city?: string;
    zipCode?: string;
    country?: string;
    tel?: string;
    label?: string;
  };
  isSaving?: boolean;
  title?: string;
}

export function ShippingAddressForm({
  onSave,
  onCancel,
  initialData,
  isSaving = false,
  title = "New Shipping Address"
}: ShippingAddressFormProps) {
  const [shippingAddressSearch, setShippingAddressSearch] = useState("");
  const [shippingAddressSuggestions, setShippingAddressSuggestions] = useState<any[]>([]);
  const [showShippingAddressDropdown, setShowShippingAddressDropdown] = useState(false);
  const [isLoadingShippingSearch, setIsLoadingShippingSearch] = useState(false);
  const [labelManuallyEdited, setLabelManuallyEdited] = useState(false);
  const [addressLabelValue, setAddressLabelValue] = useState(initialData?.label || "");

  // Search shipping addresses
  const searchShippingAddresses = async (query: string) => {
    if (query.length < 3) {
      setShippingAddressSuggestions([]);
      setShowShippingAddressDropdown(false);
      return;
    }

    setIsLoadingShippingSearch(true);
    setShowShippingAddressDropdown(true);

    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch addresses');
      }
      const data = await response.json();

      const suggestions = data.map((item: any) => ({
        formatted: item.formatted,
        street: `${item.street} ${item.houseNumber}`.trim() || item.street,
        streetNumber: item.houseNumber,
        city: item.city,
        state: item.state,
        zipCode: item.zipCode,
        country: item.country,
      }));

      setShippingAddressSuggestions(suggestions);
    } catch (error) {
      console.error('Error searching addresses:', error);
      setShippingAddressSuggestions([]);
    } finally {
      setIsLoadingShippingSearch(false);
    }
  };

  // Select shipping address from autocomplete
  const selectShippingAddress = (suggestion: any) => {
    const streetInput = document.getElementById('addressStreet') as HTMLInputElement;
    const streetNumberInput = document.getElementById('addressStreetNumber') as HTMLInputElement;
    const cityInput = document.getElementById('addressCity') as HTMLInputElement;
    const zipCodeInput = document.getElementById('addressZipCode') as HTMLInputElement;
    const countryInput = document.getElementById('addressCountry') as HTMLInputElement;
    const firstNameInput = document.getElementById('firstName') as HTMLInputElement;
    const lastNameInput = document.getElementById('lastName') as HTMLInputElement;

    if (streetInput) streetInput.value = suggestion.street;
    if (streetNumberInput) streetNumberInput.value = suggestion.streetNumber;
    if (cityInput) cityInput.value = suggestion.city;
    if (zipCodeInput) zipCodeInput.value = suggestion.zipCode;
    if (countryInput) countryInput.value = suggestion.country;

    // Auto-generate label if not manually edited
    if (!labelManuallyEdited) {
      const firstName = firstNameInput?.value || '';
      const lastName = lastNameInput?.value || '';
      const company = (document.getElementById('addressCompany') as HTMLInputElement)?.value || '';
      const city = suggestion.city;
      
      let label = '';
      if (firstName || lastName) {
        label = `${firstName} ${lastName}`.trim();
      }
      if (company) {
        label = label ? `${label} - ${company}` : company;
      }
      if (city) {
        label = label ? `${label} (${city})` : city;
      }
      
      setAddressLabelValue(label);
    }

    setShippingAddressSearch(suggestion.formatted);
    setShowShippingAddressDropdown(false);
    setShippingAddressSuggestions([]);
  };

  const handleSave = () => {
    const firstName = (document.getElementById('firstName') as HTMLInputElement)?.value;
    const lastName = (document.getElementById('lastName') as HTMLInputElement)?.value;
    const company = (document.getElementById('addressCompany') as HTMLInputElement)?.value;
    const email = (document.getElementById('addressEmail') as HTMLInputElement)?.value;
    const street = (document.getElementById('addressStreet') as HTMLInputElement)?.value;
    const streetNumber = (document.getElementById('addressStreetNumber') as HTMLInputElement)?.value;
    const city = (document.getElementById('addressCity') as HTMLInputElement)?.value;
    const zipCode = (document.getElementById('addressZipCode') as HTMLInputElement)?.value;
    const country = (document.getElementById('addressCountry') as HTMLInputElement)?.value;
    const tel = (document.getElementById('addressTel') as HTMLInputElement)?.value;

    if (!firstName || !lastName || !street || !city || !zipCode || !country) {
      return; // Parent should handle validation/toasts
    }

    onSave({
      firstName,
      lastName,
      company: company || undefined,
      email: email || undefined,
      street,
      streetNumber: streetNumber || undefined,
      city,
      zipCode,
      country,
      tel: tel || undefined,
      label: addressLabelValue || undefined,
    });
  };

  const generateLabel = (fieldName: string, value: string) => {
    if (labelManuallyEdited) return;

    const firstName = fieldName === 'firstName' ? value : (document.getElementById('firstName') as HTMLInputElement)?.value || '';
    const lastName = fieldName === 'lastName' ? value : (document.getElementById('lastName') as HTMLInputElement)?.value || '';
    const company = fieldName === 'company' ? value : (document.getElementById('addressCompany') as HTMLInputElement)?.value || '';
    const city = fieldName === 'city' ? value : (document.getElementById('addressCity') as HTMLInputElement)?.value || '';
    
    let label = '';
    if (firstName || lastName) {
      label = `${firstName} ${lastName}`.trim();
    }
    if (company) {
      label = label ? `${label} - ${company}` : company;
    }
    if (city) {
      label = label ? `${label} (${city})` : city;
    }
    
    setAddressLabelValue(label);
  };

  return (
    <div className="space-y-4 border border-blue-200 bg-blue-50 p-4 rounded-lg" data-testid="form-new-address">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-blue-900">{title}</h4>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          data-testid="button-cancel-address"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            placeholder="John"
            defaultValue={initialData?.firstName}
            data-testid="input-first-name"
            onChange={(e) => generateLabel('firstName', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            placeholder="Doe"
            defaultValue={initialData?.lastName}
            data-testid="input-last-name"
            onChange={(e) => generateLabel('lastName', e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="addressCompany">Company</Label>
        <Input
          id="addressCompany"
          placeholder="Optional"
          defaultValue={initialData?.company}
          data-testid="input-company"
          onChange={(e) => generateLabel('company', e.target.value)}
        />
      </div>

      {/* Search Address - Dynamic with autocomplete */}
      <div className="space-y-2">
        <Label htmlFor="searchAddress">Search Address</Label>
        <div className="relative">
          <Input
            id="searchAddress"
            value={shippingAddressSearch}
            onChange={(e) => {
              const value = e.target.value;
              setShippingAddressSearch(value);
              searchShippingAddresses(value);
            }}
            onFocus={() => {
              if (shippingAddressSearch.length >= 3) {
                searchShippingAddresses(shippingAddressSearch);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setShowShippingAddressDropdown(false);
              }
            }}
            placeholder="Start typing an address..."
            data-testid="input-search-address"
            className="pr-10"
          />
          {shippingAddressSearch && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1 h-8 w-8 p-0"
              onClick={() => {
                setShippingAddressSearch("");
                setShippingAddressSuggestions([]);
                setShowShippingAddressDropdown(false);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}

          {/* Address suggestions dropdown */}
          {showShippingAddressDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 border rounded-md shadow-lg bg-white max-h-72 overflow-y-auto z-50">
              {isLoadingShippingSearch ? (
                <div className="p-4 text-center text-slate-500">
                  <div className="text-sm">Searching addresses...</div>
                </div>
              ) : shippingAddressSuggestions.length > 0 ? (
                <>
                  <div className="p-2 bg-slate-50 border-b text-xs text-slate-600">
                    {shippingAddressSuggestions.length} address{shippingAddressSuggestions.length !== 1 ? 'es' : ''} found
                  </div>
                  {shippingAddressSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 transition-colors"
                      onClick={() => selectShippingAddress(suggestion)}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="addressStreet">Street *</Label>
          <Input
            id="addressStreet"
            placeholder="Main Street"
            defaultValue={initialData?.street}
            data-testid="input-street"
          />
        </div>
        <div>
          <Label htmlFor="addressStreetNumber">Street Number</Label>
          <Input
            id="addressStreetNumber"
            placeholder="123A"
            defaultValue={initialData?.streetNumber}
            data-testid="input-street-number"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="addressCity">City *</Label>
          <Input
            id="addressCity"
            placeholder="Prague"
            defaultValue={initialData?.city}
            data-testid="input-city"
            onChange={(e) => generateLabel('city', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="addressZipCode">Zip Code *</Label>
          <Input
            id="addressZipCode"
            placeholder="110 00"
            defaultValue={initialData?.zipCode}
            data-testid="input-zip-code"
          />
        </div>
        <div>
          <Label htmlFor="addressCountry">Country *</Label>
          <Input
            id="addressCountry"
            placeholder="Czechia"
            defaultValue={initialData?.country}
            data-testid="input-country"
          />
        </div>
      </div>

      {/* Email and Phone */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="addressEmail">Email</Label>
          <Input
            id="addressEmail"
            type="email"
            placeholder="Optional"
            defaultValue={initialData?.email}
            data-testid="input-email"
          />
        </div>
        <div>
          <Label htmlFor="addressTel">Phone</Label>
          <Input
            id="addressTel"
            placeholder="Optional"
            defaultValue={initialData?.tel}
            data-testid="input-tel"
          />
        </div>
      </div>

      {/* Label/Name - Moved to bottom, editable but locks when manually changed */}
      <div>
        <Label htmlFor="addressLabel">Label / Name</Label>
        <Input
          id="addressLabel"
          value={addressLabelValue}
          placeholder="Auto-generated from name and company"
          data-testid="input-label"
          className={labelManuallyEdited ? "bg-white" : "bg-slate-50"}
          onChange={(e) => {
            setAddressLabelValue(e.target.value);
            setLabelManuallyEdited(true);
          }}
        />
        <p className="text-xs text-slate-500 mt-1">
          {labelManuallyEdited ? "🔒 Manually edited - auto-generation disabled" : "Auto-generated from name, company, and city"}
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          data-testid="button-save-address"
        >
          {isSaving ? "Saving..." : "Save Address"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          data-testid="button-cancel-new-address"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
