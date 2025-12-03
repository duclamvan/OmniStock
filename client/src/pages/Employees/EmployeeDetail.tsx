import { useState, useMemo } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatCurrency } from "@/lib/currencyUtils";
import type { Employee, EmployeeIncident, WarehouseTask, ActivityLog, OrderFulfillmentLog } from "@shared/schema";

type ActivitySource = 'activity' | 'fulfillment';

type UnifiedActivityItem = 
  | (ActivityLog & { source: 'activity'; timestamp: number })
  | (OrderFulfillmentLog & { source: 'fulfillment'; timestamp: number });

interface GroupedFulfillment {
  orderId: string;
  hasPick: boolean;
  hasPack: boolean;
  pickLog?: OrderFulfillmentLog;
  packLog?: OrderFulfillmentLog;
  earliestTime: Date;
  totalItems: number;
}

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar as CalendarIcon,
  Building2,
  DollarSign,
  Coins,
  Euro,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ClipboardList,
  Activity,
  ShoppingCart,
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  UserPlus,
  Shield,
  Check,
  X,
  FileText,
  Briefcase,
  CreditCard,
  Heart,
  Package,
  PackageCheck,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface EmployeeStats {
  totalOrders: number;
  tasksCompleted: number;
  totalTasks: number;
  openIncidents: number;
  recentActivityCount: number;
}

const incidentFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  type: z.enum(["mistake", "safety", "quality", "attendance", "policy", "other"]),
  severity: z.enum(["minor", "moderate", "major", "critical"]),
  description: z.string().optional(),
  notes: z.string().optional(),
  occurredAt: z.date().optional(),
});

type IncidentFormValues = z.infer<typeof incidentFormSchema>;

