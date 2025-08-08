import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
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
import { Trash2, Plus, Upload, Edit, FileSpreadsheet } from 'lucide-react';
import type { CustomerPrice, Product, ProductVariant } from '@shared/schema';

const createCustomerPriceSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  variantId: z.string().optional(),
  price: z.coerce.number().positive('Price must be positive'),
  currency: z.enum(['CZK', 'EUR', 'USD', 'VND', 'CNY']),
  validFrom: z.string().min(1, 'Valid from date is required'),
  validTo: z.string().optional(),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
});

type CreateCustomerPriceInput = z.infer<typeof createCustomerPriceSchema>;

interface CustomerPricesProps {
  customerId: string;
}

export function CustomerPrices({ customerId }: CustomerPricesProps) {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<string>('');

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

  const form = useForm<CreateCustomerPriceInput>({
    resolver: zodResolver(createCustomerPriceSchema),
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
      toast({
        title: 'Success',
        description: 'Customer price created successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to create customer price',
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
        title: 'Success',
        description: 'Customer price deleted successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete customer price',
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
        title: 'Success',
        description: 'Prices imported successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to import prices',
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
        title: 'Error',
        description: 'Invalid CSV format',
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
      header: 'Product',
      accessorKey: 'productId',
      cell: ({ row }: any) => {
        const product = products.find(p => p.id === row.original.productId);
        return product?.name || row.original.productId;
      },
    },
    {
      key: 'variantId',
      header: 'Variant',
      accessorKey: 'variantId',
      cell: ({ row }: any) => {
        if (!row.original.variantId) return '-';
        // Would need to fetch variant details here
        return row.original.variantId;
      },
    },
    {
      key: 'price',
      header: 'Price',
      accessorKey: 'price',
      cell: ({ row }: any) => (
        <div className="font-medium">
          {row.original.price} {row.original.currency}
        </div>
      ),
    },
    {
      key: 'validFrom',
      header: 'Valid From',
      accessorKey: 'validFrom',
      cell: ({ row }: any) => format(new Date(row.original.validFrom), 'dd/MM/yyyy'),
    },
    {
      key: 'validTo',
      header: 'Valid To',
      accessorKey: 'validTo',
      cell: ({ row }: any) => 
        row.original.validTo ? format(new Date(row.original.validTo), 'dd/MM/yyyy') : 'No expiry',
    },
    {
      key: 'isActive',
      header: 'Status',
      accessorKey: 'isActive',
      cell: ({ row }: any) => (
        <Badge variant={row.original.isActive ? 'default' : 'secondary'}>
          {row.original.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      id: 'actions',
      cell: ({ row }: any) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => deletePriceMutation.mutate(row.original.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ] as any;

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Custom Prices</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={downloadTemplate}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Download Template
          </Button>
          
          <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Bulk Import
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Bulk Import Customer Prices</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="csv">Paste CSV Content</Label>
                  <textarea
                    id="csv"
                    className="w-full h-48 p-2 border rounded-md font-mono text-sm"
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
                    Cancel
                  </Button>
                  <Button
                    onClick={handleBulkImport}
                    disabled={!csvContent.trim() || bulkImportMutation.isPending}
                  >
                    Import
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Price
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Custom Price</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="productId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            setSelectedProduct(value);
                          }} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a product" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                          <FormLabel>Variant (Optional)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a variant" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">No variant</SelectItem>
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
                          <FormLabel>Price</FormLabel>
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
                          <FormLabel>Currency</FormLabel>
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
                          <FormLabel>Valid From</FormLabel>
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
                          <FormLabel>Valid To (Optional)</FormLabel>
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
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Special discount for bulk purchase" />
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
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createPriceMutation.isPending}>
                      Add Price
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={prices}
            getRowKey={(price) => price.id}
            searchKey="productId"
            searchPlaceholder="Search products..."
          />
        </CardContent>
      </Card>

      {prices.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No custom prices set for this customer. Add custom prices to override default product pricing.
        </div>
      )}
    </div>
  );
}