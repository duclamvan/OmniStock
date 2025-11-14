import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Search, Package, Truck, User, ShoppingCart, Calendar } from 'lucide-react';
import { useLocation } from 'wouter';
import { getCountryFlag, getCountryCodeByName } from '@/lib/countries';
import { formatCurrency } from '@/lib/currencyUtils';

interface SearchResult {
  inventoryItems: Array<{
    id: string;
    name: string;
    sku: string;
    quantity: number;
    imageUrl?: string;
    type: 'inventory';
  }>;
  shipmentItems: Array<{
    id: string;
    productId: string;
    name: string;
    sku: string;
    quantity: number;
    purchaseOrderId: string;
    purchaseOrderNumber: string;
    expectedDeliveryDate?: string;
    status: string;
    imageUrl?: string;
    type: 'shipment';
  }>;
  customers: Array<{
    id: string;
    name: string;
    email?: string;
    company?: string;
    city?: string;
    country?: string;
    preferredCurrency?: string;
    totalOrders: number;
    lastOrderText: string;
    recentOrders: Array<{
      id: string;
      orderNumber: string;
      orderDate: string;
      totalPrice: number;
      currency: string;
      status: string;
    }>;
  }>;
}

interface GlobalSearchProps {
  onFocus?: () => void;
  onBlur?: () => void;
  autoFocus?: boolean;
}

