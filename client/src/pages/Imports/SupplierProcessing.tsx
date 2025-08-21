import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Package, Calendar, DollarSign, Eye, Edit, Trash2, Search } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import type { ImportPurchase, InsertImportPurchase, PurchaseItem, InsertPurchaseItem } from '@shared/schema';

export default function SupplierProcessing() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPurchase, setSelectedPurchase] = useState<ImportPurchase | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  // Fetch purchases
  const { data: purchases = [], isLoading } = useQuery<ImportPurchase[]>({
    queryKey: ['/api/imports/purchases'],
  });

  // Create purchase mutation
  const createPurchaseMutation = useMutation({
    mutationFn: async (data: { purchase: InsertImportPurchase; items: InsertPurchaseItem[] }) => {
      return await apiRequest('/api/imports/purchases', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/purchases'] });
      setIsCreateDialogOpen(false);
      toast({
        title: 'Success',
        description: 'Purchase created successfully',
      });
    },
  });

  // Filter purchases based on search
  const filteredPurchases = purchases.filter(purchase =>
    purchase.purchaseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    purchase.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
    purchase.supplierCountry.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processing': return 'bg-yellow-500';
      case 'at_warehouse': return 'bg-blue-500';
      case 'shipped': return 'bg-purple-500';
      case 'delivered': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Supplier Processing</h1>
          <p className="text-gray-600 mt-1">Manage purchases from suppliers</p>
        </div>
        <CreatePurchaseDialog 
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onSubmit={(data) => createPurchaseMutation.mutate(data)}
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Purchases</p>
                <p className="text-2xl font-bold">{purchases.length}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Processing</p>
                <p className="text-2xl font-bold">
                  {purchases.filter(p => p.status === 'processing').length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">At Warehouse</p>
                <p className="text-2xl font-bold">
                  {purchases.filter(p => p.status === 'at_warehouse').length}
                </p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Value</p>
                <p className="text-2xl font-bold">
                  ${purchases.reduce((sum, p) => sum + parseFloat(p.totalAmount || '0'), 0).toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="flex items-center space-x-2">
        <Search className="h-5 w-5 text-gray-400" />
        <Input
          placeholder="Search purchases..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Purchases Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Purchases</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Purchase #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPurchases.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell className="font-medium">{purchase.purchaseNumber}</TableCell>
                    <TableCell>{purchase.supplier}</TableCell>
                    <TableCell>{purchase.supplierCountry}</TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(purchase.status)} text-white`}>
                        {purchase.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{(purchase as any).itemCount || 0}</TableCell>
                    <TableCell>
                      {purchase.currency} {parseFloat(purchase.totalAmount || '0').toLocaleString()}
                    </TableCell>
                    <TableCell>{format(new Date(purchase.orderDate), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedPurchase(purchase)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Purchase Details Dialog */}
      {selectedPurchase && (
        <PurchaseDetailsDialog
          purchase={selectedPurchase}
          open={!!selectedPurchase}
          onOpenChange={(open) => !open && setSelectedPurchase(null)}
        />
      )}
    </div>
  );
}

// Create Purchase Dialog Component
function CreatePurchaseDialog({ 
  open, 
  onOpenChange, 
  onSubmit 
}: { 
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { purchase: InsertImportPurchase; items: InsertPurchaseItem[] }) => void;
}) {
  const [formData, setFormData] = useState<InsertImportPurchase>({
    supplier: '',
    supplierCountry: '',
    status: 'processing',
    totalAmount: '0',
    currency: 'USD',
    notes: '',
  });

  const [items, setItems] = useState<InsertPurchaseItem[]>([]);
  const [newItem, setNewItem] = useState<InsertPurchaseItem>({
    purchaseId: 0, // Will be set on server
    name: '',
    quantity: 1,
    unitPrice: '0',
    totalPrice: '0',
    status: 'ordered',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ purchase: formData, items });
  };

  const addItem = () => {
    if (newItem.name) {
      setItems([...items, { ...newItem, totalPrice: String(parseFloat(newItem.unitPrice || '0') * newItem.quantity) }]);
      setNewItem({
        purchaseId: 0,
        name: '',
        quantity: 1,
        unitPrice: '0',
        totalPrice: '0',
        status: 'ordered',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Create Purchase
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Purchase</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="supplier">Supplier</Label>
              <Input
                id="supplier"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={formData.supplierCountry}
                onChange={(e) => setFormData({ ...formData, supplierCountry: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="currency">Currency</Label>
              <select
                id="currency"
                className="w-full px-3 py-2 border rounded-md"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="CNY">CNY</option>
                <option value="VND">VND</option>
              </select>
            </div>
            <div>
              <Label htmlFor="totalAmount">Total Amount</Label>
              <Input
                id="totalAmount"
                type="number"
                step="0.01"
                value={formData.totalAmount}
                onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
              />
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

          {/* Items Section */}
          <div>
            <h3 className="font-semibold mb-3">Items</h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Item name"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                />
                <Input
                  type="number"
                  placeholder="Qty"
                  className="w-20"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) })}
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Price"
                  className="w-24"
                  value={newItem.unitPrice}
                  onChange={(e) => setNewItem({ ...newItem, unitPrice: e.target.value })}
                />
                <Button type="button" onClick={addItem}>Add</Button>
              </div>

              {items.length > 0 && (
                <div className="border rounded-md p-3">
                  {items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-1">
                      <span>{item.name}</span>
                      <span>{item.quantity} x ${item.unitPrice} = ${item.totalPrice}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Purchase</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Purchase Details Dialog Component
function PurchaseDetailsDialog({ 
  purchase, 
  open, 
  onOpenChange 
}: { 
  purchase: ImportPurchase;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: purchaseDetails } = useQuery({
    queryKey: ['/api/imports/purchases', purchase.id],
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Purchase Details - {purchase.purchaseNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Supplier</p>
              <p className="font-semibold">{purchase.supplier}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Country</p>
              <p className="font-semibold">{purchase.supplierCountry}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <Badge className={`${getStatusColor(purchase.status)} text-white`}>
                {purchase.status.replace('_', ' ')}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="font-semibold">
                {purchase.currency} {parseFloat(purchase.totalAmount || '0').toLocaleString()}
              </p>
            </div>
          </div>

          {purchaseDetails?.items && purchaseDetails.items.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Items</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseDetails.items.map((item: PurchaseItem) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.sku || '-'}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>${item.unitPrice}</TableCell>
                      <TableCell>${item.totalPrice}</TableCell>
                      <TableCell>{item.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'processing': return 'bg-yellow-500';
    case 'at_warehouse': return 'bg-blue-500';
    case 'shipped': return 'bg-purple-500';
    case 'delivered': return 'bg-green-500';
    default: return 'bg-gray-500';
  }
}