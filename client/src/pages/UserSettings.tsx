import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { 
  Languages, 
  Moon, 
  Sun, 
  Shield, 
  Calendar, 
  AlertCircle, 
  RefreshCw, 
  Mail, 
  Smartphone, 
  Check, 
  Loader2,
  User as UserIcon,
  Save,
  Camera,
  Lock,
  Settings as SettingsIcon,
  Key
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useTranslation } from "react-i18next";
import { applyThemePreference, getCurrentTheme } from "@/lib/theme-utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User } from "@shared/schema";

// Form Schemas - validation messages handled in UI
const personalInfoSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
});

const contactInfoSchema = z.object({
  phoneNumber: z.string()
    .regex(/^\+[1-9]\d{1,14}$/)
    .optional()
    .or(z.literal('')),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
  confirmPassword: z.string().min(1),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PersonalInfoFormValues = z.infer<typeof personalInfoSchema>;
type ContactInfoFormValues = z.infer<typeof contactInfoSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

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

  // 2FA State
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Profile Image State
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  // Personal Info Form
  const personalInfoForm = useForm<PersonalInfoFormValues>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
    },
  });

  // Contact Info Form
  const contactInfoForm = useForm<ContactInfoFormValues>({
    resolver: zodResolver(contactInfoSchema),
    defaultValues: {
      phoneNumber: '',
    },
  });

  // Password Form
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Update forms when user data loads
  useEffect(() => {
    if (user) {
      personalInfoForm.reset({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
      });
      contactInfoForm.reset({
        phoneNumber: user.phoneNumber || '',
      });
      if (user.profileImageUrl) {
        setProfileImagePreview(user.profileImageUrl);
      }
    }
  }, [user]);

  // Mutations
  const updatePersonalInfoMutation = useMutation({
    mutationFn: async (data: PersonalInfoFormValues) => {
      const res = await apiRequest('PATCH', '/api/users/me', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/me'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: t('common:success'),
        description: t('settings:personalInformationUpdatedSuccessfully'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message || t('settings:failedToUpdatePersonalInformation'),
        variant: 'destructive',
      });
    },
  });

  const updateContactInfoMutation = useMutation({
    mutationFn: async (data: ContactInfoFormValues) => {
      const res = await apiRequest('PATCH', '/api/users/me', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/me'] });
      toast({
        title: t('common:success'),
        description: t('settings:contactInformationUpdatedSuccessfully'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message || t('settings:failedToUpdateContactInformation'),
        variant: 'destructive',
      });
    },
  });

  const updateProfileImageMutation = useMutation({
    mutationFn: async (imageUrl: string) => {
      const res = await apiRequest('PATCH', '/api/users/me', { profileImageUrl: imageUrl });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/me'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: t('common:success'),
        description: t('settings:profileImageUpdatedSuccessfully'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message || t('settings:failedToUpdateProfileImage'),
        variant: 'destructive',
      });
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (data: PasswordFormValues) => {
      const res = await apiRequest('POST', '/api/users/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      return res.json();
    },
    onSuccess: () => {
      passwordForm.reset();
      toast({
        title: t('common:success'),
        description: t('settings:passwordChangedSuccessfully'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message || t('settings:failedToChangePassword'),
        variant: 'destructive',
      });
    },
  });

  const sendCodeMutation = useMutation({
    mutationFn: async (phone: string) => {
      const res = await apiRequest('POST', '/api/2fa/send-code', { phoneNumber: phone });
      return res.json();
    },
    onSuccess: () => {
      setCodeSent(true);
      setResendCountdown(60);
      toast({
        title: t('settings:codeSent'),
        description: t('settings:verificationCodeSentToYourPhoneNumber'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message || t('settings:failedToSendVerificationCode'),
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
        title: t('settings:verificationFailed'),
        description: error.message || t('settings:invalidVerificationCode'),
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
        title: t('common:success'),
        description: user?.twoFactorEnabled 
          ? t('settings:twoFAHasBeenDisabled')
          : t('settings:twoFAHasBeenEnabledSuccessfully'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message || t('settings:failedToUpdate2FASettings'),
        variant: 'destructive',
      });
    },
  });

  // Handlers
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

  const handleThemeChange = (theme: 'light' | 'dark') => {
    setIsDarkMode(theme === 'dark');
    applyThemePreference(theme);

    toast({
      title: t('settings:themeUpdated'),
      description: t('settings:switchedToThemeMode', { theme }),
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: t('settings:fileTooLarge'),
          description: t('settings:pleaseSelectAnImageUnder5MB'),
          variant: 'destructive',
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const imageUrl = reader.result as string;
        setProfileImagePreview(imageUrl);
        updateProfileImageMutation.mutate(imageUrl);
      };
      reader.readAsDataURL(file);
    }
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

  const getAuthProviderBadgeColor = (provider: string | undefined) => {
    switch (provider) {
      case 'replit':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
      case 'sms':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'email':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const formatAuthProvider = (provider: string | undefined) => {
    if (!provider) return 'N/A';
    return provider.charAt(0).toUpperCase() + provider.slice(1);
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto p-4">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        {[1, 2, 3, 4].map(i => (
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
              <CardTitle>{t('settings:failedToLoadSettings')}</CardTitle>
            </div>
            <CardDescription>
              {t('settings:unableToLoadYourAccountInformation')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              {isError ? t('settings:thereWasAnErrorLoadingYourAccountData') : t('settings:accountDataIsUnavailable')}
            </p>
            <Button onClick={() => refetch()} data-testid="button-retry-user-data">
              <RefreshCw className="mr-2 h-4 w-4" />
              {t('common:retry')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <SettingsIcon className="h-6 w-6 md:h-8 md:w-8 text-primary" />
            {t('settings:userSettings')}
          </h1>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1 md:mt-2">
            {t('settings:manageYourAccountPreferences')}
          </p>
        </div>
      </div>

      {/* Profile Picture Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            <CardTitle>{t('settings:profilePicture')}</CardTitle>
          </div>
          <CardDescription>
            {t('settings:uploadProfilePictureToPersonalize')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-6">
            <div className="relative">
              {profileImagePreview || user.profileImageUrl ? (
                <img 
                  src={profileImagePreview || user.profileImageUrl || ''} 
                  alt="Profile" 
                  className="h-20 w-20 md:h-24 md:w-24 rounded-full object-cover border-4 border-gray-200 dark:border-gray-700"
                  data-testid="img-profile-preview"
                />
              ) : (
                <div className="h-20 w-20 md:h-24 md:w-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-4 border-gray-200 dark:border-gray-700">
                  <UserIcon className="h-10 w-10 md:h-12 md:w-12 text-primary" />
                </div>
              )}
            </div>
            <div className="space-y-3">
              <Label 
                htmlFor="profile-image" 
                className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 md:h-10 px-3 md:px-4 py-2"
                data-testid="label-upload-image"
              >
                <Camera className="h-4 w-4 mr-2" />
                {updateProfileImageMutation.isPending ? t('settings:uploading') : t('settings:uploadPhoto')}
              </Label>
              <Input
                id="profile-image"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
                disabled={updateProfileImageMutation.isPending}
                data-testid="input-profile-image"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('settings:maxFileSize')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserIcon className="h-5 w-5 text-primary" />
            <CardTitle>{t('common:personalInformation')}</CardTitle>
          </div>
          <CardDescription>
            {t('common:updateYourPersonalDetails')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...personalInfoForm}>
            <form onSubmit={personalInfoForm.handleSubmit((data) => updatePersonalInfoMutation.mutate(data))} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={personalInfoForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('common:firstName')}</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder={t('common:firstName')} 
                          {...field} 
                          data-testid="input-first-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={personalInfoForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('common:lastName')}</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder={t('common:lastName')} 
                          {...field} 
                          data-testid="input-last-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={personalInfoForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('common:emailAddress')}</FormLabel>
                    <FormControl>
                      <Input 
                        type="email"
                        placeholder="john.doe@example.com" 
                        {...field} 
                        data-testid="input-email"
                      />
                    </FormControl>
                    <FormDescription>
                      {t('settings:thisEmailWillBeUsedForAccountRecovery')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                disabled={updatePersonalInfoMutation.isPending || !personalInfoForm.formState.isDirty}
                data-testid="button-save-personal-info"
                className="w-full md:w-auto"
              >
                {updatePersonalInfoMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('common:saving')}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {t('common:saveChanges')}
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Contact Information Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            <CardTitle>{t('settings:contactInformation')}</CardTitle>
          </div>
          <CardDescription>
            {t('settings:manageYourContactDetails')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...contactInfoForm}>
            <form onSubmit={contactInfoForm.handleSubmit((data) => updateContactInfoMutation.mutate(data))} className="space-y-6">
              <FormField
                control={contactInfoForm.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('settings:phoneNumber')}</FormLabel>
                    <FormControl>
                      <Input 
                        type="tel"
                        placeholder="+420123456789" 
                        {...field} 
                        data-testid="input-contact-phone"
                      />
                    </FormControl>
                    <FormDescription>
                      {t('settings:enterYourPhoneNumberInE164Format')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                disabled={updateContactInfoMutation.isPending || !contactInfoForm.formState.isDirty}
                data-testid="button-save-contact-info"
                className="w-full md:w-auto"
              >
                {updateContactInfoMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('common:saving')}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {t('common:saveChanges')}
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>{t('settings:twoFactorAuthentication')}</CardTitle>
          </div>
          <CardDescription>
            {t('settings:addExtraLayerOfSecurityWithSMS')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 2FA Status Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="space-y-1 flex-1">
              <Label className="text-base font-medium">
                {t('settings:status')}: {user?.twoFactorEnabled ? (
                  <Badge className="ml-2 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    {t('settings:enabled')}
                  </Badge>
                ) : (
                  <Badge className="ml-2 bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                    {t('settings:disabled')}
                  </Badge>
                )}
              </Label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {user?.twoFactorEnabled 
                  ? t('settings:activeOnPhone', { phone: user.phoneNumber || t('settings:yourPhone') })
                  : t('settings:enable2FAToSecureYourAccount')}
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
                <Label htmlFor="phone-number-2fa">{t('settings:phoneNumberFor2FA')}</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('settings:enterYourPhoneNumberInE164Format')}
                </p>
                <Input
                  id="phone-number-2fa"
                  type="tel"
                  placeholder="+420123456789"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={codeSent || sendCodeMutation.isPending}
                  data-testid="input-phone-number-2fa"
                />
              </div>

              {!codeSent ? (
                <Button
                  onClick={() => {
                    if (!phoneNumber || !phoneNumber.startsWith('+')) {
                      toast({
                        title: t('settings:invalidPhoneNumber'),
                        description: t('settings:pleaseEnterValidPhoneNumberInE164'),
                        variant: 'destructive',
                      });
                      return;
                    }
                    sendCodeMutation.mutate(phoneNumber);
                  }}
                  disabled={!phoneNumber || sendCodeMutation.isPending}
                  data-testid="button-send-code-2fa"
                  className="w-full md:w-auto"
                >
                  {sendCodeMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('settings:sending')}
                    </>
                  ) : (
                    <>
                      <Smartphone className="mr-2 h-4 w-4" />
                      {t('settings:sendVerificationCode')}
                    </>
                  )}
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                    <Check className="h-4 w-4" />
                    {t('settings:codeSentToPhone', { phone: phoneNumber })}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="verification-code-2fa">{t('settings:verificationCode')}</Label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t('settings:enterThe6DigitCodeSentToYourPhone')}
                    </p>
                    <Input
                      id="verification-code-2fa"
                      type="text"
                      placeholder="123456"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                      disabled={verifyCodeMutation.isPending}
                      data-testid="input-verification-code-2fa"
                    />
                  </div>

                  <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                    <Button
                      onClick={() => {
                        if (verificationCode.length !== 6) {
                          toast({
                            title: t('settings:invalidCode'),
                            description: t('settings:pleaseEnterA6DigitVerificationCode'),
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
                      data-testid="button-verify-enable-2fa"
                      className="flex-1 md:flex-initial"
                    >
                      {verifyCodeMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('settings:verifying')}
                        </>
                      ) : (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          {t('settings:verifyAndEnable2FA')}
                        </>
                      )}
                    </Button>

                    {resendCountdown > 0 ? (
                      <p className="text-sm text-gray-600 dark:text-gray-400 text-center md:text-left" data-testid="text-resend-countdown">
                        {t('settings:resendCodeIn', { seconds: resendCountdown })}
                      </p>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => sendCodeMutation.mutate(phoneNumber)}
                        disabled={sendCodeMutation.isPending}
                        data-testid="button-resend-code-2fa"
                        className="flex-1 md:flex-initial"
                      >
                        {sendCodeMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t('settings:sending')}
                          </>
                        ) : (
                          t('settings:resendCode')
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
                  <strong>{t('settings:warning')}:</strong> {t('settings:disabling2FAWarning')}
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => setupTwoFactorMutation.mutate({ phoneNumber: null, enabled: false })}
                disabled={setupTwoFactorMutation.isPending}
                data-testid="button-disable-2fa"
                className="w-full md:w-auto"
              >
                {setupTwoFactorMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('settings:disabling')}
                  </>
                ) : (
                  t('settings:disable2FA')
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Password Change - Only for email/password auth */}
      {user.authProvider === 'email' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              <CardTitle>{t('settings:changePassword')}</CardTitle>
            </div>
            <CardDescription>
              {t('settings:updateYourAccountPassword')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit((data) => updatePasswordMutation.mutate(data))} className="space-y-6">
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('settings:currentPassword')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="password"
                          placeholder={t('settings:enterCurrentPassword')} 
                          {...field} 
                          data-testid="input-current-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('settings:newPassword')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="password"
                          placeholder={t('settings:enterNewPassword')} 
                          {...field} 
                          data-testid="input-new-password"
                        />
                      </FormControl>
                      <FormDescription>
                        {t('settings:passwordMustBeAtLeast8Characters')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('settings:confirmNewPassword')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="password"
                          placeholder={t('settings:confirmNewPassword')} 
                          {...field} 
                          data-testid="input-confirm-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  disabled={updatePasswordMutation.isPending}
                  data-testid="button-change-password"
                  className="w-full md:w-auto"
                >
                  {updatePasswordMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('settings:changingPassword')}
                    </>
                  ) : (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      {t('settings:changePassword')}
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Language & Theme Preferences Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Languages className="h-5 w-5 text-primary" />
            <CardTitle>{t('settings:languageAndDisplay')}</CardTitle>
          </div>
          <CardDescription>
            {t('settings:customizeYourInterfacePreferences')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Language Selector */}
          <div className="space-y-3">
            <Label className="text-base font-medium">{t('settings:language')}</Label>
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

          <Separator />

          {/* Theme Selector */}
          <div className="space-y-3">
            <Label className="text-base font-medium">{t('settings:theme')}</Label>
            <RadioGroup 
              value={isDarkMode ? 'dark' : 'light'} 
              onValueChange={(value) => handleThemeChange(value as 'light' | 'dark')}
              className="flex flex-col gap-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="light" id="theme-light" data-testid="radio-theme-light" />
                <Label htmlFor="theme-light" className="font-normal cursor-pointer flex items-center gap-2">
                  <Sun className="h-4 w-4" />
                  {t('settings:lightMode')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="dark" id="theme-dark" data-testid="radio-theme-dark" />
                <Label htmlFor="theme-dark" className="font-normal cursor-pointer flex items-center gap-2">
                  <Moon className="h-4 w-4" />
                  {t('settings:darkMode')}
                </Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* Account Details Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserIcon className="h-5 w-5 text-primary" />
            <CardTitle>{t('common:accountDetails')}</CardTitle>
          </div>
          <CardDescription>
            {t('settings:readOnlyInformationAboutYourAccount')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* User ID */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <UserIcon className="h-4 w-4" />
                {t('common:userId')}
              </div>
              <p className="text-gray-900 dark:text-white font-mono text-sm break-all" data-testid="text-user-id">
                {user.id}
              </p>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Mail className="h-4 w-4" />
                {t('common:emailAddress')}
              </div>
              <p className="text-gray-900 dark:text-white font-medium break-all" data-testid="text-account-email">
                {user.email || 'N/A'}
              </p>
            </div>

            {/* Role */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Shield className="h-4 w-4" />
                {t('common:accountRole')}
              </div>
              <Badge 
                className={getRoleBadgeColor(user.role)} 
                data-testid="badge-account-role"
              >
                {formatRole(user.role)}
              </Badge>
            </div>

            {/* Auth Provider */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Key className="h-4 w-4" />
                {t('settings:authenticationMethod')}
              </div>
              <Badge 
                className={getAuthProviderBadgeColor(user.authProvider)} 
                data-testid="badge-auth-provider"
              >
                {formatAuthProvider(user.authProvider)}
              </Badge>
            </div>

            {/* Account Created */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Calendar className="h-4 w-4" />
                {t('common:accountCreated')}
              </div>
              <p className="text-gray-900 dark:text-white" data-testid="text-account-created">
                {user.createdAt && !isNaN(new Date(user.createdAt).getTime()) 
                  ? format(new Date(user.createdAt), 'PPP') 
                  : 'N/A'}
              </p>
              {user.createdAt && !isNaN(new Date(user.createdAt).getTime()) && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                </p>
              )}
            </div>

            {/* Last Updated */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <RefreshCw className="h-4 w-4" />
                {t('settings:lastUpdated')}
              </div>
              <p className="text-gray-900 dark:text-white" data-testid="text-account-updated">
                {user.updatedAt && !isNaN(new Date(user.updatedAt).getTime())
                  ? format(new Date(user.updatedAt), 'PPP') 
                  : 'N/A'}
              </p>
              {user.updatedAt && !isNaN(new Date(user.updatedAt).getTime()) && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDistanceToNow(new Date(user.updatedAt), { addSuffix: true })}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
