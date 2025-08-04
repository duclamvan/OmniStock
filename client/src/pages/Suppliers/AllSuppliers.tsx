import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Plus, Search, Pencil, Trash2, Eye } from "lucide-react";
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

export default function AllSuppliers() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [deleteSupplier, setDeleteSupplier] = useState<Supplier | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: suppliers = [], isLoading } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/api/suppliers/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({ description: "Supplier deleted successfully" });
      setDeleteSupplier(null);
    },
    onError: (error: any) => {
      const message = error.message?.includes("being used")
        ? "Cannot delete supplier - it's being used by products"
        : "Failed to delete supplier";
      toast({ description: message, variant: "destructive" });
    },
  });

  const filteredSuppliers = suppliers.filter((supplier) => {
    if (!searchQuery) return true;
    const matcher = createVietnameseSearchMatcher(searchQuery);
    return (
      matcher(supplier.name) ||
      (supplier.contactPerson && matcher(supplier.contactPerson)) ||
      (supplier.email && supplier.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (supplier.phone && supplier.phone.includes(searchQuery)) ||
      (supplier.country && matcher(supplier.country))
    );
  });

  const columns: DataTableColumn<Supplier>[] = [
    {
      key: "name",
      header: "Supplier Name",
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
      header: "Last Purchase Date",
      cell: (supplier) => {
        const date = supplier.lastPurchaseDate;
        return date ? new Date(date).toLocaleDateString() : "-";
      },
    },
    {
      key: "totalPurchased",
      header: "Total Purchased $",
      cell: (supplier) => {
        const amount = supplier.totalPurchased;
        return amount ? `$${parseFloat(amount).toLocaleString()}` : "$0";
      },
    },
    {
      key: "country",
      header: "Country",
      cell: (supplier) => supplier.country || "-",
    },
    {
      key: "actions",
      header: "",
      cell: (supplier) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setLocation(`/suppliers/${supplier.id}`);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setLocation(`/suppliers/${supplier.id}/edit`);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteSupplier(supplier);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h1 className="text-2xl font-bold">Suppliers</h1>
        <Link href="/suppliers/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Supplier
          </Button>
        </Link>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <Input
          placeholder="Search suppliers by name, contact, email, phone, or country..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Suppliers ({filteredSuppliers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <DataTable 
              columns={columns} 
              data={filteredSuppliers} 
              getRowKey={(supplier) => supplier.id}
              onRowClick={(supplier) => setLocation(`/suppliers/${supplier.id}`)}
            />
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteSupplier} onOpenChange={() => setDeleteSupplier(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Supplier</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteSupplier?.name}"? 
              {deleteSupplier && " This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteSupplier && deleteMutation.mutate(deleteSupplier.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}