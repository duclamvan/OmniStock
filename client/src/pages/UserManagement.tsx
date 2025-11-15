import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ShieldAlert, Users } from "lucide-react";
import { formatDate } from "@/lib/currencyUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  createdAt: string;
}

export default function UserManagement() {
  const { isAdministrator, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  // Fetch all users
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: isAdministrator,
  });

  // Mutation to update user role
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const response = await apiRequest('PATCH', `/api/users/${userId}/role`, { role });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Success",
        description: "User role updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
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
          Administrator
        </Badge>
      );
    }
    return (
      <Badge 
        className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
        data-testid={`badge-role-warehouse-operator`}
      >
        Warehouse Operator
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

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show access denied if not administrator
  if (!isAdministrator) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <ShieldAlert className="h-16 w-16 text-red-500 dark:text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Access Denied
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              You do not have permission to access this page. Only administrators can manage users.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            User Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage users and assign roles
          </p>
        </div>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Users ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                      <TableCell data-testid={`text-name-${user.id}`}>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {formatUserName(user)}
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-email-${user.id}`}>
                        <div className="text-gray-600 dark:text-gray-400">
                          {user.email || '—'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getRoleBadge(user.role)}
                      </TableCell>
                      <TableCell data-testid={`text-created-${user.id}`}>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {formatDate(user.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(newRole) => handleRoleChange(user.id, newRole)}
                          disabled={updateRoleMutation.isPending}
                          data-testid={`select-role-${user.id}`}
                        >
                          <SelectTrigger className="w-[180px]" data-testid={`select-trigger-${user.id}`}>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem 
                              value="administrator" 
                              data-testid={`select-option-administrator-${user.id}`}
                            >
                              Administrator
                            </SelectItem>
                            <SelectItem 
                              value="warehouse_operator"
                              data-testid={`select-option-warehouse-operator-${user.id}`}
                            >
                              Warehouse Operator
                            </SelectItem>
                          </SelectContent>
                        </Select>
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
