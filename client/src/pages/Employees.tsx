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
  ClipboardList
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            {t('system:employees')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('system:manageYourTeamAndPayroll')}
          </p>
        </div>
        <Button onClick={handleAddEmployee} data-testid="button-add-employee">
          <Plus className="h-4 w-4 mr-2" />
          {t('system:addEmployee')}
        </Button>
      </div>

      {/* Payroll Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('system:totalEmployees')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeEmployees.length}</div>
            <p className="text-xs text-muted-foreground">
              {t('system:activeStaffMembers')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('system:monthlyPayroll')}</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMonthlyPayroll.toLocaleString()} CZK</div>
            <p className="text-xs text-muted-foreground">
              {t('system:totalMonthlyCosts')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('system:annualPayroll')}</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAnnualPayroll.toLocaleString()} CZK</div>
            <p className="text-xs text-muted-foreground">
              {t('system:estimatedYearlyCosts')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Employees Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('system:allEmployees')} ({employees.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
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
            <div className="overflow-x-auto">
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
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Employee Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedEmployee ? t('system:editEmployee') : t('system:addEmployee')}
            </DialogTitle>
            <DialogDescription>
              {selectedEmployee
                ? t('common:updateInformation')
                : t('common:addNewMember')}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="employeeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('system:employeeId')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('system:employeeIdPlaceholder')} {...field} data-testid="input-employee-id" />
                      </FormControl>
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-user">
                            <SelectValue placeholder={t('system:selectUser')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">{t('system:noUserAssigned')}</SelectItem>
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
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('common:status')}</FormLabel>
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
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('system:firstName')}</FormLabel>
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
                      <FormLabel>{t('system:lastName')}</FormLabel>
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
                        <Input type="email" {...field} data-testid="input-email" />
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
                        <Input {...field} data-testid="input-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('system:position')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('common:warehouseManagerPlaceholder')} {...field} data-testid="input-position" />
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
                      <FormLabel>{t('system:department')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('common:warehousePlaceholder')} {...field} data-testid="input-department" />
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
                      <FormLabel>{t('system:hireDate')}</FormLabel>
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
                      <FormLabel>{t('system:terminationDate')} ({t('common:optional')})</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-termination-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="salary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('system:salary')}</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="30000" {...field} data-testid="input-salary" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentFrequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('system:paymentFrequency')}</FormLabel>
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

                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('financial:currency')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-currency">
                            <SelectValue placeholder={t('system:selectCurrency')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="CZK">CZK</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bankAccount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('system:bankAccount')}</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-bank-account" />
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
                        <Input {...field} data-testid="input-bank-name" />
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
                        <Input {...field} data-testid="input-tax-id" />
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
                        <Input {...field} data-testid="input-insurance-id" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="emergencyContact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('system:emergencyContact')}</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-emergency-contact" />
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
                        <Input {...field} data-testid="input-emergency-phone" />
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
                      <Textarea {...field} data-testid="input-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('common:notes')}</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid="input-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  {t('common:cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={saveEmployeeMutation.isPending}
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
