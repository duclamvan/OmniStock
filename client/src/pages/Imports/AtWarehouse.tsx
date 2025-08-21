import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Package, Truck, Weight, Grid3x3, ShoppingCart, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Consolidation, InsertConsolidation, CustomItem, InsertCustomItem, PurchaseItem } from '@shared/schema';

// Color options for consolidations
const CONSOLIDATION_COLORS = [
  { value: '#3B82F6', label: 'Blue', className: 'bg-blue-500' },
  { value: '#10B981', label: 'Green', className: 'bg-green-500' },
  { value: '#F59E0B', label: 'Amber', className: 'bg-amber-500' },
  { value: '#EF4444', label: 'Red', className: 'bg-red-500' },
  { value: '#8B5CF6', label: 'Purple', className: 'bg-purple-500' },
  { value: '#EC4899', label: 'Pink', className: 'bg-pink-500' },
  { value: '#14B8A6', label: 'Teal', className: 'bg-teal-500' },
  { value: '#F97316', label: 'Orange', className: 'bg-orange-500' },
];

// Shipping type options
const SHIPPING_TYPES = [
  { value: 'air', label: 'Air Freight', icon: '✈️' },
  { value: 'sea', label: 'Sea Freight', icon: '🚢' },
  { value: 'express', label: 'Express', icon: '🚀' },
];

