import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Plus, Search, Edit, Trash2, Package, Eye, Grid, List, ImageOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { ProductBundle } from '@shared/schema';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function SimpleBundles() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('bundlesViewMode') as 'grid' | 'list') || 'grid';
  });

  useEffect(() => {
    localStorage.setItem('bundlesViewMode', viewMode);
  }, [viewMode]);

  // Fetch bundles
  const { data: bundles = [], isLoading } = useQuery<ProductBundle[]>({
    queryKey: ['/api/bundles']
  });

  // Delete bundle mutation
  const deleteBundleMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/bundles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bundles'] });
      toast({
        title: 'Success',
        description: 'Bundle deleted successfully'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete bundle',
        variant: 'destructive'
      });
    }
  });

  const filteredBundles = bundles.filter(bundle =>
    bundle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bundle.bundleId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (bundle.sku && bundle.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Product Bundles</h1>
          <p className="text-muted-foreground">
            Manage bundled product offerings
          </p>
        </div>
        <Button onClick={() => setLocation('/inventory/bundles/create')}>
          <Plus className="mr-2 h-4 w-4" />
          Create Bundle
        </Button>
      </div>

      {/* Search and View Toggle */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search bundles by name, ID, or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as 'grid' | 'list')}>
          <ToggleGroupItem value="grid" aria-label="Grid view">
            <Grid className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="List view">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Bundle List */}
      {filteredBundles.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {searchQuery ? 'No bundles found' : 'No bundles created yet'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery 
                ? 'Try adjusting your search criteria' 
                : 'Create your first bundle to group products together'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setLocation('/inventory/bundles/create')}>
                <Plus className="mr-2 h-4 w-4" />
                Create First Bundle
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredBundles.map(bundle => (
            <Card key={bundle.id} className="hover:shadow-lg transition-shadow flex flex-col h-full overflow-hidden">
              {/* Bundle Image */}
              {bundle.imageUrl ? (
                <div className="w-full h-48 bg-slate-100 flex items-center justify-center">
                  <img 
                    src={bundle.imageUrl} 
                    alt={bundle.name}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-full h-48 bg-slate-100 flex items-center justify-center">
                  <ImageOff className="h-16 w-16 text-slate-300" />
                </div>
              )}
              
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-1">{bundle.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground">{bundle.bundleId}</p>
                      {bundle.sku && (
                        <>
                          <span className="text-xs text-muted-foreground">•</span>
                          <p className="text-xs text-muted-foreground">SKU: {bundle.sku}</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <div className="flex-1 space-y-3">
                  <div className="min-h-[2.5rem]">
                    {bundle.description ? (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {bundle.description}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No description</p>
                    )}
                  </div>
                  
                  <div className="space-y-2 py-2 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Bundle Price:</span>
                      <div className="text-right">
                        {bundle.priceCzk && (
                          <p className="text-sm font-semibold">
                            CZK {parseFloat(bundle.priceCzk).toFixed(2)}
                          </p>
                        )}
                        {bundle.priceEur && (
                          <p className="text-xs text-muted-foreground">
                            EUR {parseFloat(bundle.priceEur).toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="min-h-[1.5rem]">
                      {bundle.discountPercentage && parseFloat(bundle.discountPercentage) > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {parseFloat(bundle.discountPercentage).toFixed(0)}% Bundle Savings
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-sm text-muted-foreground">Available Stock:</span>
                      <Badge 
                        variant="outline" 
                        className={(bundle as any).availableStock > 0 ? "bg-green-50 text-green-700 border-green-300" : "bg-red-50 text-red-700 border-red-300"}
                      >
                        {(bundle as any).availableStock || 0}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-auto pt-3 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setLocation(`/inventory/bundles/${bundle.id}`)}
                  >
                    <Eye className="mr-1 h-3 w-3" />
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setLocation(`/inventory/bundles/${bundle.id}/edit`)}
                  >
                    <Edit className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete "${bundle.name}"?`)) {
                        deleteBundleMutation.mutate(bundle.id);
                      }
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Bundle ID / SKU</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead className="text-center">Stock</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBundles.map(bundle => (
                <TableRow key={bundle.id}>
                  <TableCell>
                    {bundle.imageUrl ? (
                      <div className="w-12 h-12 bg-slate-100 rounded flex items-center justify-center overflow-hidden">
                        <img 
                          src={bundle.imageUrl}
                          alt={bundle.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-slate-100 rounded flex items-center justify-center">
                        <ImageOff className="h-6 w-6 text-slate-300" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{bundle.name}</TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{bundle.bundleId}</p>
                      {bundle.sku && (
                        <p className="text-xs text-muted-foreground">SKU: {bundle.sku}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-muted-foreground line-clamp-2 max-w-xs">
                      {bundle.description || '-'}
                    </p>
                  </TableCell>
                  <TableCell>
                    {bundle.priceCzk && (
                      <div>
                        <p className="text-sm font-semibold">
                          CZK {parseFloat(bundle.priceCzk).toFixed(2)}
                        </p>
                        {bundle.priceEur && (
                          <p className="text-xs text-muted-foreground">
                            EUR {parseFloat(bundle.priceEur).toFixed(2)}
                          </p>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {bundle.discountPercentage && parseFloat(bundle.discountPercentage) > 0 ? (
                      <Badge variant="outline" className="text-xs">
                        {parseFloat(bundle.discountPercentage).toFixed(0)}%
                      </Badge>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge 
                      variant="outline" 
                      className={(bundle as any).availableStock > 0 ? "bg-green-50 text-green-700 border-green-300" : "bg-red-50 text-red-700 border-red-300"}
                    >
                      {(bundle as any).availableStock || 0}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setLocation(`/inventory/bundles/${bundle.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setLocation(`/inventory/bundles/${bundle.id}/edit`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete "${bundle.name}"?`)) {
                            deleteBundleMutation.mutate(bundle.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}