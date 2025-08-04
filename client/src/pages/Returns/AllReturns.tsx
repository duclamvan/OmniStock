import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { createVietnameseSearchMatcher } from "@/lib/vietnameseSearch";
import { Plus, Package, PackageX, RefreshCw, Search, Eye } from "lucide-react";
import { format } from "date-fns";
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

export default function AllReturns() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedReturns, setSelectedReturns] = useState<any[]>([]);

  const { data: returns = [], isLoading, error } = useQuery<any[]>({
    queryKey: ['/api/returns'],
    retry: false,
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load returns. Please try again.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const deleteReturnMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => apiRequest('DELETE', `/api/returns/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/returns'] });
      toast({
        title: "Success",
        description: `Deleted ${selectedReturns.length} return(s) successfully`,
      });
      setSelectedReturns([]);
    },
    onError: (error: any) => {
      console.error("Return delete error:", error);
      const errorMessage = error.message || "Failed to delete returns";
      toast({
        title: "Error",
        description: errorMessage.includes('referenced') || errorMessage.includes('constraint')
          ? "Cannot delete return - it's being used in existing records" 
          : errorMessage,
        variant: "destructive",
      });
    },
  });

  // Filter returns based on search query
  const filteredReturns = returns?.filter((returnItem: any) => {
    if (!searchQuery) return true;
    
    const matcher = createVietnameseSearchMatcher(searchQuery);
    return (
      matcher(returnItem.returnId || '') ||
      matcher(returnItem.customer?.name || '') ||
      matcher(returnItem.orderId || '') ||
      matcher(returnItem.notes || '')
    );
  });

  // Define table columns
  const columns: DataTableColumn<any>[] = [
    {
      key: "returnId",
      header: "Return ID",
      sortable: true,
      cell: (returnItem) => (
        <Link href={`/returns/${returnItem.id}`}>
          <span className="font-mono text-sm text-blue-600 hover:text-blue-800 cursor-pointer">
            {returnItem.returnId}
          </span>
        </Link>
      ),
    },
    {
      key: "customerName",
      header: "Customer Name",
      sortable: true,
      cell: (returnItem) => (
        <div>
          {returnItem.customer ? (
            <Link href={`/customers/${returnItem.customerId}`}>
              <span className="text-blue-600 hover:text-blue-800 cursor-pointer">
                {returnItem.customer.name}
              </span>
            </Link>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
      ),
    },
    {
      key: "orderId",
      header: "Order Number",
      sortable: true,
      cell: (returnItem) => (
        <div>
          {returnItem.order ? (
            <Link href={`/orders/${returnItem.orderId}`}>
              <span className="font-mono text-sm text-blue-600 hover:text-blue-800 cursor-pointer">
                {returnItem.order.id.slice(0, 8).toUpperCase()}
              </span>
            </Link>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
      ),
    },
    {
      key: "returnDate",
      header: "Return Date",
      sortable: true,
      cell: (returnItem) => format(new Date(returnItem.returnDate), 'dd MMM yyyy'),
    },
    {
      key: "itemsReturned",
      header: "Items Returned",
      sortable: true,
      cell: (returnItem) => {
        const totalItems = returnItem.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;
        return <span className="font-medium">{totalItems}</span>;
      },
    },
    {
      key: "returnType",
      header: "Return Type",
      sortable: true,
      cell: (returnItem) => {
        const typeMap: Record<string, { label: string; color: string }> = {
          'exchange': { label: 'Exchange', color: 'bg-blue-100 text-blue-800' },
          'refund': { label: 'Refund', color: 'bg-green-100 text-green-800' },
          'store_credit': { label: 'Store Credit', color: 'bg-purple-100 text-purple-800' },
        };
        const type = typeMap[returnItem.returnType] || { label: returnItem.returnType, color: 'bg-gray-100 text-gray-800' };
        return <Badge className={type.color}>{type.label}</Badge>;
      },
    },
    {
      key: "status",
      header: "Status",
      cell: (returnItem) => {
        const statusMap: Record<string, { label: string; color: string }> = {
          'awaiting': { label: 'Awaiting', color: 'bg-yellow-100 text-yellow-800' },
          'processing': { label: 'Processing', color: 'bg-blue-100 text-blue-800' },
          'completed': { label: 'Completed', color: 'bg-green-100 text-green-800' },
          'cancelled': { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
        };
        const status = statusMap[returnItem.status] || { label: returnItem.status, color: 'bg-gray-100 text-gray-800' };
        return <Badge className={status.color}>{status.label}</Badge>;
      },
    },
    {
      key: "notes",
      header: "Note",
      cell: (returnItem) => (
        <span className="text-sm text-gray-600 truncate max-w-xs block">
          {returnItem.notes || '-'}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (returnItem) => (
        <div className="flex gap-2 justify-end">
          <Link href={`/returns/${returnItem.id}/edit`}>
            <Button variant="ghost" size="sm">
              Edit
            </Button>
          </Link>
          <Link href={`/returns/${returnItem.id}`}>
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  const bulkActions = [
    {
      label: "Delete Selected",
      action: (selectedItems: any[]) => {
        setSelectedReturns(selectedItems);
        setShowDeleteDialog(true);
      },
      variant: "destructive" as const,
    },
  ];

  const handleDeleteConfirm = () => {
    deleteReturnMutation.mutate(selectedReturns.map(r => r.id));
    setShowDeleteDialog(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600">Loading returns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Returns</h1>
        <Link href="/returns/add">
          <Button className="bg-teal-600 hover:bg-teal-700">
            <Plus className="mr-2 h-4 w-4" />
            Add Return
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Total Returns</p>
                <p className="text-2xl font-bold text-slate-900">{returns?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <RefreshCw className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Awaiting</p>
                <p className="text-2xl font-bold text-slate-900">
                  {returns?.filter((r: any) => r.status === 'awaiting').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <RefreshCw className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Processing</p>
                <p className="text-2xl font-bold text-slate-900">
                  {returns?.filter((r: any) => r.status === 'processing').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Completed</p>
                <p className="text-2xl font-bold text-slate-900">
                  {returns?.filter((r: any) => r.status === 'completed').length || 0}
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
              placeholder="Search returns by ID, customer, order, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Returns Table */}
      <Card>
        <CardHeader>
          <CardTitle>Returns ({filteredReturns?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredReturns}
            columns={columns}
            bulkActions={bulkActions}
            getRowKey={(returnItem) => returnItem.id}
            itemsPerPageOptions={[10, 20, 50, 100]}
            defaultItemsPerPage={20}
          />
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedReturns.length} return(s). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}