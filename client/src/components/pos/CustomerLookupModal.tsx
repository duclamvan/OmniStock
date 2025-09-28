import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  ShoppingBag, 
  Star,
  Plus,
  TrendingUp,
  Award,
  CreditCard,
  Clock,
  Heart,
  Eye,
  UserPlus
} from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { format } from 'date-fns';
import type { Customer, Order, CustomerLoyaltyPoints } from '@shared/schema';
import { cn } from '@/lib/utils';

interface CustomerLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCustomer: (customer: Customer & { loyaltyPoints?: number; orderCount?: number }) => void;
  currency: 'EUR' | 'CZK';
}

interface CustomerWithStats extends Customer {
  loyaltyPoints?: number;
  orderCount?: number;
  lastOrderDate?: string;
  favoriteCategory?: string;
  totalSpentFormatted?: string;
  hasPayLaterBadge?: boolean;
  payLaterPercentage?: number;
}

export function CustomerLookupModal({ isOpen, onClose, onSelectCustomer, currency }: CustomerLookupModalProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithStats | null>(null);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Search customers
  const { data: customers = [], isLoading: isSearching } = useQuery<CustomerWithStats[]>({
    queryKey: ['/api/pos/customers/search', debouncedSearchQuery],
    queryFn: () => apiRequest('GET', `/api/pos/customers/search?q=${encodeURIComponent(debouncedSearchQuery)}`),
    enabled: isOpen && debouncedSearchQuery.length > 2,
  });

  // Get customer orders for selected customer
  const { data: customerOrders = [] } = useQuery<Order[]>({
    queryKey: ['/api/orders/customer', selectedCustomer?.id],
    enabled: isOpen && !!selectedCustomer?.id,
  });

  // Get customer loyalty points
  const { data: loyaltyPoints = [] } = useQuery<CustomerLoyaltyPoints[]>({
    queryKey: ['/api/pos/customers', selectedCustomer?.id, 'loyalty'],
    queryFn: () => apiRequest('GET', `/api/pos/customers/${selectedCustomer?.id}/loyalty`),
    enabled: isOpen && !!selectedCustomer?.id,
  });

  // Create new customer mutation
  const createCustomerMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/customers', data),
    onSuccess: (newCustomer) => {
      queryClient.invalidateQueries({ queryKey: ['/api/pos/customers/search'] });
      onSelectCustomer({
        ...newCustomer,
        loyaltyPoints: 0,
        orderCount: 0
      });
      toast({
        title: "Success",
        description: "New customer created successfully",
      });
      setShowNewCustomerForm(false);
      setNewCustomerData({ name: '', email: '', phone: '', address: '' });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create customer",
        variant: "destructive",
      });
    },
  });

  const handleSelectCustomer = (customer: CustomerWithStats) => {
    const customerWithStats = {
      ...customer,
      loyaltyPoints: loyaltyPoints.reduce((sum, lp) => sum + (lp.pointsBalance || 0), 0),
      orderCount: customerOrders.length
    };
    onSelectCustomer(customerWithStats);
    onClose();
  };

  const handleCreateCustomer = () => {
    if (!newCustomerData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Customer name is required",
        variant: "destructive",
      });
      return;
    }

    createCustomerMutation.mutate(newCustomerData);
  };

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `${currency} ${numAmount.toFixed(2)}`;
  };

  const getCustomerTierBadge = (totalSpent: number) => {
    if (totalSpent >= 5000) return { label: 'VIP', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' };
    if (totalSpent >= 2000) return { label: 'Gold', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' };
    if (totalSpent >= 500) return { label: 'Silver', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' };
    return { label: 'Bronze', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' };
  };

  const recentOrders = customerOrders
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedCustomer(null);
      setShowNewCustomerForm(false);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Customer Lookup
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-full space-y-4">
          {!showNewCustomerForm ? (
            <>
              {/* Search Section */}
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search by name, phone, or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-customer-search"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNewCustomerForm(true)}
                    className="flex items-center gap-2"
                    data-testid="button-add-new-customer"
                  >
                    <UserPlus className="h-4 w-4" />
                    Add New Customer
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-hidden">
                {debouncedSearchQuery.length <= 2 ? (
                  <div className="flex items-center justify-center h-32 text-slate-500">
                    Type at least 3 characters to search customers
                  </div>
                ) : isSearching ? (
                  <div className="flex items-center justify-center h-32 text-slate-500">
                    Searching customers...
                  </div>
                ) : customers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-slate-500 space-y-2">
                    <p>No customers found</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowNewCustomerForm(true)}
                      className="flex items-center gap-2"
                    >
                      <UserPlus className="h-4 w-4" />
                      Create New Customer
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
                    {/* Customer List */}
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-3">
                        {customers.map((customer) => {
                          const tier = getCustomerTierBadge(parseFloat(customer.totalSpent || '0'));
                          
                          return (
                            <Card 
                              key={customer.id}
                              className={cn(
                                "cursor-pointer transition-all duration-200 hover:shadow-md",
                                selectedCustomer?.id === customer.id ? 
                                  "ring-2 ring-blue-500 border-blue-200 dark:border-blue-800" : 
                                  "hover:border-blue-200 dark:hover:border-blue-800"
                              )}
                              onClick={() => setSelectedCustomer(customer)}
                              data-testid={`card-customer-${customer.id}`}
                            >
                              <CardContent className="p-4">
                                <div className="space-y-3">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <h3 className="font-semibold text-sm">{customer.name}</h3>
                                      <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                                        {customer.phone && (
                                          <div className="flex items-center gap-1">
                                            <Phone className="h-3 w-3" />
                                            {customer.phone}
                                          </div>
                                        )}
                                        {customer.email && (
                                          <div className="flex items-center gap-1">
                                            <Mail className="h-3 w-3" />
                                            {customer.email}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                      <Badge className={tier.color} variant="secondary">
                                        {tier.label}
                                      </Badge>
                                      {customer.hasPayLaterBadge && (
                                        <Badge variant="outline" className="text-xs">
                                          Pay Later {customer.payLaterPercentage}%
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div className="text-center">
                                      <div className="font-medium">{customer.totalOrders || 0}</div>
                                      <div className="text-slate-500">Orders</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="font-medium">{formatCurrency(customer.totalSpent || '0')}</div>
                                      <div className="text-slate-500">Spent</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="font-medium">{formatCurrency(customer.averageOrderValue || '0')}</div>
                                      <div className="text-slate-500">Avg Order</div>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </ScrollArea>

                    {/* Customer Details */}
                    {selectedCustomer && (
                      <div className="space-y-4">
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center justify-between">
                              <span>{selectedCustomer.name}</span>
                              <Button
                                size="sm"
                                onClick={() => handleSelectCustomer(selectedCustomer)}
                                className="flex items-center gap-2"
                                data-testid="button-select-customer"
                              >
                                <User className="h-4 w-4" />
                                Select Customer
                              </Button>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Contact Info */}
                            <div className="space-y-2">
                              {selectedCustomer.email && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Mail className="h-4 w-4 text-slate-400" />
                                  {selectedCustomer.email}
                                </div>
                              )}
                              {selectedCustomer.phone && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Phone className="h-4 w-4 text-slate-400" />
                                  {selectedCustomer.phone}
                                </div>
                              )}
                              {selectedCustomer.address && (
                                <div className="flex items-center gap-2 text-sm">
                                  <MapPin className="h-4 w-4 text-slate-400" />
                                  {selectedCustomer.address}
                                </div>
                              )}
                            </div>

                            <Separator />

                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <ShoppingBag className="h-4 w-4 text-blue-500" />
                                <span>{customerOrders.length} Orders</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Award className="h-4 w-4 text-purple-500" />
                                <span>{loyaltyPoints.reduce((sum, lp) => sum + (lp.pointsBalance || 0), 0)} Points</span>
                              </div>
                              {selectedCustomer.lastOrderDate && (
                                <div className="flex items-center gap-2 col-span-2">
                                  <Clock className="h-4 w-4 text-green-500" />
                                  <span>Last order: {format(new Date(selectedCustomer.lastOrderDate), 'MMM dd, yyyy')}</span>
                                </div>
                              )}
                            </div>

                            {/* Recent Orders */}
                            {recentOrders.length > 0 && (
                              <div className="space-y-2">
                                <h4 className="font-medium text-sm">Recent Orders</h4>
                                <ScrollArea className="h-32">
                                  <div className="space-y-2">
                                    {recentOrders.map((order) => (
                                      <div 
                                        key={order.id}
                                        className="flex items-center justify-between text-xs p-2 bg-slate-50 dark:bg-slate-800 rounded"
                                      >
                                        <div>
                                          <span className="font-medium">#{order.id.slice(-6)}</span>
                                          <span className="text-slate-500 ml-2">
                                            {format(new Date(order.createdAt), 'MMM dd')}
                                          </span>
                                        </div>
                                        <div className="text-right">
                                          <div className="font-medium">{formatCurrency(order.grandTotal || '0')}</div>
                                          <Badge variant="outline" className="text-xs">
                                            {order.orderStatus}
                                          </Badge>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </ScrollArea>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* New Customer Form */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Add New Customer</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewCustomerForm(false)}
                  data-testid="button-cancel-new-customer"
                >
                  Cancel
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name *</label>
                  <Input
                    type="text"
                    value={newCustomerData.name}
                    onChange={(e) => setNewCustomerData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Customer name"
                    data-testid="input-new-customer-name"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone</label>
                  <Input
                    type="tel"
                    value={newCustomerData.phone}
                    onChange={(e) => setNewCustomerData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Phone number"
                    data-testid="input-new-customer-phone"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    value={newCustomerData.email}
                    onChange={(e) => setNewCustomerData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Email address"
                    data-testid="input-new-customer-email"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Address</label>
                  <Input
                    type="text"
                    value={newCustomerData.address}
                    onChange={(e) => setNewCustomerData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Address"
                    data-testid="input-new-customer-address"
                  />
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleCreateCustomer}
                  disabled={!newCustomerData.name.trim() || createCustomerMutation.isPending}
                  className="flex items-center gap-2"
                  data-testid="button-create-customer"
                >
                  <Plus className="h-4 w-4" />
                  {createCustomerMutation.isPending ? 'Creating...' : 'Create Customer'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CustomerLookupModal;