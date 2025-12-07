import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  ClipboardList,
  Eye,
  Shield,
  User as UserIcon,
} from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import type { User, ActivityLog } from "@shared/schema";

export default function ActivityLog() {
  const { userId } = useParams();
  const [, setLocation] = useLocation();
  const { t } = useTranslation(['system', 'common']);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  // Fetch user details
  const { data: user, isLoading: isLoadingUser } = useQuery<User>({
    queryKey: [`/api/users/${userId}`],
  });

  // Fetch activity logs
  const { data: activityLogs = [], isLoading: isLoadingLogs } = useQuery<ActivityLog[]>({
    queryKey: [`/api/activity-log/${userId}`],
  });

  const isLoading = isLoadingUser || isLoadingLogs;

  const getActionBadge = (action: string) => {
    const actionLower = action.toLowerCase();
    
    if (actionLower === 'create') {
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          {t('common:create')}
        </Badge>
      );
    } else if (actionLower === 'update') {
      return (
        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          {t('common:update')}
        </Badge>
      );
    } else if (actionLower === 'delete') {
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          {t('common:delete')}
        </Badge>
      );
    } else if (actionLower === 'login') {
      return (
        <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
          {t('system:login')}
        </Badge>
      );
    } else if (actionLower === 'logout') {
      return (
        <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
          {t('system:logout')}
        </Badge>
      );
    }
    
    return <Badge variant="outline">{action}</Badge>;
  };

  const getRoleBadge = (role: string | null) => {
    if (role === 'administrator') {
      return (
        <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
          <Shield className="h-3 w-3 mr-1" />
          {t('system:administrator')}
        </Badge>
      );
    } else if (role === 'warehouse_operator') {
      return (
        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          <UserIcon className="h-3 w-3 mr-1" />
          {t('system:operator')}
        </Badge>
      );
    }
    return null;
  };

  const handleViewDetails = (log: ActivityLog) => {
    setSelectedLog(log);
    setDetailsDialogOpen(true);
  };

  if (isLoadingUser) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => setLocation('/employees')}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common:back')}
        </Button>
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('common:notFound')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('system:userNotFound')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-2 sm:p-4 md:p-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/employees')}
            data-testid="button-back"
            className="mt-1"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100" data-testid="text-user-name">
              {t('system:activityLog')} - {user.firstName} {user.lastName}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t('system:trackAllSystemActivitiesForThisUser')}
            </p>
            <div className="mt-2">
              {getRoleBadge(user.role)}
            </div>
          </div>
        </div>
      </div>

      {/* Activity Log Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            {t('system:activityHistory')} ({activityLogs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingLogs ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : activityLogs.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2" data-testid="text-empty-state">
                {t('system:noActivityRecorded')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('system:noActivityRecordedYet')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-testid="table-activity-log">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">{t('system:dateTime')}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t('system:action')}</TableHead>
                    <TableHead className="hidden md:table-cell">{t('system:entityType')}</TableHead>
                    <TableHead>{t('common:description')}</TableHead>
                    <TableHead className="w-[80px]">{t('common:details')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activityLogs.map((log) => (
                    <TableRow key={log.id} data-testid={`row-activity-${log.id}`}>
                      <TableCell className="text-sm">
                        {format(new Date(log.createdAt), 'PPpp')}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {getActionBadge(log.action)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {log.entityType ? (
                          <Badge variant="outline" className="capitalize">
                            {log.entityType}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-md">
                          <p className="text-sm">{log.description}</p>
                          {log.entityId && (
                            <p className="text-xs text-muted-foreground mt-1">
                              ID: {log.entityId}
                            </p>
                          )}
                          {/* Show action and entity type on mobile */}
                          <div className="sm:hidden flex items-center gap-2 mt-2">
                            {getActionBadge(log.action)}
                            {log.entityType && (
                              <Badge variant="outline" className="capitalize text-xs">
                                {log.entityType}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.metadata ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewDetails(log)}
                            data-testid={`button-details-${log.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('system:activityDetails')}</DialogTitle>
            <DialogDescription>
              {t('system:viewDetailedInformation')}
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {t('system:action')}
                  </p>
                  <div className="mt-1">{getActionBadge(selectedLog.action)}</div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {t('system:dateTime')}
                  </p>
                  <p className="mt-1 text-sm">
                    {format(new Date(selectedLog.createdAt), 'PPpp')}
                  </p>
                </div>
                {selectedLog.entityType && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {t('system:entityType')}
                    </p>
                    <Badge variant="outline" className="mt-1 capitalize">
                      {selectedLog.entityType}
                    </Badge>
                  </div>
                )}
                {selectedLog.entityId && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {t('system:entityId')}
                    </p>
                    <p className="mt-1 text-sm font-mono">{selectedLog.entityId}</p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('common:description')}
                </p>
                <p className="mt-1 text-sm">{selectedLog.description}</p>
              </div>
              {selectedLog.ipAddress && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {t('system:ipAddress')}
                  </p>
                  <p className="mt-1 text-sm font-mono">{selectedLog.ipAddress}</p>
                </div>
              )}
              {selectedLog.userAgent && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {t('system:userAgent')}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground break-all">
                    {selectedLog.userAgent}
                  </p>
                </div>
              )}
              {selectedLog.metadata ? (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    {t('system:metadata')}
                  </p>
                  <div className="bg-muted dark:bg-muted/50 rounded-md p-4">
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(selectedLog.metadata as any, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