export function GlobalSearch({ onFocus, onBlur, autoFocus }: GlobalSearchProps = {}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [, setLocation] = useLocation();
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Auto-focus when requested
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Debounce search query - wait 150ms after user stops typing (reduced for snappier feel)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 150);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: results, isLoading } = useQuery<SearchResult>({
    queryKey: ['/api/search', debouncedQuery],
    queryFn: async () => {
      const response = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    enabled: debouncedQuery.trim().length >= 2,
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Show results when query changes and has results
  useEffect(() => {
    if (debouncedQuery.trim().length > 0 && results) {
      setShowResults(true);
    } else if (debouncedQuery.trim().length === 0) {
      setShowResults(false);
    }
  }, [debouncedQuery, results]);

  const handleItemClick = (type: 'inventory' | 'shipment' | 'customer', id: string, productId?: string) => {
    if (type === 'inventory') {
      setLocation(`/inventory/${id}`);
    } else if (type === 'customer') {
      setLocation(`/customers/${id}`);
    } else if (type === 'shipment') {
      // For shipments, navigate to the product page since shipment items are tied to products
      if (productId) {
        setLocation(`/inventory/${productId}`);
      }
    }
    setSearchQuery('');
    setShowResults(false);
  };

  const totalResults = (results?.inventoryItems.length || 0) + 
                       (results?.shipmentItems.length || 0) + 
                       (results?.customers.length || 0);

  return (
    <div ref={searchRef} className="relative w-full max-w-2xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search items, shipments, or customers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => {
            if (searchQuery.trim().length > 0 && results) {
              setShowResults(true);
            }
            onFocus?.();
          }}
          onBlur={() => {
            // Delay blur to allow clicking on results
            setTimeout(() => {
              onBlur?.();
            }, 200);
          }}
          className="pl-10 pr-4"
          data-testid="input-global-search"
        />
      </div>

      {showResults && searchQuery.trim().length > 0 && (
        <Card className="absolute top-full mt-2 w-full max-h-[80vh] overflow-y-auto z-50 shadow-lg">
          {searchQuery.trim().length === 1 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Type at least 2 characters to search...
            </div>
          ) : isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Searching...
            </div>
          ) : totalResults === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No results found for "{searchQuery}"
            </div>
          ) : (
            <div className="p-2">
              {/* Inventory Items Section */}
              {results && results.inventoryItems.length > 0 && (
                <div className="mb-4">
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Package className="h-3 w-3" />
                    Current Stock ({results.inventoryItems.length})
                  </div>
                  {results.inventoryItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick('inventory', item.id)}
                      className="w-full px-3 py-2 hover:bg-accent rounded-md flex items-center gap-3 text-left transition-colors"
                      data-testid={`search-result-inventory-${item.id}`}
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-10 w-10 object-cover rounded"
                        />
                      ) : (
                        <div className="h-10 w-10 bg-muted rounded flex items-center justify-center">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{item.name}</div>
                        <div className="text-sm text-muted-foreground">
                          SKU: {item.sku} • Stock: {item.quantity}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Shipment Items Section */}
              {results && results.shipmentItems.length > 0 && (
                <div className="mb-4">
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Truck className="h-3 w-3" />
                    Upcoming Shipments ({results.shipmentItems.length})
                  </div>
                  {results.shipmentItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick('shipment', item.id, item.productId)}
                      className="w-full px-3 py-2 hover:bg-accent rounded-md flex items-center gap-3 text-left transition-colors"
                      data-testid={`search-result-shipment-${item.id}`}
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-10 w-10 object-cover rounded"
                        />
                      ) : (
                        <div className="h-10 w-10 bg-muted rounded flex items-center justify-center">
                          <Truck className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{item.name}</div>
                        <div className="text-sm text-muted-foreground">
                          PO: {item.purchaseOrderNumber} • Qty: {item.quantity}
                        </div>
                        {item.expectedDeliveryDate && (
                          <div className="text-xs text-muted-foreground">
                            Expected: {new Date(item.expectedDeliveryDate).toLocaleDateString('cs-CZ')}
                          </div>
                        )}
                      </div>
                      <Badge variant={item.status === 'received' ? 'default' : 'secondary'}>
                        {item.status}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}

              {/* Customers Section */}
              {results && results.customers.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <User className="h-3 w-3" />
                    Customers ({results.customers.length})
                  </div>
                  {results.customers.map((customer) => {
                    const countryCode = customer.country ? getCountryCodeByName(customer.country) : '';
                    const countryFlag = countryCode ? getCountryFlag(countryCode) : '';
                    
                    return (
                      <button
                        key={customer.id}
                        onClick={() => handleItemClick('customer', customer.id)}
                        className="w-full px-3 py-3 hover:bg-accent rounded-md text-left transition-colors border-b last:border-b-0"
                        data-testid={`search-result-customer-${customer.id}`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Country Flag */}
                          <div className="text-2xl flex-shrink-0">
                            {countryFlag || '🌍'}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{customer.name}</div>
                            
                            {/* City, Country */}
                            {(customer.city || customer.country) && (
                              <div className="text-sm text-muted-foreground truncate">
                                {customer.city && customer.country 
                                  ? `${customer.city}, ${customer.country}`
                                  : customer.city || customer.country
                                }
                              </div>
                            )}
                            
                            {/* Customer Stats Badges */}
                            <div className="flex flex-wrap gap-2 mt-2">
                              {customer.preferredCurrency && (
                                <Badge variant="secondary" className="text-xs">
                                  {customer.preferredCurrency}
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                <ShoppingCart className="h-3 w-3 mr-1" />
                                {customer.totalOrders} orders
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                <Calendar className="h-3 w-3 mr-1" />
                                Last: {customer.lastOrderText}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  
                  {/* Recent Orders for matched customers */}
                  {results.customers.flatMap(customer => 
                    customer.recentOrders?.map(order => ({
                      ...order,
                      customerName: customer.name
                    })) || []
                  ).length > 0 && (
                    <>
                      <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mt-2">
                        <ShoppingCart className="h-3 w-3" />
                        Recent Orders
                      </div>
                      {results.customers.flatMap(customer => 
                        customer.recentOrders?.map(order => (
                          <button
                            key={order.id}
                            onClick={() => {
                              setLocation(`/orders/${order.id}`);
                              setSearchQuery('');
                              setShowResults(false);
                            }}
                            className="w-full px-3 py-2 hover:bg-accent rounded-md flex items-center gap-3 text-left transition-colors"
                            data-testid={`search-result-order-${order.id}`}
                          >
                            <div className="h-10 w-10 bg-orange-100 dark:bg-orange-900/20 rounded flex items-center justify-center flex-shrink-0">
                              <ShoppingCart className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">#{order.orderNumber}</div>
                              <div className="text-sm text-muted-foreground truncate">
                                {customer.name}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">
                                {formatCurrency(order.totalPrice, order.currency)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(order.orderDate).toLocaleDateString('cs-CZ')}
                              </div>
                            </div>
                          </button>
                        )) || []
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