export default function AtWarehouse() {
  const [selectedConsolidation, setSelectedConsolidation] = useState<Consolidation | null>(null);
  const [isCreateConsolidationOpen, setIsCreateConsolidationOpen] = useState(false);
  const [isAddCustomItemOpen, setIsAddCustomItemOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  // Fetch consolidations
  const { data: consolidations = [], isLoading: consolidationsLoading } = useQuery<Consolidation[]>({
    queryKey: ['/api/imports/consolidations'],
  });

  // Fetch available items (not yet consolidated)
  const { data: availableItems = [] } = useQuery({
    queryKey: ['/api/imports/purchases'],
    select: (purchases: any[]) => {
      const items: PurchaseItem[] = [];
      purchases.forEach((purchase: any) => {
        if (purchase.items) {
          purchase.items.forEach((item: PurchaseItem) => {
            if (!item.consolidationId && item.status === 'at_warehouse') {
              items.push(item);
            }
          });
        }
      });
      return items;
    },
  });

  // Fetch custom items
  const { data: customItems = [] } = useQuery<CustomItem[]>({
    queryKey: ['/api/imports/custom-items'],
  });

  // Create consolidation mutation
  const createConsolidationMutation = useMutation({
    mutationFn: async (data: InsertConsolidation) => {
      return await apiRequest('/api/imports/consolidations', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/consolidations'] });
      setIsCreateConsolidationOpen(false);
      toast({
        title: 'Success',
        description: 'Consolidation created successfully',
      });
    },
  });

  // Create custom item mutation
  const createCustomItemMutation = useMutation({
    mutationFn: async (data: InsertCustomItem) => {
      return await apiRequest('/api/imports/custom-items', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/custom-items'] });
      setIsAddCustomItemOpen(false);
      toast({
        title: 'Success',
        description: 'Custom item added successfully',
      });
    },
  });

  // Add items to consolidation mutation
  const addItemsToConsolidationMutation = useMutation({
    mutationFn: async ({ consolidationId, itemIds }: { consolidationId: number; itemIds: number[] }) => {
      return await apiRequest(`/api/imports/consolidations/${consolidationId}/add-items`, {
        method: 'PUT',
        body: JSON.stringify({ purchaseItemIds: itemIds }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/consolidations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/purchases'] });
      toast({
        title: 'Success',
        description: 'Items added to consolidation',
      });
    },
  });

  // Filter consolidations
  const filteredConsolidations = consolidations.filter(consolidation =>
    consolidation.consolidationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    consolidation.warehouseLocation.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">At Warehouse</h1>
          <p className="text-gray-600 mt-1">Manage consolidations and custom items</p>
        </div>
        <div className="flex space-x-2">
          <AddCustomItemDialog 
            open={isAddCustomItemOpen}
            onOpenChange={setIsAddCustomItemOpen}
            onSubmit={(data) => createCustomItemMutation.mutate(data)}
          />
          <CreateConsolidationDialog
            open={isCreateConsolidationOpen}
            onOpenChange={setIsCreateConsolidationOpen}
            onSubmit={(data) => createConsolidationMutation.mutate(data)}
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Consolidations</p>
                <p className="text-2xl font-bold">{consolidations.length}</p>
              </div>
              <Grid3x3 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Available Items</p>
                <p className="text-2xl font-bold">{availableItems.length}</p>
              </div>
              <Package className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Custom Items</p>
                <p className="text-2xl font-bold">{customItems.filter(i => !i.consolidationId).length}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ready to Ship</p>
                <p className="text-2xl font-bold">
                  {consolidations.filter(c => c.status === 'ready').length}
                </p>
              </div>
              <Truck className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="flex items-center space-x-2">
        <Search className="h-5 w-5 text-gray-400" />
        <Input
          placeholder="Search consolidations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Consolidations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {consolidationsLoading ? (
          <div className="col-span-full text-center py-8">Loading...</div>
        ) : filteredConsolidations.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            No consolidations found. Create one to get started.
          </div>
        ) : (
          filteredConsolidations.map((consolidation) => (
            <ConsolidationCard
              key={consolidation.id}
              consolidation={consolidation}
              onAddItems={(itemIds) => 
                addItemsToConsolidationMutation.mutate({ 
                  consolidationId: consolidation.id, 
                  itemIds 
                })
              }
            />
          ))
        )}
      </div>

      {/* Available Items Section */}
      {availableItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Available Items for Consolidation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {availableItems.map((item) => (
                <div 
                  key={item.id}
                  className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                >
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-gray-600">SKU: {item.sku || 'N/A'}</p>
                  <p className="text-sm">Qty: {item.quantity}</p>
                  <p className="text-sm">Weight: {item.weight || 'N/A'} kg</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Consolidation Card Component
function ConsolidationCard({ 
  consolidation, 
  onAddItems 
}: { 
  consolidation: any;
  onAddItems: (itemIds: number[]) => void;
}) {
  const shippingType = SHIPPING_TYPES.find(t => t.value === consolidation.shippingType);
  
  return (
    <Card 
      className="hover:shadow-lg transition-shadow cursor-pointer"
      style={{ 
        borderTop: `4px solid ${consolidation.color || '#3B82F6'}` 
      }}
    >
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{consolidation.consolidationNumber}</CardTitle>
            <p className="text-sm text-gray-600 mt-1">{consolidation.warehouseLocation}</p>
          </div>
          {shippingType && (
            <div className="text-2xl" title={shippingType.label}>
              {shippingType.icon}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Badge variant={consolidation.status === 'ready' ? 'default' : 'secondary'}>
              {consolidation.status}
            </Badge>
            <span className="text-sm text-gray-600">
              {consolidation.totalItems || 0} items
            </span>
          </div>
          
          {consolidation.estimatedWeight && (
            <div className="flex items-center text-sm text-gray-600">
              <Weight className="h-4 w-4 mr-1" />
              {consolidation.estimatedWeight} kg
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                // Open add items dialog
              }}
            >
              Add Items
            </Button>
            <Button size="sm" variant="outline">
              View Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Create Consolidation Dialog
function CreateConsolidationDialog({ 
  open, 
  onOpenChange, 
  onSubmit 
}: { 
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: InsertConsolidation) => void;
}) {
  const [formData, setFormData] = useState<InsertConsolidation>({
    consolidationNumber: '',
    warehouseLocation: 'China Warehouse',
    status: 'pending',
    shippingType: 'air',
    color: '#3B82F6',
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Create Consolidation
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Consolidation</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="warehouseLocation">Warehouse Location</Label>
            <select
              id="warehouseLocation"
              className="w-full px-3 py-2 border rounded-md"
              value={formData.warehouseLocation}
              onChange={(e) => setFormData({ ...formData, warehouseLocation: e.target.value })}
            >
              <option value="China Warehouse">China Warehouse</option>
              <option value="USA Warehouse">USA Warehouse</option>
              <option value="Vietnam Warehouse">Vietnam Warehouse</option>
            </select>
          </div>

          <div>
            <Label htmlFor="shippingType">Shipping Type</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {SHIPPING_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  className={`p-3 border rounded-md text-center ${
                    formData.shippingType === type.value 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300'
                  }`}
                  onClick={() => setFormData({ ...formData, shippingType: type.value })}
                >
                  <div className="text-2xl mb-1">{type.icon}</div>
                  <div className="text-sm">{type.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="color">Color Label</Label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {CONSOLIDATION_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  className={`h-10 rounded-md ${color.className} ${
                    formData.color === color.value 
                      ? 'ring-2 ring-offset-2 ring-gray-900' 
                      : ''
                  }`}
                  onClick={() => setFormData({ ...formData, color: color.value })}
                />
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              className="w-full px-3 py-2 border rounded-md"
              rows={3}
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Add Custom Item Dialog
function AddCustomItemDialog({ 
  open, 
  onOpenChange, 
  onSubmit 
}: { 
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: InsertCustomItem) => void;
}) {
  const [formData, setFormData] = useState<InsertCustomItem>({
    name: '',
    platform: 'taobao',
    orderNumber: '',
    quantity: 1,
    price: '0',
    currency: 'CNY',
    weight: '0',
    warehouseLocation: 'China Warehouse',
    status: 'pending',
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const platforms = [
    { value: 'taobao', label: 'Taobao', icon: '🛍️' },
    { value: 'pinduoduo', label: 'Pinduoduo', icon: '🛒' },
    { value: '1688', label: '1688', icon: '📦' },
    { value: 'other', label: 'Other', icon: '📋' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <ShoppingCart className="h-4 w-4 mr-2" />
          Add Custom Item
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Custom Item (Taobao/Pinduoduo)</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="platform">Platform</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {platforms.map((platform) => (
                <button
                  key={platform.value}
                  type="button"
                  className={`p-2 border rounded-md text-center ${
                    formData.platform === platform.value 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300'
                  }`}
                  onClick={() => setFormData({ ...formData, platform: platform.value })}
                >
                  <div className="text-xl mb-1">{platform.icon}</div>
                  <div className="text-sm">{platform.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Item Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="orderNumber">Order Number</Label>
              <Input
                id="orderNumber"
                value={formData.orderNumber || ''}
                onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                required
              />
            </div>
            <div>
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.001"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              className="w-full px-3 py-2 border rounded-md"
              rows={2}
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Item</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}