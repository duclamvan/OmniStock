import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Users, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { formatDate } from "@/lib/currencyUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  createdAt: string;
}

export default function RolesSettings() {
  const { t } = useTranslation();
  const { toast } = useToast();

  // Fetch all users
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  // Mutation to update user role
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const response = await apiRequest('PATCH', `/api/users/${userId}/role`, { role });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/me'] });
      toast({
        title: t('common:success'),
        description: t('settings:userRoleUpdatedSuccessfully'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message || t('settings:failedToUpdateUserRole'),
        variant: "destructive",
      });
    },
  });

  // Handle role change
  const handleRoleChange = (userId: string, newRole: string) => {
    updateRoleMutation.mutate({ userId, role: newRole });
  };

  // Get badge variant for role
  const getRoleBadge = (role: string) => {
    if (role === 'administrator') {
      return (
        <Badge 
          className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
          data-testid={`badge-role-administrator`}
        >
          <Shield className="h-3 w-3 mr-1" />
          {t('settings:administrator')}
        </Badge>
      );
    }
    return (
      <Badge 
        className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
        data-testid={`badge-role-warehouse-operator`}
      >
        <Users className="h-3 w-3 mr-1" />
        {t('settings:warehouseOperator')}
        </Badge>
    );
  };

  // Format user name
  const formatUserName = (user: User) => {
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || user.email || 'Unknown User';
  };

  // Count by role
  const adminCount = users.filter(u => u.role === 'administrator').length;
  const operatorCount = users.filter(u => u.role === 'warehouse_operator').length;

  return (
    <div className="space-y-6">
      {/* Role Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              {t('settings:totalUsers')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('settings:activeInSystem')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-600" />
              {t('settings:administrators')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('settings:fullSystemAccess')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              {t('settings:warehouseOperators')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{operatorCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('settings:standardAccess')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Role Permissions Reference */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              {t('settings:administratorPermissions')}
            </CardTitle>
            <CardDescription>
              {t('settings:fullAccessToAllSystemFeatures')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span className="text-sm">{t('settings:userManagementAndRoleAssignment')}</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span className="text-sm">{t('settings:systemSettingsConfiguration')}</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span className="text-sm">{t('settings:financialDataAccess')}</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span className="text-sm">{t('settings:allWarehouseOperations')}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              {t('settings:warehouseOperatorPermissions')}
            </CardTitle>
            <CardDescription>
              {t('settings:limitedAccessToOperationalFeatures')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <span className="text-sm">{t('settings:orderManagementAndFulfillment')}</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <span className="text-sm">{t('settings:inventoryAndStockManagement')}</span>
            </div>
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <span className="text-sm">{t('settings:limitedFinancialDataVisibility')}</span>
            </div>
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <span className="text-sm">{t('settings:noUserOrSystemManagementAccess')}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {t('settings:userRolesManagement')}
          </CardTitle>
          <CardDescription>
            {t('settings:assignRolesToControlSystemAccess')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('settings:noUsersFound')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common:name')}</TableHead>
                    <TableHead className="hidden md:table-cell">{t('common:email')}</TableHead>
                    <TableHead>{t('settings:currentRole')}</TableHead>
                    <TableHead>{t('settings:assignRole')}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t('settings:memberSince')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {formatUserName(user)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {user.email || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {getRoleBadge(user.role)}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(newRole) => handleRoleChange(user.id, newRole)}
                          disabled={updateRoleMutation.isPending}
                        >
                          <SelectTrigger className="w-[180px]" data-testid={`select-role-${user.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="administrator">
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4 text-green-600" />
                                {t('settings:administrator')}
                              </div>
                            </SelectItem>
                            <SelectItem value="warehouse_operator">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-blue-600" />
                                {t('settings:warehouseOperator')}
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                        {formatDate(new Date(user.createdAt))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