export default function EmployeeDetail() {
  const { t } = useTranslation(["system", "common"]);
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [incidentDialogOpen, setIncidentDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<EmployeeIncident | null>(null);

  const employeeId = id ? parseInt(id, 10) : null;

  const { data: employee, isLoading: employeeLoading, error: employeeError } = useQuery<Employee>({
    queryKey: ["/api/employees", employeeId],
    enabled: !!employeeId,
  });

  const { data: stats, isLoading: statsLoading } = useQuery<EmployeeStats>({
    queryKey: ["/api/employees", employeeId, "stats"],
    enabled: !!employeeId,
  });

  const { data: incidents = [], isLoading: incidentsLoading } = useQuery<EmployeeIncident[]>({
    queryKey: ["/api/employees", employeeId, "incidents"],
    enabled: !!employeeId,
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<WarehouseTask[]>({
    queryKey: ["/api/employees", employeeId, "tasks"],
    enabled: !!employeeId,
  });

  const { data: rawActivityData = [], isLoading: activityLoading } = useQuery<UnifiedActivityItem[]>({
    queryKey: ["/api/employees", employeeId, "activity"],
    enabled: !!employeeId,
  });

  const processedActivityData = useMemo(() => {
    const activityItems: UnifiedActivityItem[] = [];
    const fulfillmentByOrder = new Map<string, GroupedFulfillment>();

    rawActivityData.forEach((item) => {
      if (item.source === 'activity') {
        activityItems.push(item);
      } else if (item.source === 'fulfillment') {
        const fulfillment = item as OrderFulfillmentLog & { source: 'fulfillment'; timestamp: number };
        const orderId = fulfillment.orderId;
        
        if (!fulfillmentByOrder.has(orderId)) {
          fulfillmentByOrder.set(orderId, {
            orderId,
            hasPick: false,
            hasPack: false,
            earliestTime: new Date(fulfillment.startedAt),
            totalItems: 0,
          });
        }
        
        const group = fulfillmentByOrder.get(orderId)!;
        const startTime = new Date(fulfillment.startedAt);
        if (startTime < group.earliestTime) {
          group.earliestTime = startTime;
        }
        
        if (fulfillment.activityType === 'pick') {
          group.hasPick = true;
          group.pickLog = fulfillment;
          group.totalItems += fulfillment.itemCount || 0;
        } else if (fulfillment.activityType === 'pack') {
          group.hasPack = true;
          group.packLog = fulfillment;
          if (!group.hasPick) {
            group.totalItems += fulfillment.itemCount || 0;
          }
        }
      }
    });

    const groupedFulfillments: { type: 'grouped'; group: GroupedFulfillment; timestamp: number }[] = 
      Array.from(fulfillmentByOrder.values()).map(group => ({
        type: 'grouped' as const,
        group,
        timestamp: group.earliestTime.getTime(),
      }));

    const combined = [
      ...activityItems.map(item => ({ type: 'activity' as const, item, timestamp: item.timestamp })),
      ...groupedFulfillments,
    ].sort((a, b) => b.timestamp - a.timestamp);

    return combined;
  }, [rawActivityData]);

  const form = useForm<IncidentFormValues>({
    resolver: zodResolver(incidentFormSchema),
    defaultValues: {
      title: "",
      type: "mistake",
      severity: "minor",
      description: "",
      notes: "",
      occurredAt: new Date(),
    },
  });

  const saveIncidentMutation = useMutation({
    mutationFn: async (data: IncidentFormValues) => {
      const payload = {
        ...data,
        employeeId: employeeId,
        occurredAt: data.occurredAt?.toISOString(),
      };

      if (selectedIncident) {
        const response = await apiRequest("PATCH", `/api/employees/${employeeId}/incidents/${selectedIncident.id}`, payload);
        return response.json();
      } else {
        const response = await apiRequest("POST", `/api/employees/${employeeId}/incidents`, payload);
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees", employeeId, "incidents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employees", employeeId, "stats"] });
      toast({
        title: t("common:success"),
        description: selectedIncident ? t("system:incidentUpdated") : t("system:incidentCreated"),
      });
      setIncidentDialogOpen(false);
      setSelectedIncident(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: t("common:error"),
        description: error.message || t("common:saveFailed"),
        variant: "destructive",
      });
    },
  });

  const resolveIncidentMutation = useMutation({
    mutationFn: async ({ incidentId, status }: { incidentId: number; status: string }) => {
      const response = await apiRequest("PATCH", `/api/employees/${employeeId}/incidents/${incidentId}`, {
        status,
        resolvedAt: status === "resolved" || status === "dismissed" ? new Date().toISOString() : null,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees", employeeId, "incidents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employees", employeeId, "stats"] });
      toast({
        title: t("common:success"),
        description: t("system:incidentStatusUpdated"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("common:error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteIncidentMutation = useMutation({
    mutationFn: async (incidentId: number) => {
      const response = await apiRequest("DELETE", `/api/employees/${employeeId}/incidents/${incidentId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees", employeeId, "incidents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employees", employeeId, "stats"] });
      toast({
        title: t("common:success"),
        description: t("common:deleteSuccess"),
      });
      setDeleteDialogOpen(false);
      setSelectedIncident(null);
    },
    onError: (error: any) => {
      toast({
        title: t("common:error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddIncident = () => {
    setSelectedIncident(null);
    form.reset({
      title: "",
      type: "mistake",
      severity: "minor",
      description: "",
      notes: "",
      occurredAt: new Date(),
    });
    setIncidentDialogOpen(true);
  };

  const handleEditIncident = (incident: EmployeeIncident) => {
    setSelectedIncident(incident);
    form.reset({
      title: incident.title,
      type: incident.type as any,
      severity: incident.severity as any,
      description: incident.description || "",
      notes: incident.notes || "",
      occurredAt: incident.occurredAt ? new Date(incident.occurredAt) : new Date(),
    });
    setIncidentDialogOpen(true);
  };

  const handleDeleteIncident = (incident: EmployeeIncident) => {
    setSelectedIncident(incident);
    setDeleteDialogOpen(true);
  };

  const onSubmit = (data: IncidentFormValues) => {
    saveIncidentMutation.mutate(data);
  };

  const getStatusBadge = (status: string) => {
    if (status === "active") {
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">{t("system:active")}</Badge>;
    } else if (status === "on_leave") {
      return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">{t("system:onLeave")}</Badge>;
    }
    return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">{t("system:terminated")}</Badge>;
  };

  const getIncidentSeverityBadge = (severity: string) => {
    const colors: Record<string, string> = {
      minor: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      moderate: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      major: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    };
    return <Badge className={colors[severity] || colors.minor}>{t(`system:${severity}`)}</Badge>;
  };

  const getIncidentStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      open: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      investigating: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      resolved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      dismissed: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
    };
    return <Badge className={colors[status] || colors.open}>{t(`system:${status}`)}</Badge>;
  };

  const getTaskStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
      in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    };
    return <Badge className={colors[status] || colors.pending}>{t(`system:${status}`)}</Badge>;
  };

  const getCurrencyIcon = (currency: string) => {
    if (currency === "CZK") return <Coins className="h-4 w-4" />;
    if (currency === "EUR") return <Euro className="h-4 w-4" />;
    return <DollarSign className="h-4 w-4" />;
  };

  const formatSalary = (amount: string | number, currency: string) => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    return `${numAmount.toLocaleString()} ${currency}`;
  };

  if (employeeLoading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent className="space-y-4">
                {[1, 2, 3, 4].map((j) => (
                  <Skeleton key={j} className="h-4 w-full" />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (employeeError || !employee) {
    return (
      <div className="p-4 md:p-6">
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <CardContent className="p-6 flex flex-col items-center gap-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <h2 className="text-xl font-semibold text-red-700 dark:text-red-400">{t("system:employeeNotFound")}</h2>
            <p className="text-red-600 dark:text-red-300">{t("system:employeeNotFoundDescription")}</p>
            <Button
              onClick={() => navigate("/employees")}
              className="min-h-[56px] px-6"
              data-testid="button-back-to-employees"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              {t("common:back")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Link href="/employees">
          <Button
            variant="outline"
            size="icon"
            className="min-h-[56px] min-w-[56px] flex-shrink-0"
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
              {employee.firstName} {employee.lastName}
            </h1>
            {getStatusBadge(employee.status)}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <Building2 className="h-4 w-4" />
              <span className="font-medium">{employee.position}</span>
            </div>
            <span>•</span>
            <span>{employee.department}</span>
            <span>•</span>
            <div className="flex items-center gap-1">
              <CalendarIcon className="h-4 w-4" />
              <span>{t("system:hireDate")}: {formatDate(employee.hireDate)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <ShoppingCart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t("system:totalOrders")}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {statsLoading ? <Skeleton className="h-8 w-12" /> : stats?.totalOrders || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t("system:tasksCompleted")}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    `${stats?.tasksCompleted || 0}/${stats?.totalTasks || 0}`
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t("system:openIncidents")}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {statsLoading ? <Skeleton className="h-8 w-12" /> : stats?.openIncidents || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t("system:recentActivity")}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {statsLoading ? <Skeleton className="h-8 w-12" /> : stats?.recentActivityCount || 0}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{t("system:last30Days")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="info" className="space-y-6">
        <TabsList className="flex flex-wrap gap-1 h-auto bg-gray-100 dark:bg-slate-800 p-1">
          <TabsTrigger
            value="info"
            className="min-h-[44px] px-4 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900"
            data-testid="tab-info"
          >
            <User className="h-4 w-4 mr-2" />
            {t("system:personalInformation")}
          </TabsTrigger>
          <TabsTrigger
            value="incidents"
            className="min-h-[44px] px-4 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900"
            data-testid="tab-incidents"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            {t("system:incidents")}
            {incidents.length > 0 && (
              <Badge variant="secondary" className="ml-2">{incidents.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="tasks"
            className="min-h-[44px] px-4 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900"
            data-testid="tab-tasks"
          >
            <ClipboardList className="h-4 w-4 mr-2" />
            {t("system:tasks")}
            {tasks.length > 0 && (
              <Badge variant="secondary" className="ml-2">{tasks.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="activity"
            className="min-h-[44px] px-4 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900"
            data-testid="tab-activity"
          >
            <Activity className="h-4 w-4 mr-2" />
            {t("system:recentActivity")}
          </TabsTrigger>
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Personal Information */}
            <Card className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5 text-primary" />
                  {t("system:personalInformation")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t("system:fullName")}</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100" data-testid="text-employee-name">
                      {employee.firstName} {employee.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t("system:employeeId")}</p>
                    <p className="font-mono font-medium text-gray-900 dark:text-gray-100" data-testid="text-employee-id">
                      {employee.employeeId}
                    </p>
                  </div>
                </div>

                {employee.email && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t("system:email")}</p>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <a
                        href={`mailto:${employee.email}`}
                        className="font-medium text-primary hover:underline"
                        data-testid="link-email"
                      >
                        {employee.email}
                      </a>
                    </div>
                  </div>
                )}

                {employee.phone && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t("common:phone")}</p>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <a
                        href={`tel:${employee.phone}`}
                        className="font-medium text-primary hover:underline"
                        data-testid="link-phone"
                      >
                        {employee.phone}
                      </a>
                    </div>
                  </div>
                )}

                {employee.address && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t("common:address")}</p>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                      <p className="text-gray-900 dark:text-gray-100" data-testid="text-address">
                        {employee.address}
                      </p>
                    </div>
                  </div>
                )}

                {(employee.emergencyContact || employee.emergencyPhone) && (
                  <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-3">
                      <Heart className="h-4 w-4 text-red-500" />
                      <p className="font-medium text-gray-900 dark:text-gray-100">{t("system:emergencyContact")}</p>
                    </div>
                    {employee.emergencyContact && (
                      <p className="text-gray-900 dark:text-gray-100" data-testid="text-emergency-contact">
                        {employee.emergencyContact}
                      </p>
                    )}
                    {employee.emergencyPhone && (
                      <div className="flex items-center gap-2 mt-1">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <a
                          href={`tel:${employee.emergencyPhone}`}
                          className="text-primary hover:underline"
                          data-testid="link-emergency-phone"
                        >
                          {employee.emergencyPhone}
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Employment Details */}
            <Card className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Briefcase className="h-5 w-5 text-primary" />
                  {t("system:employmentDetails")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t("system:position")}</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100" data-testid="text-position">
                      {employee.position}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t("system:department")}</p>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      <p className="font-medium text-gray-900 dark:text-gray-100" data-testid="text-department">
                        {employee.department}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t("system:hireDate")}</p>
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-gray-400" />
                      <p className="font-medium text-gray-900 dark:text-gray-100" data-testid="text-hire-date">
                        {formatDate(employee.hireDate)}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t("common:status")}</p>
                    {getStatusBadge(employee.status)}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-3">
                    <CreditCard className="h-4 w-4 text-primary" />
                    <p className="font-medium text-gray-900 dark:text-gray-100">{t("system:compensation")}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t("system:salary")}</p>
                      <div className="flex items-center gap-2">
                        {getCurrencyIcon(employee.currency)}
                        <p className="font-bold text-xl text-gray-900 dark:text-gray-100" data-testid="text-salary">
                          {formatSalary(employee.salary, employee.currency)}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t("system:paymentFrequency")}</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100" data-testid="text-payment-frequency">
                        {t(`system:${employee.paymentFrequency}`)}
                      </p>
                    </div>
                  </div>
                </div>

                {(employee.bankAccount || employee.bankName || employee.taxId || employee.insuranceId) && (
                  <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
                    <p className="font-medium text-gray-900 dark:text-gray-100 mb-3">{t("system:bankingAndTax")}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      {employee.bankName && (
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">{t("system:bankName")}</p>
                          <p className="text-gray-900 dark:text-gray-100">{employee.bankName}</p>
                        </div>
                      )}
                      {employee.bankAccount && (
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">{t("system:bankAccount")}</p>
                          <p className="font-mono text-gray-900 dark:text-gray-100">{employee.bankAccount}</p>
                        </div>
                      )}
                      {employee.taxId && (
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">{t("system:taxId")}</p>
                          <p className="font-mono text-gray-900 dark:text-gray-100">{employee.taxId}</p>
                        </div>
                      )}
                      {employee.insuranceId && (
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">{t("system:insuranceId")}</p>
                          <p className="font-mono text-gray-900 dark:text-gray-100">{employee.insuranceId}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {employee.notes && (
                  <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t("system:additionalNotes")}</p>
                    <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap" data-testid="text-notes">
                      {employee.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Incidents Tab */}
        <TabsContent value="incidents" className="space-y-4">
          <Card className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertTriangle className="h-5 w-5 text-primary" />
                  {t("system:incidents")}
                </CardTitle>
                <CardDescription>{t("system:incidentsDescription")}</CardDescription>
              </div>
              <Button
                onClick={handleAddIncident}
                className="min-h-[56px] px-6"
                data-testid="button-add-incident"
              >
                <Plus className="h-5 w-5 mr-2" />
                {t("system:addIncident")}
              </Button>
            </CardHeader>
            <CardContent>
              {incidentsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : incidents.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{t("system:noIncidents")}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("system:title")}</TableHead>
                        <TableHead>{t("system:type")}</TableHead>
                        <TableHead>{t("system:severity")}</TableHead>
                        <TableHead>{t("common:status")}</TableHead>
                        <TableHead>{t("system:occurredAt")}</TableHead>
                        <TableHead className="w-[180px]">{t("common:actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {incidents.map((incident) => (
                        <TableRow key={incident.id} data-testid={`row-incident-${incident.id}`}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-gray-100">{incident.title}</p>
                              {incident.description && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[300px]">
                                  {incident.description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{t(`system:${incident.type}`)}</Badge>
                          </TableCell>
                          <TableCell>{getIncidentSeverityBadge(incident.severity)}</TableCell>
                          <TableCell>{getIncidentStatusBadge(incident.status)}</TableCell>
                          <TableCell>
                            {incident.occurredAt ? formatDate(incident.occurredAt) : "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {incident.status === "open" && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="min-h-[44px] min-w-[44px]"
                                    onClick={() => resolveIncidentMutation.mutate({ incidentId: incident.id, status: "resolved" })}
                                    data-testid={`button-resolve-${incident.id}`}
                                  >
                                    <Check className="h-4 w-4 text-green-600" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="min-h-[44px] min-w-[44px]"
                                    onClick={() => resolveIncidentMutation.mutate({ incidentId: incident.id, status: "dismissed" })}
                                    data-testid={`button-dismiss-${incident.id}`}
                                  >
                                    <X className="h-4 w-4 text-gray-600" />
                                  </Button>
                                </>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="min-h-[44px] min-w-[44px]"
                                onClick={() => handleEditIncident(incident)}
                                data-testid={`button-edit-${incident.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="min-h-[44px] min-w-[44px]"
                                onClick={() => handleDeleteIncident(incident)}
                                data-testid={`button-delete-${incident.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
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
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          <Card className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ClipboardList className="h-5 w-5 text-primary" />
                {t("system:assignedTasks")}
              </CardTitle>
              <CardDescription>{t("system:tasksDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              {tasksLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{t("system:noTasks")}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-4 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800/50"
                      data-testid={`card-task-${task.id}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-gray-900 dark:text-gray-100">{task.title}</h4>
                            {getTaskStatusBadge(task.status)}
                          </div>
                          {task.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">{task.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <Badge variant="outline" className="text-xs">{t(`system:${task.priority}`)}</Badge>
                            </span>
                            {task.dueAt && (
                              <span className="flex items-center gap-1">
                                <CalendarIcon className="h-3 w-3" />
                                {t("system:dueDate")}: {formatDate(task.dueAt)}
                              </span>
                            )}
                            {task.completedAt && (
                              <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                <CheckCircle className="h-3 w-3" />
                                {t("system:completedAt")}: {formatDate(task.completedAt)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5 text-primary" />
                {t("system:recentActivity")}
              </CardTitle>
              <CardDescription>{t("system:activityDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : processedActivityData.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{t("system:noActivityRecorded")}</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-slate-700" />
                  <div className="space-y-6">
                    {processedActivityData.map((entry, index) => {
                      if (entry.type === 'activity') {
                        const activity = entry.item;
                        if (activity.source !== 'activity') return null;
                        return (
                          <div
                            key={`activity-${activity.id}`}
                            className="relative pl-10 min-h-[56px]"
                            data-testid={`activity-log-${activity.id}`}
                          >
                            <div className="absolute left-2.5 top-1 w-3 h-3 rounded-full bg-primary ring-4 ring-white dark:ring-slate-900" />
                            <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg min-h-[56px]">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                <p className="font-medium text-gray-900 dark:text-gray-100">{activity.description}</p>
                                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDate(activity.createdAt)}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2 text-xs">
                                <Badge variant="outline">{activity.action}</Badge>
                                {activity.entityType && (
                                  <Badge variant="secondary">{activity.entityType}</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      } else if (entry.type === 'grouped') {
                        const group = entry.group;
                        const activityLabel = group.hasPick && group.hasPack 
                          ? t("system:pickedAndPacked")
                          : group.hasPick 
                            ? t("system:picked")
                            : t("system:packed");
                        
                        const IconComponent = group.hasPick && group.hasPack 
                          ? PackageCheck 
                          : group.hasPick 
                            ? ClipboardList 
                            : Package;
                        
                        const iconBgColor = group.hasPick && group.hasPack
                          ? "bg-green-500"
                          : group.hasPick
                            ? "bg-blue-500"
                            : "bg-purple-500";

                        return (
                          <div
                            key={`fulfillment-${group.orderId}-${entry.timestamp}`}
                            className="relative pl-10 min-h-[56px]"
                            data-testid={`fulfillment-${group.orderId}`}
                          >
                            <div className={`absolute left-2.5 top-1 w-3 h-3 rounded-full ${iconBgColor} ring-4 ring-white dark:ring-slate-900`} />
                            <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg min-h-[56px]">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2">
                                  <IconComponent className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                                  <p className="font-medium text-gray-900 dark:text-gray-100">
                                    {activityLabel} {t("system:orderLabel")} #{group.orderId} ({group.totalItems} {t("system:items")})
                                  </p>
                                </div>
                                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDate(group.earliestTime)}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2 text-xs">
                                <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/30">
                                  {t("system:fulfillmentActivity")}
                                </Badge>
                                {group.hasPick && (
                                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                    {t("system:picked")}
                                  </Badge>
                                )}
                                {group.hasPack && (
                                  <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                    {t("system:packed")}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Incident Dialog */}
      <Dialog open={incidentDialogOpen} onOpenChange={setIncidentDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              {selectedIncident ? t("system:editIncident") : t("system:addIncident")}
            </DialogTitle>
            <DialogDescription>
              {selectedIncident
                ? t("system:editIncidentDescription")
                : t("system:addIncidentDescription")}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("system:title")} *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t("system:incidentTitlePlaceholder")}
                        data-testid="input-incident-title"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("system:type")}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger
                            className="min-h-[56px]"
                            data-testid="select-incident-type"
                          >
                            <SelectValue placeholder={t("system:selectType")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="mistake">{t("system:mistake")}</SelectItem>
                          <SelectItem value="safety">{t("system:safety")}</SelectItem>
                          <SelectItem value="quality">{t("system:quality")}</SelectItem>
                          <SelectItem value="attendance">{t("system:attendance")}</SelectItem>
                          <SelectItem value="policy">{t("system:policy")}</SelectItem>
                          <SelectItem value="other">{t("system:other")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="severity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("system:severity")}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger
                            className="min-h-[56px]"
                            data-testid="select-incident-severity"
                          >
                            <SelectValue placeholder={t("system:selectSeverity")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="minor">{t("system:minor")}</SelectItem>
                          <SelectItem value="moderate">{t("system:moderate")}</SelectItem>
                          <SelectItem value="major">{t("system:major")}</SelectItem>
                          <SelectItem value="critical">{t("system:critical")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="occurredAt"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t("system:occurredAt")}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full min-h-[56px] pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            data-testid="button-date-picker"
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>{t("system:pickDate")}</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("system:description")}</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder={t("system:incidentDescriptionPlaceholder")}
                        className="min-h-[100px]"
                        data-testid="textarea-incident-description"
                      />
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
                    <FormLabel>{t("system:notes")}</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder={t("system:incidentNotesPlaceholder")}
                        className="min-h-[80px]"
                        data-testid="textarea-incident-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIncidentDialogOpen(false)}
                  className="min-h-[56px]"
                  data-testid="button-cancel"
                >
                  {t("common:cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={saveIncidentMutation.isPending}
                  className="min-h-[56px]"
                  data-testid="button-save-incident"
                >
                  {saveIncidentMutation.isPending ? t("system:saving") : t("common:save")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Incident Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("system:deleteIncident")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("system:deleteIncidentConfirmation")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="min-h-[56px]"
              data-testid="button-cancel-delete"
            >
              {t("common:cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedIncident && deleteIncidentMutation.mutate(selectedIncident.id)}
              className="min-h-[56px] bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              {t("common:delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
