import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Save, Globe, Building, Receipt, Plus, Edit2, Trash2, MapPin, Star, Truck } from "lucide-react";
import { ShippingAddressModal } from "@/components/ShippingAddressModal";
import { Badge } from "@/components/ui/badge";
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

const editCustomerSchema = z.object({
  name: z.string().min(1, "Customer name is required"),
  country: z.string().optional().nullable(),
  
  // Facebook & Profile fields
  facebookName: z.string().optional().nullable(),
  facebookUrl: z.string().optional().nullable(),
  facebookId: z.string().optional().nullable(),
  profilePictureUrl: z.string().optional().nullable(),
  
  // Contact fields
  email: z.string().email().optional().or(z.literal("")).nullable(),
  phone: z.string().optional().nullable(),
  
  // Shipping Address fields (legacy)
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zipCode: z.string().optional().nullable(),
  
  // Customer type and notes
  type: z.string(),
  notes: z.string().optional().nullable(),
  
  // Billing address fields
  billingCompany: z.string().optional().nullable(),
  billingFirstName: z.string().optional().nullable(),
  billingLastName: z.string().optional().nullable(),
  billingEmail: z.string().email().optional().or(z.literal("")).nullable(),
  billingTel: z.string().optional().nullable(),
  billingStreet: z.string().optional().nullable(),
  billingStreetNumber: z.string().optional().nullable(),
  billingCity: z.string().optional().nullable(),
  billingZipCode: z.string().optional().nullable(),
  billingCountry: z.string().optional().nullable(),
  billingState: z.string().optional().nullable(),
  
  // Tax/VAT information
  ico: z.string().optional().nullable(),
  dic: z.string().optional().nullable(),
  vatNumber: z.string().optional().nullable(),
  vatValid: z.boolean().optional().nullable(),
  vatCompanyName: z.string().optional().nullable(),
  vatCompanyAddress: z.string().optional().nullable(),
  taxId: z.string().optional().nullable(),
  vatId: z.string().optional().nullable(),
  
  // Preferences
  preferredLanguage: z.string().optional().nullable(),
  preferredCurrency: z.enum(['CZK', 'EUR']).default('EUR'),
});

type EditCustomerForm = z.infer<typeof editCustomerSchema>;

