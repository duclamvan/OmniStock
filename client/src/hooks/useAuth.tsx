import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import type { User } from "@shared/schema";

export type { User };

export interface UserWithPermissions extends User {
  permissions?: string[];
}

export const SENSITIVE_PERMISSIONS = {
  VIEW_IMPORT_COST: 'finances.view_import_cost',
  VIEW_PROFIT: 'finances.view_profit',
  VIEW_MARGIN: 'finances.view_margin',
} as const;

export function useAuth() {
  const { data: user, isLoading, refetch } = useQuery<UserWithPermissions | null>({
    queryKey: ['/api/users/me'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
  });

  const isAuthenticated = !!user;
  const isAdministrator = user?.role === 'administrator';
  const isWarehouseOperator = user?.role === 'warehouse_operator';
  
  const hasPermission = (permission: string): boolean => {
    return user?.permissions?.includes(permission) ?? false;
  };

  const hasRole = (role: string): boolean => {
    return user?.role === role;
  };

  // Sensitive financial data access checks
  const canViewImportCost = hasPermission(SENSITIVE_PERMISSIONS.VIEW_IMPORT_COST);
  const canViewProfit = hasPermission(SENSITIVE_PERMISSIONS.VIEW_PROFIT);
  const canViewMargin = hasPermission(SENSITIVE_PERMISSIONS.VIEW_MARGIN);
  const canAccessSensitiveData = canViewImportCost || canViewProfit || canViewMargin;

  return {
    user,
    isLoading,
    isAuthenticated,
    isAdministrator,
    isWarehouseOperator,
    hasRole,
    hasPermission,
    canViewImportCost,
    canViewProfit,
    canViewMargin,
    canAccessSensitiveData,
    refetch,
  };
}
