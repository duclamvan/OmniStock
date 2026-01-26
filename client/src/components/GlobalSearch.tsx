import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Package, Truck, User, ShoppingCart, Command } from 'lucide-react';
import { useLocation } from 'wouter';
import { getCountryFlag, getCountryCodeByName } from '@/lib/countries';
import { formatCurrency } from '@/lib/currencyUtils';
import { cn } from '@/lib/utils';

let hasPreloadedSearch = false;

interface SearchResult {
  inventoryItems: Array<{
    id: string;
    name: string;
    sku: string;
    quantity: number;
    availableQuantity?: number;
    allocatedQuantity?: number;
    imageUrl?: string;
    priceEur?: number | string;
    priceCzk?: number | string;
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
    shippingCity?: string;
    shippingCountry?: string;
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

function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd');
}

function matchesQuery(text: string, query: string): boolean {
  if (!text || !query) return false;
  const normalizedText = normalizeForSearch(text);
  const normalizedQuery = normalizeForSearch(query);
  return normalizedText.includes(normalizedQuery);
}

const SearchResultItem = memo(({ 
  result, 
  isSelected, 
  searchQuery, 
  onSelect,
  index 
}: {
  result: FlattenedResult;
  isSelected: boolean;
  searchQuery: string;
  onSelect: () => void;
  index: number;
}) => {
  const highlightMatch = useCallback((text: string, query: string) => {
    if (!query || !text) return text;
    const tokens = query.toLowerCase().split(/[\s\-_.,;:\/\\]+/).filter(t => t.length >= 2);
    if (tokens.length === 0) return text;
    let result = text;
    tokens.forEach(token => {
      const regex = new RegExp(`(${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      result = result.replace(regex, '<mark class="bg-yellow-200/80 dark:bg-yellow-600/40 rounded-sm px-0.5">$1</mark>');
    });
    return result;
  }, []);

  if (result.type === 'inventory') {
    const item = result.data;
    const available = item.availableQuantity ?? item.quantity;
    const allocated = item.allocatedQuantity ?? 0;
    return (
      <button
        data-index={index}
        onClick={onSelect}
        className={cn(
          "w-full px-3 py-2.5 flex items-start gap-3 text-left transition-colors duration-100",
          isSelected 
            ? "bg-cyan-50 dark:bg-cyan-900/30" 
            : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
        )}
      >
        {item.imageUrl ? (
          <img src={item.imageUrl} alt="" className="h-11 w-11 object-cover rounded-lg flex-shrink-0" loading="lazy" />
        ) : (
          <div className="h-11 w-11 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
            <Package className="h-5 w-5 text-emerald-500" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div 
            className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate"
            dangerouslySetInnerHTML={{ __html: highlightMatch(item.name, searchQuery) }}
          />
          <div className="flex items-center gap-2 mt-0.5">
            <span 
              className="font-mono text-xs text-gray-500 dark:text-gray-400"
              dangerouslySetInnerHTML={{ __html: highlightMatch(item.sku, searchQuery) }}
            />
            <span className={cn(
              "text-xs font-medium",
              available > 10 ? "text-emerald-600 dark:text-emerald-400" : 
              available > 0 ? "text-amber-600 dark:text-amber-400" : 
              "text-red-600 dark:text-red-400"
            )}>
              {available} avail
            </span>
            {allocated > 0 && (
              <span className="text-xs text-orange-500">({allocated} held)</span>
            )}
          </div>
        </div>
        {(item.priceEur || item.priceCzk) && (
          <div className="text-right text-xs flex-shrink-0">
            {item.priceEur && <div className="text-blue-600 dark:text-blue-400 font-medium">€{Number(item.priceEur).toFixed(2)}</div>}
            {item.priceCzk && <div className="text-gray-500">{Number(item.priceCzk).toFixed(0)} Kč</div>}
          </div>
        )}
      </button>
    );
  }

  if (result.type === 'order') {
    const order = result.data;
    const statusColors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      processing: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      shipped: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
      delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
    return (
      <button
        data-index={index}
        onClick={onSelect}
        className={cn(
          "w-full px-3 py-2.5 flex items-center gap-3 text-left transition-colors duration-100",
          isSelected ? "bg-cyan-50 dark:bg-cyan-900/30" : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
        )}
      >
        <div className="h-11 w-11 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
          <ShoppingCart className="h-5 w-5 text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
            <span dangerouslySetInnerHTML={{ __html: highlightMatch(order.orderId, searchQuery) }} />
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
            {order.customerName}
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          <div className="font-medium text-sm">{formatCurrency(Number(order.grandTotal), order.currency)}</div>
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", statusColors[order.orderStatus] || '')}>
            {order.orderStatus}
          </Badge>
        </div>
      </button>
    );
  }

  if (result.type === 'customer') {
    const customer = result.data;
    const countryCode = customer.shippingCountry ? getCountryCodeByName(customer.shippingCountry) : null;
    return (
      <button
        data-index={index}
        onClick={onSelect}
        className={cn(
          "w-full px-3 py-2.5 flex items-center gap-3 text-left transition-colors duration-100",
          isSelected ? "bg-cyan-50 dark:bg-cyan-900/30" : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
        )}
      >
        <div className="h-11 w-11 bg-purple-50 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
          <User className="h-5 w-5 text-purple-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div 
            className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate"
            dangerouslySetInnerHTML={{ __html: highlightMatch(customer.name, searchQuery) }}
          />
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {countryCode && <span>{getCountryFlag(countryCode)}</span>}
            {customer.shippingCity && <span>{customer.shippingCity}</span>}
            {customer.totalOrders > 0 && <span>• {customer.totalOrders} orders</span>}
          </div>
        </div>
        {customer.preferredCurrency && (
          <Badge variant="outline" className="text-[10px] px-1.5">{customer.preferredCurrency}</Badge>
        )}
      </button>
    );
  }

  if (result.type === 'shipment') {
    const item = result.data;
    return (
      <button
        data-index={index}
        onClick={onSelect}
        className={cn(
          "w-full px-3 py-2.5 flex items-center gap-3 text-left transition-colors duration-100",
          isSelected ? "bg-cyan-50 dark:bg-cyan-900/30" : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
        )}
      >
        <div className="h-11 w-11 bg-amber-50 dark:bg-amber-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
          <Truck className="h-5 w-5 text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div 
            className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate"
            dangerouslySetInnerHTML={{ __html: highlightMatch(item.name, searchQuery) }}
          />
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {item.quantity} incoming • PO #{item.purchaseOrderNumber}
          </div>
        </div>
        <Badge variant="outline" className="text-[10px] px-1.5 capitalize">{item.status}</Badge>
      </button>
    );
  }

  return null;
});

SearchResultItem.displayName = 'SearchResultItem';

export function GlobalSearch({ onFocus, onBlur, autoFocus }: GlobalSearchProps = {}) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [preloadedData, setPreloadedData] = useState<SearchResult | null>(null);
  const [, setLocation] = useLocation();
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Preload data on mount
  useEffect(() => {
    if (hasPreloadedSearch) return;
    hasPreloadedSearch = true;
    
    fetch('/api/search/preload')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setPreloadedData(data);
          queryClient.setQueryData(['/api/search/preload'], data);
        }
      })
      .catch(() => {});
  }, [queryClient]);

  // Instant local filtering from preloaded data
  const localFilteredResults = useMemo((): SearchResult | null => {
    if (!preloadedData || searchQuery.trim().length < 1) return null;
    const query = searchQuery.trim();
    
    const filteredInventory = preloadedData.inventoryItems?.filter(item => 
      item.name?.trim() && (matchesQuery(item.name, query) || matchesQuery(item.sku, query))
    ).slice(0, 8) || [];
    
    const filteredCustomers = preloadedData.customers?.filter(customer =>
      customer.name?.trim() && (
        matchesQuery(customer.name, query) || 
        matchesQuery(customer.email || '', query) ||
        matchesQuery(customer.company || '', query)
      )
    ).slice(0, 4) || [];
    
    // Filter orders from preloaded data
    const filteredOrders = preloadedData.orders?.filter(order =>
      matchesQuery(order.orderId || '', query) || 
      matchesQuery(order.customerName || '', query)
    ).slice(0, 4) || [];
    
    return {
      inventoryItems: filteredInventory,
      shipmentItems: [],
      customers: filteredCustomers,
      orders: filteredOrders
    };
  }, [preloadedData, searchQuery]);

  // Check if local results are sufficient (has good matches)
  const hasGoodLocalResults = useMemo(() => {
    if (!localFilteredResults) return false;
    const total = (localFilteredResults.inventoryItems?.length || 0) + 
                  (localFilteredResults.customers?.length || 0) +
                  (localFilteredResults.orders?.length || 0);
    return total >= 3; // If we have 3+ local matches, don't hit server
  }, [localFilteredResults]);

  // Debounce for server query - only fire if local results are insufficient
  useEffect(() => {
    // Don't set debounced query if local results are good enough
    if (hasGoodLocalResults) {
      setDebouncedQuery('');
      return;
    }
    
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 350); // Longer debounce to reduce server requests
    return () => clearTimeout(timer);
  }, [searchQuery, hasGoodLocalResults]);

  // Server query - only fires when local results are insufficient
  const { data: serverResults, isFetching } = useQuery<SearchResult>({
    queryKey: ['/api/search', debouncedQuery],
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`, { signal });
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    enabled: debouncedQuery.trim().length >= 2 && !hasGoodLocalResults,
    staleTime: 120000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const cleanedServerResults = useMemo((): SearchResult | null => {
    if (!serverResults) return null;
    return {
      inventoryItems: serverResults.inventoryItems?.filter(item => item.name?.trim()) || [],
      shipmentItems: serverResults.shipmentItems?.filter(item => item.name?.trim()) || [],
      customers: serverResults.customers?.filter(customer => customer.name?.trim()) || [],
      orders: serverResults.orders?.filter(order => order.orderId?.trim() || order.customerName?.trim()) || [],
    };
  }, [serverResults]);

  // Use local results first, only use server results if local is empty
  const results = localFilteredResults && 
    ((localFilteredResults.inventoryItems?.length || 0) + 
     (localFilteredResults.customers?.length || 0) +
     (localFilteredResults.orders?.length || 0)) > 0
    ? localFilteredResults 
    : cleanedServerResults;
  
  const isLoading = searchQuery.trim().length >= 1 && !results && isFetching;
  const isRefining = false; // Disable refining indicator since we prioritize local

  const MAX_ITEMS = 4;

  const flattenedResults = useMemo((): FlattenedResult[] => {
    if (!results) return [];
    const flat: FlattenedResult[] = [];
    
    results.inventoryItems?.slice(0, MAX_ITEMS).forEach(item => {
      flat.push({ type: 'inventory', id: item.id, data: item });
    });
    results.orders?.slice(0, MAX_ITEMS).forEach(order => {
      flat.push({ type: 'order', id: order.id, data: order });
    });
    results.shipmentItems?.slice(0, MAX_ITEMS).forEach(item => {
      flat.push({ type: 'shipment', id: item.id, productId: item.productId, data: item });
    });
    results.customers?.slice(0, MAX_ITEMS).forEach(customer => {
      flat.push({ type: 'customer', id: customer.id, data: customer });
    });
    
    return flat;
  }, [results]);

  // Click outside handler
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

  useEffect(() => {
    if (searchQuery.trim().length >= 1) {
      setShowResults(true);
      setSelectedIndex(-1);
    } else {
      setShowResults(false);
      setSelectedIndex(-1);
    }
  }, [searchQuery]);

  const navigateToResult = useCallback((result: FlattenedResult) => {
    const routes: Record<string, string> = {
      inventory: `/inventory/${result.id}`,
      customer: `/customers/${result.id}`,
      order: `/orders/${result.id}`,
      shipment: result.productId ? `/inventory/${result.productId}` : '',
    };
    if (routes[result.type]) {
      setLocation(routes[result.type]);
    }
    setSearchQuery('');
    setShowResults(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
  }, [setLocation]);

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
        setSelectedIndex(prev => prev < flattenedResults.length - 1 ? prev + 1 : 0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : flattenedResults.length - 1);
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

  // Scroll into view
  useEffect(() => {
    if (selectedIndex >= 0 && resultsRef.current) {
      const el = resultsRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const totalResults = (results?.inventoryItems?.length || 0) + 
                       (results?.shipmentItems?.length || 0) + 
                       (results?.customers?.length || 0) +
                       (results?.orders?.length || 0);

  const showDropdown = showResults && searchQuery.trim().length > 0;

  return (
    <div ref={searchRef} className="relative w-full sm:max-w-2xl">
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-cyan-500" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={t('common:searchItemsShipmentsCustomers')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (searchQuery.trim().length >= 1 && results) setShowResults(true);
            onFocus?.();
          }}
          onBlur={() => setTimeout(() => onBlur?.(), 150)}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          className="pl-10 pr-12 bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-colors"
        />
        
        {/* Loading/shortcut indicator */}
        <div className="absolute right-3 top-0 bottom-0 flex items-center">
          {(isLoading || isRefining) ? (
            <div className="relative h-4 w-4">
              <div className="absolute inset-0 rounded-full border-2 border-cyan-200 dark:border-cyan-800" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-500 animate-spin" />
            </div>
          ) : searchQuery.length === 0 && (
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-1.5 font-mono text-[10px] text-gray-400 h-5">
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          )}
        </div>
      </div>

      {/* Results dropdown - rendered via portal on mobile for full width */}
      {createPortal(
        <div
          ref={resultsRef}
          className={cn(
            "fixed left-0 right-0 top-[calc(var(--mobile-header-height-current,3.5rem)+env(safe-area-inset-top,0px))] w-screen max-h-[60vh] overflow-y-auto z-[9999] bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700 shadow-xl dark:shadow-gray-900/30",
            "transition-all duration-150 ease-out origin-top",
            showDropdown 
              ? "opacity-100 scale-y-100 pointer-events-auto" 
              : "opacity-0 scale-y-95 pointer-events-none"
          )}
        >
        {isLoading ? (
          <div className="p-3 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2">
                <div className="h-11 w-11 rounded-lg bg-gray-100 dark:bg-gray-700 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-3/4 rounded bg-gray-100 dark:bg-gray-700 animate-pulse" />
                  <div className="h-3 w-1/2 rounded bg-gray-100 dark:bg-gray-700 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : !results || totalResults === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            <Search className="h-6 w-6 mx-auto mb-2 opacity-30" />
            {t('common:noResultsFoundFor', { query: searchQuery })}
          </div>
        ) : (
          <div className="py-1">
            {/* Refining indicator */}
            {isRefining && (
              <div className="h-0.5 bg-gray-100 dark:bg-gray-700 overflow-hidden">
                <div className="h-full w-1/3 bg-cyan-500 animate-[shimmer_1s_ease-in-out_infinite]" 
                     style={{ animation: 'shimmer 1s ease-in-out infinite' }} />
              </div>
            )}
            
            {/* Inventory section */}
            {results.inventoryItems && results.inventoryItems.length > 0 && (
              <div>
                <div className="px-4 py-1.5 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="h-3 w-3 text-emerald-500" />
                  Stock ({Math.min(results.inventoryItems.length, MAX_ITEMS)}/{results.inventoryItems.length})
                </div>
                {results.inventoryItems.slice(0, MAX_ITEMS).map((item, idx) => (
                  <SearchResultItem
                    key={item.id}
                    result={{ type: 'inventory', id: item.id, data: item }}
                    isSelected={selectedIndex === idx}
                    searchQuery={searchQuery}
                    onSelect={() => navigateToResult({ type: 'inventory', id: item.id, data: item })}
                    index={idx}
                  />
                ))}
              </div>
            )}

            {/* Orders section */}
            {results.orders && results.orders.length > 0 && (
              <div>
                <div className="px-4 py-1.5 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mt-1">
                  <ShoppingCart className="h-3 w-3 text-blue-500" />
                  Orders ({Math.min(results.orders.length, MAX_ITEMS)}/{results.orders.length})
                </div>
                {results.orders.slice(0, MAX_ITEMS).map((order, idx) => {
                  const flatIdx = (results.inventoryItems?.slice(0, MAX_ITEMS).length || 0) + idx;
                  return (
                    <SearchResultItem
                      key={order.id}
                      result={{ type: 'order', id: order.id, data: order }}
                      isSelected={selectedIndex === flatIdx}
                      searchQuery={searchQuery}
                      onSelect={() => navigateToResult({ type: 'order', id: order.id, data: order })}
                      index={flatIdx}
                    />
                  );
                })}
              </div>
            )}

            {/* Shipments section */}
            {results.shipmentItems && results.shipmentItems.length > 0 && (
              <div>
                <div className="px-4 py-1.5 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mt-1">
                  <Truck className="h-3 w-3 text-amber-500" />
                  Incoming ({Math.min(results.shipmentItems.length, MAX_ITEMS)}/{results.shipmentItems.length})
                </div>
                {results.shipmentItems.slice(0, MAX_ITEMS).map((item, idx) => {
                  const flatIdx = (results.inventoryItems?.slice(0, MAX_ITEMS).length || 0) + 
                                  (results.orders?.slice(0, MAX_ITEMS).length || 0) + idx;
                  return (
                    <SearchResultItem
                      key={item.id}
                      result={{ type: 'shipment', id: item.id, productId: item.productId, data: item }}
                      isSelected={selectedIndex === flatIdx}
                      searchQuery={searchQuery}
                      onSelect={() => navigateToResult({ type: 'shipment', id: item.id, productId: item.productId, data: item })}
                      index={flatIdx}
                    />
                  );
                })}
              </div>
            )}

            {/* Customers section */}
            {results.customers && results.customers.length > 0 && (
              <div>
                <div className="px-4 py-1.5 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mt-1">
                  <User className="h-3 w-3 text-purple-500" />
                  Customers ({Math.min(results.customers.length, MAX_ITEMS)}/{results.customers.length})
                </div>
                {results.customers.slice(0, MAX_ITEMS).map((customer, idx) => {
                  const flatIdx = (results.inventoryItems?.slice(0, MAX_ITEMS).length || 0) + 
                                  (results.orders?.slice(0, MAX_ITEMS).length || 0) + 
                                  (results.shipmentItems?.slice(0, MAX_ITEMS).length || 0) + idx;
                  return (
                    <SearchResultItem
                      key={customer.id}
                      result={{ type: 'customer', id: customer.id, data: customer }}
                      isSelected={selectedIndex === flatIdx}
                      searchQuery={searchQuery}
                      onSelect={() => navigateToResult({ type: 'customer', id: customer.id, data: customer })}
                      index={flatIdx}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>,
      document.body
    )}
    </div>
  );
}
