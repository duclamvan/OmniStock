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
  Package,
  Banknote,
  TrendingUp,
  Calendar,
  Building2,
  ShoppingCart
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
import { format } from "date-fns";

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
      await apiRequest(`/api/suppliers/${id}`, "DELETE");
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

  const columns: DataTableColumn<Supplier>[] = [
    {
      key: "name",
      header: "Supplier Name",
      cell: (supplier) => (
        <Link href={`/suppliers/${supplier.id}`}>
          <div className="cursor-pointer">
            <span className="font-medium text-blue-600 hover:underline">
              {supplier.name}
            </span>
            {supplier.contactPerson && (
              <p className="text-xs text-slate-500">{supplier.contactPerson}</p>
            )}
          </div>
        </Link>
      ),
    },
    {
      key: "supplierLink",
      header: "Supplier Link",
      cell: (supplier) => {
        const link = supplier.supplierLink;
        if (!link) return "-";
        return (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline truncate block max-w-[200px]"
            onClick={(e) => e.stopPropagation()}
          >
            {link}
          </a>
        );
      },
    },
    {
      key: "lastPurchaseDate",
      header: "Last Purchase",
      cell: (supplier) => {
        const dateStr = formatDate(supplier.lastPurchaseDate);
        if (dateStr === '-') return '-';
        
        const lastPurchase = new Date(supplier.lastPurchaseDate!);
        const daysSince = Math.floor((Date.now() - lastPurchase.getTime()) / (1000 * 60 * 60 * 24));
        
        return (
          <div>
            <span className="font-medium">{dateStr}</span>
            <p className="text-xs text-slate-500">
              {daysSince === 0 ? 'Today' : 
               daysSince === 1 ? 'Yesterday' :
               `${daysSince} days ago`}
            </p>
          </div>
        );
      },
    },
    {
      key: "totalPurchased",
      header: "Total Purchased",
      cell: (supplier) => {
        const amount = parseFloat(supplier.totalPurchased || '0');
        return (
          <span className="font-medium">
            ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      key: "country",
      header: "Location",
      cell: (supplier) => (
        <div>
          <p className="font-medium">{supplier.country || '-'}</p>
          {supplier.address && (
            <p className="text-xs text-slate-500">{supplier.address}</p>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (supplier) => {
        if (!supplier.lastPurchaseDate) {
          return <Badge variant="secondary">New</Badge>;
        }
        const lastPurchase = new Date(supplier.lastPurchaseDate);
        const daysSince = (Date.now() - lastPurchase.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSince <= 30) {
          return <Badge variant="default">Active</Badge>;
        } else if (daysSince <= 90) {
          return <Badge variant="secondary">Regular</Badge>;
        } else {
          return <Badge variant="outline">Inactive</Badge>;
        }
      },
    },
    {
      key: "actions",
      header: "Actions",
      cell: (supplier) => (
        <div className="flex gap-2">
          <Link href={`/suppliers/${supplier.id}`}>
            <Button variant="ghost" size="icon">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          <Link href={`/suppliers/${supplier.id}/edit`}>
            <Button variant="ghost" size="icon">
              <Pencil className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  const bulkActions = [
    {
      label: "Delete Selected",
      action: (selectedItems: Supplier[]) => {
        setSelectedSuppliers(selectedItems);
        setShowDeleteDialog(true);
      },
      variant: "destructive" as const,
    },
  ];

  // Remove loading state to prevent UI refresh indicators

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
          <p className="text-slate-600 mt-1">Manage your supplier relationships and purchases</p>
        </div>
        <Button onClick={() => navigate('/suppliers/new')} size="lg">
          <Plus className="mr-2 h-5 w-5" />
          Add Supplier
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Suppliers</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSuppliers}</div>
            <p className="text-xs text-muted-foreground">Registered suppliers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Suppliers</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSuppliers.length}</div>
            <p className="text-xs text-muted-foreground">Purchased in last 90 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalPurchaseValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground">All time value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{newSuppliersThisMonth.length}</div>
            <p className="text-xs text-muted-foreground">Recently added</p>
          </CardContent>
        </Card>
      </div>

      {/* Suppliers Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>All Suppliers</CardTitle>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search suppliers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredSuppliers}
            bulkActions={bulkActions}
            getRowKey={(supplier) => supplier.id}
          />
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedSuppliers.length} supplier(s). 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}