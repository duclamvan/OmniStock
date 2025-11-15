import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { LogIn } from "lucide-react";

export default function Login() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isCodeSent, setIsCodeSent] = useState(false);

  useEffect(() => {
    // Check for error in URL params
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    
    if (error === 'auth_failed') {
      toast({
        title: "Authentication Failed",
        description: "Unable to log in with Facebook. Please try again.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/send-phone-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      if (response.ok) {
        setIsCodeSent(true);
        toast({
          title: "Success",
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
        description: "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/verify-phone-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: verificationCode }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Logged in successfully",
        });
        navigate("/");
      } else {
        const data = await response.json();
        toast({
          title: "Error",
          description: data.message || "Verification failed",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred during verification",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loginMethod === "phone") {
      if (!isCodeSent) {
        await handleSendCode(e);
      } else {
        await handleVerifyCode(e);
      }
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Logged in successfully",
        });
        navigate("/");
      } else {
        const data = await response.json();
        toast({
          title: "Error",
          description: data.message || "Login failed",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred during login",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center">
              <LogIn className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Welcome Back</CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button
              type="button"
              variant={loginMethod === "email" ? "default" : "outline"}
              className="flex-1"
              onClick={() => {
                setLoginMethod("email");
                setIsCodeSent(false);
              }}
            >
              Email
            </Button>
            <Button
              type="button"
              variant={loginMethod === "phone" ? "default" : "outline"}
              className="flex-1"
              onClick={() => {
                setLoginMethod("phone");
                setIsCodeSent(false);
              }}
            >
              Phone
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {loginMethod === "email" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11"
                    data-testid="input-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11"
                    data-testid="input-password"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+420 123 456 789"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="h-11"
                    data-testid="input-phone"
                    disabled={isCodeSent}
                  />
                </div>
                {isCodeSent && (
                  <div className="space-y-2">
                    <Label htmlFor="code">Verification Code</Label>
                    <Input
                      id="code"
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      required
                      maxLength={6}
                      className="h-11"
                      data-testid="input-code"
                    />
                  </div>
                )}
              </>
            )}
            <Button
              type="submit"
              className="w-full h-11"
              disabled={isLoading}
              data-testid="button-login"
            >
              {isLoading 
                ? "Processing..." 
                : loginMethod === "phone" && !isCodeSent 
                  ? "Send Code" 
                  : loginMethod === "phone" 
                    ? "Verify Code"
                    : "Log In"}
            </Button>
            {loginMethod === "phone" && isCodeSent && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setIsCodeSent(false)}
              >
                Change Phone Number
              </Button>
            )}
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-500">Or continue with</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full h-11"
            onClick={() => {
              window.location.href = "/api/auth/facebook";
            }}
            data-testid="button-facebook-login"
          >
            <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Continue with Facebook
          </Button>

          <div className="mt-4 text-center text-sm">
            <span className="text-slate-600">Don't have an account? </span>
            <button
              type="button"
              onClick={() => navigate("/register")}
              className="text-blue-600 hover:underline font-medium"
              data-testid="link-register"
            >
              Sign up
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
