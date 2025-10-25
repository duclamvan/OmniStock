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
import { fuzzySearch } from "@/lib/fuzzySearch";
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
  const filteredSales = searchQuery
    ? fuzzySearch(sales || [], searchQuery, {
        fields: ['name', 'description', 'discountId'],
        threshold: 0.2,
        fuzzy: true,
        vietnameseNormalization: true,
      }).map(r => r.item)
    : sales;

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
      header: "Discount",
      sortable: true,
      className: "min-w-[120px]",
      cell: (sale) => (
        <div className="flex items-center gap-1 lg:gap-2">
          <Tag className="h-3 w-3 lg:h-4 lg:w-4 text-gray-400 flex-shrink-0 hidden sm:block" />
          <Link href={`/discounts/${sale.id}/edit`}>
            <span className="font-medium text-xs lg:text-sm text-blue-600 hover:text-blue-800 cursor-pointer truncate max-w-[100px] lg:max-w-none">
              {sale.name}
            </span>
          </Link>
        </div>
      ),
    },
    {
      key: "discountType",
      header: "Value",
      sortable: true,
      className: "text-right",
      cell: (sale) => {
        if (sale.discountType === 'percentage') {
          return <span className="font-medium text-xs lg:text-sm">{sale.percentage}%</span>;
        } else if (sale.discountType === 'fixed_amount') {
          return <span className="font-medium text-xs lg:text-sm">${sale.fixedAmount}</span>;
        } else if (sale.discountType === 'buy_x_get_y') {
          return <span className="font-medium text-xs">B{sale.buyQuantity}G{sale.getQuantity}</span>;
        }
        return <span className="text-gray-500 text-xs">-</span>;
      },
    },
    {
      key: "applicationScope",
      header: "Scope",
      sortable: true,
      className: "hidden md:table-cell",
      cell: (sale) => {
        const scopes: Record<string, { label: string; shortLabel: string; color: string }> = {
          'specific_product': { label: 'Specific Product', shortLabel: 'Product', color: 'bg-blue-100 text-blue-800' },
          'all_products': { label: 'All Products', shortLabel: 'All', color: 'bg-green-100 text-green-800' },
          'specific_category': { label: 'Specific Category', shortLabel: 'Category', color: 'bg-purple-100 text-purple-800' },
          'selected_products': { label: 'Selected Products', shortLabel: 'Selected', color: 'bg-orange-100 text-orange-800' },
        };
        const scope = scopes[sale.applicationScope] || { label: sale.applicationScope, shortLabel: sale.applicationScope, color: 'bg-gray-100 text-gray-800' };
        return (
          <Badge className={`${scope.color} text-xs px-1.5 py-0 h-5`}>
            <span className="lg:hidden">{scope.shortLabel}</span>
            <span className="hidden lg:inline">{scope.label}</span>
          </Badge>
        );
      },
    },
    {
      key: "startDate",
      header: "Start",
      sortable: true,
      className: "hidden lg:table-cell",
      cell: (sale) => (
        <div className="flex items-center gap-1 text-xs">
          <Calendar className="h-3 w-3 text-gray-400 hidden xl:block" />
          {format(new Date(sale.startDate), 'dd/MM/yy')}
        </div>
      ),
    },
    {
      key: "endDate",
      header: "End",
      sortable: true,
      className: "hidden lg:table-cell",
      cell: (sale) => (
        <span className="text-xs">{format(new Date(sale.endDate), 'dd/MM/yy')}</span>
      ),
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
        return (
          <Badge className={`${status.color} text-xs px-1.5 py-0 h-5`}>
            {status.label}
          </Badge>
        );
      },
    },
    {
      key: "actions",
      header: "",
      className: "w-10",
      cell: (sale) => (
        <Link href={`/discounts/${sale.id}/edit`}>
          <Button size="icon" variant="ghost" className="h-7 w-7 lg:h-8 lg:w-8">
            <Edit className="h-3 w-3 lg:h-4 lg:w-4" />
          </Button>
        </Link>
      ),
    },
  ];

  // Bulk actions
  const bulkActions = [
    {
      type: "button" as const,
      label: "Activate",
      action: (sales: any[]) => {
        toast({
          title: "Activate Sales",
          description: `Activating ${sales.length} sales...`,
        });
      },
    },
    {
      type: "button" as const,
      label: "Deactivate",
      action: (sales: any[]) => {
        toast({
          title: "Deactivate Sales",
          description: `Deactivating ${sales.length} sales...`,
        });
      },
    },
    {
      type: "button" as const,
      label: "Delete",
      variant: "destructive" as const,
      action: (sales: any[]) => {
        setSelectedSales(sales);
        setShowDeleteDialog(true);
      },
    },
    {
      type: "button" as const,
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

  // Remove loading state to prevent UI refresh indicators

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl lg:text-2xl font-bold text-slate-900">Discounts</h1>
        <Link href="/discounts/add">
          <Button size="sm" className="lg:size-default">
            <Plus className="h-4 w-4" />
            <span className="ml-2 hidden sm:inline">Add Discount</span>
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex flex-col lg:flex-row lg:items-center">
              <Tag className="h-6 w-6 lg:h-8 lg:w-8 text-blue-600 mb-2 lg:mb-0" />
              <div className="lg:ml-4">
                <p className="text-xs lg:text-sm font-medium text-slate-600">Total</p>
                <p className="text-lg lg:text-2xl font-bold text-slate-900">{sales?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex flex-col lg:flex-row lg:items-center">
              <Tag className="h-6 w-6 lg:h-8 lg:w-8 text-green-600 mb-2 lg:mb-0" />
              <div className="lg:ml-4">
                <p className="text-xs lg:text-sm font-medium text-slate-600">Active</p>
                <p className="text-lg lg:text-2xl font-bold text-slate-900">
                  {sales?.filter((s: any) => isSaleActive(s)).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex flex-col lg:flex-row lg:items-center">
              <Percent className="h-6 w-6 lg:h-8 lg:w-8 text-purple-600 mb-2 lg:mb-0" />
              <div className="lg:ml-4">
                <p className="text-xs lg:text-sm font-medium text-slate-600">All Items</p>
                <p className="text-lg lg:text-2xl font-bold text-slate-900">
                  {sales?.filter((s: any) => s.applicationScope === 'all_products').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex flex-col lg:flex-row lg:items-center">
              <Tag className="h-6 w-6 lg:h-8 lg:w-8 text-orange-600 mb-2 lg:mb-0" />
              <div className="lg:ml-4">
                <p className="text-xs lg:text-sm font-medium text-slate-600">Specific</p>
                <p className="text-lg lg:text-2xl font-bold text-slate-900">
                  {sales?.filter((s: any) => s.applicationScope === 'specific_product' || s.applicationScope === 'selected_products').length || 0}
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
              placeholder="Search discounts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9 lg:h-10 text-sm lg:text-base"
            />
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card className="overflow-hidden">
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <DataTable
              data={filteredSales}
              columns={columns}
              bulkActions={bulkActions}
              getRowKey={(sale) => sale.id}
              itemsPerPageOptions={[10, 20, 50, 100]}
              defaultItemsPerPage={20}
              renderBulkActions={({ selectedRows, selectedItems, bulkActions: actions }) => (
                <div className="px-4 sm:px-0 pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-mobile-lg font-semibold">Discounts ({filteredSales?.length || 0})</h2>
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