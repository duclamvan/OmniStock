import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { ArrowLeft, Save, Sparkles, Loader2 } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function AddCategory() {
  const { t } = useTranslation('inventory');
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isTranslating, setIsTranslating] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

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

  const createMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      const submitData: any = {
        ...data,
        name: data.nameEn
      };
      const response = await apiRequest('POST', '/api/categories', submitData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t('success'),
        description: t('categoryCreatedSuccess'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      navigate('/inventory/categories');
    },
    onError: (error: any) => {
      console.error('Category creation error:', error);
      toast({
        title: t('error'),
        description: error.message || t('categoryCreateFailed'),
        variant: 'destructive',
      });
    },
  });

  const translateCategoryName = async (categoryName: string) => {
    if (!categoryName.trim()) return;

    try {
      setIsTranslating(true);
      const response = await apiRequest('POST', '/api/categories/translate', { categoryName });
      const translations = await response.json();

      if (translations.nameCz) {
        form.setValue('nameCz', translations.nameCz);
      }
      if (translations.nameVn) {
        form.setValue('nameVn', translations.nameVn);
      }
    } catch (error) {
      console.error('Translation error:', error);
    } finally {
      setIsTranslating(false);
    }
  };

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'nameEn' && value.nameEn) {
        if (debounceTimer.current) {
          clearTimeout(debounceTimer.current);
        }

        debounceTimer.current = setTimeout(() => {
          translateCategoryName(value.nameEn as string);
        }, 800);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [form]);

  const onSubmit = (data: CategoryFormData) => {
    createMutation.mutate(data);
  };

  return (
    <div className="px-3 sm:px-4 md:px-6 py-4 md:py-6 max-w-7xl mx-auto overflow-x-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => window.history.back()}
          data-testid="button-back"
          className="flex-shrink-0 h-9 w-9"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold">{t('addCategory')}</h1>
          <p className="text-sm sm:text-base text-muted-foreground">{t('createNewCategoryAI')}</p>
        </div>
      </div>

      {/* Form */}
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t('categoryInformation')}
            {isTranslating && (
              <span className="flex items-center gap-1.5 text-sm font-normal text-blue-600">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t('aiTranslating')}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* English Name - Primary Input */}
              <FormField
                control={form.control}
                name="nameEn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      {t('categoryNameEn')}
                      <Sparkles className="h-4 w-4 text-blue-500" />
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t('categoryPlaceholderEn')}
                        data-testid="input-category-name-en"
                        className="text-base"
                      />
                    </FormControl>
                    <FormDescription>
                      {t('typeInEnglishAutoTranslate')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Translations Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
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
                          data-testid="input-category-name-cz"
                          className="text-base"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        {t('autoFilledByAI')}
                      </FormDescription>
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
                          data-testid="input-category-name-vn"
                          className="text-base"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        {t('autoFilledByAI')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('descriptionOptional')}</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder={t('descriptionPlaceholder')}
                        rows={4}
                        data-testid="input-category-description"
                        className="resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Actions */}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/inventory/categories')}
                  data-testid="button-cancel"
                  className="w-full sm:w-auto"
                >
                  {t('cancel')}
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending}
                  data-testid="button-create-category"
                  className="w-full sm:w-auto"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('creating')}
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {t('createCategory')}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
