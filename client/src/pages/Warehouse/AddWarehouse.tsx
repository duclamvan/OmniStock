import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from 'react-i18next';
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { WarehouseForm, WarehouseFormData, UploadedFile } from "@/components/warehouse/WarehouseForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollText, Save } from "lucide-react";

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
        expense_id: data.expenseId || null,
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

  // Financial Contracts Section - shows placeholder since warehouse doesn't exist yet
  const financialContractsSection = (
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
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50/50">
          <Save className="h-12 w-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">{t('warehouse:saveWarehouseFirst')}</p>
          <p className="text-sm text-slate-500 mt-1">{t('warehouse:contractsAvailableAfterSave')}</p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <WarehouseForm
      mode="add"
      onSubmit={handleSubmit}
      isSubmitting={createWarehouseMutation.isPending}
      onCancel={() => navigate("/warehouses")}
    >
      {financialContractsSection}
    </WarehouseForm>
  );
}
