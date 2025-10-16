import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
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
  const [isTranslating, setIsTranslating] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

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

  const translateCategoryName = async (categoryName: string) => {
    if (!categoryName.trim()) return;

    try {
      setIsTranslating(true);
      const response = await apiRequest('/api/categories/translate', 'POST', { categoryName });
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
    <div className="px-mobile py-mobile max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/inventory/categories')}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Add Category</h1>
          <p className="text-muted-foreground">Create a new product category with AI-powered translation</p>
        </div>
      </div>

      {/* Form */}
      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Category Information
            {isTranslating && (
              <span className="flex items-center gap-1.5 text-sm font-normal text-blue-600">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                AI translating...
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
                      Category Name (EN) *
                      <Sparkles className="h-4 w-4 text-blue-500" />
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., Electronics, Clothing, Beauty"
                        data-testid="input-category-name-en"
                        className="text-base"
                      />
                    </FormControl>
                    <FormDescription>
                      Type in English and AI will auto-translate to Czech and Vietnamese
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Translations Grid */}
              <div className="grid md:grid-cols-2 gap-6">
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
                          className="text-base"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Auto-filled by AI, editable
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
                      <FormLabel>Category Name (VN)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., Điện tử, Quần áo, Làm đẹp"
                          data-testid="input-category-name-vn"
                          className="text-base"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Auto-filled by AI, editable
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
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Optional description of the category"
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
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/inventory/categories')}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending}
                  data-testid="button-create-category"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Create Category
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