export default function EditCustomer() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Shipping address state management
  const [shippingAddresses, setShippingAddresses] = useState<any[]>([]);
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any>(null);
  const [addressToDelete, setAddressToDelete] = useState<any>(null);

  const { data: customer, isLoading } = useQuery<any>({
    queryKey: [`/api/customers/${id}`],
    enabled: !!id,
  });

  // Fetch customer shipping addresses
  const { data: addressesData } = useQuery<any>({
    queryKey: [`/api/customers/${id}/shipping-addresses`],
    enabled: !!id,
  });

  useEffect(() => {
    if (addressesData) {
      setShippingAddresses(addressesData);
    }
  }, [addressesData]);

  const form = useForm<EditCustomerForm>({
    resolver: zodResolver(editCustomerSchema),
    defaultValues: {
      name: "",
      country: "",
      facebookName: "",
      facebookUrl: "",
      facebookId: "",
      profilePictureUrl: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      type: "regular",
      notes: "",
      billingCompany: "",
      billingFirstName: "",
      billingLastName: "",
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
      taxId: "",
      vatId: "",
      preferredLanguage: "cs",
      preferredCurrency: "EUR",
    },
  });

  useEffect(() => {
    if (customer) {
      form.reset({
        name: customer.name || "",
        country: customer.country || "",
        facebookName: customer.facebookName || "",
        facebookUrl: customer.facebookUrl || "",
        facebookId: customer.facebookId || "",
        profilePictureUrl: customer.profilePictureUrl || "",
        email: customer.email || "",
        phone: customer.phone || "",
        address: customer.address || "",
        city: customer.city || "",
        state: customer.state || "",
        zipCode: customer.zipCode || "",
        type: customer.type || "regular",
        notes: customer.notes || "",
        billingCompany: customer.billingCompany || "",
        billingFirstName: customer.billingFirstName || "",
        billingLastName: customer.billingLastName || "",
        billingEmail: customer.billingEmail || "",
        billingTel: customer.billingTel || "",
        billingStreet: customer.billingStreet || "",
        billingStreetNumber: customer.billingStreetNumber || "",
        billingCity: customer.billingCity || "",
        billingZipCode: customer.billingZipCode || "",
        billingCountry: customer.billingCountry || "",
        billingState: customer.billingState || "",
        ico: customer.ico || "",
        dic: customer.dic || "",
        vatNumber: customer.vatNumber || "",
        vatValid: customer.vatValid || false,
        vatCompanyName: customer.vatCompanyName || "",
        vatCompanyAddress: customer.vatCompanyAddress || "",
        taxId: customer.taxId || "",
        vatId: customer.vatId || "",
        preferredLanguage: customer.preferredLanguage || "cs",
        preferredCurrency: customer.preferredCurrency || "EUR",
      });
    }
  }, [customer, form]);

  const updateCustomerMutation = useMutation({
    mutationFn: async (data: EditCustomerForm) => {
      const cleanedData = Object.entries(data).reduce((acc, [key, value]) => {
        acc[key] = value === "" || value === undefined ? null : value;
        return acc;
      }, {} as any);
      
      return apiRequest('PATCH', `/api/customers/${id}`, cleanedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      queryClient.invalidateQueries({ queryKey: [`/api/customers/${id}`] });
      toast({
        title: "Success",
        description: "Customer updated successfully",
      });
      navigate("/customers");
    },
    onError: (error: any) => {
      console.error("Customer update error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update customer",
        variant: "destructive",
      });
    },
  });

  // Shipping address mutations
  const createShippingAddressMutation = useMutation({
    mutationFn: async (address: any) => {
      return apiRequest('POST', `/api/customers/${id}/shipping-addresses`, address);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/customers/${id}/shipping-addresses`] });
      toast({
        title: "Success",
        description: "Shipping address added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add shipping address",
        variant: "destructive",
      });
    },
  });

  const updateShippingAddressMutation = useMutation({
    mutationFn: async ({ addressId, data }: { addressId: string; data: any }) => {
      return apiRequest('PATCH', `/api/customers/${id}/shipping-addresses/${addressId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/customers/${id}/shipping-addresses`] });
      toast({
        title: "Success",
        description: "Shipping address updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update shipping address",
        variant: "destructive",
      });
    },
  });

  const deleteShippingAddressMutation = useMutation({
    mutationFn: async (addressId: string) => {
      return apiRequest('DELETE', `/api/customers/${id}/shipping-addresses/${addressId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/customers/${id}/shipping-addresses`] });
      toast({
        title: "Success",
        description: "Shipping address deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete shipping address",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditCustomerForm) => {
    updateCustomerMutation.mutate(data);
  };

  // Shipping address handlers
  const handleAddShippingAddress = () => {
    setEditingAddress(null);
    setShowShippingModal(true);
  };

  const handleEditShippingAddress = (address: any) => {
    setEditingAddress(address);
    setShowShippingModal(true);
  };

  const handleSaveShippingAddress = (address: any) => {
    if (editingAddress) {
      updateShippingAddressMutation.mutate({
        addressId: editingAddress.id,
        data: address,
      });
    } else {
      createShippingAddressMutation.mutate(address);
    }
    setShowShippingModal(false);
    setEditingAddress(null);
  };

  const handleDeleteShippingAddress = (addressId: string) => {
    deleteShippingAddressMutation.mutate(addressId);
    setAddressToDelete(null);
  };

  const handleSetPrimaryAddress = (addressId: string) => {
    // Update all addresses to set the selected one as primary
    const updatedAddresses = shippingAddresses.map(addr => ({
      ...addr,
      isPrimary: addr.id === addressId,
    }));
    
    // Update each address on the server
    updatedAddresses.forEach(addr => {
      updateShippingAddressMutation.mutate({
        addressId: addr.id,
        data: { isPrimary: addr.isPrimary },
      });
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600">Loading customer data...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-600">Customer not found</p>
        <Button
          variant="outline"
          onClick={() => navigate("/customers")}
          className="mt-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Customers
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/customers")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">Edit Customer</h1>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Name *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter customer name" 
                          {...field} 
                          data-testid="input-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="regular">Regular</SelectItem>
                          <SelectItem value="vip">VIP</SelectItem>
                          <SelectItem value="wholesale">Wholesale</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Country" 
                          {...field} 
                          value={field.value || ""} 
                          data-testid="input-country"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="preferredLanguage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <Globe className="inline-block h-4 w-4 mr-1" />
                        Preferred Language
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "cs"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-language">
                            <SelectValue placeholder="Select language" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cs">Czech (Čeština)</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="vn">Vietnamese (Tiếng Việt)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="preferredCurrency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <Receipt className="inline-block h-4 w-4 mr-1" />
                        Preferred Currency
                      </FormLabel>
                      <FormDescription>
                        Default currency for this customer's orders (CZK or EUR)
                      </FormDescription>
                      <Select onValueChange={field.onChange} value={field.value || "EUR"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-preferredCurrency">
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="EUR">EUR (Euro)</SelectItem>
                          <SelectItem value="CZK">CZK (Czech Koruna)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Facebook & Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="facebookName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Facebook Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Facebook display name" 
                          {...field} 
                          value={field.value || ""} 
                          data-testid="input-facebook-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="facebookId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Facebook ID/Username</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Facebook ID or username" 
                          {...field} 
                          value={field.value || ""} 
                          data-testid="input-facebook-id"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="facebookUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Facebook Profile URL</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://facebook.com/username" 
                        {...field} 
                        value={field.value || ""} 
                        data-testid="input-facebook-url"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="profilePictureUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profile Picture URL</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="URL to profile picture" 
                        {...field} 
                        value={field.value || ""} 
                        data-testid="input-profile-picture"
                      />
                    </FormControl>
                    <FormDescription>
                      Local path or URL to customer's profile picture
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="customer@example.com" 
                          {...field} 
                          value={field.value || ""} 
                          data-testid="input-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="+1 234 567 8900" 
                          {...field} 
                          value={field.value || ""} 
                          data-testid="input-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <Truck className="inline-block h-5 w-5 mr-2" />
                Shipping Addresses
              </CardTitle>
              <CardDescription>
                Manage multiple shipping addresses for this customer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {shippingAddresses.length} shipping {shippingAddresses.length === 1 ? 'address' : 'addresses'}
                </p>
                <Button
                  type="button"
                  onClick={handleAddShippingAddress}
                  size="sm"
                  data-testid="button-add-shipping"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Shipping Address
                </Button>
              </div>

              {shippingAddresses.length > 0 && (
                <div className="space-y-3">
                  {shippingAddresses.map((address) => (
                    <div
                      key={address.id}
                      className="border rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{address.label || 'Shipping Address'}</span>
                            {address.isPrimary && (
                              <Badge variant="secondary" className="ml-2">
                                <Star className="h-3 w-3 mr-1" />
                                Primary
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {address.firstName} {address.lastName}
                            {address.company && <span className="block">{address.company}</span>}
                          </p>
                          <p className="text-sm">
                            {address.street} {address.streetNumber}
                            <br />
                            {address.city}, {address.state} {address.zipCode}
                            <br />
                            {address.country}
                          </p>
                          {(address.email || address.tel) && (
                            <p className="text-sm text-muted-foreground">
                              {address.email && <span className="block">{address.email}</span>}
                              {address.tel && <span className="block">{address.tel}</span>}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          {!address.isPrimary && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSetPrimaryAddress(address.id)}
                              title="Set as primary"
                              data-testid={`button-set-primary-${address.id}`}
                            >
                              <Star className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditShippingAddress(address)}
                            data-testid={`button-edit-shipping-${address.id}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setAddressToDelete(address)}
                            data-testid={`button-delete-shipping-${address.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <Building className="inline-block h-5 w-5 mr-2" />
                Billing Address Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="billingCompany"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Company name" 
                        {...field} 
                        value={field.value || ""} 
                        data-testid="input-billing-company"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="billingFirstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="First name" 
                          {...field} 
                          value={field.value || ""} 
                          data-testid="input-billing-firstname"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="billingLastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Last name" 
                          {...field} 
                          value={field.value || ""} 
                          data-testid="input-billing-lastname"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="billingEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="billing@company.com" 
                          {...field} 
                          value={field.value || ""} 
                          data-testid="input-billing-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="billingTel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="+420 123 456 789" 
                          {...field} 
                          value={field.value || ""} 
                          data-testid="input-billing-tel"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="billingStreet"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Street</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Street name" 
                          {...field} 
                          value={field.value || ""} 
                          data-testid="input-billing-street"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="billingStreetNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Number</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="No." 
                          {...field} 
                          value={field.value || ""} 
                          data-testid="input-billing-streetnumber"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="billingCity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="City" 
                          {...field} 
                          value={field.value || ""} 
                          data-testid="input-billing-city"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="billingZipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zip Code</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Zip" 
                          {...field} 
                          value={field.value || ""} 
                          data-testid="input-billing-zipcode"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="billingCountry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Country" 
                          {...field} 
                          value={field.value || ""} 
                          data-testid="input-billing-country"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="billingState"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="State" 
                          {...field} 
                          value={field.value || ""} 
                          data-testid="input-billing-state"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <Receipt className="inline-block h-5 w-5 mr-2" />
                Tax & VAT Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="ico"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IČO (Czech Company ID)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="12345678" 
                          {...field} 
                          value={field.value || ""} 
                          data-testid="input-ico"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dic"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>DIČ (Czech Tax ID)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="CZ12345678" 
                          {...field} 
                          value={field.value || ""} 
                          data-testid="input-dic"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vatNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>VAT Number (EU)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="CZ12345678" 
                          {...field} 
                          value={field.value || ""} 
                          data-testid="input-vat-number"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="vatValid"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value || false}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-vat-valid"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>VAT Number is Valid</FormLabel>
                      <FormDescription>
                        Checked if VAT number has been validated
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vatCompanyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>VAT Company Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Company name from VAT validation" 
                        {...field} 
                        value={field.value || ""} 
                        data-testid="input-vat-company-name"
                      />
                    </FormControl>
                    <FormDescription>
                      Auto-filled from VAT validation service
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vatCompanyAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>VAT Company Address</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Company address from VAT validation" 
                        {...field} 
                        value={field.value || ""} 
                        rows={2}
                        data-testid="input-vat-company-address"
                      />
                    </FormControl>
                    <FormDescription>
                      Auto-filled from VAT validation service
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional notes about the customer..."
                        className="resize-none"
                        rows={4}
                        {...field}
                        value={field.value || ""}
                        data-testid="input-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/customers")}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={updateCustomerMutation.isPending}
              data-testid="button-save"
            >
              <Save className="mr-2 h-4 w-4" />
              {updateCustomerMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Form>

      {/* Shipping Address Modal */}
      <ShippingAddressModal
        open={showShippingModal}
        onOpenChange={setShowShippingModal}
        onSave={handleSaveShippingAddress}
        editingAddress={editingAddress}
        existingAddresses={shippingAddresses}
        title={editingAddress ? 'Edit Shipping Address' : 'Add Shipping Address'}
        description={
          editingAddress 
            ? 'Update the shipping address details below'
            : 'Enter the new shipping address details below'
        }
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!addressToDelete} onOpenChange={(open) => !open && setAddressToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shipping Address</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this shipping address? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => addressToDelete && handleDeleteShippingAddress(addressToDelete.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
