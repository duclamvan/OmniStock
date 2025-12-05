import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, 
  Plus, 
  Pencil, 
  Trash2, 
  Coins,
  Euro,
  DollarSign,
  Calendar,
  Building2,
  Phone,
  Mail,
  ClipboardList,
  Eye
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/currencyUtils";
import { useLocation } from "wouter";
import type { Employee, User } from "@shared/schema";

const createEmployeeFormSchema = (t: (key: string) => string) => z.object({
  employeeId: z.string().min(1, t('system:employeeIdRequired')),
  userId: z.string().optional().or(z.literal("")),
  firstName: z.string().min(1, t('system:firstNameRequired')),
  lastName: z.string().min(1, t('system:lastNameRequired')),
  email: z.string().email(t('system:invalidEmail')).optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  position: z.string().min(1, t('system:positionRequired')),
  department: z.string().min(1, t('system:departmentRequired')),
  hireDate: z.string().min(1, t('system:hireDateRequired')),
  terminationDate: z.string().optional().or(z.literal("")),
  status: z.enum(["active", "on_leave", "terminated"]),
  salary: z.string().min(1, t('system:salaryRequired')),
  paymentFrequency: z.enum(["monthly", "biweekly", "weekly"]),
  currency: z.enum(["CZK", "EUR", "USD"]),
  bankAccount: z.string().optional(),
  bankName: z.string().optional(),
  taxId: z.string().optional(),
  insuranceId: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  notes: z.string().optional(),
});

type EmployeeFormValues = z.infer<ReturnType<typeof createEmployeeFormSchema>>;

