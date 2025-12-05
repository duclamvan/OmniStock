import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Shield,
  ShieldAlert,
  Users,
  Lock,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Settings,
  Package,
  ShoppingCart,
  Warehouse,
  BarChart3,
  Truck,
  DollarSign,
  UserCog,
  FolderDown,
  Building2,
  LayoutDashboard,
  Check,
  Minus,
  Crown,
  Percent,
  PackageCheck,
  ReceiptText,
  Wrench,
  Ticket,
  ClipboardList,
} from "lucide-react";
import { formatDate } from "@/lib/currencyUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface Permission {
  id: number;
  parentSection: string;
  section: string;
  page: string;
  path: string;
  displayName: string;
  displayNameVi: string | null;
  description: string | null;
  isSensitive: boolean;
  sortOrder: number;
}

interface Role {
  id: number;
  name: string;
  displayName: string;
  displayNameVi: string | null;
  description: string | null;
  descriptionVi: string | null;
  type: string;
  isSystem: boolean;
  color: string | null;
  icon: string | null;
  createdAt: string;
  updatedAt: string;
  permissions: Permission[];
}

interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  createdAt: string;
}

interface PermissionsResponse {
  all: Permission[];
  grouped: Record<string, Permission[]>;
  hierarchical: Record<string, Record<string, Permission[]>>;
}

type ParentSection = 'warehouse_operations' | 'administration';

const PARENT_SECTIONS: { key: ParentSection; icon: typeof Warehouse; color: string }[] = [
  { key: 'warehouse_operations', icon: Warehouse, color: 'text-blue-600' },
  { key: 'administration', icon: Settings, color: 'text-purple-600' },
];

const ROLE_COLORS = [
  { value: 'blue', label: 'colorBlue', class: 'bg-blue-500' },
  { value: 'green', label: 'colorGreen', class: 'bg-green-500' },
  { value: 'red', label: 'colorRed', class: 'bg-red-500' },
  { value: 'amber', label: 'colorAmber', class: 'bg-amber-500' },
  { value: 'purple', label: 'colorPurple', class: 'bg-purple-500' },
  { value: 'pink', label: 'colorPink', class: 'bg-pink-500' },
  { value: 'indigo', label: 'colorIndigo', class: 'bg-indigo-500' },
  { value: 'teal', label: 'colorTeal', class: 'bg-teal-500' },
  { value: 'orange', label: 'colorOrange', class: 'bg-orange-500' },
  { value: 'gray', label: 'colorGray', class: 'bg-gray-500' },
];

const SECTION_ICONS: Record<string, typeof Shield> = {
  dashboard: LayoutDashboard,
  orders: ShoppingCart,
  inventory: Package,
  warehouse: Warehouse,
  warehouses: Warehouse,
  warehousedashboard: ClipboardList,
  customers: Users,
  suppliers: Building2,
  shipping: Truck,
  reports: BarChart3,
  settings: Settings,
  financial: DollarSign,
  finances: DollarSign,
  employees: UserCog,
  imports: FolderDown,
  packing: Package,
  pickpack: PackageCheck,
  pos: ShoppingCart,
  stock: ClipboardList,
  returns: Package,
  services: Wrench,
  tickets: Ticket,
  users: Users,
  discounts: Percent,
  expenses: ReceiptText,
  receiving: Package,
};

function getSectionIcon(section: string) {
  return SECTION_ICONS[section.toLowerCase()] || Settings;
}

function getRoleColorClass(color: string | null) {
  const found = ROLE_COLORS.find(c => c.value === color);
  return found ? found.class : 'bg-gray-500';
}

