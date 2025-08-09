import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Plus, Search, Edit, Trash2, Layers, Package, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { ProductBundle } from '@shared/schema';

export default function SimpleBundles() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch bundles
  const { data: bundles = [], isLoading } = useQuery<ProductBundle[]>({
    queryKey: ['/api/bundles']
  });

  // Delete bundle mutation
  const deleteBundleMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/api/bundles/${id}`, {
        method: 'DELETE'
      });
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search bundles by name, ID, or SKU..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
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
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredBundles.map(bundle => (
            <Card key={bundle.id} className="hover:shadow-lg transition-shadow">
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
                  <Badge variant="secondary" className="ml-2">
                    <Layers className="mr-1 h-3 w-3" />
                    Bundle
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {bundle.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {bundle.description}
                    </p>
                  )}
                  
                  <div className="space-y-2 py-2 border-t border-b">
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

                    {bundle.discountPercentage && parseFloat(bundle.discountPercentage) > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {parseFloat(bundle.discountPercentage).toFixed(0)}% Bundle Savings
                      </Badge>
                    )}
                  </div>

                  <div className="flex gap-2">
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}