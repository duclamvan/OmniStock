import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { createVietnameseSearchMatcher } from "@/lib/vietnameseSearch";
import { Plus, Search, Eye, Edit, Trash2, Wrench } from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

interface Service {
  id: string;
  customerId: string | null;
  customer?: {
    id: string;
    name: string;
  } | null;
  name: string;
  description: string | null;
  serviceDate: string | null;
  serviceCost: string;
  partsCost: string;
  totalCost: string;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function Services() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteServiceId, setDeleteServiceId] = useState<string | null>(null);

  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ['/api/services'],
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/services/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      setDeleteServiceId(null);
      toast({
        title: "Success",
        description: "Service deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete service",
        variant: "destructive",
      });
    },
  });

  // Filter services based on search query and status
  const filteredServices = useMemo(() => {
    if (!services) return [];
    
    let filtered = services;
    
    // Apply status filter
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter((service) => service.status === statusFilter);
    }
    
    // Apply search filter
    if (searchQuery) {
      const matcher = createVietnameseSearchMatcher(searchQuery);
      filtered = filtered.filter((service) => 
        matcher(service.name || '') ||
        matcher(service.customer?.name || '') ||
        matcher(service.description || '')
      );
    }
    
    return filtered;
  }, [services, searchQuery, statusFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800" data-testid={`badge-status-pending`}>Pending</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800" data-testid={`badge-status-in-progress`}>In Progress</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800" data-testid={`badge-status-completed`}>Completed</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800" data-testid={`badge-status-cancelled`}>Cancelled</Badge>;
      default:
        return <Badge variant="outline" data-testid={`badge-status-${status}`}>{status}</Badge>;
    }
  };

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount || '0');
    return `€${num.toFixed(2)}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy');
    } catch {
      return '—';
    }
  };

  const truncateText = (text: string | null, maxLength: number = 50) => {
    if (!text) return '—';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Services</h1>
          <p className="text-slate-600 mt-1">Manage service records and repairs</p>
        </div>
        <Link href="/services/add">
          <Button data-testid="button-add-service">
            <Plus className="h-4 w-4 mr-2" />
            Add Service
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                placeholder="Search by service name, customer, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search"
                className="w-full"
              />
            </div>
            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Services Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Service Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="text-center py-12">
              <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500" data-testid="text-no-services">
                {searchQuery || statusFilter !== 'all' 
                  ? 'No services found matching your filters.'
                  : 'No services yet. Click "Add Service" to create one.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service Date</TableHead>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Service Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Service Cost</TableHead>
                    <TableHead className="text-right">Parts Cost</TableHead>
                    <TableHead className="text-right font-bold">Total Cost</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredServices.map((service) => (
                    <TableRow key={service.id} data-testid={`row-service-${service.id}`}>
                      <TableCell data-testid={`text-service-date-${service.id}`}>
                        {formatDate(service.serviceDate)}
                      </TableCell>
                      <TableCell data-testid={`text-customer-name-${service.id}`}>
                        {service.customer?.name || '—'}
                      </TableCell>
                      <TableCell data-testid={`text-service-name-${service.id}`}>
                        {service.name}
                      </TableCell>
                      <TableCell data-testid={`text-description-${service.id}`}>
                        {truncateText(service.description)}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`text-service-cost-${service.id}`}>
                        {formatCurrency(service.serviceCost)}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`text-parts-cost-${service.id}`}>
                        {formatCurrency(service.partsCost)}
                      </TableCell>
                      <TableCell className="text-right font-bold" data-testid={`text-total-cost-${service.id}`}>
                        {formatCurrency(service.totalCost)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(service.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/services/${service.id}`}>
                            <Button
                              variant="ghost"
                              size="icon"
                              data-testid={`button-view-${service.id}`}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/services/${service.id}/edit`}>
                            <Button
                              variant="ghost"
                              size="icon"
                              data-testid={`button-edit-${service.id}`}
                              title="Edit Service"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`button-delete-${service.id}`}
                            onClick={() => setDeleteServiceId(service.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete Service"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteServiceId} onOpenChange={() => setDeleteServiceId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this service? This action cannot be undone and will also delete all associated service items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteServiceId && deleteServiceMutation.mutate(deleteServiceId)}
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