export default function RolesSettings() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const isVietnamese = i18n.language === 'vi';

  const [activeTab, setActiveTab] = useState("manage-roles");
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [expandedRoles, setExpandedRoles] = useState<Set<number>>(new Set());
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [activeParent, setActiveParent] = useState<ParentSection>('warehouse_operations');
  const [expandedParents, setExpandedParents] = useState<Set<ParentSection>>(new Set<ParentSection>(['warehouse_operations', 'administration']));

  const [roleForm, setRoleForm] = useState({
    name: '',
    displayName: '',
    displayNameVi: '',
    description: '',
    descriptionVi: '',
    color: 'blue',
    icon: 'shield',
    permissionIds: [] as number[],
  });

  const { data: roles = [], isLoading: isLoadingRoles } = useQuery<Role[]>({
    queryKey: ['/api/roles'],
  });

  const { data: permissionsData, isLoading: isLoadingPermissions } = useQuery<PermissionsResponse>({
    queryKey: ['/api/permissions'],
  });

  const { data: users = [], isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const createRoleMutation = useMutation({
    mutationFn: async (data: typeof roleForm) => {
      const response = await apiRequest('POST', '/api/roles', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/roles'] });
      setIsRoleDialogOpen(false);
      resetForm();
      toast({
        title: t('common:success'),
        description: t('settings:roleCreatedSuccessfully'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message || t('settings:failedToCreateRole'),
        variant: "destructive",
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof roleForm }) => {
      const response = await apiRequest('PATCH', `/api/roles/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/roles'] });
      setIsRoleDialogOpen(false);
      setSelectedRole(null);
      resetForm();
      toast({
        title: t('common:success'),
        description: t('settings:roleUpdatedSuccessfully'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message || t('settings:failedToUpdateRole'),
        variant: "destructive",
      });
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/roles/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/roles'] });
      setIsDeleteDialogOpen(false);
      setSelectedRole(null);
      toast({
        title: t('common:success'),
        description: t('settings:roleDeletedSuccessfully'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message || t('settings:failedToDeleteRole'),
        variant: "destructive",
      });
    },
  });

  const updateUserRoleMutation = useMutation({
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

  const resetForm = () => {
    setRoleForm({
      name: '',
      displayName: '',
      displayNameVi: '',
      description: '',
      descriptionVi: '',
      color: 'blue',
      icon: 'shield',
      permissionIds: [],
    });
    setSelectedSection(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setSelectedRole(null);
    // Always expand both parent sections when opening dialog
    setExpandedParents(new Set<ParentSection>(['warehouse_operations', 'administration']));
    setIsRoleDialogOpen(true);
  };

  const openEditDialog = (role: Role) => {
    setSelectedRole(role);
    setRoleForm({
      name: role.name,
      displayName: role.displayName,
      displayNameVi: role.displayNameVi || '',
      description: role.description || '',
      descriptionVi: role.descriptionVi || '',
      color: role.color || 'blue',
      icon: role.icon || 'shield',
      permissionIds: role.permissions.map(p => p.id),
    });
    // Always expand both parent sections when opening dialog
    setExpandedParents(new Set<ParentSection>(['warehouse_operations', 'administration']));
    setIsRoleDialogOpen(true);
  };

  const openDeleteDialog = (role: Role) => {
    setSelectedRole(role);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveRole = () => {
    if (selectedRole) {
      updateRoleMutation.mutate({ id: selectedRole.id, data: roleForm });
    } else {
      createRoleMutation.mutate(roleForm);
    }
  };

  const toggleRoleExpanded = (roleId: number) => {
    const newExpanded = new Set(expandedRoles);
    if (newExpanded.has(roleId)) {
      newExpanded.delete(roleId);
    } else {
      newExpanded.add(roleId);
    }
    setExpandedRoles(newExpanded);
  };

  const togglePermission = (permissionId: number) => {
    setRoleForm(prev => {
      const newIds = prev.permissionIds.includes(permissionId)
        ? prev.permissionIds.filter(id => id !== permissionId)
        : [...prev.permissionIds, permissionId];
      return { ...prev, permissionIds: newIds };
    });
  };

  const toggleSectionPermissions = (section: string, select: boolean) => {
    const sectionPermissions = permissionsData?.grouped[section] || [];
    const sectionIds = sectionPermissions.map(p => p.id);

    setRoleForm(prev => {
      let newIds: number[];
      if (select) {
        newIds = Array.from(new Set([...prev.permissionIds, ...sectionIds]));
      } else {
        newIds = prev.permissionIds.filter(id => !sectionIds.includes(id));
      }
      return { ...prev, permissionIds: newIds };
    });
  };

  const isSectionFullySelected = (section: string) => {
    const sectionPermissions = permissionsData?.grouped[section] || [];
    return sectionPermissions.every(p => roleForm.permissionIds.includes(p.id));
  };

  const isSectionPartiallySelected = (section: string) => {
    const sectionPermissions = permissionsData?.grouped[section] || [];
    const selectedCount = sectionPermissions.filter(p => roleForm.permissionIds.includes(p.id)).length;
    return selectedCount > 0 && selectedCount < sectionPermissions.length;
  };

  const getParentPermissionIds = (parentSection: ParentSection) => {
    const parentData = permissionsData?.hierarchical[parentSection] || {};
    return Object.values(parentData).flat().map(p => p.id);
  };

  const toggleParentPermissions = (parentSection: ParentSection, select: boolean) => {
    const parentIds = getParentPermissionIds(parentSection);
    setRoleForm(prev => {
      let newIds: number[];
      if (select) {
        newIds = Array.from(new Set([...prev.permissionIds, ...parentIds]));
      } else {
        newIds = prev.permissionIds.filter(id => !parentIds.includes(id));
      }
      return { ...prev, permissionIds: newIds };
    });
  };

  const isParentFullySelected = (parentSection: ParentSection) => {
    const parentIds = getParentPermissionIds(parentSection);
    return parentIds.length > 0 && parentIds.every(id => roleForm.permissionIds.includes(id));
  };

  const isParentPartiallySelected = (parentSection: ParentSection) => {
    const parentIds = getParentPermissionIds(parentSection);
    const selectedCount = parentIds.filter(id => roleForm.permissionIds.includes(id)).length;
    return selectedCount > 0 && selectedCount < parentIds.length;
  };

  const getParentSelectedCount = (parentSection: ParentSection) => {
    const parentIds = getParentPermissionIds(parentSection);
    return parentIds.filter(id => roleForm.permissionIds.includes(id)).length;
  };

  const getParentTotalCount = (parentSection: ParentSection) => {
    return getParentPermissionIds(parentSection).length;
  };

  const toggleParentExpanded = (parentSection: ParentSection) => {
    const newExpanded = new Set(expandedParents);
    if (newExpanded.has(parentSection)) {
      newExpanded.delete(parentSection);
    } else {
      newExpanded.add(parentSection);
    }
    setExpandedParents(newExpanded);
  };

  const handleSectionClick = (parentSection: ParentSection, section: string) => {
    setActiveParent(parentSection);
    setSelectedSection(section);
  };

  const getSensitivePermissionIds = () => {
    return permissionsData?.all.filter(p => p.isSensitive).map(p => p.id) || [];
  };

  const isSensitiveDataEnabled = () => {
    const sensitiveIds = getSensitivePermissionIds();
    return sensitiveIds.length > 0 && sensitiveIds.every(id => roleForm.permissionIds.includes(id));
  };

  const toggleSensitiveDataAccess = (enabled: boolean) => {
    const sensitiveIds = getSensitivePermissionIds();
    setRoleForm(prev => {
      let newIds: number[];
      if (enabled) {
        newIds = Array.from(new Set([...prev.permissionIds, ...sensitiveIds]));
      } else {
        newIds = prev.permissionIds.filter(id => !sensitiveIds.includes(id));
      }
      return { ...prev, permissionIds: newIds };
    });
  };

  const getRoleDisplayName = (role: Role) => {
    return isVietnamese && role.displayNameVi ? role.displayNameVi : role.displayName;
  };

  const getPermissionDisplayName = (permission: Permission) => {
    return isVietnamese && permission.displayNameVi ? permission.displayNameVi : permission.displayName;
  };

  const getUserCountForRole = (roleName: string) => {
    return users.filter(u => u.role === roleName).length;
  };

  const getRoleBadge = (role: Role) => {
    const colorClass = getRoleColorClass(role.color);
    return (
      <Badge
        className={`${colorClass} text-white`}
        data-testid={`badge-role-${role.name}`}
      >
        <Shield className="h-3 w-3 mr-1" />
        {getRoleDisplayName(role)}
      </Badge>
    );
  };

  const formatUserName = (user: User) => {
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || user.email || 'Unknown User';
  };

  const adminCount = users.filter(u => u.role === 'administrator').length;
  const operatorCount = users.filter(u => u.role === 'warehouse_operator').length;

  const sections = useMemo(() => {
    return permissionsData ? Object.keys(permissionsData.grouped) : [];
  }, [permissionsData]);

  return (
    <div className="space-y-6">
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 h-14">
          <TabsTrigger
            value="manage-roles"
            className="h-12 text-base min-h-[56px]"
            data-testid="tab-manage-roles"
          >
            <Shield className="h-4 w-4 mr-2" />
            {t('settings:manageRoles')}
          </TabsTrigger>
          <TabsTrigger
            value="assign-users"
            className="h-12 text-base min-h-[56px]"
            data-testid="tab-assign-users"
          >
            <Users className="h-4 w-4 mr-2" />
            {t('settings:assignUsers')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manage-roles" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  {t('settings:rolesList')}
                </CardTitle>
                <CardDescription>
                  {t('settings:rolesListDescription')}
                </CardDescription>
              </div>
              <Button
                onClick={openCreateDialog}
                className="min-h-[56px] min-w-[56px] md:min-w-auto"
                data-testid="button-add-role"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('settings:addRole')}
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingRoles ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : roles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('settings:noRolesFound')}
                </div>
              ) : (
                <div className="space-y-2">
                  {roles.map((role) => {
                    const isExpanded = expandedRoles.has(role.id);
                    const userCount = getUserCountForRole(role.name);
                    const SectionIcon = getSectionIcon(role.icon || 'shield');

                    return (
                      <Collapsible
                        key={role.id}
                        open={isExpanded}
                        onOpenChange={() => toggleRoleExpanded(role.id)}
                      >
                        <div className="border rounded-lg">
                          <div className="flex items-center justify-between p-4 min-h-[72px]">
                            <div className="flex items-center gap-4 flex-1">
                              <CollapsibleTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="min-h-[44px] min-w-[44px] p-0"
                                  data-testid={`button-expand-role-${role.id}`}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </Button>
                              </CollapsibleTrigger>

                              <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center ${getRoleColorClass(role.color)}`}
                              >
                                <SectionIcon className="h-5 w-5 text-white" />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium truncate">
                                    {getRoleDisplayName(role)}
                                  </span>
                                  <Badge variant={role.isSystem ? "secondary" : "outline"}>
                                    {role.isSystem ? t('settings:systemRole') : t('settings:customRole')}
                                  </Badge>
                                  {role.name === 'administrator' && (
                                    <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                                      {t('settings:fullAccess')}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                  {role.name === 'administrator' ? (
                                    <span className="text-amber-600 dark:text-amber-400 font-medium">{t('settings:allPermissions')}</span>
                                  ) : (
                                    <span>{role.permissions.length} {t('settings:permissionCount')}</span>
                                  )}
                                  <span>{userCount} {t('settings:userCount')}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDialog(role)}
                                className="min-h-[44px] min-w-[44px]"
                                data-testid={`button-edit-role-${role.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                                <span className="hidden sm:inline ml-2">{t('settings:editRole')}</span>
                              </Button>
                              {!role.isSystem && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openDeleteDialog(role)}
                                  className="min-h-[44px] min-w-[44px] text-destructive hover:text-destructive"
                                  data-testid={`button-delete-role-${role.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span className="hidden sm:inline ml-2">{t('settings:deleteRole')}</span>
                                </Button>
                              )}
                            </div>
                          </div>

                          <CollapsibleContent>
                            <div className="px-4 pb-4 pt-2 border-t">
                              {role.name === 'administrator' ? (
                                <div className="flex items-center gap-4 py-6 px-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                                  <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full">
                                    <Crown className="h-8 w-8 text-white" />
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-lg text-amber-800 dark:text-amber-300">
                                      {t('settings:fullAccessTitle')}
                                    </h4>
                                    <p className="text-sm text-amber-700 dark:text-amber-400">
                                      {t('settings:fullAccessDescription')}
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <p className="text-sm font-medium mb-3">{t('settings:permissionsSection')}:</p>
                                  {Object.entries(
                                    role.permissions.reduce((acc, perm) => {
                                      if (!acc[perm.section]) acc[perm.section] = [];
                                      acc[perm.section].push(perm);
                                      return acc;
                                    }, {} as Record<string, Permission[]>)
                                  ).map(([section, perms]) => {
                                    const Icon = getSectionIcon(section);
                                    return (
                                      <div key={section} className="mb-3">
                                        <div className="flex items-center gap-2 mb-1">
                                          <Icon className="h-4 w-4 text-muted-foreground" />
                                          <span className="font-medium text-sm capitalize">
                                            {t(`settings:section${section.charAt(0).toUpperCase() + section.slice(1)}` as any) || section}
                                          </span>
                                        </div>
                                        <div className="flex flex-wrap gap-1 ml-6">
                                          {perms.map((perm) => (
                                            <Badge key={perm.id} variant="secondary" className="text-xs">
                                              {getPermissionDisplayName(perm)}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })}
                                  {role.permissions.length === 0 && (
                                    <p className="text-sm text-muted-foreground italic">
                                      {t('settings:noPermissionsSelected')}
                                    </p>
                                  )}
                                </>
                              )}
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assign-users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                {t('settings:userRolesManagement')}
              </CardTitle>
              <CardDescription>
                {t('settings:assignRolesToControlAccess')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingUsers || isLoadingRoles ? (
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
                      {users.map((user) => {
                        const userRole = roles.find(r => r.name === user.role);
                        return (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">
                              {formatUserName(user)}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-muted-foreground">
                              {user.email || 'N/A'}
                            </TableCell>
                            <TableCell>
                              {userRole ? getRoleBadge(userRole) : (
                                <Badge variant="outline">{user.role}</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={user.role}
                                onValueChange={(newRole) => updateUserRoleMutation.mutate({ userId: user.id, role: newRole })}
                                disabled={updateUserRoleMutation.isPending}
                              >
                                <SelectTrigger
                                  className="w-[180px] min-h-[44px]"
                                  data-testid={`select-role-${user.id}`}
                                >
                                  <SelectValue placeholder={t('settings:selectRole')} />
                                </SelectTrigger>
                                <SelectContent>
                                  {roles.map((role) => {
                                    const Icon = getSectionIcon(role.icon || 'shield');
                                    return (
                                      <SelectItem key={role.name} value={role.name}>
                                        <div className="flex items-center gap-2">
                                          <div className={`w-4 h-4 rounded-full ${getRoleColorClass(role.color)}`} />
                                          {getRoleDisplayName(role)}
                                        </div>
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                              {formatDate(new Date(user.createdAt))}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedRole ? t('settings:editRole') : t('settings:createRole')}
            </DialogTitle>
            <DialogDescription>
              {t('settings:roleFormDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t('settings:basicInformation')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role-name">{t('settings:roleSlug')}</Label>
                  <Input
                    id="role-name"
                    value={roleForm.name}
                    onChange={(e) => setRoleForm(prev => ({ ...prev, name: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                    placeholder="e.g., sales_manager"
                    disabled={selectedRole?.isSystem}
                    className="min-h-[44px]"
                    data-testid="input-role-name"
                  />
                  <p className="text-xs text-muted-foreground">{t('settings:roleSlugDescription')}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="display-name">{t('settings:displayName')}</Label>
                  <Input
                    id="display-name"
                    value={roleForm.displayName}
                    onChange={(e) => setRoleForm(prev => ({ ...prev, displayName: e.target.value }))}
                    placeholder="e.g., Sales Manager"
                    disabled={selectedRole?.isSystem}
                    className="min-h-[44px]"
                    data-testid="input-display-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="display-name-vi">{t('settings:displayNameVi')}</Label>
                  <Input
                    id="display-name-vi"
                    value={roleForm.displayNameVi}
                    onChange={(e) => setRoleForm(prev => ({ ...prev, displayNameVi: e.target.value }))}
                    placeholder="e.g., Quản lý bán hàng"
                    disabled={selectedRole?.isSystem}
                    className="min-h-[44px]"
                    data-testid="input-display-name-vi"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role-color">{t('settings:roleColor')}</Label>
                  <Select
                    value={roleForm.color}
                    onValueChange={(value) => setRoleForm(prev => ({ ...prev, color: value }))}
                  >
                    <SelectTrigger className="min-h-[44px]" data-testid="select-role-color">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_COLORS.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded-full ${color.class}`} />
                            {t(`settings:${color.label}` as any)}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">{t('settings:roleDescription')}</Label>
                  <Input
                    id="description"
                    value={roleForm.description}
                    onChange={(e) => setRoleForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Role description in English"
                    className="min-h-[44px]"
                    data-testid="input-description"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description-vi">{t('settings:roleDescriptionVi')}</Label>
                  <Input
                    id="description-vi"
                    value={roleForm.descriptionVi}
                    onChange={(e) => setRoleForm(prev => ({ ...prev, descriptionVi: e.target.value }))}
                    placeholder="Mô tả vai trò bằng tiếng Việt"
                    className="min-h-[44px]"
                    data-testid="input-description-vi"
                  />
                </div>
              </div>
            </div>

            {selectedRole?.name === 'administrator' ? (
              <div className="flex flex-col items-center justify-center py-12 px-8 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-yellow-950/30 rounded-xl border-2 border-amber-200 dark:border-amber-700">
                <div className="p-6 bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-500 rounded-full mb-6 shadow-lg shadow-amber-500/30">
                  <Crown className="h-16 w-16 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-amber-800 dark:text-amber-300 mb-2">
                  {t('settings:fullAccessTitle')}
                </h3>
                <p className="text-center text-amber-700 dark:text-amber-400 max-w-md mb-6">
                  {t('settings:fullAccessDescription')}
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-700">
                    {t('settings:allPages')}
                  </Badge>
                  <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-700">
                    {t('settings:allFeatures')}
                  </Badge>
                  <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-700">
                    {t('settings:sensitiveDataAccess')}
                  </Badge>
                </div>
              </div>
            ) : (
              <>
                <div className="border border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20 rounded-lg p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
                        <ShieldAlert className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <Label htmlFor="sensitive-data-toggle" className="text-base font-semibold cursor-pointer">
                          {t('settings:sensitiveDataAccess')}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {t('settings:sensitiveDataDescription')}
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="sensitive-data-toggle"
                      checked={isSensitiveDataEnabled()}
                      onCheckedChange={toggleSensitiveDataAccess}
                      className="scale-125"
                      data-testid="switch-sensitive-data"
                    />
                  </div>
                  <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-800">
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      {t('settings:sensitiveDataIncludes')}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">{t('settings:selectPermissions')}</h3>
                    <div className="text-sm text-muted-foreground">
                      {roleForm.permissionIds.length} {t('settings:permissionCount')}
                    </div>
                  </div>

                  {isLoadingPermissions ? (
                    <div className="space-y-2">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border rounded-lg p-4">
                      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                        {PARENT_SECTIONS.map(({ key: parentKey, icon: ParentIcon, color }) => {
                          const isParentExpanded = expandedParents.has(parentKey);
                          const parentFullySelected = isParentFullySelected(parentKey);
                          const parentPartiallySelected = isParentPartiallySelected(parentKey);
                          const parentSections = permissionsData?.hierarchical[parentKey] || {};
                          const sectionKeys = Object.keys(parentSections);

                          return (
                            <Collapsible
                              key={parentKey}
                              open={isParentExpanded}
                              onOpenChange={() => toggleParentExpanded(parentKey)}
                            >
                              <div className="border rounded-lg overflow-hidden">
                                <CollapsibleTrigger asChild>
                                  <div
                                    className={`flex items-center gap-3 p-4 cursor-pointer min-h-[64px] bg-muted/50 hover:bg-muted transition-colors`}
                                    data-testid={`parent-${parentKey}`}
                                  >
                                    <div
                                      role="checkbox"
                                      aria-checked={parentFullySelected ? "true" : parentPartiallySelected ? "mixed" : "false"}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleParentPermissions(parentKey, !parentFullySelected && !parentPartiallySelected);
                                      }}
                                      className={`flex items-center justify-center min-h-[24px] min-w-[24px] h-6 w-6 rounded border-2 cursor-pointer transition-colors ${
                                        parentFullySelected || parentPartiallySelected
                                          ? 'bg-primary border-primary'
                                          : 'bg-background border-input hover:border-primary'
                                      }`}
                                      data-testid={`checkbox-parent-${parentKey}`}
                                    >
                                      {parentFullySelected && (
                                        <Check className="h-4 w-4 text-primary-foreground" strokeWidth={3} />
                                      )}
                                      {parentPartiallySelected && !parentFullySelected && (
                                        <Minus className="h-4 w-4 text-primary-foreground" strokeWidth={3} />
                                      )}
                                    </div>
                                    <ParentIcon className={`h-6 w-6 ${color}`} />
                                    <div className="flex-1">
                                      <span className="font-semibold text-base">
                                        {t(`settings:parent${parentKey.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')}` as any)}
                                      </span>
                                      <p className="text-xs text-muted-foreground">
                                        {sectionKeys.length} {t('settings:sections')}
                                      </p>
                                    </div>
                                    <Badge variant="secondary" className="text-sm font-medium">
                                      {getParentSelectedCount(parentKey)}/{getParentTotalCount(parentKey)}
                                    </Badge>
                                    {isParentExpanded ? (
                                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                    ) : (
                                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                    )}
                                  </div>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <div className="border-t bg-background">
                                    {sectionKeys.map((section) => {
                                      const Icon = getSectionIcon(section);
                                      const isFullySelected = isSectionFullySelected(section);
                                      const isPartialSelected = isSectionPartiallySelected(section);
                                      const isActive = selectedSection === section && activeParent === parentKey;

                                      return (
                                        <div
                                          key={section}
                                          className={`flex items-center gap-3 p-3 pl-12 cursor-pointer min-h-[56px] border-b last:border-b-0 transition-colors ${
                                            isActive
                                              ? 'bg-primary/10 border-l-4 border-l-primary'
                                              : 'hover:bg-muted/50'
                                          }`}
                                          onClick={() => handleSectionClick(parentKey, section)}
                                          data-testid={`section-${section}`}
                                        >
                                          <div
                                            role="checkbox"
                                            aria-checked={isFullySelected ? "true" : isPartialSelected ? "mixed" : "false"}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleSectionPermissions(section, !isFullySelected && !isPartialSelected);
                                            }}
                                            className={`flex items-center justify-center min-h-[20px] min-w-[20px] h-5 w-5 rounded border-2 cursor-pointer transition-colors ${
                                              isFullySelected || isPartialSelected
                                                ? 'bg-primary border-primary'
                                                : 'bg-background border-input hover:border-primary'
                                            }`}
                                            data-testid={`checkbox-section-${section}`}
                                          >
                                            {isFullySelected && (
                                              <Check className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={3} />
                                            )}
                                            {isPartialSelected && !isFullySelected && (
                                              <Minus className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={3} />
                                            )}
                                          </div>
                                          <Icon className="h-5 w-5 text-muted-foreground" />
                                          <span className="font-medium capitalize flex-1">
                                            {t(`settings:section${section.charAt(0).toUpperCase() + section.slice(1)}` as any) || section}
                                          </span>
                                          <Badge variant="outline" className="text-xs">
                                            {permissionsData?.grouped[section]?.filter(p => roleForm.permissionIds.includes(p.id)).length || 0}
                                            /{permissionsData?.grouped[section]?.length || 0}
                                          </Badge>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </CollapsibleContent>
                              </div>
                            </Collapsible>
                          );
                        })}
                      </div>

                      <div className="space-y-2 border-l pl-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium">{t('settings:permissionPages')}</p>
                          {selectedSection && (
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleSectionPermissions(selectedSection, true)}
                                className="min-h-[36px] text-xs"
                                data-testid="button-select-all"
                              >
                                {t('settings:selectAllSection')}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleSectionPermissions(selectedSection, false)}
                                className="min-h-[36px] text-xs"
                                data-testid="button-deselect-all"
                              >
                                {t('settings:deselectAllSection')}
                              </Button>
                            </div>
                          )}
                        </div>
                        <div className="space-y-1 max-h-[500px] overflow-y-auto pr-2">
                          {selectedSection ? (
                            permissionsData?.grouped[selectedSection]?.map((permission) => (
                              <div
                                key={permission.id}
                                onClick={() => togglePermission(permission.id)}
                                className={`flex items-center gap-3 p-3 rounded-lg hover:bg-muted min-h-[56px] cursor-pointer ${
                                  permission.isSensitive ? 'border border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20' : ''
                                }`}
                                data-testid={`permission-row-${permission.id}`}
                              >
                                <Checkbox
                                  checked={roleForm.permissionIds.includes(permission.id)}
                                  onCheckedChange={() => togglePermission(permission.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="min-h-[20px] min-w-[20px]"
                                  data-testid={`checkbox-permission-${permission.id}`}
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-sm">
                                      {getPermissionDisplayName(permission)}
                                    </p>
                                    {permission.isSensitive && (
                                      <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700">
                                        <ShieldAlert className="h-3 w-3 mr-1" />
                                        {t('settings:sensitiveData')}
                                      </Badge>
                                    )}
                                  </div>
                                  {permission.description && (
                                    <p className="text-xs text-muted-foreground">
                                      {permission.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-12 text-muted-foreground">
                              <Settings className="h-10 w-10 mx-auto mb-3 opacity-50" />
                              <p className="text-sm font-medium">{t('settings:selectSectionToViewPermissions')}</p>
                              <p className="text-xs mt-1">{t('settings:clickOnSectionFromLeft')}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsRoleDialogOpen(false)}
              className="min-h-[44px]"
              data-testid="button-cancel"
            >
              {t('common:cancel')}
            </Button>
            <Button
              onClick={handleSaveRole}
              disabled={
                !roleForm.name ||
                !roleForm.displayName ||
                createRoleMutation.isPending ||
                updateRoleMutation.isPending
              }
              className="min-h-[44px]"
              data-testid="button-save-role"
            >
              {createRoleMutation.isPending || updateRoleMutation.isPending
                ? t('common:saving')
                : t('settings:saveRole')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settings:deleteRole')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings:deleteRoleConfirmation')}
              <br />
              <span className="text-destructive font-medium">
                {t('settings:deleteRoleWarning')}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-[44px]">
              {t('common:cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedRole && deleteRoleMutation.mutate(selectedRole.id)}
              className="min-h-[44px] bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteRoleMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteRoleMutation.isPending ? t('common:deleting') : t('settings:deleteRole')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
