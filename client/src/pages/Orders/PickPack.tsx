import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Package, 
  LayoutGrid, 
  ClipboardList, 
  BarChart3,
  Smartphone,
  Monitor,
  ArrowLeft
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Link } from 'wouter';
import { StatusBoard } from '@/features/pick-pack/components/queue/StatusBoard';
import { MobileTaskView } from '@/features/pick-pack/components/picker/MobileTaskView';
import { StationWorkspace } from '@/features/pick-pack/components/packer/StationWorkspace';
import { PerformanceMetrics } from '@/features/pick-pack/components/shared/PerformanceMetrics';

export default function PickPack() {
  const [view, setView] = useState<'kanban' | 'my-tasks' | 'metrics'>('kanban');
  const [role, setRole] = useState<'picker' | 'packer'>('picker');
  const isMobile = useIsMobile();

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6" data-testid="page-pick-pack">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/orders" className="hover:opacity-70">
              <Button variant="ghost" size="sm" data-testid="button-back">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold flex items-center gap-3" data-testid="text-page-title">
            <Package className="h-8 w-8 text-blue-600" />
            Pick & Pack Workflow
          </h1>
          <p className="text-muted-foreground mt-1">
            Queue-based order fulfillment system
          </p>
        </div>

        {/* Quick Stats */}
        <Card className="hidden lg:block">
          <CardContent className="p-4">
            <div className="flex items-center gap-6 text-sm">
              <div>
                <div className="text-muted-foreground">Active</div>
                <div className="text-2xl font-bold text-blue-600">-</div>
              </div>
              <div>
                <div className="text-muted-foreground">Completed</div>
                <div className="text-2xl font-bold text-green-600">-</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Navigation Tabs */}
      <Tabs value={view} onValueChange={(v) => setView(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto" data-testid="tabs-main-nav">
          <TabsTrigger value="kanban" className="flex items-center gap-2" data-testid="tab-kanban">
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Queue Board</span>
            <span className="sm:hidden">Board</span>
          </TabsTrigger>
          <TabsTrigger value="my-tasks" className="flex items-center gap-2" data-testid="tab-my-tasks">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">My Tasks</span>
            <span className="sm:hidden">Tasks</span>
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center gap-2" data-testid="tab-metrics">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Metrics</span>
            <span className="sm:hidden">Stats</span>
          </TabsTrigger>
        </TabsList>

        {/* Queue Board (Kanban View) */}
        <TabsContent value="kanban" className="space-y-4 mt-6">
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <LayoutGrid className="h-4 w-4" />
                Queue Overview
              </CardTitle>
              <CardDescription>
                View all orders across the pick & pack pipeline
              </CardDescription>
            </CardHeader>
          </Card>

          <StatusBoard />
        </TabsContent>

        {/* My Tasks View */}
        <TabsContent value="my-tasks" className="space-y-4 mt-6">
          {/* Role Selector for Desktop */}
          {!isMobile && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">Select Role:</span>
                  <div className="flex gap-2">
                    <Button
                      variant={role === 'picker' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setRole('picker')}
                      className="flex items-center gap-2"
                      data-testid="button-role-picker"
                    >
                      <Smartphone className="h-4 w-4" />
                      Picker
                    </Button>
                    <Button
                      variant={role === 'packer' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setRole('packer')}
                      className="flex items-center gap-2"
                      data-testid="button-role-packer"
                    >
                      <Monitor className="h-4 w-4" />
                      Packer
                    </Button>
                  </div>
                  <Badge variant="secondary" className="ml-auto">
                    {isMobile ? 'Mobile' : 'Desktop'} Mode
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Task Interface - switches based on role or device */}
          {isMobile || role === 'picker' ? (
            <div>
              <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200 mb-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    Picker Interface
                  </CardTitle>
                  <CardDescription>
                    Mobile-optimized picking workflow
                  </CardDescription>
                </CardHeader>
              </Card>
              <MobileTaskView />
            </div>
          ) : (
            <div>
              <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200 mb-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    Packing Station
                  </CardTitle>
                  <CardDescription>
                    Desktop packing workspace with full features
                  </CardDescription>
                </CardHeader>
              </Card>
              <StationWorkspace />
            </div>
          )}
        </TabsContent>

        {/* Performance Metrics */}
        <TabsContent value="metrics" className="space-y-4 mt-6">
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Performance Dashboard
              </CardTitle>
              <CardDescription>
                Track productivity and efficiency metrics
              </CardDescription>
            </CardHeader>
          </Card>

          <PerformanceMetrics />

          {/* Additional Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Today's Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Orders Picked:</span>
                    <span className="font-semibold">-</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Orders Packed:</span>
                    <span className="font-semibold">-</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Items:</span>
                    <span className="font-semibold">-</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Queue Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pending:</span>
                    <Badge variant="secondary">-</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">In Progress:</span>
                    <Badge variant="secondary">-</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ready to Ship:</span>
                    <Badge variant="secondary">-</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Leaderboard Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performers (Last 7 Days)</CardTitle>
              <CardDescription>
                Fastest pick & pack times
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-sm text-muted-foreground py-8">
                Leaderboard data will appear here
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Help Section */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Package className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 mb-1">How it works:</p>
              <ol className="text-blue-800 space-y-1 list-decimal list-inside">
                <li>Enter your employee name in the Queue Board</li>
                <li>Claim an order from the Pending column (for picking) or Ready to Pack (for packing)</li>
                <li>Go to "My Tasks" to work on your claimed orders</li>
                <li>Complete the workflow and the order automatically moves to the next stage</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
