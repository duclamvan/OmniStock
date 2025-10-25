import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation, useParams } from 'wouter';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

const categorySchema = z.object({
  nameEn: z.string().min(1, 'English name is required').max(255),
  nameCz: z.string().optional(),
  nameVn: z.string().optional(),
  description: z.string().optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface Category {
  id: string;
  name: string;
  name_en?: string;
  name_cz?: string;
  name_vn?: string;
  description?: string;
  createdAt: string;
}

export default function EditCategory() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { id } = useParams<{ id: string }>();

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      nameEn: '',
      nameCz: '',
      nameVn: '',
      description: '',
    },
  });

  // Fetch category data
  const { data: category, isLoading } = useQuery<Category>({
    queryKey: [`/api/categories/${id}`],
    enabled: !!id,
  });

  // Update form when category data is loaded
  useEffect(() => {
    if (category) {
      form.reset({
        nameEn: category.name_en || category.name || '',
        nameCz: category.name_cz || '',
        nameVn: category.name_vn || '',
        description: category.description || '',
      });
    }
  }, [category, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      // Include name for backward compatibility
      const submitData: any = {
        ...data,
        name: data.nameEn
      };
      const response = await apiRequest('PATCH', `/api/categories/${id}`, submitData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Category updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      queryClient.invalidateQueries({ queryKey: [`/api/categories/${id}`] });
      navigate('/inventory/categories');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update category',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: CategoryFormData) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => window.history.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Edit Category</h1>
          <p className="text-muted-foreground">Update category information</p>
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
                  disabled={updateMutation.isPending}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {updateMutation.isPending ? 'Updating...' : 'Update Category'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}