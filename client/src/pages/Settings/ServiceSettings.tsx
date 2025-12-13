import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Wrench, Save, Loader2, Plus, Trash2, Euro, DollarSign } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import type { ServiceTypeConfig } from "@/contexts/SettingsContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Default service types with prices (matching AddService.tsx service types)
const DEFAULT_SERVICE_TYPES: ServiceTypeConfig[] = [
  { id: 'hand_drill_repair', name: 'Hand Drill Repair', costEur: 15, costCzk: 375, enabled: true },
  { id: 'led_light_bulb_repair', name: 'LED Light Bulb Repair', costEur: 12, costCzk: 300, enabled: true },
  { id: 'nail_lamp_repair', name: 'Nail Lamp Repair', costEur: 18, costCzk: 450, enabled: true },
  { id: 'nail_drill_repair', name: 'Nail Drill Repair', costEur: 20, costCzk: 500, enabled: true },
  { id: 'uv_lamp_repair', name: 'UV Lamp Repair', costEur: 15, costCzk: 375, enabled: true },
  { id: 'electric_file_repair', name: 'Electric File Repair', costEur: 18, costCzk: 450, enabled: true },
  { id: 'sterilizer_repair', name: 'Sterilizer Repair', costEur: 22, costCzk: 550, enabled: true },
  { id: 'wax_warmer_repair', name: 'Wax Warmer Repair', costEur: 16, costCzk: 400, enabled: true },
  { id: 'pedicure_chair_repair', name: 'Pedicure Chair Repair', costEur: 45, costCzk: 1125, enabled: true },
  { id: 'massage_chair_repair', name: 'Massage Chair Repair', costEur: 50, costCzk: 1250, enabled: true },
  { id: 'vacuum_cleaner_repair', name: 'Vacuum Cleaner Repair', costEur: 20, costCzk: 500, enabled: true },
  { id: 'air_purifier_repair', name: 'Air Purifier Repair', costEur: 25, costCzk: 625, enabled: true },
  { id: 'general_equipment_repair', name: 'General Equipment Repair', costEur: 20, costCzk: 500, enabled: true },
  { id: 'installation_service', name: 'Installation Service', costEur: 30, costCzk: 750, enabled: true },
  { id: 'maintenance_service', name: 'Maintenance Service', costEur: 25, costCzk: 625, enabled: true },
  { id: 'consultation', name: 'Consultation', costEur: 35, costCzk: 875, enabled: true },
  { id: 'custom_service', name: 'Custom Service', costEur: 20, costCzk: 500, enabled: true },
];

