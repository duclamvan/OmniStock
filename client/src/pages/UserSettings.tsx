import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Languages, Moon, Sun, Shield, Calendar, AlertCircle, RefreshCw, Mail, Smartphone, Check, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { applyThemePreference, getCurrentTheme } from "@/lib/theme-utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User } from "@shared/schema";

export default function UserSettings() {
  const { toast } = useToast();
  const { i18n, t } = useTranslation();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return getCurrentTheme() === 'dark';
    }
    return false;
  });

  const { data: user, isLoading, isError, refetch } = useQuery<User>({
    queryKey: ['/api/users/me'],
    refetchOnMount: true,
  });

  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  const sendCodeMutation = useMutation({
    mutationFn: async (phone: string) => {
      const res = await apiRequest('POST', '/api/2fa/send-code', { phoneNumber: phone });
      return res.json();
    },
    onSuccess: () => {
      setCodeSent(true);
      setResendCountdown(60);
      toast({
        title: 'Code Sent',
        description: 'Verification code sent to your phone number',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send verification code',
        variant: 'destructive',
      });
    },
  });

  const verifyCodeMutation = useMutation({
    mutationFn: async ({ phone, code }: { phone: string; code: string }) => {
      const res = await apiRequest('POST', '/api/2fa/verify', { 
        phoneNumber: phone, 
        code 
      });
      return res.json();
    },
    onSuccess: async () => {
      await setupTwoFactorMutation.mutateAsync({ 
        phoneNumber, 
        enabled: true 
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Verification Failed',
        description: error.message || 'Invalid verification code',
        variant: 'destructive',
      });
    },
  });

  const setupTwoFactorMutation = useMutation({
    mutationFn: async ({ phoneNumber, enabled }: { phoneNumber: string | null; enabled: boolean }) => {
      const res = await apiRequest('POST', '/api/2fa/setup', { 
        phoneNumber, 
        enabled 
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/me'] });
      refetch();
      setCodeSent(false);
      setVerificationCode('');
      setPhoneNumber('');
      toast({
        title: 'Success',
        description: user?.twoFactorEnabled 
          ? '2FA has been disabled' 
          : '2FA has been enabled successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update 2FA settings',
        variant: 'destructive',
      });
    },
  });

  // Language change handler - i18n handles persistence automatically via localStorage
  const handleLanguageChange = async (newLang: 'en' | 'vi') => {
    try {
      await i18n.changeLanguage(newLang);
      toast({
        title: t('common:success'),
        description: t('common:languageChanged'),
      });
    } catch (error) {
      toast({
        title: t('common:error'),
        description: t('common:languageChangeFailed'),
        variant: 'destructive',
      });
    }
  };

  // Theme toggle handler - uses shared theme utility
  const handleThemeChange = (theme: 'light' | 'dark') => {
    setIsDarkMode(theme === 'dark');
    applyThemePreference(theme);

    toast({
      title: "Theme Updated",
      description: `Switched to ${theme} mode`,
    });
  };

  const getRoleBadgeColor = (role: string | undefined) => {
    switch (role) {
      case 'administrator':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'warehouse_operator':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const formatRole = (role: string | undefined) => {
    if (!role) return 'N/A';
    return role
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto p-4">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        {[1, 2].map(i => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full max-w-md mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Error state
  if (isError || !user) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto p-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle>Failed to Load Settings</CardTitle>
            </div>
            <CardDescription>
              Unable to load your account information. Please try again.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              {isError ? "There was an error loading your account data." : "Account data is unavailable."}
            </p>
            <Button onClick={() => refetch()} data-testid="button-retry-user-data">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage your preferences and account information
        </p>
      </div>

      {/* Preferences Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Languages className="h-5 w-5 text-primary" />
            <CardTitle>Preferences</CardTitle>
          </div>
          <CardDescription>
            Customize your experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Language Selector */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Language</Label>
            <RadioGroup 
              value={i18n.language} 
              onValueChange={(value) => handleLanguageChange(value as 'en' | 'vi')}
              className="flex flex-col gap-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="en" id="lang-en" data-testid="radio-language-en" />
                <Label htmlFor="lang-en" className="font-normal cursor-pointer">
                  English
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="vi" id="lang-vi" data-testid="radio-language-vi" />
                <Label htmlFor="lang-vi" className="font-normal cursor-pointer">
                  Tiếng Việt
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Theme Selector */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Theme</Label>
            <RadioGroup 
              value={isDarkMode ? 'dark' : 'light'} 
              onValueChange={(value) => handleThemeChange(value as 'light' | 'dark')}
              className="flex flex-col gap-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="light" id="theme-light" data-testid="radio-theme-light" />
                <Label htmlFor="theme-light" className="font-normal cursor-pointer flex items-center gap-2">
                  <Sun className="h-4 w-4" />
                  Light Mode
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="dark" id="theme-dark" data-testid="radio-theme-dark" />
                <Label htmlFor="theme-dark" className="font-normal cursor-pointer flex items-center gap-2">
                  <Moon className="h-4 w-4" />
                  Dark Mode
                </Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Two-Factor Authentication (SMS)</CardTitle>
          </div>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 2FA Status Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">
                {user?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
              </Label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {user?.twoFactorEnabled 
                  ? `Active on ${user.phoneNumber || 'your phone'}` 
                  : 'Enable 2FA to secure your account with SMS verification'}
              </p>
            </div>
            <Switch
              checked={user?.twoFactorEnabled || false}
              onCheckedChange={(checked) => {
                if (!checked && user?.twoFactorEnabled) {
                  setupTwoFactorMutation.mutate({ phoneNumber: null, enabled: false });
                }
              }}
              disabled={setupTwoFactorMutation.isPending}
              data-testid="switch-2fa-toggle"
            />
          </div>

          {/* Enable 2FA Flow */}
          {!user?.twoFactorEnabled && (
            <div className="space-y-4 pt-4 border-t dark:border-gray-700">
              <div className="space-y-2">
                <Label htmlFor="phone-number">Phone Number</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Enter your phone number in E.164 format (e.g., +420123456789)
                </p>
                <Input
                  id="phone-number"
                  type="tel"
                  placeholder="+420123456789"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={codeSent || sendCodeMutation.isPending}
                  data-testid="input-phone-number"
                  className="max-w-md"
                />
              </div>

              {!codeSent ? (
                <Button
                  onClick={() => {
                    if (!phoneNumber || !phoneNumber.startsWith('+')) {
                      toast({
                        title: 'Invalid Phone Number',
                        description: 'Please enter a valid phone number in E.164 format (e.g., +420123456789)',
                        variant: 'destructive',
                      });
                      return;
                    }
                    sendCodeMutation.mutate(phoneNumber);
                  }}
                  disabled={!phoneNumber || sendCodeMutation.isPending}
                  data-testid="button-send-code"
                >
                  {sendCodeMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Smartphone className="mr-2 h-4 w-4" />
                      Send Code
                    </>
                  )}
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <Check className="h-4 w-4" />
                    Code sent to {phoneNumber}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="verification-code">Verification Code</Label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Enter the 6-digit code sent to your phone
                    </p>
                    <Input
                      id="verification-code"
                      type="text"
                      placeholder="123456"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                      disabled={verifyCodeMutation.isPending}
                      data-testid="input-verification-code"
                      className="max-w-md"
                    />
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <Button
                      onClick={() => {
                        if (verificationCode.length !== 6) {
                          toast({
                            title: 'Invalid Code',
                            description: 'Please enter a 6-digit verification code',
                            variant: 'destructive',
                          });
                          return;
                        }
                        verifyCodeMutation.mutate({ 
                          phone: phoneNumber, 
                          code: verificationCode 
                        });
                      }}
                      disabled={verificationCode.length !== 6 || verifyCodeMutation.isPending}
                      data-testid="button-verify-enable"
                    >
                      {verifyCodeMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Verify & Enable
                        </>
                      )}
                    </Button>

                    {resendCountdown > 0 ? (
                      <p className="text-sm text-gray-600 dark:text-gray-400" data-testid="text-resend-countdown">
                        Resend code in {resendCountdown}s
                      </p>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => sendCodeMutation.mutate(phoneNumber)}
                        disabled={sendCodeMutation.isPending}
                        data-testid="button-resend-code"
                      >
                        {sendCodeMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          'Resend Code'
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Disable 2FA Flow */}
          {user?.twoFactorEnabled && (
            <div className="space-y-4 pt-4 border-t dark:border-gray-700">
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm text-amber-900 dark:text-amber-200">
                  Disabling 2FA will remove the extra security layer from your account. You can re-enable it at any time.
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => setupTwoFactorMutation.mutate({ phoneNumber: null, enabled: false })}
                disabled={setupTwoFactorMutation.isPending}
                data-testid="button-disable-2fa"
              >
                {setupTwoFactorMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Disabling...
                  </>
                ) : (
                  'Disable 2FA'
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Information Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Account Information</CardTitle>
          </div>
          <CardDescription>
            Read-only information about your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Email */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Mail className="h-4 w-4" />
                Email Address
              </div>
              <p className="text-gray-900 dark:text-white font-medium" data-testid="text-email">
                {user.email}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                To change your email, visit the <a href="/profile" className="text-primary hover:underline">Profile page</a>
              </p>
            </div>

            {/* Role */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Shield className="h-4 w-4" />
                Role
              </div>
              <Badge 
                className={getRoleBadgeColor(user.role)} 
                data-testid="badge-role"
              >
                {formatRole(user.role)}
              </Badge>
            </div>

            {/* Account Created */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Calendar className="h-4 w-4" />
                Account Created
              </div>
              <p className="text-gray-900 dark:text-white" data-testid="text-created-date">
                {user.createdAt ? format(new Date(user.createdAt), 'PPP') : 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
