import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft,
  Edit,
  Loader2,
  MessageSquare,
  User,
  Calendar,
  Package,
  FileText,
  Send
} from "lucide-react";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function TicketDetails() {
  const { t } = useTranslation('system');
  const [, params] = useRoute("/tickets/:id");
  const [, navigate] = useLocation();
  const ticketId = params?.id;
  const { toast } = useToast();
  const [commentText, setCommentText] = useState("");
  const [isInternalComment, setIsInternalComment] = useState(false);

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['/api/tickets', ticketId],
    queryFn: async () => {
      const response = await fetch(`/api/tickets/${ticketId}`);
      if (!response.ok) throw new Error('Failed to fetch ticket');
      return response.json();
    },
    enabled: !!ticketId,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['/api/tickets', ticketId, 'comments'],
    queryFn: async () => {
      const response = await fetch(`/api/tickets/${ticketId}/comments`);
      if (!response.ok) throw new Error('Failed to fetch comments');
      return response.json();
    },
    enabled: !!ticketId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      return await apiRequest('PATCH', `/api/tickets/${ticketId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tickets', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
      toast({
        title: t('success'),
        description: t('ticketStatusUpdated'),
      });
    },
    onError: () => {
      toast({
        title: t('error'),
        description: t('failedToUpdateTicketStatus'),
        variant: "destructive",
      });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (data: { content: string; isInternal: boolean }) => {
      return await apiRequest('POST', `/api/tickets/${ticketId}/comments`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tickets', ticketId, 'comments'] });
      setCommentText("");
      toast({
        title: t('success'),
        description: t('commentAdded'),
      });
    },
    onError: () => {
      toast({
        title: t('error'),
        description: t('failedToAddComment'),
        variant: "destructive",
      });
    },
  });

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    addCommentMutation.mutate({
      content: commentText,
      isInternal: isInternalComment
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      open: "secondary",
      in_progress: "default",
      resolved: "outline",
      closed: "outline"
    };

    const labels: Record<string, string> = {
      open: t('open'),
      in_progress: t('inProgress'),
      resolved: t('resolved'),
      closed: t('closed')
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
      low: t('low'),
      medium: t('medium'),
      high: t('high'),
      urgent: t('urgent')
    };

    return (
      <Badge variant={variants[priority] || "outline"} data-testid={`badge-priority-${priority}`}>
        {labels[priority] || priority}
      </Badge>
    );
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!ticket) {
    return null;
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 md:p-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-start gap-3 sm:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.history.back()}
            className="shrink-0"
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight break-words" data-testid="text-title">
                {ticket.title}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {getStatusBadge(ticket.status)}
              {getPriorityBadge(ticket.priority)}
            </div>
          </div>
        </div>
        <Button onClick={() => navigate(`/tickets/edit/${ticket.id}`)} className="w-full sm:w-auto" data-testid="button-edit">
          <Edit className="mr-2 h-4 w-4" />
          {t('edit')}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left Column: Ticket Details & Comments */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Ticket Information */}
          <Card>
            <CardContent className="pt-6 space-y-6">
              {/* Customer - Highlighted at top */}
              {ticket.customer && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-600 text-white rounded-full p-2">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">{t('customer')}</p>
                      <Link href={`/customers/${ticket.customer.id}`}>
                        <span className="text-xl font-bold text-blue-600 dark:text-blue-400 hover:underline" data-testid="link-customer">
                          {ticket.customer.name}
                        </span>
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* Description - Large and prominent */}
              {ticket.description && (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
                  <h3 className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-3">{t('description')}</h3>
                  <p className="text-lg leading-relaxed text-slate-900 dark:text-slate-100 whitespace-pre-wrap" data-testid="text-description">
                    {ticket.description}
                  </p>
                </div>
              )}

              {/* Order - if present */}
              {ticket.order && (
                <div className="flex items-center gap-2 text-sm bg-slate-50 dark:bg-slate-800/30 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                  <Package className="h-4 w-4 text-slate-500" />
                  <span className="text-slate-600 dark:text-slate-400">{t('relatedOrder')}:</span>
                  <Link href={`/orders/${ticket.order.id}`}>
                    <span className="text-blue-600 dark:text-blue-400 hover:underline font-medium" data-testid="link-order">
                      {ticket.order.orderId}
                    </span>
                  </Link>
                </div>
              )}

              {/* Metadata - Small and subtle */}
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t('ticketId')}</p>
                  <p className="text-sm font-medium font-mono text-slate-700 dark:text-slate-300" data-testid="text-ticket-id">
                    {ticket.ticketId}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t('category')}</p>
                  <p className="text-sm font-medium capitalize text-slate-700 dark:text-slate-300" data-testid="text-category">
                    {ticket.category?.replace(/_/g, ' ')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t('created')}</p>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300" data-testid="text-created">
                    {formatDate(ticket.createdAt)}
                  </p>
                </div>
                {ticket.dueDate && (
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t('dueDate')}</p>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300" data-testid="text-due-date">
                      {formatDate(ticket.dueDate)}
                    </p>
                  </div>
                )}
                {ticket.resolvedAt && (
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t('resolved')}</p>
                    <p className="text-sm font-medium text-green-600 dark:text-green-400" data-testid="text-resolved">
                      {formatDate(ticket.resolvedAt)}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Comments Thread */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                {t('comments')} ({comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Comment List */}
              <div className="space-y-4">
                {comments.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">{t('noCommentsYet')}</p>
                ) : (
                  comments.map((comment: any) => (
                    <div
                      key={comment.id}
                      className={`p-4 rounded-lg border-2 ${
                        comment.isInternal
                          ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-700'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                      }`}
                      data-testid={`comment-${comment.id}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-slate-500" />
                          <span className="font-medium">
                            {comment.user?.email || 'System'}
                          </span>
                          {comment.isInternal && (
                            <Badge variant="outline" className="text-xs">
                              {t('internal')}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-slate-500">
                          {formatDate(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                        {comment.content}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment */}
              <div className="pt-4 border-t space-y-3">
                <Textarea
                  placeholder={t('addComment')}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="min-h-[100px]"
                  data-testid="textarea-comment"
                />
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={isInternalComment}
                      onChange={(e) => setIsInternalComment(e.target.checked)}
                      className="rounded"
                      data-testid="checkbox-internal"
                    />
                    {t('internalNote')}
                  </label>
                  <Button
                    onClick={handleAddComment}
                    disabled={!commentText.trim() || addCommentMutation.isPending}
                    className="w-full sm:w-auto"
                    data-testid="button-add-comment"
                  >
                    {addCommentMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('adding')}
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        {t('addCommentButton')}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Quick Actions */}
        <div className="lg:col-span-1 order-first lg:order-last">
          <div className="lg:sticky lg:top-20 space-y-4">
            <Card className="border-2 border-blue-200 dark:border-blue-700">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 text-white">
                <CardTitle>{t('quickActions')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">{t('updateStatus')}</label>
                  <Select
                    value={ticket.status}
                    onValueChange={(value) => updateStatusMutation.mutate(value)}
                    disabled={updateStatusMutation.isPending}
                  >
                    <SelectTrigger data-testid="select-update-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">{t('open')}</SelectItem>
                      <SelectItem value="in_progress">{t('inProgress')}</SelectItem>
                      <SelectItem value="resolved">{t('resolved')}</SelectItem>
                      <SelectItem value="closed">{t('closed')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate(`/tickets/edit/${ticket.id}`)}
                  data-testid="button-edit-full"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  {t('editFullDetails')}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
