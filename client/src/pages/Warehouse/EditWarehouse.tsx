import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  ArrowLeft, 
  Save, 
  Trash2, 
  FileUp, 
  Calendar, 
  Building2, 
  MapPin, 
  Package, 
  Phone,
  Mail,
  User,
  AlertCircle,
  Banknote,
  Settings,
  FileText,
  Hash,
  Ruler,
  Plus,
  Edit,
  ScrollText
} from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/currencyUtils";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  insertWarehouseFinancialContractSchema,
  type WarehouseFinancialContract,
  type InsertWarehouseFinancialContract,
  type Warehouse 
} from "@shared/schema";

type WarehouseFormData = {
  name: string;
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
  capacity?: number;
  type: "main" | "branch" | "temporary";
  floorArea?: number;
};

type ContractFormData = InsertWarehouseFinancialContract & {
  customBillingDays?: number;
};

export default function EditWarehouse() {
  const { t } = useTranslation(['warehouse', 'common']);
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<WarehouseFinancialContract | null>(null);
  const [deleteContractId, setDeleteContractId] = useState<string | null>(null);

  const warehouseSchema = z.object({
    name: z.string().min(1, t('warehouse:warehouseNameRequired')),
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
    capacity: z.number().min(0).optional(),
    type: z.enum(["main", "branch", "temporary"]).default("branch"),
    floorArea: z.number().min(0).optional(),
  });

  const contractFormSchema = insertWarehouseFinancialContractSchema.omit({ warehouseId: true }).extend({
    contractName: z.string().min(1, t('warehouse:contractNameRequired')),
    price: z.string().min(1, t('warehouse:priceRequired')),
    billingPeriod: z.enum(["monthly", "yearly", "quarterly", "custom"]),
    customBillingDays: z.number().optional(),
  }).refine((data) => {
    if (data.billingPeriod === "custom") {
      return !!data.customBillingDays && data.customBillingDays > 0;
    }
    return true;
  }, {
    message: t('warehouse:customBillingRequired'),
    path: ["customBillingDays"],
  });

  const { data: warehouse, isLoading } = useQuery<Warehouse>({
    queryKey: ['/api/warehouses', id],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/warehouses/${id}`);
      return await response.json();
    },
    enabled: !!id,
  });

  const { data: financialContracts = [], isLoading: contractsLoading } = useQuery({
    queryKey: ['/api/warehouses', id, 'financial-contracts'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/warehouses/${id}/financial-contracts`);
      return await response.json();
    },
    enabled: !!id,
  });

  const form = useForm<WarehouseFormData>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: {
      name: "",
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
      capacity: 0,
      type: "branch",
      floorArea: 0,
    },
  });

  const contractForm = useForm<ContractFormData>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      contractName: "",
      contractType: "rental",
      price: "0",
      currency: "CZK",
      billingPeriod: "monthly",
      customBillingDays: undefined,
      rentalDueDate: undefined,
      startDate: undefined,
      endDate: undefined,
      status: "active",
      notes: "",
    },
  });

  useEffect(() => {
    if (warehouse) {
      const warehouseData = warehouse as any;
      form.reset({
        name: warehouseData.name || "",
        location: warehouseData.location || "",
        status: (warehouseData.status as any) || "active",
        rentedFromDate: warehouseData.rented_from_date || warehouseData.rentedFromDate 
          ? new Date(warehouseData.rented_from_date || warehouseData.rentedFromDate).toISOString().split('T')[0] 
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
        capacity: warehouseData.capacity || 0,
        type: (warehouseData.type as any) || "branch",
        floorArea: (warehouseData.floor_area || warehouseData.floorArea) 
          ? parseFloat((warehouseData.floor_area || warehouseData.floorArea).toString()) 
          : 0,
      });
    }
  }, [warehouse]);

  const updateWarehouseMutation = useMutation({
    mutationFn: async (data: WarehouseFormData) => {
      const transformedData = {
        name: data.name,
        location: data.location,
        address: data.address,
        city: data.city,
        country: data.country,
        zip_code: data.zipCode,
        phone: data.phone,
        email: data.email,
        manager: data.manager,
        capacity: data.capacity,
        type: data.type,
        status: data.status,
        floor_area: data.floorArea?.toString(),
        notes: data.notes,
        contact: data.contact,
        rented_from_date: data.rentedFromDate || null,
        expense_id: data.expenseId ? parseInt(data.expenseId) : null,
      };
      const response = await apiRequest('PATCH', `/api/warehouses/${id}`, transformedData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/warehouses'] });
      toast({
        title: t('common:success'),
        description: t('warehouse:warehouseUpdatedSuccess'),
      });
      navigate("/warehouses");
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message || t('warehouse:warehouseUpdateError'),
        variant: "destructive",
      });
    },
  });

  const deleteWarehouseMutation = useMutation({
    mutationFn: () => apiRequest('DELETE', `/api/warehouses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/warehouses'] });
      toast({
        title: t('common:success'),
        description: t('warehouse:warehouseDeletedSuccess'),
      });
      navigate("/warehouses");
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message.includes('referenced') || error.message.includes('constraint')
          ? t('common:cannotDeleteInUse') 
          : error.message || t('warehouse:warehouseDeleteError'),
        variant: "destructive",
      });
    },
  });

  // Contract mutations
  const createContractMutation = useMutation({
    mutationFn: (data: ContractFormData) => {
      const dataWithWarehouseId = { ...data, warehouseId: id };
      return apiRequest('POST', `/api/warehouses/${id}/financial-contracts`, dataWithWarehouseId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/warehouses', id, 'financial-contracts'] });
      toast({
        title: t('common:success'),
        description: t('warehouse:contractCreatedSuccess'),
      });
      setContractDialogOpen(false);
      contractForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message || t('warehouse:contractCreateError'),
        variant: "destructive",
      });
    },
  });

  const updateContractMutation = useMutation({
    mutationFn: ({ contractId, data }: { contractId: string; data: Partial<ContractFormData> }) => {
      const dataWithWarehouseId = { ...data, warehouseId: id };
      return apiRequest('PATCH', `/api/financial-contracts/${contractId}`, dataWithWarehouseId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/warehouses', id, 'financial-contracts'] });
      toast({
        title: t('common:success'),
        description: t('warehouse:contractUpdatedSuccess'),
      });
      setContractDialogOpen(false);
      setEditingContract(null);
      contractForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message || t('warehouse:contractUpdateError'),
        variant: "destructive",
      });
    },
  });

  const deleteContractMutation = useMutation({
    mutationFn: (contractId: string) => 
      apiRequest('DELETE', `/api/financial-contracts/${contractId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/warehouses', id, 'financial-contracts'] });
      toast({
        title: t('common:success'),
        description: t('warehouse:contractDeletedSuccess'),
      });
      setDeleteContractId(null);
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message || t('warehouse:contractDeleteError'),
        variant: "destructive",
      });
    },
  });

  // Update contract form when editing
  useEffect(() => {
    if (editingContract) {
      contractForm.reset({
        contractName: editingContract.contractName || "",
        contractType: editingContract.contractType as any || "rental",
        price: editingContract.price?.toString() || "0",
        currency: editingContract.currency as any || "CZK",
        billingPeriod: editingContract.billingPeriod as any || "monthly",
        customBillingDays: editingContract.customBillingDays || undefined,
        rentalDueDate: editingContract.rentalDueDate ? new Date(editingContract.rentalDueDate).toISOString().split('T')[0] : undefined,
        startDate: editingContract.startDate ? new Date(editingContract.startDate).toISOString().split('T')[0] : undefined,
        endDate: editingContract.endDate ? new Date(editingContract.endDate).toISOString().split('T')[0] : undefined,
        status: editingContract.status as any || "active",
        notes: editingContract.notes || "",
      });
    }
  }, [editingContract]);

  const handleGetUploadParameters = async () => {
    const response = await apiRequest('POST', '/api/objects/upload');
    const data = await response.json();
    return {
      method: 'PUT' as const,
      url: data.uploadURL,
    };
  };

  const handleFileUploadComplete = (result: any) => {
    if (result.successful && result.successful.length > 0) {
      toast({
        title: t('common:success'),
        description: t('warehouse:filesUploadedSuccess'),
      });
    }
  };

  const onSubmit = (data: WarehouseFormData) => {
    updateWarehouseMutation.mutate(data);
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    deleteWarehouseMutation.mutate();
    setShowDeleteDialog(false);
  };

  // Contract handlers
  const handleAddContract = () => {
    setEditingContract(null);
    contractForm.reset();
    setContractDialogOpen(true);
  };

  const handleEditContract = (contract: WarehouseFinancialContract) => {
    setEditingContract(contract);
    setContractDialogOpen(true);
  };

  const handleDeleteContract = (contractId: string) => {
    setDeleteContractId(contractId);
  };

  const confirmDeleteContract = () => {
    if (deleteContractId) {
      deleteContractMutation.mutate(deleteContractId);
    }
  };

  const onContractSubmit = (data: ContractFormData) => {
    if (editingContract) {
      updateContractMutation.mutate({ 
        contractId: editingContract.id, 
        data 
      });
    } else {
      createContractMutation.mutate(data);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'expired': return 'destructive';
      case 'pending': return 'secondary';
      case 'cancelled': return 'outline';
      default: return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-6 bg-white dark:bg-slate-900">
        <div className="flex items-center justify-between border-b dark:border-gray-700 pb-4">
          <Skeleton className="h-10 w-48" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
          </div>
        </div>
        
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64 mt-2" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64 mt-2" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!warehouse) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-600">{t('warehouse:warehouseNotFound')}</p>
        <Button className="mt-4" onClick={() => window.history.back()}>
          {t('warehouse:backToWarehouses')}
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4 md:space-y-6">
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
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={warehouse?.status === 'active' ? 'default' : 'secondary'} className="text-xs">
            {t(`common:${warehouse?.status || 'active'}`)}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {t(`warehouse:type.${warehouse?.type || 'branch'}`)}
          </Badge>
        </div>
      </div>

      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{warehouse?.name || t('warehouse:editWarehouse')}</h1>
        <p className="text-sm md:text-base text-slate-600 mt-1">{t('warehouse:editWarehouseDesc')}</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Main Column - 2/3 width */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <Building2 className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
                  {t('warehouse:basicInformation')}
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">{t('warehouse:basicInformationDesc')}</CardDescription>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="capacity">{t('warehouse:storageCapacity')}</Label>
                    <div className="relative mt-1">
                      <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="capacity"
                        type="number"
                        {...form.register("capacity", { valueAsNumber: true })}
                        placeholder={t('warehouse:capacityPlaceholder')}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="floorArea">{t('warehouse:floorAreaM2')}</Label>
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
                </div>
              </CardContent>
            </Card>

            {/* Location Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-green-600" />
                  {t('warehouse:locationAddress')}
                </CardTitle>
                <CardDescription>{t('warehouse:locationDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="address">{t('warehouse:streetAddress')}</Label>
                  <Input
                    id="address"
                    {...form.register("address")}
                    placeholder={t('warehouse:addressPlaceholder')}
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">{t('warehouse:city')}</Label>
                    <Input
                      id="city"
                      {...form.register("city")}
                      placeholder={t('warehouse:cityPlaceholder')}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="zipCode">{t('warehouse:zipPostalCode')}</Label>
                    <Input
                      id="zipCode"
                      {...form.register("zipCode")}
                      placeholder={t('warehouse:zipPlaceholder')}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="country">{t('warehouse:country')}</Label>
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
                    <Label htmlFor="phone">{t('warehouse:phoneNumber')}</Label>
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
                    <Label htmlFor="email">{t('warehouse:emailAddress')}</Label>
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

            {/* Financial Contracts */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ScrollText className="h-5 w-5 text-orange-600" />
                      {t('warehouse:financialContracts')}
                    </CardTitle>
                    <CardDescription>{t('warehouse:manageFinancialAgreements')}</CardDescription>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddContract}
                    data-testid="button-add-contract"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('warehouse:addContract')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {contractsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (financialContracts as WarehouseFinancialContract[]).length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg">
                    <ScrollText className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-600 font-medium">{t('warehouse:noFinancialContractsFound')}</p>
                    <p className="text-sm text-slate-500 mt-1">{t('warehouse:addFirstContractFinancial')}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(financialContracts as WarehouseFinancialContract[]).map((contract: WarehouseFinancialContract) => (
                      <Card key={contract.id} className="border-slate-200" data-testid={`card-contract-${contract.id}`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-base font-semibold text-slate-900" data-testid={`text-contract-name-${contract.id}`}>
                                {contract.contractName}
                              </CardTitle>
                              <p className="text-sm text-slate-500 mt-1 capitalize" data-testid={`text-contract-type-${contract.id}`}>
                                {contract.contractType}
                              </p>
                            </div>
                            <Badge variant={getStatusBadgeVariant(contract.status || 'active')} data-testid={`badge-status-${contract.id}`}>
                              {contract.status || 'active'}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-600">{t('warehouse:amount')}</span>
                              <span className="font-semibold text-slate-900" data-testid={`text-contract-price-${contract.id}`}>
                                {contract.price} {contract.currency}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-600">{t('warehouse:billingLabel')}</span>
                              <span className="text-slate-900" data-testid={`text-contract-billing-${contract.id}`}>
                                {contract.billingPeriod === 'custom' 
                                  ? t('warehouse:everyXDays', { days: contract.customBillingDays })
                                  : contract.billingPeriod}
                              </span>
                            </div>
                            {contract.rentalDueDate && (
                              <div className="flex items-center justify-between">
                                <span className="text-slate-600">{t('warehouse:dueDate')}</span>
                                <span className="text-slate-900" data-testid={`text-contract-due-${contract.id}`}>
                                  {formatDate(contract.rentalDueDate)}
                                </span>
                              </div>
                            )}
                            {contract.startDate && (
                              <div className="flex items-center justify-between">
                                <span className="text-slate-600">{t('warehouse:start')}</span>
                                <span className="text-slate-900" data-testid={`text-contract-start-${contract.id}`}>
                                  {formatDate(contract.startDate)}
                                </span>
                              </div>
                            )}
                            {contract.endDate && (
                              <div className="flex items-center justify-between">
                                <span className="text-slate-600">{t('warehouse:end')}</span>
                                <span className="text-slate-900" data-testid={`text-contract-end-${contract.id}`}>
                                  {formatDate(contract.endDate)}
                                </span>
                              </div>
                            )}
                            {contract.notes && (
                              <div className="pt-2 border-t">
                                <p className="text-slate-600 text-xs line-clamp-2" data-testid={`text-contract-notes-${contract.id}`}>
                                  {contract.notes}
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 pt-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => handleEditContract(contract)}
                              data-testid={`button-edit-contract-${contract.id}`}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              {t('common:edit')}
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="flex-1"
                              onClick={() => handleDeleteContract(contract.id)}
                              data-testid={`button-delete-contract-${contract.id}`}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              {t('common:delete')}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Internal Notes - Separate from contract notes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-slate-600" />
                  {t('warehouse:internalNotes')}
                </CardTitle>
                <CardDescription>{t('warehouse:generalWarehouseNotes')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="location">{t('warehouse:locationCode')}</Label>
                  <Input
                    id="location"
                    {...form.register("location")}
                    placeholder={t('warehouse:locationCodePlaceholder')}
                    className="mt-1"
                    data-testid="input-location"
                  />
                </div>

                <div>
                  <Label htmlFor="notes">{t('common:notes')}</Label>
                  <Textarea
                    id="notes"
                    {...form.register("notes")}
                    placeholder={t('warehouse:notesPlaceholder')}
                    className="min-h-[120px] mt-1"
                    data-testid="input-notes"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - 1/3 width */}
          <div className="space-y-6">
            {/* File Upload Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-600" />
                  {t('warehouse:documents')}
                </CardTitle>
                <CardDescription>{t('warehouse:documentsDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
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
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-gray-600" />
                  {t('warehouse:actions')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={updateWarehouseMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateWarehouseMutation.isPending ? t('warehouse:saving') : t('warehouse:saveChanges')}
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

                <Button 
                  type="button"
                  variant="destructive" 
                  className="w-full"
                  onClick={handleDelete}
                  disabled={deleteWarehouseMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('warehouse:deleteWarehouseButton')}
                </Button>

                {/* Status Info */}
                <div className="pt-3 space-y-2 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    <span>{t('warehouse:created')} {warehouse?.createdAt ? formatDate(warehouse.createdAt) : t('warehouse:never')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>

      {/* Contract Dialog */}
      <Dialog open={contractDialogOpen} onOpenChange={setContractDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingContract ? t('warehouse:editFinancialContract') : t('warehouse:addFinancialContract')}
            </DialogTitle>
            <DialogDescription>
              {editingContract 
                ? t('warehouse:updateContractDetails')
                : t('warehouse:createNewContractForWarehouse')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={contractForm.handleSubmit(onContractSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="contractName">{t('warehouse:contractNameLabel')}</Label>
                <Input
                  id="contractName"
                  {...contractForm.register("contractName")}
                  placeholder={t('warehouse:contractNamePlaceholder')}
                  className="mt-1"
                  data-testid="input-contract-name"
                />
                {contractForm.formState.errors.contractName && (
                  <p className="text-sm text-red-600 mt-1">{contractForm.formState.errors.contractName.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="contractType">{t('warehouse:contractTypeLabel')}</Label>
                <Select 
                  value={contractForm.watch("contractType")} 
                  onValueChange={(value) => contractForm.setValue("contractType", value as any)}
                >
                  <SelectTrigger className="mt-1" data-testid="select-contract-type">
                    <SelectValue placeholder={t('common:selectContractType')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rental">{t('warehouse:rental')}</SelectItem>
                    <SelectItem value="lease">{t('warehouse:lease')}</SelectItem>
                    <SelectItem value="purchase">{t('warehouse:purchase')}</SelectItem>
                    <SelectItem value="maintenance">{t('warehouse:maintenanceContract')}</SelectItem>
                    <SelectItem value="utilities">{t('warehouse:utilities')}</SelectItem>
                    <SelectItem value="other">{t('warehouse:other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">{t('warehouse:statusLabel')}</Label>
                <Select 
                  value={contractForm.watch("status") || "active"} 
                  onValueChange={(value) => contractForm.setValue("status", value as any)}
                >
                  <SelectTrigger className="mt-1" data-testid="select-contract-status">
                    <SelectValue placeholder={t('warehouse:selectStatusPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t('common:active')}</SelectItem>
                    <SelectItem value="expired">{t('common:expired')}</SelectItem>
                    <SelectItem value="pending">{t('common:pending')}</SelectItem>
                    <SelectItem value="cancelled">{t('common:cancelled')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="price">{t('warehouse:priceAmountLabel')}</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  {...contractForm.register("price")}
                  placeholder={t('warehouse:pricePlaceholder')}
                  className="mt-1"
                  data-testid="input-contract-price"
                />
                {contractForm.formState.errors.price && (
                  <p className="text-sm text-red-600 mt-1">{contractForm.formState.errors.price.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="currency">{t('warehouse:currencyLabel')}</Label>
                <Select 
                  value={contractForm.watch("currency")} 
                  onValueChange={(value) => contractForm.setValue("currency", value as any)}
                >
                  <SelectTrigger className="mt-1" data-testid="select-contract-currency">
                    <SelectValue placeholder={t('common:selectCurrency')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CZK">CZK</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="VND">VND</SelectItem>
                    <SelectItem value="CNY">CNY</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="billingPeriod">{t('warehouse:billingPeriodLabel')}</Label>
                <Select 
                  value={contractForm.watch("billingPeriod")} 
                  onValueChange={(value) => contractForm.setValue("billingPeriod", value as any)}
                >
                  <SelectTrigger className="mt-1" data-testid="select-billing-period">
                    <SelectValue placeholder={t('common:selectBillingPeriod')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">{t('common:monthly')}</SelectItem>
                    <SelectItem value="yearly">{t('common:yearly')}</SelectItem>
                    <SelectItem value="quarterly">{t('common:quarterly')}</SelectItem>
                    <SelectItem value="custom">{t('common:custom')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {contractForm.watch("billingPeriod") === "custom" && (
                <div>
                  <Label htmlFor="customBillingDays">{t('warehouse:customBillingDaysLabel')}</Label>
                  <Input
                    id="customBillingDays"
                    type="number"
                    {...contractForm.register("customBillingDays", { valueAsNumber: true })}
                    placeholder={t('warehouse:customBillingDaysPlaceholder')}
                    className="mt-1"
                    data-testid="input-custom-billing-days"
                  />
                  {contractForm.formState.errors.customBillingDays && (
                    <p className="text-sm text-red-600 mt-1">{contractForm.formState.errors.customBillingDays.message}</p>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="rentalDueDate">{t('warehouse:rentalDueDateLabel')}</Label>
                <Input
                  id="rentalDueDate"
                  type="date"
                  {...contractForm.register("rentalDueDate")}
                  className="mt-1"
                  data-testid="input-rental-due-date"
                />
              </div>

              <div>
                <Label htmlFor="startDate">{t('warehouse:startDateLabel')}</Label>
                <Input
                  id="startDate"
                  type="date"
                  {...contractForm.register("startDate")}
                  className="mt-1"
                  data-testid="input-start-date"
                />
              </div>

              <div>
                <Label htmlFor="endDate">{t('warehouse:endDateLabel')}</Label>
                <Input
                  id="endDate"
                  type="date"
                  {...contractForm.register("endDate")}
                  className="mt-1"
                  data-testid="input-end-date"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="contractNotes">{t('common:notes')}</Label>
                <Textarea
                  id="contractNotes"
                  {...contractForm.register("notes")}
                  placeholder={t('warehouse:contractNotesPlaceholder')}
                  className="min-h-[100px] mt-1"
                  data-testid="input-contract-notes"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setContractDialogOpen(false);
                  setEditingContract(null);
                  contractForm.reset();
                }}
                data-testid="button-cancel-contract"
              >
                {t('common:cancel')}
              </Button>
              <Button
                type="submit"
                disabled={createContractMutation.isPending || updateContractMutation.isPending}
                data-testid="button-save-contract"
              >
                {(createContractMutation.isPending || updateContractMutation.isPending) 
                  ? t('warehouse:saving')
                  : editingContract ? t('warehouse:updateContractButton') : t('warehouse:createContractButton')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Contract Dialog */}
      <AlertDialog open={!!deleteContractId} onOpenChange={() => setDeleteContractId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('warehouse:deleteFinancialContractTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('warehouse:deleteContractConfirmMessage')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteContract}
              className="bg-red-600 hover:bg-red-700"
            >
              {t('common:delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Warehouse Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('warehouse:deleteWarehouseTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('warehouse:deleteWarehouseConfirm')}
              {' '}
              {t('warehouse:deleteWarehouseDataWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {t('common:delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}