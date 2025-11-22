import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { queryClient } from '@/lib/queryClient';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Plus, Upload, Edit, FileSpreadsheet, Download, Tag, X } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Product, ProductVariant } from '@shared/schema';

interface CustomerPrice {
  id: string;
  customerId: string;
  productId: string;
  variantId?: string | null;
  price: string;
  currency: string;
  validFrom: string;
  validTo?: string | null;
  isActive: boolean;
  notes?: string | null;
  createdAt: string;
  product?: Product;
  variant?: ProductVariant | null;
}

const customerPriceSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  variantId: z.string().optional(),
  price: z.coerce.number().positive('Price must be positive'),
  currency: z.enum(['CZK', 'EUR', 'USD', 'VND', 'CNY']),
  validFrom: z.string().min(1, 'Valid from date is required'),
  validTo: z.string().optional(),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
});

type CreateCustomerPriceInput = z.infer<typeof customerPriceSchema>;

interface CustomerPricesProps {
  customerId: string;
}

export function CustomerPrices({ customerId }: CustomerPricesProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  const { data: prices = [], isLoading } = useQuery<CustomerPrice[]>({
    queryKey: [`/api/customers/${customerId}/prices`],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: variants = [] } = useQuery<ProductVariant[]>({
    queryKey: [`/api/products/${selectedProduct}/variants`],
    enabled: !!selectedProduct,
  });

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    product.sku?.toLowerCase().includes(productSearch.toLowerCase())
  );

  const form = useForm<CreateCustomerPriceInput>({
    resolver: zodResolver(customerPriceSchema),
    defaultValues: {
      productId: '',
      variantId: '',
      price: 0,
      currency: 'CZK',
      validFrom: format(new Date(), 'yyyy-MM-dd'),
      validTo: '',
      isActive: true,
      notes: '',
    },
  });

  const createPriceMutation = useMutation({
    mutationFn: (data: CreateCustomerPriceInput) => 
      apiRequest('POST', `/api/customers/${customerId}/prices`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/customers/${customerId}/prices`] });
      setIsAddDialogOpen(false);
      form.reset();
      setProductSearch("");
      setSelectedProduct("");
      setShowProductDropdown(false);
      toast({
        title: t('customers.success'),
        description: t('customers.customerPriceCreated'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('customers.error'),
        description: error?.message || t('customers.failedToCreateCustomerPrice'),
        variant: 'destructive',
      });
    },
  });

  const deletePriceMutation = useMutation({
    mutationFn: (id: string) => 
      apiRequest('DELETE', `/api/customer-prices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/customers/${customerId}/prices`] });
      toast({
        title: t('customers.success'),
        description: t('customers.customerPriceDeleted'),
      });
    },
    onError: () => {
      toast({
        title: t('customers.error'),
        description: t('customers.failedToDeleteCustomerPrice'),
        variant: 'destructive',
      });
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: (prices: any[]) => 
      apiRequest('POST', `/api/customers/${customerId}/prices/bulk`, { prices }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/customers/${customerId}/prices`] });
      setIsBulkDialogOpen(false);
      setCsvContent('');
      toast({
        title: t('customers.success'),
        description: t('customers.pricesImportedSuccessfully'),
      });
    },
    onError: () => {
      toast({
        title: t('customers.error'),
        description: t('customers.failedToImportPrices'),
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (data: CreateCustomerPriceInput) => {
    createPriceMutation.mutate(data);
  };

  const handleBulkImport = () => {
    try {
      const lines = csvContent.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      const prices = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const price: any = {};
        
        headers.forEach((header, index) => {
          if (header === 'price') {
            price[header] = parseFloat(values[index]);
          } else if (header === 'isActive') {
            price[header] = values[index].toLowerCase() === 'true';
          } else {
            price[header] = values[index] || undefined;
          }
        });
        
        return price;
      });
      
      bulkImportMutation.mutate(prices);
    } catch (error) {
      toast({
        title: t('customers.error'),
        description: t('customers.invalidCsvFormat'),
        variant: 'destructive',
      });
    }
  };

  const downloadTemplate = () => {
    const template = 'productId,variantId,price,currency,validFrom,validTo,isActive,notes\n' +
                    'prod-001,,100,CZK,2024-01-01,,true,Special price for customer\n' +
                    'prod-002,variant-001,50,EUR,2024-01-01,2024-12-31,true,Promotional price';
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customer_prices_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns = [
    {
      key: 'productId',
      header: t('customers.product'),
      accessorKey: 'productId',
      className: 'min-w-[120px]',
      cell: (row: any) => {
        const product = products.find(p => p.id === row.productId);
        return <span className="text-xs sm:text-sm">{product?.name || row.productId}</span>;
      },
    },
    {
      key: 'variantId',
      header: <span className="hidden sm:inline">{t('customers.variant')}</span>,
      accessorKey: 'variantId',
      className: 'hidden sm:table-cell',
      cell: (row: any) => {
        if (!row.variantId) return <span className="text-xs text-muted-foreground">-</span>;
        return <span className="text-xs">{row.variantId}</span>;
      },
    },
    {
      key: 'price',
      header: t('customers.price'),
      accessorKey: 'price',
      className: 'text-right',
      cell: (row: any) => (
        <div className="font-medium text-xs sm:text-sm text-right">
          {row.price} {row.currency}
        </div>
      ),
    },
    {
      key: 'validFrom',
      header: <span className="hidden sm:inline">{t('customers.validFrom')}</span>,
      accessorKey: 'validFrom',
      className: 'hidden sm:table-cell',
      cell: (row: any) => (
        <span className="text-xs">{format(new Date(row.validFrom), 'dd/MM/yy')}</span>
      ),
    },
    {
      key: 'validTo',
      header: <span className="hidden lg:inline">{t('customers.validTo')}</span>,
      accessorKey: 'validTo',
      className: 'hidden lg:table-cell',
      cell: (row: any) => (
        <span className="text-xs">
          {row.validTo ? format(new Date(row.validTo), 'dd/MM/yy') : t('customers.noExpiry')}
        </span>
      ),
    },
    {
      key: 'isActive',
      header: t('customers.status'),
      accessorKey: 'isActive',
      cell: (row: any) => (
        <Badge 
          variant={row.isActive ? 'default' : 'secondary'}
          className="text-xs px-1.5 py-0"
        >
          {row.isActive ? t('customers.active') : t('customers.inactive')}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      id: 'actions',
      className: 'w-10',
      cell: (row: any) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => deletePriceMutation.mutate(row.id)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      ),
    },
  ] as any;

  // Remove loading state to prevent UI refresh indicators

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h3 className="text-base sm:text-lg font-semibold">{t('customers.customPrices')}</h3>
        <TooltipProvider>
          <div className="flex gap-1 self-end">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={downloadTemplate}
                  className="h-8 w-8"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{t('customers.downloadTemplate')}</p>
              </TooltipContent>
            </Tooltip>
            
            <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="icon" className="h-8 w-8">
                      <Upload className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('customers.bulkImportPrices')}</p>
                </TooltipContent>
              </Tooltip>
            <DialogContent className="max-w-2xl bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700">
              <DialogHeader>
                <DialogTitle className="text-gray-900 dark:text-gray-100">{t('customers.bulkImportCustomerPrices')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="csv" className="text-gray-900 dark:text-gray-100">{t('customers.pasteCsvContent')}</Label>
                  <textarea
                    id="csv"
                    className="w-full h-48 p-2 border rounded-md font-mono text-sm bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="productId,variantId,price,currency,validFrom,validTo,isActive,notes&#10;prod-001,,100,CZK,2024-01-01,,true,Special price"
                    value={csvContent}
                    onChange={(e) => setCsvContent(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsBulkDialogOpen(false)}
                  >
                    {t('customers.cancel')}
                  </Button>
                  <Button
                    onClick={handleBulkImport}
                    disabled={!csvContent.trim() || bulkImportMutation.isPending}
                  >
                    {t('customers.import')}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) {
              form.reset();
              setProductSearch("");
              setSelectedProduct("");
              setShowProductDropdown(false);
            }
          }}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DialogTrigger asChild>
                  <Button size="icon" className="h-8 w-8">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('customers.addPrice')}</p>
              </TooltipContent>
            </Tooltip>
            <DialogContent className="bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700">
              <DialogHeader>
                <DialogTitle className="text-gray-900 dark:text-gray-100">{t('customers.addCustomPrice')}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="productId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('customers.product')}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              placeholder={t('customers.typeToSearchProducts')}
                              value={productSearch}
                              onChange={(e) => {
                                setProductSearch(e.target.value);
                                setShowProductDropdown(true);
                              }}
                              onFocus={() => setShowProductDropdown(true)}
                              data-testid="input-productSearch"
                            />
                            {productSearch && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-1 top-1 h-8 w-8 p-0"
                                onClick={() => {
                                  setProductSearch("");
                                  field.onChange("");
                                  setSelectedProduct("");
                                  setShowProductDropdown(false);
                                }}
                                data-testid="button-clearProductSearch"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                            {showProductDropdown && filteredProducts.length > 0 && (
                              <div className="absolute top-full left-0 right-0 mt-1 border rounded-md shadow-lg bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700 max-h-64 overflow-y-auto z-50">
                                {filteredProducts.map((product) => (
                                  <div
                                    key={product.id}
                                    className="p-3 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer border-b dark:border-gray-700 last:border-b-0 transition-colors"
                                    onClick={() => {
                                      field.onChange(product.id);
                                      setSelectedProduct(product.id);
                                      setProductSearch(product.name);
                                      setShowProductDropdown(false);
                                    }}
                                    data-testid={`option-product-${product.id}`}
                                  >
                                    <div className="font-medium">{product.name}</div>
                                    {product.sku && (
                                      <div className="text-xs text-slate-500">SKU: {product.sku}</div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedProduct && variants.length > 0 && (
                    <FormField
                      control={form.control}
                      name="variantId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('customers.variantOptional')}</FormLabel>
                          <Select onValueChange={(value) => field.onChange(value === "NONE" ? null : value)} value={field.value || "NONE"}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('customers.selectVariant')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="NONE">{t('customers.noVariant')}</SelectItem>
                              {variants.map((variant) => (
                                <SelectItem key={variant.id} value={variant.id}>
                                  {variant.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('customers.price')}</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('customers.currency')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="CZK">CZK</SelectItem>
                              <SelectItem value="EUR">EUR</SelectItem>
                              <SelectItem value="USD">USD</SelectItem>
                              <SelectItem value="VND">VND</SelectItem>
                              <SelectItem value="CNY">CNY</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="validFrom"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('customers.validFrom')}</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="validTo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('customers.validToOptional')}</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('customers.notesOptional')}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={t('customers.notesOptional')} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddDialogOpen(false)}
                    >
                      {t('customers.cancel')}
                    </Button>
                    <Button type="submit" disabled={createPriceMutation.isPending}>
                      {t('customers.addPrice')}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          </div>
        </TooltipProvider>
      </div>

      {prices.length === 0 ? (
        <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 mb-4">
                <Tag className="h-8 w-8 text-slate-400 dark:text-slate-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">0</p>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('customers.noCustomPrices')}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('customers.addCustomPricesToOverride')}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-0">
            {/* Mobile Card View */}
            <div className="sm:hidden space-y-3 p-3">
              {prices.map((price: any) => {
                const product = products.find(p => p.id === price.productId);
                const standardPrice = product ? parseFloat(product.priceEur || product.priceCzk || '0') : 0;
                const customPrice = parseFloat(price.price || '0');
                const discount = standardPrice > 0 ? Math.round(((standardPrice - customPrice) / standardPrice) * 100) : 0;
                const isExpired = price.validTo && new Date(price.validTo) < new Date();
                const isActive = price.isActive && !isExpired;

                return (
                  <div key={price.id} className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-4">
                    <div className="space-y-3">
                      {/* Top Row - Product Name and Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {product?.name || t('customers.unknownProduct')}
                          </p>
                          {price.variantId && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {t('customers.variantLabel')} {price.variantId}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge 
                            variant={isActive ? 'default' : 'secondary'}
                            className="text-xs px-2 py-0.5"
                          >
                            {isExpired ? t('customers.expired') : price.isActive ? t('customers.active') : t('customers.inactive')}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700"
                            onClick={() => deletePriceMutation.mutate(price.id)}
                            data-testid={`button-delete-${price.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Middle Row - Price Comparison */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400 text-xs">{t('customers.customPrice')}</p>
                          <p className="font-bold text-lg text-gray-900 dark:text-gray-100">
                            {customPrice.toFixed(2)} {price.currency}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400 text-xs">{t('customers.standardPrice')}</p>
                          <p className="font-medium text-gray-600 dark:text-gray-300">
                            {standardPrice.toFixed(2)} {price.currency}
                          </p>
                          {discount > 0 && (
                            <Badge variant="outline" className="text-xs mt-1 bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700">
                              -{discount}% {t('customers.discount')}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Bottom Row - Valid Dates */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400 text-xs">{t('customers.validFrom')}</p>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {format(new Date(price.validFrom), 'dd/MM/yyyy')}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400 text-xs">{t('customers.validTo')}</p>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {price.validTo ? format(new Date(price.validTo), 'dd/MM/yyyy') : t('customers.noExpiry')}
                          </p>
                        </div>
                      </div>

                      {/* Notes if available */}
                      {price.notes && (
                        <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                          <p className="text-xs text-gray-500 dark:text-gray-400">{t('customers.notes')}</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{price.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <DataTable
                columns={columns}
                data={prices}
                getRowKey={(price) => price.id}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}