export default function ServiceSettings() {
  const { t } = useTranslation(['settings', 'common', 'financial']);
  const { toast } = useToast();
  const { serviceSettings, isLoading } = useSettings();
  
  const [isSaving, setIsSaving] = useState(false);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeConfig[]>([]);
  const [defaultServiceCostEur, setDefaultServiceCostEur] = useState<number>(0);
  const [defaultServiceCostCzk, setDefaultServiceCostCzk] = useState<number>(0);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeCostEur, setNewTypeCostEur] = useState<number>(0);
  const [newTypeCostCzk, setNewTypeCostCzk] = useState<number>(0);

  useEffect(() => {
    if (serviceSettings) {
      // Use saved service types, or load defaults if none exist
      const savedTypes = serviceSettings.serviceTypes || [];
      setServiceTypes(savedTypes.length > 0 ? savedTypes : DEFAULT_SERVICE_TYPES);
      setDefaultServiceCostEur(serviceSettings.defaultServiceCostEur || 0);
      setDefaultServiceCostCzk(serviceSettings.defaultServiceCostCzk || 0);
    }
  }, [serviceSettings]);

  const handleLoadDefaults = () => {
    setServiceTypes(DEFAULT_SERVICE_TYPES);
    toast({
      title: t('common:success'),
      description: t('settings:defaultServiceTypesLoaded'),
    });
  };

  const handleAddServiceType = () => {
    if (!newTypeName.trim()) {
      toast({
        variant: "destructive",
        title: t('common:error'),
        description: t('settings:serviceTypeNameRequired'),
      });
      return;
    }

    if (serviceTypes.some(st => st.name.toLowerCase() === newTypeName.trim().toLowerCase())) {
      toast({
        variant: "destructive",
        title: t('common:error'),
        description: t('settings:serviceTypeAlreadyExists'),
      });
      return;
    }

    const newType: ServiceTypeConfig = {
      id: Math.random().toString(36).substr(2, 9),
      name: newTypeName.trim(),
      costEur: newTypeCostEur,
      costCzk: newTypeCostCzk,
      enabled: true,
    };

    setServiceTypes([...serviceTypes, newType]);
    setNewTypeName('');
    setNewTypeCostEur(0);
    setNewTypeCostCzk(0);
  };

  const handleRemoveServiceType = (id: string) => {
    setServiceTypes(serviceTypes.filter(st => st.id !== id));
  };

  const handleToggleServiceType = (id: string) => {
    setServiceTypes(serviceTypes.map(st => 
      st.id === id ? { ...st, enabled: !st.enabled } : st
    ));
  };

  const handleUpdateServiceTypeCost = (id: string, currency: 'eur' | 'czk', value: number) => {
    setServiceTypes(serviceTypes.map(st => 
      st.id === id 
        ? { ...st, [currency === 'eur' ? 'costEur' : 'costCzk']: value } 
        : st
    ));
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    
    try {
      const settingsToSave = [
        { key: 'service_types', value: JSON.stringify(serviceTypes), category: 'services' },
        { key: 'default_service_cost_eur', value: defaultServiceCostEur.toString(), category: 'services' },
        { key: 'default_service_cost_czk', value: defaultServiceCostCzk.toString(), category: 'services' },
      ];

      for (const setting of settingsToSave) {
        await apiRequest('POST', '/api/settings', setting);
      }

      await queryClient.invalidateQueries({ queryKey: ['/api/settings'] });

      toast({
        title: t('common:success'),
        description: t('settings:serviceSettingsSaved'),
      });
    } catch (error) {
      console.error('Error saving service settings:', error);
      toast({
        variant: "destructive",
        title: t('common:error'),
        description: t('settings:failedToSaveSettings'),
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-orange-500" />
            {t('settings:serviceTypesTitle')}
          </CardTitle>
          <CardDescription>
            {t('settings:serviceTypesDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="default-cost-eur" className="flex items-center gap-1">
                <Euro className="h-4 w-4" />
                {t('settings:defaultServiceCostEur')}
              </Label>
              <Input
                id="default-cost-eur"
                type="number"
                min={0}
                step={0.01}
                value={defaultServiceCostEur}
                onChange={(e) => setDefaultServiceCostEur(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                data-testid="input-default-service-cost-eur"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="default-cost-czk" className="flex items-center gap-1">
                <span className="text-sm font-medium">Kč</span>
                {t('settings:defaultServiceCostCzk')}
              </Label>
              <Input
                id="default-cost-czk"
                type="number"
                min={0}
                step={1}
                value={defaultServiceCostCzk}
                onChange={(e) => setDefaultServiceCostCzk(parseFloat(e.target.value) || 0)}
                placeholder="0"
                data-testid="input-default-service-cost-czk"
              />
            </div>
          </div>

          <div className="border-t pt-6">
            <h4 className="text-sm font-semibold mb-4">{t('settings:addNewServiceType')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-1">
                <Label htmlFor="new-type-name">{t('settings:serviceTypeName')}</Label>
                <Input
                  id="new-type-name"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder={t('settings:enterServiceTypeName')}
                  data-testid="input-new-service-type-name"
                />
              </div>
              <div>
                <Label htmlFor="new-type-cost-eur">{t('settings:costEur')}</Label>
                <Input
                  id="new-type-cost-eur"
                  type="number"
                  min={0}
                  step={0.01}
                  value={newTypeCostEur}
                  onChange={(e) => setNewTypeCostEur(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  data-testid="input-new-service-type-cost-eur"
                />
              </div>
              <div>
                <Label htmlFor="new-type-cost-czk">{t('settings:costCzk')}</Label>
                <Input
                  id="new-type-cost-czk"
                  type="number"
                  min={0}
                  step={1}
                  value={newTypeCostCzk}
                  onChange={(e) => setNewTypeCostCzk(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  data-testid="input-new-service-type-cost-czk"
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  onClick={handleAddServiceType}
                  className="w-full"
                  data-testid="button-add-service-type"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('common:add')}
                </Button>
              </div>
            </div>
          </div>

          {serviceTypes.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('settings:serviceTypeName')}</TableHead>
                    <TableHead className="text-right">{t('settings:costEur')}</TableHead>
                    <TableHead className="text-right">{t('settings:costCzk')}</TableHead>
                    <TableHead className="text-center">{t('common:enabled')}</TableHead>
                    <TableHead className="text-center w-[80px]">{t('common:actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serviceTypes.map((serviceType) => (
                    <TableRow key={serviceType.id} data-testid={`service-type-row-${serviceType.id}`}>
                      <TableCell className="font-medium">{serviceType.name}</TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={serviceType.costEur}
                            onChange={(e) => handleUpdateServiceTypeCost(serviceType.id, 'eur', parseFloat(e.target.value) || 0)}
                            className="w-24 text-right"
                            data-testid={`input-service-type-cost-eur-${serviceType.id}`}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            value={serviceType.costCzk}
                            onChange={(e) => handleUpdateServiceTypeCost(serviceType.id, 'czk', parseFloat(e.target.value) || 0)}
                            className="w-24 text-right"
                            data-testid={`input-service-type-cost-czk-${serviceType.id}`}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={serviceType.enabled}
                          onCheckedChange={() => handleToggleServiceType(serviceType.id)}
                          data-testid={`switch-service-type-enabled-${serviceType.id}`}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveServiceType(serviceType.id)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                          data-testid={`button-remove-service-type-${serviceType.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {serviceTypes.length === 0 && (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <Wrench className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">{t('settings:noServiceTypes')}</p>
              <p className="text-sm mb-4">{t('settings:addServiceTypeToStart')}</p>
              <Button
                type="button"
                variant="outline"
                onClick={handleLoadDefaults}
                data-testid="button-load-default-services"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('settings:loadDefaultServices')}
              </Button>
            </div>
          )}

          <div className="flex justify-between pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleLoadDefaults}
              data-testid="button-reset-to-defaults"
            >
              {t('settings:resetToDefaults')}
            </Button>
            <Button
              onClick={handleSaveSettings}
              disabled={isSaving}
              data-testid="button-save-service-settings"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {t('common:saveChanges')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
