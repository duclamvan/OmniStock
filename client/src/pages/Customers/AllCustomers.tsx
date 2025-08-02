import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { createVietnameseSearchMatcher } from "@/lib/vietnameseSearch";
import { formatCurrency } from "@/lib/currencyUtils";
import { Plus, Search, Edit, Trash2, User, Mail, Phone, Star } from "lucide-react";
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

export default function AllCustomers() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedCustomers, setSelectedCustomers] = useState<any[]>([]);

  const { data: customers = [], isLoading, error } = useQuery({
    queryKey: searchQuery ? ['/api/customers', { search: searchQuery }] : ['/api/customers'],
    retry: false,
  });

  // Error handling
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load customers",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const deleteCustomerMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => apiRequest('DELETE', `/api/customers/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      toast({
        title: "Success",
        description: `Deleted ${selectedCustomers.length} customer(s) successfully`,
      });
      setSelectedCustomers([]);
    },
    onError: (error: any) => {
      console.error("Customer delete error:", error);
      const errorMessage = error.message || "Failed to delete customers";
      toast({
        title: "Error",
        description: errorMessage.includes('referenced') || errorMessage.includes('constraint')
          ? "Cannot delete customer - they have existing orders or records" 
          : errorMessage,
        variant: "destructive",
      });
    },
  });

  // Define table columns
  const columns: DataTableColumn<any>[] = [
    {
      key: "name",
      header: "Customer Name",
      sortable: true,
      cell: (customer) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-gray-600" />
          </div>
          <div>
            <Link href={`/customers/${customer.id}/edit`}>
              <span className="font-medium text-blue-600 hover:text-blue-800 cursor-pointer">
                {customer.name}
              </span>
            </Link>
            {customer.type === 'vip' && (
              <Star className="inline-block ml-1 h-4 w-4 text-yellow-500 fill-yellow-500" />
            )}
          </div>
        </div>
      ),
    },
    {
      key: "email",
      header: "Email",
      sortable: true,
      cell: (customer) => customer.email ? (
        <div className="flex items-center gap-1">
          <Mail className="h-4 w-4 text-gray-400" />
          {customer.email}
        </div>
      ) : '-',
    },
    {
      key: "phone",
      header: "Phone",
      sortable: true,
      cell: (customer) => customer.phone ? (
        <div className="flex items-center gap-1">
          <Phone className="h-4 w-4 text-gray-400" />
          {customer.phone}
        </div>
      ) : '-',
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      cell: (customer) => {
        const types: Record<string, { label: string; color: string }> = {
          'regular': { label: 'Regular', color: 'bg-gray-100 text-gray-800' },
          'vip': { label: 'VIP', color: 'bg-yellow-100 text-yellow-800' },
          'wholesale': { label: 'Wholesale', color: 'bg-blue-100 text-blue-800' },
        };
        const type = types[customer.type] || { label: customer.type, color: 'bg-gray-100 text-gray-800' };
        return <Badge className={type.color}>{type.label}</Badge>;
      },
    },
    {
      key: "totalSpent",
      header: "Total Spent",
      sortable: true,
      cell: (customer) => formatCurrency(parseFloat(customer.totalSpent || '0'), 'EUR'),
      className: "text-right",
    },
    {
      key: "orderCount",
      header: "Orders",
      sortable: true,
      className: "text-right",
    },
    {
      key: "lastOrderDate",
      header: "Last Order",
      sortable: true,
      cell: (customer) => customer.lastOrderDate 
        ? new Date(customer.lastOrderDate).toLocaleDateString() 
        : 'No orders',
    },
    {
      key: "actions",
      header: "Actions",
      cell: (customer) => (
        <div className="flex items-center gap-1">
          <Link href={`/customers/${customer.id}/edit`}>
            <Button size="sm" variant="ghost">
              <Edit className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  // Bulk actions
  const bulkActions = [
    {
      label: "Send Email",
      action: (customers: any[]) => {
        toast({
          title: "Send Email",
          description: `Sending email to ${customers.length} customers...`,
        });
      },
    },
    {
      label: "Update Type",
      action: (customers: any[]) => {
        toast({
          title: "Update Type",
          description: `Updating type for ${customers.length} customers...`,
        });
      },
    },
    {
      label: "Delete",
      variant: "destructive" as const,
      action: (customers: any[]) => {
        setSelectedCustomers(customers);
        setShowDeleteDialog(true);
      },
    },
    {
      label: "Export",
      action: (customers: any[]) => {
        toast({
          title: "Export",
          description: `Exporting ${customers.length} customers...`,
        });
      },
    },
  ];

  const handleDeleteConfirm = () => {
    deleteCustomerMutation.mutate(selectedCustomers.map(customer => customer.id));
    setShowDeleteDialog(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600">Loading customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
        <Link href="/customers/add">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <User className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Total Customers</p>
                <p className="text-2xl font-bold text-slate-900">{customers?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Star className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">VIP Customers</p>
                <p className="text-2xl font-bold text-slate-900">
                  {customers?.filter((c: any) => c.type === 'vip').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <User className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Regular Customers</p>
                <p className="text-2xl font-bold text-slate-900">
                  {customers?.filter((c: any) => c.type === 'regular').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <User className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Total Revenue</p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(
                    customers?.reduce((sum: number, c: any) => 
                      sum + parseFloat(c.totalSpent || '0'), 0) || 0, 
                    'EUR'
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search customers by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Customers ({customers?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={customers}
            columns={columns}
            bulkActions={bulkActions}
            getRowKey={(customer) => customer.id}
            itemsPerPageOptions={[10, 20, 50, 100]}
            defaultItemsPerPage={20}
          />
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customers</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedCustomers.length} customer(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}