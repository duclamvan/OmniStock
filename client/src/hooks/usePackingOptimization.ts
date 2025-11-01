import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

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
    dimensions: string;
    weight: number;
    utilization: number;
    items: Array<{
      productName: string;
      name: string;
      quantity: number;
      weight: number;
      isEstimated: boolean;
    }>;
    fillingWeight?: number;
    unusedVolume?: number;
  }>;
}

export function usePackingOptimization() {
  const { toast } = useToast();
  const [packingPlan, setPackingPlan] = useState<PackingPlan | null>(null);

  const packingOptimizationMutation = useMutation({
    mutationFn: async ({ items, shippingCountry }: { items: PackingItem[]; shippingCountry: string }) => {
      if (items.length === 0) {
        throw new Error('Please add items to the order first');
      }
      
      const response = await apiRequest('POST', '/api/packing/optimize', {
        items,
        shippingCountry
      });
      return response.json();
    },
    onSuccess: (data) => {
      setPackingPlan(data);
      toast({
        title: "Success",
        description: "Packing plan optimized successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to optimize packing",
        variant: "destructive",
      });
    },
  });

  const runPackingOptimization = (items: PackingItem[], shippingCountry: string = 'CZ') => {
    if (items.length === 0) {
      toast({
        title: "Error",
        description: "Please add items to the order first",
        variant: "destructive",
      });
      return;
    }
    packingOptimizationMutation.mutate({ items, shippingCountry });
  };

  const clearPackingPlan = () => {
    setPackingPlan(null);
  };

  return {
    packingPlan,
    setPackingPlan,
    clearPackingPlan,
    packingOptimizationMutation,
    runPackingOptimization,
    isLoading: packingOptimizationMutation.isPending,
  };
}
