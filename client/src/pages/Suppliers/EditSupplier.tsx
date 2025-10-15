import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation, useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, Check, ChevronsUpDown, Building2, User, Mail, Phone, Globe, MapPin, FileText, Loader2, Upload, File, Trash2, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { countries } from "@/lib/countries";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";
import { z } from "zod";

const getCountryFlag = (country: string): string => {
  const countryFlags: Record<string, string> = {
    'China': '🇨🇳',
    'Vietnam': '🇻🇳',
    'Czech Republic': '🇨🇿',
    'Germany': '🇩🇪',
    'USA': '🇺🇸',
    'UK': '🇬🇧',
    'Poland': '🇵🇱',
    'Slovakia': '🇸🇰',
    'Austria': '🇦🇹',
    'Hungary': '🇭🇺',
    'Thailand': '🇹🇭',
    'South Korea': '🇰🇷',
    'Japan': '🇯🇵',
    'Taiwan': '🇹🇼',
    'Hong Kong': '🇭🇰',
    'India': '🇮🇳',
    'Indonesia': '🇮🇩',
    'Malaysia': '🇲🇾',
    'Singapore': '🇸🇬',
    'Philippines': '🇵🇭',
    'Australia': '🇦🇺',
    'New Zealand': '🇳🇿',
    'Canada': '🇨🇦',
    'Mexico': '🇲🇽',
    'Brazil': '🇧🇷',
    'France': '🇫🇷',
    'Italy': '🇮🇹',
    'Spain': '🇪🇸',
    'Netherlands': '🇳🇱',
    'Belgium': '🇧🇪',
    'Switzerland': '🇨🇭',
    'Sweden': '🇸🇪',
    'Norway': '🇳🇴',
    'Denmark': '🇩🇰',
    'Finland': '🇫🇮',
    'Portugal': '🇵🇹',
    'Greece': '🇬🇷',
    'Turkey': '🇹🇷',
    'Russia': '🇷🇺',
    'Ukraine': '🇺🇦',
    'Romania': '🇷🇴',
    'Bulgaria': '🇧🇬',
    'Croatia': '🇭🇷',
    'Serbia': '🇷🇸',
    'Slovenia': '🇸🇮',
    'Lithuania': '🇱🇹',
    'Latvia': '🇱🇻',
    'Estonia': '🇪🇪',
    'South Africa': '🇿🇦',
    'Egypt': '🇪🇬',
    'UAE': '🇦🇪',
    'Saudi Arabia': '🇸🇦',
    'Israel': '🇮🇱',
  };
  return countryFlags[country] || '🌍';
};

const insertSupplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required"),
  contactPerson: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  notes: z.string().optional(),
  website: z.string().optional(),
  taxId: z.string().optional(),
});
type InsertSupplier = z.infer<typeof insertSupplierSchema>;
type Supplier = any;
type SupplierFile = any;

const formSchema = insertSupplierSchema.extend({});

