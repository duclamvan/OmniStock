import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { LogIn, Shield, Smartphone, ArrowLeft } from "lucide-react";
import { SiReplit, SiGoogle, SiGithub, SiX, SiApple } from "react-icons/si";
import { apiRequest } from "@/lib/queryClient";

export default function Login() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    const require2fa = params.get('require_2fa');
    const phone = params.get('phone');
    
    if (error === 'auth_failed') {
      toast({
        title: "Authentication Failed",
        description: "Unable to log in. Please try again.",
        variant: "destructive",
      });
    }

    if (require2fa === 'true' && phone) {
      setShow2FA(true);
      setPhoneNumber(phone);
      toast({
        title: "Two-Factor Authentication Required",
        description: "Please verify your identity with the code sent to your phone.",
      });
    }
  }, [toast]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleReplitLogin = () => {
    window.location.href = "/api/login";
  };

  const handleSendCode = async () => {
    if (!phoneNumber) {
      toast({
        title: "Error",
        description: "Phone number is required",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/2fa/send-code", { phoneNumber });

      if (response.ok) {
        setIsCodeSent(true);
        setCountdown(60);
        toast({
          title: "Code Sent",
          description: "Verification code sent to your phone",
        });
      } else {
        const data = await response.json();
        toast({
          title: "Error",
          description: data.message || "Failed to send code",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send verification code",
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
        title: "Error",
        description: "Please enter a valid 6-digit code",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/2fa/verify", { phoneNumber, code: verificationCode });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Authentication successful!",
        });
        navigate("/");
      } else {
        const data = await response.json();
        toast({
          title: "Verification Failed",
          description: data.message || "Invalid code. Please try again.",
          variant: "destructive",
        });
        setVerificationCode("");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to verify code",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
              Two-Factor Authentication
            </CardTitle>
            <CardDescription className="text-center text-base text-gray-600 dark:text-gray-400">
              Enter the 6-digit code sent to<br />
              <span className="font-semibold text-gray-900 dark:text-white">{phoneNumber}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleVerifyCode} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="code" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Verification Code
                </Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
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
                {isLoading ? "Verifying..." : "Verify Code"}
              </Button>
            </form>

            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 dark:border-slate-700 dark:hover:bg-slate-800"
                onClick={handleSendCode}
                disabled={isLoading || countdown > 0}
                data-testid="button-resend-code"
              >
                <Smartphone className="mr-2 h-4 w-4" />
                {countdown > 0 ? `Resend code in ${countdown}s` : "Resend Code"}
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
                Back to Login
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
            Welcome Back
          </CardTitle>
          <CardDescription className="text-center text-base text-gray-600 dark:text-gray-400">
            Sign in to Davie Supply
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Button
            type="button"
            className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-lg transition-all"
            onClick={handleReplitLogin}
            disabled={isLoading}
            data-testid="button-replit-login"
          >
            <SiReplit className="mr-2 h-5 w-5" />
            Continue with Replit
          </Button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-300 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-slate-900 px-3 text-gray-500 dark:text-gray-400 font-medium">
                Or sign in with
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

          <div className="pt-4 text-center text-sm border-t border-gray-200 dark:border-gray-800">
            <p className="text-gray-600 dark:text-gray-400">
              By continuing, you agree to our{" "}
              <a href="#" className="text-blue-600 hover:underline font-medium">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="text-blue-600 hover:underline font-medium">
                Privacy Policy
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
