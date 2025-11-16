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

// Form Schemas
const personalInfoSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
});

const contactInfoSchema = z.object({
  phoneNumber: z.string()
    .regex(/^\+[1-9]\d{1,14}$/, "Phone number must be in E.164 format (e.g., +420123456789)")
    .optional()
    .or(z.literal('')),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
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
        title: 'Success',
        description: 'Personal information updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update personal information',
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
        title: 'Success',
        description: 'Contact information updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update contact information',
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
        title: 'Success',
        description: 'Profile image updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update profile image',
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
        title: 'Success',
        description: 'Password changed successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to change password',
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
      title: "Theme Updated",
      description: `Switched to ${theme} mode`,
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File Too Large',
          description: 'Please select an image under 5MB',
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
    <div className="space-y-6 max-w-4xl mx-auto p-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <SettingsIcon className="h-6 w-6 md:h-8 md:w-8 text-primary" />
            User Settings
          </h1>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1 md:mt-2">
            Manage your account preferences and personal information
          </p>
        </div>
      </div>

      {/* Profile Picture Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            <CardTitle>Profile Picture</CardTitle>
          </div>
          <CardDescription>
            Upload a profile picture to personalize your account
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
                {updateProfileImageMutation.isPending ? 'Uploading...' : 'Upload Photo'}
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
                Max 5MB. JPG, PNG, GIF
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
            <CardTitle>Personal Information</CardTitle>
          </div>
          <CardDescription>
            Update your personal details
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
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="John" 
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
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Doe" 
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
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input 
                        type="email"
                        placeholder="john.doe@example.com" 
                        {...field} 
                        data-testid="input-email"
                      />
                    </FormControl>
                    <FormDescription>
                      This email will be used for account recovery and notifications
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
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
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
            <CardTitle>Contact Information</CardTitle>
          </div>
          <CardDescription>
            Manage your contact details
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
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input 
                        type="tel"
                        placeholder="+420123456789" 
                        {...field} 
                        data-testid="input-contact-phone"
                      />
                    </FormControl>
                    <FormDescription>
                      Enter your phone number in E.164 format (e.g., +420123456789)
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
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
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
            <CardTitle>Two-Factor Authentication (2FA)</CardTitle>
          </div>
          <CardDescription>
            Add an extra layer of security to your account with SMS verification
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 2FA Status Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="space-y-1 flex-1">
              <Label className="text-base font-medium">
                Status: {user?.twoFactorEnabled ? (
                  <Badge className="ml-2 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Enabled
                  </Badge>
                ) : (
                  <Badge className="ml-2 bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                    Disabled
                  </Badge>
                )}
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
                <Label htmlFor="phone-number-2fa">Phone Number for 2FA</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Enter your phone number in E.164 format (e.g., +420123456789)
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
                        title: 'Invalid Phone Number',
                        description: 'Please enter a valid phone number in E.164 format (e.g., +420123456789)',
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
                      Sending...
                    </>
                  ) : (
                    <>
                      <Smartphone className="mr-2 h-4 w-4" />
                      Send Verification Code
                    </>
                  )}
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                    <Check className="h-4 w-4" />
                    Code sent to {phoneNumber}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="verification-code-2fa">Verification Code</Label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Enter the 6-digit code sent to your phone
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
                      data-testid="button-verify-enable-2fa"
                      className="flex-1 md:flex-initial"
                    >
                      {verifyCodeMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Verify & Enable 2FA
                        </>
                      )}
                    </Button>

                    {resendCountdown > 0 ? (
                      <p className="text-sm text-gray-600 dark:text-gray-400 text-center md:text-left" data-testid="text-resend-countdown">
                        Resend code in {resendCountdown}s
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
                  <strong>Warning:</strong> Disabling 2FA will remove the extra security layer from your account. You can re-enable it at any time.
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

      {/* Password Change - Only for email/password auth */}
      {user.authProvider === 'email' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              <CardTitle>Change Password</CardTitle>
            </div>
            <CardDescription>
              Update your account password
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
                      <FormLabel>Current Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password"
                          placeholder="Enter current password" 
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
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password"
                          placeholder="Enter new password" 
                          {...field} 
                          data-testid="input-new-password"
                        />
                      </FormControl>
                      <FormDescription>
                        Password must be at least 8 characters long
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
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password"
                          placeholder="Confirm new password" 
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
                      Changing Password...
                    </>
                  ) : (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      Change Password
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
            <CardTitle>Language & Display</CardTitle>
          </div>
          <CardDescription>
            Customize your interface preferences
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

          <Separator />

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

      {/* Account Details Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserIcon className="h-5 w-5 text-primary" />
            <CardTitle>Account Details</CardTitle>
          </div>
          <CardDescription>
            Read-only information about your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* User ID */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <UserIcon className="h-4 w-4" />
                User ID
              </div>
              <p className="text-gray-900 dark:text-white font-mono text-sm break-all" data-testid="text-user-id">
                {user.id}
              </p>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Mail className="h-4 w-4" />
                Email Address
              </div>
              <p className="text-gray-900 dark:text-white font-medium break-all" data-testid="text-account-email">
                {user.email || 'N/A'}
              </p>
            </div>

            {/* Role */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Shield className="h-4 w-4" />
                Account Role
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
                Authentication Method
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
                Account Created
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
                Last Updated
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
