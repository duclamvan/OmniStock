import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { computePlanChecksum } from '@shared/schema';
import i18n from '@/i18n';

interface PackingItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  price: number;
}

interface PackingPlan {
  totalCartons: number;
  totalWeight: number;
  avgUtilization: number;
  estimatedShippingCost: number;
  suggestions: string[];
  cartons: Array<{
    cartonName: string;
    cartonId?: string;
    cartonNumber?: number;
    dimensions: string;
    weight: number;
    utilization: number;
    items: Array<{
      productId?: string;
      productName: string;
      name?: string;
      quantity: number;
      weight: number;
      isEstimated: boolean;
    }>;
    fillingWeight?: number;
    unusedVolume?: number;
  }>;
}

export function usePackingOptimization(
  orderId?: string, 
  enableAiCartonPacking: boolean = false
) {
  const { toast } = useToast();
  const [packingPlan, setPackingPlan] = useState<PackingPlan | null>(null);
  const serverChecksumRef = useRef<string | null>(null);
  const hydratingRef = useRef(false);

  // Load saved plan via useQuery - only if AI is enabled
  const queryResult = useQuery({
    queryKey: ['/api/orders', orderId, 'packing-plan'],
    enabled: !!orderId && enableAiCartonPacking,
  });
  
  const { data: savedPlan, isFetching } = queryResult;
  // Detect restore cycles: when data is from cache (not actively fetching)
  const isRestoring = queryResult.isLoading === false && queryResult.isFetching === false && queryResult.isRefetching === false;

  // Hydration with restore cycle detection
  useLayoutEffect(() => {
    // Skip hydration when AI is disabled
    if (!enableAiCartonPacking) {
      return;
    }
    
    if (!savedPlan || isFetching) return;
    
    if (!packingPlan) {
      // Initial load
      hydratingRef.current = true;
      setPackingPlan(savedPlan.plan);
      serverChecksumRef.current = savedPlan.checksum;
    } else {
      // Query refreshed - just update checksum if it matches
      const currentChecksum = computePlanChecksum(packingPlan);
      if (currentChecksum === savedPlan.checksum) {
        serverChecksumRef.current = savedPlan.checksum;
      }
    }
  }, [savedPlan, isFetching, isRestoring, packingPlan, enableAiCartonPacking]);

  // Separate effect to clear hydrating flag AFTER state commits
  useEffect(() => {
    if (packingPlan && hydratingRef.current) {
      // State has committed, safe to clear flag
      hydratingRef.current = false;
    }
  }, [packingPlan]);

  // Clear all AI data when AI is disabled
  useEffect(() => {
    if (!enableAiCartonPacking) {
      setPackingPlan(null);
      serverChecksumRef.current = null;
    }
  }, [enableAiCartonPacking]);

  // Auto-save mutation
  const savePackingPlanMutation = useMutation({
    mutationFn: async (params: PackingPlan | { planData: PackingPlan; orderIdOverride: string }) => {
      // No-op if AI is disabled
      if (!enableAiCartonPacking) {
        return { checksum: null };
      }
      
      // Check if params has planData and orderIdOverride
      const plan = 'planData' in params ? params.planData : params;
      const targetOrderId = 'orderIdOverride' in params ? params.orderIdOverride : orderId;
      
      if (!targetOrderId) {
        throw new Error('Order ID is required to save packing plan');
      }
      const response = await apiRequest('POST', `/api/orders/${targetOrderId}/packing-plan`, plan);
      return response.json();
    },
    onSuccess: (data, variables) => {
      const targetOrderId = 'orderIdOverride' in variables ? variables.orderIdOverride : orderId;
      serverChecksumRef.current = data.checksum;
      if (targetOrderId) {
        queryClient.invalidateQueries({ queryKey: ['/api/orders', targetOrderId, 'packing-plan'] });
      }
    },
  });

  // Optimization mutation
  const packingOptimizationMutation = useMutation({
    mutationFn: async ({ items, shippingCountry }: { items: PackingItem[]; shippingCountry: string }) => {
      // No-op if AI is disabled
      if (!enableAiCartonPacking) {
        throw new Error(i18n.t('orders:aiPackingDisabledError'));
      }
      
      if (items.length === 0) {
        throw new Error(i18n.t('orders:pleaseAddItemsFirst'));
      }
      
      const response = await apiRequest('POST', '/api/packing/optimize', {
        items,
        shippingCountry
      });
      return response.json();
    },
    onSuccess: (data) => {
      setPackingPlan(data);
      
      // Auto-save if: orderId exists AND not hydrating AND checksum differs
      if (orderId && !hydratingRef.current) {
        const newChecksum = computePlanChecksum(data);
        if (newChecksum !== serverChecksumRef.current) {
          savePackingPlanMutation.mutate(data);
        }
      }
      
      toast({
        title: i18n.t('common:success'),
        description: i18n.t('orders:packingPlanOptimized'),
      });
    },
    onError: (error: any) => {
      toast({
        title: i18n.t('common:error'),
        description: error.message || i18n.t('orders:failedToOptimizePacking'),
        variant: "destructive",
      });
    },
  });

  const runPackingOptimization = (items: PackingItem[], shippingCountry: string = 'CZ') => {
    // No-op if AI is disabled
    if (!enableAiCartonPacking) {
      toast({
        title: i18n.t('orders:aiPackingDisabled'),
        description: i18n.t('orders:enableAiPackingInSettings'),
        variant: "destructive",
      });
      return;
    }
    
    if (items.length === 0) {
      toast({
        title: i18n.t('common:error'),
        description: i18n.t('orders:pleaseAddItemsFirst'),
        variant: "destructive",
      });
      return;
    }
    packingOptimizationMutation.mutate({ items, shippingCountry });
  };

  const clearPackingPlan = () => {
    setPackingPlan(null);
    serverChecksumRef.current = null;
  };

  // Method to manually save (for external triggers)
  const manualSave = () => {
    // No-op if AI is disabled
    if (!enableAiCartonPacking) {
      return;
    }
    
    if (packingPlan && orderId) {
      const newChecksum = computePlanChecksum(packingPlan);
      if (newChecksum !== serverChecksumRef.current) {
        savePackingPlanMutation.mutate(packingPlan);
      }
    }
  };

  // Expose method to set hydrating state (for external use if needed)
  const setIsHydrating = (hydrating: boolean) => {
    hydratingRef.current = hydrating;
  };

  return {
    packingPlan,
    setPackingPlan,
    clearPackingPlan,
    setIsHydrating,
    manualSave,
    packingOptimizationMutation,
    savePackingPlanMutation,
    runPackingOptimization,
    isLoading: packingOptimizationMutation.isPending || savePackingPlanMutation.isPending,
    isFetchingSaved: isFetching,
  };
}
