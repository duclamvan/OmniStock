import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useSettings } from '@/contexts/SettingsContext';
import { useToast } from '@/hooks/use-toast';
import i18n from '@/i18n';

export interface UpdateSettingParams {
  key: string;
  value: any;
  category: string;
}

/**
 * Hook that provides easy access to all settings with mutation support
 * 
 * @example
 * ```tsx
 * const { inventorySettings, orderSettings, updateSetting } = useAppSettings();
 * 
 * // Access settings with fallbacks
 * const lowStockThreshold = inventorySettings.lowStockThreshold || 10;
 * const defaultCurrency = orderSettings.defaultCurrency || 'CZK';
 * 
 * // Update a setting
 * updateSetting.mutate({
 *   key: 'low_stock_threshold',
 *   value: 15,
 *   category: 'inventory'
 * });
 * ```
 */
export function useAppSettings() {
  const { toast } = useToast();
  const settingsContext = useSettings();

  // Mutation for updating settings
  const updateSetting = useMutation({
    mutationFn: async (params: UpdateSettingParams) => {
      return await apiRequest('POST', '/api/settings', params);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({
        title: i18n.t('system:settingUpdated'),
        description: i18n.t('system:settingUpdatedSuccess', { key: variables.key }),
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: i18n.t('common:error'),
        description: error.message || i18n.t('system:failedToUpdateSetting'),
      });
    },
  });

  // Batch update mutation for multiple settings
  const updateSettings = useMutation({
    mutationFn: async (params: UpdateSettingParams[]) => {
      const promises = params.map(param =>
        apiRequest('POST', '/api/settings', param)
      );
      return await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({
        title: i18n.t('system:settingsUpdated'),
        description: i18n.t('system:allSettingsUpdatedSuccess'),
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: i18n.t('common:error'),
        description: error.message || i18n.t('system:failedToUpdateSettings'),
      });
    },
  });

  return {
    ...settingsContext,
    updateSetting,
    updateSettings,
  };
}

// Convenience hook for inventory-specific settings
export function useInventoryDefaults() {
  const { inventorySettings } = useAppSettings();
  
  return {
    defaultWarehouse: inventorySettings.defaultWarehouse && inventorySettings.defaultWarehouse !== 'none' 
      ? inventorySettings.defaultWarehouse 
      : undefined,
    lowStockThreshold: inventorySettings.lowStockThreshold ?? 10,
    defaultProductType: inventorySettings.defaultProductType ?? 'regular',
    enableBarcodeScanning: inventorySettings.enableBarcodeScanning ?? true,
    autoGenerateSku: inventorySettings.autoGenerateSku ?? false,
    skuPrefix: inventorySettings.skuPrefix ?? '',
    defaultPackagingRequirement: inventorySettings.defaultPackagingRequirement ?? 'carton',
    allowNegativeStock: inventorySettings.allowNegativeStock ?? false,
    stockAdjustmentApprovalRequired: inventorySettings.stockAdjustmentApprovalRequired ?? false,
  };
}

// Convenience hook for order-specific settings
export function useOrderDefaults() {
  const { orderSettings, generalSettings } = useAppSettings();
  
  return {
    defaultCurrency: orderSettings.defaultPaymentMethod ? generalSettings.defaultCurrency : (generalSettings.defaultCurrency ?? 'CZK'),
    defaultPaymentMethod: orderSettings.defaultPaymentMethod ?? 'Transfer',
    defaultOrderStatus: orderSettings.defaultOrderStatus ?? 'pending',
    defaultPaymentStatus: orderSettings.defaultPaymentStatus ?? 'pending',
    defaultCarrier: orderSettings.defaultCarrier ?? 'GLS',
    defaultCommunicationChannel: orderSettings.defaultCommunicationChannel ?? 'E-mail',
    defaultDiscountType: orderSettings.defaultDiscountType ?? 'flat',
    autoCalculateShipping: orderSettings.autoCalculateShipping ?? false,
    enableCod: orderSettings.enableCod ?? true,
    defaultCodCurrency: orderSettings.defaultCodCurrency ?? 'CZK',
    requireShippingAddress: orderSettings.requireShippingAddress ?? true,
    minimumOrderValue: orderSettings.minimumOrderValue ?? 0,
  };
}

// Convenience hook for shipping-specific settings
export function useShippingDefaults() {
  const { shippingSettings, orderSettings } = useAppSettings();
  
  return {
    defaultCarrier: shippingSettings.defaultCarrier ?? orderSettings.defaultCarrier ?? 'GLS',
    autoGenerateLabels: shippingSettings.autoGenerateLabels ?? false,
    defaultLabelFormat: shippingSettings.defaultLabelFormat ?? 'A4',
    trackingNotifications: shippingSettings.trackingNotifications ?? false,
    requireSignature: shippingSettings.requireSignature ?? false,
  };
}

// Convenience hook for financial settings
export function useFinancialDefaults() {
  const { financialSettings, generalSettings } = useAppSettings();
  
  return {
    defaultCurrency: financialSettings.defaultCurrency ?? generalSettings.defaultCurrency ?? 'CZK',
    vatRate: financialSettings.vatRate ?? 0,
    enableMultiCurrency: financialSettings.enableMultiCurrency ?? false,
    defaultPriceMargin: financialSettings.defaultPriceMargin ?? 0,
  };
}
