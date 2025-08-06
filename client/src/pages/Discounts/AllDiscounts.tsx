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
import { format } from "date-fns";
import { Plus, Search, Edit, Trash2, Tag, Calendar, Percent } from "lucide-react";
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

export default function AllDiscounts() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedSales, setSelectedSales] = useState<any[]>([]);

  const { data: sales = [], isLoading, error } = useQuery<any[]>({
    queryKey: ['/api/discounts'],
    retry: false,
  });

  // Error handling
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load discounts",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const deleteSaleMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => apiRequest('DELETE', `/api/discounts/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/discounts'] });
      toast({
        title: "Success",
        description: `Deleted ${selectedSales.length} discount(s) successfully`,
      });
      setSelectedSales([]);
    },
    onError: (error: any) => {
      console.error("Sale delete error:", error);
      const errorMessage = error.message || "Failed to delete discounts";
      toast({
        title: "Error",
        description: errorMessage.includes('referenced') || errorMessage.includes('constraint')
          ? "Cannot delete discount - it's being used in existing records" 
          : errorMessage,
        variant: "destructive",
      });
    },
  });

  // Filter sales based on search query
  const filteredSales = sales?.filter((sale: any) => {
    if (!searchQuery) return true;
    
    const matcher = createVietnameseSearchMatcher(searchQuery);
    return (
      matcher(sale.name || '') ||
      matcher(sale.description || '') ||
      matcher(sale.discountId || '')
    );
  });

  // Check if sale is active
  const isSaleActive = (sale: any) => {
    if (sale.status !== 'active') return false;
    const now = new Date();
    const start = new Date(sale.startDate);
    const end = new Date(sale.endDate);
    return now >= start && now <= end;
  };

  // Define table columns
  const columns: DataTableColumn<any>[] = [
    {
      key: "name",
      header: "Discount Name",
      sortable: true,
      cell: (sale) => (
        <div className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-gray-400" />
          <Link href={`/discounts/${sale.id}/edit`}>
            <span className="font-medium text-blue-600 hover:text-blue-800 cursor-pointer">
              {sale.name}
            </span>
          </Link>
        </div>
      ),
    },
    {
      key: "discountId",
      header: "Discount ID",
      sortable: true,
      cell: (sale) => <span className="font-mono text-sm">{sale.discountId}</span>,
    },
    {
      key: "discountType",
      header: "Discount",
      sortable: true,
      cell: (sale) => {
        if (sale.discountType === 'percentage') {
          return (
            <div className="flex items-center gap-1">
              <Percent className="h-4 w-4 text-gray-400" />
              <span className="font-medium">{sale.percentage}%</span>
            </div>
          );
        } else if (sale.discountType === 'fixed_amount') {
          return (
            <div className="flex items-center gap-1">
              <span className="font-medium">${sale.fixedAmount}</span>
            </div>
          );
        } else if (sale.discountType === 'buy_x_get_y') {
          return (
            <div className="flex items-center gap-1">
              <span className="font-medium text-sm">Buy {sale.buyQuantity} Get {sale.getQuantity}</span>
            </div>
          );
        }
        return <span className="text-gray-500">-</span>;
      },
    },
    {
      key: "applicationScope",
      header: "Application Scope",
      sortable: true,
      cell: (sale) => {
        const scopes: Record<string, { label: string; color: string }> = {
          'specific_product': { label: 'Specific Product', color: 'bg-blue-100 text-blue-800' },
          'all_products': { label: 'All Products', color: 'bg-green-100 text-green-800' },
          'specific_category': { label: 'Specific Category', color: 'bg-purple-100 text-purple-800' },
          'selected_products': { label: 'Selected Products', color: 'bg-orange-100 text-orange-800' },
        };
        const scope = scopes[sale.applicationScope] || { label: sale.applicationScope, color: 'bg-gray-100 text-gray-800' };
        return <Badge className={scope.color}>{scope.label}</Badge>;
      },
    },
    {
      key: "startDate",
      header: "Start Date",
      sortable: true,
      cell: (sale) => (
        <div className="flex items-center gap-1">
          <Calendar className="h-4 w-4 text-gray-400" />
          {format(new Date(sale.startDate), 'dd/MM/yyyy')}
        </div>
      ),
    },
    {
      key: "endDate",
      header: "End Date",
      sortable: true,
      cell: (sale) => format(new Date(sale.endDate), 'dd/MM/yyyy'),
    },
    {
      key: "status",
      header: "Status",
      cell: (sale) => {
        const statusMap: Record<string, { label: string; color: string }> = {
          'active': { label: 'Active', color: 'bg-green-100 text-green-800' },
          'inactive': { label: 'Inactive', color: 'bg-gray-100 text-gray-800' },
          'finished': { label: 'Finished', color: 'bg-red-100 text-red-800' },
        };
        const status = statusMap[sale.status] || { label: sale.status, color: 'bg-gray-100 text-gray-800' };
        return <Badge className={status.color}>{status.label}</Badge>;
      },
    },
    {
      key: "actions",
      header: "Actions",
      cell: (sale) => (
        <div className="flex items-center gap-1">
          <Link href={`/discounts/${sale.id}/edit`}>
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
      label: "Activate",
      action: (sales: any[]) => {
        toast({
          title: "Activate Sales",
          description: `Activating ${sales.length} sales...`,
        });
      },
    },
    {
      label: "Deactivate",
      action: (sales: any[]) => {
        toast({
          title: "Deactivate Sales",
          description: `Deactivating ${sales.length} sales...`,
        });
      },
    },
    {
      label: "Delete",
      variant: "destructive" as const,
      action: (sales: any[]) => {
        setSelectedSales(sales);
        setShowDeleteDialog(true);
      },
    },
    {
      label: "Export",
      action: (sales: any[]) => {
        toast({
          title: "Export",
          description: `Exporting ${sales.length} discounts...`,
        });
      },
    },
  ];

  const handleDeleteConfirm = () => {
    deleteSaleMutation.mutate(selectedSales.map(sale => sale.id));
    setShowDeleteDialog(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600">Loading discounts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Discounts</h1>
        <Link href="/discounts/add">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Discount
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Tag className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Total Discounts</p>
                <p className="text-2xl font-bold text-slate-900">{sales?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Tag className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Active Discounts</p>
                <p className="text-2xl font-bold text-slate-900">
                  {sales?.filter((s: any) => isSaleActive(s)).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Percent className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">All Products</p>
                <p className="text-2xl font-bold text-slate-900">
                  {sales?.filter((s: any) => s.applicationScope === 'all_products').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Tag className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Product Specific</p>
                <p className="text-2xl font-bold text-slate-900">
                  {sales?.filter((s: any) => s.applicationScope === 'specific_product' || s.applicationScope === 'selected_products').length || 0}
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
              placeholder="Search discounts by name, description, or discount ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle>Discounts ({filteredSales?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredSales}
            columns={columns}
            bulkActions={bulkActions}
            getRowKey={(sale) => sale.id}
            itemsPerPageOptions={[10, 20, 50, 100]}
            defaultItemsPerPage={20}
          />
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Discounts</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedSales.length} discount(s)? This action cannot be undone.
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