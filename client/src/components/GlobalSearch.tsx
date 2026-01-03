import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Search, Package, Truck, User, ShoppingCart, Calendar, Loader2, Command } from 'lucide-react';
import { useLocation } from 'wouter';
import { getCountryFlag, getCountryCodeByName } from '@/lib/countries';
import { formatCurrency } from '@/lib/currencyUtils';

interface SearchResult {
  inventoryItems: Array<{
    id: string;
    name: string;
    sku: string;
    quantity: number;
    availableQuantity?: number;
    allocatedQuantity?: number;
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
  orders: Array<{
    id: string;
    orderId: string;
    customerName: string;
    grandTotal: string | number;
    currency: string;
    orderStatus: string;
    createdAt: string;
  }>;
}

interface FlattenedResult {
  type: 'inventory' | 'shipment' | 'customer' | 'order';
  id: string;
  productId?: string;
  data: any;
}

interface GlobalSearchProps {
  onFocus?: () => void;
  onBlur?: () => void;
  autoFocus?: boolean;
}

export function GlobalSearch({ onFocus, onBlur, autoFocus }: GlobalSearchProps = {}) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [, setLocation] = useLocation();
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  
  // Auto-focus when requested
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Debounce search query - fast 100ms for snappy feel
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 100);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: results, isLoading, isFetching } = useQuery<SearchResult>({
    queryKey: ['/api/search', debouncedQuery],
    queryFn: async () => {
      const response = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    enabled: debouncedQuery.trim().length >= 2,
    staleTime: 30000,
  });

  // Flatten results for keyboard navigation
  const flattenedResults = useMemo((): FlattenedResult[] => {
    if (!results) return [];
    
    const flat: FlattenedResult[] = [];
    
    results.inventoryItems?.forEach(item => {
      flat.push({ type: 'inventory', id: item.id, data: item });
    });
    
    results.shipmentItems?.forEach(item => {
      flat.push({ type: 'shipment', id: item.id, productId: item.productId, data: item });
    });
    
    results.orders?.forEach(order => {
      flat.push({ type: 'order', id: order.id, data: order });
    });
    
    results.customers?.forEach(customer => {
      flat.push({ type: 'customer', id: customer.id, data: customer });
    });
    
    return flat;
  }, [results]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
        setSelectedIndex(-1);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Show results when query changes and has results
  useEffect(() => {
    if (debouncedQuery.trim().length >= 2 && results) {
      setShowResults(true);
      setSelectedIndex(-1);
    } else if (debouncedQuery.trim().length < 2) {
      setShowResults(false);
      setSelectedIndex(-1);
    }
  }, [debouncedQuery, results]);

  const navigateToResult = useCallback((result: FlattenedResult) => {
    if (result.type === 'inventory') {
      setLocation(`/inventory/${result.id}`);
    } else if (result.type === 'customer') {
      setLocation(`/customers/${result.id}`);
    } else if (result.type === 'shipment') {
      if (result.productId) {
        setLocation(`/inventory/${result.productId}`);
      }
    } else if (result.type === 'order') {
      setLocation(`/orders/${result.id}`);
    }
    setSearchQuery('');
    setShowResults(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
  }, [setLocation]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showResults || flattenedResults.length === 0) {
      if (e.key === 'Escape') {
        setShowResults(false);
        inputRef.current?.blur();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < flattenedResults.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : flattenedResults.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < flattenedResults.length) {
          navigateToResult(flattenedResults[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowResults(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  }, [showResults, flattenedResults, selectedIndex, navigateToResult]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && resultsRef.current) {
      const selectedElement = resultsRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  // Highlight matching text
  const highlightMatch = useCallback((text: string, query: string) => {
    if (!query || !text) return text;
    
    const tokens = query.toLowerCase().split(/[\s\-_.,;:\/\\]+/).filter(t => t.length >= 2);
    if (tokens.length === 0) return text;
    
    let result = text;
    tokens.forEach(token => {
      const regex = new RegExp(`(${token})`, 'gi');
      result = result.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-700 rounded px-0.5">$1</mark>');
    });
    
    return result;
  }, []);

  const totalResults = (results?.inventoryItems?.length || 0) + 
                       (results?.shipmentItems?.length || 0) + 
                       (results?.customers?.length || 0) +
                       (results?.orders?.length || 0);

  const isSearching = isLoading || isFetching;

  // Track current flat index for highlighting
  let currentFlatIndex = -1;

  return (
    <div ref={searchRef} className="relative w-full sm:max-w-2xl">
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground dark:text-gray-400 transition-colors group-focus-within:text-cyan-500" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={t('common:searchItemsShipmentsCustomers')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (searchQuery.trim().length >= 2 && results) {
              setShowResults(true);
            }
            onFocus?.();
          }}
          onBlur={() => {
            setTimeout(() => {
              onBlur?.();
            }, 200);
          }}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          className="pl-10 pr-12 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all"
          data-testid="input-global-search"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-cyan-500 animate-spin" />
        )}
        {!isSearching && searchQuery.length === 0 && (
          <kbd className="absolute right-3 top-1/2 transform -translate-y-1/2 hidden sm:inline-flex h-5 items-center gap-1 rounded border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 px-1.5 font-mono text-[10px] text-gray-500 dark:text-gray-400">
            <Command className="h-2.5 w-2.5" />K
          </kbd>
        )}
      </div>

      {showResults && searchQuery.trim().length > 0 && (
        <Card 
          ref={resultsRef}
          className="fixed sm:absolute left-0 right-0 sm:left-auto sm:right-auto top-[calc(100%+0.5rem)] sm:top-full mt-0 sm:mt-2 w-screen sm:w-full max-h-[80vh] overflow-y-auto z-50 shadow-xl dark:shadow-gray-900/50 bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700 rounded-none sm:rounded-lg"
        >
          {searchQuery.trim().length === 1 ? (
            <div className="p-6 text-center text-sm text-muted-foreground dark:text-gray-400">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
              {t('common:typeAtLeastTwoCharacters')}
            </div>
          ) : isLoading ? (
            <div className="p-6 text-center text-sm text-muted-foreground dark:text-gray-400">
              <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-cyan-500" />
              {t('common:searching')}
            </div>
          ) : totalResults === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground dark:text-gray-400">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
              {t('common:noResultsFoundFor', { query: searchQuery })}
              <p className="text-xs mt-2 opacity-70">Try different keywords or check spelling</p>
            </div>
          ) : (
            <div className="p-2">
              {/* Results summary */}
              <div className="px-3 py-1 mb-2 text-xs text-muted-foreground dark:text-gray-500 border-b border-gray-100 dark:border-gray-700">
                {totalResults} result{totalResults !== 1 ? 's' : ''} • Use ↑↓ to navigate, Enter to select
              </div>

              {/* Inventory Items Section */}
              {results && results.inventoryItems.length > 0 && (
                <div className="mb-3">
                  <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <Package className="h-3.5 w-3.5 text-emerald-500" />
                    {t('common:currentStock')} ({results.inventoryItems.length})
                  </div>
                  {results.inventoryItems.map((item) => {
                    currentFlatIndex++;
                    const isSelected = selectedIndex === currentFlatIndex;
                    return (
                      <button
                        key={item.id}
                        data-index={currentFlatIndex}
                        onClick={() => navigateToResult({ type: 'inventory', id: item.id, data: item })}
                        className={`w-full px-3 py-2.5 rounded-lg flex items-center gap-3 text-left transition-all ${
                          isSelected 
                            ? 'bg-cyan-50 dark:bg-cyan-900/30 ring-2 ring-cyan-500/50' 
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                        data-testid={`search-result-inventory-${item.id}`}
                      >
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="h-12 w-12 object-cover rounded-lg shadow-sm"
                          />
                        ) : (
                          <div className="h-12 w-12 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30 rounded-lg flex items-center justify-center">
                            <Package className="h-6 w-6 text-emerald-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div 
                            className="font-medium truncate text-gray-900 dark:text-gray-100"
                            dangerouslySetInnerHTML={{ __html: highlightMatch(item.name, searchQuery) }}
                          />
                          <div className="text-sm text-muted-foreground dark:text-gray-400 flex items-center gap-2">
                            <span 
                              className="font-mono text-xs"
                              dangerouslySetInnerHTML={{ __html: highlightMatch(item.sku, searchQuery) }}
                            />
                            <span className="text-gray-300 dark:text-gray-600">•</span>
                            <span className={(item.availableQuantity ?? item.quantity) <= 0 ? 'text-red-500 font-medium' : 'text-emerald-600 dark:text-emerald-400'}>
                              {item.availableQuantity ?? item.quantity} {t('common:available')}
                            </span>
                            {(item.allocatedQuantity ?? 0) > 0 && (
                              <span className="text-amber-600 dark:text-amber-400">
                                ({item.allocatedQuantity} {t('common:allocated')})
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Shipment Items Section */}
              {results && results.shipmentItems.length > 0 && (
                <div className="mb-3">
                  <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <Truck className="h-3.5 w-3.5 text-blue-500" />
                    {t('common:upcomingShipments')} ({results.shipmentItems.length})
                  </div>
                  {results.shipmentItems.map((item) => {
                    currentFlatIndex++;
                    const isSelected = selectedIndex === currentFlatIndex;
                    return (
                      <button
                        key={item.id}
                        data-index={currentFlatIndex}
                        onClick={() => navigateToResult({ type: 'shipment', id: item.id, productId: item.productId, data: item })}
                        className={`w-full px-3 py-2.5 rounded-lg flex items-center gap-3 text-left transition-all ${
                          isSelected 
                            ? 'bg-cyan-50 dark:bg-cyan-900/30 ring-2 ring-cyan-500/50' 
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                        data-testid={`search-result-shipment-${item.id}`}
                      >
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="h-12 w-12 object-cover rounded-lg shadow-sm"
                          />
                        ) : (
                          <div className="h-12 w-12 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg flex items-center justify-center">
                            <Truck className="h-6 w-6 text-blue-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div 
                            className="font-medium truncate text-gray-900 dark:text-gray-100"
                            dangerouslySetInnerHTML={{ __html: highlightMatch(item.name, searchQuery) }}
                          />
                          <div className="text-sm text-muted-foreground dark:text-gray-400">
                            PO: {item.purchaseOrderNumber} • Qty: {item.quantity}
                          </div>
                          {item.expectedDeliveryDate && (
                            <div className="text-xs text-muted-foreground dark:text-gray-400">
                              Expected: {new Date(item.expectedDeliveryDate).toLocaleDateString('cs-CZ')}
                            </div>
                          )}
                        </div>
                        <Badge variant={item.status === 'received' ? 'default' : 'secondary'} className="text-xs">
                          {item.status}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Orders Section */}
              {results && results.orders?.length > 0 && (
                <div className="mb-3">
                  <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <ShoppingCart className="h-3.5 w-3.5 text-orange-500" />
                    {t('common:orders')} ({results.orders.length})
                  </div>
                  {results.orders.map((order) => {
                    currentFlatIndex++;
                    const isSelected = selectedIndex === currentFlatIndex;
                    return (
                      <button
                        key={order.id}
                        data-index={currentFlatIndex}
                        onClick={() => navigateToResult({ type: 'order', id: order.id, data: order })}
                        className={`w-full px-3 py-2.5 rounded-lg flex items-center gap-3 text-left transition-all ${
                          isSelected 
                            ? 'bg-cyan-50 dark:bg-cyan-900/30 ring-2 ring-cyan-500/50' 
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                        data-testid={`search-result-order-${order.id}`}
                      >
                        <div className="h-12 w-12 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 rounded-lg flex items-center justify-center flex-shrink-0">
                          <ShoppingCart className="h-6 w-6 text-orange-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div 
                            className="font-medium truncate text-gray-900 dark:text-gray-100"
                            dangerouslySetInnerHTML={{ __html: highlightMatch(`#${order.orderId}`, searchQuery) }}
                          />
                          <div className="text-sm text-muted-foreground dark:text-gray-400 truncate">
                            {order.customerName}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {formatCurrency(parseFloat(String(order.grandTotal || '0')), order.currency)}
                          </div>
                          <div className="text-xs text-muted-foreground dark:text-gray-400">
                            {order.createdAt ? new Date(order.createdAt).toLocaleDateString('cs-CZ') : ''}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Customers Section */}
              {results && results.customers.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-purple-500" />
                    Customers ({results.customers.length})
                  </div>
                  {results.customers.map((customer) => {
                    currentFlatIndex++;
                    const isSelected = selectedIndex === currentFlatIndex;
                    const countryCode = customer.country ? getCountryCodeByName(customer.country) : '';
                    const countryFlag = countryCode ? getCountryFlag(countryCode) : '';
                    
                    return (
                      <button
                        key={customer.id}
                        data-index={currentFlatIndex}
                        onClick={() => navigateToResult({ type: 'customer', id: customer.id, data: customer })}
                        className={`w-full px-3 py-3 rounded-lg text-left transition-all ${
                          isSelected 
                            ? 'bg-cyan-50 dark:bg-cyan-900/30 ring-2 ring-cyan-500/50' 
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                        data-testid={`search-result-customer-${customer.id}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="h-12 w-12 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">
                            {countryFlag || '🌍'}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div 
                              className="font-medium truncate text-gray-900 dark:text-gray-100"
                              dangerouslySetInnerHTML={{ __html: highlightMatch(customer.name, searchQuery) }}
                            />
                            
                            {(customer.city || customer.country) && (
                              <div className="text-sm text-muted-foreground dark:text-gray-400 truncate">
                                {customer.city && customer.country 
                                  ? `${customer.city}, ${customer.country}`
                                  : customer.city || customer.country
                                }
                              </div>
                            )}
                            
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {customer.preferredCurrency && (
                                <Badge variant="secondary" className="text-xs">
                                  {customer.preferredCurrency}
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs border-gray-200 dark:border-gray-600">
                                <ShoppingCart className="h-3 w-3 mr-1" />
                                {customer.totalOrders}
                              </Badge>
                              <Badge variant="outline" className="text-xs border-gray-200 dark:border-gray-600">
                                <Calendar className="h-3 w-3 mr-1" />
                                {customer.lastOrderText}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
