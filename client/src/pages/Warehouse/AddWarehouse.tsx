import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from 'react-i18next';
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { WarehouseForm, WarehouseFormData, UploadedFile } from "@/components/warehouse/WarehouseForm";

export default function AddWarehouse() {
  const { t } = useTranslation(['warehouse', 'common']);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const createWarehouseMutation = useMutation({
    mutationFn: async ({ data, uploadedFiles }: { data: WarehouseFormData; uploadedFiles: UploadedFile[] }) => {
      const transformedData = {
        name: data.name,
        code: data.code,
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
      const response = await apiRequest('POST', '/api/warehouses', transformedData);
      const warehouse = await response.json();
      
      // Save uploaded files to the warehouse
      const completedFiles = uploadedFiles.filter(f => f.status === 'complete' && f.url);
      for (const file of completedFiles) {
        await apiRequest('POST', `/api/warehouses/${warehouse.id}/files`, {
          fileName: file.name,
          fileType: file.type,
          fileUrl: file.url,
          fileSize: file.size,
        });
      }
      
      return warehouse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/warehouses'] });
      toast({
        title: t('common:success'),
        description: t('warehouse:warehouseCreated'),
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

  const handleSubmit = (data: WarehouseFormData, uploadedFiles: UploadedFile[]) => {
    createWarehouseMutation.mutate({ data, uploadedFiles });
  };

  return (
    <WarehouseForm
      mode="add"
      onSubmit={handleSubmit}
      isSubmitting={createWarehouseMutation.isPending}
      onCancel={() => navigate("/warehouses")}
    />
  );
}