export default function EditSupplier() {
  const [, setLocation] = useLocation();
  const { id } = useParams();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: supplier, isLoading } = useQuery<Supplier>({
    queryKey: [`/api/suppliers/${id}`],
    enabled: !!id,
  });

  const { data: supplierFiles = [] } = useQuery<SupplierFile[]>({
    queryKey: [`/api/suppliers/${id}/files`],
    enabled: !!id,
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      return apiRequest('DELETE', `/api/suppliers/${id}/files/${fileId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/suppliers/${id}/files`] });
      toast({
        title: "File deleted",
        description: "The file has been removed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete the file.",
        variant: "destructive",
      });
    },
  });

  const handleGetUploadParameters = async () => {
    const response = await apiRequest('POST', `/api/suppliers/${id}/files/upload`);
    const data = await response.json();
    return {
      method: 'PUT' as const,
      url: data.uploadURL,
    };
  };

  const handleUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      for (const file of result.successful) {
        const uploadData = {
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
          fileUrl: file.uploadURL,
          fileSize: file.size,
        };

        await apiRequest('POST', `/api/suppliers/${id}/files`, uploadData);
      }

      queryClient.invalidateQueries({ queryKey: [`/api/suppliers/${id}/files`] });
      toast({
        title: "Upload successful",
        description: `${result.successful.length} file(s) uploaded successfully.`,
      });
    }
  };

  const form = useForm<InsertSupplier>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      contactPerson: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
      website: "",
      notes: "",
      taxId: "",
    },
  });

  useEffect(() => {
    if (supplier) {
      form.reset({
        name: supplier.name,
        contactPerson: supplier.contactPerson || "",
        email: supplier.email || "",
        phone: supplier.phone || "",
        address: supplier.address || "",
        city: supplier.city || "",
        state: supplier.state || "",
        zipCode: supplier.zipCode || "",
        country: supplier.country || "",
        website: supplier.website || "",
        notes: supplier.notes || "",
        taxId: supplier.taxId || "",
      });
    }
  }, [supplier, form]);

  const updateMutation = useMutation({
    mutationFn: (data: InsertSupplier) =>
      apiRequest("PATCH", `/api/suppliers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      queryClient.invalidateQueries({ queryKey: [`/api/suppliers/${id}`] });
      toast({ 
        title: "Success",
        description: "Supplier updated successfully" 
      });
      setLocation("/suppliers");
    },
    onError: () => {
      toast({ 
        title: "Error",
        description: "Failed to update supplier", 
        variant: "destructive" 
      });
      setIsSubmitting(false);
    },
  });

  const onSubmit = async (data: InsertSupplier) => {
    setIsSubmitting(true);
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!supplier) {
    return <div>Supplier not found</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => setLocation("/suppliers")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Edit Supplier</h1>
          <p className="text-slate-600 mt-1">Update supplier profile with contact and business details</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          <Accordion type="multiple" defaultValue={["basic-info", "contact-details"]} className="space-y-4">
            {/* Basic Information */}
            <AccordionItem value="basic-info" className="border-l-4 border-l-blue-500 rounded-lg border bg-card">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  Basic Information
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6 pt-0 space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier Name *</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="e.g., Venalisa Nail Art, Emma Beauty Supplies" 
                        className="text-base"
                        data-testid="input-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contactPerson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <User className="h-4 w-4 text-slate-500" />
                        Contact Person
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={field.value || ""} 
                          placeholder="Emma Wang" 
                          data-testid="input-contactPerson"
                        />
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
                      <FormLabel className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-slate-500" />
                        Country
                      </FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "justify-between text-base",
                                !field.value && "text-muted-foreground"
                              )}
                              data-testid="button-country-select"
                            >
                              {field.value ? (
                                <span className="flex items-center gap-2">
                                  <span className="text-xl">{getCountryFlag(field.value)}</span>
                                  {field.value}
                                </span>
                              ) : (
                                "Select country..."
                              )}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0">
                          <Command>
                            <CommandInput placeholder="Search country..." />
                            <CommandEmpty>No country found.</CommandEmpty>
                            <CommandGroup className="max-h-[300px] overflow-auto">
                              {countries.map((country) => (
                                <CommandItem
                                  key={country}
                                  value={country}
                                  onSelect={() => {
                                    field.onChange(country);
                                  }}
                                  data-testid={`option-country-${country}`}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value === country ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <span className="text-lg mr-2">{getCountryFlag(country)}</span>
                                  {country}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              </AccordionContent>
            </AccordionItem>

            {/* Contact Details */}
            <AccordionItem value="contact-details" className="border-l-4 border-l-green-500 rounded-lg border bg-card">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <Mail className="h-5 w-5 text-green-600" />
                  Contact Details
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6 pt-0 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-slate-500" />
                        Email Address
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={field.value || ""} 
                          type="email" 
                          placeholder="supplier@example.com" 
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
                      <FormLabel className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-slate-500" />
                        Phone Number
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={field.value || ""} 
                          placeholder="+86 123 456 7890" 
                          data-testid="input-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-slate-500" />
                      Supplier Link / Website
                    </FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        value={field.value || ""} 
                        placeholder="https://venalisa.en.alibaba.com" 
                        data-testid="input-website"
                      />
                    </FormControl>
                    <FormDescription>Link to supplier's website or online store</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              </AccordionContent>
            </AccordionItem>

            {/* Address Information */}
            <AccordionItem value="address-info" className="border-l-4 border-l-purple-500 rounded-lg border bg-card">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <MapPin className="h-5 w-5 text-purple-600" />
                  Address Information
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6 pt-0 space-y-4">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder="123 Main Street, Building A"
                        data-testid="input-address"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          placeholder="Shanghai"
                          data-testid="input-city"
                        />
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
                      <FormLabel>State / Province</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          placeholder="Guangdong"
                          data-testid="input-state"
                        />
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
                      <FormLabel>Postal Code</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          placeholder="200000"
                          data-testid="input-zipCode"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              </AccordionContent>
            </AccordionItem>

            {/* Additional Information */}
            <AccordionItem value="additional-info" className="border-l-4 border-l-orange-500 rounded-lg border bg-card">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <FileText className="h-5 w-5 text-orange-600" />
                  Additional Information
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6 pt-0 space-y-4">
              <FormField
                control={form.control}
                name="taxId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax ID / Business Registration</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder="Enter tax ID or business registration number"
                        data-testid="input-taxId"
                      />
                    </FormControl>
                    <FormDescription>Business registration or tax identification number</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value || ""}
                        placeholder="Add any additional notes about the supplier (e.g., payment terms, minimum order quantity, shipping details)"
                        rows={4}
                        className="resize-none"
                        data-testid="textarea-notes"
                      />
                    </FormControl>
                    <FormDescription>Internal notes about the supplier</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation("/suppliers")}
              disabled={isSubmitting}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="min-w-[140px]"
              data-testid="button-submit"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Supplier"
              )}
            </Button>
          </div>
        </form>
      </Form>

      {/* Files & Documents Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Files & Documents ({supplierFiles.length})
            </CardTitle>
            <ObjectUploader
              maxNumberOfFiles={10}
              maxFileSize={50 * 1024 * 1024}
              onGetUploadParameters={handleGetUploadParameters}
              onComplete={handleUploadComplete}
              buttonClassName="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Upload Files
            </ObjectUploader>
          </div>
        </CardHeader>
        <CardContent>
          {supplierFiles.length === 0 ? (
            <p className="text-slate-500">No files uploaded yet.</p>
          ) : (
            <div className="space-y-2">
              {supplierFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <File className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="font-medium">{file.fileName}</p>
                      <p className="text-sm text-slate-500">
                        {file.fileSize ? `${(file.fileSize / 1024 / 1024).toFixed(2)} MB` : 'Unknown size'} • 
                        {file.createdAt ? new Date(file.createdAt).toLocaleDateString() : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(file.fileUrl, '_blank')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteFileMutation.mutate(file.id)}
                      disabled={deleteFileMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
