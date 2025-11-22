import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { LogIn, Shield, Smartphone, ArrowLeft } from "lucide-react";
import { SiReplit, SiGoogle, SiGithub, SiX, SiApple } from "react-icons/si";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";

export default function Login() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [authTab, setAuthTab] = useState<"replit" | "sms">("replit");
  
  // SMS login state (separate from 2FA)
  const [smsPhoneNumber, setSmsPhoneNumber] = useState("");
  const [smsVerificationCode, setSmsVerificationCode] = useState("");
  const [smsCodeSent, setSmsCodeSent] = useState(false);
  const [isSmsLoading, setIsSmsLoading] = useState(false);
  const [smsResendCountdown, setSmsResendCountdown] = useState(0);
  
  // 2FA state (secondary authentication for Replit users)
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

    if (require2fa === 'true' && phone) {
      setShow2FA(true);
      setPhoneNumber(phone);
      toast({
        title: t('auth.twoFactorAuthRequired'),
        description: t('auth.verifyIdentityWithCode'),
      });
    }
  }, [toast]);

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

  const handleReplitLogin = () => {
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
                  className="h-12 text-center text-2xl font-mono tracking-widest dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  data-testid="input-2fa-code"
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-lg transition-all"
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
                className="w-full h-11 dark:border-slate-700 dark:hover:bg-slate-800"
                onClick={handleSendCode}
                disabled={isLoading || resendCountdown > 0}
                data-testid="button-resend-code"
              >
                <Smartphone className="mr-2 h-4 w-4" />
                {resendCountdown > 0 ? t('auth.resendCodeIn', { seconds: resendCountdown }) : t('auth.resendCode')}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full h-11 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                onClick={() => {
                  setShow2FA(false);
                  setIsCodeSent(false);
                  setVerificationCode("");
                }}
                data-testid="button-back-to-login"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
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
      <Card className="w-full max-w-md shadow-2xl border-0 dark:bg-slate-900/50 backdrop-blur-sm">
        <CardHeader className="space-y-3 pb-6">
          <div className="flex items-center justify-center mb-2">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <LogIn className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            {t('auth.welcomeBack')}
          </CardTitle>
          <CardDescription className="text-center text-base text-gray-600 dark:text-gray-400">
            {t('auth.signInToDavieSupply')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs value={authTab} onValueChange={(value) => setAuthTab(value as "replit" | "sms")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6" data-testid="tabs-auth-method">
              <TabsTrigger value="replit" data-testid="tab-replit-auth">
                <SiReplit className="mr-2 h-4 w-4" />
                {t('auth.replitAuth')}
              </TabsTrigger>
              <TabsTrigger value="sms" data-testid="tab-sms-auth">
                <Smartphone className="mr-2 h-4 w-4" />
                {t('auth.smsLogin')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="replit" className="space-y-4">
              <Button
                type="button"
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-lg transition-all"
                onClick={handleReplitLogin}
                disabled={isLoading}
                data-testid="button-replit-login"
              >
                <SiReplit className="mr-2 h-5 w-5" />
                {t('auth.continueWithReplit')}
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-300 dark:border-gray-700" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-slate-900 px-3 text-gray-500 dark:text-gray-400 font-medium">
                    {t('auth.orSignInWith')}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-800"
                  onClick={handleReplitLogin}
                  data-testid="button-google-login"
                >
                  <SiGoogle className="h-5 w-5 text-red-500" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-800"
                  onClick={handleReplitLogin}
                  data-testid="button-github-login"
                >
                  <SiGithub className="h-5 w-5 text-gray-900 dark:text-white" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-800"
                  onClick={handleReplitLogin}
                  data-testid="button-x-login"
                >
                  <SiX className="h-5 w-5 text-black dark:text-white" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-800"
                  onClick={handleReplitLogin}
                  data-testid="button-apple-login"
                >
                  <SiApple className="h-5 w-5 text-black dark:text-white" />
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="sms" className="space-y-5">
              {!smsCodeSent ? (
                <form onSubmit={(e) => { e.preventDefault(); handleSmsSendCode(); }} className="space-y-4">
                  <div className="space-y-2">
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
                      className="h-12 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                      data-testid="input-sms-phone"
                      autoFocus
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t('auth.enterPhoneE164Format')}
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-lg transition-all"
                    disabled={isSmsLoading}
                    data-testid="button-send-sms-code"
                  >
                    <Smartphone className="mr-2 h-5 w-5" />
                    {isSmsLoading ? t('auth.sending') : t('auth.sendCode')}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleSmsVerifyCode} className="space-y-5">
                  <div className="space-y-2">
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
                      className="h-12 text-center text-2xl font-mono tracking-widest dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                      data-testid="input-sms-verification-code"
                      autoFocus
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      {t('auth.codeSentTo', { phone: smsPhoneNumber })}
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-lg transition-all"
                    disabled={isSmsLoading || smsVerificationCode.length !== 6}
                    data-testid="button-verify-sms-code"
                  >
                    {isSmsLoading ? t('auth.verifying') : t('auth.verifyAndLogin')}
                  </Button>

                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-11 dark:border-slate-700 dark:hover:bg-slate-800"
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
                      className="w-full h-11 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
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

          <div className="pt-4 text-center text-sm border-t border-gray-200 dark:border-gray-800">
            <p className="text-gray-600 dark:text-gray-400">
              {t('auth.byContinuingYouAgree')}{" "}
              <a href="#" className="text-blue-600 hover:underline font-medium">
                {t('auth.termsOfService')}
              </a>{" "}
              {t('auth.and')}{" "}
              <a href="#" className="text-blue-600 hover:underline font-medium">
                {t('auth.privacyPolicy')}
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
