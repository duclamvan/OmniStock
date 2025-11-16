import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  User as UserIcon, 
  Mail, 
  Save, 
  Loader2, 
  Shield, 
  Calendar, 
  AlertCircle, 
  RefreshCw,
  ShoppingCart,
  Package,
  Activity,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  AlertTriangle
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import type { User } from "@shared/schema";
import { useTranslation } from "react-i18next";

const formSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
});

type FormValues = z.infer<typeof formSchema>;

interface Order {
  id: string;
  orderId: string;
  orderStatus: string;
  paymentStatus: string;
  customerName?: string;
  totalAmount?: string;
  currency?: string;
  createdAt: string;
  updatedAt?: string;
}

export default function Profile() {
  const { toast } = useToast();
  const { t } = useTranslation();

  const { data: user, isLoading, isError, refetch } = useQuery<User>({
    queryKey: ['/api/users/me'],
    refetchOnMount: true,
  });

  // Fetch recent orders for activity
  const { data: recentOrders = [] } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
    enabled: !!user,
  });

  // Fetch all products for counting
  const { data: products = [] } = useQuery<any[]>({
    queryKey: ['/api/products'],
    enabled: !!user,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
    },
  });

  // Update form when user data loads
  useEffect(() => {
    if (user) {
      form.reset({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
      });
    }
  }, [user, form]);

  const updateProfileMutation = useMutation<User, any, FormValues>({
    mutationFn: async (data: FormValues) => {
      const res = await apiRequest('PATCH', '/api/users/me', data);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/me'] });
      
      form.reset({
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        email: data.email || '',
      });
      
      toast({
        title: t('common:success') || "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error: any) => {
      const errorDetails = error?.details || error?.fullResponse || error;
      const errorField = errorDetails?.field || error?.field;
      const errorMessage = errorDetails?.error || error?.error || errorDetails?.message || error?.message;
      
      if (errorField && errorMessage) {
        form.setError(errorField as keyof FormValues, {
          type: 'manual',
          message: errorMessage,
        });
      } else {
        toast({
          title: "Update Failed",
          description: errorMessage || "Failed to update profile. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const onSubmit = (data: FormValues) => {
    updateProfileMutation.mutate(data);
  };

  const getRoleBadgeColor = (role: string | undefined) => {
    switch (role) {
      case 'administrator':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 border-purple-200 dark:border-purple-800';
      case 'warehouse_operator':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 border-gray-200 dark:border-gray-800';
    }
  };

  const formatRole = (role: string | undefined) => {
    if (!role) return 'N/A';
    return role
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getOrderStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />;
      case 'processing':
        return <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case 'shipped':
        return <Truck className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800';
      case 'processing':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800';
      case 'shipped':
        return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800';
      case 'completed':
        return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800';
      case 'cancelled':
        return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800';
    }
  };

  // Calculate statistics
  const totalOrders = recentOrders.length;
  const pendingOrders = recentOrders.filter(o => o.orderStatus === 'pending').length;
  const completedOrders = recentOrders.filter(o => o.orderStatus === 'completed' || o.orderStatus === 'shipped').length;

  // Get user initials for avatar
  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  // Show loading skeleton while data is being fetched
  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-800 dark:to-purple-800 rounded-lg p-8">
          <div className="flex items-start gap-6">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-5 w-96" />
              <Skeleton className="h-6 w-32" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-12 w-12 mb-4" />
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-40 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-40 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show error state if fetch failed or user is null
  if (isError || !user) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle>Failed to Load Profile</CardTitle>
            </div>
            <CardDescription>
              Unable to load your profile information. Please try again.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              {isError ? "There was an error loading your profile data." : "Profile data is unavailable."}
            </p>
            <Button onClick={() => refetch()} data-testid="button-retry">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const latestOrders = recentOrders
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-800 dark:to-purple-800 rounded-lg p-8 shadow-lg">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Avatar */}
          <div className="h-24 w-24 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-xl ring-4 ring-white/20">
            <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {getInitials()}
            </span>
          </div>
          
          {/* User Info */}
          <div className="flex-1 text-white">
            <h1 className="text-3xl font-bold mb-2" data-testid="text-user-name">
              {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : 'User Profile'}
            </h1>
            <p className="text-blue-100 dark:text-blue-200 mb-3 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {user.email}
            </p>
            <Badge 
              className={`${getRoleBadgeColor(user.role)} font-semibold border`}
              data-testid="badge-role"
            >
              <Shield className="h-3 w-3 mr-1" />
              {formatRole(user.role)}
            </Badge>
          </div>

          {/* Member Since */}
          <div className="text-white/90 text-right">
            <p className="text-sm text-blue-100 dark:text-blue-200 mb-1">Member Since</p>
            <p className="text-lg font-semibold">
              {user.createdAt ? format(new Date(user.createdAt), 'MMM yyyy') : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-t-4 border-t-blue-500 dark:border-t-blue-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Total Orders
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="stat-total-orders">
                  {totalOrders}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-yellow-500 dark:border-t-yellow-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Pending Orders
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="stat-pending-orders">
                  {pendingOrders}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-green-500 dark:border-t-green-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Completed
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="stat-completed-orders">
                  {completedOrders}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserIcon className="h-5 w-5 text-primary" />
              <CardTitle>Personal Information</CardTitle>
            </div>
            <CardDescription>
              Update your personal details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="First name" 
                            {...field} 
                            disabled={updateProfileMutation.isPending}
                            data-testid="input-firstName" 
                          />
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
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Last name" 
                            {...field} 
                            disabled={updateProfileMutation.isPending}
                            data-testid="input-lastName" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="email@example.com"
                          {...field}
                          disabled={updateProfileMutation.isPending}
                          data-testid="input-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={isLoading || updateProfileMutation.isPending || !form.formState.isDirty}
                  className="w-full"
                  data-testid="button-save"
                >
                  {updateProfileMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Account Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Account Details</CardTitle>
            </div>
            <CardDescription>
              Your account information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Account Role
                  </p>
                  <Badge className={getRoleBadgeColor(user.role)}>
                    {formatRole(user.role)}
                  </Badge>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {user.role === 'administrator' 
                      ? 'Full system access and management capabilities'
                      : 'Warehouse operations and order fulfillment'}
                  </p>
                </div>
              </div>

              <div className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Account Created
                  </p>
                  <p className="text-base font-semibold text-gray-900 dark:text-white" data-testid="text-createdAt">
                    {user.createdAt ? format(new Date(user.createdAt), 'PPP') : 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {user.createdAt ? formatDistanceToNow(new Date(user.createdAt), { addSuffix: true }) : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    User ID
                  </p>
                  <p className="text-sm font-mono text-gray-900 dark:text-white">
                    {user.id}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <CardTitle>Recent Activities</CardTitle>
            </div>
            <Badge variant="secondary" className="font-normal">
              Last 5 orders
            </Badge>
          </div>
          <CardDescription>
            Your most recent order activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          {latestOrders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-1">No recent activities</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Your order activities will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {latestOrders.map((order, index) => (
                <div key={order.id}>
                  <div className="flex items-start gap-4 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                    <div className="mt-1">
                      {getOrderStatusIcon(order.orderStatus)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 dark:text-white mb-1" data-testid={`activity-order-${index}`}>
                            Order #{order.orderId}
                          </p>
                          {order.customerName && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Customer: {order.customerName}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <Badge 
                            variant="outline" 
                            className={`${getOrderStatusColor(order.orderStatus)} capitalize text-xs`}
                          >
                            {order.orderStatus.replace('_', ' ')}
                          </Badge>
                          {order.totalAmount && (
                            <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                              {order.currency || 'CZK'} {order.totalAmount}
                            </p>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  {index < latestOrders.length - 1 && <Separator className="my-2" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
