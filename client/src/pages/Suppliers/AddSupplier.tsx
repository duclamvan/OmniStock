import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from 'react-i18next';
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, Check, ChevronsUpDown, Building2, User, Mail, Phone, Globe, MapPin, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { countries } from "@/lib/countries";
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
  zipCode: z.string().optional(),
  country: z.string().optional(),
  notes: z.string().optional(),
  website: z.string().optional(),
  taxId: z.string().optional(),
});
type InsertSupplier = z.infer<typeof insertSupplierSchema>;

const formSchema = insertSupplierSchema.extend({});

export default function AddSupplier() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation(['inventory', 'common']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<InsertSupplier>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      contactPerson: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      zipCode: "",
      country: "",
      website: "",
      notes: "",
      taxId: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertSupplier) =>
      apiRequest("POST", "/api/suppliers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({ 
        title: t('common:success'),
        description: t('inventory:supplierCreated') 
      });
      setLocation("/suppliers");
    },
    onError: () => {
      toast({ 
        title: t('common:error'),
        description: t('inventory:updateError'), 
        variant: "destructive" 
      });
      setIsSubmitting(false);
    },
  });

  const onSubmit = async (data: InsertSupplier) => {
    setIsSubmitting(true);
    createMutation.mutate(data);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-4">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => window.history.back()}
          data-testid="button-back"
          className="shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">{t('inventory:addSupplier')}</h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1 hidden sm:block">{t('inventory:manageProductsDescription')}</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          <Accordion type="multiple" defaultValue={["basic-info", "contact-details"]} className="space-y-4">
            {/* Basic Information */}
            <AccordionItem value="basic-info" className="border-l-4 border-l-blue-500 dark:border-l-blue-400 rounded-lg border border-gray-200 dark:border-gray-700 bg-card dark:bg-slate-800">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                  <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  {t('inventory:supplierInfo')}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6 pt-0 space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('inventory:supplierName')} *</FormLabel>
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
                        {t('inventory:contactPerson')}
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
                        {t('inventory:supplierCountry')}
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
                  {t('inventory:contactInfo')}
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
                        {t('inventory:supplierEmail')}
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
                  {t('inventory:addressInfo')}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  {t('inventory:additionalInfo')}
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
              {t('common:cancel')}
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
                  {t('common:creating')}...
                </>
              ) : (
                t('inventory:addSupplier')
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
