import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ArrowLeft, Save } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

const categorySchema = z.object({
  nameEn: z.string().min(1, 'English name is required').max(255),
  nameCz: z.string().optional(),
  nameVn: z.string().optional(),
  description: z.string().optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

export default function AddCategory() {
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      nameEn: '',
      nameCz: '',
      nameVn: '',
      description: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      const submitData: any = {
        ...data,
        name: data.nameEn  // Include name for backward compatibility
      };
      const response = await apiRequest('/api/categories', 'POST', submitData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Category created successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      navigate('/inventory/categories');
    },
    onError: (error: any) => {
      console.error('Category creation error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create category',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: CategoryFormData) => {
    createMutation.mutate(data);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/inventory/categories')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Add Category</h1>
          <p className="text-muted-foreground">Create a new product category</p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Category Information</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="nameEn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category Name (EN) *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., Electronics, Clothing, Beauty"
                        data-testid="input-category-name-en"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nameCz"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category Name (CZ)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., Elektronika, Oblečení, Krása"
                        data-testid="input-category-name-cz"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nameVn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category Name (VN)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., Điện tử, Quần áo, Làm đẹp"
                        data-testid="input-category-name-vn"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Optional description of the category"
                        rows={4}
                        data-testid="input-category-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/inventory/categories')}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || !form.formState.isValid}
                  data-testid="button-create-category"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {createMutation.isPending ? 'Creating...' : 'Create Category'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}