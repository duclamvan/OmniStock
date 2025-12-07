import { useState, useMemo } from "react";
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

const createSupplierSchema = (t: (key: string) => string) => z.object({
  name: z.string().min(1, t('inventory:supplierNameRequired')),
  contactPerson: z.string().optional(),
  email: z.string().email(t('inventory:invalidEmailAddress')).optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  notes: z.string().optional(),
  website: z.string().optional(),
  taxId: z.string().optional(),
});

type InsertSupplier = {
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  country?: string;
  notes?: string;
  website?: string;
  taxId?: string;
};

export default function AddSupplier() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation(['inventory', 'common']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supplierSchema = useMemo(() => createSupplierSchema(t), [t]);

  const form = useForm<InsertSupplier>({
    resolver: zodResolver(supplierSchema),
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
    <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto pb-8 p-2 sm:p-4 md:p-6 -m-6 overflow-x-hidden">
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
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">{t('inventory:addSupplier')}</h1>
          <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-400 mt-1 hidden sm:block">{t('inventory:manageProductsDescription')}</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          <Accordion type="multiple" defaultValue={["basic-info", "contact-details"]} className="space-y-4">
            {/* Basic Information */}
            <AccordionItem value="basic-info" className="border-l-4 border-l-blue-500 dark:border-l-blue-400 rounded-lg border border-gray-200 dark:border-gray-700 bg-card dark:bg-slate-800">
              <AccordionTrigger className="px-4 sm:px-6 py-3 sm:py-4 hover:no-underline">
                <div className="flex items-center gap-2 text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
                  <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
                  {t('inventory:supplierInfo')}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 sm:px-6 pb-4 sm:pb-6 pt-0 space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('inventory:supplierName')} *</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder={t('inventory:supplierNamePlaceholder')}
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
                          placeholder={t('inventory:contactPersonPlaceholder')}
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
                                t('inventory:selectCountry')
                              )}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0">
                          <Command>
                            <CommandInput placeholder={t('inventory:searchCountry')} />
                            <CommandEmpty>{t('inventory:noCountryFound')}</CommandEmpty>
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
            <AccordionItem value="contact-details" className="border-l-4 border-l-green-500 dark:border-l-green-400 rounded-lg border border-gray-200 dark:border-gray-700 bg-card dark:bg-slate-800">
              <AccordionTrigger className="px-4 sm:px-6 py-3 sm:py-4 hover:no-underline">
                <div className="flex items-center gap-2 text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
                  <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
                  {t('inventory:contactInfo')}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 sm:px-6 pb-4 sm:pb-6 pt-0 space-y-4">
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
                          placeholder={t('inventory:emailPlaceholder')}
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
                        {t('inventory:phoneNumber')}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={field.value || ""} 
                          placeholder={t('inventory:phonePlaceholder')}
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
                      {t('inventory:supplierLinkWebsite')}
                    </FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        value={field.value || ""} 
                        placeholder={t('inventory:websitePlaceholder')}
                        data-testid="input-website"
                      />
                    </FormControl>
                    <FormDescription>{t('inventory:linkToSupplierWebsite')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              </AccordionContent>
            </AccordionItem>

            {/* Address Information */}
            <AccordionItem value="address-info" className="border-l-4 border-l-purple-500 dark:border-l-purple-400 rounded-lg border border-gray-200 dark:border-gray-700 bg-card dark:bg-slate-800">
              <AccordionTrigger className="px-4 sm:px-6 py-3 sm:py-4 hover:no-underline">
                <div className="flex items-center gap-2 text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
                  <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400" />
                  {t('inventory:addressInfo')}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 sm:px-6 pb-4 sm:pb-6 pt-0 space-y-4">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('inventory:streetAddress')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder={t('inventory:addressPlaceholder')}
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
                      <FormLabel>{t('inventory:city')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          placeholder={t('inventory:cityPlaceholder')}
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
                      <FormLabel>{t('inventory:postalCode')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          placeholder={t('inventory:postalCodePlaceholder')}
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
            <AccordionItem value="additional-info" className="border-l-4 border-l-orange-500 dark:border-l-orange-400 rounded-lg border border-gray-200 dark:border-gray-700 bg-card dark:bg-slate-800">
              <AccordionTrigger className="px-4 sm:px-6 py-3 sm:py-4 hover:no-underline">
                <div className="flex items-center gap-2 text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 dark:text-orange-400" />
                  {t('inventory:additionalInfo')}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 sm:px-6 pb-4 sm:pb-6 pt-0 space-y-4">
              <FormField
                control={form.control}
                name="taxId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('inventory:taxIdBusinessReg')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder={t('inventory:taxIdPlaceholder')}
                        data-testid="input-taxId"
                      />
                    </FormControl>
                    <FormDescription>{t('inventory:taxIdDescription')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('inventory:notes')}</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value || ""}
                        placeholder={t('inventory:notesPlaceholder')}
                        rows={4}
                        className="resize-none"
                        data-testid="textarea-notes"
                      />
                    </FormControl>
                    <FormDescription>{t('inventory:internalNotesAboutSupplier')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation("/suppliers")}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
              data-testid="button-cancel"
            >
              {t('common:cancel')}
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full sm:w-auto min-w-[140px]"
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
