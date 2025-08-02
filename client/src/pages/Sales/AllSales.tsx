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

export default function AllSales() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedSales, setSelectedSales] = useState<any[]>([]);

  const { data: sales = [], isLoading, error } = useQuery({
    queryKey: ['/api/sales'],
    retry: false,
  });

  // Error handling
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load sales",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const deleteSaleMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => apiRequest('DELETE', `/api/sales/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sales'] });
      toast({
        title: "Success",
        description: `Deleted ${selectedSales.length} sale(s) successfully`,
      });
      setSelectedSales([]);
    },
    onError: (error: any) => {
      console.error("Sale delete error:", error);
      const errorMessage = error.message || "Failed to delete sales";
      toast({
        title: "Error",
        description: errorMessage.includes('referenced') || errorMessage.includes('constraint')
          ? "Cannot delete sale - it's being used in existing records" 
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
      matcher(sale.code || '')
    );
  });

  // Check if sale is active
  const isSaleActive = (sale: any) => {
    const now = new Date();
    const start = new Date(sale.startDate);
    const end = new Date(sale.endDate);
    return now >= start && now <= end;
  };

  // Define table columns
  const columns: DataTableColumn<any>[] = [
    {
      key: "name",
      header: "Sale Name",
      sortable: true,
      cell: (sale) => (
        <div className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-gray-400" />
          <Link href={`/sales/edit/${sale.id}`}>
            <span className="font-medium text-blue-600 hover:text-blue-800 cursor-pointer">
              {sale.name}
            </span>
          </Link>
        </div>
      ),
    },
    {
      key: "code",
      header: "Code",
      sortable: true,
      cell: (sale) => <span className="font-mono">{sale.code}</span>,
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      cell: (sale) => {
        const types: Record<string, { label: string; color: string }> = {
          'percentage': { label: 'Percentage', color: 'bg-blue-100 text-blue-800' },
          'fixed': { label: 'Fixed', color: 'bg-green-100 text-green-800' },
          'buy_x_get_y': { label: 'Buy X Get Y', color: 'bg-purple-100 text-purple-800' },
        };
        const type = types[sale.type] || { label: sale.type, color: 'bg-gray-100 text-gray-800' };
        return <Badge className={type.color}>{type.label}</Badge>;
      },
    },
    {
      key: "value",
      header: "Value",
      sortable: true,
      cell: (sale) => {
        if (sale.type === 'percentage') {
          return (
            <div className="flex items-center gap-1">
              <Percent className="h-4 w-4 text-gray-400" />
              {sale.value}%
            </div>
          );
        } else if (sale.type === 'fixed') {
          return formatCurrency(parseFloat(sale.value || '0'), sale.currency || 'EUR');
        }
        return sale.value || '-';
      },
      className: "text-right",
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
        const active = isSaleActive(sale);
        return (
          <Badge className={active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
            {active ? 'Active' : 'Inactive'}
          </Badge>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      cell: (sale) => (
        <div className="flex items-center gap-1">
          <Link href={`/sales/edit/${sale.id}`}>
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
          description: `Exporting ${sales.length} sales...`,
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
          <p className="text-slate-600">Loading sales...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Sales & Discounts</h1>
        <Link href="/sales/add">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Sale
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
                <p className="text-sm font-medium text-slate-600">Total Sales</p>
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
                <p className="text-sm font-medium text-slate-600">Active Sales</p>
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
                <p className="text-sm font-medium text-slate-600">Percentage Sales</p>
                <p className="text-2xl font-bold text-slate-900">
                  {sales?.filter((s: any) => s.type === 'percentage').length || 0}
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
                <p className="text-sm font-medium text-slate-600">Fixed Sales</p>
                <p className="text-2xl font-bold text-slate-900">
                  {sales?.filter((s: any) => s.type === 'fixed').length || 0}
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
              placeholder="Search sales by name, description, or code..."
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
          <CardTitle>Sales ({filteredSales?.length || 0})</CardTitle>
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
            <AlertDialogTitle>Delete Sales</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedSales.length} sale(s)? This action cannot be undone.
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