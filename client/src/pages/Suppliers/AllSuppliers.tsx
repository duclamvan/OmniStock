import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  Eye,
  Building2,
  TrendingUp,
  Calendar,
  ShoppingBag,
  MoreVertical,
  ExternalLink,
  Mail,
  Phone
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { createVietnameseSearchMatcher } from "@/lib/vietnameseSearch";
import type { Supplier } from "@shared/schema";
import type { DataTableColumn } from "@/components/ui/data-table";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

const getCountryFlag = (country: string): string => {
  const countryFlags: Record<string, string> = {
    'China': '🇨🇳',
    'Vietnam': '🇻🇳',
    'Czech Republic': '🇨🇿',
    'Germany': '🇩🇪',
    'USA': '🇺🇸',
    'UK': '🇬🇧',
    'Poland': '🇵🇱',
    'Slovakia': '🇸🇰',
    'Austria': '🇦🇹',
    'Hungary': '🇭🇺',
  };
  return countryFlags[country] || '🌍';
};

export default function AllSuppliers() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [deleteSupplier, setDeleteSupplier] = useState<Supplier | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSuppliers, setSelectedSuppliers] = useState<Supplier[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: suppliers = [], isLoading, error } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
    retry: false,
  });

  const { data: purchases = [] } = useQuery<any[]>({
    queryKey: ["/api/purchases"],
    retry: false,
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load suppliers. Please try again.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/suppliers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({ 
        title: "Success",
        description: "Supplier deleted successfully" 
      });
      setDeleteSupplier(null);
      setShowDeleteDialog(false);
      setSelectedSuppliers([]);
    },
    onError: (error: any) => {
      const message = error.message?.includes("being used")
        ? "Cannot delete supplier - it's being used by products"
        : "Failed to delete supplier";
      toast({ 
        title: "Error",
        description: message, 
        variant: "destructive" 
      });
    },
  });

  const handleBulkDelete = async () => {
    try {
      await Promise.all(
        selectedSuppliers.map(supplier => deleteMutation.mutateAsync(supplier.id))
      );
    } catch (error) {
      console.error('Error deleting suppliers:', error);
    }
  };

  const searchMatcher = createVietnameseSearchMatcher(searchQuery);
  const filteredSuppliers = suppliers.filter((supplier) => {
    if (!searchQuery) return true;
    return (
      searchMatcher(supplier.name) ||
      (supplier.contactPerson && searchMatcher(supplier.contactPerson)) ||
      (supplier.email && supplier.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (supplier.phone && supplier.phone.includes(searchQuery)) ||
      (supplier.country && searchMatcher(supplier.country))
    );
  });

  // Calculate stats
  const totalSuppliers = suppliers.length;
  
  // Active suppliers (had purchases in last 90 days)
  const activeSuppliers = suppliers.filter(supplier => {
    if (!supplier.lastPurchaseDate) return false;
    try {
      const lastPurchase = new Date(supplier.lastPurchaseDate);
      const daysSinceLastPurchase = (Date.now() - lastPurchase.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceLastPurchase <= 90;
    } catch {
      return false;
    }
  });

  // Total purchase value
  const totalPurchaseValue = suppliers.reduce((sum, supplier) => {
    const amount = parseFloat(supplier.totalPurchased || '0') || 0;
    return sum + amount;
  }, 0);

  // New suppliers this month
  const newSuppliersThisMonth = suppliers.filter(supplier => {
    if (!supplier.createdAt) return false;
    try {
      const createdDate = new Date(supplier.createdAt);
      const now = new Date();
      return createdDate.getMonth() === now.getMonth() && 
             createdDate.getFullYear() === now.getFullYear();
    } catch {
      return false;
    }
  });

  const formatDate = (dateStr: string | Date | null | undefined) => {
    if (!dateStr) return '-';
    try {
      const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
      if (isNaN(date.getTime())) return '-';
      return format(date, 'dd/MM/yyyy');
    } catch {
      return '-';
    }
  };

  const getStatusBadge = (supplier: Supplier) => {
    if (!supplier.lastPurchaseDate) {
      return <Badge variant="secondary" className="bg-slate-100 text-slate-700">New</Badge>;
    }
    const lastPurchase = new Date(supplier.lastPurchaseDate);
    const daysSince = (Date.now() - lastPurchase.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSince <= 30) {
      return <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>;
    } else if (daysSince <= 90) {
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Regular</Badge>;
    } else {
      return <Badge variant="outline" className="text-slate-500">Inactive</Badge>;
    }
  };

  const columns: DataTableColumn<Supplier>[] = [
    {
      key: "name",
      header: "Supplier",
      cell: (supplier) => (
        <div className="min-w-[180px]">
          <Link href={`/suppliers/${supplier.id}`}>
            <span className="font-semibold text-slate-900 hover:text-blue-600 cursor-pointer block">
              {supplier.name}
            </span>
          </Link>
          {supplier.contactPerson && (
            <p className="text-sm text-slate-500 mt-0.5">{supplier.contactPerson}</p>
          )}
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      cell: (supplier) => (
        <div className="space-y-1 min-w-[160px]">
          {supplier.email && (
            <div className="flex items-center gap-1.5 text-sm text-slate-600">
              <Mail className="h-3.5 w-3.5 text-slate-400" />
              <a 
                href={`mailto:${supplier.email}`} 
                className="hover:text-blue-600 truncate max-w-[200px]"
                onClick={(e) => e.stopPropagation()}
              >
                {supplier.email}
              </a>
            </div>
          )}
          {supplier.phone && (
            <div className="flex items-center gap-1.5 text-sm text-slate-600">
              <Phone className="h-3.5 w-3.5 text-slate-400" />
              <a 
                href={`tel:${supplier.phone}`} 
                className="hover:text-blue-600"
                onClick={(e) => e.stopPropagation()}
              >
                {supplier.phone}
              </a>
            </div>
          )}
          {!supplier.email && !supplier.phone && (
            <span className="text-sm text-slate-400">-</span>
          )}
        </div>
      ),
    },
    {
      key: "lastPurchaseDate",
      header: "Last Purchase",
      cell: (supplier) => {
        const dateStr = formatDate(supplier.lastPurchaseDate);
        if (dateStr === '-') {
          return <span className="text-slate-400">Never</span>;
        }
        
        const lastPurchase = new Date(supplier.lastPurchaseDate!);
        const daysSince = Math.floor((Date.now() - lastPurchase.getTime()) / (1000 * 60 * 60 * 24));
        
        return (
          <div className="min-w-[100px]">
            <span className="font-medium text-slate-900 block">{dateStr}</span>
            <span className="text-sm text-slate-500">
              {daysSince === 0 ? 'Today' : 
               daysSince === 1 ? 'Yesterday' :
               `${daysSince}d ago`}
            </span>
          </div>
        );
      },
    },
    {
      key: "totalPurchased",
      header: "Total Value",
      cell: (supplier) => {
        const amount = parseFloat(supplier.totalPurchased || '0');
        return (
          <span className="font-semibold text-slate-900">
            ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      key: "country",
      header: "Location",
      cell: (supplier) => {
        if (!supplier.country) return <span className="text-slate-400">-</span>;
        return (
          <div className="flex items-center gap-2">
            <span className="text-xl">{getCountryFlag(supplier.country)}</span>
            <span className="font-medium text-slate-700">{supplier.country}</span>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      cell: (supplier) => getStatusBadge(supplier),
    },
    {
      key: "actions",
      header: "",
      cell: (supplier) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate(`/suppliers/${supplier.id}`)}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(`/suppliers/${supplier.id}/edit`)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit Supplier
            </DropdownMenuItem>
            {supplier.supplierLink && (
              <DropdownMenuItem asChild>
                <a
                  href={supplier.supplierLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Visit Website
                </a>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                setDeleteSupplier(supplier);
                setShowDeleteDialog(true);
              }}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const bulkActions = [
    {
      type: "button" as const,
      label: "Delete Selected",
      action: (selectedItems: Supplier[]) => {
        setSelectedSuppliers(selectedItems);
        setShowDeleteDialog(true);
      },
      variant: "destructive" as const,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Suppliers</h1>
          <p className="text-slate-600 mt-1">Manage supplier relationships and track purchases</p>
        </div>
        <Button onClick={() => navigate('/suppliers/new')} size="lg" data-testid="button-add-supplier">
          <Plus className="mr-2 h-5 w-5" />
          Add Supplier
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Suppliers</CardTitle>
            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{totalSuppliers}</div>
            <p className="text-xs text-slate-500 mt-1">Registered suppliers</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Active Suppliers</CardTitle>
            <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{activeSuppliers.length}</div>
            <p className="text-xs text-slate-500 mt-1">Last 90 days activity</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Value</CardTitle>
            <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <ShoppingBag className="h-5 w-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              ${totalPurchaseValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-slate-500 mt-1">All time purchases</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">New This Month</CardTitle>
            <div className="h-10 w-10 rounded-lg bg-orange-50 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{newSuppliersThisMonth.length}</div>
            <p className="text-xs text-slate-500 mt-1">Recently added</p>
          </CardContent>
        </Card>
      </div>

      {/* Suppliers Table */}
      <Card>
        <CardContent className="p-0 sm:p-6">
          <DataTable
            columns={columns}
            data={filteredSuppliers}
            bulkActions={bulkActions}
            getRowKey={(supplier) => supplier.id}
            itemsPerPageOptions={[10, 20, 50, 100]}
            defaultItemsPerPage={20}
            renderBulkActions={({ selectedRows, selectedItems, bulkActions: actions }) => (
              <div className="px-4 sm:px-0 pb-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-semibold text-slate-900">All Suppliers</h2>
                    <Badge variant="secondary" className="text-sm">
                      {filteredSuppliers?.length || 0}
                    </Badge>
                    {selectedRows.size > 0 && (
                      <>
                        <Badge variant="outline" className="text-sm border-blue-500 text-blue-700">
                          {selectedRows.size} selected
                        </Badge>
                        {actions.map((action, index) => {
                          if (action.type === "button") {
                            return (
                              <Button
                                key={index}
                                size="sm"
                                variant={action.variant || "ghost"}
                                onClick={() => action.action(selectedItems)}
                                data-testid="button-delete-selected"
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                {action.label}
                              </Button>
                            );
                          }
                          return null;
                        })}
                      </>
                    )}
                  </div>
                  <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Search suppliers..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                      data-testid="input-search-suppliers"
                    />
                  </div>
                </div>
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Supplier{selectedSuppliers.length > 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedSuppliers.length > 1 
                ? `This will permanently delete ${selectedSuppliers.length} suppliers.` 
                : deleteSupplier 
                ? `This will permanently delete "${deleteSupplier.name}".`
                : 'This will permanently delete the selected supplier.'}
              {' '}This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
