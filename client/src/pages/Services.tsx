import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDate } from "@/lib/currencyUtils";
import { Plus, Wrench, Trash2, Edit, ChevronDown, ChevronUp, Tag } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Service {
  id: string;
  name: string;
  description: string | null;
  priceCzk: string | null;
  priceEur: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function Services() {
  const { t } = useTranslation(['system']);
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deleteServiceId, setDeleteServiceId] = useState<string | null>(null);
  const [isServiceTypesOpen, setIsServiceTypesOpen] = useState(() => {
    const saved = localStorage.getItem('serviceTypesExpanded');
    return saved === null ? true : saved === 'true';
  });
  const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<any>(null);
  const [deleteTypeId, setDeleteTypeId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    priceCzk: "",
    priceEur: "",
  });
  
  const [typeFormData, setTypeFormData] = useState({
    name: "",
    description: "",
    color: "#3B82F6",
  });

  const { data: services, isLoading } = useQuery<Service[]>({
    queryKey: ['/api/services'],
  });
  
  const { data: serviceTypes = [], isLoading: typesLoading } = useQuery<any[]>({
    queryKey: ['/api/service-types'],
  });

  const createServiceMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest('POST', '/api/services', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: t('system:success'),
        description: t('system:serviceCreatedSuccessfully'),
      });
    },
    onError: () => {
      toast({
        title: t('system:error'),
        description: t('system:failedToCreateService'),
        variant: "destructive",
      });
    },
  });

  const updateServiceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      return await apiRequest('PATCH', `/api/services/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      setIsDialogOpen(false);
      setEditingService(null);
      resetForm();
      toast({
        title: t('system:success'),
        description: t('system:serviceUpdatedSuccessfully'),
      });
    },
    onError: () => {
      toast({
        title: t('system:error'),
        description: t('system:failedToUpdateService'),
        variant: "destructive",
      });
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/services/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      setDeleteServiceId(null);
      toast({
        title: t('system:success'),
        description: t('system:serviceDeletedSuccessfully'),
      });
    },
    onError: () => {
      toast({
        title: t('system:error'),
        description: t('system:failedToDeleteService'),
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      priceCzk: "",
      priceEur: "",
    });
  };
  
  const resetTypeForm = () => {
    setTypeFormData({
      name: "",
      description: "",
      color: "#3B82F6",
    });
  };
  
  const toggleServiceTypes = () => {
    const newValue = !isServiceTypesOpen;
    setIsServiceTypesOpen(newValue);
    localStorage.setItem('serviceTypesExpanded', String(newValue));
  };
  
  // Service Type Mutations
  const createTypeMutation = useMutation({
    mutationFn: async (data: typeof typeFormData) => {
      return await apiRequest('POST', '/api/service-types', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-types'] });
      setIsTypeDialogOpen(false);
      resetTypeForm();
      toast({
        title: t('system:success'),
        description: t('system:serviceTypeCreatedSuccessfully'),
      });
    },
    onError: () => {
      toast({
        title: t('system:error'),
        description: t('system:failedToCreateServiceType'),
        variant: "destructive",
      });
    },
  });
  
  const updateTypeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof typeFormData }) => {
      return await apiRequest('PATCH', `/api/service-types/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-types'] });
      setIsTypeDialogOpen(false);
      setEditingType(null);
      resetTypeForm();
      toast({
        title: t('system:success'),
        description: t('system:serviceTypeUpdatedSuccessfully'),
      });
    },
    onError: () => {
      toast({
        title: t('system:error'),
        description: t('system:failedToUpdateServiceType'),
        variant: "destructive",
      });
    },
  });
  
  const deleteTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/service-types/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-types'] });
      setDeleteTypeId(null);
      toast({
        title: t('system:success'),
        description: t('system:serviceTypeDeletedSuccessfully'),
      });
    },
    onError: () => {
      toast({
        title: t('system:error'),
        description: t('system:failedToDeleteServiceType'),
        variant: "destructive",
      });
    },
  });
  
  const handleTypeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingType) {
      updateTypeMutation.mutate({ id: editingType.id, data: typeFormData });
    } else {
      createTypeMutation.mutate(typeFormData);
    }
  };
  
  const handleEditType = (type: any) => {
    setEditingType(type);
    setTypeFormData({
      name: type.name,
      description: type.description || "",
      color: type.color || "#3B82F6",
    });
    setIsTypeDialogOpen(true);
  };
  
  const handleAddNewType = () => {
    setEditingType(null);
    resetTypeForm();
    setIsTypeDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingService) {
      updateServiceMutation.mutate({ id: editingService.id, data: formData });
    } else {
      createServiceMutation.mutate(formData);
    }
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || "",
      priceCzk: service.priceCzk || "",
      priceEur: service.priceEur || "",
    });
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingService(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const formatPrice = (price: string | null, currency: string) => {
    if (!price) return "—";
    const amount = parseFloat(price);
    return `${amount.toFixed(2)} ${currency}`;
  };

  return (
    <div className="space-y-6 overflow-x-hidden p-2 sm:p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{t('system:services')}</h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{t('system:manageServicesRepairsMaintenance')}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddNew} className="w-full sm:w-auto" data-testid="button-add-service">
              <Plus className="h-4 w-4 mr-2" />
              {t('system:addService')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingService ? t('system:editService') : t('system:addNewService')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">{t('system:serviceName')} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('system:serviceNamePlaceholder')}
                  required
                  data-testid="input-service-name"
                />
              </div>

              <div>
                <Label htmlFor="description">{t('system:serviceDescription')}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t('system:serviceDetailsPlaceholder')}
                  rows={3}
                  data-testid="input-service-description"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priceCzk">{t('system:priceCZK')}</Label>
                  <Input
                    id="priceCzk"
                    type="number"
                    step="0.01"
                    value={formData.priceCzk}
                    onChange={(e) => setFormData({ ...formData, priceCzk: e.target.value })}
                    placeholder="0.00"
                    data-testid="input-service-price-czk"
                  />
                </div>
                <div>
                  <Label htmlFor="priceEur">{t('system:priceEUR')}</Label>
                  <Input
                    id="priceEur"
                    type="number"
                    step="0.01"
                    value={formData.priceEur}
                    onChange={(e) => setFormData({ ...formData, priceEur: e.target.value })}
                    placeholder="0.00"
                    data-testid="input-service-price-eur"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingService(null);
                    resetForm();
                  }}
                >
                  {t('system:cancel')}
                </Button>
                <Button type="submit" className="w-full sm:flex-1" data-testid="button-save-service">
                  {editingService ? t('system:updateService') : t('system:createService')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Service Types Section - Collapsible */}
      <Collapsible open={isServiceTypesOpen} onOpenChange={toggleServiceTypes}>
        <Card className="bg-white dark:bg-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="p-0 hover:bg-transparent">
                  <div className="flex items-center gap-2">
                    <Tag className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    <CardTitle className="text-lg">{t('system:serviceTypes')}</CardTitle>
                    {isServiceTypesOpen ? (
                      <ChevronUp className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    )}
                  </div>
                </Button>
              </CollapsibleTrigger>
              <Dialog open={isTypeDialogOpen} onOpenChange={setIsTypeDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={handleAddNewType} className="w-full sm:w-auto" data-testid="button-add-service-type">
                    <Plus className="h-4 w-4 mr-2" />
                    {t('system:addType')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editingType ? t('system:editServiceType') : t('system:addNewServiceType')}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleTypeSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="type-name">{t('system:typeName')} *</Label>
                      <Input
                        id="type-name"
                        value={typeFormData.name}
                        onChange={(e) => setTypeFormData({ ...typeFormData, name: e.target.value })}
                        placeholder={t('system:typeNamePlaceholder')}
                        required
                        data-testid="input-type-name"
                      />
                    </div>

                    <div>
                      <Label htmlFor="type-description">{t('system:typeDescription')}</Label>
                      <Textarea
                        id="type-description"
                        value={typeFormData.description}
                        onChange={(e) => setTypeFormData({ ...typeFormData, description: e.target.value })}
                        placeholder={t('system:typeDescriptionPlaceholder')}
                        rows={2}
                        data-testid="input-type-description"
                      />
                    </div>

                    <div>
                      <Label htmlFor="type-color">{t('system:color')}</Label>
                      <div className="flex gap-2">
                        <Input
                          id="type-color"
                          type="color"
                          value={typeFormData.color}
                          onChange={(e) => setTypeFormData({ ...typeFormData, color: e.target.value })}
                          className="w-20 h-10"
                          data-testid="input-type-color"
                        />
                        <Input
                          type="text"
                          value={typeFormData.color}
                          onChange={(e) => setTypeFormData({ ...typeFormData, color: e.target.value })}
                          placeholder="#3B82F6"
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={() => {
                          setIsTypeDialogOpen(false);
                          setEditingType(null);
                          resetTypeForm();
                        }}
                      >
                        {t('system:cancel')}
                      </Button>
                      <Button type="submit" className="w-full sm:flex-1" data-testid="button-save-type">
                        {editingType ? t('system:updateType') : t('system:createType')}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              {typesLoading ? (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">{t('system:loadingServiceTypes')}</div>
              ) : serviceTypes.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Tag className="h-8 w-8 mx-auto mb-2 text-gray-400 dark:text-gray-600" />
                  <p>{t('system:noServiceTypesYet')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {serviceTypes.map((type) => (
                    <div
                      key={type.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-700/30 hover:shadow-md transition-shadow"
                      data-testid={`service-type-${type.id}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: type.color }}
                          />
                          <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                            {type.name}
                          </span>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleEditType(type)}
                            data-testid={`button-edit-type-${type.id}`}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30"
                            onClick={() => setDeleteTypeId(type.id)}
                            data-testid={`button-delete-type-${type.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {type.description && (
                        <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">{type.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Services List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400">{t('system:loadingServices')}</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services && services.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Wrench className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500 text-center">
                  {t('system:noServicesYet')}
                </p>
              </CardContent>
            </Card>
          ) : (
            services?.map((service) => (
              <Card key={service.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-5 w-5 text-blue-600" />
                      <CardTitle className="text-lg">{service.name}</CardTitle>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(service)}
                        data-testid={`button-edit-service-${service.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDeleteServiceId(service.id)}
                        data-testid={`button-delete-service-${service.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {service.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">{service.description}</p>
                  )}
                  
                  <div className="space-y-2">
                    <div className="flex gap-2 pt-2">
                      {service.priceCzk && (
                        <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
                          {formatPrice(service.priceCzk, "CZK")}
                        </Badge>
                      )}
                      {service.priceEur && (
                        <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">
                          {formatPrice(service.priceEur, "EUR")}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      <AlertDialog open={!!deleteServiceId} onOpenChange={() => setDeleteServiceId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('system:deleteService')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('system:deleteServiceConfirmation')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('system:cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteServiceId && deleteServiceMutation.mutate(deleteServiceId)}
            >
              {t('system:delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTypeId} onOpenChange={() => setDeleteTypeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('system:deleteServiceType')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('system:deleteServiceTypeConfirmation')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('system:cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteTypeId && deleteTypeMutation.mutate(deleteTypeId)}
            >
              {t('system:delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
