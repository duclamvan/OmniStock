import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { LogIn, UserPlus, Loader2, CheckCircle2, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";
import { usePageTitle } from '@/hooks/usePageTitle';
import { Progress } from "@/components/ui/progress";

const loginSchema = z.object({
  username: z.string().min(3, { message: "Username must be at least 3 characters" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const createAdminSchema = z.object({
  setupCode: z.string().min(1, { message: "Setup code is required" }),
  username: z.string().min(3, { message: "Username must be at least 3 characters" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
  confirmPassword: z.string().min(8, { message: "Password must be at least 8 characters" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
}).refine((data) => data.setupCode === "1707", {
  message: "Invalid setup code",
  path: ["setupCode"],
});

type CreateAdminFormValues = z.infer<typeof createAdminSchema>;

export default function Login() {
  const { toast } = useToast();
  const { t } = useTranslation();
  usePageTitle('Login');
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [redirectProgress, setRedirectProgress] = useState(0);
  const [redirectMessage, setRedirectMessage] = useState("");

  const { data: hasUsersData, isLoading: isCheckingUsers } = useQuery<{ hasUsers: boolean }>({
    queryKey: ['/api/auth/has-users'],
  });

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const createAdminForm = useForm<CreateAdminFormValues>({
    resolver: zodResolver(createAdminSchema),
    defaultValues: {
      setupCode: "",
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onLoginSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/auth/login", {
        username: data.username,
        password: data.password,
      });

      if (response.ok) {
        setIsRedirecting(true);
        setRedirectMessage(t('auth.loggingIn'));
        setRedirectProgress(50);
        
        await new Promise(resolve => setTimeout(resolve, 100));
        setRedirectProgress(100);
        
        await new Promise(resolve => setTimeout(resolve, 50));
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

  const onCreateAdminSubmit = async (data: CreateAdminFormValues) => {
    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/auth/register-initial-admin", {
        setupCode: data.setupCode,
        username: data.username,
        password: data.password,
      });

      if (response.ok) {
        setIsRedirecting(true);
        setRedirectMessage(t('auth.creatingWorkspace'));
        setRedirectProgress(30);
        
        await new Promise(resolve => setTimeout(resolve, 150));
        setRedirectMessage(t('auth.settingUpDashboard'));
        setRedirectProgress(60);
        
        await new Promise(resolve => setTimeout(resolve, 150));
        setRedirectMessage(t('auth.almostReady'));
        setRedirectProgress(90);
        
        await new Promise(resolve => setTimeout(resolve, 100));
        setRedirectProgress(100);
        
        await new Promise(resolve => setTimeout(resolve, 50));
        window.location.href = "/";
      } else if (response.status === 403) {
        const errorData = await response.json();
        if (errorData.message === "Invalid setup code") {
          toast({
            title: t('error'),
            description: t('auth.invalidSetupCode'),
            variant: "destructive",
          });
        } else {
          toast({
            title: t('error'),
            description: errorData.message,
            variant: "destructive",
          });
        }
      } else {
        const errorData = await response.json();
        toast({
          title: t('error'),
          description: errorData.message || t('auth.registrationFailed'),
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: t('error'),
        description: t('auth.registrationFailed'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950 p-4">
        <div className="w-full max-w-md text-center space-y-8">
          <div className="relative">
            <div className="h-20 w-20 mx-auto rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-2xl animate-pulse">
              {redirectProgress < 100 ? (
                <Sparkles className="h-10 w-10 text-white" />
              ) : (
                <CheckCircle2 className="h-10 w-10 text-white" />
              )}
            </div>
            <div className="absolute -inset-4 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-600/20 animate-ping" style={{ animationDuration: '2s' }} />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {redirectProgress < 100 ? t('auth.settingUpAccount') : t('auth.welcomeAboard')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 h-6 transition-all duration-300">
              {redirectMessage}
            </p>
          </div>
          
          <div className="space-y-3 px-8">
            <Progress value={redirectProgress} className="h-2 bg-gray-200 dark:bg-gray-700" />
            <p className="text-sm text-gray-500 dark:text-gray-500">
              {redirectProgress}%
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isCheckingUsers) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950 p-4">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>{t('loading')}</span>
        </div>
      </div>
    );
  }

  const showCreateAdmin = hasUsersData?.hasUsers === false;

  if (showCreateAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950 p-4">
        <Card className="w-full max-w-sm shadow-xl border-0 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl">
          <CardHeader className="space-y-4 pb-4 pt-8">
            <div className="flex items-center justify-center">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                <UserPlus className="h-7 w-7 text-white" />
              </div>
            </div>
            <div className="space-y-1.5">
              <CardTitle className="text-2xl font-bold text-center text-gray-900 dark:text-white">
                {t('auth.firstTimeSetup')}
              </CardTitle>
              <CardDescription className="text-center text-sm text-gray-500 dark:text-gray-400">
                {t('auth.setupDescription')}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 px-6 pb-8">
            <Form {...createAdminForm}>
              <form onSubmit={createAdminForm.handleSubmit(onCreateAdminSubmit)} className="space-y-4">
                <FormField
                  control={createAdminForm.control}
                  name="setupCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('auth.setupCode')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('auth.setupCodePlaceholder')}
                          className="h-12 text-base rounded-xl dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                          data-testid="input-setup-code"
                          autoFocus
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createAdminForm.control}
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
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createAdminForm.control}
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

                <FormField
                  control={createAdminForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('auth.confirmPassword')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder={t('auth.confirmPasswordPlaceholder')}
                          className="h-12 text-base rounded-xl dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                          data-testid="input-confirm-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-12 text-base bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium shadow-md hover:shadow-lg transition-all rounded-xl"
                  disabled={isLoading}
                  data-testid="button-create-account"
                >
                  {isLoading ? t('auth.creatingAccount') : t('auth.createAccount')}
                </Button>
              </form>
            </Form>

            <div className="pt-5 text-center text-xs border-t border-gray-100 dark:border-gray-800">
              <p className="text-gray-500 dark:text-gray-500">
                {t('auth.byContinuingYouAgree')}{" "}
                <Link href="/terms-of-service" className="text-emerald-600 hover:text-emerald-700 hover:underline">
                  {t('auth.termsOfService')}
                </Link>{" "}
                {t('auth.and')}{" "}
                <Link href="/privacy-policy" className="text-emerald-600 hover:text-emerald-700 hover:underline">
                  {t('auth.privacyPolicy')}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-5">
              <FormField
                control={loginForm.control}
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
                control={loginForm.control}
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
