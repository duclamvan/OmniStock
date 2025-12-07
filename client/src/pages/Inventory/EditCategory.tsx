import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation, useParams } from 'wouter';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

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
  const { t } = useTranslation('inventory');
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { id } = useParams<{ id: string }>();

  const categorySchema = z.object({
    nameEn: z.string().min(1, t('englishNameRequired')).max(255),
    nameCz: z.string().optional(),
    nameVn: z.string().optional(),
    description: z.string().optional(),
  });

  type CategoryFormData = z.infer<typeof categorySchema>;

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
        title: t('success'),
        description: t('categoryUpdatedSuccess'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      queryClient.invalidateQueries({ queryKey: [`/api/categories/${id}`] });
      navigate('/inventory/categories');
    },
    onError: (error: any) => {
      toast({
        title: t('error'),
        description: error.message || t('categoryUpdateFailed'),
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
    <div className="px-3 sm:px-4 md:px-6 max-w-2xl mx-auto space-y-4 md:space-y-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 sm:gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => window.history.back()}
          className="flex-shrink-0 h-9 w-9"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold">{t('editCategory')}</h1>
          <p className="text-sm sm:text-base text-muted-foreground">{t('updateCategoryInformation')}</p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>{t('categoryInformation')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="nameEn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('categoryNameEn')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t('categoryPlaceholderEn')}
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
                    <FormLabel>{t('categoryNameCz')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t('categoryPlaceholderCz')}
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
                    <FormLabel>{t('categoryNameVn')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t('categoryPlaceholderVn')}
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
                    <FormLabel>{t('description')}</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder={t('descriptionPlaceholder')}
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/inventory/categories')}
                  className="w-full sm:w-auto"
                >
                  {t('cancel')}
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {updateMutation.isPending ? t('updating') : t('updateCategory')}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}