export default function Employees() {
  const { t } = useTranslation(['system', 'common']);
  const employeeFormSchema = createEmployeeFormSchema(t);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Fetch employees
  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ['/api/employees'],
  });

  // Fetch all users
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      employeeId: "",
      userId: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      position: "",
      department: "",
      hireDate: new Date().toISOString().split('T')[0],
      terminationDate: "",
      status: "active",
      salary: "",
      paymentFrequency: "monthly",
      currency: "CZK",
      bankAccount: "",
      bankName: "",
      taxId: "",
      insuranceId: "",
      emergencyContact: "",
      emergencyPhone: "",
      notes: "",
    },
  });

  // Create/Update employee mutation
  const saveEmployeeMutation = useMutation({
    mutationFn: async (data: EmployeeFormValues) => {
      const payload = {
        ...data,
        userId: data.userId || null,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        terminationDate: data.terminationDate || null,
        bankAccount: data.bankAccount || null,
        bankName: data.bankName || null,
        taxId: data.taxId || null,
        insuranceId: data.insuranceId || null,
        emergencyContact: data.emergencyContact || null,
        emergencyPhone: data.emergencyPhone || null,
        notes: data.notes || null,
        salary: parseFloat(data.salary),
      };

      if (selectedEmployee) {
        const response = await apiRequest('PATCH', `/api/employees/${selectedEmployee.id}`, payload);
        return response.json();
      } else {
        const response = await apiRequest('POST', '/api/employees', payload);
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      toast({
        title: t('common:success'),
        description: selectedEmployee ? t('common:updateSuccess') : t('common:createSuccess'),
      });
      setDialogOpen(false);
      setSelectedEmployee(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message || t('common:saveFailed'),
        variant: "destructive",
      });
    },
  });

  // Delete employee mutation
  const deleteEmployeeMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/employees/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      toast({
        title: t('common:success'),
        description: t('common:deleteSuccess'),
      });
      setDeleteDialogOpen(false);
      setSelectedEmployee(null);
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message || t('common:deleteFailed'),
        variant: "destructive",
      });
    },
  });

  const handleAddEmployee = () => {
    setSelectedEmployee(null);
    form.reset();
    setDialogOpen(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    form.reset({
      employeeId: employee.employeeId,
      userId: employee.userId || "",
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email || "",
      phone: employee.phone || "",
      address: employee.address || "",
      position: employee.position,
      department: employee.department,
      hireDate: employee.hireDate,
      terminationDate: employee.terminationDate || "",
      status: employee.status as "active" | "on_leave" | "terminated",
      salary: employee.salary.toString(),
      paymentFrequency: employee.paymentFrequency as "monthly" | "biweekly" | "weekly",
      currency: employee.currency as "CZK" | "EUR" | "USD",
      bankAccount: employee.bankAccount || "",
      bankName: employee.bankName || "",
      taxId: employee.taxId || "",
      insuranceId: employee.insuranceId || "",
      emergencyContact: employee.emergencyContact || "",
      emergencyPhone: employee.emergencyPhone || "",
      notes: employee.notes || "",
    });
    setDialogOpen(true);
  };

  const handleDeleteEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setDeleteDialogOpen(true);
  };

  const onSubmit = (data: EmployeeFormValues) => {
    saveEmployeeMutation.mutate(data);
  };

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">{t('system:active')}</Badge>;
    } else if (status === 'on_leave') {
      return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">{t('system:onLeave')}</Badge>;
    }
    return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">{t('system:terminated')}</Badge>;
  };

  const getCurrencyIcon = (currency: string) => {
    if (currency === 'CZK') return <Coins className="h-4 w-4" />;
    if (currency === 'EUR') return <Euro className="h-4 w-4" />;
    return <DollarSign className="h-4 w-4" />;
  };

  const formatSalary = (amount: string | number, currency: string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `${numAmount.toLocaleString()} ${currency}`;
  };

  // Calculate payroll summary
  const activeEmployees = employees.filter(e => e.status === 'active');
  const totalMonthlyPayroll = activeEmployees.reduce((sum, emp) => {
    const salary = typeof emp.salary === 'string' ? parseFloat(emp.salary) : emp.salary;
    if (emp.paymentFrequency === 'monthly') {
      return sum + salary;
    } else if (emp.paymentFrequency === 'biweekly') {
      return sum + (salary * 26 / 12); // Bi-weekly to monthly
    } else { // weekly
      return sum + (salary * 52 / 12); // Weekly to monthly
    }
  }, 0);

  const totalAnnualPayroll = totalMonthlyPayroll * 12;

  return (
    <div className="space-y-4 md:space-y-6 px-4 md:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Users className="h-6 w-6 md:h-7 md:w-7 text-primary" />
            {t('system:employees')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('system:manageYourTeamAndPayroll')}
          </p>
        </div>
        <Button onClick={handleAddEmployee} className="w-full sm:w-auto" data-testid="button-add-employee">
          <Plus className="h-4 w-4 mr-2" />
          {t('system:addEmployee')}
        </Button>
      </div>

      {/* Payroll Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
            <CardTitle className="text-sm font-medium">{t('system:totalEmployees')}</CardTitle>
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl md:text-3xl font-bold">{activeEmployees.length}</div>
            <p className="text-xs text-muted-foreground">
              {t('system:activeStaffMembers')}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
            <CardTitle className="text-sm font-medium">{t('system:monthlyPayroll')}</CardTitle>
            <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Coins className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl md:text-2xl font-bold truncate">{totalMonthlyPayroll.toLocaleString()} CZK</div>
            <p className="text-xs text-muted-foreground">
              {t('system:totalMonthlyCosts')}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
            <CardTitle className="text-sm font-medium">{t('system:annualPayroll')}</CardTitle>
            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Coins className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl md:text-2xl font-bold truncate">{totalAnnualPayroll.toLocaleString()} CZK</div>
            <p className="text-xs text-muted-foreground">
              {t('system:estimatedYearlyCosts')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Employees Table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 px-4 md:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Users className="h-5 w-5 text-muted-foreground" />
              {t('system:allEmployees')}
              <Badge variant="secondary" className="ml-1">{employees.length}</Badge>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0 md:p-6 md:pt-0">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('system:noEmployeesYet')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('system:getStartedByAddingFirstEmployee')}
              </p>
              <Button onClick={handleAddEmployee}>
                <Plus className="h-4 w-4 mr-2" />
                {t('system:addEmployee')}
              </Button>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="sm:hidden space-y-4 px-4 py-4">
                {employees.map((employee) => (
                  <div 
                    key={employee.id} 
                    className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4"
                    data-testid={`card-employee-${employee.id}`}
                  >
                    <div className="space-y-3">
                      {/* Top Row - Name, Status, Actions */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <p className="font-bold text-base text-gray-900 dark:text-gray-100 truncate">
                              {employee.firstName} {employee.lastName}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {getStatusBadge(employee.status)}
                            <Badge variant="outline" className="text-xs font-mono">
                              {employee.employeeId}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-10 w-10"
                            onClick={() => setLocation(`/employees/${employee.id}`)}
                            data-testid={`button-view-${employee.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-10 w-10"
                            onClick={() => handleEditEmployee(employee)}
                            data-testid={`button-edit-${employee.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {employee.userId && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-10 w-10"
                              onClick={() => setLocation(`/activity-log/${employee.userId}`)}
                              data-testid={`button-activity-log-${employee.id}`}
                            >
                              <ClipboardList className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-10 w-10"
                            onClick={() => handleDeleteEmployee(employee)}
                            data-testid={`button-delete-${employee.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </div>

                      {/* Position & Department */}
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Building2 className="h-4 w-4" />
                        <span className="font-medium text-gray-900 dark:text-gray-100">{employee.position}</span>
                        <span>•</span>
                        <span>{employee.department}</span>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t border-gray-100 dark:border-slate-800">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400 text-xs">{t('system:salary')}</p>
                          <div className="flex items-center gap-1 font-medium text-gray-900 dark:text-gray-100">
                            {getCurrencyIcon(employee.currency)}
                            <span>{formatSalary(employee.salary, employee.currency)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{t(`system:${employee.paymentFrequency}`)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400 text-xs">{t('system:hireDate')}</p>
                          <div className="flex items-center gap-1 font-medium text-gray-900 dark:text-gray-100">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span>{formatDate(employee.hireDate)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Contact Info */}
                      {(employee.email || employee.phone) && (
                        <div className="pt-2 border-t border-gray-100 dark:border-slate-800 space-y-1">
                          {employee.email && (
                            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{employee.email}</span>
                            </div>
                          )}
                          {employee.phone && (
                            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                              <Phone className="h-3 w-3" />
                              <span>{employee.phone}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* User Account */}
                      {employee.userId && (
                        <div className="pt-2 border-t border-gray-100 dark:border-slate-800">
                          <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">{t('system:userAccount')}</p>
                          {(() => {
                            const assignedUser = users.find(u => u.id === employee.userId);
                            return assignedUser ? (
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {assignedUser.firstName} {assignedUser.lastName}
                              </p>
                            ) : (
                              <Badge variant="outline" className="text-xs">{t('system:notAssigned')}</Badge>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('system:employeeId')}</TableHead>
                      <TableHead>{t('common:name')}</TableHead>
                      <TableHead>{t('system:userAccount')}</TableHead>
                      <TableHead>{t('system:position')}</TableHead>
                      <TableHead>{t('system:department')}</TableHead>
                      <TableHead>{t('system:hireDate')}</TableHead>
                      <TableHead>{t('system:salary')}</TableHead>
                      <TableHead>{t('common:status')}</TableHead>
                      <TableHead className="w-[150px]">{t('common:actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee) => (
                      <TableRow key={employee.id} data-testid={`row-employee-${employee.id}`}>
                        <TableCell data-testid={`text-id-${employee.id}`}>
                          <div className="font-mono text-sm">{employee.employeeId}</div>
                        </TableCell>
                        <TableCell data-testid={`text-name-${employee.id}`}>
                          <div className="font-medium">
                            {employee.firstName} {employee.lastName}
                          </div>
                          {employee.email && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                              <Mail className="h-3 w-3" />
                              {employee.email}
                            </div>
                          )}
                          {employee.phone && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {employee.phone}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {employee.userId ? (
                            (() => {
                              const assignedUser = users.find(u => u.id === employee.userId);
                              return assignedUser ? (
                                <div className="text-sm">
                                  {assignedUser.firstName} {assignedUser.lastName}
                                </div>
                              ) : (
                                <Badge variant="outline">{t('system:notAssigned')}</Badge>
                              );
                            })()
                          ) : (
                            <Badge variant="outline">{t('system:notAssigned')}</Badge>
                          )}
                        </TableCell>
                        <TableCell data-testid={`text-position-${employee.id}`}>
                          {employee.position}
                        </TableCell>
                        <TableCell data-testid={`text-department-${employee.id}`}>
                          <div className="flex items-center gap-1">
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                            {employee.department}
                          </div>
                        </TableCell>
                        <TableCell data-testid={`text-hire-date-${employee.id}`}>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {formatDate(employee.hireDate)}
                          </div>
                        </TableCell>
                        <TableCell data-testid={`text-salary-${employee.id}`}>
                          <div className="flex items-center gap-1">
                            {getCurrencyIcon(employee.currency)}
                            <span className="font-medium">
                              {formatSalary(employee.salary, employee.currency)}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {t(`system:${employee.paymentFrequency}`)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(employee.status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setLocation(`/employees/${employee.id}`)}
                                    data-testid={`button-view-${employee.id}`}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{t('common:viewDetails')}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEditEmployee(employee)}
                                    data-testid={`button-edit-${employee.id}`}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{t('common:edit')}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            {employee.userId && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setLocation(`/activity-log/${employee.userId}`)}
                                      data-testid={`button-activity-log-${employee.id}`}
                                    >
                                      <ClipboardList className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{t('system:viewActivityLog')}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteEmployee(employee)}
                                    data-testid={`button-delete-${employee.id}`}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{t('common:delete')}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Employee Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] p-0 flex flex-col overflow-hidden">
          <DialogHeader className="px-4 md:px-6 pt-4 md:pt-6 pb-3 md:pb-4 border-b bg-muted/30 flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base md:text-lg">
              <Users className="h-5 w-5 text-primary" />
              {selectedEmployee ? t('system:editEmployee') : t('system:addEmployee')}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {selectedEmployee
                ? t('common:updateInformation')
                : t('common:addNewMember')}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-6">
              
              {/* Section 1: Personal Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">{t('system:personalInformation')}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('system:firstName')} *</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-first-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('system:lastName')} *</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-last-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('system:email')}</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@example.com" {...field} data-testid="input-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('common:phone')}</FormLabel>
                        <FormControl>
                          <Input placeholder="+420 123 456 789" {...field} data-testid="input-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('common:address')}</FormLabel>
                      <FormControl>
                        <Textarea placeholder={t('system:addressPlaceholder')} className="min-h-[60px]" {...field} data-testid="input-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Section 2: Employment Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">{t('system:employmentDetails')}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="employeeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('system:employeeId')} *</FormLabel>
                        <FormControl>
                          <Input placeholder={t('system:employeeIdPlaceholder')} {...field} data-testid="input-employee-id" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('common:status')} *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-status">
                              <SelectValue placeholder={t('common:selectStatus')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">{t('system:active')}</SelectItem>
                            <SelectItem value="on_leave">{t('system:onLeave')}</SelectItem>
                            <SelectItem value="terminated">{t('system:terminated')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="userId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('system:userAccount')}</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value === "none" ? "" : value);
                          }} 
                          value={field.value || "none"}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-user">
                              <SelectValue placeholder={t('system:selectUser')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">{t('system:noUserAssigned')}</SelectItem>
                            {users.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.firstName} {user.lastName} ({user.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="position"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('system:position')} *</FormLabel>
                        <FormControl>
                          <Input placeholder={t('system:positionPlaceholder')} {...field} data-testid="input-position" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('system:department')} *</FormLabel>
                        <FormControl>
                          <Input placeholder={t('system:departmentPlaceholder')} {...field} data-testid="input-department" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hireDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('system:hireDate')} *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-hire-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="terminationDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('system:terminationDate')}</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-termination-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Section 3: Compensation */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Coins className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">{t('system:compensation')}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="salary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('system:salary')} *</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="30000" {...field} data-testid="input-salary" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('system:salaryCurrency')} *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-currency">
                              <SelectValue placeholder={t('system:selectCurrency')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="CZK">
                              <span className="flex items-center gap-2">
                                <Coins className="h-3 w-3" /> CZK - Czech Koruna
                              </span>
                            </SelectItem>
                            <SelectItem value="EUR">
                              <span className="flex items-center gap-2">
                                <Euro className="h-3 w-3" /> EUR - Euro
                              </span>
                            </SelectItem>
                            <SelectItem value="USD">
                              <span className="flex items-center gap-2">
                                <DollarSign className="h-3 w-3" /> USD - US Dollar
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="paymentFrequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('system:paymentFrequency')} *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-payment-frequency">
                              <SelectValue placeholder={t('system:selectFrequency')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="monthly">{t('system:monthly')}</SelectItem>
                            <SelectItem value="biweekly">{t('system:biweekly')}</SelectItem>
                            <SelectItem value="weekly">{t('system:weekly')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Section 4: Banking & Tax Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">{t('system:bankingAndTax')}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="bankAccount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('system:bankAccount')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('system:bankAccountPlaceholder')} {...field} data-testid="input-bank-account" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bankName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('system:bankName')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('system:bankNamePlaceholder')} {...field} data-testid="input-bank-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="taxId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('system:taxId')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('system:taxIdPlaceholder')} {...field} data-testid="input-tax-id" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="insuranceId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('system:insuranceId')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('system:insuranceIdPlaceholder')} {...field} data-testid="input-insurance-id" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Section 5: Emergency Contact */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">{t('system:emergencyContactSection')}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="emergencyContact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('system:emergencyContactName')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('system:emergencyContactPlaceholder')} {...field} data-testid="input-emergency-contact" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="emergencyPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('system:emergencyPhone')}</FormLabel>
                        <FormControl>
                          <Input placeholder="+420 123 456 789" {...field} data-testid="input-emergency-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Section 6: Additional Notes */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">{t('system:additionalNotes')}</h3>
                </div>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('common:notes')}</FormLabel>
                      <FormControl>
                        <Textarea placeholder={t('system:notesPlaceholder')} className="min-h-[80px]" {...field} data-testid="input-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Footer */}
              <DialogFooter className="pt-4 border-t flex flex-col-reverse sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="w-full sm:w-auto"
                  data-testid="button-cancel"
                >
                  {t('common:cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={saveEmployeeMutation.isPending}
                  className="w-full sm:w-auto"
                  data-testid="button-save-employee"
                >
                  {saveEmployeeMutation.isPending
                    ? t('system:saving')
                    : selectedEmployee
                    ? t('system:updateEmployee')
                    : t('system:addEmployee')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-confirmation">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('system:deleteEmployee')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('system:areYouSureDeleteEmployee')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              {t('common:cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedEmployee && deleteEmployeeMutation.mutate(selectedEmployee.id)}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              disabled={deleteEmployeeMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteEmployeeMutation.isPending ? t('common:deleting') : t('system:deleteEmployee')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
