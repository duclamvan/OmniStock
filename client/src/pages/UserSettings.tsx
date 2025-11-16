import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Languages, Moon, Sun, Shield, Calendar, AlertCircle, RefreshCw, Mail } from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { applyThemePreference, getCurrentTheme } from "@/lib/theme-utils";
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
