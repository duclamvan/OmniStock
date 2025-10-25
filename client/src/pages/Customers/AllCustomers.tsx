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
import { formatCurrency, formatDate } from "@/lib/currencyUtils";
import { Plus, Search, Edit, Trash2, User, Mail, Phone, Star, MessageCircle, MapPin, MoreVertical, Ban } from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AllCustomers() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedCustomers, setSelectedCustomers] = useState<any[]>([]);

  const { data: customers = [], isLoading, error } = useQuery<any[]>({
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
      header: "Customer",
      sortable: true,
      className: "min-w-[150px]",
      cell: (customer) => (
        <div>
          <Link href={`/customers/${customer.id}`}>
            <div className="font-medium text-xs lg:text-sm text-blue-600 hover:text-blue-800 cursor-pointer flex items-center gap-1 lg:gap-2">
              <span className="truncate max-w-[120px] lg:max-w-none">{customer.name}</span>
              {customer.hasPayLaterBadge && (
                <Badge variant="outline" className="text-xs px-1 py-0 h-5 bg-yellow-50 border-yellow-300 text-yellow-700 hidden sm:flex">
                  Pay Later
                </Badge>
              )}
            </div>
          </Link>
          {customer.facebookName && (
            <div className="text-xs text-gray-500 truncate max-w-[120px] lg:max-w-none">FB: {customer.facebookName}</div>
          )}
        </div>
      ),
    },
    {
      key: "country",
      header: "Country",
      sortable: true,
      className: "hidden lg:table-cell",
      cell: (customer) => customer.country ? (
        <div className="flex items-center gap-1 text-xs">
          <MapPin className="h-3 w-3 text-gray-400" />
          {customer.country}
        </div>
      ) : '-',
    },
    {
      key: "lastOrderDate",
      header: "Last Purchase",
      sortable: true,
      className: "hidden md:table-cell",
      cell: (customer) => (
        <span className="text-xs">
          {customer.lastOrderDate 
            ? formatDate(customer.lastOrderDate) 
            : '-'}
        </span>
      ),
    },
    {
      key: "orderCount",
      header: "Orders",
      sortable: true,
      className: "text-center",
      cell: (customer) => (
        <div className="text-center text-xs lg:text-sm">{customer.orderCount || 0}</div>
      ),
    },
    {
      key: "totalSpent",
      header: "Sales",
      sortable: true,
      className: "text-right",
      cell: (customer) => (
        <span className="text-xs lg:text-sm font-medium">
          {formatCurrency(parseFloat(customer.totalSpent || '0'), 'EUR')}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-20",
      cell: (customer) => {
        // Extract Facebook ID from URL if available
        const getFacebookId = (fbId: string | null, fbName: string | null) => {
          if (!fbId && !fbName) return null;
          if (fbId) return fbId;
          // If we have a Facebook name but no ID, use the name as ID
          return fbName;
        };
        
        const facebookId = getFacebookId(customer.facebookId, customer.facebookName);
        
        return (
          <div className="flex items-center gap-0.5">
            {facebookId && (
              <a
                href={`https://m.me/${facebookId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="lg:hidden"
              >
                <Button size="icon" variant="ghost" className="h-7 w-7" title="Open in Messenger">
                  <MessageCircle className="h-3 w-3" />
                </Button>
              </a>
            )}
            {facebookId && (
              <a
                href={`https://m.me/${facebookId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden lg:block"
              >
                <Button size="sm" variant="ghost" title="Open in Messenger">
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </a>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7 lg:h-8 lg:w-8 ml-auto">
                  <MoreVertical className="h-3 w-3 lg:h-4 lg:w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/customers/${customer.id}/edit`}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleBlacklistCustomer(customer)}
                  className="text-destructive"
                >
                  <Ban className="h-4 w-4 mr-2" />
                  Blacklist Customer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  // Bulk actions
  const bulkActions = [
    {
      type: "button" as const,
      label: "Send Email",
      action: (customers: any[]) => {
        toast({
          title: "Send Email",
          description: `Sending email to ${customers.length} customers...`,
        });
      },
    },
    {
      type: "button" as const,
      label: "Update Type",
      action: (customers: any[]) => {
        toast({
          title: "Update Type",
          description: `Updating type for ${customers.length} customers...`,
        });
      },
    },
    {
      type: "button" as const,
      label: "Delete",
      variant: "destructive" as const,
      action: (customers: any[]) => {
        setSelectedCustomers(customers);
        setShowDeleteDialog(true);
      },
    },
    {
      type: "button" as const,
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

  const handleBlacklistCustomer = (customer: any) => {
    toast({
      title: "Blacklist Customer",
      description: `This will block ${customer.name}'s Facebook ID and address for future orders.`,
    });
    // TODO: Implement blacklist functionality
  };

  // Remove loading state to prevent UI refresh indicators

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl lg:text-2xl font-bold text-slate-900">Customers</h1>
        <Link href="/customers/add">
          <Button size="sm" className="lg:size-default">
            <Plus className="h-4 w-4" />
            <span className="ml-2 hidden sm:inline">Add Customer</span>
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex flex-col lg:flex-row lg:items-center">
              <User className="h-6 w-6 lg:h-8 lg:w-8 text-blue-600 mb-2 lg:mb-0" />
              <div className="lg:ml-4">
                <p className="text-xs lg:text-sm font-medium text-slate-600">Total Customers</p>
                <p className="text-lg lg:text-2xl font-bold text-slate-900">{customers?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex flex-col lg:flex-row lg:items-center">
              <Star className="h-6 w-6 lg:h-8 lg:w-8 text-yellow-600 mb-2 lg:mb-0" />
              <div className="lg:ml-4">
                <p className="text-xs lg:text-sm font-medium text-slate-600">VIP</p>
                <p className="text-lg lg:text-2xl font-bold text-slate-900">
                  {customers?.filter((c: any) => c.type === 'vip').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex flex-col lg:flex-row lg:items-center">
              <User className="h-6 w-6 lg:h-8 lg:w-8 text-green-600 mb-2 lg:mb-0" />
              <div className="lg:ml-4">
                <p className="text-xs lg:text-sm font-medium text-slate-600">Regular</p>
                <p className="text-lg lg:text-2xl font-bold text-slate-900">
                  {customers?.filter((c: any) => c.type === 'regular').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex flex-col lg:flex-row lg:items-center">
              <User className="h-6 w-6 lg:h-8 lg:w-8 text-purple-600 mb-2 lg:mb-0" />
              <div className="lg:ml-4">
                <p className="text-xs lg:text-sm font-medium text-slate-600">Revenue</p>
                <p className="text-lg lg:text-2xl font-bold text-slate-900">
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
        <CardContent className="p-3 lg:p-6">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 lg:top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9 lg:h-10 text-sm lg:text-base"
            />
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card className="overflow-hidden">
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <DataTable
              data={customers}
              columns={columns}
              bulkActions={bulkActions}
              getRowKey={(customer) => customer.id}
              itemsPerPageOptions={[10, 20, 50, 100]}
              defaultItemsPerPage={20}
              renderBulkActions={({ selectedRows, selectedItems, bulkActions: actions }) => (
                <div className="px-4 sm:px-0 pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-mobile-lg font-semibold">Customers ({customers?.length || 0})</h2>
                      {selectedRows.size > 0 && (
                        <>
                          <Badge variant="secondary" className="text-xs h-6 px-2">
                            {selectedRows.size}
                          </Badge>
                          {actions.map((action, index) => {
                            if (action.type === "button") {
                              return (
                                <Button
                                  key={index}
                                  size="sm"
                                  variant={action.variant || "ghost"}
                                  onClick={() => action.action(selectedItems)}
                                  className="h-6 px-2 text-xs"
                                >
                                  {action.label}
                                </Button>
                              );
                            }
                            return null;
                          })}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            />
          </div>
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