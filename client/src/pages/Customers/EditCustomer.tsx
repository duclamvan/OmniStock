import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
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
import { ArrowLeft, Save, MapPin, Search } from "lucide-react";
import { insertCustomerSchema } from "@shared/schema";

// Extend the schema for form validation
const editCustomerSchema = insertCustomerSchema.extend({
  name: z.string().min(1, "Customer name is required"),
  facebookName: z.string().optional().nullable(),
  facebookId: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zipCode: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  type: z.string(),
  notes: z.string().optional().nullable(),
});

type EditCustomerForm = z.infer<typeof editCustomerSchema>;

export default function EditCustomer() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Fetch customer data
  const { data: customer, isLoading } = useQuery<any>({
    queryKey: [`/api/customers/${id}`],
    enabled: !!id,
  });

  const form = useForm<EditCustomerForm>({
    resolver: zodResolver(editCustomerSchema),
    defaultValues: {
      name: "",
      facebookName: "",
      facebookId: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
      type: "regular",
      notes: "",
    },
  });

  // Update form when customer data is loaded
  useEffect(() => {
    if (customer) {
      form.reset({
        name: customer.name || "",
        facebookName: customer.facebookName || "",
        facebookId: customer.facebookId || "",
        email: customer.email || "",
        phone: customer.phone || "",
        address: customer.address || "",
        city: customer.city || "",
        state: customer.state || "",
        zipCode: customer.zipCode || "",
        country: customer.country || "",
        type: customer.type || "regular",
        notes: customer.notes || "",
      });
    }
  }, [customer, form]);

  // Update customer mutation
  const updateCustomerMutation = useMutation({
    mutationFn: async (data: EditCustomerForm) => {
      // Remove empty strings and convert to null
      const cleanedData = Object.entries(data).reduce((acc, [key, value]) => {
        acc[key] = value === "" ? null : value;
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

  // Address geocoding
  const handleAddressLookup = async () => {
    const address = form.getValues("address");
    const city = form.getValues("city");
    const country = form.getValues("country");
    
    if (!address && !city) {
      toast({
        title: "Error",
        description: "Please enter an address or city to lookup",
        variant: "destructive",
      });
      return;
    }

    try {
      const query = [address, city, country].filter(Boolean).join(", ");
      const response = await apiRequest('GET', `/api/geocode?address=${encodeURIComponent(query)}`);
      
      if (response && Array.isArray(response) && response.length > 0) {
        const result = response[0];
        
        // Extract components from the result
        const addressComponents = result.display_name.split(", ");
        const houseNumber = result.address?.house_number || "";
        const road = result.address?.road || "";
        const suburb = result.address?.suburb || "";
        const cityDistrict = result.address?.city_district || "";
        const city = result.address?.city || result.address?.town || result.address?.village || "";
        const state = result.address?.state || "";
        const postcode = result.address?.postcode || "";
        const country = result.address?.country || "";

        // Construct the street address
        let streetAddress = "";
        if (houseNumber && road) {
          streetAddress = `${road} ${houseNumber}`;
        } else if (road) {
          streetAddress = road;
        } else if (addressComponents[0]) {
          streetAddress = addressComponents[0];
        }

        // Update form fields
        form.setValue("address", streetAddress);
        form.setValue("city", city);
        form.setValue("state", state);
        form.setValue("zipCode", postcode);
        form.setValue("country", country);
        
        toast({
          title: "Success",
          description: "Address information updated",
        });
      } else {
        toast({
          title: "Not Found",
          description: "Could not find address information",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      toast({
        title: "Error",
        description: "Failed to lookup address",
        variant: "destructive",
      });
    }
  };

  const onSubmit = (data: EditCustomerForm) => {
    updateCustomerMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600">Customer not found</p>
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/customers")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">Edit Customer</h1>
        </div>
      </div>

      {/* Form */}
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
                        <Input placeholder="Enter customer name" {...field} />
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
                          <SelectTrigger>
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
                  name="facebookName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Facebook Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Facebook display name" {...field} value={field.value || ""} />
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
                        <Input placeholder="Facebook ID or username" {...field} value={field.value || ""} />
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
              <CardTitle>Contact & Address Information</CardTitle>
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
                        <Input type="email" placeholder="customer@example.com" {...field} value={field.value || ""} />
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
                        <Input placeholder="+1 234 567 8900" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input placeholder="123 Main Street" {...field} value={field.value || ""} />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleAddressLookup}
                          title="Lookup address"
                        >
                          <Search className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="City" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State/Province</FormLabel>
                        <FormControl>
                          <Input placeholder="State" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP/Postal Code</FormLabel>
                        <FormControl>
                          <Input placeholder="12345" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input placeholder="Country" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
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
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>



          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/customers")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateCustomerMutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {updateCustomerMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}