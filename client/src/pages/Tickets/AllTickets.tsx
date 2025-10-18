import { useState } from "react";
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
import { 
  Plus, 
  Ticket as TicketIcon, 
  TrendingUp, 
  Clock,
  Search, 
  Eye,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AllTickets() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTickets, setSelectedTickets] = useState<any[]>([]);

  const { data: tickets = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/tickets'],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/tickets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
      toast({
        title: "Success",
        description: "Ticket deleted successfully",
      });
      setShowDeleteDialog(false);
      setSelectedTickets([]);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete ticket",
        variant: "destructive",
      });
    },
  });

  const handleBulkDelete = async () => {
    try {
      await Promise.all(
        selectedTickets.map(ticket => deleteMutation.mutateAsync(ticket.id))
      );
    } catch (error) {
      console.error('Error deleting tickets:', error);
    }
  };

  // Filter tickets
  const searchMatcher = createVietnameseSearchMatcher(searchQuery);
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = searchMatcher(ticket.ticketId || '') ||
      searchMatcher(ticket.title || '') ||
      searchMatcher(ticket.description || '') ||
      searchMatcher(ticket.category || '') ||
      searchMatcher(ticket.customer?.name || '');
    
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Calculate stats
  const totalTickets = tickets.length;
  const openTickets = tickets.filter(t => t.status === 'open').length;
  const inProgressTickets = tickets.filter(t => t.status === 'in_progress').length;
  const urgentTickets = tickets.filter(t => t.priority === 'urgent').length;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      open: "secondary",
      in_progress: "default",
      resolved: "outline",
      closed: "outline"
    };
    
    const labels: Record<string, string> = {
      open: "Open",
      in_progress: "In Progress",
      resolved: "Resolved",
      closed: "Closed"
    };

    return (
      <Badge variant={variants[status] || "outline"} data-testid={`badge-status-${status}`}>
        {labels[status] || status}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      low: "outline",
      medium: "secondary",
      high: "default",
      urgent: "destructive"
    };

    const labels: Record<string, string> = {
      low: "Low",
      medium: "Medium",
      high: "High",
      urgent: "Urgent"
    };

    return (
      <Badge variant={variants[priority] || "outline"} data-testid={`badge-priority-${priority}`}>
        {labels[priority] || priority}
      </Badge>
    );
  };

  const getCategoryIcon = (category: string) => {
    switch(category) {
      case 'shipping_issue':
        return '📦';
      case 'product_question':
        return '❓';
      case 'payment_problem':
        return '💳';
      case 'complaint':
        return '⚠️';
      default:
        return '📋';
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '-';
      return format(date, 'dd/MM/yyyy HH:mm');
    } catch {
      return '-';
    }
  };

  const columns: DataTableColumn<any>[] = [
    {
      key: "ticketId",
      header: "Ticket ID",
      cell: (row: any) => (
        <Link href={`/tickets/${row.id}`}>
          <span className="font-mono text-sm font-medium text-blue-600 hover:underline cursor-pointer" data-testid={`link-ticket-${row.id}`}>
            {row.ticketId}
          </span>
        </Link>
      ),
    },
    {
      key: "title",
      header: "Title",
      cell: (row: any) => (
        <div className="flex items-start gap-2">
          <span className="text-lg">{getCategoryIcon(row.category)}</span>
          <div>
            <Link href={`/tickets/${row.id}`}>
              <span className="font-medium hover:underline cursor-pointer" data-testid={`text-title-${row.id}`}>
                {row.title}
              </span>
            </Link>
            {row.customer && (
              <p className="text-xs text-slate-500 mt-0.5">
                Customer: {row.customer.name}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      cell: (row: any) => (
        <span className="text-sm capitalize">
          {row.category?.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      cell: (row: any) => getPriorityBadge(row.priority),
    },
    {
      key: "status",
      header: "Status",
      cell: (row: any) => getStatusBadge(row.status),
    },
    {
      key: "createdAt",
      header: "Created",
      cell: (row: any) => (
        <span className="text-sm text-slate-600" data-testid={`text-created-${row.id}`}>
          {formatDate(row.createdAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row: any) => (
        <Link href={`/tickets/${row.id}`}>
          <Button variant="ghost" size="icon" data-testid={`button-view-${row.id}`}>
            <Eye className="h-4 w-4" />
          </Button>
        </Link>
      ),
    },
  ];

  const bulkActions = [
    {
      type: "button" as const,
      label: "Delete Selected",
      action: (selectedItems: any[]) => {
        setSelectedTickets(selectedItems);
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
          <h1 className="text-3xl font-bold tracking-tight">Support Tickets</h1>
          <p className="text-slate-600 mt-1">Manage customer support requests and issues</p>
        </div>
        <Button onClick={() => navigate('/tickets/add')} size="lg" data-testid="button-add-ticket">
          <Plus className="mr-2 h-5 w-5" />
          New Ticket
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
            <TicketIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-tickets">{totalTickets}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600" data-testid="stat-open-tickets">{openTickets}</div>
            <p className="text-xs text-muted-foreground">Needs attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600" data-testid="stat-inprogress-tickets">{inProgressTickets}</div>
            <p className="text-xs text-muted-foreground">Being resolved</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent</CardTitle>
            <TrendingUp className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="stat-urgent-tickets">{urgentTickets}</div>
            <p className="text-xs text-muted-foreground">High priority</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Table */}
      <Card>
        <CardContent className="p-0 sm:p-6">
          <DataTable
            columns={columns}
            data={filteredTickets}
            bulkActions={bulkActions}
            getRowKey={(ticket) => ticket.id}
            itemsPerPageOptions={[10, 20, 50, 100]}
            defaultItemsPerPage={20}
            renderBulkActions={({ selectedRows, selectedItems, bulkActions: actions }) => (
              <div className="px-4 sm:px-0 pb-3">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-mobile-lg font-semibold">All Tickets ({filteredTickets?.length || 0})</h2>
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
                                  data-testid="button-delete-selected"
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
                    <div className="relative w-full sm:w-80">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search tickets..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                        data-testid="input-search"
                      />
                    </div>
                  </div>
                  
                  {/* Filters */}
                  <div className="flex gap-2 flex-wrap">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                      <SelectTrigger className="w-[150px]" data-testid="select-priority-filter">
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Priority</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
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
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedTickets.length} ticket(s). 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} data-testid="button-confirm-delete">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
