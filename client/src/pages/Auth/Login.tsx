import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { LogIn, Shield, Smartphone, ArrowLeft } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";

export default function Login() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [authTab, setAuthTab] = useState<"google" | "sms">("google");
  
  // SMS login state (separate from 2FA)
  const [smsPhoneNumber, setSmsPhoneNumber] = useState("");
  const [smsVerificationCode, setSmsVerificationCode] = useState("");
  const [smsCodeSent, setSmsCodeSent] = useState(false);
  const [isSmsLoading, setIsSmsLoading] = useState(false);
  const [smsResendCountdown, setSmsResendCountdown] = useState(0);
  
  // 2FA state (secondary authentication for Google users)
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    const require2fa = params.get('require_2fa');
    const phone = params.get('phone');
    
    if (error === 'auth_failed') {
      toast({
        title: t('auth.authenticationFailed'),
        description: t('auth.unableToLogin'),
        variant: "destructive",
      });
    }

    if (error === 'auth_not_configured') {
      toast({
        title: t('auth.authNotConfigured'),
        description: t('auth.contactAdminForAuth'),
        variant: "destructive",
      });
    }

    if (require2fa === 'true' && phone) {
      setShow2FA(true);
      setPhoneNumber(phone);
      toast({
        title: t('auth.twoFactorAuthRequired'),
        description: t('auth.verifyIdentityWithCode'),
      });
    }
  }, [toast, t]);

  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  useEffect(() => {
    if (smsResendCountdown > 0) {
      const timer = setTimeout(() => setSmsResendCountdown(smsResendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [smsResendCountdown]);

  const handleGoogleLogin = () => {
    window.location.href = "/api/login";
  };

  const handleSendCode = async () => {
    if (!phoneNumber) {
      toast({
        title: t('error'),
        description: t('auth.phoneNumberRequired'),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/2fa/send-code", { phoneNumber });

      if (response.ok) {
        setIsCodeSent(true);
        setResendCountdown(60);
        toast({
          title: t('auth.codeSent'),
          description: t('auth.verificationCodeSent'),
        });
      } else {
        const data = await response.json();
        toast({
          title: t('error'),
          description: data.message || t('auth.failedToSendCode'),
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: t('error'),
        description: t('auth.failedToSendVerificationCode'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: t('error'),
        description: t('auth.pleaseEnterValid6DigitCode'),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/2fa/verify", { phoneNumber, code: verificationCode });

      if (response.ok) {
        toast({
          title: t('success'),
          description: t('auth.authenticationSuccessful'),
        });
        navigate("/");
      } else {
        const data = await response.json();
        toast({
          title: t('auth.verificationFailed'),
          description: data.message || t('auth.invalidCode'),
          variant: "destructive",
        });
        setVerificationCode("");
      }
    } catch (error) {
      toast({
        title: t('error'),
        description: t('auth.failedToVerifyCode'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // SMS Primary Authentication handlers
  const handleSmsSendCode = async () => {
    if (!smsPhoneNumber) {
      toast({
        title: t('error'),
        description: t('auth.phoneNumberRequired'),
        variant: "destructive",
      });
      return;
    }

    setIsSmsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/auth/sms/start", { phoneNumber: smsPhoneNumber });

      if (response.ok) {
        const data = await response.json();
        setSmsPhoneNumber(data.phoneNumber); // Use normalized phone number
        setSmsCodeSent(true);
        setSmsResendCountdown(60);
        toast({
          title: t('auth.codeSent'),
          description: t('auth.verificationCodeSent'),
        });
      } else {
        const data = await response.json();
        toast({
          title: t('error'),
          description: data.message || t('auth.failedToSendCode'),
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: t('error'),
        description: t('auth.failedToSendVerificationCode'),
        variant: "destructive",
      });
    } finally {
      setIsSmsLoading(false);
    }
  };

  const handleSmsVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!smsVerificationCode || smsVerificationCode.length !== 6) {
      toast({
        title: t('error'),
        description: t('auth.pleaseEnterValid6DigitCode'),
        variant: "destructive",
      });
      return;
    }

    setIsSmsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/auth/sms/verify", { 
        phoneNumber: smsPhoneNumber, 
        code: smsVerificationCode 
      });

      if (response.ok) {
        // Invalidate auth queries to refetch user data
        await queryClient.invalidateQueries({ queryKey: ['/api/user'] });
        
        toast({
          title: t('success'),
          description: t('auth.loginSuccessful'),
        });
        navigate("/");
      } else {
        const data = await response.json();
        toast({
          title: t('auth.verificationFailed'),
          description: data.message || t('auth.invalidCode'),
          variant: "destructive",
        });
        setSmsVerificationCode("");
      }
    } catch (error) {
      toast({
        title: t('error'),
        description: t('auth.failedToVerifyCode'),
        variant: "destructive",
      });
    } finally {
      setIsSmsLoading(false);
    }
  };

  if (show2FA) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950 p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 dark:bg-slate-900/50 backdrop-blur-sm">
          <CardHeader className="space-y-3 pb-6">
            <div className="flex items-center justify-center mb-2">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <Shield className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-center text-gray-900 dark:text-white">
              {t('auth.twoFactorAuth')}
            </CardTitle>
            <CardDescription className="text-center text-base text-gray-600 dark:text-gray-400">
              {t('auth.enterCodeSentTo')}<br />
              <span className="font-semibold text-gray-900 dark:text-white">{phoneNumber}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleVerifyCode} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="code" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('auth.verificationCode')}
                </Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  placeholder={t('auth.codePlaceholder')}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  maxLength={6}
                  className="h-14 text-center text-2xl font-mono tracking-widest dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  data-testid="input-2fa-code"
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                className="w-full h-14 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-lg transition-all"
                disabled={isLoading || verificationCode.length !== 6}
                data-testid="button-verify-2fa"
              >
                {isLoading ? t('auth.verifying') : t('auth.verifyCode')}
              </Button>
            </form>

            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                className="w-full h-14 text-base dark:border-slate-700 dark:hover:bg-slate-800"
                onClick={handleSendCode}
                disabled={isLoading || resendCountdown > 0}
                data-testid="button-resend-code"
              >
                <Smartphone className="mr-2 h-5 w-5" />
                {resendCountdown > 0 ? t('auth.resendCodeIn', { seconds: resendCountdown }) : t('auth.resendCode')}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full h-14 text-base text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                onClick={() => {
                  setShow2FA(false);
                  setIsCodeSent(false);
                  setVerificationCode("");
                }}
                data-testid="button-back-to-login"
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                {t('auth.backToLogin')}
              </Button>
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
          <Tabs value={authTab} onValueChange={(value) => setAuthTab(value as "google" | "sms")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 h-12 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl" data-testid="tabs-auth-method">
              <TabsTrigger 
                value="google" 
                className="text-sm font-medium h-10 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-700 transition-all" 
                data-testid="tab-google-auth"
              >
                <SiGoogle className="mr-2 h-4 w-4" />
                Google
              </TabsTrigger>
              <TabsTrigger 
                value="sms" 
                className="text-sm font-medium h-10 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-700 transition-all" 
                data-testid="tab-sms-auth"
              >
                <Smartphone className="mr-2 h-4 w-4" />
                SMS
              </TabsTrigger>
            </TabsList>

            <TabsContent value="google" className="space-y-6 mt-0">
              <div className="space-y-4">
                <Button
                  type="button"
                  className="w-full h-12 text-base bg-white hover:bg-gray-50 text-gray-800 font-medium shadow-md hover:shadow-lg transition-all border border-gray-200 rounded-xl dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white dark:border-slate-600"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  data-testid="button-google-login"
                >
                  <SiGoogle className="mr-3 h-5 w-5" />
                  {t('auth.continueWithGoogle')}
                </Button>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-4 border border-blue-100 dark:border-blue-900/50">
                <p className="text-sm text-blue-700 dark:text-blue-300 text-center leading-relaxed">
                  {t('auth.googleSignInNote')}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="sms" className="space-y-6 mt-0">
              {!smsCodeSent ? (
                <form onSubmit={(e) => { e.preventDefault(); handleSmsSendCode(); }} className="space-y-5">
                  <div className="space-y-3">
                    <Label htmlFor="sms-phone" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('auth.phoneNumber')}
                    </Label>
                    <Input
                      id="sms-phone"
                      type="tel"
                      placeholder={t('auth.phonePlaceholder')}
                      value={smsPhoneNumber}
                      onChange={(e) => setSmsPhoneNumber(e.target.value)}
                      required
                      className="h-12 text-base rounded-xl dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                      data-testid="input-sms-phone"
                      autoFocus
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t('auth.enterPhoneE164Format')}
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-base bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-md hover:shadow-lg transition-all rounded-xl"
                    disabled={isSmsLoading}
                    data-testid="button-send-sms-code"
                  >
                    <Smartphone className="mr-2 h-5 w-5" />
                    {isSmsLoading ? t('auth.sending') : t('auth.sendCode')}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleSmsVerifyCode} className="space-y-5">
                  <div className="space-y-3">
                    <Label htmlFor="sms-code" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('auth.verificationCode')}
                    </Label>
                    <Input
                      id="sms-code"
                      type="text"
                      inputMode="numeric"
                      placeholder={t('auth.codePlaceholder')}
                      value={smsVerificationCode}
                      onChange={(e) => setSmsVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      required
                      maxLength={6}
                      className="h-14 text-center text-2xl font-mono tracking-widest rounded-xl dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                      data-testid="input-sms-verification-code"
                      autoFocus
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      {t('auth.codeSentTo', { phone: smsPhoneNumber })}
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-base bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-md hover:shadow-lg transition-all rounded-xl"
                    disabled={isSmsLoading || smsVerificationCode.length !== 6}
                    data-testid="button-verify-sms-code"
                  >
                    {isSmsLoading ? t('auth.verifying') : t('auth.verifyAndLogin')}
                  </Button>

                  <div className="space-y-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-11 text-sm rounded-xl dark:border-slate-600 dark:hover:bg-slate-800"
                      onClick={handleSmsSendCode}
                      disabled={isSmsLoading || smsResendCountdown > 0}
                      data-testid="button-resend-sms-code"
                    >
                      <Smartphone className="mr-2 h-4 w-4" />
                      {smsResendCountdown > 0 ? t('auth.resendCodeIn', { seconds: smsResendCountdown }) : t('auth.resendCode')}
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full h-11 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                      onClick={() => {
                        setSmsCodeSent(false);
                        setSmsVerificationCode("");
                      }}
                      data-testid="button-back-to-phone"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      {t('auth.backToPhoneInput')}
                    </Button>
                  </div>
                </form>
              )}
            </TabsContent>
          </Tabs>

          <div className="pt-5 text-center text-xs border-t border-gray-100 dark:border-gray-800">
            <p className="text-gray-500 dark:text-gray-500">
              {t('auth.byContinuingYouAgree')}{" "}
              <a href="#" className="text-blue-600 hover:text-blue-700 hover:underline">
                {t('auth.termsOfService')}
              </a>{" "}
              {t('auth.and')}{" "}
              <a href="#" className="text-blue-600 hover:text-blue-700 hover:underline">
                {t('auth.privacyPolicy')}
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
