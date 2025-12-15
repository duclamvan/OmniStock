import { useState, useRef, useCallback, useEffect } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
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
import { apiRequest } from "@/lib/queryClient";
import { 
  ArrowLeft, 
  Save, 
  Trash2,
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
  Edit,
  Search,
  Loader2,
  X,
  File,
  Image,
  FileSpreadsheet
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import type { Warehouse } from "@shared/schema";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  progress?: number;
  url?: string;
}

export type WarehouseFormData = {
  name: string;
  code?: string;
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
  capacity?: number;
  type: "main" | "branch" | "temporary";
  floorArea?: number;
};

interface WarehouseFormProps {
  mode: 'add' | 'edit';
  warehouse?: Warehouse | null;
  onSubmit: (data: WarehouseFormData, uploadedFiles: UploadedFile[]) => void;
  isSubmitting: boolean;
  onCancel: () => void;
  onDelete?: () => void;
  children?: React.ReactNode; // For additional content like financial contracts
}

export function WarehouseForm({
  mode,
  warehouse,
  onSubmit,
  isSubmitting,
  onCancel,
  onDelete,
  children,
}: WarehouseFormProps) {
  const { t } = useTranslation(['warehouse', 'common']);
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
    onError: () => {
      toast({
        title: t('common:error'),
        description: t('warehouse:geocodeError'),
        variant: "destructive",
      });
    },
  });

  const warehouseSchema = z.object({
    name: z.string().min(1, t('warehouse:warehouseNameRequired')),
    code: mode === 'add' 
      ? z.string().min(1, t('warehouse:warehouseCodeRequired'))
      : z.string().optional(),
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
    capacity: z.preprocess(
      (val) => (val === '' || val === undefined || val === null || Number.isNaN(val) ? undefined : Number(val)),
      z.number().optional()
    ),
    type: z.enum(["main", "branch", "temporary"]).default("branch"),
    floorArea: z.preprocess(
      (val) => (val === '' || val === undefined || val === null || Number.isNaN(val) ? undefined : Number(val)),
      z.number().optional()
    ),
  });

  const form = useForm<WarehouseFormData>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: {
      name: "",
      code: "",
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
      capacity: undefined,
      type: "branch",
      floorArea: undefined,
    },
  });

  // Populate form with warehouse data when editing
  // Handle both camelCase and snake_case from API
  useEffect(() => {
    if (warehouse && mode === 'edit') {
      const warehouseData = warehouse as any;
      const rentedFromDate = warehouseData.rented_from_date || warehouseData.rentedFromDate;
      form.reset({
        name: warehouseData.name || "",
        code: warehouseData.code || "",
        status: (warehouseData.status as any) || "active",
        rentedFromDate: rentedFromDate 
          ? new Date(rentedFromDate).toISOString().split('T')[0] 
          : "",
        expenseId: (warehouseData.expense_id || warehouseData.expenseId)?.toString() || "",
        contact: warehouseData.contact || "",
        notes: warehouseData.notes || "",
        address: warehouseData.address || "",
        city: warehouseData.city || "",
        country: warehouseData.country || "Czech Republic",
        zipCode: warehouseData.zip_code || warehouseData.zipCode || "",
        phone: warehouseData.phone || "",
        email: warehouseData.email || "",
        manager: warehouseData.manager || "",
        capacity: warehouseData.capacity ?? undefined,
        type: (warehouseData.type as any) || "branch",
        floorArea: (warehouseData.floor_area || warehouseData.floorArea) 
          ? parseFloat((warehouseData.floor_area || warehouseData.floorArea).toString()) 
          : undefined,
      });
    }
  }, [warehouse, mode, form]);

  // File upload state
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (type.includes('spreadsheet') || type.includes('excel') || type.includes('csv')) return <FileSpreadsheet className="h-4 w-4" />;
    if (type.includes('pdf')) return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const maxFileSize = 50 * 1024 * 1024; // 50MB
    const newFiles: UploadedFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > maxFileSize) {
        toast({
          title: t('common:error'),
          description: `${file.name} exceeds 50MB limit`,
          variant: "destructive",
        });
        continue;
      }

      const uploadFile: UploadedFile = {
        id: `${Date.now()}-${i}`,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'uploading',
        progress: 0,
      };
      newFiles.push(uploadFile);
    }

    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Upload each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > maxFileSize) continue;

      const fileId = newFiles[i]?.id;
      if (!fileId) continue;

      try {
        const response = await apiRequest('POST', '/api/objects/upload');
        const data = await response.json() as { uploadURL: string };
        const uploadURL = data.uploadURL;

        if (!uploadURL) {
          throw new Error('No upload URL returned');
        }

        await fetch(uploadURL, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
          },
        });

        const fileUrl = uploadURL.split('?')[0];
        setUploadedFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, status: 'complete', progress: 100, url: fileUrl } : f
        ));
      } catch (error) {
        setUploadedFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, status: 'error' } : f
        ));
        toast({
          title: t('common:error'),
          description: `Failed to upload ${file.name}`,
          variant: "destructive",
        });
      }
    }
  }, [t, toast]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const removeFile = useCallback((id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  const handleFormSubmit = (data: WarehouseFormData) => {
    onSubmit(data, uploadedFiles);
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
        <Badge 
          variant="outline" 
          className={mode === 'add' 
            ? "text-green-600 border-green-600 w-fit" 
            : "text-blue-600 border-blue-600 w-fit"
          }
        >
          {mode === 'add' ? (
            <>
              <Plus className="h-3 w-3 mr-1" />
              {t('warehouse:newWarehouse')}
            </>
          ) : (
            <>
              <Edit className="h-3 w-3 mr-1" />
              {t('warehouse:editWarehouse')}
            </>
          )}
        </Badge>
      </div>

      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">
          {mode === 'add' ? t('warehouse:addNewWarehouse') : t('warehouse:editWarehouse')}
        </h1>
        <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 mt-1">
          {mode === 'add' ? t('warehouse:addNewWarehouseDesc') : t('warehouse:editWarehouseDesc')}
        </p>
      </div>

      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 md:space-y-6">
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
                    <Label htmlFor="code">{t('warehouse:warehouseCode')} {mode === 'add' && '*'}</Label>
                    <Input
                      id="code"
                      {...form.register("code")}
                      placeholder={t('warehouse:warehouseCodePlaceholder')}
                      className="mt-1"
                      data-testid="input-warehouse-code"
                    />
                    {form.formState.errors.code && (
                      <p className="text-sm text-red-600 mt-1">{form.formState.errors.code.message}</p>
                    )}
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

            {/* Additional content slot (for financial contracts in edit mode) */}
            {children}
          </div>

          {/* Sidebar - 1/3 width */}
          <div className="space-y-4 md:space-y-6">
            {/* Quick Actions Card */}
            <Card>
              <CardHeader className="p-4 md:p-6 pb-2 md:pb-3">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <Settings className="h-4 w-4 md:h-5 md:w-5 text-slate-600" />
                  {t('common:actions')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4 md:p-6 pt-2 md:pt-3">
                <Button 
                  type="submit" 
                  className="w-full h-12 text-base"
                  disabled={isSubmitting}
                >
                  <Save className="h-5 w-5 mr-2" />
                  {isSubmitting 
                    ? (mode === 'add' ? t('warehouse:creating') : t('warehouse:updating'))
                    : (mode === 'add' ? t('warehouse:createWarehouse') : t('warehouse:updateWarehouse'))
                  }
                </Button>
                
                <Button 
                  type="button"
                  variant="outline" 
                  className="w-full"
                  onClick={onCancel}
                >
                  {t('common:cancel')}
                </Button>

                {mode === 'edit' && onDelete && (
                  <>
                    <Separator />
                    <Button 
                      type="button"
                      variant="destructive" 
                      className="w-full"
                      onClick={onDelete}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('warehouse:deleteWarehouse')}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* File Upload Card */}
            <Card>
              <CardHeader className="p-4 md:p-6 pb-2 md:pb-3">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <FileText className="h-4 w-4 md:h-5 md:w-5 text-slate-600" />
                  {t('warehouse:documents')}
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">{t('warehouse:documentsDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-2 md:pt-3 space-y-4">
                {/* Drop Zone */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files)}
                  data-testid="file-input-hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`
                    w-full min-h-[120px] border-2 border-dashed rounded-lg cursor-pointer
                    transition-all duration-200 flex flex-col items-center justify-center gap-3 py-6
                    ${isDragging 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }
                  `}
                  data-testid="file-drop-zone"
                >
                  <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800">
                    <FileUp className="h-6 w-6 text-slate-500 dark:text-slate-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('warehouse:clickDragFiles')}</p>
                    <p className="text-xs text-slate-500 mt-1">{t('warehouse:uploadFileTypes')}</p>
                  </div>
                </div>

                {/* Files List */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-2" data-testid="files-list">
                    <h4 className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                      {t('common:files')} ({uploadedFiles.length})
                    </h4>
                    <div className="space-y-1.5">
                      {uploadedFiles.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-md w-full"
                          data-testid={`file-item-${file.id}`}
                        >
                          <div className={`
                            p-1.5 rounded shrink-0
                            ${file.status === 'complete' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : ''}
                            ${file.status === 'uploading' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : ''}
                            ${file.status === 'error' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : ''}
                            ${file.status === 'pending' ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400' : ''}
                          `}>
                            {getFileIcon(file.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{file.name}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-500">{formatFileSize(file.size)}</span>
                              {file.status === 'uploading' && (
                                <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />
                              )}
                              {file.status === 'complete' && (
                                <span className="text-[10px] text-green-600 dark:text-green-400">✓</span>
                              )}
                              {file.status === 'error' && (
                                <span className="text-[10px] text-red-600 dark:text-red-400">{t('common:error')}</span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(file.id);
                            }}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded shrink-0"
                            data-testid={`remove-file-${file.id}`}
                          >
                            <X className="h-3.5 w-3.5 text-slate-500" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tips Card */}
            <Card className="bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
              <CardContent className="p-4 md:p-5">
                <h4 className="font-medium text-slate-700 dark:text-slate-300 text-sm mb-2">{t('warehouse:quickTips')}</h4>
                <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <li>• {t('warehouse:tip1')}</li>
                  <li>• {t('warehouse:tip2')}</li>
                  <li>• {t('warehouse:tip3')}</li>
                  <li>• {t('warehouse:tip4')}</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}

export type { UploadedFile };
