import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { LogIn } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";

const loginSchema = z.object({
  username: z.string().min(3, { message: "Username must be at least 3 characters" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/auth/login", {
        username: data.username,
        password: data.password,
      });

      if (response.ok) {
        toast({
          title: t('success'),
          description: t('auth.loginSuccessful'),
        });
        window.location.href = "/";
      } else if (response.status === 429) {
        toast({
          title: t('error'),
          description: t('auth.tooManyLoginAttempts'),
          variant: "destructive",
        });
      } else if (response.status === 401) {
        const errorData = await response.json();
        toast({
          title: t('auth.authenticationFailed'),
          description: errorData.message || t('auth.invalidCredentials'),
          variant: "destructive",
        });
      } else {
        const errorData = await response.json();
        toast({
          title: t('error'),
          description: errorData.message || t('auth.unableToLogin'),
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: t('error'),
        description: t('auth.unableToLogin'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950 p-4">
      <Card className="w-full max-w-sm shadow-xl border-0 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl">
        <CardHeader className="space-y-4 pb-4 pt-8">
          <div className="flex items-center justify-center">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <LogIn className="h-7 w-7 text-white" />
            </div>
          </div>
          <div className="space-y-1.5">
            <CardTitle className="text-2xl font-bold text-center text-gray-900 dark:text-white">
              {t('auth.welcomeBack')}
            </CardTitle>
            <CardDescription className="text-center text-sm text-gray-500 dark:text-gray-400">
              {t('auth.signInToDavieSupply')}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 px-6 pb-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('auth.username')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('auth.usernamePlaceholder')}
                        className="h-12 text-base rounded-xl dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                        data-testid="input-username"
                        autoFocus
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('auth.password')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={t('auth.passwordPlaceholder')}
                        className="h-12 text-base rounded-xl dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                        data-testid="input-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-12 text-base bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-md hover:shadow-lg transition-all rounded-xl"
                disabled={isLoading}
                data-testid="button-sign-in"
              >
                {isLoading ? t('auth.loggingIn') : t('auth.signIn')}
              </Button>
            </form>
          </Form>

          <div className="pt-5 text-center text-xs border-t border-gray-100 dark:border-gray-800">
            <p className="text-gray-500 dark:text-gray-500">
              {t('auth.byContinuingYouAgree')}{" "}
              <Link href="/terms-of-service" className="text-blue-600 hover:text-blue-700 hover:underline">
                {t('auth.termsOfService')}
              </Link>{" "}
              {t('auth.and')}{" "}
              <Link href="/privacy-policy" className="text-blue-600 hover:text-blue-700 hover:underline">
                {t('auth.privacyPolicy')}
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
