import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAddressAutocomplete } from "@/hooks/useAddressAutocomplete";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  ArrowLeft, 
  Save, 
  FileUp, 
  Calendar, 
  Building2, 
  MapPin, 
  Phone,
  Mail,
  User,
  Banknote,
  Settings,
  FileText,
  Ruler,
  Plus,
  Search,
  Loader2
} from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

type WarehouseFormData = {
  name: string;
  code?: string;
  location?: string;
  status: "active" | "inactive" | "maintenance" | "rented";
  rentedFromDate?: string;
  expenseId?: string;
  contact?: string;
  notes?: string;
  address?: string;
  city?: string;
  country?: string;
  zipCode?: string;
  phone?: string;
  email?: string;
  manager?: string;
  type: "main" | "branch" | "temporary";
  floorArea?: number;
};

export default function AddWarehouse() {
  const { t } = useTranslation(['warehouse', 'common']);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Address autocomplete hook
  const {
    addressSearch,
    setAddressSearch,
    addressSuggestions,
    showAddressDropdown,
    setShowAddressDropdown,
    isLoadingAddressSearch,
    searchAddresses,
    selectAddress,
  } = useAddressAutocomplete({
    onError: (error) => {
      toast({
        title: t('common:error'),
        description: t('warehouse:geocodeError'),
        variant: "destructive",
      });
    },
  });

  const warehouseSchema = z.object({
    name: z.string().min(1, t('warehouse:warehouseNameRequired')),
    code: z.string().min(1, t('warehouse:warehouseCodeRequired')),
    location: z.string().optional(),
    status: z.enum(["active", "inactive", "maintenance", "rented"]).default("active"),
    rentedFromDate: z.string().optional(),
    expenseId: z.string().optional(),
    contact: z.string().optional(),
    notes: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    country: z.string().default("Czech Republic"),
    zipCode: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email(t('common:invalidEmail')).optional().or(z.literal("")),
    manager: z.string().optional(),
    type: z.enum(["main", "branch", "temporary"]).default("branch"),
    floorArea: z.number().optional().nullable(),
  });

  const form = useForm<WarehouseFormData>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: {
      name: "",
      code: "",
      location: "",
      status: "active",
      rentedFromDate: "",
      expenseId: "",
      contact: "",
      notes: "",
      address: "",
      city: "",
      country: "Czech Republic",
      zipCode: "",
      phone: "",
      email: "",
      manager: "",
      type: "branch",
      floorArea: undefined,
    },
  });

  const createWarehouseMutation = useMutation({
    mutationFn: (data: WarehouseFormData) => 
      apiRequest('POST', '/api/warehouses', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/warehouses'] });
      toast({
        title: t('common:success'),
        description: t('warehouse:warehouseCreatedSuccess'),
      });
      navigate("/warehouses");
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message || t('warehouse:warehouseCreateError'),
        variant: "destructive",
      });
    },
  });

  const handleGetUploadParameters = async () => {
    const response = await apiRequest('POST', '/api/objects/upload');
    return {
      method: 'PUT' as const,
      url: response.uploadURL,
    };
  };

  const handleFileUploadComplete = (result: any) => {
    if (result.successful && result.successful.length > 0) {
      toast({
        title: t('common:success'),
        description: t('common:uploadSuccess'),
      });
    }
  };

  const onSubmit = (data: WarehouseFormData) => {
    createWarehouseMutation.mutate(data);
  };

  return (
    <div className="p-2 sm:p-4 md:p-6 max-w-6xl mx-auto space-y-4 md:space-y-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-3 md:pb-4 gap-3">
        <div className="flex items-center gap-2 md:gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">{t('warehouse:backToWarehouses')}</span>
          </Button>
        </div>
        <Badge variant="outline" className="text-green-600 border-green-600 w-fit">
          <Plus className="h-3 w-3 mr-1" />
          {t('warehouse:newWarehouse')}
        </Badge>
      </div>

      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">{t('warehouse:addNewWarehouse')}</h1>
        <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 mt-1">{t('warehouse:addNewWarehouseDesc')}</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Main Column - 2/3 width */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            {/* Basic Information */}
            <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700">
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg text-gray-900 dark:text-gray-100">
                  <Building2 className="h-4 w-4 md:h-5 md:w-5 text-blue-600 dark:text-blue-400" />
                  {t('warehouse:basicInformation')}
                </CardTitle>
                <CardDescription className="text-xs md:text-sm text-gray-700 dark:text-gray-300">{t('warehouse:basicInformationDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 md:space-y-4 p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">{t('warehouse:warehouseName')} *</Label>
                    <Input
                      id="name"
                      {...form.register("name")}
                      placeholder={t('warehouse:warehouseNamePlaceholder')}
                      className="mt-1"
                    />
                    {form.formState.errors.name && (
                      <p className="text-sm text-red-600 mt-1">{form.formState.errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="code">{t('warehouse:warehouseCode')}</Label>
                    <Input
                      id="code"
                      {...form.register("code")}
                      placeholder={t('warehouse:warehouseCodePlaceholder')}
                      className="mt-1"
                      data-testid="input-warehouse-code"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type">{t('warehouse:warehouseType')}</Label>
                    <Select value={form.watch("type")} onValueChange={(value: any) => form.setValue("type", value)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={t('warehouse:selectType')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="main">{t('warehouse:type.main')}</SelectItem>
                        <SelectItem value="branch">{t('warehouse:type.branch')}</SelectItem>
                        <SelectItem value="temporary">{t('warehouse:type.temporary')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="status">{t('warehouse:operatingStatus')}</Label>
                    <Select value={form.watch("status")} onValueChange={(value: any) => form.setValue("status", value)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={t('warehouse:selectStatus')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 bg-green-500 rounded-full" />
                            {t('common:active')}
                          </div>
                        </SelectItem>
                        <SelectItem value="inactive">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 bg-gray-500 rounded-full" />
                            {t('common:inactive')}
                          </div>
                        </SelectItem>
                        <SelectItem value="maintenance">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 bg-yellow-500 rounded-full" />
                            {t('common:maintenance')}
                          </div>
                        </SelectItem>
                        <SelectItem value="rented">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 bg-blue-500 rounded-full" />
                            {t('common:rented')}
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="manager">{t('warehouse:warehouseManager')}</Label>
                    <div className="relative mt-1">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="manager"
                        {...form.register("manager")}
                        placeholder={t('warehouse:managerPlaceholder')}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="floorArea">{t('warehouse:floorArea')} (m²)</Label>
                  <div className="relative mt-1">
                    <Ruler className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="floorArea"
                      type="number"
                      {...form.register("floorArea", { valueAsNumber: true })}
                      placeholder={t('warehouse:floorAreaPlaceholder')}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Location Details */}
            <Card>
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <MapPin className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
                  {t('warehouse:locationAddress')}
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">{t('warehouse:locationDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 md:space-y-4 p-4 md:p-6">
                {/* Address Autocomplete Search */}
                <div className="relative">
                  <Label htmlFor="addressSearch">{t('warehouse:searchAddress')}</Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="addressSearch"
                      value={addressSearch}
                      onChange={(e) => {
                        setAddressSearch(e.target.value);
                        searchAddresses(e.target.value);
                      }}
                      placeholder={t('warehouse:searchAddressPlaceholder')}
                      className="pl-10 pr-10"
                      data-testid="input-address-search"
                    />
                    {isLoadingAddressSearch && (
                      <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-500 animate-spin" />
                    )}
                  </div>
                  
                  {/* Address Suggestions Dropdown */}
                  {showAddressDropdown && addressSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {addressSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => selectAddress(suggestion, form.setValue)}
                          className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm border-b border-slate-100 dark:border-slate-700 last:border-0"
                        >
                          <div className="font-medium text-slate-900 dark:text-white">
                            {suggestion.formatted}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {[suggestion.city, suggestion.zipCode, suggestion.country].filter(Boolean).join(', ')}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                <div>
                  <Label htmlFor="address">{t('common:address')}</Label>
                  <Input
                    id="address"
                    {...form.register("address")}
                    placeholder={t('warehouse:addressPlaceholder')}
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">{t('common:city')}</Label>
                    <Input
                      id="city"
                      {...form.register("city")}
                      placeholder={t('warehouse:cityPlaceholder')}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="zipCode">{t('common:postalCode')}</Label>
                    <Input
                      id="zipCode"
                      {...form.register("zipCode")}
                      placeholder={t('warehouse:zipPlaceholder')}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="country">{t('common:country')}</Label>
                    <Input
                      id="country"
                      {...form.register("country")}
                      placeholder={t('warehouse:countryPlaceholder')}
                      className="mt-1"
                    />
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">{t('common:phone')}</Label>
                    <div className="relative mt-1">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="phone"
                        {...form.register("phone")}
                        placeholder={t('warehouse:phonePlaceholder')}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">{t('common:email')}</Label>
                    <div className="relative mt-1">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="email"
                        type="email"
                        {...form.register("email")}
                        placeholder={t('warehouse:emailPlaceholder')}
                        className="pl-10"
                      />
                    </div>
                    {form.formState.errors.email && (
                      <p className="text-sm text-red-600 mt-1">{form.formState.errors.email.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="contact">{t('warehouse:primaryContact')}</Label>
                  <Input
                    id="contact"
                    {...form.register("contact")}
                    placeholder={t('warehouse:contactPlaceholder')}
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Financial & Notes */}
            <Card>
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <Banknote className="h-4 w-4 md:h-5 md:w-5 text-orange-600" />
                  {t('warehouse:financialInfo')}
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">{t('warehouse:financialInfoDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 md:space-y-4 p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rentedFromDate">{t('warehouse:rentalStartDate')}</Label>
                    <div className="relative mt-1">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="rentedFromDate"
                        type="date"
                        {...form.register("rentedFromDate")}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="expenseId">{t('warehouse:expenseReferenceId')}</Label>
                    <Input
                      id="expenseId"
                      {...form.register("expenseId")}
                      placeholder={t('warehouse:expenseIdPlaceholder')}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="location">{t('warehouse:locationCode')}</Label>
                  <Input
                    id="location"
                    {...form.register("location")}
                    placeholder={t('warehouse:locationCodePlaceholder')}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="notes">{t('warehouse:internalNotes')}</Label>
                  <Textarea
                    id="notes"
                    {...form.register("notes")}
                    placeholder={t('warehouse:notesPlaceholder')}
                    className="min-h-[120px] mt-1"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - 1/3 width */}
          <div className="space-y-4 md:space-y-6">
            {/* File Upload Card */}
            <Card>
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <FileText className="h-4 w-4 md:h-5 md:w-5 text-purple-600" />
                  {t('warehouse:documents')}
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">{t('warehouse:documentsDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                <ObjectUploader
                  maxNumberOfFiles={10}
                  maxFileSize={50 * 1024 * 1024} // 50MB
                  onGetUploadParameters={handleGetUploadParameters}
                  onComplete={handleFileUploadComplete}
                  buttonClassName="w-full border-2 border-dashed border-slate-300 hover:border-blue-400 transition-all duration-200 py-8 bg-slate-50 hover:bg-blue-50"
                >
                  <div className="flex flex-col items-center gap-2 text-slate-600">
                    <FileUp className="h-10 w-10 text-blue-500" />
                    <p className="text-sm font-medium">{t('warehouse:clickDragFiles')}</p>
                    <p className="text-xs text-slate-500">{t('warehouse:uploadFileTypes')}</p>
                  </div>
                </ObjectUploader>
              </CardContent>
            </Card>

            {/* Quick Actions Card */}
            <Card>
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <Settings className="h-4 w-4 md:h-5 md:w-5 text-gray-600" />
                  {t('common:actions')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4 md:p-6">
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={createWarehouseMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {createWarehouseMutation.isPending ? t('warehouse:creating') : t('warehouse:createWarehouse')}
                </Button>
                
                <Button 
                  type="button"
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate("/warehouses")}
                >
                  {t('common:cancel')}
                </Button>

                <Separator />

                {/* Tips */}
                <div className="pt-3 space-y-2 text-sm text-slate-600">
                  <h4 className="font-medium text-slate-700">{t('warehouse:quickTips')}</h4>
                  <ul className="space-y-1 text-xs">
                    <li>• {t('warehouse:tip1')}</li>
                    <li>• {t('warehouse:tip2')}</li>
                    <li>• {t('warehouse:tip3')}</li>
                    <li>• {t('warehouse:tip4')}</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}