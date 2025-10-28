import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Plus,
  X,
  Check,
  Edit2,
  Trash2,
  Copy,
  Loader2,
  Truck,
} from 'lucide-react';

const shippingAddressSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1, "Label is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  company: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  tel: z.string().optional(),
  street: z.string().min(1, "Street is required"),
  streetNumber: z.string().optional(),
  city: z.string().min(1, "City is required"),
  zipCode: z.string().min(1, "Zip code is required"),
  country: z.string().min(1, "Country is required"),
  isPrimary: z.boolean().optional(),
});

type ShippingAddress = z.infer<typeof shippingAddressSchema>;

interface ShippingAddressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (address: ShippingAddress) => void;
  editingAddress?: ShippingAddress | null;
  existingAddresses?: ShippingAddress[];
  title?: string;
  description?: string;
}

const europeanCountries = [
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'DE', name: 'Germany' },
  { code: 'AT', name: 'Austria' },
  { code: 'PL', name: 'Poland' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'HU', name: 'Hungary' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'GB', name: 'United Kingdom' },
];

const getCountryFlag = (countryCode: string): string => {
  const codeMap: { [key: string]: string } = {
    'Czech Republic': 'CZ',
    'Germany': 'DE',
    'Austria': 'AT',
    'Poland': 'PL',
    'Slovakia': 'SK',
    'Hungary': 'HU',
    'France': 'FR',
    'Italy': 'IT',
    'Spain': 'ES',
    'Netherlands': 'NL',
    'Belgium': 'BE',
    'United Kingdom': 'GB',
    'USA': 'US',
    'Canada': 'CA',
  };
  
  const code = codeMap[countryCode] || countryCode;
  const codePoints = code
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

export function ShippingAddressModal({
  open,
  onOpenChange,
  onSave,
  editingAddress,
  existingAddresses = [],
  title = 'Add Shipping Address',
  description = 'Enter the shipping address details below',
}: ShippingAddressModalProps) {
  const { toast } = useToast();
  const [rawAddress, setRawAddress] = useState('');
  const [isLabelManuallyEdited, setIsLabelManuallyEdited] = useState(false);
  const [countryQuery, setCountryQuery] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [fieldConfidence, setFieldConfidence] = useState<Record<string, number>>({});

  const form = useForm<ShippingAddress>({
    resolver: zodResolver(shippingAddressSchema),
    defaultValues: editingAddress || {
      id: undefined,
      label: '',
      firstName: '',
      lastName: '',
      company: '',
      email: '',
      tel: '',
      street: '',
      streetNumber: '',
      city: '',
      zipCode: '',
      country: '',
      isPrimary: existingAddresses.length === 0,
    },
  });

  // Auto-generate label from address fields
  useEffect(() => {
    if (!isLabelManuallyEdited) {
      const subscription = form.watch((value, { name }) => {
        // Don't react to label changes to avoid infinite loops
        if (name === 'label') return;
        
        const parts = [];
        
        if (value.company) {
          parts.push(value.company);
        } else if (value.firstName || value.lastName) {
          parts.push([value.firstName, value.lastName].filter(Boolean).join(' '));
        }
        
        if (value.street || value.streetNumber) {
          parts.push([value.street, value.streetNumber].filter(Boolean).join(' '));
        }
        
        if (value.city) {
          parts.push(value.city);
        }
        
        const autoLabel = parts.filter(Boolean).join(', ');
        if (autoLabel && autoLabel !== value.label) {
          form.setValue('label', autoLabel, { shouldValidate: false });
        }
      });
      return () => subscription.unsubscribe();
    }
  }, [form, isLabelManuallyEdited]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      if (editingAddress) {
        form.reset(editingAddress);
        setIsLabelManuallyEdited(true);
      } else {
        form.reset({
          id: undefined,
          label: '',
          firstName: '',
          lastName: '',
          company: '',
          email: '',
          tel: '',
          street: '',
          streetNumber: '',
          city: '',
          zipCode: '',
          country: '',
          isPrimary: existingAddresses.length === 0,
        });
        setIsLabelManuallyEdited(false);
      }
      setRawAddress('');
      setFieldConfidence({});
    }
  }, [open, editingAddress, existingAddresses.length, form]);

  const parseAddressMutation = useMutation({
    mutationFn: async (rawText: string) => {
      const response = await apiRequest('POST', '/api/addresses/parse', { rawAddress: rawText });
      const jsonData = await response.json();
      console.log('Parse response:', jsonData);
      return jsonData;
    },
    onSuccess: (data: any) => {
      console.log('onSuccess called with data:', data);
      if (data?.fields) {
        // Map overall confidence level to field-level confidence values
        const confidenceValue = data.confidence === 'high' ? 0.9 : data.confidence === 'medium' ? 0.6 : 0.3;
        const newFieldConfidence: Record<string, number> = {};
        
        // Map API field names to form field names
        const fieldMapping: Record<string, string> = {
          'phone': 'tel', // API returns 'phone', form uses 'tel'
        };
        
        // Build new form values, preserving existing values not in parsed data
        const currentValues = form.getValues();
        const updatedValues = { ...currentValues };
        
        // Process name fields with Vietnamese naming convention
        // Vietnamese names: [Family Name] [Middle Name(s)] [Given Name]
        // Last Name field = only the family name (first word)
        // First Name field = everything else (middle + given names)
        let processedFirstName = data.fields.firstName;
        let processedLastName = data.fields.lastName;
        
        if (data.fields.firstName || data.fields.lastName) {
          // Combine all name parts
          const allNameParts = [
            data.fields.lastName || '',
            data.fields.firstName || ''
          ].filter(Boolean).join(' ').trim();
          
          const nameParts = allNameParts.split(/\s+/).filter(Boolean);
          
          if (nameParts.length > 1) {
            // First word is the family name (Last Name)
            processedLastName = nameParts[0];
            // Rest is the given name + middle names (First Name)
            processedFirstName = nameParts.slice(1).join(' ');
          } else if (nameParts.length === 1) {
            // Only one word - keep original values to avoid breaking validation
            // Use the single word as-is without processing
            processedFirstName = data.fields.firstName || nameParts[0];
            processedLastName = data.fields.lastName || nameParts[0];
          }
        }
        
        Object.entries(data.fields).forEach(([key, value]) => {
          // Skip id and label fields, don't set empty values
          if (value && key !== 'label' && key !== 'id' && value !== null && value !== '') {
            let processedValue = value;
            
            // Apply name processing
            if (key === 'firstName') {
              processedValue = processedFirstName;
            } else if (key === 'lastName') {
              processedValue = processedLastName;
            }
            
            // Map the field name if needed
            const formFieldName = fieldMapping[key] || key;
            console.log(`Setting field ${formFieldName} to:`, processedValue);
            (updatedValues as any)[formFieldName] = processedValue;
            newFieldConfidence[formFieldName] = confidenceValue;
          }
        });
        
        // Reset form with new values to force re-render
        form.reset(updatedValues, { keepDefaultValues: false });
        
        setFieldConfidence(newFieldConfidence);
        setRawAddress('');
        toast({
          title: "Address Parsed",
          description: `Filled with ${data.confidence || 'medium'} confidence`,
        });
      }
    },
    onError: (error: any) => {
      console.error('Failed to parse address:', error);
      toast({
        variant: "destructive",
        title: "Parse Failed",
        description: error?.message || "Could not parse the address. Please check the format and try again.",
      });
    },
  });

  const getConfidenceClass = (field: string, confidence: Record<string, number>) => {
    const level = confidence[field];
    if (level >= 0.8) return 'border-green-500 focus:border-green-500';
    if (level >= 0.5) return 'border-yellow-500 focus:border-yellow-500';
    if (level > 0) return 'border-red-500 focus:border-red-500';
    return '';
  };

  const handleSubmit = (data: ShippingAddress) => {
    // When creating a new address (not editing), remove the id field
    // to prevent duplicate key errors
    const addressData = { ...data };
    if (!editingAddress) {
      delete addressData.id;
    }
    onSave(addressData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-blue-500" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Label Field */}
          <div>
            <Label htmlFor="label">Label</Label>
            <Input
              id="label"
              {...form.register('label', {
                onChange: () => setIsLabelManuallyEdited(true)
              })}
              placeholder="Auto-generated from address fields (editable)"
              data-testid="input-shipping-label"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Auto-generated from address fields (editable)
            </p>
          </div>

          {/* Smart Paste Section */}
          <div className="space-y-2">
            <Label>Smart Paste</Label>
            <p className="text-sm text-muted-foreground">
              Paste any address info (name, company, email, phone, address) - auto-detects Vietnamese names, converts to English letters, and validates addresses
            </p>
            <Textarea
              value={rawAddress}
              onChange={(e) => setRawAddress(e.target.value)}
              placeholder="e.g., John Doe, ABC Company, john@example.com, +420123456789, Main Street 123, Prague 110 00, Czech Republic"
              className="min-h-[100px]"
              data-testid="textarea-raw-address"
            />
            <Button
              type="button"
              onClick={() => parseAddressMutation.mutate(rawAddress)}
              disabled={!rawAddress.trim() || parseAddressMutation.isPending}
              className="w-full"
              data-testid="button-parse-address"
            >
              {parseAddressMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Parsing...
                </>
              ) : (
                'Parse & Fill'
              )}
            </Button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t-2 border-slate-300" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-500 font-semibold">Address Details</span>
            </div>
          </div>

          {/* Name Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                {...form.register('firstName')}
                placeholder="First name"
                className={cn(getConfidenceClass('firstName', fieldConfidence))}
                data-testid="input-first-name"
              />
              {form.formState.errors.firstName && (
                <p className="text-xs text-red-500 mt-1">{form.formState.errors.firstName.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                {...form.register('lastName')}
                placeholder="Last name"
                className={cn(getConfidenceClass('lastName', fieldConfidence))}
                data-testid="input-last-name"
              />
              {form.formState.errors.lastName && (
                <p className="text-xs text-red-500 mt-1">{form.formState.errors.lastName.message}</p>
              )}
            </div>
          </div>

          {/* Company Field */}
          <div>
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              {...form.register('company')}
              placeholder="Company name"
              className={cn(getConfidenceClass('company', fieldConfidence))}
              data-testid="input-company"
            />
          </div>

          <Separator className="my-6" />

          {/* Contact Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...form.register('email')}
                placeholder="email@example.com"
                className={cn(getConfidenceClass('email', fieldConfidence))}
                data-testid="input-email"
              />
            </div>
            <div>
              <Label htmlFor="tel">Phone</Label>
              <Input
                id="tel"
                {...form.register('tel')}
                placeholder="+420 123 456 789"
                className={cn(getConfidenceClass('tel', fieldConfidence))}
                data-testid="input-phone"
              />
            </div>
          </div>

          <Separator className="my-6" />

          {/* Address Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="street">Street</Label>
              <Input
                id="street"
                {...form.register('street')}
                placeholder="Street name"
                className={cn(getConfidenceClass('street', fieldConfidence))}
                data-testid="input-street"
              />
            </div>
            <div>
              <Label htmlFor="streetNumber">Number</Label>
              <Input
                id="streetNumber"
                {...form.register('streetNumber')}
                placeholder="123"
                className={cn(getConfidenceClass('streetNumber', fieldConfidence))}
                data-testid="input-street-number"
              />
            </div>
          </div>

          {/* European Layout: Postal Code, City, Country */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="zipCode">Postal Code</Label>
              <Input
                id="zipCode"
                {...form.register('zipCode')}
                placeholder="110 00"
                className={cn(getConfidenceClass('zipCode', fieldConfidence))}
                data-testid="input-postal-code"
              />
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                {...form.register('city')}
                placeholder="Prague"
                className={cn(getConfidenceClass('city', fieldConfidence))}
                data-testid="input-city"
              />
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <div className="relative">
                <Input
                  id="country"
                  value={countryQuery || form.watch('country') || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCountryQuery(value);
                    setShowCountryDropdown(true);
                    if (!value) {
                      form.setValue('country', '');
                    }
                  }}
                  onFocus={() => setShowCountryDropdown(true)}
                  placeholder="Type to search countries..."
                  className={cn(getConfidenceClass('country', fieldConfidence))}
                  data-testid="input-country"
                />
                {(countryQuery || form.watch('country')) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-8 w-8 p-0"
                    onClick={() => {
                      setCountryQuery("");
                      form.setValue('country', '');
                      setShowCountryDropdown(false);
                    }}
                    data-testid="button-clear-country"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                {showCountryDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 border rounded-md shadow-lg bg-white max-h-64 overflow-y-auto z-50">
                    {europeanCountries
                      .filter(country => 
                        country.name.toLowerCase().includes((countryQuery || '').toLowerCase())
                      )
                      .map((country) => (
                        <div
                          key={country.code}
                          className="p-3 hover:bg-slate-100 cursor-pointer border-b last:border-b-0 transition-colors flex items-center gap-2"
                          onClick={() => {
                            form.setValue('country', country.name);
                            setCountryQuery('');
                            setShowCountryDropdown(false);
                          }}
                          data-testid={`button-country-${country.code}`}
                        >
                          <span className="text-xl">{getCountryFlag(country.code)}</span>
                          <span>{country.name}</span>
                        </div>
                      ))}
                    {europeanCountries.filter(country => 
                      country.name.toLowerCase().includes((countryQuery || '').toLowerCase())
                    ).length === 0 && (
                      <div className="p-4 text-center text-slate-500">No countries found</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Primary Address Checkbox */}
          {existingAddresses.length > 0 && (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isPrimary"
                {...form.register('isPrimary')}
                className="rounded border-gray-300"
              />
              <Label htmlFor="isPrimary">Set as primary address</Label>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button type="submit" data-testid="button-save">
              <Check className="h-4 w-4 mr-2" />
              Save Address
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}