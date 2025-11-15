import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import type { User } from "@shared/schema";

export type { User };

export function useAuth() {
  const { data: user, isLoading, refetch } = useQuery<User | null>({
    queryKey: ['/api/users/me'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
  });

  const isAuthenticated = !!user;
  const isAdministrator = user?.role === 'administrator';
  const isWarehouseOperator = user?.role === 'warehouse_operator';
  const canAccessFinancialData = isAdministrator;

  const hasRole = (role: string): boolean => {
    return user?.role === role;
  };

  return {
    user,
    isLoading,
    isAuthenticated,
    isAdministrator,
    isWarehouseOperator,
    hasRole,
    canAccessFinancialData,
    refetch,
  };
}
