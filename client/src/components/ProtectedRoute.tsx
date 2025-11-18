import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldX } from "lucide-react";
import { useLocation } from "wouter";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { isAuthenticated, isAdministrator, isLoading, user } = useAuth();
  const [, navigate] = useLocation();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isLoading, isAuthenticated, navigate]);

  // While checking authentication, render nothing or a loading state
  if (isLoading) {
    return null;
  }

  // If user is not authenticated, don't render anything (will redirect via useEffect)
  if (!isAuthenticated) {
    return null;
  }

  // If user has no role assigned, show pending approval screen
  if (!user?.role) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
        <Card className="w-full max-w-md" data-testid="pending-approval-card">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-yellow-500/10 p-3">
                <ShieldX className="h-10 w-10 text-yellow-500" data-testid="icon-pending-approval" />
              </div>
            </div>
            <CardTitle className="text-2xl" data-testid="text-pending-approval-title">
              Pending Approval
            </CardTitle>
            <CardDescription data-testid="text-pending-approval-description">
              Account awaiting role assignment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription data-testid="text-pending-approval-message">
                Your account is awaiting role assignment. Please contact an administrator.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If admin access is required and user is not an administrator
  if (requireAdmin && !isAdministrator) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
        <Card className="w-full max-w-md" data-testid="access-denied-card">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-destructive/10 p-3">
                <ShieldX className="h-10 w-10 text-destructive" data-testid="icon-access-denied" />
              </div>
            </div>
            <CardTitle className="text-2xl" data-testid="text-access-denied-title">
              Access Denied
            </CardTitle>
            <CardDescription data-testid="text-access-denied-description">
              Administrator access required
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription data-testid="text-access-denied-message">
                You don't have permission to access this page. Please contact your administrator if you believe this is an error.
              </AlertDescription>
            </Alert>
            <Button 
              onClick={() => navigate("/")} 
              className="w-full"
              data-testid="button-go-home"
            >
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User has access, render children
  return <>{children}</>;
}
